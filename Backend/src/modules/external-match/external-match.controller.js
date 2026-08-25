"use strict";

const asyncHandler = require("../../utils/asyncHandler");
const AppError = require("../../utils/AppError");
const { saveMatch } = require("../saved-match/saved-match.service");
const { fetchExternalMatches, toSavedMatchPayload } = require("./external-match.service");

const getExternalMatches = asyncHandler(async (_req, res) => {
  const matches = await fetchExternalMatches();
  return res.status(200).json({
    success: true,
    count: matches.length,
    data: matches,
  });
});

const saveExternalMatch = asyncHandler(async (req, res) => {
  const matchId = String(req.body?.matchId ?? "").trim();
  if (!matchId) throw new AppError("matchId is required.", 400);

  const availableMatches = await fetchExternalMatches();
  const externalMatch = availableMatches.find((match) => match.matchId === matchId);
  if (!externalMatch) throw new AppError("External match is no longer available.", 404);

  const saved = await saveMatch(req.user._id, toSavedMatchPayload(externalMatch));
  return res.status(201).json({
    success: true,
    message: "Match saved successfully.",
    data: saved,
  });
});

module.exports = { getExternalMatches, saveExternalMatch };
