"use strict";

const { User, ROLES } = require("../user/user.model");
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const {
  updateUserCoins,
  setUserCoins,
} = require("../ledger/ledger.service");

/* ─────────────────────────────────────────────────────────────
   CREATE USER   POST /superadmin/users
   Body: { firstName, password, confirmPassword, coins }
───────────────────────────────────────────────────────────── */
const createUser = asyncHandler(async (req, res) => {
  const { firstName, password, confirmPassword, coins } = req.body;

  // ── Validation ────────────────────────────────────────────
  if (!firstName?.trim())
    throw new AppError("firstName is required.", 400);
  if (!password || !confirmPassword)
    throw new AppError("Password and confirmPassword are required.", 400);
  if (password !== confirmPassword)
    throw new AppError("Passwords do not match.", 400);
  if (password.length < 4)
    throw new AppError("Password must be at least 4 characters.", 400);

  const c = Number(coins ?? 0);
  if (isNaN(c) || c < 0)
    throw new AppError("coins must be a non-negative number.", 400);

  // ── Generate unique username ────────────────────────────────
  const generateUsername = () => {
    const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5-digit random
    return `sm${randomDigits}`;
  };

  let username = generateUsername();
  while (await User.findOne({ username })) {
    username = generateUsername();
  }
  // ── Create ────────────────────────────────────────────────
  const user = await User.create({
    username,  // Add generated username
    firstName: firstName.trim(),
    password,
    role: ROLES.USER,
    coins: 0, // Start with 0, credit via ledger
    createdBy: req.user._id,
    parentId: req.user._id,
  });

  // Credit initial coins via ledger if provided
  if (c > 0) {
    await updateUserCoins(user._id, c, "credit", "Initial balance", req.user._id);
  }

  const data = user.toObject();
  delete data.password;

  res.status(201).json({
    success: true,
    message: "User created successfully.",
    data,
  });
});

/* ─────────────────────────────────────────────────────────────
   GET ALL USERS   GET /superadmin/users
   Query: page, limit, search
───────────────────────────────────────────────────────────── */
const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  const filter = {
    role: ROLES.USER,
    createdBy: req.user._id,
  };

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/* ─────────────────────────────────────────────────────────────
   GET SINGLE USER   GET /superadmin/users/:id
───────────────────────────────────────────────────────────── */
const getUser = asyncHandler(async (req, res) => {
  const user = await User
    .findOne({ _id: req.params.id, role: ROLES.USER, createdBy: req.user._id })
    .select("-password");

  if (!user) throw new AppError("User not found.", 404);

  res.status(200).json({ success: true, data: user });
});

/* ─────────────────────────────────────────────────────────────
   UPDATE USER   PATCH /superadmin/users/:id
   Allowed: firstName, isActive, coins
───────────────────────────────────────────────────────────── */
const updateUser = asyncHandler(async (req, res) => {
  const allowed = ["firstName", "isActive", "coins"];

  const updates = {};
  allowed.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (Object.keys(updates).length === 0)
    throw new AppError("No valid fields provided to update.", 400);

  if (updates.firstName !== undefined) {
    if (!updates.firstName?.trim())
      throw new AppError("firstName cannot be empty.", 400);
    updates.firstName = updates.firstName.trim();
  }

  if (updates.coins !== undefined) {
    const c = Number(updates.coins);
    if (isNaN(c) || c < 0)
      throw new AppError("coins must be a non-negative number.", 400);
    updates.coins = c;
  }

  const requestedCoins = updates.coins;
  delete updates.coins;

  const ownershipFilter = {
    _id: req.params.id,
    role: ROLES.USER,
    createdBy: req.user._id,
  };

  const user = Object.keys(updates).length > 0
    ? await User.findOneAndUpdate(
      ownershipFilter,
      updates,
      { returnDocument: "after", runValidators: true }
    ).select("-password")
    : await User.findOne(ownershipFilter).select("-password");

  if (!user) throw new AppError("User not found.", 404);

  if (requestedCoins !== undefined) {
    const { balanceAfter } = await setUserCoins(
      user._id,
      requestedCoins,
      "Admin updated balance",
      req.user._id
    );
    user.coins = balanceAfter;
  }

  res.status(200).json({ success: true, message: "User updated.", data: user });
});

/* ─────────────────────────────────────────────────────────────
   TOGGLE STATUS   PATCH /superadmin/users/:id/status
───────────────────────────────────────────────────────────── */
const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id, role: ROLES.USER, createdBy: req.user._id,
  });

  if (!user) throw new AppError("User not found.", 404);

  user.isActive = !user.isActive;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? "activated" : "deactivated"}.`,
    data: { isActive: user.isActive },
  });
});

/* ─────────────────────────────────────────────────────────────
   CHANGE PASSWORD   PATCH /superadmin/users/:id/password
───────────────────────────────────────────────────────────── */
const changeUserPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword)
    throw new AppError("password and confirmPassword are required.", 400);
  if (password !== confirmPassword)
    throw new AppError("Passwords do not match.", 400);
  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters.", 400);

  const user = await User.findOne({
    _id: req.params.id, role: ROLES.USER, createdBy: req.user._id,
  });

  if (!user) throw new AppError("User not found.", 404);

  user.password = password;
  await user.save({ validateModifiedOnly: true });

  res.status(200).json({ success: true, message: "Password changed successfully." });
});

/* ─────────────────────────────────────────────────────────────
   DELETE USER   DELETE /superadmin/users/:id
───────────────────────────────────────────────────────────── */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOneAndDelete({
    _id: req.params.id, role: ROLES.USER, createdBy: req.user._id,
  });

  if (!user) throw new AppError("User not found.", 404);

  res.status(200).json({
    success: true,
    message: `User ${user.firstName} deleted successfully.`,
  });
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  toggleUserStatus,
  changeUserPassword,
  deleteUser,
};
