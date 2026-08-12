"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { Bet } = require("../../src/modules/bet/bet.model");
const SavedMatch = require("../../src/modules/saved-match/saved-match.model");
const { getSettlementLedger } = require("../../src/modules/ledger/settlement-ledger.service");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
let sequence = 0;
const createdMatchIds = [];
const createdUserIds = [];
const stamp = () => `${Date.now()}${sequence++}`;
const moneyBet = ({ user, superAdmin, company, matchId, status, value = 100, marketType = "match", shareBps = 500, snapshot = true, ownerPath = true }) => ({
  userId: user._id, rootSuperAdminId: superAdmin._id,
  ...(ownerPath ? { ownerPath: [superAdmin._id, company._id] } : {}),
  ...(snapshot ? { shareSnapshot: [{ userId: superAdmin._id, role: ROLES.SUPERADMIN, shareBps }, { userId: company._id, role: ROLES.SUB_COMPANY, shareBps: 10000 - shareBps }] } : {}),
  matchId, marketType, marketId: marketType === "session" ? "s1" : "a",
  amount: value, rate: 100, type: "yes", profit: value, loss: value, status,
});

async function accounts(companyShareBps = 9500) {
  const id = stamp();
  const superAdmin = await User.create({ username: `cornersa${id}`.slice(0, 30), password: "pass1234", role: ROLES.SUPERADMIN });
  const company = await User.create({ username: `cornerco${id}`.slice(0, 30), password: "pass1234", role: ROLES.SUB_COMPANY, allocatedShareBps: companyShareBps, createdBy: superAdmin._id, parentId: superAdmin._id, rootSuperAdminId: superAdmin._id });
  const user = await User.create({ username: `cornerus${id}`.slice(0, 30), password: "pass1234", role: ROLES.USER, createdBy: company._id, parentId: company._id, rootSuperAdminId: superAdmin._id });
  createdUserIds.push(superAdmin._id, company._id, user._id);
  return { superAdmin, company, user };
}

async function declared(superAdmin, suffix, settledAt = new Date()) {
  const matchId = `ledger-corner-${stamp()}-${suffix}`;
  createdMatchIds.push(matchId);
  await SavedMatch.create({ user: superAdmin._id, matchId, homeTeam: "Home", awayTeam: "Away", isDeclared: true, wonBy: "Away", settledAt });
  return matchId;
}

test.before(async () => { if (enabled) await mongoose.connect(process.env.TEST_MONGODB_URI); });
test.after(async () => {
  if (!enabled) return;
  await Promise.all([Bet.deleteMany({ matchId: { $in: createdMatchIds } }), SavedMatch.deleteMany({ matchId: { $in: createdMatchIds } })]);
  await User.deleteMany({ _id: { $in: createdUserIds } });
  await mongoose.disconnect();
});

test("historical snapshot wins over a later company-share change", { skip: !enabled }, async () => {
  const a = await accounts(9500); const matchId = await declared(a.superAdmin, "snapshot");
  await Bet.create(moneyBet({ ...a, matchId, status: "lost", shareBps: 500 }));
  await User.updateOne({ _id: a.company._id }, { $set: { allocatedShareBps: 8000 } });
  const sub = await getSettlementLedger(a.company._id); const admin = await getSettlementLedger(a.superAdmin._id);
  assert.equal(sub.rows[0].amount, 5); assert.equal(admin.rows[0].amount, 5);
});

test("legacy bet without snapshot uses current company share fallback", { skip: !enabled }, async () => {
  const a = await accounts(8000); const matchId = await declared(a.superAdmin, "legacy");
  await Bet.create(moneyBet({ ...a, matchId, status: "lost", snapshot: false, shareBps: 0 }));
  const sub = await getSettlementLedger(a.company._id);
  assert.equal(sub.rows[0].amount, 20); assert.equal(sub.rows[0].balance, 20);
});

test("negative SuperAdmin result is Sub Company receivable with minus balance", { skip: !enabled }, async () => {
  const a = await accounts(); const matchId = await declared(a.superAdmin, "receivable");
  await Bet.create(moneyBet({ ...a, matchId, status: "won", value: 200 }));
  const sub = await getSettlementLedger(a.company._id); const admin = await getSettlementLedger(a.superAdmin._id);
  assert.equal(sub.rows[0].type, "credit"); assert.equal(sub.rows[0].amount, 10); assert.equal(sub.rows[0].balance, -10); assert.equal(sub.receivable, 10); assert.equal(sub.netBalance, -10);
  assert.equal(admin.rows[0].type, "debit"); assert.equal(admin.rows[0].balance, -10); assert.equal(admin.payable, 10);
});

