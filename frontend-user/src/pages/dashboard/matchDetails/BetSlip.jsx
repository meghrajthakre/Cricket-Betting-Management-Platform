import { useEffect, useMemo, useState } from "react";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 2,
});

const QUICK_AMOUNTS = [
    ["1K", 1000], ["5K", 5000], ["10K", 10000], ["25K", 25000], ["50K", 50000],
    ["1L", 100000], ["2L", 200000], ["5L", 500000], ["10L", 1000000], ["25L", 2500000],
];

export default function BetSlip({ selection, maxBet, positions = {}, runners = [], onClose, onSubmit, submitting }) {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!selection) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [selection]);

    const financials = useMemo(() => {
        const stake = Number(amount);
        const rate = Number(selection?.rate);
        const sessionRate = Number(selection?.sessionRate);
        if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(rate)) {
            return { profit: 0, liability: 0 };
        }
        if (selection?.marketType === "session") {
            if (!Number.isFinite(sessionRate) || sessionRate <= 0) {
                return { profit: 0, liability: 0 };
            }
            return selection.type === "yes"
                ? { profit: sessionRate * stake, liability: stake }
                : { profit: stake, liability: sessionRate * stake };
        }
        return selection.type === "yes"
            ? { profit: (rate * stake) / 100, liability: stake }
            : { profit: stake, liability: (rate * stake) / 100 };
    }, [amount, selection]);

    const exposure = useMemo(() => {
        if (selection?.marketType !== "match" || Object.keys(positions).length < 2) {
            return { walletAdjustment: financials.liability, projectedPositions: positions };
        }

        const projectedPositions = Object.fromEntries(
            Object.entries(positions).map(([runnerId, value]) => [runnerId, Number(value) || 0])
        );
        const currentExposure = Math.max(0, ...Object.values(projectedPositions).map((value) => -value));

        for (const runnerId of Object.keys(projectedPositions)) {
            if (selection.type === "yes") {
                projectedPositions[runnerId] += runnerId === selection.marketId
                    ? financials.profit
                    : -financials.liability;
            } else {
                projectedPositions[runnerId] += runnerId === selection.marketId
                    ? -financials.liability
                    : financials.profit;
            }
        }

        const nextExposure = Math.max(0, ...Object.values(projectedPositions).map((value) => -value));
        return {
            walletAdjustment: Number((nextExposure - currentExposure).toFixed(2)),
            projectedPositions,
        };
    }, [financials, positions, selection]);

    if (!selection) return null;

    const submit = async (event) => {
        event.preventDefault();
        if (submitting) return;
        const stake = Number(amount);
        const limit = Number(maxBet);

        if (!Number.isFinite(stake) || stake <= 0) {
            setError("Valid amount dalo");
            return;
        }
        if (Number.isFinite(limit) && limit > 0 && stake > limit) {
            setError(`Maximum bet ${money(limit)} hai`);
            return;
        }

        setError("");
        try {
            await onSubmit({ amount: stake, ...financials });
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || "Bet place nahi hui");
        }
    };

    const appendDigit = (digit) => {
        if (submitting) return;
        setError("");
        setAmount((current) => {
            const next = `${current}${digit}`.replace(/^0+(?=\d)/, "");
            return next.length <= 9 ? next : current;
        });
    };

    const isYes = selection.type === "yes";
    const walletAdjustment = exposure.walletAdjustment;

    return (
        <>
            <button
                type="button"
                aria-label="Close bet slip"
                onClick={submitting ? undefined : onClose}
                className="fixed inset-0 z-[60] cursor-default bg-[#07182a]/60 backdrop-blur-[1px] animate-[betBackdropIn_180ms_ease-out]"
            />
            <form
                onSubmit={submit}
                className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[92dvh] w-full max-w-md overscroll-contain overflow-y-auto rounded-t-2xl border-x-2 border-t-2 border-[#24466f] bg-white shadow-[0_-18px_60px_rgba(0,0,0,0.35)] animate-[betSlipUp_280ms_cubic-bezier(0.22,1,0.36,1)]"
            >
            <div className="sticky top-0 z-10 flex justify-center bg-[#eef2f5] py-2">
                <div className="h-1.5 w-12 rounded-full bg-[#8da0b3]" />
            </div>
            <div className="grid grid-cols-[3fr_2fr] border-b border-[#24466f] bg-[#eef2f5] text-xs font-bold">
                <div className="border-r border-[#24466f] px-3 py-2 text-[#1A2B3C]">{selection.marketLabel}</div>
                <div className="px-3 py-2 text-center text-green-700">POSITION</div>
            </div>

            {selection.marketType === "match" && runners.map((runner) => {
                const value = Number(exposure.projectedPositions?.[runner.runnerId] || 0);
                return (
                    <div key={runner.runnerId} className="grid grid-cols-[3fr_2fr] border-b border-[#24466f] text-xs font-semibold">
                        <div className="border-r border-[#24466f] px-3 py-2 text-center">{runner.runnerName}</div>
                        <div className={`px-3 py-2 text-center font-bold ${value > 0 ? "text-green-700" : value < 0 ? "text-red-700" : "text-gray-600"}`}>
                            {value > 0 ? "+" : ""}{money(value)}
                        </div>
                    </div>
                );
            })}

            <div className="grid grid-cols-3 bg-[#f4f4f2] text-center text-xs font-bold text-[#444]">
                <div className="flex items-center justify-center border-r border-b border-[#7890aa] px-2 py-2">{selection.name}</div>
                <div className="flex items-center justify-center border-r border-b border-[#7890aa] px-2 py-2">{isYes ? "LAGAI" : "KHAI"}</div>
                <div className="flex items-center justify-center border-b border-[#7890aa] px-2 py-2">
                    {selection.marketType === "session"
                        ? `RUN : ${selection.rate} · RATE : ${selection.sessionRate}`
                        : `RATE : ${selection.rate}`}
                </div>
            </div>

            <div className="grid grid-cols-[3fr_2fr] border-b border-[#24466f]">
                <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={amount}
                    disabled={submitting}
                    placeholder="Enter Coins"
                    aria-label="Bet amount"
                    className="min-w-0 border-r border-[#24466f] bg-[#f1f1f1] px-3 py-3 text-center text-base font-bold outline-none placeholder:font-medium placeholder:text-gray-400"
                />
                <button type="button" onClick={() => setAmount((value) => value.slice(0, -1))} className="bg-[#925c59] text-lg font-bold text-white">×</button>
            </div>

            <div className="grid grid-cols-5 bg-[#3f7c9d]">
                {QUICK_AMOUNTS.map(([label, value]) => (
                    <button key={label} type="button" onClick={() => { setAmount(String(value)); setError(""); }} className="border-b border-r border-white/20 py-2 text-xs font-bold text-white hover:bg-[#326985]">
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 bg-[#e5e6e7]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <button key={digit} type="button" onClick={() => appendDigit(digit)} className="border-b border-r border-[#7890aa] py-2.5 text-sm font-bold hover:bg-[#d7dadd]">{digit}</button>
                ))}
                <button type="button" onClick={() => { setAmount(""); setError(""); }} className="border-b border-r border-[#7890aa] py-2.5 text-xs text-gray-600">Clear</button>
                <button type="button" onClick={() => appendDigit(0)} className="border-b border-r border-[#7890aa] py-2.5 text-sm font-bold">0</button>
                <div className="border-b border-[#7890aa]" />
            </div>

            <div className="grid grid-cols-2 border-t border-[#24466f] text-xs font-bold">
                <div className="border-r border-[#24466f] bg-[#f5f5f5] px-2 py-2 text-center">
                    <span className="text-gray-500">Profit </span><span className="text-green-700">+{money(financials.profit)}</span>
                </div>
                <div className="bg-[#f5f5f5] px-2 py-2 text-center">
                    <span className="text-gray-500">{walletAdjustment < 0 ? "Refund " : "Debit "}</span>
                    <span className={walletAdjustment < 0 ? "text-green-700" : "text-red-700"}>
                        {walletAdjustment < 0 ? "+" : "-"}{money(Math.abs(walletAdjustment))}
                    </span>
                </div>
            </div>

            {error && <p className="border-t border-red-300 bg-red-100 px-2 py-2 text-center text-xs font-semibold text-red-700">{error}</p>}
            {Number(maxBet) > 0 && <p className="bg-[#eef2f5] py-1 text-center text-[10px] font-semibold text-[#60758A]">Maximum bet: {money(maxBet)}</p>}

            <div className="grid grid-cols-2 text-sm font-bold text-white">
                <button type="button" onClick={onClose} disabled={submitting} className="bg-[#925653] py-3 disabled:opacity-60">CANCEL</button>
                <button type="submit" disabled={submitting} className="bg-[#2d8438] py-3 disabled:opacity-60">DONE</button>
            </div>
            </form>
        </>
    );
}
