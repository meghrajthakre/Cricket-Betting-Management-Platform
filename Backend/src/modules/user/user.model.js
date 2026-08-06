"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ROLES = Object.freeze({
  SUPERADMIN: "superadmin",
  SUPPORT: "support",
  MASTER: "master",
  SUB_COMPANY: "sub_company",
  SUB_MASTER: "sub_master",
  SST: "sst",
  SS: "ss",
  SA: "sa",
  ADMIN: "admin",
  USER: "user",
});

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      unique: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },

    firstName: {
      type: String,
      trim: true,
      default: "",
    },

    mobile: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [4, "Password must be at least 4 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },

    coins: {
      type: Number,
      default: 0,
      min: [0, "Coins cannot be negative"],
      validate: { validator: Number.isFinite, message: "Coins must be finite" },
    },

    fixLimit: {
      type: Number,
      default: 0,
      min: [0, "fixLimit cannot be negative"],
    },

    /* ── Hierarchy ─────────────────────────────────────────── */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rootSuperAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ancestorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    allocatedShareBps: {
      type: Number,
      default: 0,
      min: [0, "allocatedShareBps cannot be negative"],
      max: [10000, "allocatedShareBps cannot exceed 10000"],
      validate: {
        validator: Number.isInteger,
        message: "allocatedShareBps must be a whole number",
      },
    },

    allocatedShare: {
      type: Number,
      default: 0,
      min: [0, "allocatedShare cannot be negative"],
      max: [10000, "allocatedShare cannot exceed 10000"],
      validate: {
        validator: Number.isInteger,
        message: "allocatedShare must be a whole number",
      },
    },

    /* ── Share system ──────────────────────────────────────── */
    // myShare + downlineShare = 100 always
    myShare: {
      type: Number,
      default: 0,
      min: [0, "myShare cannot be negative"],
      max: [100, "myShare cannot exceed 100"],
    },

    downlineShare: {
      type: Number,
      default: 0,
      min: [0, "downlineShare cannot be negative"],
      max: [100, "downlineShare cannot exceed 100"],
    },

    // Independent — profit/loss % shared via ledger
    ledgerShare: {
      type: Number,
      default: 0,
      min: [0, "ledgerShare cannot be negative"],
      max: [100, "ledgerShare cannot exceed 100"],
    },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ── Indexes ───────────────────────────────────────────────── */
userSchema.index({ role: 1 });
userSchema.index({ parentId: 1 });
userSchema.index({ createdBy: 1 });
userSchema.index({ rootSuperAdminId: 1, role: 1 });
userSchema.index({ ancestorIds: 1, role: 1 });

/* ── Pre-save: hash password ───────────────────────────────── */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ── Virtual ───────────────────────────────────────────────── */
userSchema.virtual("shareTotal").get(function () {
  return this.myShare + this.downlineShare; // always 100
});

/* ── Statics & methods ─────────────────────────────────────── */
userSchema.statics.findByUsername = function (username) {
  return this.findOne({ username }).select("+password");
};
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = { User, ROLES };
