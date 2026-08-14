"use strict";

const mongoose = require("mongoose");

const matchEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rootSuperAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  matchId: { type: String, required: true, trim: true, maxlength: 120 },
  matchName: { type: String, required: true, trim: true, maxlength: 200 },
  fee: { type: Number, required: true, min: 0.01 },
}, { timestamps: true });

matchEntrySchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.models.MatchEntry || mongoose.model("MatchEntry", matchEntrySchema);
