"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet, BET_STATUS } = require("../../src/modules/bet/bet.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const MatchEntry = require("../../src/modules/saved-match/match-entry.model");
const ManualRunner = require("../../src/modules/manual/manual-runner.model");
const { settleMatchBets, reverseMatchSettlement } = require("../../src/modules/bet/bet.service");
const { getCompanyLimitSummary } = require("../../src/modules/sub-company/sub-company-limit.service");
const { getSettlementLedger } = require("../../src/modules/ledger/settlement-ledger.service");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now();
const matchId = `hundred-user-settlement-${stamp}`;
const USER_COUNT = 100;
const LOSER_COUNT = 60;
const STARTING_BALANCE = 2000;
const ENTRY_FEE = 15;
const STAKE = 1000;
const RESERVED_BALANCE = STARTING_BALANCE - ENTRY_FEE - STAKE;
let superAdmin;
let company;
let users = [];

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  superAdmin = await User.create({
    username: `hundredsa${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUPERADMIN, coins: 0,
  });
  company = await User.create({
    username: `hundredco${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUB_COMPANY,
    coins: 0, fixLimit: USER_COUNT * STARTING_BALANCE, allocatedShareBps: 8000,
    createdBy: superAdmin._id, parentId: superAdmin._id, rootSuperAdminId: superAdmin._id,
  });

  users = await User.insertMany(Array.from({ length: USER_COUNT }, (_, index) => ({
    username: `hu${String(stamp).slice(-8)}${String(index).padStart(3, "0")}`,
    password: "test-only-password", role: ROLES.USER,
    coins: RESERVED_BALANCE, currentLimit: RESERVED_BALANCE, fixLimit: STARTING_BALANCE,
    createdBy: company._id, parentId: company._id, rootSuperAdminId: superAdmin._id,
    ancestorIds: [superAdmin._id, company._id],
  })));

  await Promise.all([
    SavedMatch.create({ user: superAdmin._id, matchId, homeTeam: "Winning A", awayTeam: "Losing B" }),
    ManualRunner.create([
      { matchId, runnerId: "a", runnerName: "Winning A", lagai: 100, khai: 100, status: "open" },
      { matchId, runnerId: "b", runnerName: "Losing B", lagai: 100, khai: 100, status: "open" },
    ]),
    MatchEntry.insertMany(users.map((user) => ({
      userId: user._id, rootSuperAdminId: superAdmin._id, matchId,
      matchName: "Winning A vs Losing B", fee: ENTRY_FEE,
    }))),
    Bet.insertMany(users.map((user, index) => ({
      userId: user._id, rootSuperAdminId: superAdmin._id,
      ownerPath: [superAdmin._id, company._id],
      shareSnapshot: [
        { userId: superAdmin._id, role: ROLES.SUPERADMIN, shareBps: 2000 },
        { userId: company._id, role: ROLES.SUB_COMPANY, shareBps: 8000 },
      ],
      matchId, marketType: "match", marketId: index < LOSER_COUNT ? "b" : "a",
      amount: STAKE, rate: 100, type: "yes", profit: STAKE, loss: STAKE,
      walletAdjustment: STAKE, status: BET_STATUS.PENDING,
    }))),
  ]);
});

test.after(async () => {
  if (!enabled) return;
  const userIds = users.map((user) => user._id);
  await Promise.all([
    Bet.deleteMany({ matchId }), Ledger.deleteMany({ $or: [{ userId: { $in: userIds } }, { matchId }] }),
    MatchEntry.deleteMany({ matchId }), ManualRunner.deleteMany({ matchId }), SavedMatch.deleteMany({ matchId }),
  ]);
  await User.deleteMany({ _id: { $in: [...userIds, company._id, superAdmin._id] } });
  await mongoose.disconnect();
});

