import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../shared/api/apiClient";

const formatSport = (value) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Cricket";

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-IN", { month: "short" });
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}-${month} ${hours}:${minutes}`;
};

const isUpcoming = (value) => Boolean(value && new Date(value) > new Date());

function MatchCard({ match }) {
  const navigate = useNavigate();
  const upcoming = isUpcoming(match.commenceTime);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-(--color-primary) to-(--color-primary-light) px-4 py-6 text-white shadow-[0_10px_28px_rgba(30,58,95,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(30,58,95,0.24)] sm:px-8 sm:py-7">
      <span className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-white/[0.04]" />
      <span className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-(--color-banner)/15" />

      <div className="text-center">
        <div className="relative mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-semibold text-(--color-text-muted) backdrop-blur-sm sm:text-sm">
          <span>{formatDate(match.commenceTime)}</span>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${upcoming ? "bg-amber-300" : "animate-pulse bg-emerald-300"}`} />
        </div>

        <h2 className="relative mx-auto mt-3 max-w-3xl text-base font-bold leading-6 tracking-tight sm:text-xl">
          {match.homeTeam || "TBA"} <span className="px-2 text-sm font-medium text-(--color-accent)">VS</span> {match.awayTeam || "TBA"}
        </h2>

        <p className="relative mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-(--color-accent)">
          {formatSport(match.sportKey)} · {upcoming ? "Upcoming" : "Live"}
        </p>
      </div>

      <div className="relative mx-auto mt-7 grid max-w-3xl grid-cols-3 gap-3 sm:gap-8">
        <button type="button" onClick={() => navigate(`/support/matches/${match.matchId}/play`)} className="cursor-pointer rounded-xl border border-white/10 bg-(--color-banner) px-2 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#5a84c7] hover:shadow-lg active:translate-y-0 sm:py-3.5 sm:text-sm">
          Play
        </button>
        <button type="button" onClick={() => navigate(`/support/matches/${match.matchId}/score`)} className="cursor-pointer rounded-xl border border-white/10 bg-(--color-banner) px-2 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#5a84c7] hover:shadow-lg active:translate-y-0 sm:py-3.5 sm:text-sm">
          Score
        </button>
        <button type="button" onClick={() => navigate(`/support/matches/${match.matchId}/manual`)} className="cursor-pointer rounded-xl border border-white/10 bg-(--color-banner) px-2 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#5a84c7] hover:shadow-lg active:translate-y-0 sm:py-3.5 sm:text-sm">
          Session
        </button>
      </div>
    </article>
  );
}

export default function SupportMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchMatches = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/matches/saved");
      setMatches(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to fetch matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchMatches, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchMatches]);

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-(--color-banner)">
            <Radio size={15} /> Live control
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-(--color-primary) sm:text-3xl">In Play Matches</h1>
          <p className="mt-1 text-sm text-slate-500">Select a match to manage play, score or manual controls.</p>
        </div>

        <button type="button" onClick={() => fetchMatches(true)} disabled={refreshing || loading} className="inline-flex self-start items-center gap-2 rounded-xl border border-(--color-border) bg-white px-4 py-2.5 text-sm font-bold text-(--color-primary) shadow-sm transition hover:border-(--color-accent) hover:bg-(--color-bg-main) disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {loading && (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-(--color-border) bg-white">
          <div className="text-center"><RefreshCw size={30} className="mx-auto animate-spin text-(--color-banner)" /><p className="mt-3 text-sm text-slate-400">Loading matches...</p></div>
        </div>
      )}

      {!loading && error && (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div><p className="font-bold text-red-700">Failed to load matches</p><p className="mt-1 text-sm text-red-500">{error}</p><button type="button" onClick={() => fetchMatches(true)} className="mt-4 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white">Try again</button></div>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-(--color-border) bg-white p-6 text-center">
          <div><Trophy size={36} className="mx-auto text-(--color-accent)" /><p className="mt-3 font-bold text-(--color-primary)">No saved matches found</p><p className="mt-1 text-sm text-slate-400">Add a match to start managing it.</p><button type="button" onClick={() => navigate("/support/matches/add")} className="mt-4 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white">Add match</button></div>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {matches.map((match) => <MatchCard key={match.matchId} match={match} />)}
        </div>
      )}
    </main>
  );
}
