const mongoose = require("mongoose");

const manualSessionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    matchId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "suspend", "closed"],
      default: "suspend",
    },
    lockStatus: {
      type: String,
      enum: ["lock", "unlock"],
      default: "unlock",
    },
    rateDiff: {
      type: Number,
      default: 1,
    },
    group: {
      type: String,
      default: "default",
      trim: true,
    },
    maxAmount: {
      type: Number,
      min: 0,
      default: 500000,
    },
    oddEven: {
      type: String,
      enum: ["yes", "no"],
      default: "no",
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
    visibilityVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    displayOrder: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

manualSessionSchema.index({ matchId: 1, id: 1 }, { unique: true });
manualSessionSchema.index(
  { matchId: 1, sessionName: 1 },
  { unique: true }
);

module.exports = mongoose.model("ManualSession", manualSessionSchema);
