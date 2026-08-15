import { AlertTriangle, ArrowLeft, Coins, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const money = (value) => Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function MatchEntryError({ requiredFee = 15, currentBalance = 0, checking, onRetry }) {
    const navigate = useNavigate();
    const shortfall = Math.max(0, Number(requiredFee) - Number(currentBalance));

    return (
        <main className="grid min-h-[calc(100dvh-7rem)] place-items-center bg-[#e8edf3] px-4 py-8">
            <section className="w-full max-w-md overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xl" role="alertdialog" aria-labelledby="match-entry-title" aria-describedby="match-entry-message">
                <div className="bg-[#29466f] px-5 py-5 text-center text-white">
                    <span className="mx-auto grid size-12 place-items-center rounded-full bg-amber-400 text-[#29466f]">
                        <AlertTriangle size={26} aria-hidden="true" />
                    </span>
                    <h1 id="match-entry-title" className="mt-3 text-xl font-bold">Match Entry Unavailable</h1>
                    <p id="match-entry-message" className="mt-1 text-sm text-white/80">Is match ko open karne ke liye sufficient coins nahi hain.</p>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="px-3 py-4 text-center">
                            <p className="text-xs font-semibold uppercase text-slate-500">Available</p>
                            <p className="mt-1 text-lg font-bold text-red-600">{money(currentBalance)}</p>
                        </div>
                        <div className="px-3 py-4 text-center">
                            <p className="text-xs font-semibold uppercase text-slate-500">Entry Fee</p>
                            <p className="mt-1 text-lg font-bold text-[#29466f]">{money(requiredFee)}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900">
                        <Coins className="shrink-0" size={21} aria-hidden="true" />
                        <p className="text-sm font-semibold">Entry ke liye {money(shortfall)} aur coins required hain.</p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => navigate("/dashboard/live")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                            <ArrowLeft size={18} aria-hidden="true" /> Matches
                        </button>
                        <button type="button" disabled={checking} onClick={onRetry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#29466f] px-3 text-sm font-bold text-white hover:bg-[#1d3557] disabled:cursor-wait disabled:opacity-60">
                            <RefreshCw size={18} className={checking ? "animate-spin" : ""} aria-hidden="true" /> Check Again
                        </button>
                    </div>
                </div>
            </section>
        </main>
    );
}
