"use strict";

const { User, ROLES } = require("../user/user.model");

const normalizeBps = (value, fallback = 0) => {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10000
    ? value
    : fallback;
};

const scaleMoney = (value, shareBps) =>
  Number(((Number(value) || 0) * shareBps / 10000).toFixed(2));

const getCompanyShareBps = (company) => {
  const current = normalizeBps(company?.allocatedShareBps);
  if (current > 0) return current;
  const legacyAllocated = normalizeBps(company?.allocatedShare);
  if (legacyAllocated > 0) return legacyAllocated;
  const legacyPercent = Number(company?.downlineShare);
  if (Number.isFinite(legacyPercent) && legacyPercent >= 0 && legacyPercent <= 100)
    return Math.round(legacyPercent * 100);
  return current;
};

const scaleBetForShare = (bet, shareBps) => {
  const safeShareBps = normalizeBps(shareBps);
  const result = {
    ...bet,
    amount: scaleMoney(bet.amount, safeShareBps),
    profit: scaleMoney(bet.profit, safeShareBps),
    loss: scaleMoney(bet.loss, safeShareBps),
    visibleShareBps: safeShareBps,
    visibleSharePercent: safeShareBps / 100,
  };
  if (bet.walletAdjustment != null)
    result.walletAdjustment = scaleMoney(bet.walletAdjustment, safeShareBps);
  return result;
};

const scaleBetForRemainder = (bet, allocatedShareBps) => {
  const allocated = scaleBetForShare(bet, allocatedShareBps);
  const result = {
    ...bet,
    amount: Number(((Number(bet.amount) || 0) - allocated.amount).toFixed(2)),
    profit: Number(((Number(bet.profit) || 0) - allocated.profit).toFixed(2)),
    loss: Number(((Number(bet.loss) || 0) - allocated.loss).toFixed(2)),
    visibleShareBps: 10000 - normalizeBps(allocatedShareBps),
    visibleSharePercent: (10000 - normalizeBps(allocatedShareBps)) / 100,
  };
  if (bet.walletAdjustment != null)
    result.walletAdjustment = Number((Number(bet.walletAdjustment) - allocated.walletAdjustment).toFixed(2));
  return result;
};

const resolveShareSnapshot = async (user, session) => {
  const parentId = user.parentId || user.createdBy;
  if (!parentId) return { companyId: undefined, superAdminId: undefined, companyShareBps: 0, superAdminShareBps: 10000 };

  const parent = await User.findById(parentId)
    .select("role allocatedShareBps allocatedShare downlineShare createdBy parentId")
    .session(session || null)
    .lean();
  if (parent?.role !== ROLES.SUB_COMPANY) {
    return { companyId: undefined, superAdminId: parentId, companyShareBps: 0, superAdminShareBps: 10000 };
  }

  const companyShareBps = getCompanyShareBps(parent);
  return {
    companyId: parent._id,
    superAdminId: parent.parentId || parent.createdBy,
    companyShareBps,
    superAdminShareBps: 10000 - companyShareBps,
  };
};

module.exports = { normalizeBps, getCompanyShareBps, scaleBetForShare, scaleBetForRemainder, resolveShareSnapshot };
