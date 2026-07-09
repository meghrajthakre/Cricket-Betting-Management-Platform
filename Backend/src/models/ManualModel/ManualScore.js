const mongoose = require("mongoose");

const ballSchema = new mongoose.Schema(
  {
    over: { type: Number, default: 0 },
    label: { type: String, required: true },
    runs: { type: Number, default: 0 },
    isWicket: { type: Boolean, default: false },
    isExtra: { type: Boolean, default: false },
    advanceBall: { type: Boolean, default: false },
  },
  { _id: false }
);

const manualScoreSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: "" },
    firstBattingTeam: { type: String, default: "" },
    secondBattingTeam: { type: String, default: "" },
    currentInnings: { type: Number, default: 1 }, // 1 or 2
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 }, // e.g. 18.2 = 18 overs, 2 balls
    balls: { type: [ballSchema], default: [] },
    firstInnScore1: { type: String, default: "" },
    firstInnScore2: { type: String, default: "" },
    trailRun: { type: String, default: "0" },
    leadRun: { type: String, default: "0" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManualScore", manualScoreSchema);