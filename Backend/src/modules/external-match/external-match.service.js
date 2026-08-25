"use strict";

const axios = require("axios");
const cheerio = require("cheerio");
const AppError = require("../../utils/AppError");

const DEFAULT_EXTERNAL_MATCH_URL = "https://top11.tech/Support/addMatch";
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 20_000;

let cache = { expiresAt: 0, matches: null };

const clean = (value) => String(value ?? "").trim();

const parseExternalMatches = (html) => {
  const source = typeof html === "string" ? html : "";
  const matchesById = new Map();

  // The provider wraps table rows in forms, which is invalid HTML. An HTML5
  // parser reparents those rows and leaves each form empty. Isolate only the
  // configured addMatch form fragments first, then let Cheerio parse their
  // named inputs without relying on table positions.
  const formPattern = /<form\b[^>]*\baction\s*=\s*(?:"[^"]*addmatch[^"]*"|'[^']*addmatch[^']*'|[^\s>]*addmatch[^\s>]*)[^>]*>([\s\S]*?)<\/form\s*>/gi;

  for (const formMatch of source.matchAll(formPattern)) {
    const $ = cheerio.load(formMatch[1]);
    const value = (name) => clean($(`input[name="${name}"]`).first().attr("value"));
    const matchId = value("matchID");
    const team1 = value("team1");
    const team2 = value("team2");
    if (!matchId || !team1 || !team2 || matchesById.has(matchId)) continue;

    matchesById.set(matchId, {
      matchId,
      eventId: value("eventID"),
      team1,
      team2,
      type: value("type"),
      startTime: value("date"),
      timeStatus: value("time"),
    });
  }

  return [...matchesById.values()];
};

const cloneMatches = (matches) => matches.map((match) => ({ ...match }));

const fetchExternalMatches = async ({ httpClient = axios, forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cache.matches && cache.expiresAt > now) return cloneMatches(cache.matches);

  const upstreamUrl = process.env.EXTERNAL_MATCH_URL || DEFAULT_EXTERNAL_MATCH_URL;
  try {
    const response = await httpClient.get(upstreamUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      responseType: "text",
      headers: { Accept: "text/html,application/xhtml+xml" },
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const contentType = clean(response.headers?.["content-type"]).toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      const error = new AppError("External match provider returned an unsupported response.", 502);
      error.code = "EXTERNAL_MATCH_CONTENT_TYPE";
      throw error;
    }

    const matches = parseExternalMatches(response.data);
    cache = { matches: cloneMatches(matches), expiresAt: now + CACHE_TTL_MS };
    return matches;
  } catch (error) {
    if (error.isOperational) throw error;
    const timedOut = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
    console.error("[externalMatchService] upstream request failed", {
      code: error.code || "UPSTREAM_ERROR",
      status: error.response?.status,
    });
    const upstreamError = new AppError(
      timedOut ? "External match provider timed out." : "External match provider is unavailable.",
      timedOut ? 504 : 502
    );
    upstreamError.code = timedOut ? "EXTERNAL_MATCH_TIMEOUT" : "EXTERNAL_MATCH_UNAVAILABLE";
    throw upstreamError;
  }
};

const clearExternalMatchCache = () => {
  cache = { expiresAt: 0, matches: null };
};

const toSavedMatchPayload = (match) => ({
  matchId: match.matchId,
  eventId: match.eventId,
  team1: match.team1,
  team2: match.team2,
  type: match.type,
  startTime: match.startTime,
  timeStatus: match.timeStatus,
  source: "external",
  homeTeam: match.team1,
  awayTeam: match.team2,
  commenceTime: match.startTime || undefined,
  sportKey: match.type || "Cricket",
  odds: null,
});

module.exports = {
  DEFAULT_EXTERNAL_MATCH_URL,
  parseExternalMatches,
  fetchExternalMatches,
  clearExternalMatchCache,
  toSavedMatchPayload,
};
