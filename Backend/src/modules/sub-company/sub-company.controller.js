"use strict";

const { User, ROLES } = require("../user/user.model");
const { Bet } = require("../bet/bet.model");
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");

const generateUsername = async (prefix) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const username = `${prefix}${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await User.exists({ username }))) return username;
  }
  throw new AppError("Could not generate a username. Please try again.", 503);
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
  if (!mobile?.trim()) throw new AppError("Mobile is required.", 400);
  if (!firstName?.trim()) throw new AppError("Company/owner name is required.", 400);
  validatePassword(password, confirmPassword);

  const share = Number(allocatedShare);
  const limit = Number(fixLimit ?? 0);
  if (allocatedShare === undefined || !Number.isInteger(share) || share < 0 || share > 10000)
    throw new AppError("Allocated share must be a whole number between 0 and 10000.", 400);
  if (!Number.isFinite(limit) || limit < 0) throw new AppError("Fix limit cannot be negative.", 400);
  const normalizedMobile = mobile.trim();
  if (await User.exists({ $or: [{ username }, { mobile: normalizedMobile }] }))
    throw new AppError("Username or mobile already exists.", 409);
  const sharePercent = share / 100;
  const company = await User.create({
    username,
    mobile: normalizedMobile,
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
  const totals = await Bet.aggregate([
    { $match: { userId: { $in: userIds }, status: { $in: ["won", "lost"] } } },
    { $group: {
      _id: null,
      grossProfitLoss: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, "$loss", { $multiply: ["$profit", -1] }] } },
      settledBets: { $sum: 1 },
    } },
  ]);
  const gross = Number((totals[0]?.grossProfitLoss || 0).toFixed(2));
  res.json({ success: true, data: {
    companyId: company._id,
    grossProfitLoss: gross,
    superAdminSharePercent: company.myShare,
    companySharePercent: company.downlineShare,
    superAdminProfitLoss: Number((gross * company.myShare / 100).toFixed(2)),
    companyProfitLoss: Number((gross * company.downlineShare / 100).toFixed(2)),
    settledBets: totals[0]?.settledBets || 0,
  } });
});

const createCompanyUser = asyncHandler(async (req, res) => {
  const { firstName, password, confirmPassword, coins } = req.body;
  if (!firstName?.trim()) throw new AppError("First name is required.", 400);
  validatePassword(password, confirmPassword);
  const balance = Number(coins ?? 0);
  if (!Number.isFinite(balance) || balance < 0) throw new AppError("Coins must be a non-negative number.", 400);
  const username = await generateUsername("sm");
  const user = await User.create({ username, firstName: firstName.trim(), password, role: ROLES.USER, coins: balance, createdBy: req.user._id, parentId: req.user._id });
  const data = user.toObject();
  delete data.password;
  res.status(201).json({ success: true, message: `User ${username.toUpperCase()} created successfully.`, data });
});

const getCompanyUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: ROLES.USER, createdBy: req.user._id }).select("-password").sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

module.exports = { getNextCompanyUsername, createSubCompany, getSubCompanies, toggleSubCompanyStatus, getSubCompanyReport, createCompanyUser, getCompanyUsers };
