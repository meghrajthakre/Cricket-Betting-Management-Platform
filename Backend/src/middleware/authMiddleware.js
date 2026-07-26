"use strict";

const { verifyAccessToken } = require("../utils/generateToken");
const { User } = require("../modules/user/user.model");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const getAccessTokenFromRequest = (req) => {
  const authHeader = req.headers?.authorization;
  if (authHeader !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(String(authHeader).trim());
    if (!match) throw new AppError("Invalid Authorization header.", 401);
    return match[1];
  }

  const superadminToken = req.cookies?.sa_accessToken;
  const userToken = req.cookies?.accessToken;
  if (superadminToken && userToken) {
    throw new AppError(
      "Multiple login sessions detected. Please use the correct panel or log in again.",
      401
    );
  }

  return superadminToken || userToken || null;
};

const protect = asyncHandler(async (req, _res, next) => {
  // Explicit Bearer auth is deterministic. Cookie fallback is accepted only
  // when exactly one panel session is present.
  const token = getAccessTokenFromRequest(req);

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

module.exports = {
  protect,
  allowRoles,
  allowSelfOrRoles,
  getAccessTokenFromRequest,
};
