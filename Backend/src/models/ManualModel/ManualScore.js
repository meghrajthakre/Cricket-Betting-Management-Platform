const mongoose = require("mongoose");

const manualScoreSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: "" },
    firstBattingTeam: { type: String, default: "" },
    secondBattingTeam: { type: String, default: "" },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 }, // e.g. 18.2 = 18 overs, 2 balls
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManualScore", manualScoreSchema);