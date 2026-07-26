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
const { placeBet } = require("../../src/modules/bet/bet.service");

const enabled = (
  process.env.TEST_ALLOW_DB_WRITES === "true" &&
  Boolean(process.env.TEST_MONGODB_URI)
);
const prefix = "codex-bet-flow-";

async function seed({ delay = 0 } = {}) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const matchId = `${prefix}${stamp}`;
  const user = await User.create({
    username: `flow${stamp}`.replace(/[^a-z0-9]/g, "").slice(0, 30),
    password: "test-password-123",
    role: "user",
    coins: 1000,
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
  return { matchId, user };
}

async function cleanup(matchId, userId) {
  await Promise.all([
    Bet.deleteMany({ matchId }),
    Ledger.deleteMany({ userId }),
    ManualRunner.deleteMany({ matchId }),
    Session.deleteMany({ matchId }),
    ManualOptions.deleteMany({ matchId }),
    ManualSettings.deleteMany({ matchId }),
    User.deleteOne({ _id: userId }),
  ]);
}

test.before(async () => {
  if (enabled) await mongoose.connect(process.env.TEST_MONGODB_URI);
});
test.after(async () => {
  if (enabled) await mongoose.disconnect();
});

test("full delay prevents early creation and accepts unchanged rate", { skip: !enabled }, async () => {
  const { matchId, user } = await seed({ delay: 0.2 });
  try {
    const started = Date.now();
    const pending = placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "s1");
    await new Promise((resolve) => setTimeout(resolve, 80));
    assert.equal(await Bet.countDocuments({ matchId }), 0);
    await pending;
    assert.ok(Date.now() - started >= 180);
    assert.equal(await Bet.countDocuments({ matchId }), 1);
  } finally {
    await cleanup(matchId, user._id);
  }
});

test("rate change during delay rejects without wallet movement", { skip: !enabled }, async () => {
  const { matchId, user } = await seed({ delay: 0.2 });
  try {
    const pending = placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "s1");
    await new Promise((resolve) => setTimeout(resolve, 60));
    await Session.updateOne({ matchId, id: "s1" }, { $set: { yesRun: 92 } });
    await assert.rejects(pending, (error) => error.code === "PRICE_CHANGED");
    const refreshed = await User.findById(user._id).lean();
    assert.equal(refreshed.coins, 1000);
    assert.equal(await Ledger.countDocuments({ userId: user._id }), 0);
    assert.equal(await Bet.countDocuments({ matchId }), 0);
  } finally {
    await cleanup(matchId, user._id);
  }
});

test("opposite runner bets reduce reserved match exposure", { skip: !enabled }, async () => {
  const { matchId, user } = await seed();
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
    await cleanup(matchId, user._id);
  }
});
