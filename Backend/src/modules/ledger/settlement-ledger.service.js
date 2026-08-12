"use strict";

const { User, ROLES } = require("../user/user.model");
const { Bet, BET_STATUS } = require("../bet/bet.model");
const SavedMatch = require("../saved-match/saved-match.model");
const { getCompanyShareBps, getViewerShareBps } = require("../bet/bet-share.service");

const money = (value) => Number(Number(value || 0).toFixed(2));

async function getSettlementLedger(viewerId) {
  const viewer = await User.findById(viewerId).select("role rootSuperAdminId parentId createdBy").lean();
  if (!viewer || ![ROLES.SUPERADMIN, ROLES.SUB_COMPANY].includes(viewer.role)) {
    const error = new Error("Settlement ledger is not available for this account"); error.statusCode = 403; error.code = "LEDGER_FORBIDDEN"; throw error;
  }
  const rootId = viewer.role === ROLES.SUPERADMIN ? viewer._id : (viewer.rootSuperAdminId || viewer.parentId || viewer.createdBy);
  const companies = viewer.role === ROLES.SUB_COMPANY
    ? await User.find({ _id: viewer._id, role: ROLES.SUB_COMPANY }).select("username firstName allocatedShareBps allocatedShare downlineShare").lean()
    : await User.find({ role: ROLES.SUB_COMPANY, $or: [{ rootSuperAdminId: rootId }, { parentId: rootId }, { createdBy: rootId }] }).select("username firstName allocatedShareBps allocatedShare downlineShare").lean();
  const matches = await SavedMatch.find({ user: rootId, isDeclared: true }).sort({ settledAt: 1, createdAt: 1 }).lean();
  if (!companies.length || !matches.length) return { rows: [], payable: 0, receivable: 0, netBalance: 0 };

  const companyIds = companies.map((company) => company._id);
  const users = await User.find({ role: ROLES.USER, $or: [{ createdBy: { $in: companyIds } }, { parentId: { $in: companyIds } }] }).select("_id createdBy parentId").lean();
  const companyByUser = new Map(users.map((user) => [String(user._id), String(user.parentId || user.createdBy)]));
  const companyById = new Map(companies.map((company) => [String(company._id), company]));
  const bets = await Bet.find({ matchId: { $in: matches.map((match) => match.matchId) }, status: { $in: [BET_STATUS.WON, BET_STATUS.LOST] } }).lean();
  const totals = new Map();
  for (const bet of bets) {
    const companyId = companyIds.find((id) => Array.isArray(bet.ownerPath) && bet.ownerPath.some((ownerId) => String(ownerId) === String(id))) || companyByUser.get(String(bet.userId));
    const company = companyById.get(String(companyId));
    if (!company) continue;
    const superShareBps = getViewerShareBps(bet, rootId) ?? (10000 - getCompanyShareBps(company));
    const fullPnl = bet.status === BET_STATUS.WON ? -Number(bet.profit) : Number(bet.loss);
    const superPnl = money(fullPnl * superShareBps / 10000);
    const key = `${company._id}:${bet.matchId}`;
    totals.set(key, money((totals.get(key) || 0) + superPnl));
  }

  const rows = [];
  for (const match of matches) {
    for (const company of companies) {
      const superPnl = totals.get(`${company._id}:${match.matchId}`) || 0;
      if (superPnl === 0) continue;
      const subCompanyView = viewer.role === ROLES.SUB_COMPANY;
      const type = subCompanyView
        ? (superPnl > 0 ? "debit" : "credit")
        : (superPnl > 0 ? "credit" : "debit");
      rows.push({
        id: `${match._id}:${company._id}`,
        matchId: match.matchId,
        matchName: [match.homeTeam, match.awayTeam].filter(Boolean).join(" vs ") || match.matchId,
        companyId: company._id,
        companyName: company.firstName || company.username,
        date: match.settledAt || match.updatedAt,
        type,
        amount: Math.abs(superPnl),
        note: subCompanyView
          ? (type === "debit" ? "Payable to SuperAdmin" : "Receivable from SuperAdmin")
          : (type === "credit" ? "Receivable from Sub Company" : "Payable to Sub Company"),
      });
    }
  }
  let balance = 0; let payable = 0; let receivable = 0;
  for (const row of rows) {
    balance = money(balance + (viewer.role === ROLES.SUB_COMPANY
      ? (row.type === "debit" ? row.amount : -row.amount)
      : (row.type === "credit" ? row.amount : -row.amount)));
    row.balance = balance;
    if (row.type === "debit") payable = money(payable + row.amount); else receivable = money(receivable + row.amount);
  }
  return { rows: rows.reverse(), payable, receivable, netBalance: balance };
}

module.exports = { getSettlementLedger };
