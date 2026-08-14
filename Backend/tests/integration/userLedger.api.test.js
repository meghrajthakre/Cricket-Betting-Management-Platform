"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { Bet } = require("../../src/modules/bet/bet.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now();
const settledMatchId = `ledger-settled-${stamp}`;
const pendingMatchId = `ledger-pending-${stamp}`;
let server;
let baseUrl;
let owner;
let user;

const get = (path) => fetch(`${baseUrl}${path}`, {
  headers: { Authorization: `Bearer ${generateAccessToken({ id: user._id, role: user.role })}` },
});

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  owner = await User.create({ username: `ledgerowner${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN, coins: 0 });
  user = await User.create({
    username: `ledgeruser${stamp}`, password: "pass1234", role: ROLES.USER, coins: 485,
    createdBy: owner._id, parentId: owner._id, rootSuperAdminId: owner._id,
  });
  await SavedMatch.create([
    { user: owner._id, matchId: settledMatchId, homeTeam: "Team A", awayTeam: "Team B", isDeclared: true, wonBy: "Team A", winningRunnerId: "a", settledAt: new Date() },
    { user: owner._id, matchId: pendingMatchId, homeTeam: "Team C", awayTeam: "Team D", isDeclared: false },
  ]);
  await ManualRunner.create({ matchId: settledMatchId, runnerId: "a", runnerName: "Team A", lagai: 90, khai: 90 });
  await Bet.create({
    userId: user._id, rootSuperAdminId: owner._id, matchId: settledMatchId, marketType: "match", marketId: "a",
    amount: 500, rate: 90, type: "no", profit: 500, loss: 450, status: "lost", settledAt: new Date(),
  });
  await Ledger.create([
    { userId: user._id, amount: 15, type: "debit", reason: "settled match fee", matchId: settledMatchId, createdBy: user._id, balanceBefore: 1000, balanceAfter: 985 },
    { userId: user._id, amount: 15, type: "debit", reason: "pending match fee", matchId: pendingMatchId, createdBy: user._id, balanceBefore: 985, balanceAfter: 970 },
    { userId: user._id, amount: 30, type: "credit", reason: "Cash received", createdBy: owner._id, balanceBefore: 970, balanceAfter: 1000 },
  ]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  await Promise.all([
    Ledger.deleteMany({ userId: user._id }), Bet.deleteMany({ userId: user._id }),
    SavedMatch.deleteMany({ matchId: { $in: [settledMatchId, pendingMatchId] } }),
    ManualRunner.deleteMany({ matchId: settledMatchId }), User.deleteMany({ _id: { $in: [owner._id, user._id] } }),
  ]);
  await mongoose.disconnect();
});

test("ledger hides pending match entries and labels settled match entries", { skip: !enabled }, async () => {
  const response = await get("/api/user/ledger?page=1&limit=20");
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.entries.some((entry) => entry.matchId === pendingMatchId), false);
  const settled = body.data.entries.find((entry) => entry.matchId === settledMatchId);
  assert.equal(settled.matchName, "Team A vs Team B");
  assert.equal(settled.canViewBets, true);
  assert.equal(body.data.entries.some((entry) => entry.reason === "Cash received"), true);
});

test("match detail returns only own resolved bets after final settlement", { skip: !enabled }, async () => {
  const settled = await get(`/api/user/ledger/matches/${settledMatchId}`);
  const body = await settled.json();
  assert.equal(settled.status, 200);
  assert.equal(body.data.bets.length, 1);
  assert.equal(body.data.bets[0].marketName, "Team A");
  assert.equal(body.data.bets[0].profitLoss, -450);
  assert.equal((await get(`/api/user/ledger/matches/${pendingMatchId}`)).status, 404);
});
