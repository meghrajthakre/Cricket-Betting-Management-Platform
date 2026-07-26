"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User } = require("../../src/models/User");
const ManualOptions = require("../../src/models/ManualModel/ManualOptions");
const ManualSettings = require("../../src/models/ManualModel/ManualSettings");
const Session = require("../../src/models/Session");
const { Bet } = require("../../src/modules/bet/bet.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const { placeBet } = require("../../src/modules/bet/bet.service");
const { settleSession } = require("../../src/services/sessionService");

const enabled = (
  process.env.TEST_ALLOW_DB_WRITES === "true" &&
  typeof process.env.TEST_MONGODB_URI === "string" &&
  process.env.TEST_MONGODB_URI.length > 0
);

const TEST_PREFIX = "codex-session-transaction-";

async function seedSessionCase(suffix) {
  const matchId = `${TEST_PREFIX}${suffix}-${Date.now()}`;
  const user = await User.create({
    username: `${TEST_PREFIX}${suffix}-${Date.now()}`.slice(0, 30),
    password: "test-password-123",
    role: "user",
    coins: 1000,
    isActive: true,
  });
  await ManualOptions.create({
    matchId,
    sessionDelay: 0,
    sessionMaxBet: 10000,
  });
  await ManualSettings.create({
    matchId,
    betLock: false,
    sessionLock: false,
    marketStatus: "OPEN",
  });
  await Session.create({
    id: "session-1",
    matchId,
    sessionName: "Test session",
    status: "open",
    lockStatus: "unlock",
    noRun: 90,
    yesRun: 91,
    noRate: 1,
    yesRate: 1,
    maxAmount: 10000,
    isVisible: true,
    displayOrder: 1,
  });
  return { matchId, user };
}

async function cleanupCase(matchId, userId) {
  await Promise.all([
    Bet.deleteMany({ matchId }),
    Ledger.deleteMany({ userId }),
    Session.deleteMany({ matchId }),
    ManualOptions.deleteMany({ matchId }),
    ManualSettings.deleteMany({ matchId }),
    User.deleteOne({ _id: userId }),
  ]);
}

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
});

test.after(async () => {
  if (!enabled) return;
  await mongoose.disconnect();
});

test("session bet commits wallet, ledger, and bet together", { skip: !enabled }, async () => {
  const { matchId, user } = await seedSessionCase("commit");
  try {
    const result = await placeBet(
      user._id.toString(),
      matchId,
      100,
      91,
      "yes",
      "session",
      "session-1"
    );

    const [freshUser, ledgers, bets] = await Promise.all([
      User.findById(user._id).lean(),
      Ledger.find({ userId: user._id }).lean(),
      Bet.find({ userId: user._id, matchId }).lean(),
    ]);

    assert.equal(result.balance, 900);
    assert.equal(freshUser.coins, 900);
    assert.equal(ledgers.length, 1);
    assert.equal(ledgers[0].type, "debit");
    assert.equal(ledgers[0].amount, 100);
    assert.equal(bets.length, 1);
    assert.equal(bets[0].rate, 91);
    assert.equal(bets[0].loss, 100);
  } finally {
    await cleanupCase(matchId, user._id);
  }
});

test("session bet creation failure rolls wallet and ledger back", { skip: !enabled }, async (t) => {
  const { matchId, user } = await seedSessionCase("rollback");
  t.mock.method(Bet, "create", async () => {
    throw new Error("Forced bet creation failure");
  });

  try {
    await assert.rejects(
      placeBet(
        user._id.toString(),
        matchId,
        100,
        91,
        "yes",
        "session",
        "session-1"
      ),
      /Forced bet creation failure/
    );

    const [freshUser, ledgerCount, betCount] = await Promise.all([
      User.findById(user._id).lean(),
      Ledger.countDocuments({ userId: user._id }),
      Bet.countDocuments({ userId: user._id, matchId }),
    ]);

    assert.equal(freshUser.coins, 1000);
    assert.equal(ledgerCount, 0);
    assert.equal(betCount, 0);
  } finally {
    await cleanupCase(matchId, user._id);
  }
});

test("session settlement credits a winning YES bet and closes the session", { skip: !enabled }, async () => {
  const { matchId, user } = await seedSessionCase("settle-win");
  try {
    await placeBet(user._id.toString(), matchId, 100, 91, "yes", "session", "session-1", 1);
    const result = await settleSession(matchId, "session-1", 91, user._id);

    const [freshUser, bet, session] = await Promise.all([
      User.findById(user._id).lean(),
      Bet.findOne({ userId: user._id, matchId }).lean(),
      Session.findOne({ matchId, id: "session-1" }).lean(),
    ]);

    assert.equal(result.won, 1);
    assert.equal(result.totalCredit, 200);
    assert.equal(freshUser.coins, 1100);
    assert.equal(bet.status, "won");
    assert.equal(bet.resultRun, 91);
    assert.equal(session.resultStatus, "settled");
    assert.equal(session.status, "closed");
    assert.equal(session.isVisible, false);
  } finally {
    await cleanupCase(matchId, user._id);
  }
});

test("session settlement makes NO lose when result equals its line", { skip: !enabled }, async () => {
  const { matchId, user } = await seedSessionCase("settle-no-equal");
  try {
    await placeBet(user._id.toString(), matchId, 100, 90, "no", "session", "session-1", 1);
    const result = await settleSession(matchId, "session-1", 90, user._id);
    const [freshUser, bet] = await Promise.all([
      User.findById(user._id).lean(),
      Bet.findOne({ userId: user._id, matchId }).lean(),
    ]);

    assert.equal(result.lost, 1);
    assert.equal(freshUser.coins, 900);
    assert.equal(bet.status, "lost");
  } finally {
    await cleanupCase(matchId, user._id);
  }
});
