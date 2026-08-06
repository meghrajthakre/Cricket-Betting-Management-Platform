"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User } = require("../../src/modules/user/user.model");
const ManualOptions = require("../../src/modules/manual/manual-options.model");
const ManualSettings = require("../../src/modules/manual/manual-settings.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const Session = require("../../src/modules/session/session.model");
const { Bet } = require("../../src/modules/bet/bet.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { placeBet, deleteBetSlip, getUserMatchBets } = require("../../src/modules/bet/bet.service");

const enabled = (
  process.env.TEST_ALLOW_DB_WRITES === "true" &&
  Boolean(process.env.TEST_MONGODB_URI)
);
const prefix = "codex-bet-flow-";

async function seed({ delay = 0 } = {}) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const matchId = `${prefix}${stamp}`;
  const superAdmin = await User.create({
    username: `admin${stamp}`.replace(/[^a-z0-9]/g, "").slice(0, 30),
    password: "test-password-123",
    role: "superadmin",
  });
  const user = await User.create({
    username: `flow${stamp}`.replace(/[^a-z0-9]/g, "").slice(0, 30),
    password: "test-password-123",
    role: "user",
    coins: 1000,
    createdBy: superAdmin._id,
    parentId: superAdmin._id,
    rootSuperAdminId: superAdmin._id,
  });
  await Promise.all([
    ManualOptions.create({
      matchId,
      matchDelay: delay,
      sessionDelay: delay,
      matchMaxBet: 10000,
      sessionMaxBet: 10000,
    }),
    ManualSettings.create({
      matchId,
      betLock: false,
      sessionLock: false,
      marketStatus: "OPEN",
    }),
    ManualRunner.create([
      { matchId, runnerId: "a", runnerName: "A", lagai: 90, khai: 91, status: "open" },
      { matchId, runnerId: "b", runnerName: "B", lagai: 90, khai: 91, status: "open" },
    ]),
    Session.create({
      matchId,
      id: "s1",
      sessionName: "Session",
      status: "open",
      lockStatus: "unlock",
      noRun: 90,
      yesRun: 91,
      maxAmount: 10000,
      isVisible: true,
      displayOrder: 1,
    }),
  ]);
  return { matchId, user, superAdmin };
}

async function cleanup(matchId, userId, superAdminId) {
  await Promise.all([
    Bet.deleteMany({ matchId }),
    Ledger.deleteMany({ userId }),
    ManualRunner.deleteMany({ matchId }),
    Session.deleteMany({ matchId }),
    ManualOptions.deleteMany({ matchId }),
    ManualSettings.deleteMany({ matchId }),
    User.deleteMany({ _id: { $in: [userId, superAdminId].filter(Boolean) } }),
  ]);
}

test.before(async () => {
  if (enabled) await mongoose.connect(process.env.TEST_MONGODB_URI);
});
test.after(async () => {
  if (enabled) await mongoose.disconnect();
});

test("full delay prevents early creation and accepts unchanged rate", { skip: !enabled }, async () => {
    const { matchId, user, superAdmin } = await seed({ delay: 0.2 });
  try {
    const started = Date.now();
    const pending = placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "s1", 1);
    const completedEarly = await Promise.race([
      pending.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 80)),
    ]);
    assert.equal(completedEarly, false);
    await pending;
    assert.ok(Date.now() - started >= 180);
    assert.equal(await Bet.countDocuments({ matchId }), 1);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("rate change during delay rejects without wallet movement", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed({ delay: 0.2 });
  try {
    const pending = placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "s1", 1);
    const rejection = assert.rejects(pending, (error) => error.code === "PRICE_CHANGED");
    await new Promise((resolve) => setTimeout(resolve, 60));
    await Session.updateOne({ matchId, id: "s1" }, { $set: { yesRun: 92 } });
    await rejection;
    const refreshed = await User.findById(user._id).lean();
    assert.equal(refreshed.coins, 1000);
    assert.equal(await Ledger.countDocuments({ userId: user._id }), 0);
    assert.equal(await Bet.countDocuments({ matchId }), 0);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("opposite runner bets reduce reserved match exposure", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed();
  try {
    const first = await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "a");
    const second = await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "b");
    assert.equal(first.bet.walletAdjustment, 100);
    assert.equal(first.balance, 900);
    assert.equal(second.bet.walletAdjustment, -90);
    assert.equal(second.balance, 990);
    const ledgers = await Ledger.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
    assert.deepEqual(ledgers.map(({ type, amount }) => ({ type, amount })), [
      { type: "debit", amount: 100 },
      { type: "credit", amount: 90 },
    ]);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("cancelling a pending session bet refunds liability and records a ledger credit", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed();
  try {
    const placed = await placeBet(
      user._id.toString(),
      matchId,
      100,
      91,
      "yes",
      "session",
      "s1",
      1,
    );
    assert.equal(placed.balance, 900);

    const deleted = await deleteBetSlip(placed.bet._id, superAdmin._id);
    assert.equal(deleted.balance, 1000);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, "cancelled");
    assert.deepEqual(await getUserMatchBets(user._id, matchId), []);

    const refreshed = await User.findById(user._id).lean();
    assert.equal(refreshed.coins, 1000);
    const entries = await Ledger.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
    assert.deepEqual(entries.map(({ type, amount }) => ({ type, amount })), [
      { type: "debit", amount: 100 },
      { type: "credit", amount: 100 },
    ]);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("cancelling a pending hedge bet recalculates exposure and debits the wallet", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed();
  try {
    const first = await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "a");
    const hedge = await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "b");
    assert.equal(first.balance, 900);
    assert.equal(hedge.balance, 990);

    const deleted = await deleteBetSlip(hedge.bet._id, superAdmin._id);
    assert.equal(deleted.balance, 900);
    const remaining = await Bet.find({ matchId }).lean();
    assert.equal(remaining.length, 2);
    assert.equal(remaining.find((bet) => String(bet._id) === String(hedge.bet._id)).status, "cancelled");
    assert.equal(remaining.find((bet) => String(bet._id) === String(first.bet._id)).status, "pending");

    const entries = await Ledger.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
    assert.deepEqual(entries.map(({ type, amount }) => ({ type, amount })), [
      { type: "debit", amount: 100 },
      { type: "credit", amount: 90 },
      { type: "debit", amount: 90 },
    ]);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("cancelling a resolved bet is rejected without wallet or ledger mutation", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed();
  try {
    const placed = await placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "s1", 1);
    await Bet.updateOne({ _id: placed.bet._id }, { $set: { status: "lost" } });

    const ledgerCountBefore = await Ledger.countDocuments({ userId: user._id });
    await assert.rejects(deleteBetSlip(placed.bet._id, superAdmin._id), (error) => error.code === "BET_NOT_PENDING");
    assert.equal(await Bet.countDocuments({ matchId }), 1);
    const visibleBets = await getUserMatchBets(user._id, matchId);
    assert.equal(visibleBets.length, 1);
    assert.equal(visibleBets[0].status, "lost");

    const refreshed = await User.findById(user._id).lean();
    assert.equal(refreshed.coins, 900);
    assert.equal(await Ledger.countDocuments({ userId: user._id }), ledgerCountBefore);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});

test("pending hedge cancellation rolls back when additional exposure cannot be funded", { skip: !enabled }, async () => {
  const { matchId, user, superAdmin } = await seed();
  try {
    await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "a");
    const hedge = await placeBet(user._id.toString(), matchId, 100, 90, "yes", "match", "b");
    await User.updateOne({ _id: user._id }, { $set: { coins: 0 } });
    const ledgerCountBefore = await Ledger.countDocuments({ userId: user._id });

    await assert.rejects(
      deleteBetSlip(hedge.bet._id, superAdmin._id),
      /Insufficient wallet balance/,
    );

    assert.equal(await Bet.countDocuments({ matchId }), 2);
    const refreshed = await User.findById(user._id).lean();
    assert.equal(refreshed.coins, 0);
    assert.equal(await Ledger.countDocuments({ userId: user._id }), ledgerCountBefore);
  } finally {
    await cleanup(matchId, user._id, superAdmin._id);
  }
});
