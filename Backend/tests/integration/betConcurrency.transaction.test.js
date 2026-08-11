"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet, BET_STATUS } = require("../../src/modules/bet/bet.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const ManualSettings = require("../../src/modules/manual/manual-settings.model");
const ManualOptions = require("../../src/modules/manual/manual-options.model");
const Session = require("../../src/modules/session/session.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const {
  placeBet,
  settleBet,
  settleMatchBets,
  reverseMatchSettlement,
  deleteBetSlip,
} = require("../../src/modules/bet/bet.service");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const prefix = "txn-regression-";
let sequence = 0;

const money = (value) => Number(Number(value).toFixed(2));

async function assertLedgerInvariants(userId) {
  const [user, ledgers] = await Promise.all([
    User.findById(userId).lean(),
    Ledger.find({ userId }).sort({ _id: 1 }).lean(),
  ]);
  assert.ok(user);
  assert.ok(Number.isFinite(user.coins));
  assert.ok(user.coins >= 0);
  for (const ledger of ledgers) {
    assert.ok(Number.isFinite(ledger.amount) && ledger.amount > 0);
    assert.ok(Number.isFinite(ledger.balanceBefore));
    assert.ok(Number.isFinite(ledger.balanceAfter));
    const expected = ledger.type === "debit"
      ? money(ledger.balanceBefore - ledger.amount)
      : money(ledger.balanceBefore + ledger.amount);
    assert.equal(money(ledger.balanceAfter), expected);
  }
  if (ledgers.length) assert.equal(money(ledgers.at(-1).balanceAfter), money(user.coins));
  return { user, ledgers };
}

async function assertNoInvalidTerminalLedger(userId, matchId) {
  const [bets, ledgers] = await Promise.all([
    Bet.find({ userId, matchId }).lean(),
    Ledger.find({ userId }).lean(),
  ]);
  const settlementEntries = ledgers.filter((entry) => /settled| bet won /.test(entry.reason));
  if (bets.some((bet) => bet.status === BET_STATUS.PENDING)) assert.equal(settlementEntries.length, 0);
  if (bets.some((bet) => bet.status === BET_STATUS.CANCELLED)) {
    assert.equal(settlementEntries.filter((entry) => / bet won /.test(entry.reason)).length, 0);
  }
}

async function createAccount(coins = 1000) {
  const token = `${Date.now()}${sequence++}`;
  const superAdmin = await User.create({
    username: `sa${token}`.slice(0, 30), password: "pass1234", role: ROLES.SUPERADMIN, coins: 0,
  });
  const user = await User.create({
    username: `usr${token}`.slice(0, 30), password: "pass1234", role: ROLES.USER, coins,
    createdBy: superAdmin._id, parentId: superAdmin._id, rootSuperAdminId: superAdmin._id,
  });
  return { superAdmin, user };
}

async function createMarket(matchId, { sessions = ["s1"] } = {}) {
  await Promise.all([
    ManualOptions.create({ matchId, matchDelay: 0, sessionDelay: 0, matchMaxBet: 10000, sessionMaxBet: 10000 }),
    ManualSettings.create({ matchId, betLock: false, sessionLock: false, marketStatus: "OPEN" }),
    ManualRunner.create([
      { matchId, runnerId: "a", runnerName: "A", lagai: 90, khai: 90, status: "open" },
      { matchId, runnerId: "b", runnerName: "B", lagai: 90, khai: 90, status: "open" },
    ]),
    Session.create(sessions.map((id, index) => ({
      matchId, id, sessionName: id, status: "open", lockStatus: "unlock",
      noRun: 90 + index, yesRun: 91 + index, noRate: 1, yesRate: 1,
      maxAmount: 10000, isVisible: true, displayOrder: index + 1,
    }))),
  ]);
}

async function cleanup(ids) {
  await Promise.all([
    Bet.deleteMany({ matchId: { $in: ids.matchIds } }),
    ManualRunner.deleteMany({ matchId: { $in: ids.matchIds } }),
    ManualSettings.deleteMany({ matchId: { $in: ids.matchIds } }),
    ManualOptions.deleteMany({ matchId: { $in: ids.matchIds } }),
    Session.deleteMany({ matchId: { $in: ids.matchIds } }),
    SavedMatch.deleteMany({ matchId: { $in: ids.matchIds } }),
    Ledger.deleteMany({ userId: { $in: ids.userIds } }),
    User.deleteMany({ _id: { $in: ids.accountIds } }),
  ]);
}

