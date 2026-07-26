"use strict";

const { User, ROLES } = require("../user/user.model");
const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");

/* ── Auto-generate username ────────────────────────────────── */
const generateUsername = async () => {
  const last = await User
    .findOne({ role: ROLES.ADMIN })
    .sort({ createdAt: -1 })
    .select("username");

  if (!last) return "ADMIN100";
  const num = parseInt(last.username.replace(/\D/g, ""), 10);
  return `ADMIN${isNaN(num) ? 100 : num + 1}`;
};

/* ─────────────────────────────────────────────────────────────
   CREATE ADMIN   POST /superadmin/admins
   Body: { firstName, masterShare, myShare, ledgerShare,
           fixLimit, password, confirmPassword }
───────────────────────────────────────────────────────────── */
const createAdmin = asyncHandler(async (req, res) => {
  const {
    firstName,
    masterShare,
    myShare,
    ledgerShare,
    fixLimit,
    password,
    confirmPassword,
  } = req.body;

  // ── Password ─────────────────────────────────────────────
  if (!password || !confirmPassword)
    throw new AppError("Password and confirmPassword are required.", 400);
  if (password !== confirmPassword)
    throw new AppError("Passwords do not match.", 400);
  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters.", 400);

  // ── Required share fields ─────────────────────────────────
  if (masterShare === undefined || myShare === undefined)
    throw new AppError("masterShare and myShare are required.", 400);

  // ── Parse ─────────────────────────────────────────────────
  const master = Number(masterShare);
  const ms     = Number(myShare);
  const ls     = Number(ledgerShare ?? 0);
  const fl     = Number(fixLimit    ?? 0);

  // ── Numeric checks ────────────────────────────────────────
  if ([master, ms, ls, fl].some(isNaN))
    throw new AppError("Share fields must be valid numbers.", 400);
  if (master < 0 || master > 100)
    throw new AppError("masterShare must be between 0 and 100.", 400);
  if (ms < 0 || ms > 100)
    throw new AppError("myShare must be between 0 and 100.", 400);
  if (ls < 0 || ls > 100)
    throw new AppError("ledgerShare must be between 0 and 100.", 400);
  if (fl < 0)
    throw new AppError("fixLimit cannot be negative.", 400);

 if (master > req.user.downlineShare)
  throw new AppError(
    `masterShare (${master}) cannot exceed your available share (${req.user.downlineShare}).`,
    400
  );

  // ── myShare cannot exceed masterShare ─────────────────────
  if (ms > master)
    throw new AppError(
      `myShare (${ms}) cannot exceed masterShare (${master}).`,
      400
    );

  // ── adminShare is auto-calculated ─────────────────────────
  const adminShare = master - ms;

  // ── Generate username ─────────────────────────────────────
  const username = await generateUsername();

  // ── Create ────────────────────────────────────────────────
  const admin = await User.create({
    username,
    firstName:     firstName?.trim() ?? "",
    password,
    role:          ROLES.ADMIN,
    myShare:       ms,
    downlineShare: adminShare,
    ledgerShare:   ls,
    fixLimit:      fl,
    coins:         0,
    createdBy:     req.user._id,
    parentId:      req.user._id,
  });

  const data = admin.toObject();
  delete data.password;

  res.status(201).json({
    success: true,
    message: `Admin ${username} created successfully.`,
    data,
  });
});

