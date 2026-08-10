"use strict";

const mongoose = require("mongoose");
const { User, ROLES } = require("../user/user.model");
const { Bet } = require("../bet/bet.model");
const { setUserCoins } = require("../ledger/ledger.service");
const AppError = require("../../utils/AppError");

const normalizeCoins = (value) => {
  const coins = Number(value);
  if (!Number.isFinite(coins) || coins < 0 || !Number.isSafeInteger(Math.round(coins * 100))) {
    throw new AppError("Coins must be a non-negative safe amount.", 400);
  }
  return Number(coins.toFixed(2));
};

const checkFixLimit = (allocatedCoins, requestedCoins, fixLimit) => {
  const total = Number((allocatedCoins + requestedCoins).toFixed(2));
  if (total > fixLimit) {
    const available = Math.max(0, Number((fixLimit - allocatedCoins).toFixed(2)));
    const error = new AppError(`Fix limit exceeded. Available limit is ${available}.`, 409);
    error.code = "FIX_LIMIT_EXCEEDED";
    throw error;
  }
  return total;
};

const validateUserLimitBounds = (limit, usedLimit, fixLimit) => {
  if (limit > fixLimit) {
    const error = new AppError(`Client limit cannot exceed the Sub Company fix limit of ${fixLimit}.`, 409);
    error.code = "CLIENT_LIMIT_ABOVE_FIX_LIMIT";
    throw error;
  }
  if (limit < usedLimit) {
    const error = new AppError(`Client limit cannot be below the used limit of ${usedLimit}.`, 409);
    error.code = "CLIENT_LIMIT_BELOW_USED_LIMIT";
    throw error;
  }
  return limit;
};

const lockCompany = async (companyId, session) => {
  const company = await User.findOneAndUpdate(
    { _id: companyId, role: ROLES.SUB_COMPANY, isActive: true },
    { $inc: { allocationVersion: 1 } },
    { new: true, session, runValidators: true }
  ).select("fixLimit +allocationVersion");
  if (!company) throw new AppError("Active Sub Company not found.", 404);
  return company;
};

const allocatedToOtherUsers = async (companyId, session, excludeUserId) => {
  const match = { role: ROLES.USER, createdBy: new mongoose.Types.ObjectId(companyId) };
  if (excludeUserId) match._id = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
  const [row] = await User.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$fixLimit" } } },
  ]).session(session);
  return Number((row?.total || 0).toFixed(2));
};

const runTransaction = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => { result = await work(session); });
    return result;
  } finally {
    await session.endSession();
  }
};

const createUserWithinFixLimit = async (companyId, userData, getUsername) => {
  const fixLimit = normalizeCoins(userData.fixLimit ?? 0);
  const coins = fixLimit;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await runTransaction(async (session) => {
        const company = await lockCompany(companyId, session);
        const allocated = await allocatedToOtherUsers(companyId, session);
        const totalAllocated = checkFixLimit(allocated, fixLimit, company.fixLimit);
        const username = await getUsername(session);
        const [user] = await User.create([{ ...userData, username, coins, fixLimit }], { session });
        return { user, totalAllocated, remainingLimit: Number((company.fixLimit - totalAllocated).toFixed(2)) };
      });
    } catch (error) {
      const usernameCollision = error?.code === 11000 && error?.keyPattern?.username;
      if (!usernameCollision) throw error;
    }
  }
  throw new AppError("Could not generate a unique username. Please try again.", 503);
};

const setUserBalanceWithinFixLimit = async (companyId, userId, coins, actorId) => {
  const targetCoins = normalizeCoins(coins);
  return runTransaction(async (session) => {
    const company = await lockCompany(companyId, session);
    const user = await User.findOne({ _id: userId, role: ROLES.USER, createdBy: companyId }).session(session);
    if (!user) throw new AppError("User not found.", 404);
    const [usage] = await Bet.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: "pending" } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ["$walletAdjustment", 0] }, "$walletAdjustment", "$loss"] } } } },
    ]).session(session);
    const usedLimit = Number(Number(usage?.total || 0).toFixed(2));
    validateUserLimitBounds(targetCoins, usedLimit, Number(company.fixLimit || 0));
    const allocated = await allocatedToOtherUsers(companyId, session, user._id);
    const totalAllocated = checkFixLimit(allocated, targetCoins, company.fixLimit);
    const wallet = await setUserCoins(user._id, targetCoins, "Sub Company updated balance", actorId, { session });
    return { ...wallet, totalAllocated, remainingLimit: Number((company.fixLimit - totalAllocated).toFixed(2)) };
  });
};

