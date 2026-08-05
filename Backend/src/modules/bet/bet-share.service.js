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

const getAllocatedShareBps = (account) => getCompanyShareBps(account);

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

const getViewerShareBps = (bet, viewerId) => {
  const allocation = Array.isArray(bet.shareSnapshot)
    ? bet.shareSnapshot.find((item) => String(item.userId) === String(viewerId))
    : undefined;
  return allocation ? normalizeBps(allocation.shareBps) : undefined;
};

const scaleBetForViewer = (bet, viewerId, fallbackShareBps = 0) => {
  const snapshotShare = getViewerShareBps(bet, viewerId);
  return scaleBetForShare(
    bet,
    snapshotShare === undefined ? fallbackShareBps : snapshotShare,
  );
};

const buildShareSnapshot = (hierarchy) => {
  const shareSnapshot = hierarchy.map((account, index) => {
    const incomingShare = index === 0 ? 10000 : getAllocatedShareBps(account);
    const child = hierarchy[index + 1];
    const childShare = child ? getAllocatedShareBps(child) : 0;
    if (childShare > incomingShare)
      throw new Error(`Invalid hierarchy share for ${account.role}`);
    return { userId: account._id, role: account.role, shareBps: incomingShare - childShare };
  });
  if (shareSnapshot.reduce((total, item) => total + item.shareBps, 0) !== 10000)
    throw new Error("Hierarchy shares must total 100%");
  return shareSnapshot;
};

const resolveShareSnapshot = async (user, session) => {
  const parentId = user.parentId || user.createdBy;
  if (!parentId) return {
    ownerPath: [],
    shareSnapshot: [],
    rootSuperAdminId: user.rootSuperAdminId,
  };

  const bottomUp = [];
  const visited = new Set();
  let currentId = parentId;
  for (let depth = 0; currentId && depth < 20; depth += 1) {
    const key = String(currentId);
    if (visited.has(key)) throw new Error("Invalid account hierarchy cycle");
    visited.add(key);
    const account = await User.findById(currentId)
      .select("role allocatedShareBps allocatedShare downlineShare createdBy parentId rootSuperAdminId")
      .session(session || null)
      .lean();
    if (!account) throw new Error("Bet owner hierarchy is incomplete");
    bottomUp.push(account);
    currentId = account.parentId || account.createdBy;
  }
  if (currentId) throw new Error("Account hierarchy exceeds 20 levels");

  const hierarchy = bottomUp.reverse();
  const shareSnapshot = buildShareSnapshot(hierarchy);

  const root = hierarchy.find((account) => account.role === ROLES.SUPERADMIN) || hierarchy[0];
  return {
    ownerPath: hierarchy.map((account) => account._id),
    shareSnapshot,
    rootSuperAdminId: root?._id || user.rootSuperAdminId,
  };
};

module.exports = { normalizeBps, getCompanyShareBps, getAllocatedShareBps, getViewerShareBps, scaleBetForShare, scaleBetForRemainder, scaleBetForViewer, buildShareSnapshot, resolveShareSnapshot };
