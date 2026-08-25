"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Ledger } = require("../../src/modules/ledger/ledger.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const MatchEntry = require("../../src/modules/saved-match/match-entry.model");
const { enterMatch, MATCH_ENTRY_FEE } = require("../../src/modules/saved-match/match-entry.service");
const { getSettlementLedger } = require("../../src/modules/ledger/settlement-ledger.service");
const { getCompanyLimitSummary } = require("../../src/modules/sub-company/sub-company-limit.service");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const ids = { users: [], matches: [] };
let sequence = 0;

async function fixture(coins = 1000) {
  const stamp = `${Date.now()}${sequence++}`;
  const superAdmin = await User.create({ username: `entrysa${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUPERADMIN, coins: 100 });
  const subCompany = await User.create({ username: `entryco${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.SUB_COMPANY, coins: 0, rootSuperAdminId: superAdmin._id, createdBy: superAdmin._id });
  const user = await User.create({ username: `entryusr${stamp}`.slice(0, 30), password: "pass1234", role: ROLES.USER, coins, currentLimit: coins, rootSuperAdminId: superAdmin._id, createdBy: subCompany._id, parentId: subCompany._id });
  const matchId = `entry-match-${stamp}`;
  await SavedMatch.create({ user: superAdmin._id, matchId, homeTeam: "Southern Brave", awayTeam: "Welsh Fire" });
  ids.users.push(superAdmin._id, subCompany._id, user._id);
  ids.matches.push(matchId);
  return { superAdmin, subCompany, user, matchId };
}

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await MatchEntry.syncIndexes();
});

test.after(async () => {
  if (!enabled) return;
  await Promise.all([
    MatchEntry.deleteMany({ matchId: { $in: ids.matches } }),
    Ledger.deleteMany({ userId: { $in: ids.users } }),
    SavedMatch.deleteMany({ matchId: { $in: ids.matches } }),
    User.deleteMany({ _id: { $in: ids.users } }),
  ]);
  await mongoose.disconnect();
});

test("match entry transfers the fee to root Super Admin and writes both ledgers", { skip: !enabled }, async () => {
  const f = await fixture();
  const result = await enterMatch(f.user._id, f.matchId);
  const [user, superAdmin, entries, ledgers] = await Promise.all([
    User.findById(f.user._id).lean(),
    User.findById(f.superAdmin._id).lean(),
    MatchEntry.find({ userId: f.user._id, matchId: f.matchId }).lean(),
    Ledger.find({ correlationId: `match-entry:${f.user._id}:${f.matchId}` }).sort({ type: 1 }).lean(),
  ]);
  assert.equal(result.alreadyEntered, false);
  assert.equal(user.coins, 1000 - MATCH_ENTRY_FEE);
  assert.equal(superAdmin.coins, 100 + MATCH_ENTRY_FEE);
  assert.equal(entries.length, 1);
  assert.equal(ledgers.length, 2);
  assert.deepEqual(new Set(ledgers.map((entry) => entry.transactionCode)), new Set(["MATCH_ENTRY_FEE_DEBIT", "MATCH_ENTRY_FEE_CREDIT"]));
  const limitSummary = await getCompanyLimitSummary(f.subCompany._id);
  assert.equal(limitSummary.usedLimit, MATCH_ENTRY_FEE);
});

test("concurrent and repeated entry requests charge exactly once", { skip: !enabled }, async () => {
  const f = await fixture();
  const concurrent = await Promise.all([enterMatch(f.user._id, f.matchId), enterMatch(f.user._id, f.matchId)]);
  const repeated = await enterMatch(f.user._id, f.matchId);
  assert.equal(concurrent.filter((item) => item.alreadyEntered === false).length, 1);
  assert.equal(repeated.alreadyEntered, true);
  assert.equal((await User.findById(f.user._id).lean()).coins, 1000 - MATCH_ENTRY_FEE);
  assert.equal(await MatchEntry.countDocuments({ userId: f.user._id, matchId: f.matchId }), 1);
  assert.equal(await Ledger.countDocuments({ correlationId: `match-entry:${f.user._id}:${f.matchId}` }), 2);
});

test("insufficient balance rejects entry without partial wallet or ledger changes", { skip: !enabled }, async () => {
  const f = await fixture(MATCH_ENTRY_FEE - 1);
  await assert.rejects(enterMatch(f.user._id, f.matchId), (error) => {
    assert.equal(error.code, "MATCH_ENTRY_INSUFFICIENT_BALANCE");
    assert.equal(error.requiredFee, MATCH_ENTRY_FEE);
    assert.equal(error.currentBalance, MATCH_ENTRY_FEE - 1);
    return true;
  });
  assert.equal((await User.findById(f.user._id).lean()).coins, MATCH_ENTRY_FEE - 1);
  assert.equal((await User.findById(f.superAdmin._id).lean()).coins, 100);
  assert.equal(await MatchEntry.countDocuments({ userId: f.user._id, matchId: f.matchId }), 0);
});

test("user cannot enter a match owned by another Super Admin", { skip: !enabled }, async () => {
  const f = await fixture();
  const other = await fixture();
  await assert.rejects(enterMatch(f.user._id, other.matchId), (error) => error.statusCode === 404);
  assert.equal((await User.findById(f.user._id).lean()).coins, 1000);
});

test("user can enter a global external match saved by Support", { skip: !enabled }, async () => {
  const f = await fixture();
  const stamp = `${Date.now()}${sequence++}`;
  const support = await User.create({
    username: `entrysupport${stamp}`.slice(0, 30),
    password: "pass1234",
    role: ROLES.SUPPORT,
  });
  ids.users.push(support._id);
  await SavedMatch.updateOne(
    { matchId: f.matchId },
    { $set: { user: support._id, source: "external" } }
  );

  const result = await enterMatch(f.user._id, f.matchId);
  assert.equal(result.alreadyEntered, false);
  assert.equal((await User.findById(f.user._id).lean()).coins, 1000 - MATCH_ENTRY_FEE);
  assert.equal((await User.findById(f.superAdmin._id).lean()).coins, 100 + MATCH_ENTRY_FEE);
});

test("declared-match Super Admin ledger includes the match entry fee", { skip: !enabled }, async () => {
  const f = await fixture();
  await enterMatch(f.user._id, f.matchId);
  await SavedMatch.updateOne({ matchId: f.matchId, user: f.superAdmin._id }, { $set: { isDeclared: true, settledAt: new Date() } });
  assert.equal((await getCompanyLimitSummary(f.subCompany._id)).usedLimit, 0);
  const ledger = await getSettlementLedger(f.superAdmin._id);
  const row = ledger.rows.find((item) => item.matchId === f.matchId && String(item.companyId) === String(f.subCompany._id));
  assert.ok(row);
  assert.equal(row.type, "credit");
  assert.equal(row.amount, MATCH_ENTRY_FEE);
  assert.equal(row.matchEntryFee, MATCH_ENTRY_FEE);
  const subLedger = await getSettlementLedger(f.subCompany._id);
  const subRow = subLedger.rows.find((item) => item.matchId === f.matchId);
  assert.ok(subRow);
  assert.equal(subRow.type, "debit");
  assert.equal(subRow.amount, MATCH_ENTRY_FEE);
  assert.equal(subRow.matchEntryFee, MATCH_ENTRY_FEE);
  assert.match(subRow.note, /includes 15 match fee/i);
});
