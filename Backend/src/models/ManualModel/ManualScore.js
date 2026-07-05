"use strict";

const mongoose = require("mongoose");

const ManualScoreSchema = new mongoose.Schema(
    {
        matchId: { type: String, required: true, unique: true, index: true },
        status: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ManualScore", ManualScoreSchema);