async function fixture({ coins = 1000, marketCount = 1, sessions = ["s1"] } = {}) {
  const { superAdmin, user } = await createAccount(coins);
  const matchIds = Array.from({ length: marketCount }, (_, index) => `${prefix}${Date.now()}-${sequence++}-${index}`);
  await Promise.all(matchIds.map((matchId) => createMarket(matchId, { sessions })));
  return {
    superAdmin, user, matchIds,
    cleanup: () => cleanup({ matchIds, userIds: [user._id], accountIds: [user._id, superAdmin._id] }),
  };
}

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  assert.ok(hello.setName, "TEST_MONGODB_URI must point to a replica set");
  await Bet.syncIndexes();
});
test.after(async () => { if (enabled) await mongoose.disconnect(); });

test("concurrent session settlement credits exactly once", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "settle-once");
    const outcomes = await Promise.allSettled([
      settleBet(placed.bet._id, true, f.superAdmin._id),
      settleBet(placed.bet._id, true, f.superAdmin._id),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((item) => item.status === "rejected").length, 1);
    assert.equal(outcomes.find((item) => item.status === "rejected").reason.code, "BET_ALREADY_SETTLED");
    const bet = await Bet.findById(placed.bet._id).lean();
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.equal(bet.status, BET_STATUS.WON);
    assert.equal(user.coins, 1100);
    assert.equal(ledgers.filter((entry) => /session bet won/.test(entry.reason)).length, 1);
  } finally { await f.cleanup(); }
});

test("concurrent hedged match settlement applies zero adjustment exactly once", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "hedge-a");
    await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "b", undefined, "hedge-b");
    assert.equal((await User.findById(f.user._id).lean()).coins, 990);
    const outcomes = await Promise.allSettled([
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id }),
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id }),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((item) => item.status === "rejected").length, 1);
    const bets = await Bet.find({ matchId: f.matchIds[0] }).lean();
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.deepEqual(bets.map((bet) => bet.status).sort(), [BET_STATUS.LOST, BET_STATUS.WON]);
    assert.equal(user.coins, 990);
    assert.notEqual(user.coins, 1180);
    assert.equal(ledgers.filter((entry) => /settled; winner/.test(entry.reason)).length, 0);
  } finally { await f.cleanup(); }
});

test("saved match can be declared without match bets and leaves sessions untouched", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const result = await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    assert.equal(result.settledCount, 0);
    assert.equal(result.profitLoss, 0);
    const saved = await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean();
    assert.equal(saved.isDeclared, true);
    assert.equal(saved.wonBy, "A");
    assert.equal(await Session.countDocuments({ matchId: f.matchIds[0], resultStatus: "settled" }), 0);
    await assert.rejects(
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id }),
      (error) => error.code === "MATCH_ALREADY_SETTLED",
    );
  } finally { await f.cleanup(); }
});

test("orphan match bets are cancelled and do not block saved match settlement", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const orphanUserId = new mongoose.Types.ObjectId();
    const orphanBet = await Bet.create({
      userId: orphanUserId,
      rootSuperAdminId: f.superAdmin._id,
      matchId: f.matchIds[0],
      marketType: "match",
      marketId: "a",
      amount: 100,
      rate: 90,
      type: "yes",
      profit: 90,
      loss: 100,
      walletAdjustment: 100,
    });
    const result = await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    assert.equal(result.settledCount, 0);
    assert.equal(result.orphanCancelledCount, 1);
    assert.equal(result.profitLoss, 0);
    assert.equal((await Bet.findById(orphanBet._id).lean()).status, BET_STATUS.CANCELLED);
    assert.equal((await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean()).isDeclared, true);
  } finally { await f.cleanup(); }
});

test("match settlement persists platform profit or loss on the saved match", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "saved-pnl");
    const result = await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    assert.equal(result.profitLoss, -90);
    const saved = await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean();
    assert.equal(saved.profitLoss, -90);
    assert.equal(saved.wonBy, "A");
  } finally { await f.cleanup(); }
});

