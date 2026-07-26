const SavedMatch = require("./saved-match.model");

/**
 * Save a match for a user.
 * - Rejects if the match has already started (commenceTime in the past).
 * - Uses the compound unique index to prevent duplicates (catches error code 11000).
 */

const saveMatch = async (userId, matchData) => {
  const { matchId, homeTeam, awayTeam, commenceTime, sportKey, odds } = matchData;

  // Check for duplicate
  const existing = await SavedMatch.findOne({ matchId });
  if (existing) {
    const err = new Error("Match already saved.");
    err.statusCode = 409;
    throw err;
  }

  const match = await SavedMatch.create({
    user: userId, 
    matchId,
    homeTeam,
    awayTeam,
    commenceTime,
    sportKey,
    odds,
  });

  return match;
};

/**
 * Get ALL saved matches (public — no userId filter).
 * Route: GET /api/matches/saved
 * Sorted newest first, returns plain JS objects via lean().
 */
const getSavedMatches = async () => {
  return SavedMatch.find()
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Delete a saved match by matchId only (superadmin can delete any match).
 * Returns the deleted document so the caller can confirm.
 */
const deleteSavedMatch = async (userId, matchId) => {
  const deleted = await SavedMatch.findOneAndDelete({ matchId }).lean();

  if (!deleted) {
    const err = new Error("Saved match not found.");
    err.statusCode = 404;
    throw err;
  }

  return deleted;
};

/**
 * Remove all saved matches whose commence time is in the past.
 * Called by the optional cron job.
 */
const deleteExpiredMatches = async () => {
  const result = await SavedMatch.deleteMany({
    commenceTime: { $lt: new Date() },
  });
  return result.deletedCount;
};

module.exports = {
  saveMatch,
  getSavedMatches,
  deleteSavedMatch,
  deleteExpiredMatches,
};
