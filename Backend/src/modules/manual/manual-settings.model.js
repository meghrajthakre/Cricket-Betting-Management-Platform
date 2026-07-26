const mongoose = require("mongoose");

const manualSettingsSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
    },

    rateDiff: {
      type: Number,
      default: 1,
    },

    betLock: {
      type: Boolean,
      default: false,
    },

    sessionLock: {
      type: Boolean,
      default: false,
    },

    mode: {
      type: String,
      enum: ["Lagai", "Khai"],
      default: "Lagai",
    },

    marketStatus: {
      type: String,
      enum: ["OPEN", "SUSPEND", "CLOSED"],
      default: "OPEN",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
    "ManualSettings",
    manualSettingsSchema
);