test("match and session results combine and a zero total creates no row", { skip: !enabled }, async () => {
  const a = await accounts(); const matchId = await declared(a.superAdmin, "zero");
  await Bet.create([moneyBet({ ...a, matchId, status: "lost", value: 100 }), moneyBet({ ...a, matchId, status: "won", value: 100, marketType: "session" })]);
  assert.deepEqual((await getSettlementLedger(a.company._id)).rows, []);
  assert.deepEqual((await getSettlementLedger(a.superAdmin._id)).rows, []);
});

test("pending, cancelled, and undeclared results never enter settlement ledger", { skip: !enabled }, async () => {
  const a = await accounts(); const declaredId = await declared(a.superAdmin, "ignored");
  const undeclaredId = `ledger-corner-${stamp()}-undeclared`; createdMatchIds.push(undeclaredId);
  await SavedMatch.create({ user: a.superAdmin._id, matchId: undeclaredId, homeTeam: "X", awayTeam: "Y", isDeclared: false });
  await Bet.create([moneyBet({ ...a, matchId: declaredId, status: "pending" }), moneyBet({ ...a, matchId: declaredId, status: "cancelled" }), moneyBet({ ...a, matchId: undeclaredId, status: "lost" })]);
  assert.equal((await getSettlementLedger(a.company._id)).rows.length, 0);
});

test("running balance is chronological while returned rows are newest first", { skip: !enabled }, async () => {
  const a = await accounts();
  const older = await declared(a.superAdmin, "older", new Date("2026-01-01T00:00:00Z")); const newer = await declared(a.superAdmin, "newer", new Date("2026-01-02T00:00:00Z"));
  await Bet.create([moneyBet({ ...a, matchId: older, status: "lost", value: 100 }), moneyBet({ ...a, matchId: newer, status: "won", value: 40 })]);
  const sub = await getSettlementLedger(a.company._id);
  assert.deepEqual(sub.rows.map((row) => row.matchId), [newer, older]);
  assert.equal(sub.rows[1].balance, 5); assert.equal(sub.rows[0].balance, 3); assert.equal(sub.netBalance, 3);
});

test("decimal shares round each bet and totals safely to two decimals", { skip: !enabled }, async () => {
  const a = await accounts(8766); const matchId = await declared(a.superAdmin, "rounding");
  await Bet.create([moneyBet({ ...a, matchId, status: "lost", value: 10.01, shareBps: 1234 }), moneyBet({ ...a, matchId, status: "lost", value: 10.02, shareBps: 1234 })]);
  const sub = await getSettlementLedger(a.company._id);
  assert.equal(sub.rows[0].amount, 2.48); assert.equal(Number.isFinite(sub.netBalance), true);
});

test("deleted betting user still maps safely through immutable ownerPath", { skip: !enabled }, async () => {
  const a = await accounts(); const matchId = await declared(a.superAdmin, "deleted-user");
  await Bet.create(moneyBet({ ...a, matchId, status: "lost" }));
  await User.deleteOne({ _id: a.user._id });
  const sub = await getSettlementLedger(a.company._id);
  assert.equal(sub.rows.length, 1); assert.equal(sub.rows[0].amount, 5);
});

test("tenant isolation excludes another SuperAdmin company and bets", { skip: !enabled }, async () => {
  const first = await accounts(); const second = await accounts();
  const firstMatch = await declared(first.superAdmin, "tenant-a"); const secondMatch = await declared(second.superAdmin, "tenant-b");
  await Bet.create([moneyBet({ ...first, matchId: firstMatch, status: "lost" }), moneyBet({ ...second, matchId: secondMatch, status: "lost", value: 500 })]);
  const ledger = await getSettlementLedger(first.superAdmin._id);
  assert.equal(ledger.rows.length, 1); assert.equal(String(ledger.rows[0].companyId), String(first.company._id)); assert.equal(ledger.rows[0].matchId, firstMatch);
});

test("empty ledgers return stable zero summaries", { skip: !enabled }, async () => {
  const a = await accounts();
  assert.deepEqual(await getSettlementLedger(a.company._id), { rows: [], payable: 0, receivable: 0, netBalance: 0 });
});

test("normal user and missing viewer are forbidden", { skip: !enabled }, async () => {
  const a = await accounts();
  await assert.rejects(getSettlementLedger(a.user._id), (error) => error.code === "LEDGER_FORBIDDEN" && error.statusCode === 403);
  await assert.rejects(getSettlementLedger(new mongoose.Types.ObjectId()), (error) => error.code === "LEDGER_FORBIDDEN");
});
