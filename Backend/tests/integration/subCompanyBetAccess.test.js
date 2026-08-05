"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet } = require("../../src/modules/bet/bet.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now(); let server; let baseUrl; let companyA; let companyB; let userA; let userB; let normalUser; const matchId = `company-report-${stamp}`;
const auth = (user) => ({ Authorization: `Bearer ${generateAccessToken({ id: user._id, role: user.role })}` });
const url = () => `${baseUrl}/api/bet/company-match?matchId=${encodeURIComponent(matchId)}`;

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  [companyA, companyB, normalUser] = await User.create([
    { username: `companya${stamp}`, password: "pass1234", role: ROLES.SUB_COMPANY },
    { username: `companyb${stamp}`, password: "pass1234", role: ROLES.SUB_COMPANY },
    { username: `normal${stamp}`, password: "pass1234", role: ROLES.USER },
  ]);
  [userA, userB] = await User.create([
    { username: `ownera${stamp}`, password: "pass1234", role: ROLES.USER, createdBy: companyA._id, parentId: companyA._id },
    { username: `ownerb${stamp}`, password: "pass1234", role: ROLES.USER, createdBy: companyB._id, parentId: companyB._id },
  ]);
  await Bet.create([userA, userB].map((user, index) => ({ userId: user._id, matchId, marketId: `runner-${index}`, amount: 100, rate: 90, type: "yes", profit: 90, loss: 100 })));
  server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => { if (!enabled) return; await new Promise((resolve) => server.close(resolve)); await Bet.deleteMany({ matchId }); await User.deleteMany({ _id: { $in: [companyA._id, companyB._id, normalUser._id, userA._id, userB._id] } }); await mongoose.disconnect(); });

test("company match report rejects unauthenticated requests", { skip: !enabled }, async () => assert.equal((await fetch(url())).status, 401));
test("company match report rejects invalid tokens", { skip: !enabled }, async () => assert.equal((await fetch(url(), { headers: { Authorization: "Bearer invalid" } })).status, 401));
test("normal users cannot access company match reports", { skip: !enabled }, async () => assert.equal((await fetch(url(), { headers: auth(normalUser) })).status, 403));
test("Sub Company sees only its own users' bets", { skip: !enabled }, async () => { const response = await fetch(url(), { headers: auth(companyA) }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.count, 1); assert.equal(body.data[0].userId.username, userA.username); assert.equal(JSON.stringify(body).includes(userB.username), false); });
test("another Sub Company gets an isolated report", { skip: !enabled }, async () => { const body = await (await fetch(url(), { headers: auth(companyB) })).json(); assert.equal(body.count, 1); assert.equal(body.data[0].userId.username, userB.username); });
test("missing matchId is rejected", { skip: !enabled }, async () => assert.equal((await fetch(`${baseUrl}/api/bet/company-match`, { headers: auth(companyA) })).status, 400));
test("inactive Sub Company is rejected", { skip: !enabled }, async () => { await User.updateOne({ _id: companyA._id }, { isActive: false }); assert.equal((await fetch(url(), { headers: auth(companyA) })).status, 403); });
