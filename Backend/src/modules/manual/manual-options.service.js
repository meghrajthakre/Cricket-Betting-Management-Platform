"use strict";

const ManualOptions = require("./manual-options.model");

const DEFAULT_OPTIONS = Object.freeze({
  tossWinMessage: "",
  errorMessage: "",
  balls: 120,
  newTarget: null,
  matchDelay: 4,
  sessionDelay: 7,
  matchMaxBet: 100000,
  sessionMaxBet: 100000,
  sessionRateDifference: 1,
  tossVisibility: "remove",
  tossResult: "",
  tossTeam: "",
  tieResult: "",
});

async function getOptions(matchId) {
  const options = await ManualOptions.findOne({ matchId }).lean();
  return options || { matchId, ...DEFAULT_OPTIONS };
}

async function updateOptions(matchId, updates, updatedBy) {
  return ManualOptions.findOneAndUpdate(
    { matchId },
    {
      $set: { ...updates, ...(updatedBy ? { updatedBy } : {}) },
      $setOnInsert: { matchId },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  ).lean();
}

module.exports = { DEFAULT_OPTIONS, getOptions, updateOptions };
