function SessionRow({ session, onBet, sessionLocked }) {
    const sessionName = session.sessionName || session.name;
    const noRun = session.noRun ?? session.no?.rate ?? "-";
    const noRate = session.noRate ?? session.no?.size;
    const yesRun = session.yesRun ?? session.yes?.rate ?? "-";
    const yesRate = session.yesRate ?? session.yes?.size;
    const isSuspended = session.status !== "open" || session.lockStatus === "lock";
    const bettingDisabled = sessionLocked || isSuspended;

    const handleBet = (type, run, payoutRate) => {
        if (bettingDisabled) return;
        if (onBet) {
            onBet({
                name: sessionName,
                type,
                rate: Number(run),
                sessionRate: Number(payoutRate),
                marketType: "session",
                marketId: String(session.id || sessionName),
                marketLabel: "Session",
            });
        } else {
            console.log(`Bet placed: ${sessionName} - ${type} @ ${run}`);
        }
    };

    return (
        <tr className="border-b border-[#CDD9E5] last:border-0">
            <td className="w-[45%] px-3 py-2 font-sans text-sm font-semibold text-[#1A2B3C]">
                {sessionName}
            </td>
            <td className="py-2 px-1 w-[22%] relative">
                <button
                    onClick={() => handleBet("no", noRun, noRate)}
                    disabled={bettingDisabled}
                    className="w-full min-h-11 bg-[#a8cce8] hover:bg-[#7fb3d9] rounded text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="pt-1 font-sans text-sm font-bold leading-tight text-[#1A2B3C]">
                        {isSuspended ? 0 : noRun}
                    </div>
                    <div className="text-xs text-[#2B4A7A] pb-1">
                        {isSuspended ? "0.0" : (typeof noRate === "number" ? noRate.toFixed(1) : "")}
                    </div>
                </button>
            </td>
            <td className="py-2 px-1 w-[22%] relative">
                <button
                    onClick={() => handleBet("yes", yesRun, yesRate)}
                    disabled={bettingDisabled}
                    className="w-full min-h-11 bg-[#f5c99a] hover:bg-[#f0b87a] rounded text-center cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <div className="pt-1 font-sans text-sm font-bold leading-tight text-[#1A2B3C]">
                        {isSuspended ? 0 : yesRun}
                    </div>
                    <div className="text-xs text-[#7A4A2B] pb-1">
                        {isSuspended ? "0.0" : (typeof yesRate === "number" ? yesRate.toFixed(1) : "")}
                    </div>
                </button>
            </td>
            <td className="py-2 px-2 w-[11%]">
                <div className="flex gap-1 justify-center">
                    <button className="text-[#4B75B8] hover:text-[#1E3A5F] cursor-pointer transition-transform hover:scale-110 active:scale-95">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                        </svg>
                    </button>
                    <button className="text-[#4B75B8] hover:text-[#1E3A5F] cursor-pointer transition-transform hover:scale-110 active:scale-95">
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function SessionMarket({ sessions, settings, onPlaceBet, maxBet, settledResult = 0 }) {
    return (
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden">
            {Number(maxBet) > 0 && (
                <div className="border-b border-[#CDD9E5] bg-white px-3 py-1 text-right text-xs font-semibold text-[#60758A]">
                    Max session bet: {Number(maxBet).toLocaleString("en-IN")}
                </div>
            )}

            <div className="grid grid-cols-[45%_22%_22%_11%] bg-[#1E3A5F] px-3 py-1 font-sans text-xs font-bold tracking-wide text-white">
                <div>SESSION</div>
                <div className="text-center">
                    <div>No</div>
                    <div className="font-normal opacity-70">RATE</div>
                </div>
                <div className="text-center">
                    <div>Yes</div>
                    <div className="font-normal opacity-70">RATE</div>
                </div>
                <div className={`flex items-center justify-end text-sm font-extrabold ${
                    Number(settledResult) > 0
                        ? "text-emerald-300"
                        : Number(settledResult) < 0
                            ? "text-red-300"
                            : "text-white"
                }`}>
                    {Number(settledResult) > 0 ? "+" : ""}
                    {Number(settledResult).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
            </div>

            {settings.sessionLock && (
                <div className="bg-black/5 px-3 py-1 text-xs font-semibold text-[#7A2B2B] text-center">
                    Session betting is currently locked
                </div>
            )}

            <table className="w-full">
                <tbody>
                    {sessions.map((s) => (
                        <SessionRow
                            key={s.id || s.name}
                            session={s}
                            onBet={onPlaceBet}
                            sessionLocked={settings.sessionLock}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
