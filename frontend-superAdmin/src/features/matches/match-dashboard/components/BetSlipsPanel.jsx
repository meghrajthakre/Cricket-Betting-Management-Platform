import { Clock3, Trash2, UserRound, X } from "lucide-react";
import Spinner from "../../../../shared/components/Spinner";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const getUser = (bet) => {
  const populated = bet.userId && typeof bet.userId === "object" ? bet.userId : null;
  return {
    id: populated?._id || bet.userId || "—",
    name: populated?.username || populated?.firstName || "Unknown user",
  };
};

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const getNetResult = (bet) => {
  if (bet.status === "won") return Number(bet.profit || 0);
  if (bet.status === "lost") return -Number(bet.loss || 0);
  return null;
};

export function BetSlipPanel({ title, subtitle, bets, loading, error, deletingId, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <section className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 bg-(--color-primary) px-5 py-4 text-white sm:px-6">
          <div>
            <h2 className="text-xl font-extrabold">{title}</h2>
            <p className="mt-1 text-xs text-(--color-text-muted)">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="Close bet slips">
            <X size={19} />
          </button>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {loading && <div className="grid min-h-52 place-items-center"><Spinner size={34} variant="ocean" label="Bet slips loading" /></div>}
          {!loading && error && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm font-semibold text-red-600">{error}</div>}
          {!loading && !error && bets.length === 0 && <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-(--color-border) bg-(--color-bg-main) text-sm text-slate-500">No bet slips found.</div>}

          {!loading && !error && bets.length > 0 && (
            <div className="grid gap-3">
              {bets.map((bet) => {
                const user = getUser(bet);
                const pending = bet.status === "pending";
                const netResult = getNetResult(bet);
                return (
                  <article key={bet._id} className="grid gap-4 rounded-xl border border-(--color-border) bg-white p-4 transition hover:border-(--color-accent) sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-(--color-primary)"><UserRound size={17} /><p className="truncate text-sm font-extrabold">{user.name}</p></div>
                      <p className="mt-1 truncate text-[11px] text-slate-400" title={user.id}>User ID: {user.id}</p>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-(--color-text-dark)">{bet.selectionName || bet.marketId || "Selection"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock3 size={13} />{formatDateTime(bet.createdAt)}</span>
                        <span>Stake: {formatMoney(bet.amount)}</span>
                        <span className="uppercase">{bet.type}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold tabular-nums">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Win +{formatMoney(bet.profit)}</span>
                        <span className="rounded-md bg-red-50 px-2 py-1 text-red-600">Loss -{formatMoney(bet.loss)}</span>
                        {netResult !== null && (
                          <span className={`rounded-md px-2 py-1 ${netResult >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}>
                            Result {netResult >= 0 ? "+" : "-"}{formatMoney(Math.abs(netResult))}
                          </span>
                        )}
                      </div>
                      {bet.visibleSharePercent !== undefined && (
                        <p className="mt-2 text-[11px] font-semibold text-slate-500">
                          My share ({formatMoney(bet.visibleSharePercent)}%): Stake {formatMoney(bet.shareAmount)}, Win +{formatMoney(bet.shareProfit)}, Loss -{formatMoney(bet.shareLoss)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${pending ? "bg-amber-50 text-amber-700" : bet.status === "won" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{bet.status}</span>
                      <button type="button" onClick={() => onDelete(bet)} disabled={deletingId === bet._id} title="Delete bet slip" className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40">
                        {deletingId === bet._id ? <Spinner size={16} variant="light" label="Deleting slip" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function BetSlipsPanel(props) {
  const bets = props.bets.filter(
    (bet) => bet.marketType !== "session" && bet.status === "pending",
  );
  return <BetSlipPanel {...props} bets={bets} title="Pending Bet Slips" subtitle="Pending match market bets placed by users" />;
}
