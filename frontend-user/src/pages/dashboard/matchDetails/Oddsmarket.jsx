function OddsBtn({ value, type, suspended, highlight, onClick }) {
    const isLagai = type === "lagai";
    const bg = isLagai ? "bg-[#a8cce8]" : "bg-[#f5c99a]";

    const highlightClass = highlight
        ? "ring-2 ring-yellow-400 ring-opacity-75 animate-pulse"
        : "";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={suspended}
            className={`relative ${bg} ${highlightClass} rounded h-9 w-full flex items-center justify-center text-sm font-semibold text-[#1A2B3C] transition-all duration-300 hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60`}
        >
            {suspended ? 0 : value ?? "-"}
        </button>
    );
}

// KHAI is computed and pushed by RunnerTable, which knows whether a runner's
// lagai was explicitly selected from the dropdown or is still at its
// untouched default. That's why we read the incoming `khai` value here
// instead of recalculating lagai + rateDiff blind - a blind recalculation
// can't tell "lagai is 0 because it's untouched" apart from "lagai is 0
// because the user explicitly selected 0", and would show the wrong value
// for the untouched case.
function readKhai(runnerKhai) {
    const num = Number(runnerKhai);
    return Number.isFinite(num) ? num : 0;
}

// Dynamic rule: ANY runner whose lagai is exactly 97 (the suspend value)
// shows khai as 0. This is not tied to any specific team name - it applies
// to whichever runner happens to have lagai === 97, for every match.
const SUSPEND_LAGAI_VALUE = 97;

const formatPosition = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString("en-US", {
        useGrouping: false,
        maximumFractionDigits: 2,
    });
};

function shouldShowZeroKhai(lagai) {
    return Number(lagai) === SUSPEND_LAGAI_VALUE;
}

export default function OddsMarket({
    runners,
    teamNames = [],
    settings,
    highlightedOdds,
    maxBet,
    onSelectBet,
    positions = {},
    settledResult = 0,
}) {
    return (
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1.5 tracking-wider">
                <div>RUNNER</div>
                <div className="text-center">LAGAI</div>
                <div className="text-center">KHAI</div>
                <div className="text-right">POSITION</div>
            </div>

            {Number(settledResult) !== 0 && (
                <div className={`border-b border-[#CDD9E5] px-3 py-1.5 text-right text-sm font-extrabold ${
                    Number(settledResult) > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                }`}>
                    Match P/L: {Number(settledResult) > 0 ? "+" : ""}
                    {Number(settledResult).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
            )}

            {Number(maxBet) > 0 && (
                <div className="border-b border-[#CDD9E5] bg-white px-3 py-1 text-right text-[11px] font-semibold text-[#60758A]">
                    Max match bet: {Number(maxBet).toLocaleString("en-IN")}
                </div>
            )}

            {runners.length === 0 ? (
                teamNames.filter(Boolean).map((teamName) => (
                    <div
                        key={teamName}
                        className="grid grid-cols-4 items-center px-3 py-2 border-b border-[#CDD9E5] last:border-0"
                    >
                        <div className="text-sm font-semibold text-[#1A2B3C]">
                            {teamName}
                        </div>
                        <div className="px-1">
                            <div className="h-9 w-full rounded bg-[#a8cce8]" />
                        </div>
                        <div className="px-1">
                            <div className="h-9 w-full rounded bg-[#f5c99a]" />
                        </div>
                        <div className="h-9" />
                    </div>
                ))
            ) : (
                runners.map((r, index) => {
                    const isSuspended = r.status === "suspend" || settings.betLock;
                    const highlight = highlightedOdds[r.runnerId] || {};

                    // Convert lagai to number
                    const lagaiNum = Number(r.lagai);

                    // Check if the dynamic 97 -> khai 0 rule applies (any runner, any team)
                    const shouldShowZero = shouldShowZeroKhai(lagaiNum);

                    // Khai value: 0 when lagai is 97 (suspend), otherwise whatever
                    // khai RunnerTable already computed and pushed for this runner.
                    const khaiValue = shouldShowZero ? 0 : readKhai(r.khai);

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
                                    onClick={() => onSelectBet?.({
                                        name: r.runnerName,
                                        type: "yes",
                                        rate: lagaiNum,
                                        marketType: "match",
                                        marketId: r.runnerId,
                                        marketLabel: "Match Odds",
                                    })}
                                />
                            </div>
                            <div className="px-1">
                                <OddsBtn
                                    value={khaiValue}
                                    type="khai"
                                    suspended={isSuspended}
                                    highlight={highlight.khai}
                                    onClick={() => onSelectBet?.({
                                        name: r.runnerName,
                                        type: "no",
                                        rate: khaiValue,
                                        marketType: "match",
                                        marketId: r.runnerId,
                                        marketLabel: "Match Odds",
                                    })}
                                />
                            </div>
                            <div className={`text-right text-sm font-bold ${
                                Number(positions[r.runnerId]) > 0
                                    ? "text-green-700"
                                    : Number(positions[r.runnerId]) < 0
                                        ? "text-red-700"
                                        : "text-[#1A2B3C]"
                            }`}>
                                {Number(positions[r.runnerId] || 0) > 0 ? "+" : ""}
                                {formatPosition(positions[r.runnerId])}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
