function BallChip({ val }) {
    const isFour = val === "4";
    const isSix = val === "6";
    const isDot = val === "0" || val === "•";
    const isWicket = val === "W";

    const bg = isWicket
        ? "bg-red-600"
        : isFour || isSix
            ? "bg-[#4B75B8]"
            : isDot
                ? "bg-gray-400"
                : "bg-[#4B75B8]";

    return (
        <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold font-rajdhani ${bg}`}
        >
            {val}
        </span>
    );
}

export default function ScoreHeader({
    sseConnected,
    matchId,
    onRefresh,
    match,
    settings,
    recentBalls,
    thisOver,
}) {
    return (
        <>
           

            <div className="bg-[#1E3A5F] flex items-center justify-between px-3 py-4 rounded-t">
                <div className="flex items-center gap-3">
                    <svg
                        width="36"
                        height="36"
                        viewBox="0 0 40 40"
                        fill="none"
                        className="shrink-0"
                    >
                        <circle cx="20" cy="20" r="18" fill="#2E5080" />
                        <line
                            x1="10"
                            y1="30"
                            x2="30"
                            y2="10"
                            stroke="#90B4D4"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        />
                        <circle cx="28" cy="12" r="4" fill="#D6E4F5" opacity="0.9" />
                    </svg>
                    <div>
                        <p className="text-white text-sm font-semibold font-rajdhani leading-tight">
                            {match.team1} {match.score}
                        </p>
                        <p className="text-[#D6E4F5] text-xs font-rajdhani">{match.team2}</p>
                        <p className="text-[#90B4D4] text-xs">{match.toss}</p>
                    </div>
                </div>
                <div className="bg-[#4B75B8] text-white text-xs font-bold px-2 py-1 rounded font-rajdhani tracking-wide text-center">
                    {settings.betLock ? (
                        <>
                            BET<br />
                            LOCKED
                        </>
                    ) : (
                        <>
                            {settings.marketStatus === "OPEN" ? (
                                <>
                                    BET<br />
                                    OPEN
                                </>
                            ) : (
                                <>{settings.marketStatus}</>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="bg-[#3A5F9A] flex items-center gap-2 px-3 py-2 flex-wrap">
                {recentBalls.map((b, i) => (
                    <BallChip key={i} val={b} />
                ))}
                <span className="text-white text-xs font-bold mx-1">-</span>
                <span className="text-white text-sm font-bold font-rajdhani">
                    {thisOver.runs} Runs
                </span>
                <span className="text-[#D6E4F5] text-xs ml-1">| {thisOver.balls}</span>
                <BallChip val={thisOver.dot} />
                <span className="text-white text-xs font-bold mx-1">-</span>
                <span className="text-white text-sm font-bold font-rajdhani">
                    {thisOver.extraRuns} Runs
                </span>
            </div>
        </>
    );
}
