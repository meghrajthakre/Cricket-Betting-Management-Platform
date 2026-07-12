function OddsBtn({ value, type, suspended, highlight }) {
    const isLagai = type === "lagai";
    const bg = isLagai ? "bg-[#a8cce8]" : "bg-[#f5c99a]";

    const highlightClass = highlight
        ? "ring-2 ring-yellow-400 ring-opacity-75 animate-pulse"
        : "";

    return (
        <div
            className={`relative ${bg} ${highlightClass} rounded h-9 w-full flex items-center justify-center text-sm font-semibold text-[#1A2B3C] transition-all duration-300`}
        >
            {suspended ? 0 : value ?? "-"}
        </div>
    );
}

// KHAI is always derived from LAGAI + the live rateDiff (from settings).
// If lagai is 0 (or the runner is suspended), khai stays 0 regardless of rateDiff.
// Whatever `khai` value arrives in the runner payload/SSE event is ignored on
// purpose - this guarantees the displayed diff always matches the *current*
// rateDiff setting, even if a stale khai was pushed before rateDiff changed.
function computeKhai(lagai, rateDiff) {
    const diff = Number(rateDiff) || 0;
    if (lagai === 0 || lagai === undefined || lagai === null) return 0;
    return Number(lagai) + diff;
}

// Dynamic rule: ANY runner whose lagai is exactly 97 (the suspend value)
// shows khai as 0. This is not tied to any specific team name - it applies
// to whichever runner happens to have lagai === 97, for every match.
const SUSPEND_LAGAI_VALUE = 97;

function shouldShowZeroKhai(lagai) {
    return Number(lagai) === SUSPEND_LAGAI_VALUE;
}

export default function OddsMarket({
    runners,
    bookmaker,
    settings,
    highlightedOdds,
}) {
    const rateDiff = settings?.rateDiff ?? 0;

    return (
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1.5 tracking-wider">
                <div>RUNNER</div>
                <div className="text-center">LAGAI</div>
                <div className="text-center">KHAI</div>
                <div className="text-right">POSITION</div>
            </div>

            {runners.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-500 text-center">
                    No odds published yet for this match.
                </div>
            ) : (
                runners.map((r, index) => {
                    const isSuspended = r.status === "suspend" || settings.betLock;
                    const highlight = highlightedOdds[r.runnerId] || {};

                    // Convert lagai to number
                    const lagaiNum = Number(r.lagai);

                    // Check if the dynamic 97 -> khai 0 rule applies (any runner, any team)
                    const shouldShowZero = shouldShowZeroKhai(lagaiNum);

                    // Compute khai value: 0 when lagai is 97, otherwise lagai + rateDiff
                    const khaiValue = shouldShowZero ? 0 : computeKhai(lagaiNum, rateDiff);

                    return (
                        <div
                            key={r.runnerId || r.runnerName || index}
                            className="grid grid-cols-4 items-center px-3 py-2 border-b border-[#CDD9E5] last:border-0"
                        >
                            <div className="text-sm font-semibold text-[#1A2B3C]">
                                {r.runnerName}
                            </div>
                            <div className="px-1">
                                <OddsBtn
                                    value={lagaiNum}
                                    type="lagai"
                                    suspended={isSuspended}
                                    highlight={highlight.lagai}
                                />
                            </div>
                            <div className="px-1">
                                <OddsBtn
                                    value={khaiValue}
                                    type="khai"
                                    suspended={isSuspended}
                                    highlight={highlight.khai}
                                />
                            </div>
                            <div className="text-right text-sm font-semibold text-[#1A2B3C]">
                                0.00
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}