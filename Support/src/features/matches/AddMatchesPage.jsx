import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, Plus, RefreshCw, Trophy } from "lucide-react";
import apiClient from "../../shared/api/apiClient";
import { addExternalMatch, fetchExternalAndSavedMatches } from "./externalMatchApi";

const formatStartTime = (value) => {
  if (!value) return "Start time unavailable";

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading matches">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-(--color-border) bg-white p-5 shadow-sm">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="mt-6 h-6 w-4/5 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-3/5 rounded bg-slate-100" />
          <div className="mt-6 h-10 rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function ExternalMatchCard({ match, saved, saving, onSave }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-[0_8px_24px_rgba(30,58,95,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(30,58,95,0.14)]">
      <div className="bg-(--color-primary) px-5 py-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
            {match.type || "Cricket"}
          </span>
          <span className="text-xs font-medium text-white/70">#{match.matchId}</span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-center gap-3 text-center">
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-(--color-primary)">{match.team1}</h2>
          <span className="shrink-0 rounded-full bg-(--color-bg-main) px-2.5 py-1 text-xs font-black text-(--color-banner)">VS</span>
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-(--color-primary)">{match.team2}</h2>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl bg-(--color-bg-main) px-3 py-3 text-sm text-slate-600">
          <CalendarDays size={17} className="shrink-0 text-(--color-banner)" />
          <span>{formatStartTime(match.startTime)}</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Event ID: {match.eventId || "—"}</span>
          <span>Status: {match.timeStatus || "—"}</span>
        </div>

        <button
          type="button"
          onClick={() => onSave(match.matchId)}
          disabled={saved || saving}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-banner) px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5a84c7] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saved ? <Check size={17} /> : saving ? <RefreshCw size={17} className="animate-spin" /> : <Plus size={17} />}
          {saved ? "Added" : saving ? "Adding..." : "Add Match"}
        </button>
      </div>
    </article>
  );
}

export default function AddMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMatchIds, setSavedMatchIds] = useState(() => new Set());
  const [savingMatchId, setSavingMatchId] = useState("");
  const [saveError, setSaveError] = useState("");

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await fetchExternalAndSavedMatches(apiClient);
      setMatches(result.matches);
      setSavedMatchIds(result.savedMatchIds);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to fetch available matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMatch = async (matchId) => {
    if (savingMatchId || savedMatchIds.has(matchId)) return;
    setSavingMatchId(matchId);
    setSaveError("");

    try {
      await addExternalMatch(matchId, apiClient);
      setSavedMatchIds((current) => new Set([...current, matchId]));
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setSavedMatchIds((current) => new Set([...current, matchId]));
      } else {
        setSaveError(requestError.response?.data?.message || requestError.message || "Failed to add match.");
      }
    } finally {
      setSavingMatchId("");
    }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(fetchMatches, 0);
    return () => window.clearTimeout(initialLoad);
  }, [fetchMatches]);

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-banner)">External feed</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-(--color-primary) sm:text-3xl">Add Matches</h1>
          <p className="mt-2 text-sm text-slate-500">Available cricket matches from the configured provider.</p>
        </div>

        <button
          type="button"
          onClick={fetchMatches}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-(--color-primary) px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-(--color-primary-light) disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {loading && <LoadingCards />}

      {!loading && error && (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <div>
            <p className="font-bold text-red-700">Failed to load available matches</p>
            <p className="mt-1 text-sm text-red-500">{error}</p>
            <button type="button" onClick={fetchMatches} className="mt-4 rounded-xl bg-(--color-primary) px-5 py-2.5 text-sm font-bold text-white">Try again</button>
          </div>
        </div>
      )}

      {!loading && !error && saveError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {saveError}
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-(--color-border) bg-white p-6 text-center">
          <div>
            <Trophy size={36} className="mx-auto text-(--color-accent)" />
            <p className="mt-3 font-bold text-(--color-primary)">No matches available</p>
            <p className="mt-1 text-sm text-slate-400">The external provider returned no valid matches.</p>
          </div>
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <ExternalMatchCard
              key={match.matchId}
              match={match}
              saved={savedMatchIds.has(match.matchId)}
              saving={savingMatchId === match.matchId}
              onSave={saveMatch}
            />
          ))}
        </div>
      )}
    </main>
  );
}
