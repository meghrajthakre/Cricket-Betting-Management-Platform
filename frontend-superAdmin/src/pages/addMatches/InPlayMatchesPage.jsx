import { useState, useEffect } from "react";
import Spinner from "../../components/common/Spinner";
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";

const STORAGE_KEY = "savedMatchIds";

// ─── LocalStorage helpers ─────────────────────────────────────────────────
const getSavedIds = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
};

const persistSavedIds = (set) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
};

export default function InPlayMatchesPage() {
  const [matches, setMatches]     = useState([]);
  const [savedIds, setSavedIds]   = useState(getSavedIds); // initialise from localStorage
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [saving, setSaving]       = useState(null);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  // Keep localStorage in sync whenever savedIds changes
  useEffect(() => {
    persistSavedIds(savedIds);
  }, [savedIds]);

  // ─── Fetch matches ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch(`${API_BASE}/api/matches`, {
          credentials: "include",
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.message || "Failed to fetch matches.");

        const normalised = json.data.map((m) => ({
          id:           m.matchId,
          matchId:      m.matchId,
          homeTeam:     m.homeTeam,
          awayTeam:     m.awayTeam,
          sport:        m.sportKey ?? "Cricket",
          dateTime:     m.commenceTime
            ? new Date(m.commenceTime).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            : "—",
          commenceTime: m.commenceTime,
          sportKey:     m.sportKey,
          odds:         m.odds ?? null,
        }));

        setMatches(normalised);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      
    };

    fetchMatches();
  }, []);

  // ─── Save match ─────────────────────────────────────────────────────────
  const handleAdd = async (id) => {
    if (savedIds.has(id)) return; // already saved — button is just decorative
    const m = matches.find((x) => x.id === id);
    if (!m) return;

    setSaving(id);
    try {
      const res = await fetch(`${API_BASE}/api/matches/save`, {
        method:      "POST",
        credentials: "include",
        headers:     {
          "Content-Type": "application/json",
          ...(sessionStorage.getItem("accessToken") && {
            Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
          }),
        },
        body: JSON.stringify({
          matchId:      m.matchId,
          homeTeam:     m.homeTeam,
          awayTeam:     m.awayTeam,
          commenceTime: m.commenceTime,
          sportKey:     m.sportKey,
          odds:         m.odds,
        }),
      });

      const json = await res.json();

      if (res.status === 409) {
        // Backend says already saved — mark it so the UI is consistent
        setSavedIds((prev) => new Set([...prev, id]));
        showToast("Already saved.", "warning");
        return;
      }
      if (!res.ok) throw new Error(json.message || "Could not save match.");

      setSavedIds((prev) => new Set([...prev, id]));
      showToast(`Saved: ${m.homeTeam} vs ${m.awayTeam}`);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(null);
    }
  };

  // ─── Delete saved match ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/matches/${id}`, {
        method:      "DELETE",
        credentials: "include",
        headers: sessionStorage.getItem("accessToken")
          ? { Authorization: `Bearer ${sessionStorage.getItem("accessToken")}` }
          : {},
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not delete match.");

      setMatches((p) => p.filter((m) => m.id !== id));
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast("Removed from list.", "error");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen  ">
      <div className="max-w-5xl mx-auto">

        <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-5">
          In Play Matches
        </h1>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">

              {/* Head */}
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Match
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Sport
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell whitespace-nowrap">
                    Date / Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Action
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody>
                {/* Loading skeleton */}
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded-md" style={{ width: ["75%","40%","60%","30%","20%"][j] }} />
                        </td>
                      ))}
                    </tr>
                  ))}

                {/* Empty */}
                {!loading && matches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                      No matches available.
                    </td>
                  </tr>
                )}

                {/* Rows */}
                {!loading &&
                  matches.map((m) => {
                    const isSaved = savedIds.has(m.id);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        {/* Match title */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-medium text-gray-900">{m.homeTeam}</span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                              vs
                            </span>
                            <span className="font-medium text-gray-900">{m.awayTeam}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 sm:hidden">
                            <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium">
                              {m.sport}
                            </span>
                            <span className="text-xs text-gray-400">{m.dateTime}</span>
                          </div>
                        </td>

                        {/* Sport badge */}
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                            {m.sport}
                          </span>
                        </td>

                        {/* Date/time */}
                        <td className="px-4 py-4 text-gray-500 whitespace-nowrap tabular-nums text-xs hidden md:table-cell">
                          {m.dateTime}
                        </td>

                        {/* Add / Added button */}
                        <td className="px-4 py-4">
                          {isSaved ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-lg min-w-[72px] justify-center select-none">
                              {/* Checkmark icon */}
                              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="2,8 6,12 14,4"/>
                              </svg>
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAdd(m.id)}
                              disabled={saving === m.id}
                              className="inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-lg bg-teal-500 px-4 py-1.5 text-center text-xs font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-wait disabled:bg-teal-300"
                            >
                              {saving === m.id && (
                                <Spinner size={13} variant="neon" label="Match saving" />
                              )}
                              {saving === m.id ? "Saving…" : "Add"}
                            </button>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="flex items-center gap-1 text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2,4 14,4"/>
                              <path d="M5,4V3a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1V4"/>
                              <path d="M12,4l-1,9H5L4,4"/>
                            </svg>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-lg text-white transition-all
            ${toast.type === "error"   ? "bg-red-500"   : ""}
            ${toast.type === "warning" ? "bg-amber-500" : ""}
            ${toast.type === "success" ? "bg-teal-500"  : ""}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
