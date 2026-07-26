"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const { User, ROLES } = require("../user/user.model");

/* ─────────────────────────────────────────────────────────────
   GET SUPERADMIN PROFILE   GET /superadmin/profile
───────────────────────────────────────────────────────────── */
const getSuperadminProfile = asyncHandler(async (req, res) => {
  const superadmin = await User.findById(req.user._id).select("-password");
  if (!superadmin) throw new AppError("User not found.", 404);

  res.status(200).json({
    success: true,
    data: {
      _id:      superadmin._id,
      username: superadmin.username,
      role:     superadmin.role,
    },
  });
});

/* ─────────────────────────────────────────────────────────────
   UPDATE SUPERADMIN PROFILE   PATCH /superadmin/profile
   Body: { username?, oldPassword?, password?, confirmPassword? }
───────────────────────────────────────────────────────────── */
const updateSuperadminProfile = asyncHandler(async (req, res) => {
  const { username, oldPassword, password, confirmPassword } = req.body;

  if (!username && !password)
    throw new AppError("Provide a new username or password to update.", 400);

  // FIX: explicitly select +password so comparePassword works
  const superadmin = await User.findById(req.user._id).select("+password");
  if (!superadmin) throw new AppError("User not found.", 404);

  // ── Update username ───────────────────────────────────────
  if (username) {
    const trimmed = username.toLowerCase().trim();
    const exists = await User.findOne({ username: trimmed, _id: { $ne: req.user._id } });
    if (exists) throw new AppError("Username already taken.", 400);
    superadmin.username = trimmed;
  }

  // ── Update password ───────────────────────────────────────
  if (password) {
    if (!oldPassword)
      throw new AppError("Current password is required to set a new one.", 400);
    if (password !== confirmPassword)
      throw new AppError("Passwords do not match.", 400);
    if (password.length < 6)
      throw new AppError("Password must be at least 6 characters.", 400);
    if (oldPassword === password)
      throw new AppError("New password must differ from current password.", 400);

    const isMatch = await superadmin.comparePassword(oldPassword);
    if (!isMatch) throw new AppError("Current password is incorrect.", 401);

    superadmin.password = password;
  }

  await superadmin.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      _id:      superadmin._id,
      username: superadmin.username,
    },
  });
});

module.exports = {
  getSuperadminProfile,
  updateSuperadminProfile,
};