test("match settlement can be reversed once and then settled again", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "reverse-resettle");
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);

    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    assert.equal((await User.findById(f.user._id).lean()).coins, 1090);
    await assert.rejects(
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "b", settledBy: f.superAdmin._id }),
      (error) => error.code === "MATCH_ALREADY_SETTLED",
    );

    const reversed = await reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.superAdmin._id });
    assert.equal(reversed.reversedCount, 1);
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.PENDING);
    assert.equal((await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean()).isDeclared, false);
    await assert.rejects(
      reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.superAdmin._id }),
      (error) => error.code === "MATCH_NOT_SETTLED",
    );

    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "b", settledBy: f.superAdmin._id });
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.LOST);
    assert.equal((await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean()).wonBy, "B");
    await assertLedgerInvariants(f.user._id);
  } finally { await f.cleanup(); }
});

test("zero-bet match reversal resets declaration and never changes session bets", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const sessionBet = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "reverse-session-isolation");
    const balanceAfterPlacement = (await User.findById(f.user._id).lean()).coins;
    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    const reversed = await reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.superAdmin._id });
    assert.equal(reversed.reversedCount, 0);
    assert.equal((await User.findById(f.user._id).lean()).coins, balanceAfterPlacement);
    assert.equal((await Bet.findById(sessionBet.bet._id).lean()).status, BET_STATUS.PENDING);
    const saved = await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean();
    assert.equal(saved.isDeclared, false);
    assert.equal(saved.wonBy, "");
    assert.equal(saved.profitLoss, 0);
  } finally { await f.cleanup(); }
});

test("reversing orphan settlement returns its cancelled bet to pending", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const orphanBet = await Bet.create({
      userId: new mongoose.Types.ObjectId(), rootSuperAdminId: f.superAdmin._id,
      matchId: f.matchIds[0], marketType: "match", marketId: "a",
      amount: 100, rate: 90, type: "yes", profit: 90, loss: 100, walletAdjustment: 100,
    });
    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    assert.equal((await Bet.findById(orphanBet._id).lean()).status, BET_STATUS.CANCELLED);
    const reversed = await reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.superAdmin._id });
    assert.equal(reversed.reversedCount, 1);
    const refreshed = await Bet.findById(orphanBet._id).lean();
    assert.equal(refreshed.status, BET_STATUS.PENDING);
    assert.equal(refreshed.settlementId, undefined);
  } finally { await f.cleanup(); }
});

test("failed reversal due to insufficient wallet rolls back every change", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "reverse-insufficient");
    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    await User.updateOne({ _id: f.user._id }, { $set: { coins: 100 } });
    const ledgerCountBefore = await Ledger.countDocuments({ userId: f.user._id });
    await assert.rejects(
      reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.superAdmin._id }),
      (error) => error.code === "REVERSAL_INSUFFICIENT_BALANCE",
    );
    assert.equal((await User.findById(f.user._id).lean()).coins, 100);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.WON);
    assert.equal((await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean()).isDeclared, true);
    assert.equal(await Ledger.countDocuments({ userId: f.user._id }), ledgerCountBefore);
  } finally { await f.cleanup(); }
});

test("normal user and another Super Admin cannot reverse an owned settlement", { skip: !enabled }, async () => {
  const f = await fixture();
  const other = await createAccount();
  try {
    await SavedMatch.create({ user: f.superAdmin._id, matchId: f.matchIds[0], homeTeam: "A", awayTeam: "B" });
    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    await assert.rejects(
      reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: f.user._id }),
      (error) => error.code === "REVERSAL_FORBIDDEN",
    );
    await assert.rejects(
      reverseMatchSettlement({ matchId: f.matchIds[0], reversedBy: other.superAdmin._id }),
      (error) => error.code === "MATCH_NOT_FOUND",
    );
    assert.equal((await SavedMatch.findOne({ matchId: f.matchIds[0] }).lean()).isDeclared, true);
  } finally {
    await f.cleanup();
    await cleanup({ matchIds: [], userIds: [other.user._id], accountIds: [other.user._id, other.superAdmin._id] });
  }
});

test("concurrent independent match placements cannot overspend", { skip: !enabled }, async () => {
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const f = await fixture({ coins: 100, marketCount: 2 });
    try {
      const outcomes = await Promise.allSettled(f.matchIds.map((matchId, index) =>
        placeBet(f.user._id, matchId, 100, 90, "yes", "match", "a", undefined, `match-spend-${index}`)
      ));
      assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
      const { user, ledgers } = await assertLedgerInvariants(f.user._id);
      assert.equal(user.coins, 0);
      assert.equal(await Bet.countDocuments({ userId: f.user._id }), 1);
      assert.equal(ledgers.length, 1);
    } finally { await f.cleanup(); }
  }
});

