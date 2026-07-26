const { fetchMatches, fetchLiveMatches } = require("../cricket/cricket.service");

/**
 * GET /api/matches?filter=today|upcoming
 * Fetches matches from the external Odds API. Nothing is stored in MongoDB.
 */
const getMatches = async (req, res) => {
  try {
    const { filter } = req.query; // "today" | "upcoming" | undefined
    const matches = await fetchMatches(filter);

    return res.status(200).json({
      success: true,
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    console.error("[matchController.getMatches]", err.message);

    // Surface a friendly message when the Odds API key is invalid / quota exceeded
    const status = err.response?.status || 500;
    return res.status(status).json({
      success: false,
      message: err.response?.data?.message || "Failed to fetch matches.",
    });
  }
};


const getLiveMatches = async (req, res) => {
  try {
    const matches = await fetchLiveMatches();
    res.json({ success: true, data: matches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getMatches, getLiveMatches };
