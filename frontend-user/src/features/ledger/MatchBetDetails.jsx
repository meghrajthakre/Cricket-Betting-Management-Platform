import { X } from "lucide-react";

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function MatchBetDetails({ details, loading, error, onClose }) {
  const bets = details?.bets || [];

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-[#07182a]/70 sm:items-center sm:px-4" role="dialog" aria-modal="true" aria-label="Match bet details">
      <section className="max-h-[92dvh] w-full max-w-3xl overflow-hidden border border-[#9eacc0] bg-white shadow-2xl sm:rounded-lg">
        <header className="flex items-start justify-between gap-3 bg-[#29466f] px-4 py-3 text-white">
          <div className="min-w-0">
            <h2 className="break-words text-base font-bold">{details?.match?.matchName || "Match Bets"}</h2>
            {details?.match?.wonBy && <p className="mt-1 text-xs text-[#ffd45c]">Winner: {details.match.wonBy}</p>}
          </div>
          <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded border border-white/40 hover:bg-white/10" title="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="max-h-[calc(92dvh-68px)] overflow-auto">
          {loading ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">Loading bets...</p>
          ) : error ? (
            <p className="px-4 py-12 text-center text-sm font-semibold text-red-600">{error}</p>
          ) : bets.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">No settled bets found.</p>
          ) : (
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead className="sticky top-0 bg-[#496aa3] text-xs uppercase text-white">
                <tr>
                  <th className="px-3 py-3 text-left">Market</th><th className="px-3 py-3 text-left">Bet</th>
                  <th className="px-3 py-3 text-right">Stake</th><th className="px-3 py-3 text-right">Rate</th>
                  <th className="px-3 py-3 text-center">Result</th><th className="px-3 py-3 text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet) => (
                  <tr key={bet._id} className="border-b border-slate-200 even:bg-slate-50">
                    <td className="px-3 py-3"><span className="font-semibold text-slate-900">{bet.marketName}</span><span className="block text-xs capitalize text-slate-500">{bet.marketType}</span></td>
                    <td className="px-3 py-3 font-bold">{bet.type === "yes" ? "LAGAI" : "KHAI"}</td>
                    <td className="px-3 py-3 text-right">{money(bet.amount)}</td>
                    <td className="px-3 py-3 text-right">{bet.marketType === "session" ? (bet.sessionRun ?? bet.rate) : bet.rate}</td>
                    <td className="px-3 py-3 text-center font-bold"><span className={bet.status === "won" ? "text-emerald-700" : "text-red-600"}>{bet.status.toUpperCase()}</span>{bet.marketType === "session" && bet.resultRun != null && <span className="block text-xs font-normal text-slate-500">Run: {bet.resultRun}</span>}</td>
                    <td className={`px-3 py-3 text-right font-bold ${bet.profitLoss >= 0 ? "text-emerald-700" : "text-red-600"}`}>{bet.profitLoss > 0 ? "+" : ""}{money(bet.profitLoss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