test("concurrent independent session placements cannot overspend", { skip: !enabled }, async () => {
  const f = await fixture({ coins: 100, sessions: ["s1", "s2"] });
  try {
    const outcomes = await Promise.allSettled([
      placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "session-spend-1"),
      placeBet(f.user._id, f.matchIds[0], 100, 92, "yes", "session", "s2", 1, "session-spend-2"),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.equal(user.coins, 0);
    assert.equal(await Bet.countDocuments({ userId: f.user._id }), 1);
    assert.equal(ledgers.length, 1);
  } finally { await f.cleanup(); }
});

test("concurrent duplicate clientBetId adjusts wallet once", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const args = [f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "duplicate-key"];
    const outcomes = await Promise.allSettled([placeBet(...args), placeBet(...args)]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    const rejected = outcomes.find((item) => item.status === "rejected");
    assert.equal(rejected.reason.code, "DUPLICATE_BET");
    assert.equal(await Bet.countDocuments({ userId: f.user._id, clientBetId: "duplicate-key" }), 1);
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.equal(user.coins, 900);
    assert.equal(ledgers.length, 1);
  } finally { await f.cleanup(); }
});

test("idempotency scope allows different keys and the same key for different users", { skip: !enabled }, async () => {
  const f = await fixture({ sessions: ["s1", "s2"] });
  const second = await createAccount(1000);
  try {
    await Promise.all([
      placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "key-1"),
      placeBet(f.user._id, f.matchIds[0], 100, 92, "yes", "session", "s2", 1, "key-2"),
      placeBet(second.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "key-1"),
    ]);
    assert.equal(await Bet.countDocuments({ userId: f.user._id }), 2);
    assert.equal(await Bet.countDocuments({ userId: second.user._id }), 1);
    await assertLedgerInvariants(f.user._id);
    await assertLedgerInvariants(second.user._id);
  } finally {
    await cleanup({ matchIds: [], userIds: [second.user._id], accountIds: [second.user._id, second.superAdmin._id] });
    await f.cleanup();
  }
});

test("session placement failures roll wallet, bet and ledger back and permit retry", { skip: !enabled }, async (t) => {
  const failurePoints = [
    [Ledger, "create"],
    [Bet, "create"],
    [User.prototype, "save"],
  ];
  for (const [target, method] of failurePoints) {
    const f = await fixture();
    try {
      const mock = t.mock.method(target, method, async () => { throw new Error(`forced ${method}`); });
      await assert.rejects(placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, `rollback-${method}`), /forced/);
      mock.mock.restore();
      assert.equal((await User.findById(f.user._id).lean()).coins, 1000);
      assert.equal(await Bet.countDocuments({ userId: f.user._id }), 0);
      assert.equal(await Ledger.countDocuments({ userId: f.user._id }), 0);
      await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, `rollback-${method}`);
      await assertLedgerInvariants(f.user._id);
    } finally { t.mock.restoreAll(); await f.cleanup(); }
  }
});

test("settlement ledger failure rolls claim and wallet back, then retry succeeds", { skip: !enabled }, async (t) => {
  const f = await fixture();
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "settlement-rollback");
    const placementLedgerCount = await Ledger.countDocuments({ userId: f.user._id });
    const mock = t.mock.method(Ledger, "create", async () => { throw new Error("forced settlement ledger"); });
    await assert.rejects(settleBet(placed.bet._id, true, f.superAdmin._id), /forced settlement ledger/);
    mock.mock.restore();
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.PENDING);
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);
    assert.equal(await Ledger.countDocuments({ userId: f.user._id }), placementLedgerCount);
    await settleBet(placed.bet._id, true, f.superAdmin._id);
    assert.equal((await User.findById(f.user._id).lean()).coins, 1100);
    await assertLedgerInvariants(f.user._id);
  } finally { t.mock.restoreAll(); await f.cleanup(); }
});

