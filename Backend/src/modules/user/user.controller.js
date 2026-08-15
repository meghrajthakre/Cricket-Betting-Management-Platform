"use strict";

const { User } = require("./user.model");
const { Ledger } = require("../ledger/ledger.model");
const { Bet, BET_STATUS } = require("../bet/bet.model");
const SavedMatch = require("../saved-match/saved-match.model");
const ManualRunner = require("../manual/manual-runner.model");
const Session = require("../session/session.model");
const asyncHandler = require("../../utils/asyncHandler");
const { ok, paginationMeta } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

// ── GET /user/profile ─────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("createdBy", "username role")
    .select("-password -refreshTokenHash")
    .lean();

  if (!user) throw new AppError("User not found", 404);

  return ok(res, 200, "Profile retrieved", { user });
});

// ── GET /user/coins ───────────────────────────────────────────────────────────
const getCoins = asyncHandler(async (req, res) => {
  // Re-fetch to always return live balance
  const user = await User.findById(req.user._id).select("username coins").lean();
  if (!user) throw new AppError("User not found", 404);

  return ok(res, 200, "Coin balance retrieved", {
    userId: user._id,
    username: user.username,
    coins: user.coins,
  });
});

// ── GET /user/ledger ──────────────────────────────────────────────────────────
const getLedger = asyncHandler(async (req, res) => {
  const { page, limit } = req.validatedQuery;
  const skip = (page - 1) * limit;

  const declaredMatches = await SavedMatch.find({
    user: req.user.rootSuperAdminId,
    isDeclared: true,
  }).select("matchId homeTeam awayTeam wonBy winningRunnerId settledAt").lean();
  const declaredIds = declaredMatches.map((match) => match.matchId);
  const matchById = new Map(declaredMatches.map((match) => [match.matchId, match]));
  const filter = {
    userId: req.user._id,
    $or: [
      { matchId: { $exists: false } },
      { matchId: null },
      { matchId: "" },
      ...(declaredIds.length ? [{ matchId: { $in: declaredIds } }] : []),
    ],
  };

  const entries = await Ledger.find(filter)
    .populate("createdBy", "username role")
    .sort({ createdAt: -1 })
    .lean();

  const groupedEntries = [];
  const matchGroups = new Map();
  for (const entry of entries) {
    if (!entry.matchId) {
      groupedEntries.push({
        ...entry,
        debitAmount: entry.type === "debit" ? Number(entry.amount) : 0,
        creditAmount: entry.type === "credit" ? Number(entry.amount) : 0,
      });
      continue;
    }

    let group = matchGroups.get(entry.matchId);
    if (!group) {
      group = {
        ...entry,
        _id: `match:${entry.matchId}`,
        debitAmount: 0,
        creditAmount: 0,
        transactionCount: 0,
      };
      matchGroups.set(entry.matchId, group);
      groupedEntries.push(group);
    }
    group.transactionCount += 1;
    if (entry.type === "debit") group.debitAmount = Number((group.debitAmount + Number(entry.amount)).toFixed(2));
    else group.creditAmount = Number((group.creditAmount + Number(entry.amount)).toFixed(2));
  }

  const total = groupedEntries.length;
  const visibleEntries = groupedEntries.slice(skip, skip + limit).map((entry) => {
    if (!entry.matchId) return entry;
    const match = matchById.get(entry.matchId);
    return {
      ...entry,
      matchName: [match?.homeTeam, match?.awayTeam].filter(Boolean).join(" vs ") || entry.matchId,
      matchSettledAt: match?.settledAt,
      wonBy: match?.wonBy || match?.winningRunnerId || "",
      canViewBets: true,
    };
  });

  return ok(res, 200, "Ledger retrieved", { entries: visibleEntries }, paginationMeta(total, page, limit));
});

// GET /user/ledger/matches/:matchId - resolved bets for one declared match.
const getLedgerMatchBets = asyncHandler(async (req, res) => {
  const matchId = String(req.params.matchId || "").trim();
  if (!matchId) throw new AppError("matchId is required", 400);

  const match = await SavedMatch.findOne({
    user: req.user.rootSuperAdminId,
    matchId,
    isDeclared: true,
  }).select("matchId homeTeam awayTeam wonBy winningRunnerId settledAt").lean();
  if (!match) throw new AppError("Settled match not found", 404);

  const bets = await Bet.find({
    userId: req.user._id,
    matchId,
    status: { $in: [BET_STATUS.WON, BET_STATUS.LOST] },
  }).sort({ createdAt: 1 }).lean();
  const [runners, sessions] = await Promise.all([
    ManualRunner.find({ matchId }).select("runnerId runnerName").lean(),
    Session.find({ matchId }).select("id sessionName resultRun").lean(),
  ]);
  const names = new Map([
    ...runners.map((runner) => [String(runner.runnerId), runner.runnerName]),
    ...sessions.map((session) => [String(session.id), session.sessionName]),
  ]);
  const resultRuns = new Map(sessions.map((session) => [String(session.id), session.resultRun]));
  const items = bets.map((bet) => ({
    ...bet,
    marketName: names.get(String(bet.marketId)) || bet.marketId,
    resultRun: bet.resultRun ?? resultRuns.get(String(bet.marketId)),
    profitLoss: Number((bet.status === BET_STATUS.WON ? bet.profit : -bet.loss).toFixed(2)),
  }));

  return ok(res, 200, "Settled match bets retrieved", {
    match: {
      ...match,
      matchName: [match.homeTeam, match.awayTeam].filter(Boolean).join(" vs ") || match.matchId,
    },
    bets: items,
  });
});

const changeOwnPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword)
    throw new AppError("Current password, new password and confirmation are required.", 400);
  if (newPassword.length < 6)
    throw new AppError("New password must be at least 6 characters.", 400);
  if (newPassword !== confirmPassword)
    throw new AppError("New passwords do not match.", 400);
  if (currentPassword === newPassword)
    throw new AppError("New password must be different from current password.", 400);

  const user = await User.findById(req.user._id).select("+password");
  if (!user) throw new AppError("User not found", 404);
  if (!(await user.comparePassword(currentPassword)))
    throw new AppError("Current password is incorrect.", 401);

  user.password = newPassword;
  await user.save({ validateModifiedOnly: true });
  return ok(res, 200, "Password changed successfully");
});

module.exports = { getProfile, getCoins, getLedger, getLedgerMatchBets, changeOwnPassword };