/* ─────────────────────────────────────────────────────────────
   GET ALL ADMINS   GET /superadmin/admins
───────────────────────────────────────────────────────────── */
const getAdmins = asyncHandler(async (req, res) => {
  // Extract query params
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {
    role: ROLES.ADMIN,
    createdBy: req.user._id,
  };
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { username: { $regex: search, $options: "i" } },
    ];
  }

  // Get total count and data
  const [admins, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: admins,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
/* ─────────────────────────────────────────────────────────────
   GET SINGLE ADMIN   GET /superadmin/admins/:id
───────────────────────────────────────────────────────────── */
const getAdmin = asyncHandler(async (req, res) => {
  const admin = await User
    .findOne({ _id: req.params.id, role: ROLES.ADMIN, createdBy: req.user._id })
    .select("-password");

  if (!admin) throw new AppError("Admin not found.", 404);

  res.status(200).json({ success: true, data: admin });
});

/* ─────────────────────────────────────────────────────────────
   UPDATE ADMIN   PATCH /superadmin/admins/:id
───────────────────────────────────────────────────────────── */
const updateAdmin = asyncHandler(async (req, res) => {
  const allowed = ["firstName", "isActive", "fixLimit", "ledgerShare"];

  const updates = {};
  allowed.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (Object.keys(updates).length === 0)
    throw new AppError("No valid fields provided to update.", 400);

  const admin = await User.findOneAndUpdate(
    { _id: req.params.id, role: ROLES.ADMIN, createdBy: req.user._id },
    updates,
    { returnDocument: "after", runValidators: true }
  ).select("-password");

  if (!admin) throw new AppError("Admin not found.", 404);

  res.status(200).json({ success: true, message: "Admin updated.", data: admin });
});

/* ─────────────────────────────────────────────────────────────
   TOGGLE STATUS   PATCH /superadmin/admins/:id/status
───────────────────────────────────────────────────────────── */
const toggleAdminStatus = asyncHandler(async (req, res) => {
  const admin = await User.findOne({
    _id: req.params.id, role: ROLES.ADMIN, createdBy: req.user._id,
  });

  if (!admin) throw new AppError("Admin not found.", 404);

  admin.isActive = !admin.isActive;
  await admin.save({ validateModifiedOnly: true });

  res.status(200).json({
    success: true,
    message: `Admin ${admin.isActive ? "activated" : "deactivated"}.`,
    data:    { isActive: admin.isActive },
  });
});

/* ─────────────────────────────────────────────────────────────
   CHANGE PASSWORD   PATCH /superadmin/admins/:id/password
───────────────────────────────────────────────────────────── */
const changeAdminPassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;

  if (!password || !confirmPassword)
    throw new AppError("password and confirmPassword are required.", 400);
  if (password !== confirmPassword)
    throw new AppError("Passwords do not match.", 400);
  if (password.length < 6)
    throw new AppError("Password must be at least 6 characters.", 400);

  const admin = await User.findOne({
    _id: req.params.id, role: ROLES.ADMIN, createdBy: req.user._id,
  });

  if (!admin) throw new AppError("Admin not found.", 404);

  admin.password = password;
  await admin.save({ validateModifiedOnly: true });

  res.status(200).json({ success: true, message: "Password changed successfully." });
});



/* ─────────────────────────────────────────────────────────────
   DELETE ADMIN   DELETE /superadmin/admins/:id
───────────────────────────────────────────────────────────── */
const deleteAdmin = asyncHandler(async (req, res) => {
  // First check if admin exists and belongs to this superadmin
  const admin = await User.findOne({
    _id: req.params.id,
    role: ROLES.ADMIN,
    createdBy: req.user._id,
  });

  if (!admin) {
    throw new AppError("Admin not found or you don't have permission to delete this admin.", 404);
  }

  // Optional: Check if admin has any dependent records before deletion
  // For example, check if this admin has created any sub-admins or other records
  const hasDependents = await User.exists({ createdBy: admin._id });
  if (hasDependents) {
    throw new AppError(
      "Cannot delete admin because they have created other users. Reassign or delete those users first.",
      400
    );
  }

  // Perform soft delete or hard delete based on your requirements
  // Option 1: Hard delete (permanently remove from database)
  await User.deleteOne({ _id: req.params.id });

  res.status(200).json({
    success: true,
    message: `Admin ${admin.username} deleted successfully.`,
    data: {
      id: admin._id,
      username: admin.username,
      firstName: admin.firstName,
    },
  });
});



module.exports = {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  toggleAdminStatus,
  changeAdminPassword,
  deleteAdmin
};