test("settlement status-update and wallet-save failures leave no partial claim", { skip: !enabled }, async (t) => {
  for (const [target, method] of [[Bet, "findOneAndUpdate"], [User.prototype, "save"]]) {
    const f = await fixture();
    try {
      const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, `settle-failure-${method}`);
      const ledgerCount = await Ledger.countDocuments({ userId: f.user._id });
      const mock = t.mock.method(target, method, async () => { throw new Error(`forced settlement ${method}`); });
      await assert.rejects(settleBet(placed.bet._id, true, f.superAdmin._id), /forced settlement/);
      mock.mock.restore();
      assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.PENDING);
      assert.equal((await User.findById(f.user._id).lean()).coins, 900);
      assert.equal(await Ledger.countDocuments({ userId: f.user._id }), ledgerCount);
      await settleBet(placed.bet._id, true, f.superAdmin._id);
      assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.WON);
      await assertLedgerInvariants(f.user._id);
    } finally { t.mock.restoreAll(); await f.cleanup(); }
  }
});

test("concurrent cancellation releases session liability exactly once", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "cancel-once");
    const outcomes = await Promise.allSettled([
      deleteBetSlip(placed.bet._id, f.superAdmin._id),
      deleteBetSlip(placed.bet._id, f.superAdmin._id),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.CANCELLED);
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.equal(user.coins, 1000);
    assert.equal(ledgers.filter((entry) => /cancelled; exposure released/.test(entry.reason)).length, 1);
    await assertNoInvalidTerminalLedger(f.user._id, f.matchIds[0]);
  } finally { await f.cleanup(); }
});

test("settlement versus cancellation has one winner and no double movement", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "settle-cancel-race");
    const outcomes = await Promise.allSettled([
      settleBet(placed.bet._id, true, f.superAdmin._id),
      deleteBetSlip(placed.bet._id, f.superAdmin._id),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    const bet = await Bet.findById(placed.bet._id).lean();
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.ok([BET_STATUS.WON, BET_STATUS.CANCELLED].includes(bet.status));
    assert.equal(user.coins, bet.status === BET_STATUS.WON ? 1100 : 1000);
    assert.equal(ledgers.length, 2);
  } finally { await f.cleanup(); }
});

test("hedge cancellation restores every intermediate exposure exactly", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const a = await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "cancel-hedge-a");
    assert.equal(a.bet.walletAdjustment, 100);
    assert.equal(a.balance, 900);
    const b = await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "b", undefined, "cancel-hedge-b");
    assert.equal(b.bet.walletAdjustment, -90);
    assert.equal(b.balance, 990);
    const cancelB = await deleteBetSlip(b.bet._id, f.superAdmin._id);
    assert.equal(cancelB.balance, 900);
    assert.equal((await Bet.findById(b.bet._id).lean()).status, BET_STATUS.CANCELLED);
    const cancelA = await deleteBetSlip(a.bet._id, f.superAdmin._id);
    assert.equal(cancelA.balance, 1000);
    assert.equal((await Bet.findById(a.bet._id).lean()).status, BET_STATUS.CANCELLED);
    const { ledgers } = await assertLedgerInvariants(f.user._id);
    assert.deepEqual(ledgers.map(({ type, amount, balanceBefore, balanceAfter }) => ({ type, amount, balanceBefore, balanceAfter })), [
      { type: "debit", amount: 100, balanceBefore: 1000, balanceAfter: 900 },
      { type: "credit", amount: 90, balanceBefore: 900, balanceAfter: 990 },
      { type: "debit", amount: 90, balanceBefore: 990, balanceAfter: 900 },
      { type: "credit", amount: 100, balanceBefore: 900, balanceAfter: 1000 },
    ]);
  } finally { await f.cleanup(); }
});

test("match placement failures roll wallet, bet and ledger back and permit retry", { skip: !enabled }, async (t) => {
  for (const [target, method] of [[Ledger, "create"], [Bet, "create"], [User.prototype, "save"]]) {
    const f = await fixture();
    try {
      const mock = t.mock.method(target, method, async () => { throw new Error(`forced match ${method}`); });
      await assert.rejects(
        placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, `match-rollback-${method}`),
        /forced match/,
      );
      mock.mock.restore();
      assert.equal((await User.findById(f.user._id).lean()).coins, 1000);
      assert.equal(await Bet.countDocuments({ userId: f.user._id }), 0);
      assert.equal(await Ledger.countDocuments({ userId: f.user._id }), 0);
      await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, `match-rollback-${method}`);
      await assertLedgerInvariants(f.user._id);
    } finally { t.mock.restoreAll(); await f.cleanup(); }
  }
});

