"use strict";

const mongoose = require("mongoose");
const { User, ROLES } = require("../user/user.model");
const { Ledger } = require("../ledger/ledger.model");
const SavedMatch = require("./saved-match.model");
const MatchEntry = require("./match-entry.model");
const AppError = require("../../utils/AppError");

const MATCH_ENTRY_FEE = Number(process.env.MATCH_ENTRY_FEE || 15);
let entryIndexPromise;

const ensureEntryIndex = () => {
  if (!entryIndexPromise) {
    entryIndexPromise = MatchEntry.createIndexes().catch((error) => {
      entryIndexPromise = undefined;
      throw error;
    });
  }
  return entryIndexPromise;
};

const requireEntryFee = () => {
  if (!Number.isFinite(MATCH_ENTRY_FEE) || MATCH_ENTRY_FEE <= 0) throw new AppError("Match entry fee configuration is invalid.", 500);
  return Number(MATCH_ENTRY_FEE.toFixed(2));
};

const getMatchName = (match) => [match.homeTeam, match.awayTeam].filter(Boolean).join(" vs ") || match.matchId;

const existingEntryResult = async (userId, matchId) => {
  const entry = await MatchEntry.findOne({ userId, matchId }).lean();
  if (!entry) return null;
  const [user, superAdmin] = await Promise.all([
    User.findById(userId).select("coins").lean(),
    User.findById(entry.rootSuperAdminId).select("coins").lean(),
  ]);
  return { alreadyEntered: true, fee: Number(entry.fee), matchId, matchName: entry.matchName, userBalance: Number(user?.coins || 0), superAdminBalance: Number(superAdmin?.coins || 0) };
};

const enterMatch = async (userId, rawMatchId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new AppError("Invalid user.", 400);
  const matchId = String(rawMatchId || "").trim();
  if (!matchId) throw new AppError("matchId is required.", 400);
  await ensureEntryIndex();
  const fee = requireEntryFee();
  const existing = await existingEntryResult(userId, matchId);
  if (existing) return existing;

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({ _id: userId, role: ROLES.USER, isActive: true }).session(session);
      if (!user) throw new AppError("Active user account not found.", 404);
      if (!user.rootSuperAdminId) throw new AppError("User is not linked to a Super Admin.", 409);
      const superAdmin = await User.findOne({ _id: user.rootSuperAdminId, role: ROLES.SUPERADMIN, isActive: true }).session(session);
      if (!superAdmin) throw new AppError("Root Super Admin account not found.", 409);
      const savedMatch = await SavedMatch.findOne({
        matchId,
        $or: [
          { user: superAdmin._id },
          { source: "external" },
        ],
      }).session(session).lean();
      if (!savedMatch) throw new AppError("Match is not available for this account.", 404);
      if (savedMatch.isDeclared) throw new AppError("Settled match cannot be entered.", 409);

      const userBalanceBefore = Number(user.coins);
      const superAdminBalanceBefore = Number(superAdmin.coins || 0);
      if (!Number.isFinite(userBalanceBefore) || userBalanceBefore < fee) {
        const error = new AppError(`At least ${fee} coins are required to enter this match.`, 409);
        error.code = "MATCH_ENTRY_INSUFFICIENT_BALANCE";
        error.requiredFee = fee;
        error.currentBalance = Number.isFinite(userBalanceBefore) ? userBalanceBefore : 0;
        throw error;
      }

      const title = getMatchName(savedMatch);
      await MatchEntry.create([{ userId: user._id, rootSuperAdminId: superAdmin._id, matchId, matchName: title, fee }], { session });
      const userBalanceAfter = Number((userBalanceBefore - fee).toFixed(2));
      const superAdminBalanceAfter = Number((superAdminBalanceBefore + fee).toFixed(2));
      const correlationId = `match-entry:${user._id}:${matchId}`;
      await Ledger.create([{
        userId: user._id, amount: fee, type: "debit", reason: `${title} match entry fee`, transactionCode: "MATCH_ENTRY_FEE_DEBIT",
        referenceType: "match", referenceId: matchId, correlationId, matchId, createdBy: user._id,
        balanceBefore: userBalanceBefore, balanceAfter: userBalanceAfter,
      }, {
        userId: superAdmin._id, amount: fee, type: "credit", reason: `${title} match entry fee from ${user.username.toUpperCase()}`,
        transactionCode: "MATCH_ENTRY_FEE_CREDIT", referenceType: "match", referenceId: matchId, correlationId, matchId,
        createdBy: user._id, balanceBefore: superAdminBalanceBefore, balanceAfter: superAdminBalanceAfter,
      }], { session, ordered: true });
      user.coins = userBalanceAfter;
      superAdmin.coins = superAdminBalanceAfter;
      await user.save({ session, validateModifiedOnly: true });
      await superAdmin.save({ session, validateModifiedOnly: true });
      result = { alreadyEntered: false, fee, matchId, matchName: title, userBalance: userBalanceAfter, superAdminBalance: superAdminBalanceAfter };
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await existingEntryResult(userId, matchId);
      if (duplicate) return duplicate;
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return result;
};

module.exports = { MATCH_ENTRY_FEE, enterMatch };
