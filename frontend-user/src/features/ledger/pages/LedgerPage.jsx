import { useEffect, useState } from "react";
import { getLedgerMatchBets, getUserLedger, getWalletBalance } from "../../../shared/api/userService";
import { useAuthStore } from "../../../store/authStore";
import { useCoinStore } from "../../../store/coinStore";
import MatchBetDetails from "../MatchBetDetails";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entryLabel = (entry) => entry.reason || entry.transactionCode || "Ledger entry";

export default function LedgerPage() {
  const user = useAuthStore((state) => state.user);
  const coins = useCoinStore((state) => state.coins);
  const setCoins = useCoinStore((state) => state.setCoins);
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      getUserLedger(page, 20),
      user?._id ? getWalletBalance(user._id) : Promise.resolve(null),
    ]).then(([ledgerResponse, walletResponse]) => {
      if (!active) return;
      setEntries(ledgerResponse?.data?.entries || []);
      setMeta(ledgerResponse?.meta || { page, totalPages: 1 });
      const balance = Number(walletResponse?.data?.data?.balance);
      if (Number.isFinite(balance)) setCoins(balance);
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.data?.message || "Ledger could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, setCoins, user?._id]);

  const changePage = (nextPage) => {
    setLoading(true);
    setError("");
    setPage(nextPage);
  };

  const openMatchBets = async (entry) => {
    if (!entry.canViewBets || !entry.matchId) return;
    setSelectedMatch({ match: { matchName: entry.matchName, wonBy: entry.wonBy }, bets: [] });
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const response = await getLedgerMatchBets(entry.matchId);
      setSelectedMatch(response?.data || null);
    } catch (requestError) {
      setDetailsError(requestError?.response?.data?.message || "Match bets could not be loaded.");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#e8edf3] px-3 py-4 text-[#142c4d] sm:px-5">
      <section className="mx-auto max-w-5xl overflow-hidden border border-[#c7d1df] bg-white shadow-sm">
        <header className="bg-[#29466f] px-4 py-3 text-white">
          <p className="text-base font-bold">{user?.username?.toUpperCase() || "USER"} {user?.firstName ? `(${user.firstName})` : ""}</p>
          <p className="mt-1 text-sm font-semibold text-[#ffd45c]">Coins: {money(coins)}</p>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-[#496aa3] text-xs uppercase text-white">
              <tr>
                <th className="border-r border-white/40 px-4 py-4 text-left">Date</th>
                <th className="border-r border-white/40 px-4 py-4 text-left">Entry</th>
                <th className="border-r border-white/40 px-4 py-4 text-right">Debit</th>
                <th className="border-r border-white/40 px-4 py-4 text-right">Credit</th>
                <th className="px-4 py-4 text-right">Coins</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">Loading ledger...</td></tr>
              ) : error ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center font-semibold text-red-600">{error}</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-12 text-center text-slate-500">No ledger entries yet.</td></tr>
              ) : entries.map((entry) => (
                <tr key={entry._id} className="border-b border-[#d8dee8] even:bg-slate-50">
                  <td className="px-4 py-4">{new Date(entry.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                  <td className="max-w-xs px-4 py-4 font-medium" title={entry.matchName || entryLabel(entry)}>
                    {entry.canViewBets ? (
                      <button type="button" onClick={() => openMatchBets(entry)} className="max-w-full cursor-pointer truncate text-left font-semibold text-[#2860a8] underline-offset-2 hover:underline">
                        {entry.matchName || entryLabel(entry)}
                      </button>
                    ) : (
                      <span className="block truncate text-slate-700">{entryLabel(entry)}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold">{money(entry.debitAmount ?? (entry.type === "debit" ? entry.amount : 0))}</td>
                  <td className="px-4 py-4 text-right font-semibold">{money(entry.creditAmount ?? (entry.type === "credit" ? entry.amount : 0))}</td>
                  <td className="px-4 py-4 text-right font-bold">{money(entry.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Number(meta.totalPages || 1) > 1 && (
          <footer className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button type="button" disabled={!meta.hasPrevPage || loading} onClick={() => changePage(page - 1)} className="border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
            <span className="text-sm font-semibold">Page {meta.page} of {meta.totalPages}</span>
            <button type="button" disabled={!meta.hasNextPage || loading} onClick={() => changePage(page + 1)} className="border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
          </footer>
        )}
      </section>
      {selectedMatch && (
        <MatchBetDetails
          details={selectedMatch}
          loading={detailsLoading}
          error={detailsError}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </main>
  );
}
