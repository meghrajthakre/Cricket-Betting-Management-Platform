import { useMemo, useState } from "react";

const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function BetSlip({ selection, maxBet, positions = {}, onClose, onSubmit, submitting }) {
    const [amount, setAmount] = useState("");
    const [error, setError] = useState("");

    const financials = useMemo(() => {
        const stake = Number(amount);
        const rate = Number(selection?.rate);
        if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(rate)) {
            return { profit: 0, liability: 0 };
        }

        return selection.type === "yes"
            ? { profit: (rate * stake) / 100, liability: stake }
            : { profit: stake, liability: (rate * stake) / 100 };
    }, [amount, selection]);

    const walletAdjustment = useMemo(() => {
        if (selection?.marketType !== "match" || Object.keys(positions).length < 2) {
            return financials.liability;
        }

        const current = Object.fromEntries(
            Object.entries(positions).map(([runnerId, value]) => [runnerId, Number(value) || 0])
        );
        const currentExposure = Math.max(0, ...Object.values(current).map((value) => -value));

        for (const runnerId of Object.keys(current)) {
            if (selection.type === "yes") {
                current[runnerId] += runnerId === selection.marketId
                    ? financials.profit
                    : -financials.liability;
            } else {
                current[runnerId] += runnerId === selection.marketId
                    ? -financials.liability
                    : financials.profit;
            }
        }

        const nextExposure = Math.max(0, ...Object.values(current).map((value) => -value));
        return Number((nextExposure - currentExposure).toFixed(2));
    }, [financials, positions, selection]);

    if (!selection) return null;

    const submit = async (event) => {
        event.preventDefault();
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

    const isYes = selection.type === "yes";

    return (
        <form
            onSubmit={submit}
            className={`mt-2 overflow-hidden rounded-lg border shadow-md ${
                isYes ? "border-[#e4a866] bg-[#fff4e8]" : "border-[#79acd3] bg-[#eaf5fd]"
            }`}
        >
            <div className="flex items-center justify-between bg-[#1E3A5F] px-3 py-2 text-white">
                <div>
                    <p className="text-xs font-bold tracking-wider">BET SLIP</p>
                    <p className="text-[11px] text-white/75">{selection.marketLabel}</p>
                </div>
                <button type="button" onClick={onClose} className="p-1 text-xl leading-none" aria-label="Close bet slip">
                    ×
                </button>
            </div>

            <div className="space-y-3 p-3">
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div>
                        <p className="text-sm font-bold text-[#1A2B3C]">{selection.name}</p>
                        <p className="text-xs font-semibold uppercase text-[#60758A]">
                            {isYes ? "Lagai / Yes" : "Khai / No"}
                        </p>
                    </div>
                    <div className="rounded bg-white px-4 py-2 text-center shadow-sm">
                        <p className="text-[10px] font-semibold text-[#60758A]">RATE</p>
                        <p className="text-lg font-bold text-[#1A2B3C]">{selection.rate}</p>
                    </div>
                </div>

                <label className="block">
                    <span className="mb-1 block text-xs font-bold text-[#1A2B3C]">BET AMOUNT</span>
                    <input
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        max={Number(maxBet) > 0 ? maxBet : undefined}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder="Amount dalo"
                        className="w-full rounded border border-[#9DB0C3] bg-white px-3 py-2.5 text-base font-bold outline-none focus:border-[#1E3A5F]"
                    />
                </label>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-white/80 p-2">
                        <span className="text-[#60758A]">Possible profit</span>
                        <p className="font-bold text-green-700">+{money(financials.profit)}</p>
                    </div>
                    <div className="rounded bg-white/80 p-2">
                        <span className="text-[#60758A]">
                            {walletAdjustment < 0 ? "Hedge refund" : "Wallet se katega"}
                        </span>
                        <p className={`font-bold ${walletAdjustment < 0 ? "text-green-700" : "text-red-700"}`}>
                            {walletAdjustment < 0 ? "+" : "-"}{money(Math.abs(walletAdjustment))}
                        </p>
                    </div>
                </div>

                {Number(maxBet) > 0 && (
                    <p className="text-[11px] font-semibold text-[#60758A]">Maximum bet: {money(maxBet)}</p>
                )}
                {error && <p className="rounded bg-red-100 px-2 py-1.5 text-xs font-semibold text-red-700">{error}</p>}

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded bg-[#1E3A5F] py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? "PLACING BET..." : "PLACE BET"}
                </button>
            </div>
        </form>
    );
}
