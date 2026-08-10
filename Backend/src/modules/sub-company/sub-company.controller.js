"use strict";

const { User, ROLES } = require("../user/user.model");
const { Bet } = require("../bet/bet.model");
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const {
  createUserWithinFixLimit,
  setUserBalanceWithinFixLimit,
  updateCompanyFixLimit,
  deleteEmptySubCompany,
  getCompanyLimitSummary,
} = require("./sub-company-limit.service");
const { getCompanyShareBps, getViewerShareBps, scaleBetForShare, scaleBetForRemainder, scaleBetForViewer } = require("../bet/bet-share.service");

const generateUsername = async (prefix, session) => {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = User.findOne({
    username: new RegExp(`^${escapedPrefix}\\d{4}$`, "i"),
  })
    .select("username")
    .sort({ username: -1 });
  if (session) query.session(session);
  const latestUser = await query.lean();
  const latestNumber = latestUser
    ? Number(latestUser.username.slice(prefix.length))
    : 999;
  if (latestNumber >= 9999)
    throw new AppError("Username limit reached.", 503);
  return `${prefix}${latestNumber + 1}`;
};

const generateCompanyUsername = async () => {
  const companies = await User.find({ role: ROLES.SUB_COMPANY }).select("username").lean();
  const highest = companies.reduce((max, company) => {
    const match = /^admin(\d+)$/i.exec(company.username || "");
    return match ? Math.max(max, Number(match[1])) : max;
  }, 99);
  return `Admin${highest + 1}`;
};

const getNextCompanyUsername = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { username: await generateCompanyUsername() } });
});

const getNextCompanyUserUsername = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { username: await generateUsername("sm") } });
});

const validatePassword = (password, confirmPassword) => {
  if (!password || !confirmPassword) throw new AppError("Password and confirm password are required.", 400);
  if (password !== confirmPassword) throw new AppError("Passwords do not match.", 400);
  if (password.length < 4) throw new AppError("Password must be at least 4 characters.", 400);
};

const normalizeCompanyUsername = (value) => {
  if (typeof value !== "string" || !value.trim()) throw new AppError("Username is required.", 400);
  const username = value.trim().toLowerCase();
  if (username.length < 3 || username.length > 30)
    throw new AppError("Username must be between 3 and 30 characters.", 400);
  if (!/^[a-z0-9]+$/.test(username))
    throw new AppError("Username can contain only letters and numbers.", 400);
  return username;
};

const createSubCompany = asyncHandler(async (req, res) => {
  const { username: requestedUsername, mobile, firstName, allocatedShare, password, confirmPassword, fixLimit } = req.body;
  const username = normalizeCompanyUsername(requestedUsername);
  if (!firstName?.trim()) throw new AppError("Company/owner name is required.", 400);
  validatePassword(password, confirmPassword);

  const share = Number(allocatedShare);
  const limit = Number(fixLimit ?? 0);
  if (allocatedShare === undefined || !Number.isInteger(share) || share < 0 || share > 10000)
    throw new AppError("Allocated share must be a whole number between 0 and 10000.", 400);
  if (!Number.isFinite(limit) || limit < 0) throw new AppError("Fix limit cannot be negative.", 400);
  const normalizedMobile = mobile?.trim() || undefined;
  const duplicateFilters = [{ username }];
  if (normalizedMobile) duplicateFilters.push({ mobile: normalizedMobile });
  if (await User.exists({ $or: duplicateFilters }))
    throw new AppError("Username or mobile already exists.", 409);
  const sharePercent = share / 100;
  const company = await User.create({
    username,
    ...(normalizedMobile ? { mobile: normalizedMobile } : {}),
    firstName: firstName.trim(),
    password,
    role: ROLES.SUB_COMPANY,
    myShare: 100 - sharePercent,
    downlineShare: sharePercent,
    allocatedShare: share,
    allocatedShareBps: share,
    fixLimit: limit,
    coins: 0,
    createdBy: req.user._id,
    parentId: req.user._id,
    rootSuperAdminId: req.user._id,
    ancestorIds: [req.user._id],
  });

  const data = company.toObject();
  delete data.password;
  delete data.__v;
  res.status(201).json({
    success: true,
    message: `Sub Company ${username.toUpperCase()} created successfully.`,
    data,
  });
});

