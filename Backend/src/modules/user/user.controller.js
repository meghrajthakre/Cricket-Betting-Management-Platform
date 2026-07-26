"use strict";

const { User } = require("./user.model");
const { Ledger } = require("../ledger/ledger.model");
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
  const { page, limit } = req.query;
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };

  const [entries, total] = await Promise.all([
    Ledger.find(filter)
      .populate("createdBy", "username role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ledger.countDocuments(filter),
  ]);

  return ok(res, 200, "Ledger retrieved", { entries }, paginationMeta(total, page, limit));
});

module.exports = { getProfile, getCoins, getLedger };
