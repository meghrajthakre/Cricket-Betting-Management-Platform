const axios = require("axios");

// ─── Config ───────────────────────────────────────────────────────────────────

// The Odds API — https://the-odds-api.com
// Get your key at https://the-odds-api.com/#get-access
const ODDS_API_KEY  = process.env.ODDS_API_KEY;
const ODDS_API_HOST = "https://api.the-odds-api.com";
const ODDS_API_REGIONS = process.env.ODDS_API_REGIONS || "uk";
const ACTIVE_SPORTS_CACHE_MS = 60 * 60 * 1000;
const ODDS_SNAPSHOT_CACHE_MS = 5 * 60 * 1000;

let activeSportsCache = { data: null, expiresAt: 0, inFlight: null };
let oddsSnapshotCache = { data: null, expiresAt: 0, inFlight: null };

/**
 * All cricket sport keys supported by The Odds API.
 * Source: https://the-odds-api.com/sports-odds-data/sports-apis.html
 * Out-of-season keys return 404 and are silently skipped.
 */
const CRICKET_SPORT_KEYS = [
  "cricket_test_match",               // Test Matches
  "cricket_odi",                      // One Day Internationals
  "cricket_international_t20",        // International Twenty20
  "cricket_ipl",                      // IPL
  "cricket_psl",                      // Pakistan Super League
  "cricket_big_bash",                 // Big Bash
  "cricket_t20_blast",                // T20 Blast
  "cricket_caribbean_premier_league", // Caribbean Premier League
  "cricket_the_hundred",              // The Hundred
  "cricket_icc_trophy",               // ICC Champions Trophy
  "cricket_icc_world_cup",            // ICC World Cup
  "cricket_icc_world_cup_womens",     // ICC Women's World Cup
  "cricket_t20_world_cup",            // T20 World Cup
  "cricket_asia_cup",                 // Asia Cup
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Centralised Odds API caller.
 * Returns parsed JSON data or throws a descriptive error.
 */
const callOddsApi = async (path, params = {}) => {
  if (!ODDS_API_KEY) {
    throw new Error("[cricketService] ODDS_API_KEY is not set in environment");
  }

  const url = `${ODDS_API_HOST}${path}`;
  try {
    const response = await axios.get(url, {
      params: { apiKey: ODDS_API_KEY, ...params },
      timeout: 10_000,
    });

    // Log remaining quota from response headers
    const remaining = response.headers["x-requests-remaining"];
    const used      = response.headers["x-requests-used"];
    if (remaining !== undefined) {
      console.info(`[cricketService] Odds API quota — used: ${used}, remaining: ${remaining}`);
    }
   
    return response.data;
  } catch (err) {
    if (err.response) {
      // 404 = sport out of season — caller handles this
      if (err.response.status === 404) {
        const e = new Error("NOT_FOUND");
        e.status = 404;
        throw e;
      }
      console.error(
        `[cricketService] HTTP ${err.response.status} ← GET ${url}`,
        err.response.data ?? ""
      );
      throw new Error(
        `The Odds API returned ${err.response.status} for ${path}: ` +
        (err.response.data?.message ?? "unknown error")
      );
    }
    console.error(`[cricketService] Network error calling ${url}:`, err.message);
    throw err;
  }
};

/**
 * Fetch all in-season cricket sport keys from the API
 * instead of relying on a hardcoded list.
 */
const fetchActiveCricketSportKeys = async () => {
  const now = Date.now();
  if (activeSportsCache.data && activeSportsCache.expiresAt > now) {
    return activeSportsCache.data;
  }
  if (activeSportsCache.inFlight) return activeSportsCache.inFlight;

  activeSportsCache.inFlight = (async () => {
    try {
      const sports = await callOddsApi("/v4/sports", { all: false });
      const keys = Array.isArray(sports)
        ? sports.filter((sport) => sport.group === "Cricket" && sport.active).map((sport) => sport.key)
        : CRICKET_SPORT_KEYS;
      activeSportsCache.data = keys;
      activeSportsCache.expiresAt = Date.now() + ACTIVE_SPORTS_CACHE_MS;
      return keys;
    } catch {
      activeSportsCache.data = CRICKET_SPORT_KEYS;
      activeSportsCache.expiresAt = Date.now() + ACTIVE_SPORTS_CACHE_MS;
      return CRICKET_SPORT_KEYS;
    } finally {
      activeSportsCache.inFlight = null;
    }
  })();

  return activeSportsCache.inFlight;
};

/**
 * Derive minRate / maxRate from bookmaker h2h prices for a single event.
 *
 *   minRate = lowest price across all outcomes/bookmakers  (tightest favourite)
 *   maxRate = highest price across all outcomes/bookmakers (biggest underdog)
 *
 * Shape matches the original { minRate, maxRate } contract so nothing downstream breaks.
 */
const extractOdds = (event) => {
  const prices = [];
  for (const bookmaker of event.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      if (market.key !== "h2h") continue;
      for (const outcome of market.outcomes ?? []) {
        if (typeof outcome.price === "number") prices.push(outcome.price);
      }
    }
  }
  if (prices.length === 0) return null;
  return { minRate: Math.min(...prices), maxRate: Math.max(...prices) };
};

/**
 * Normalise a raw Odds API event into the shape the rest of the app expects.
 */