test("100 users: used limit, win/loss settlement, fee sharing and reversal stay consistent", { skip: !enabled, timeout: 120000 }, async () => {
  const before = await getCompanyLimitSummary(company._id);
  assert.equal(before.usedLimit, USER_COUNT * (STAKE + ENTRY_FEE));
  assert.equal(before.allocatedLimit, USER_COUNT * STARTING_BALANCE);

  const settled = await settleMatchBets({ matchId, winningRunnerId: "a", settledBy: superAdmin._id });
  assert.equal(settled.settledCount, USER_COUNT);
  assert.equal(settled.profitLoss, (LOSER_COUNT - (USER_COUNT - LOSER_COUNT)) * STAKE);

  const [after, settledUsers, settledBets, saved, adminLedger, companyLedger] = await Promise.all([
    getCompanyLimitSummary(company._id),
    User.find({ _id: { $in: users.map((user) => user._id) } }).sort({ username: 1 }).lean(),
    Bet.find({ matchId }).lean(), SavedMatch.findOne({ matchId }).lean(),
    getSettlementLedger(superAdmin._id), getSettlementLedger(company._id),
  ]);
  assert.equal(after.usedLimit, 0);
  assert.equal(saved.isDeclared, true);
  assert.equal(settledBets.filter((bet) => bet.status === BET_STATUS.LOST).length, LOSER_COUNT);
  assert.equal(settledBets.filter((bet) => bet.status === BET_STATUS.WON).length, USER_COUNT - LOSER_COUNT);
  assert.equal(settledBets.every((bet) => bet.limitReleasedAt instanceof Date), true);

  const losers = settledUsers.filter((user) => user.coins === RESERVED_BALANCE);
  const winners = settledUsers.filter((user) => user.coins === RESERVED_BALANCE + (2 * STAKE));
  assert.equal(losers.length, LOSER_COUNT);
  assert.equal(winners.length, USER_COUNT - LOSER_COUNT);
  assert.equal(settledUsers.every((user) => user.currentLimit === user.coins), true);

  const expectedShare = ((LOSER_COUNT - (USER_COUNT - LOSER_COUNT)) * STAKE * 20) / 100;
  const expectedFees = USER_COUNT * ENTRY_FEE;
  assert.equal(adminLedger.rows[0].amount, expectedShare + expectedFees);
  assert.equal(adminLedger.rows[0].type, "credit");
  assert.equal(companyLedger.rows[0].amount, expectedShare + expectedFees);
  assert.equal(companyLedger.rows[0].type, "debit");
  assert.equal(companyLedger.rows[0].matchEntryFee, expectedFees);

  await assert.rejects(
    settleMatchBets({ matchId, winningRunnerId: "a", settledBy: superAdmin._id }),
    (error) => error.code === "MATCH_ALREADY_SETTLED"
  );

  const reversed = await reverseMatchSettlement({ matchId, reversedBy: superAdmin._id });
  assert.equal(reversed.reversedCount, USER_COUNT);
  const [reversedSummary, reversedUsers, reversedBets, reversedMatch, reversedLedger] = await Promise.all([
    getCompanyLimitSummary(company._id),
    User.find({ _id: { $in: users.map((user) => user._id) } }).lean(),
    Bet.find({ matchId }).lean(), SavedMatch.findOne({ matchId }).lean(), getSettlementLedger(company._id),
  ]);
  assert.equal(reversedSummary.usedLimit, USER_COUNT * (STAKE + ENTRY_FEE));
  assert.equal(reversedUsers.every((user) => user.coins === RESERVED_BALANCE && user.currentLimit === RESERVED_BALANCE), true);
  assert.equal(reversedBets.every((bet) => bet.status === BET_STATUS.PENDING && bet.limitReleasedAt === undefined), true);
  assert.equal(reversedMatch.isDeclared, false);
  assert.deepEqual(reversedLedger.rows, []);
  await assert.rejects(
    reverseMatchSettlement({ matchId, reversedBy: superAdmin._id }),
    (error) => error.code === "MATCH_NOT_SETTLED"
  );
});
