const mongoose = require("mongoose");

const manualRunnerSchema = new mongoose.Schema(
  {
    matchId: {
      type: String,
      required: true,
      index: true,
    },

    runnerId: {
      type: String,
      required: true,
    },

    runnerName: {
      type: String,
      required: true,
    },

    lagai: {
      type: Number,
      default: 0,
    },

    khai: {
      type: Number,
      default: 0,
    },
    touched: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["open", "suspend"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

manualRunnerSchema.index(
  {
    matchId: 1,
    runnerId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
    "ManualRunner",
    manualRunnerSchema
);
