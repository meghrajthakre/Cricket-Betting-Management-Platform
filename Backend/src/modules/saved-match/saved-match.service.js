const SavedMatch = require("./saved-match.model");
const { Bet, BET_STATUS } = require("../bet/bet.model");

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
  const matches = await SavedMatch.find().sort({ createdAt: -1 }).lean();
  if (!matches.length) return [];
  const totals = await Bet.aggregate([
    { $match: { matchId: { $in: matches.map((match) => match.matchId) }, status: { $in: [BET_STATUS.WON, BET_STATUS.LOST] } } },
    { $group: { _id: "$matchId", profitLoss: { $sum: { $cond: [{ $eq: ["$status", BET_STATUS.WON] }, { $multiply: ["$profit", -1] }, "$loss"] } } } },
  ]);
  const pnlByMatch = new Map(totals.map((item) => [String(item._id), Number(Number(item.profitLoss).toFixed(2))]));
  return matches.map((match) => ({
    ...match,
    profitLoss: match.isDeclared ? (pnlByMatch.get(match.matchId) || 0) : null,
  }));
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
