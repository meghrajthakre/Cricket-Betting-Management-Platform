const mongoose = require("mongoose");

const savedMatchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    matchId: {
      type: String,
      required: true,
      trim: true,
    },
    homeTeam: {
      type: String,
      trim: true,
    },
    awayTeam: {
      type: String,
      trim: true,
    },
    commenceTime: {
      type: Date,
    },
    sportKey: {
      type: String,
      trim: true,
    },
    odds: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index — one user cannot save the same match twice
savedMatchSchema.index({ user: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model("SavedMatch", savedMatchSchema);
