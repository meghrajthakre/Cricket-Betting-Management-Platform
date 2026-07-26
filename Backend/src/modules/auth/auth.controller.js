const { User } = require("../user/user.model");
const {
  generateAccessToken,
  setAuthCookies,
  clearAuthCookies,
} = require("../../utils/generateToken");
const asyncHandler = require("../../utils/asyncHandler");
const { ok } = require("../../utils/apiResponse");
const AppError = require("../../utils/AppError");

// ── POST /auth/login ──────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findByUsername(username);
  if (!user) throw new AppError("Invalid username or password", 401);
  if (!user.isActive)
    throw new AppError("Account is blocked. Contact support.", 403);

  const valid = await user.comparePassword(password);
  if (!valid) throw new AppError("Invalid username or password", 401);

  const payload = { id: user._id, role: user.role };
  const accessToken = generateAccessToken(payload);

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, user.role); // still set cookie for desktop

  return ok(res, 200, "Login successful", {
    accessToken, // ← ADD: frontend stores this for mobile/header auth
    user: {
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      role: user.role,
      coins: user.coins,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    },
  });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  return ok(res, 200, "Logged out successfully");
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("createdBy", "username role")
    .select("-password");

  if (!user) throw new AppError("User not found.", 404);

  return ok(res, 200, "Profile retrieved", { user });
});

module.exports = { login, logout, getMe };
