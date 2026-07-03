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
            {value ?? "-"}
            {suspended && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
                    <span className="text-white text-[10px] font-bold tracking-wide">
                        SUSPENDED
                    </span>
                </div>
            )}
        </div>
    );
}

export default function OddsMarket({
    runners,
    bookmaker,
    settings,
    highlightedOdds,
}) {
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
                                    value={r.lagai}
                                    type="lagai"
                                    suspended={isSuspended}
                                    highlight={highlight.lagai}
                                />
                            </div>
                            <div className="px-1">
                                <OddsBtn
                                    value={r.khai}
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
