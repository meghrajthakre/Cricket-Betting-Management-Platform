"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet } = require("../../src/modules/bet/bet.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now(); let server; let baseUrl; let superAdmin; let otherSuperAdmin; let companyA; let companyB; let userA; let userB; let normalUser; const matchId = `company-report-${stamp}`;
const auth = (user) => ({ Authorization: `Bearer ${generateAccessToken({ id: user._id, role: user.role })}` });
const url = () => `${baseUrl}/api/bet/company-match?matchId=${encodeURIComponent(matchId)}`;

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  [superAdmin, otherSuperAdmin] = await User.create([
    { username: `supera${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN },
    { username: `superb${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN },
  ]);
  [companyA, companyB, normalUser] = await User.create([
    { username: `companya${stamp}`, password: "pass1234", role: ROLES.SUB_COMPANY, allocatedShareBps: 9500, createdBy: superAdmin._id, parentId: superAdmin._id },
    { username: `companyb${stamp}`, password: "pass1234", role: ROLES.SUB_COMPANY, allocatedShareBps: 8000, createdBy: otherSuperAdmin._id, parentId: otherSuperAdmin._id },
    { username: `normal${stamp}`, password: "pass1234", role: ROLES.USER },
  ]);
  [userA, userB] = await User.create([
    { username: `ownera${stamp}`, password: "pass1234", role: ROLES.USER, createdBy: companyA._id, parentId: companyA._id },
    { username: `ownerb${stamp}`, password: "pass1234", role: ROLES.USER, createdBy: companyB._id, parentId: companyB._id },
  ]);
  await Bet.create([userA, userB].map((user, index) => ({
    userId: user._id, matchId, marketId: `runner-${index}`, amount: 100, rate: 90, type: "yes", profit: 90, loss: 100,
    ...(index === 0 ? {
      rootSuperAdminId: superAdmin._id,
      ownerPath: [superAdmin._id, companyA._id],
      shareSnapshot: [
        { userId: superAdmin._id, role: ROLES.SUPERADMIN, shareBps: 500 },
        { userId: companyA._id, role: ROLES.SUB_COMPANY, shareBps: 9500 },
      ],
    } : {}),
  })));
  await ManualRunner.create([
    { matchId, runnerId: "runner-0", runnerName: "Runner A", lagai: 90, khai: 90, status: "open" },
    { matchId, runnerId: "runner-1", runnerName: "Runner B", lagai: 90, khai: 90, status: "open" },
  ]);
  server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve)); baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => { if (!enabled) return; await new Promise((resolve) => server.close(resolve)); await Promise.all([Bet.deleteMany({ matchId }), ManualRunner.deleteMany({ matchId }), Ledger.deleteMany({ userId: { $in: [userA._id, userB._id] } })]); await User.deleteMany({ _id: { $in: [superAdmin._id, otherSuperAdmin._id, companyA._id, companyB._id, normalUser._id, userA._id, userB._id] } }); await mongoose.disconnect(); });

