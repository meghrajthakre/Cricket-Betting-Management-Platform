const mongoose = require("mongoose");

const manualOptionsSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true, trim: true },
    tossWinMessage: { type: String, trim: true, maxlength: 250, default: "" },
    errorMessage: { type: String, trim: true, maxlength: 250, default: "" },
    balls: { type: Number, min: 1, default: 120 },
    newTarget: { type: Number, min: 0, default: null },
    matchDelay: { type: Number, min: 0, max: 300, default: 4 },
    sessionDelay: { type: Number, min: 0, max: 300, default: 7 },
    matchMaxBet: { type: Number, min: 0, default: 100000 },
    sessionMaxBet: { type: Number, min: 0, default: 100000 },
    sessionRateDifference: { type: Number, min: 1, max: 10, default: 1 },
    tossVisibility: {
      type: String,
      enum: ["show", "remove", "suspend"],
      default: "remove",
    },
    tossResult: { type: String, enum: ["", "won", "lost"], default: "" },
    tossTeam: { type: String, trim: true, maxlength: 120, default: "" },
    tieResult: { type: String, enum: ["", "tie", "no-tie"], default: "" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManualOptions", manualOptionsSchema);

