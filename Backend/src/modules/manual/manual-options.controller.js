"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const optionsService = require("./manual-options.service");
const sse = require("./manual.events");
const Session = require("../session/session.model");

const OPTION_FIELDS = [
  "tossWinMessage",
  "errorMessage",
  "balls",
  "newTarget",
  "matchDelay",
  "sessionDelay",
  "matchMaxBet",
  "sessionMaxBet",
  "sessionRateDifference",
  "tossVisibility",
  "tossResult",
  "tossTeam",
  "tieResult",
];

const NUMBER_RULES = {
  balls: { min: 1 },
  newTarget: { min: 0, nullable: true },
  matchDelay: { min: 0, max: 300 },
  sessionDelay: { min: 0, max: 300 },
  matchMaxBet: { min: 0 },
  sessionMaxBet: { min: 0 },
  sessionRateDifference: { min: 1, max: 10 },
};

function requireMatchId(value) {
  if (typeof value !== "string" || !value.trim()) throw new AppError("matchId is required", 400);
  return value.trim();
}

function validateOptions(source) {
  const updates = {};
  for (const field of OPTION_FIELDS) {
    if (source?.[field] !== undefined) updates[field] = source[field];
  }
  if (!Object.keys(updates).length) throw new AppError("At least one option field is required", 400);

  for (const [field, rule] of Object.entries(NUMBER_RULES)) {
    if (updates[field] === undefined) continue;
    if (rule.nullable && (updates[field] === null || updates[field] === "")) {
      updates[field] = null;
      continue;
    }
    const value = Number(updates[field]);
    if (!Number.isFinite(value) || value < rule.min || (rule.max !== undefined && value > rule.max)) {
      throw new AppError(`${field} is outside the allowed range`, 400);
    }
    updates[field] = value;
  }

  for (const field of ["tossWinMessage", "errorMessage", "tossTeam"]) {
    if (updates[field] !== undefined) updates[field] = String(updates[field]).trim();
  }
  if (updates.tossWinMessage?.length > 250 || updates.errorMessage?.length > 250) {
    throw new AppError("Messages cannot exceed 250 characters", 400);
  }
  if (updates.tossTeam?.length > 120) throw new AppError("tossTeam cannot exceed 120 characters", 400);
  if (updates.tossVisibility && !["show", "remove", "suspend"].includes(updates.tossVisibility)) {
    throw new AppError("Invalid tossVisibility", 400);
  }
  if (updates.tossResult && !["won", "lost"].includes(updates.tossResult)) {
    throw new AppError("Invalid tossResult", 400);
  }
  if (updates.tieResult && !["tie", "no-tie"].includes(updates.tieResult)) {
    throw new AppError("Invalid tieResult", 400);
  }
  return updates;
}

function broadcastOptions(matchId, options) {
  sse.broadcast(matchId, { type: "OPTIONS_UPDATED", payload: { ...options, matchId } });
}

const getOptions = asyncHandler(async (req, res) => {
  const matchId = requireMatchId(req.params.matchId);
  const options = await optionsService.getOptions(matchId);
  res.status(200).json({ success: true, data: options });
});

const updateOptions = asyncHandler(async (req, res) => {
  const matchId = requireMatchId(req.params.matchId);
  const updates = validateOptions(req.body);
  const options = await optionsService.updateOptions(matchId, updates, req.user?._id);

  if (updates.sessionRateDifference !== undefined) {
    await Session.updateMany(
      { matchId, resultStatus: { $ne: "settled" } },
      { $set: { rateDiff: updates.sessionRateDifference } }
    );
    const sessions = await Session.find({ matchId }).sort({ displayOrder: 1 }).lean();
    sse.broadcast(matchId, { type: "SESSIONS_UPDATED", payload: { matchId, sessions } });
  }

  broadcastOptions(matchId, options);
  res.status(200).json({ success: true, message: "Match options updated successfully", data: options });
});

const settleToss = asyncHandler(async (req, res) => {
  const matchId = requireMatchId(req.params.matchId);
  const { tossResult, tossTeam } = validateOptions({ tossResult: req.body.tossResult, tossTeam: req.body.tossTeam });
  if (!tossResult || !tossTeam) throw new AppError("tossResult and tossTeam are required", 400);
  const options = await optionsService.updateOptions(matchId, { tossResult, tossTeam }, req.user?._id);
  broadcastOptions(matchId, options);
  res.status(200).json({ success: true, message: "Toss result saved", data: options });
});

const settleTie = asyncHandler(async (req, res) => {
  const matchId = requireMatchId(req.params.matchId);
  const { tieResult } = validateOptions({ tieResult: req.body.tieResult });
  if (!tieResult) throw new AppError("tieResult is required", 400);
  const options = await optionsService.updateOptions(matchId, { tieResult }, req.user?._id);
  broadcastOptions(matchId, options);
  res.status(200).json({ success: true, message: "Tie result saved", data: options });
});

module.exports = { getOptions, updateOptions, settleToss, settleTie };
