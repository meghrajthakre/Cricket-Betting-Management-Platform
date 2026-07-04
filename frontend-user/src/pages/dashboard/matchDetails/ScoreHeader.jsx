import React from 'react';

function BallChip({ val }) {
    const isFour = val === "4";
    const isSix = val === "6";
    const isDot = val === "0" || val === "•";
    const isWicket = val === "W";

    const style = isWicket
        ? "bg-red-600 border-red-600 text-white"
        : isFour || isSix
            ? "bg-[#4B75B8] border-[#4B75B8] text-white"
            : isDot
                ? "bg-gray-400 border-gray-400 text-white"
                : "bg-white border-[#1E3A5F] text-[#1E3A5F]";

    return (
        <span
            className={`inline-flex items-center justify-center shrink-0 w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full border sm:border-2 text-[10px] sm:text-sm lg:text-base font-bold font-serif ${style}`}
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
        <div className="w-full max-w-full overflow-hidden">
            {/* Top Section - Score and Bet Status */}
            <div className="flex flex-row items-stretch gap-2 sm:gap-4 lg:gap-4">
                {/* Left - Score Section */}
                <div className="bg-[#1E3A5F] flex items-center justify-center gap-6 sm:gap-6 lg:gap-4 px-2 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 flex-1 min-w-0">
                    <svg
                        viewBox="0 0 56 64"
                        fill="none"
                        className="shrink-0 w-12 h-13 sm:w-20 sm:h-22 lg:w-24 lg:h-26"
                    >
                        <circle cx="8" cy="8" r="7" fill="#2E5080" />
                        <path
                            d="M8 15 L8 38 L-2 58 L4 60 L12 42 L16 44 L22 60 L28 58 L18 38 L16 24"
                            fill="#2E5080"
                        />
                        <path
                            d="M15 22 L28 8"
                            stroke="#90B4D4"
                            strokeWidth="6"
                            strokeLinecap="round"
                        />
                        <rect
                            x="24"
                            y="2"
                            width="8"
                            height="22"
                            rx="2"
                            transform="rotate(45 28 8)"
                            fill="#90B4D4"
                        />
                        <circle cx="35" cy="30" r="3" fill="#D6E4F5" />
                    </svg>

                    <div className="min-w-0 flex flex-col gap-1 sm:gap-2 lg:gap-2">
                        <p className="text-white text-xs sm:text-base md:text-lg lg:text-xl font-bold font-serif leading-tight py-1 sm:py-1.5 lg:py-2 truncate">
                            {match.team1} {match.score}
                        </p>
                        <p className="text-[#D6E4F5] text-[10px] sm:text-sm md:text-base lg:text-lg font-bold font-serif leading-tight py-1 sm:py-1.5 lg:py-2 truncate">
                            {match.team2}
                        </p>
                        <p className="text-[#90B4D4] text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold font-serif leading-tight py-1 sm:py-1.5 lg:py-2 truncate">
                            {match.toss}
                        </p>
                    </div>
                </div>

                {/* Right - Bet Status */}
                <div className="bg-[#1E3A5F] flex items-center justify-center px-4 sm:px-6 lg:px-8 shrink-0 sm:min-w-[120px] lg:min-w-[160px]">
                    <div className="text-white text-[13px] sm:text-2xl md:text-3xl lg:text-4xl font-bold font-serif text-center leading-tight whitespace-nowrap">
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
            </div>

            {/* Bottom Section - Recent Balls and Over Stats */}
            <div className="bg-[#3A5F9A] flex items-center gap-2 sm:gap-3 lg:gap-4 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 mt-1.5 sm:mt-3 lg:mt-4 flex-wrap min-w-0">
                <span className="text-white text-base sm:text-xl lg:text-2xl font-bold font-serif leading-none">
                    {thisOver.dot}
                </span>

                <span className="text-white text-[10px] sm:text-lg lg:text-xl font-bold font-serif whitespace-nowrap">
                    {thisOver.runs} Runs
                </span>

                <span className="text-[#D6E4F5] text-xs sm:text-lg lg:text-xl font-serif">|</span>

                <span className="text-white text-[10px] sm:text-lg lg:text-xl font-bold font-serif whitespace-nowrap">
                    Over {thisOver.balls}
                </span>

                <span className="text-white text-xs sm:text-lg lg:text-xl font-bold mx-0.5 sm:mx-1">-</span>

                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-wrap min-w-0">
                    {recentBalls.map((b, i) => (
                        <BallChip key={i} val={b} />
                    ))}
                </div>

                <span className="text-white text-xs sm:text-lg lg:text-xl font-bold mx-0.5 sm:mx-1">-</span>

                <span className="text-white text-[10px] sm:text-lg lg:text-xl font-bold font-serif whitespace-nowrap">
                    {thisOver.extraRuns} Runs
                </span>
            </div>
        </div>
    );
}