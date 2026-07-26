"use strict";

const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    matchId: { type: String, required: true, trim: true, index: true },
    sessionName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "suspend", "closed"],
      default: "suspend",
    },
    manuallySuspended: { type: Boolean, default: false },
    lockStatus: {
      type: String,
      enum: ["lock", "unlock"],
      default: "unlock",
    },
    rateDiff: { type: Number, default: 1 },
    noRun: { type: Number, default: 0 },
    noRate: { type: Number, default: 1 },
    yesRun: { type: Number, default: 0 },
    yesRate: { type: Number, default: 1 },
    group: { type: String, default: "default", trim: true },
    maxAmount: { type: Number, min: 0, default: 500000 },
    oddEven: { type: String, enum: ["yes", "no"], default: "no" },
    isVisible: { type: Boolean, default: false },
    visibilityVersion: { type: Number, default: 0, select: false },
    displayOrder: { type: Number, required: true, min: 1 },
    resultStatus: {
      type: String,
      enum: ["pending", "settled", "cancelled"],
      default: "pending",
    },
    resultRun: { type: Number, default: null },
    settledAt: { type: Date, default: null },
    settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false, collection: "sessions" }
);

sessionSchema.index({ matchId: 1, id: 1 }, { unique: true });
sessionSchema.index({ matchId: 1, sessionName: 1 }, { unique: true });

module.exports = mongoose.models.Session || mongoose.model("Session", sessionSchema);
