import { Check, Plus, Radio, RefreshCw, Search, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Spinner from "../../shared/components/Spinner";
import api from "../../shared/api/apiClient";

const formatMatch = (match) => ({
  id: match.matchId,
  matchId: match.matchId,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  sport: match.sportKey || "Cricket",
  commenceTime: match.commenceTime,
  dateTime: match.commenceTime
    ? new Date(match.commenceTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—",
  sportKey: match.sportKey,
  odds: match.odds || null,
});

export default function InPlayMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadMatches = async () => {
      setLoading(true);
      setError("");
      try {
        const [liveResponse, savedResponse] = await Promise.all([
          api.get("/matches", { signal: controller.signal }),
          api.get("/matches/saved", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        const liveMatches = Array.isArray(liveResponse.data?.data) ? liveResponse.data.data : [];
        const savedMatches = Array.isArray(savedResponse.data?.data) ? savedResponse.data.data : [];
        setMatches(liveMatches.map(formatMatch));
        setSavedIds(new Set(savedMatches.map((match) => match.matchId)));
      } catch (requestError) {
        if (requestError.code === "ERR_CANCELED" || controller.signal.aborted) return;
        setError(requestError.response?.data?.message || requestError.message || "In-play matches could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadMatches();
    return () => controller.abort();
  }, [refreshKey]);

  const visibleMatches = useMemo(() => matches.filter((match) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${match.homeTeam} ${match.awayTeam} ${match.sport}`.toLowerCase().includes(query);
    const saved = savedIds.has(match.id);
    const matchesFilter = filter === "all" || (filter === "saved" && saved) || (filter === "available" && !saved);
    return matchesSearch && matchesFilter;
  }), [filter, matches, savedIds, search]);

  const savedCount = matches.filter((match) => savedIds.has(match.id)).length;

  const saveMatch = async (match) => {
    if (savedIds.has(match.id) || busyId) return;
    setBusyId(match.id);
    try {
      await api.post("/matches/save", {
        matchId: match.matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        commenceTime: match.commenceTime,
        sportKey: match.sportKey,
        odds: match.odds,
      });
      setSavedIds((current) => new Set([...current, match.id]));
      toast.success(`${match.homeTeam} vs ${match.awayTeam} added`);
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        setSavedIds((current) => new Set([...current, match.id]));
        toast("Match is already saved", { icon: "⚠️" });
      } else {
        toast.error(requestError.response?.data?.message || "Could not save match.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const removeMatch = async (match) => {
    if (!savedIds.has(match.id) || busyId) return;
    setBusyId(match.id);
    try {
      await api.delete(`/matches/${encodeURIComponent(match.id)}`);
      setSavedIds((current) => {
        const next = new Set(current);
        next.delete(match.id);
        return next;
      });
      toast.success("Match removed from saved matches");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Could not remove match.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-full bg-(--color-bg-main) p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-(--color-primary) px-5 py-5 text-white shadow-sm sm:px-7 sm:py-6">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10"><Radio size={22} /></div><div><h1 className="text-xl font-bold sm:text-2xl">In-Play Matches</h1><p className="mt-1 text-sm text-(--color-text-muted)">Review live cricket matches and add them to your book.</p></div></div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md"><div className="rounded-2xl border border-(--color-border) bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-(--color-primary)"><Trophy size={19} /></div><div><p className="text-xs font-semibold text-gray-400">Live matches</p><p className="text-lg font-bold text-(--color-text-dark)">{matches.length}</p></div></div></div><div className="rounded-2xl border border-(--color-border) bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Check size={19} /></div><div><p className="text-xs font-semibold text-gray-400">Added</p><p className="text-lg font-bold text-(--color-text-dark)">{savedCount}</p></div></div></div></div>

        <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-(--color-border) p-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div className="relative w-full lg:max-w-sm"><Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search teams or tournament..." className="w-full rounded-xl border border-(--color-border) bg-slate-50 py-2.5 pr-9 pl-10 text-sm outline-none focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100" />{search && <button type="button" onClick={() => setSearch("")} className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center text-gray-400"><X size={15} /></button>}</div>
            <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-slate-100 p-1">{[["all", "All"], ["available", "Available"], ["saved", "Added"]].map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${filter === value ? "bg-white text-(--color-primary) shadow-sm" : "text-gray-500"}`}>{label}</button>)}</div><button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} className="flex items-center gap-2 rounded-xl border border-(--color-border) px-3 py-2 text-xs font-bold text-(--color-primary) disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button></div>
          </div>

          {error ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-sm font-semibold text-red-500">{error}</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="rounded-xl bg-(--color-btn-bg) px-4 py-2 text-sm font-bold text-white">Try Again</button></div> : loading ? <div className="flex min-h-72 items-center justify-center"><span className="flex items-center gap-3 text-sm text-gray-400"><Spinner size={30} variant="ocean" />Loading in-play matches...</span></div> : visibleMatches.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center text-center"><p className="text-sm font-semibold text-gray-500">No matching in-play matches</p><p className="mt-1 text-xs text-gray-400">Try another search or filter.</p></div> : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{visibleMatches.map((match) => {
            const saved = savedIds.has(match.id);
            const busy = busyId === match.id;
            return <article key={match.id} className="flex flex-col rounded-2xl border border-(--color-border) bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"><div className="mb-3 flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />IN PLAY</span><span className="max-w-[55%] truncate rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-(--color-primary)" title={match.sport}>{match.sport}</span></div><div className="flex-1"><p className="text-sm font-bold leading-6 text-(--color-text-dark)">{match.homeTeam}</p><p className="my-1 text-xs font-bold text-gray-300">VS</p><p className="text-sm font-bold leading-6 text-(--color-text-dark)">{match.awayTeam}</p><p className="mt-3 text-xs text-gray-400">{match.dateTime}</p></div><div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">{saved ? <><div className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700"><Check size={15} />Added</div><button type="button" onClick={() => removeMatch(match)} disabled={busy} className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50" aria-label="Remove match" title="Remove match">{busy ? <Spinner size={15} variant="ocean" /> : <Trash2 size={16} />}</button></> : <button type="button" onClick={() => saveMatch(match)} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-4 py-2.5 text-xs font-bold text-white hover:bg-(--color-btn-hover) disabled:opacity-50">{busy ? <Spinner size={15} variant="neon" /> : <Plus size={16} />}{busy ? "Adding..." : "Add Match"}</button>}</div></article>;
          })}</div>}
        </section>
      </div>
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "13px", fontWeight: "600" } }} />
    </div>
  );
}
