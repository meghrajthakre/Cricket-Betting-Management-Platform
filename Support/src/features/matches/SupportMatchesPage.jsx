import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../shared/api/apiClient";

const COLOR = "#1E3A5F";
const COLOR_LIGHT = "#D6E4F5";

// ── helpers ──────────────────────────────────────────────────────────────────
// Kept for the match card date presentation work in progress.
// eslint-disable-next-line no-unused-vars
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// eslint-disable-next-line no-unused-vars
const formatTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "—";

const formatSport = (key) =>
  key ? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—";

const isUpcoming = (iso) => iso && new Date(iso) > new Date();

// ── Navbar ────────────────────────────────────────────────────────────────────
// ── Page Component ──────────────────────────────────────────────────────────
export default function SupportMatches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchMatches = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data } = await apiClient.get("/matches/saved");
      setMatches(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchMatches, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchMatches]);

  const handleRefresh = () => fetchMatches(true);

  return (
    <div className="min-h-screen bg-(--color-bg-main)">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-center sm:text-left"
            style={{ color: COLOR }}
          >
            IN PLAY MATCHES
          </h1>

          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed self-center sm:self-auto"
            style={{ background: COLOR_LIGHT, color: COLOR }}
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 border-4 rounded-full animate-spin"
              style={{ borderColor: `${COLOR}22`, borderTopColor: COLOR }}
            />
            <p className="text-sm text-gray-400">Loading matches...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center gap-4 py-12 sm:py-16">
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-6 py-4 text-sm text-center max-w-md">
              <p className="font-medium mb-1">Failed to load matches</p>
              <p className="text-red-400 break-words">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="text-sm font-medium px-5 py-2 rounded-lg border transition-all duration-200 hover:opacity-80"
              style={{ color: COLOR, borderColor: COLOR }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">No saved matches found.</p>
            <button
              onClick={() => navigate("/support/matches/add")}
              className="mt-2 text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200"
              style={{ background: COLOR, color: "white" }}
            >
              + Add Your First Match
            </button>
          </div>
        )}

        {/* Matches Grid */}
        {!loading && !error && matches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {matches.map((match) => (
              <MatchCard key={match.matchId} match={match} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── New Match Card (Play, SCORE, SESSION style) ─────────────────────────────
function MatchCard({ match }) {
  const navigate = useNavigate();
  const upcoming = isUpcoming(match.commenceTime);

  const formatMatchDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${d.getDate()}-${d.toLocaleString("en-IN", { month: "short" })} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden
                    hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col">

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "#32759A" }}>
        <span className="text-white/85 text-xs font-medium tracking-wide uppercase">
          {formatSport(match.sportKey)}
        </span>
        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
          style={upcoming
            ? { background: "#fef9c3", color: "#92400e" }
            : { background: "#bbf7d0", color: "#065f46" }}>
          {upcoming ? "UPCOMING" : "LIVE"}
        </span>
      </div>

      {/* Teams */}
      <div className="px-4 py-3" style={{ background: "#eef6fa" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400 mb-0.5">Home</p>
            <p className="text-sm font-medium truncate" style={{ color: "#32759A" }}>
              {match.homeTeam || "—"}
            </p>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200
                          flex items-center justify-center text-[11px] font-medium text-gray-400">
            VS
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[11px] text-gray-400 mb-0.5">Away</p>
            <p className="text-sm font-medium truncate" style={{ color: "#32759A" }}>
              {match.awayTeam || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Date/Time row */}
      <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-gray-400
                      border-b border-gray-100">
        <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "#32759A" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium text-gray-600">{formatMatchDateTime(match.commenceTime)}</span>

        {match.odds && (
          <>
            <span className="text-gray-200 mx-1">|</span>
            <svg className="w-3.5 h-3.5 shrink-0" style={{ color: "#32759A" }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>
              <span className="font-semibold text-gray-700">{match.odds.minRate}</span>
              <span className="text-gray-300 mx-1">–</span>
              <span className="font-semibold text-gray-700">{match.odds.maxRate}</span>
            </span>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 p-3">

        {/* Play — fills to brand blue */}
        <button
          onClick={() => navigate(`/support/matches/${match.matchId}/play`)}
          className="group cursor-pointer flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium
                     border transition-all duration-200
                     hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-none"
          style={{
            background: "#eef6fa", color: "#32759A",
            borderColor: "#b5d9ec",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#32759A";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "#32759A";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#eef6fa";
            e.currentTarget.style.color = "#32759A";
            e.currentTarget.style.borderColor = "#b5d9ec";
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </button>

        {/* Score — fills to deeper blue */}
        <button
          onClick={() => navigate(`/support/matches/${match.matchId}/score`)}
          className="group cursor-pointer flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium
                     border transition-all duration-200
                     hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-none"
          style={{
            background: "#eef6fa", color: "#32759A",
            borderColor: "#b5d9ec",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#185FA5";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "#185FA5";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#eef6fa";
            e.currentTarget.style.color = "#32759A";
            e.currentTarget.style.borderColor = "#b5d9ec";
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Score
        </button>

        {/* Session — fills to teal */}
        <button
          onClick={() => navigate(`/support/matches/${match.matchId}/session`)}
          className="group cursor-pointer flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium
                     border transition-all duration-200
                     hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-none"
          style={{
            background: "#eef6fa", color: "#32759A",
            borderColor: "#b5d9ec",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#0F6E56";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.borderColor = "#0F6E56";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "#eef6fa";
            e.currentTarget.style.color = "#32759A";
            e.currentTarget.style.borderColor = "#b5d9ec";
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h8" />
          </svg>
          Session
        </button>

      </div>
    </div>
  );
}
