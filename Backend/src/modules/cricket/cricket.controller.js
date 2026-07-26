const {
  fetchLiveMatches,
  fetchMatchLine,
  fetchScorecard,
  fetchActiveCricketSportKeys,
} = require("./cricket.service");

// ─── GET /api/cricket/live ─────────────────────────────────────────────────────
/**
 * Returns all currently live (in-play) cricket matches with h2h odds.
 *
 * Response shape:
 * {
 *   count: number,
 *   matches: NormalisedEvent[]
 * }
 */
const getLiveMatches = async (req, res) => {
  try {
    const matches = await fetchLiveMatches();
    return res.status(200).json({
      count: matches.length,
      matches,
    });
  } catch (err) {
    console.error("[cricketController] getLiveMatches error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch live matches",
      details: err.message,
    });
  }
};

// ─── GET /api/cricket/live/:sportKey/scores ────────────────────────────────────
/**
 * Returns scores / results for a given sport key.
 *
 * Params:
 *   sportKey  — e.g. "cricket_ipl"
 *
 * Query:
 *   daysFrom  — (optional) how many days back to include completed results (1–3, default 1)
 *
 * Response shape:
 * {
 *   sportKey: string,
 *   count: number,
 *   scores: ScorecardEvent[]
 * }
 */
const getLiveScores = async (req, res) => {
  const { sportKey } = req.params;
  const daysFrom = Math.min(parseInt(req.query.daysFrom, 10) || 1, 3);

  if (!sportKey) {
    return res.status(400).json({ error: "sportKey param is required" });
  }

  try {
    const scores = await fetchScorecard(sportKey, daysFrom);
    return res.status(200).json({
      sportKey,
      count: scores.length,
      scores,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        error: `Sport key "${sportKey}" not found or out of season`,
      });
    }
    console.error("[cricketController] getLiveScores error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch scores",
      details: err.message,
    });
  }
};

// ─── GET /api/cricket/live/:sportKey/match/:eventId/odds ──────────────────────
/**
 * Returns all available odds markets for a specific match.
 *
 * Params:
 *   sportKey  — e.g. "cricket_ipl"
 *   eventId   — the Odds API event id (matchId from live matches list)
 *
 * Response shape:
 * {
 *   sportKey: string,
 *   eventId:  string,
 *   data:     RawOddsApiEvent  (bookmakers + all markets)
 * }
 */
const getMatchOdds = async (req, res) => {
  const { sportKey, eventId } = req.params;

  if (!sportKey || !eventId) {
    return res.status(400).json({ error: "sportKey and eventId params are required" });
  }

  try {
    const data = await fetchMatchLine(eventId, sportKey);
    return res.status(200).json({
      sportKey,
      eventId,
      data,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({
        error: `Event "${eventId}" not found for sport "${sportKey}"`,
      });
    }
    console.error("[cricketController] getMatchOdds error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch match odds",
      details: err.message,
    });
  }
};

// ─── GET /api/cricket/live/summary ────────────────────────────────────────────
/**
 * Convenience endpoint: returns live matches + their scores in one shot.
 * Iterates over all active sport keys and merges scorecard data into each match.
 *
 * Response shape:
 * {
 *   count: number,
 *   matches: (NormalisedEvent & { scorecard: ScorecardEvent | null })[]
 * }
 */
const getLiveSummary = async (req, res) => {
  try {
    // 1. Fetch live matches (with odds already embedded)
    const liveMatches = await fetchLiveMatches();

    if (liveMatches.length === 0) {
      return res.status(200).json({ count: 0, matches: [] });
    }

    // 2. Determine which sport keys have live matches
    const activeSportKeys = [...new Set(liveMatches.map((m) => m.sportKey))];

    // 3. Fetch scorecards for each active sport key (daysFrom=1 covers today)
    const scorecardResults = await Promise.allSettled(
      activeSportKeys.map((key) => fetchScorecard(key, 1))
    );

    // Build a lookup: matchId → scorecard entry
    const scoreLookup = {};
    scorecardResults.forEach((result) => {
      if (result.status === "fulfilled") {
        for (const entry of result.value) {
          scoreLookup[entry.matchId] = entry;
        }
      }
    });

    // 4. Merge scorecard data into each live match
    const merged = liveMatches.map((match) => ({
      ...match,
      scorecard: scoreLookup[match.matchId] ?? null,
    }));

    return res.status(200).json({
      count: merged.length,
      matches: merged,
    });
  } catch (err) {
    console.error("[cricketController] getLiveSummary error:", err.message);
    return res.status(500).json({
      error: "Failed to fetch live summary",
      details: err.message,
    });
  }
};

module.exports = {
  getLiveMatches,
  getLiveScores,
  getMatchOdds,
  getLiveSummary,
};
