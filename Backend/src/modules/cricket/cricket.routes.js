const express = require("express");
const router  = express.Router();

const {
  getLiveMatches,
  getLiveScores,
  getMatchOdds,
  getLiveSummary,
} = require("./cricket.controller");



// ─── Live matches (odds embedded) ────────────────────────────────────────────
// GET /api/cricket/live
// Returns all in-play matches across every active cricket format with h2h odds.
router.get("/live", getLiveMatches);

// ─── Scores ───────────────────────────────────────────────────────────────────
// GET /api/cricket/live/:sportKey/scores?daysFrom=1
// Returns scorecard data for the given sport key.
// Query param daysFrom (1-3, default 1) controls how far back completed scores go.
//
// Example: GET /api/cricket/live/cricket_ipl/scores?daysFrom=2
router.get("/live/:sportKey/scores", getLiveScores);

// ─── Match odds ───────────────────────────────────────────────────────────────
// GET /api/cricket/live/:sportKey/match/:eventId/odds
// Returns all bookmaker markets (h2h + totals) for a specific match.
//
// Example: GET /api/cricket/live/cricket_ipl/match/abc123xyz/odds
router.get("/live/:sportKey/match/:eventId/odds", getMatchOdds);

// ─── Live summary (odds + scores merged) ─────────────────────────────────────
// GET /api/cricket/live/summary
// Convenience endpoint: returns live matches with scorecard data merged in.
// Use this to power a single-page live dashboard without multiple round trips.
router.get("/live/summary", getLiveSummary);

module.exports = router;
