export default function MatchMessages({ options }) {
    const showTarget = Number(options.newTarget) > 0;
    const showTossResult = options.tossVisibility !== "remove" && options.tossResult && options.tossTeam;
    const showTieResult = Boolean(options.tieResult);

    if (!showTossResult && !showTieResult && !showTarget && !options.errorMessage) return null;

    return (
        <div className="mt-2 space-y-2">
            {showTossResult && (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm font-semibold text-emerald-800">
                    {options.tossTeam}: Toss {options.tossResult}
                </div>
            )}
            {showTieResult && (
                <div className="rounded border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700">
                    Match result: {options.tieResult === "tie" ? "Tie" : "No Tie"}
                </div>
            )}
            {showTarget && (
                <div className="rounded border border-violet-200 bg-violet-50 px-3 py-2 text-center text-sm font-semibold text-violet-800">
                    Revised target: {options.newTarget} in {options.balls} balls
                </div>
            )}
            {options.errorMessage && (
                <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
                    {options.errorMessage}
                </div>
            )}
        </div>
    );
}