const normaliseEvent = (raw, sportKey) => ({
  matchId:      raw.id,
  sportKey,
  homeTeam:     raw.home_team  ?? "",
  awayTeam:     raw.away_team  ?? "",
  commenceTime: raw.commence_time ?? null,
  status:       raw.completed
    ? "Completed"
    : (raw.in_play === true || (raw.commence_time && new Date(raw.commence_time) <= new Date()) ? "Live" : "Upcoming"),
  odds:         extractOdds(raw),

  // Scores — populated when the /scores endpoint is used
  homeScore:    raw.scores?.find((s) => s.name === raw.home_team)?.score ?? null,
  awayScore:    raw.scores?.find((s) => s.name === raw.away_team)?.score ?? null,
  completed:    raw.completed ?? false,
  lastUpdate:   raw.last_update ?? null,
});

const fetchCricketOddsSnapshot = async () => {
  const now = Date.now();
  if (oddsSnapshotCache.data && oddsSnapshotCache.expiresAt > now) {
    return oddsSnapshotCache.data;
  }
  if (oddsSnapshotCache.inFlight) return oddsSnapshotCache.inFlight;

  oddsSnapshotCache.inFlight = (async () => {
    try {
      const sportKeys = await fetchActiveCricketSportKeys();
      const results = await Promise.allSettled(
        sportKeys.map((sportKey) =>
          callOddsApi(`/v4/sports/${sportKey}/odds`, {
            regions: ODDS_API_REGIONS,
            markets: "h2h",
            oddsFormat: "decimal",
            dateFormat: "iso",
          })
        )
      );

      const eventsById = new Map();
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          if (result.reason?.status !== 404) {
            console.error(`[cricketService] odds fetch failed for ${sportKeys[index]}:`, result.reason?.message);
          }
          return;
        }
        const events = Array.isArray(result.value) ? result.value : [];
        events.forEach((event) => eventsById.set(event.id, normaliseEvent(event, sportKeys[index])));
      });

      const snapshot = [...eventsById.values()];
      oddsSnapshotCache.data = snapshot;
      oddsSnapshotCache.expiresAt = Date.now() + ODDS_SNAPSHOT_CACHE_MS;
      return snapshot;
    } finally {
      oddsSnapshotCache.inFlight = null;
    }
  })();

  return oddsSnapshotCache.inFlight;
};

// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Fetch today / upcoming / all matches with h2h odds.
 *
 * filter: "today" | "upcoming" | undefined (all)
 *
 * The Odds API returns live + upcoming events in a single call per sport.
 * We filter by commence_time when "today" or "upcoming" is requested.
 */
const fetchMatches = async (filter) => {
  const now        = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const snapshot = await fetchCricketOddsSnapshot();
  const matches = snapshot.filter((event) => {
    const commenceTime = new Date(event.commenceTime);
    if (filter === "today") return commenceTime >= now && commenceTime <= endOfToday;
    if (filter === "upcoming") return commenceTime > now;
    return true;
  });

  // Sort by commence_time ascending
  return matches.sort((a, b) =>
    new Date(a.commenceTime) - new Date(b.commenceTime)
  );
};

/**
 * Fetch currently live (in-play) cricket matches with h2h odds.
 *
 * The Odds API marks live events via in_play: true in the events endpoint.
 * We filter the full odds response to only in-play events.
 */
const fetchLiveMatches = async () => {
  const snapshot = await fetchCricketOddsSnapshot();
  // The /odds response contains available live + upcoming events and does not
  // consistently expose `in_play`. Keep all non-completed events and let the
  // normalized status tell the frontend whether each one is Live or Upcoming.
  return snapshot.filter((event) => !event.completed);
};

/**
 * Fetch all available odds markets for a specific event (match).
 *
 * eventId  — the Odds API event id (matchId from normaliseEvent)
 * sportKey — e.g. "cricket_ipl"
 *
 * Returns raw bookmaker / market data so the caller can render whatever markets they need.
 */
const fetchMatchLine = async (eventId, sportKey) => {
  return callOddsApi(`/v4/sports/${sportKey}/events/${eventId}/odds`, {
    regions:    "uk,eu",
    markets:    "h2h,totals",
    oddsFormat: "decimal",
    dateFormat: "iso",
  });
};

/**
 * Fetch scores / results for a specific sport.
 *
 * sportKey      — e.g. "cricket_ipl"
 * daysFrom      — how many days back to include completed results (default 1, max 3)
 *
 * Returns an array of events with scores attached.
 */
const fetchScorecard = async (sportKey, daysFrom = 1) => {
  const events = await callOddsApi(`/v4/sports/${sportKey}/scores`, {
    daysFrom,
    dateFormat: "iso",
  });

  if (!Array.isArray(events)) return [];

  return events.map((e) => ({
    matchId:      e.id,
    sportKey,
    homeTeam:     e.home_team,
    awayTeam:     e.away_team,
    commenceTime: e.commence_time,
    completed:    e.completed,
    lastUpdate:   e.last_update,
    homeScore:    e.scores?.find((s) => s.name === e.home_team)?.score ?? null,
    awayScore:    e.scores?.find((s) => s.name === e.away_team)?.score ?? null,
  }));
};

module.exports = {
  fetchMatches,
  fetchLiveMatches,
  fetchMatchLine,
  fetchScorecard,
  // Exposed for unit-testing
  normaliseEvent,
  extractOdds,
  fetchActiveCricketSportKeys,
};
