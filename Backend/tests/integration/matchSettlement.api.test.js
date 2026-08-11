"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet, BET_STATUS } = require("../../src/modules/bet/bet.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now();
const matchId = `match-reversal-api-${stamp}`;
let server;
let baseUrl;
let owner;
let otherAdmin;
let user;
let bet;

const auth = (actor) => ({
  Authorization: `Bearer ${generateAccessToken({ id: actor._id, role: actor.role })}`,
  "Content-Type": "application/json",
});
const post = (path, actor, body) => fetch(`${baseUrl}${path}`, {
  method: "POST",
  headers: actor ? auth(actor) : { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  [owner, otherAdmin] = await User.create([
    { username: `reverseowner${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN, coins: 0 },
    { username: `reverseother${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN, coins: 0 },
  ]);
  user = await User.create({
    username: `reverseuser${stamp}`, password: "pass1234", role: ROLES.USER, coins: 900,
    createdBy: owner._id, parentId: owner._id, rootSuperAdminId: owner._id,
  });
  await ManualRunner.create([
    { matchId, runnerId: "a", runnerName: "Team A", lagai: 90, khai: 90, status: "open" },
    { matchId, runnerId: "b", runnerName: "Team B", lagai: 90, khai: 90, status: "open" },
  ]);
  await SavedMatch.create({ user: owner._id, matchId, homeTeam: "Team A", awayTeam: "Team B" });
  bet = await Bet.create({
    userId: user._id, rootSuperAdminId: owner._id, matchId, marketType: "match", marketId: "a",
    amount: 100, rate: 90, type: "yes", profit: 90, loss: 100, walletAdjustment: 100,
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await Promise.all([
    Bet.deleteMany({ matchId }),
    ManualRunner.deleteMany({ matchId }),
    SavedMatch.deleteMany({ matchId }),
    Ledger.deleteMany({ userId: user._id }),
  ]);
  await User.deleteMany({ _id: { $in: [owner._id, otherAdmin._id, user._id] } });
  await mongoose.disconnect();
});

test("reverse API requires authentication and Super Admin role", { skip: !enabled }, async () => {
  assert.equal((await post("/api/bet/reverse-match-settlement", null, { matchId })).status, 401);
  assert.equal((await post("/api/bet/reverse-match-settlement", user, { matchId })).status, 403);
});

test("settlement and reversal APIs reject strict invalid payloads", { skip: !enabled }, async () => {
  for (const body of [{}, { matchId: "" }, { matchId, extra: true }]) {
    assert.equal((await post("/api/bet/reverse-match-settlement", owner, body)).status, 400);
  }
  assert.equal((await post("/api/bet/settle-match", owner, { matchId })).status, 400);
  assert.equal((await Bet.findById(bet._id).lean()).status, BET_STATUS.PENDING);
});

test("API blocks double settlement, supports owner reversal, then permits re-settlement", { skip: !enabled }, async () => {
  const settled = await post("/api/bet/settle-match", owner, { matchId, winningRunnerId: "a" });
  assert.equal(settled.status, 200);
  assert.equal((await settled.json()).data.profitLoss, -90);

  const duplicate = await post("/api/bet/settle-match", owner, { matchId, winningRunnerId: "b" });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, "MATCH_ALREADY_SETTLED");

  const crossTenant = await post("/api/bet/reverse-match-settlement", otherAdmin, { matchId });
  assert.equal(crossTenant.status, 404);
  assert.equal((await Bet.findById(bet._id).lean()).status, BET_STATUS.WON);

  const reversed = await post("/api/bet/reverse-match-settlement", owner, { matchId });
  assert.equal(reversed.status, 200);
  assert.equal((await reversed.json()).data.reversedCount, 1);
  assert.equal((await Bet.findById(bet._id).lean()).status, BET_STATUS.PENDING);

  const duplicateReverse = await post("/api/bet/reverse-match-settlement", owner, { matchId });
  assert.equal(duplicateReverse.status, 409);
  assert.equal((await duplicateReverse.json()).code, "MATCH_NOT_SETTLED");

  const resettled = await post("/api/bet/settle-match", owner, { matchId, winningRunnerId: "b" });
  assert.equal(resettled.status, 200);
  assert.equal((await Bet.findById(bet._id).lean()).status, BET_STATUS.LOST);
  const saved = await SavedMatch.findOne({ matchId, user: owner._id }).lean();
  assert.equal(saved.isDeclared, true);
  assert.equal(saved.wonBy, "Team B");
});