const getSubCompanies = asyncHandler(async (req, res) => {
  const companies = await User.find({ role: ROLES.SUB_COMPANY, createdBy: req.user._id })
    .select("-password")
    .sort({ createdAt: -1 });
  const companyIds = companies.map((company) => company._id);
  const counts = await User.aggregate([
    { $match: { role: ROLES.USER, createdBy: { $in: companyIds } } },
    { $group: { _id: "$createdBy", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  res.json({ success: true, data: companies.map((company) => ({
    ...company.toObject(),
    userCount: countMap.get(String(company._id)) || 0,
  })) });
});

const toggleSubCompanyStatus = asyncHandler(async (req, res) => {
  const company = await User.findOne({ _id: req.params.id, role: ROLES.SUB_COMPANY, createdBy: req.user._id });
  if (!company) throw new AppError("Sub Company not found.", 404);
  company.isActive = !company.isActive;
  await company.save({ validateModifiedOnly: true });
  res.json({ success: true, message: `Sub Company ${company.isActive ? "activated" : "blocked"}.`, data: { isActive: company.isActive } });
});

const getSubCompanyReport = asyncHandler(async (req, res) => {
  const company = await User.findOne({ _id: req.params.id, role: ROLES.SUB_COMPANY, createdBy: req.user._id });
  if (!company) throw new AppError("Sub Company not found.", 404);
  const userIds = await User.find({ role: ROLES.USER, createdBy: company._id }).distinct("_id");
  const bets = await Bet.find({ $or: [{ ownerPath: company._id }, { userId: { $in: userIds } }], status: { $in: ["won", "lost"] } })
    .select("status profit loss shareSnapshot")
    .lean();
  const currentCompanyShareBps = getCompanyShareBps(company);
  const totals = bets.reduce((result, bet) => {
    const allocatedBps = currentCompanyShareBps;
    const companySnapshotShare = getViewerShareBps(bet, company._id);
    const ownerSnapshotShare = getViewerShareBps(bet, req.user._id);
    const companyBet = companySnapshotShare === undefined
      ? scaleBetForShare(bet, allocatedBps)
      : scaleBetForViewer(bet, company._id);
    const ownerBet = ownerSnapshotShare === undefined
      ? scaleBetForRemainder(bet, allocatedBps)
      : scaleBetForViewer(bet, req.user._id);
    const direction = bet.status === "lost" ? 1 : -1;
    result.gross += direction * Number(bet.status === "lost" ? bet.loss : bet.profit);
    result.company += direction * Number(bet.status === "lost" ? companyBet.loss : companyBet.profit);
    result.owner += direction * Number(bet.status === "lost" ? ownerBet.loss : ownerBet.profit);
    return result;
  }, { gross: 0, company: 0, owner: 0 });
  const gross = Number(totals.gross.toFixed(2));
  res.json({ success: true, data: {
    companyId: company._id,
    grossProfitLoss: gross,
    superAdminSharePercent: company.myShare,
    companySharePercent: company.downlineShare,
    superAdminProfitLoss: Number(totals.owner.toFixed(2)),
    companyProfitLoss: Number(totals.company.toFixed(2)),
    settledBets: bets.length,
  } });
});

const createCompanyUser = asyncHandler(async (req, res) => {
  const { firstName, password, confirmPassword, coins } = req.body;
  if (!firstName?.trim()) throw new AppError("First name is required.", 400);
  validatePassword(password, confirmPassword);
  const rootSuperAdminId = req.user.rootSuperAdminId || req.user.parentId || req.user.createdBy;
  const ancestorIds = req.user.ancestorIds?.length
    ? [...req.user.ancestorIds, req.user._id]
    : [rootSuperAdminId, req.user._id].filter(Boolean);
  const allocation = await createUserWithinFixLimit(
    req.user._id,
    { firstName: firstName.trim(), password, role: ROLES.USER, coins, createdBy: req.user._id, parentId: req.user._id, rootSuperAdminId, ancestorIds },
    (session) => generateUsername("sm", session)
  );
  const user = allocation.user;
  const { username } = user;
  const data = user.toObject();
  delete data.password;
  res.status(201).json({ success: true, message: `User ${username.toUpperCase()} created successfully.`, data, allocation: { totalAllocated: allocation.totalAllocated, remainingLimit: allocation.remainingLimit } });
});

const getCompanyUsers = asyncHandler(async (req, res) => {
  const filter = { role: ROLES.USER, createdBy: req.user._id };
  if (req.query.search?.trim()) filter.$or = [{ firstName: { $regex: req.query.search.trim(), $options: "i" } }, { username: { $regex: req.query.search.trim(), $options: "i" } }];
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
  const userIds = users.map((user) => user._id);
  const usedLimits = userIds.length ? await Bet.aggregate([
    { $match: { userId: { $in: userIds }, status: "pending" } },
    { $group: { _id: "$userId", usedLimit: { $sum: { $cond: [{ $gt: ["$walletAdjustment", 0] }, "$walletAdjustment", "$loss"] } } } },
  ]) : [];
  const usedLimitMap = new Map(usedLimits.map((item) => [String(item._id), Number(item.usedLimit || 0)]));
  res.json({ success: true, data: users.map((user) => ({
    ...user.toObject(),
    usedLimit: usedLimitMap.get(String(user._id)) || 0,
  })) });
});

const findOwnedCompanyUser = async (req) => {
  const user = await User.findOne({ _id: req.params.id, role: ROLES.USER, createdBy: req.user._id });
  if (!user) throw new AppError("User not found.", 404);
  return user;
};

const toggleCompanyUserStatus = asyncHandler(async (req, res) => {
  const user = await findOwnedCompanyUser(req); user.isActive = !user.isActive; await user.save({ validateModifiedOnly: true });
  res.json({ success: true, message: `User ${user.isActive ? "activated" : "blocked"}.`, data: { isActive: user.isActive } });
});

const changeCompanyUserPassword = asyncHandler(async (req, res) => {
  validatePassword(req.body.password, req.body.confirmPassword);
  const user = await findOwnedCompanyUser(req); user.password = req.body.password; await user.save({ validateModifiedOnly: true });
  res.json({ success: true, message: "Password changed successfully." });
});

const setCompanyUserBalance = asyncHandler(async (req, res) => {
  const result = await setUserBalanceWithinFixLimit(req.user._id, req.params.id, req.body.coins, req.user._id);
  res.json({ success: true, message: "Balance updated successfully.", data: { coins: result.balanceAfter, totalAllocated: result.totalAllocated, remainingLimit: result.remainingLimit } });
});

const getLimitSummary = asyncHandler(async (req, res) => {
  const data = await getCompanyLimitSummary(req.user._id);
  res.json({ success: true, data });
});

const editSubCompanyFixLimit = asyncHandler(async (req, res) => {
  const result = await updateCompanyFixLimit(req.params.id, req.user._id, req.body.fixLimit);
  res.json({ success: true, message: "Fix limit updated successfully.", data: result });
});

const deleteSubCompany = asyncHandler(async (req, res) => {
  const deleted = await deleteEmptySubCompany(req.params.id, req.user._id);
  res.json({ success: true, message: `Sub Company ${deleted.username} deleted successfully.`, data: deleted });
});

const deleteCompanyUser = asyncHandler(async (req, res) => {
  const user = await findOwnedCompanyUser(req); await user.deleteOne();
  res.json({ success: true, message: `User ${user.username} deleted successfully.` });
});

module.exports = { getNextCompanyUsername, getNextCompanyUserUsername, getLimitSummary, createSubCompany, getSubCompanies, toggleSubCompanyStatus, editSubCompanyFixLimit, deleteSubCompany, getSubCompanyReport, createCompanyUser, getCompanyUsers, toggleCompanyUserStatus, changeCompanyUserPassword, setCompanyUserBalance, deleteCompanyUser };
