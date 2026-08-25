"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const { generateAccessToken } = require("../../src/utils/generateToken");
const {
  clearExternalMatchCache,
  fetchExternalMatches,
} = require("../../src/modules/external-match/external-match.service");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now();
const firstId = `external-api-${stamp}-1`;
const secondId = `external-api-${stamp}-2`;
let server;
let baseUrl;
let support;
let superadmin;
let normalUser;

const providerForm = ({ matchId, eventId, team1, team2 }) => `
  <table><form action="https://top11.tech/support/addMatch" method="post"><tr><td>
    <input name="matchID" type="hidden" value="${matchId}" />
    <input name="eventID" type="hidden" value="${eventId}" />
    <input name="team1" type="hidden" value="${team1}" />
    <input name="team2" type="hidden" value="${team2}" />
    <input name="type" type="hidden" value="T20" />
    <input name="date" type="hidden" value="2026-08-25 14:30:00" />
    <input name="time" type="hidden" value="N" />
  </td></tr></form></table>`;

const headers = (actor) => ({
  Authorization: `Bearer ${generateAccessToken({ id: actor._id, role: actor.role })}`,
  "Content-Type": "application/json",
});

const postSave = (actor, body) => fetch(`${baseUrl}/api/matches/external/save`, {
  method: "POST",
  headers: actor ? headers(actor) : { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  [support, superadmin, normalUser] = await User.create([
    { username: `extsupport${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUPPORT },
    { username: `extadmin${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUPERADMIN },
    { username: `extuser${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.USER },
  ]);

  clearExternalMatchCache();
  const html = providerForm({ matchId: firstId, eventId: "event-1", team1: "Team A", team2: "Team B" })
    + providerForm({ matchId: secondId, eventId: "event-2", team1: "Team C", team2: "Team D" });
  await fetchExternalMatches({
    forceRefresh: true,
    httpClient: { get: async () => ({ data: html, headers: { "content-type": "text/html" } }) },
  });

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await SavedMatch.deleteMany({ matchId: { $in: [firstId, secondId] } });
  await User.deleteMany({ _id: { $in: [support._id, superadmin._id, normalUser._id] } });
  clearExternalMatchCache();
  await mongoose.disconnect();
});

test("external match list endpoint returns normalized cached provider data", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/matches/external`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.count, 2);
  assert.deepEqual(body.data.map((match) => match.matchId), [firstId, secondId]);
});

test("external save requires authentication and staff role", { skip: !enabled }, async () => {
  assert.equal((await postSave(null, { matchId: firstId })).status, 401);
  assert.equal((await postSave(normalUser, { matchId: firstId })).status, 403);
});

test("external save validates missing and unavailable match IDs", { skip: !enabled }, async () => {
  assert.equal((await postSave(support, {})).status, 400);
  assert.equal((await postSave(support, { matchId: "not-in-provider" })).status, 404);
});

test("Support saves all external fields and canonical saved-match fields", { skip: !enabled }, async () => {
  const response = await postSave(support, { matchId: firstId, team1: "Spoofed Team" });
  assert.equal(response.status, 201);
  const saved = await SavedMatch.findOne({ matchId: firstId }).lean();
  assert.equal(String(saved.user), String(support._id));
  assert.equal(saved.source, "external");
  assert.equal(saved.eventId, "event-1");
  assert.equal(saved.team1, "Team A");
  assert.equal(saved.team2, "Team B");
  assert.equal(saved.type, "T20");
  assert.equal(saved.startTime, "2026-08-25 14:30:00");
  assert.equal(saved.timeStatus, "N");
  assert.equal(saved.homeTeam, "Team A");
  assert.equal(saved.awayTeam, "Team B");
  assert.equal(saved.sportKey, "T20");
});

test("duplicate external save returns conflict without a second MongoDB row", { skip: !enabled }, async () => {
  assert.equal((await postSave(support, { matchId: firstId })).status, 409);
  assert.equal(await SavedMatch.countDocuments({ matchId: firstId }), 1);
});

test("Superadmin can save another provider match", { skip: !enabled }, async () => {
  assert.equal((await postSave(superadmin, { matchId: secondId })).status, 201);
  const saved = await SavedMatch.findOne({ matchId: secondId }).lean();
  assert.equal(String(saved.user), String(superadmin._id));
  assert.equal(saved.source, "external");
});
