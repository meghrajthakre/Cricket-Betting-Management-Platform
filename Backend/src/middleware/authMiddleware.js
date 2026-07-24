"use strict";

const { verifyAccessToken } = require("../utils/generateToken");
const { User } = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const protect = asyncHandler(async (req, _res, next) => {
  let token = null;

  // ── 1. Authorization header (mobile-safe, always preferred) ──────────────
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // ── 2. Cookie fallback (desktop / same-site browsers) ────────────────────
  if (!token) {
    token = req.cookies?.sa_accessToken || req.cookies?.accessToken;
  }

  if (!token) {
    throw new AppError("Access denied. Please log in.", 401);
  }

  // ── 3. Verify token ───────────────────────────────────────────────────────
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError("Session expired. Please log in again.", 401);
    }
    throw new AppError("Invalid access token.", 401);
  }

  // ── 4. Load & validate user ───────────────────────────────────────────────
  const user = await User.findById(decoded.id).select("-password");
  if (!user) throw new AppError("Token user no longer exists.", 401);
  if (!user.isActive) throw new AppError("Your account has been blocked. Contact support.", 403);

  req.user = user;
  next();
});

const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    throw new AppError("Access denied: insufficient role", 403);
  }
  next();
};

const allowSelfOrRoles = (paramName, ...roles) => (req, _res, next) => {
  const requestedUserId = req.params?.[paramName];
  const authenticatedUserId = req.user?._id?.toString();

  if (
    requestedUserId === authenticatedUserId ||
    roles.includes(req.user?.role)
  ) {
    return next();
  }

  throw new AppError("Access denied: you can only access your own account", 403);
};

module.exports = { protect, allowRoles, allowSelfOrRoles };