test("company match report rejects unauthenticated requests", { skip: !enabled }, async () => assert.equal((await fetch(url())).status, 401));
test("company match report rejects invalid tokens", { skip: !enabled }, async () => assert.equal((await fetch(url(), { headers: { Authorization: "Bearer invalid" } })).status, 401));
test("normal users cannot access company match reports", { skip: !enabled }, async () => assert.equal((await fetch(url(), { headers: auth(normalUser) })).status, 403));
test("Sub Company sees only its own users' bets at its 95% share", { skip: !enabled }, async () => { const response = await fetch(url(), { headers: auth(companyA) }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.count, 1); assert.equal(body.data[0].userId.username, userA.username); assert.equal(body.data[0].amount, 95); assert.equal(body.data[0].profit, 85.5); assert.equal(body.data[0].loss, 95); assert.equal(body.data[0].visibleShareBps, 9500); assert.equal(JSON.stringify(body).includes(userB.username), false); });
test("Super Admin sees the real downline bet with retained-share amounts separately", { skip: !enabled }, async () => { const response = await fetch(`${baseUrl}/api/bet/match?matchId=${encodeURIComponent(matchId)}`, { headers: auth(superAdmin) }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.count, 1); assert.equal(body.data[0].userId.username, userA.username); assert.equal(body.data[0].amount, 100); assert.equal(body.data[0].profit, 90); assert.equal(body.data[0].loss, 100); assert.equal(body.data[0].shareAmount, 5); assert.equal(body.data[0].shareProfit, 4.5); assert.equal(body.data[0].shareLoss, 5); assert.equal(body.data[0].visibleShareBps, 500); assert.equal(JSON.stringify(body).includes(userB.username), false); });
test("another Sub Company gets an isolated 80% report", { skip: !enabled }, async () => { const body = await (await fetch(url(), { headers: auth(companyB) })).json(); assert.equal(body.count, 1); assert.equal(body.data[0].userId.username, userB.username); assert.equal(body.data[0].amount, 80); });
test("missing matchId is rejected", { skip: !enabled }, async () => assert.equal((await fetch(`${baseUrl}/api/bet/company-match`, { headers: auth(companyA) })).status, 400));
test("inactive Sub Company is rejected", { skip: !enabled }, async () => { await User.updateOne({ _id: companyA._id }, { isActive: false }); assert.equal((await fetch(url(), { headers: auth(companyA) })).status, 403); });
test("normal user and Sub Company cannot settle match bets", { skip: !enabled }, async () => {
  await User.updateOne({ _id: companyA._id }, { isActive: true });
  for (const actor of [normalUser, companyA]) {
    const response = await fetch(`${baseUrl}/api/bet/settle-match`, {
      method: "POST", headers: { ...auth(actor), "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, winningRunnerId: "runner-0" }),
    });
    assert.equal(response.status, 403);
  }
  assert.equal(await Bet.countDocuments({ matchId, status: "pending" }), 2);
});
test("normal user and Sub Company cannot cancel bets", { skip: !enabled }, async () => {
  const bet = await Bet.findOne({ userId: userB._id }).lean();
  for (const actor of [normalUser, companyA]) {
    const response = await fetch(`${baseUrl}/api/bet/${bet._id}`, { method: "DELETE", headers: auth(actor) });
    assert.equal(response.status, 403);
  }
  assert.equal((await Bet.findById(bet._id).lean()).status, "pending");
});
test("Super Admin cannot mutate another tenant bet or match", { skip: !enabled }, async () => {
  const otherTenantBet = await Bet.findOne({ userId: userB._id }).lean();
  const cancelResponse = await fetch(`${baseUrl}/api/bet/${otherTenantBet._id}`, { method: "DELETE", headers: auth(superAdmin) });
  assert.equal(cancelResponse.status, 403);
  const settleResponse = await fetch(`${baseUrl}/api/bet/settle-match`, {
    method: "POST", headers: { ...auth(superAdmin), "Content-Type": "application/json" },
    body: JSON.stringify({ matchId, winningRunnerId: "runner-1" }),
  });
  assert.equal(settleResponse.status, 200);
  assert.equal((await Bet.findById(otherTenantBet._id).lean()).status, "pending");
});
test("individual settlement API rejects non-boolean won payloads without mutation", { skip: !enabled }, async () => {
  const bet = await Bet.findOne({ userId: userB._id }).lean();
  for (const won of [null, "true", "false", 1, 0, [], {}]) {
    const response = await fetch(`${baseUrl}/api/bet/settle`, {
      method: "POST", headers: { ...auth(otherSuperAdmin), "Content-Type": "application/json" },
      body: JSON.stringify({ betId: String(bet._id), won }),
    });
    assert.equal(response.status, 400);
  }
  const missing = await fetch(`${baseUrl}/api/bet/settle`, {
    method: "POST", headers: { ...auth(otherSuperAdmin), "Content-Type": "application/json" },
    body: JSON.stringify({ betId: String(bet._id) }),
  });
  assert.equal(missing.status, 400);
  assert.equal((await Bet.findById(bet._id).lean()).status, "pending");
});
