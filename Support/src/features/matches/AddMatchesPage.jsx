import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Check, LoaderCircle, Plus, RefreshCw, Trophy } from "lucide-react";
import apiClient from "../../shared/api/apiClient";
import { addExternalMatch, fetchExternalAndSavedMatches } from "./externalMatchApi";

const formatStartTime = (value) => {
  if (!value) return "Start time unavailable";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function LoadingCards() {
  return <div aria-live="polite" aria-busy="true">
    <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600"><LoaderCircle size={18} className="animate-spin" /> Loading matches...</div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) =>
      <div key={index} className="animate-pulse rounded-md border border-slate-200 bg-white p-4">
        <div className="h-4 w-20 rounded bg-slate-200" /><div className="mt-4 h-5 w-4/5 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" /><div className="mt-4 h-10 rounded bg-slate-200" />
      </div>)}</div>
  </div>;
}

function ExternalMatchCard({ match, saved, saving, onSave }) {
  const isLive = String(match.timeStatus || "").toLowerCase() === "live";
  return <article className="rounded-md border border-slate-300 bg-white p-4">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase text-slate-500">{match.type || "Cricket"}</span>
      <span className={`text-xs font-semibold ${isLive ? "text-red-600" : "text-emerald-600"}`}>{match.timeStatus || "Upcoming"}</span>
    </div>
    <h2 className="mt-3 text-base font-bold text-(--color-primary)">{match.team1} <span className="px-1 font-normal text-slate-400">vs</span> {match.team2}</h2>
    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><CalendarDays size={16} /><span>{formatStartTime(match.startTime)}</span></div>
    <button type="button" onClick={() => onSave(match.matchId)} disabled={saved || saving}
      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold ${saved ? "bg-slate-100 text-emerald-700" : "bg-(--color-primary) text-white hover:bg-(--color-primary-light)"} disabled:cursor-not-allowed`}>
      {saved ? <Check size={16} /> : saving ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
      {saved ? "Added" : saving ? "Adding..." : "Add Match"}
    </button>
  </article>;
}

export default function AddMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedMatchIds, setSavedMatchIds] = useState(() => new Set());
  const [savingMatchId, setSavingMatchId] = useState("");
  const [saveError, setSaveError] = useState("");

  const fetchMatches = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await fetchExternalAndSavedMatches(apiClient);
      setMatches(result.matches); setSavedMatchIds(result.savedMatchIds);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Failed to fetch available matches.");
    } finally { setLoading(false); }
  }, []);

  const saveMatch = async (matchId) => {
    if (savingMatchId || savedMatchIds.has(matchId)) return;
    setSavingMatchId(matchId); setSaveError("");
    try {
      await addExternalMatch(matchId, apiClient);
      setSavedMatchIds((current) => new Set([...current, matchId]));
    } catch (requestError) {
      if (requestError.response?.status === 409) setSavedMatchIds((current) => new Set([...current, matchId]));
      else setSaveError(requestError.response?.data?.message || requestError.message || "Failed to add match.");
    } finally { setSavingMatchId(""); }
  };

  useEffect(() => { const timer = window.setTimeout(fetchMatches, 0); return () => window.clearTimeout(timer); }, [fetchMatches]);

  return <main className="mx-auto min-h-[calc(100vh-64px)] max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
    <header className="mb-6 flex items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-(--color-primary)">Add Matches</h1><p className="mt-1 text-sm text-slate-500">Available cricket matches</p></div>
      <button type="button" onClick={fetchMatches} disabled={loading} className="inline-flex items-center gap-2 rounded-md bg-(--color-primary) px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh</button>
    </header>
    {loading && <LoadingCards />}
    {!loading && error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {!loading && !error && saveError && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</div>}
    {!loading && !error && matches.length === 0 && <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-slate-300 bg-white p-6 text-center"><div><Trophy size={32} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold">No matches available</p></div></div>}
    {!loading && !error && matches.length > 0 && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{matches.map((match) => <ExternalMatchCard key={match.matchId} match={match} saved={savedMatchIds.has(match.matchId)} saving={savingMatchId === match.matchId} onSave={saveMatch} />)}</div>}
  </main>;
}