const updateUserFixLimitWithinCompany = async (companyId, userId, value, currentValue, remarks = "", actorId) => {
  const fixLimit = normalizeCoins(value);
  const currentLimit = normalizeCoins(currentValue);
  if (typeof remarks !== "string" || remarks.length > 120) throw new AppError("Remarks cannot exceed 120 characters.", 400);
  return runTransaction(async (session) => {
    const company = await lockCompany(companyId, session);
    const user = await User.findOne({ _id: userId, role: ROLES.USER, createdBy: companyId }).session(session);
    if (!user) throw new AppError("User not found.", 404);
    const [usage] = await Bet.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), status: "pending" } },
      { $group: { _id: null, total: { $sum: { $cond: [{ $gt: ["$walletAdjustment", 0] }, "$walletAdjustment", "$loss"] } } } },
    ]).session(session);
    const usedLimit = Number(Number(usage?.total || 0).toFixed(2));
    validateUserLimitBounds(fixLimit, usedLimit, Number(company.fixLimit || 0));
    if (currentLimit > fixLimit) {
      const error = new AppError(`Current limit cannot exceed the user fix limit of ${fixLimit}. Increase Fix Limit first.`, 409);
      error.code = "CURRENT_LIMIT_ABOVE_USER_FIX_LIMIT";
      throw error;
    }
    if (currentLimit < usedLimit) {
      const error = new AppError(`Current limit cannot be below the used limit of ${usedLimit}.`, 409);
      error.code = "CURRENT_LIMIT_BELOW_USED_LIMIT";
      throw error;
    }
    const allocated = await allocatedToOtherUsers(companyId, session, user._id);
    const totalAllocated = checkFixLimit(allocated, fixLimit, company.fixLimit);
    user.fixLimit = fixLimit;
    user.limitRemarks = remarks.trim();
    await user.save({ session, validateModifiedOnly: true });
    await setUserCoins(user._id, currentLimit, "Sub Company updated client current limit", actorId || companyId, { session });
    return { fixLimit, currentLimit, limitRemarks: user.limitRemarks, usedLimit, totalAllocated, remainingLimit: Number((company.fixLimit - totalAllocated).toFixed(2)) };
  });
};

const updateCompanyFixLimit = async (companyId, ownerId, value) => {
  const fixLimit = normalizeCoins(value);
  return runTransaction(async (session) => {
    const company = await User.findOneAndUpdate(
      { _id: companyId, role: ROLES.SUB_COMPANY, createdBy: ownerId },
      { $inc: { allocationVersion: 1 } },
      { new: true, session, runValidators: true }
    ).select("fixLimit +allocationVersion");
    if (!company) throw new AppError("Sub Company not found.", 404);

    const allocatedCoins = await allocatedToOtherUsers(companyId, session);
    company.fixLimit = fixLimit;
    await company.save({ session, validateModifiedOnly: true });
    return {
      fixLimit,
      allocatedCoins,
      remainingLimit: Math.max(0, Number((fixLimit - allocatedCoins).toFixed(2))),
    };
  });
};

const deleteEmptySubCompany = async (companyId, ownerId) => runTransaction(async (session) => {
  const company = await User.findOne({
    _id: companyId,
    role: ROLES.SUB_COMPANY,
    createdBy: ownerId,
  }).session(session);
  if (!company) throw new AppError("Sub Company not found.", 404);

  const childCount = await User.countDocuments({ createdBy: company._id }).session(session);
  if (childCount > 0) {
    const error = new AppError(
      "Sub Company has users. Delete or reassign its users before deleting it.",
      409
    );
    error.code = "SUB_COMPANY_HAS_USERS";
    throw error;
  }

  await User.deleteOne({ _id: company._id }, { session });
  return { id: company._id, username: company.username };
});

const getCompanyLimitSummary = async (companyId) => {
  const company = await User.findOne({
    _id: companyId,
    role: ROLES.SUB_COMPANY,
  }).select("fixLimit").lean();
  if (!company) throw new AppError("Sub Company not found.", 404);

  const [row] = await User.aggregate([
    { $match: { role: ROLES.USER, createdBy: new mongoose.Types.ObjectId(companyId) } },
    { $group: { _id: null, total: { $sum: "$fixLimit" } } },
  ]);
  const usedLimit = Number((row?.total || 0).toFixed(2));
  const fixLimit = Number(company.fixLimit || 0);
  return {
    fixLimit,
    usedLimit,
    remainingLimit: Math.max(0, Number((fixLimit - usedLimit).toFixed(2))),
  };
};

module.exports = {
  checkFixLimit,
  validateUserLimitBounds,
  createUserWithinFixLimit,
  normalizeCoins,
  setUserBalanceWithinFixLimit,
  updateUserFixLimitWithinCompany,
  updateCompanyFixLimit,
  deleteEmptySubCompany,
  getCompanyLimitSummary,
};