test("multi-user match settlement failure rolls back every wallet, bet and ledger", { skip: !enabled }, async (t) => {
  const f = await fixture();
  const token = `${Date.now()}${sequence++}`;
  const secondUser = await User.create({
    username: `usr${token}`.slice(0, 30), password: "pass1234", role: ROLES.USER, coins: 1000,
    createdBy: f.superAdmin._id, parentId: f.superAdmin._id, rootSuperAdminId: f.superAdmin._id,
  });
  try {
    await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "multi-user-a");
    await placeBet(secondUser._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "multi-user-b");
    const ledgerCounts = await Promise.all([
      Ledger.countDocuments({ userId: f.user._id }),
      Ledger.countDocuments({ userId: secondUser._id }),
    ]);
    const originalCreate = Ledger.create;
    let settlementLedgers = 0;
    const mock = t.mock.method(Ledger, "create", async function (...args) {
      settlementLedgers += 1;
      if (settlementLedgers === 2) throw new Error("forced second-user ledger failure");
      return originalCreate.apply(this, args);
    });
    await assert.rejects(
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id }),
      /forced second-user/,
    );
    mock.mock.restore();
    assert.deepEqual((await Bet.find({ matchId: f.matchIds[0] }).lean()).map((bet) => bet.status), [BET_STATUS.PENDING, BET_STATUS.PENDING]);
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);
    assert.equal((await User.findById(secondUser._id).lean()).coins, 900);
    assert.equal(await Ledger.countDocuments({ userId: f.user._id }), ledgerCounts[0]);
    assert.equal(await Ledger.countDocuments({ userId: secondUser._id }), ledgerCounts[1]);
    await settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id });
    await assertLedgerInvariants(f.user._id);
    await assertLedgerInvariants(secondUser._id);
  } finally {
    t.mock.restoreAll();
    await cleanup({ matchIds: [], userIds: [secondUser._id], accountIds: [secondUser._id] });
    await f.cleanup();
  }
});

test("cross-tenant super admin cannot settle or cancel another tenant bet", { skip: !enabled }, async () => {
  const f = await fixture();
  const other = await createAccount(0);
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 91, "yes", "session", "s1", 1, "tenant-session");
    await assert.rejects(settleBet(placed.bet._id, true, other.superAdmin._id), (error) => error.code === "CROSS_TENANT_FORBIDDEN");
    await assert.rejects(deleteBetSlip(placed.bet._id, other.superAdmin._id), (error) => error.code === "CROSS_TENANT_FORBIDDEN");
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.PENDING);
    assert.equal((await User.findById(f.user._id).lean()).coins, 900);
    assert.equal(await Ledger.countDocuments({ userId: f.user._id }), 1);
    await deleteBetSlip(placed.bet._id, f.superAdmin._id);
    assert.equal((await Bet.findById(placed.bet._id).lean()).status, BET_STATUS.CANCELLED);
  } finally {
    await cleanup({ matchIds: [], userIds: [other.user._id], accountIds: [other.user._id, other.superAdmin._id] });
    await f.cleanup();
  }
});

test("match settlement versus cancellation has one winner", { skip: !enabled }, async () => {
  const f = await fixture();
  try {
    const placed = await placeBet(f.user._id, f.matchIds[0], 100, 90, "yes", "match", "a", undefined, "match-settle-cancel");
    const outcomes = await Promise.allSettled([
      settleMatchBets({ matchId: f.matchIds[0], winningRunnerId: "a", settledBy: f.superAdmin._id }),
      deleteBetSlip(placed.bet._id, f.superAdmin._id),
    ]);
    assert.equal(outcomes.filter((item) => item.status === "fulfilled").length, 1);
    const bet = await Bet.findById(placed.bet._id).lean();
    const { user, ledgers } = await assertLedgerInvariants(f.user._id);
    assert.ok([BET_STATUS.WON, BET_STATUS.CANCELLED].includes(bet.status));
    assert.equal(user.coins, bet.status === BET_STATUS.WON ? 1090 : 1000);
    assert.equal(ledgers.length, 2);
  } finally { await f.cleanup(); }
});
