const { validationResult } = require("express-validator");
const {
  saveMatch,
  getSavedMatches,
  deleteSavedMatch,
} = require("./saved-match.service");

/**
 * POST /api/matches/save  — superadmin only
 */
const saveMatchHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed.",
      errors: errors.array(),
    });
  }

  try {
    const userId = req.user.id; // ← protect guarantees this exists
    const saved = await saveMatch(userId, req.body);

    return res.status(201).json({
      success: true,
      message: "Match saved successfully.",
      data: saved,
    });
  } catch (err) {
    console.error("[savedMatchController.saveMatchHandler]", err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to save match.",
    });
  }
};

/**
 * GET /api/matches/saved  — public
 */
const getSavedMatchesHandler = async (req, res) => {
  try {
    const matches = await getSavedMatches(); // ← no userId filter, returns all

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error("[savedMatchController.getSavedMatchesHandler]", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve saved matches.",
    });
  }
};

/**
 * DELETE /api/matches/:matchId  — superadmin only
 */
const deleteSavedMatchHandler = async (req, res) => {
  try {
    const userId = req.user.id; // ← protect guarantees this exists
    const { matchId } = req.params;

    const deleted = await deleteSavedMatch(userId, matchId);

    return res.status(200).json({
      success: true,
      message: "Saved match removed.",
      data: deleted,
    });
  } catch (err) {
    console.error("[savedMatchController.deleteSavedMatchHandler]", err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to delete saved match.",
    });
  }
};

/**
 * GET /api/matches/saved/:matchId  — public
 */
const getSavedMatchByIdHandler = async (req, res) => {
  try {
    const { matchId } = req.params;
    const matches = await getSavedMatches();
    const match = matches.find((m) => m.matchId === matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Match not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: match,
    });
  } catch (err) {
    console.error("[savedMatchController.getSavedMatchByIdHandler]", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve match.",
    });
  }
};
module.exports = {
  saveMatchHandler,
  getSavedMatchesHandler,
  deleteSavedMatchHandler,
  getSavedMatchByIdHandler,
};
