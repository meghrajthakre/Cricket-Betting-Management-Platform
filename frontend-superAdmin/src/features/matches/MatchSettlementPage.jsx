import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Spinner from "../../shared/components/Spinner";
import { getMatchRunners, getSavedMatches, reverseSavedMatchSettlement, settleSavedMatch } from "./api/matchSettlementApi";

const matchTitle = (match) =>
  [match.homeTeam, match.awayTeam].filter(Boolean).join(" vs ") || "Untitled match";

const requestMessage = (error, fallback) =>
  error.response?.data?.error || error.response?.data?.message || error.message || fallback;

export default function MatchSettlementPage() {
  const [matches, setMatches] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState({});
  const [actions, setActions] = useState({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getSavedMatches(controller.signal)
      .then(setMatches)
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") {
          setError(requestMessage(requestError, "Saved matches load nahi ho paaye."));
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const visibleMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return matches;
    return matches.filter((match) =>
      [match.matchId, match.homeTeam, match.awayTeam, matchTitle(match)]
        .some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [matches, query]);

  const handleSettlement = async (match) => {
    if (match.isDeclared) return;
    const selectedTeam = selectedTeams[match.matchId];
    if (!selectedTeam) return;
    if (!window.confirm(`${matchTitle(match)} ka winner ${selectedTeam} confirm karna hai?`)) return;

    setActions((current) => ({ ...current, [match.matchId]: { loading: true, error: "", success: "" } }));
    try {
      const runners = await getMatchRunners(match.matchId);
      const teamIndex = selectedTeam === match.homeTeam ? 0 : 1;
      const winner = runners.find((runner) =>
        runner.runnerName?.trim().toLowerCase() === selectedTeam.trim().toLowerCase()
      ) || runners[teamIndex];

      if (!winner?.runnerId) throw new Error("Is team ka backend runner available nahi hai.");
      const response = await settleSavedMatch(match.matchId, winner.runnerId);
      const count = Number(response?.data?.settledCount || 0);
      const orphanCount = Number(response?.data?.orphanCancelledCount || 0);
      const profitLoss = Number(response?.data?.profitLoss || 0);
      const money = Math.abs(profitLoss).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const resultLabel = profitLoss > 0
        ? `Profit ₹${money}`
        : profitLoss < 0
          ? `Loss ₹${money}`
          : "P/L ₹0.00";
      setActions((current) => ({
        ...current,
        [match.matchId]: {
          loading: false,
          error: "",
          profitLoss,
          success: `${selectedTeam} won · ${count} bets settled${orphanCount ? ` · ${orphanCount} deleted-user bet cancelled` : ""} · ${resultLabel}`,
        },
      }));
      setMatches((current) => current.map((item) => item.matchId === match.matchId
        ? { ...item, isDeclared: true, wonBy: response.data.winningRunnerName, winningRunnerId: response.data.winningRunnerId, profitLoss }
        : item));
    } catch (requestError) {
      setActions((current) => ({
        ...current,
        [match.matchId]: { loading: false, success: "", error: requestMessage(requestError, "Match settle nahi hua.") },
      }));
    }
  };

  const handleReverse = async (match) => {
    if (!match.isDeclared) return;
    if (!window.confirm(`${matchTitle(match)} ka settlement reverse karna hai? User wallets bhi previous state me restore honge.`)) return;
    setActions((current) => ({ ...current, [match.matchId]: { loading: true, error: "", success: "" } }));
    try {
      const response = await reverseSavedMatchSettlement(match.matchId);
      const count = Number(response?.data?.reversedCount || 0);
      setMatches((current) => current.map((item) => item.matchId === match.matchId
        ? { ...item, isDeclared: false, wonBy: "", winningRunnerId: "", profitLoss: 0 }
        : item));
      setSelectedTeams((current) => ({ ...current, [match.matchId]: "" }));
      setActions((current) => ({
        ...current,
        [match.matchId]: { loading: false, error: "", success: `${count} bets reversed · Match can be settled again`, profitLoss: 0 },
      }));
    } catch (requestError) {
      setActions((current) => ({
        ...current,
        [match.matchId]: { loading: false, success: "", error: requestMessage(requestError, "Settlement reverse nahi hua.") },
      }));
    }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><Spinner size={44} label="Loading matches" /><p className="text-sm text-gray-500">Saved matches loading...</p></div>;
  }

  return (
    <section className="min-h-full text-[#555]">
      <header className="mb-7">
        <h1 className="text-[30px] font-normal">Match Settlement</h1>
        <p className="mt-2 text-sm text-gray-500">Saved match ka winner select karke settle karein.</p>
      </header>

      <div className="border-t-[3px] border-[#e2e5e7] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e1e1e1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-bold">Saved Matches</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search match" className="h-10 w-full border border-[#aaa] pl-9 pr-3 text-sm outline-none focus:border-[#4aabb3]" />
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f3f3f3] text-left">
                <th className="border border-[#ddd] px-3 py-3">Match ID</th>
                <th className="border border-[#ddd] px-3 py-3">Match</th>
                <th className="border border-[#ddd] px-3 py-3">Win</th>
                <th className="border border-[#ddd] px-3 py-3">Action</th>
                <th className="border border-[#ddd] px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {error && <tr><td colSpan={5} className="border border-[#ddd] p-8 text-center text-red-600">{error}</td></tr>}
              {!error && visibleMatches.length === 0 && <tr><td colSpan={5} className="border border-[#ddd] p-8 text-center text-gray-500">Koi saved match nahi mila.</td></tr>}
              {!error && visibleMatches.map((match) => {
                const action = actions[match.matchId] || {};
                const settled = Boolean(match.isDeclared);
                return (
                  <tr key={match._id || match.matchId} className="even:bg-[#fafafa]">
                    <td className="border border-[#ddd] px-3 py-3">
                      <span className="block max-w-28 truncate font-mono text-xs text-gray-500" title={match.matchId}>
                        {match.matchId}
                      </span>
                    </td>
                    <td className="border border-[#ddd] px-3 py-3 font-bold text-[#3271b8]">{matchTitle(match)}</td>
                    <td className="border border-[#ddd] px-3 py-3">
                      <select value={selectedTeams[match.matchId] || ""} disabled={settled || action.loading} onChange={(event) => setSelectedTeams((current) => ({ ...current, [match.matchId]: event.target.value }))} className="h-10 w-full min-w-48 border border-[#aaa] bg-white px-2 outline-none focus:border-[#4aabb3]">
                        <option value="">Win</option>
                        {match.homeTeam && <option value={match.homeTeam}>{match.homeTeam}</option>}
                        {match.awayTeam && <option value={match.awayTeam}>{match.awayTeam}</option>}
                      </select>
                    </td>
                    <td className="border border-[#ddd] px-3 py-3">
                      <button type="button" disabled={(!settled && !selectedTeams[match.matchId]) || action.loading} onClick={() => settled ? handleReverse(match) : handleSettlement(match)} className={`inline-flex min-w-24 items-center justify-center gap-2 rounded-sm px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 ${settled ? "bg-amber-500 hover:bg-amber-600" : "bg-[#4aabb3] hover:bg-[#3c969d]"}`}>
                        {action.loading && <Spinner size={16} variant="neon" label="Settling" />}
                        {action.loading ? (settled ? "Reversing" : "Settling") : settled ? "Reverse" : "Settle"}
                      </button>
                    </td>
                    <td className="border border-[#ddd] px-3 py-3">
                      {action.success && <span className={`font-semibold ${Number(action.profitLoss) > 0 ? "text-emerald-600" : Number(action.profitLoss) < 0 ? "text-red-600" : "text-gray-600"}`}>{action.success}</span>}
                      {action.error && <span className="font-semibold text-red-600">{action.error}</span>}
                      {!action.success && !action.error && (settled
                        ? <span className="font-semibold text-emerald-600">{match.wonBy || "Winner"} won · Settled</span>
                        : <span className="text-gray-400">Pending</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
