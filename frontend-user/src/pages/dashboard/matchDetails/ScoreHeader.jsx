import React, { useRef, useEffect, useMemo } from 'react';

// Short display label for a single ball chip.
// Reads the actual label text first so combo balls (e.g. "1 + OUT",
// "4 + WIDE BALL") keep their run count instead of collapsing to just "W"/"Ex".
function getShortLabel(ball) {
    const upper = (ball.label || "").toUpperCase();

    // "N + WIDE BALL" / "N + No Ball" / "N + OUT"
    const comboMatch = upper.match(/^(\d+)\s*\+\s*(WIDE BALL|NO BALL|OUT)$/);
    if (comboMatch) {
        const n = comboMatch[1];
        const kind = comboMatch[2];
        const suffix = kind === "OUT" ? "W" : kind === "WIDE BALL" ? "Wd" : "Nb";
        return `${n}+${suffix}`;
    }

    // "WIDE BALL + OUT"
    if (upper === "WIDE BALL + OUT") return "Wd+W";

    if (ball.isWicket) return "W";

    if (ball.isExtra) {
        if (upper.includes("WIDE")) return "Wd";
        if (upper.includes("NO BALL") || upper.includes("NB")) return "Nb";
        return "Ex";
    }

    if (ball.runs === 0) return "•";
    return String(ball.runs ?? 0);
}

function BallChip({ ball }) {
    const getStyle = () => {
        if (ball.isWicket) return "bg-[#E53935] text-white border-[#E53935]";
        if (ball.runs === 4 || ball.runs === 6) return "bg-[#73BBF8] text-white border-[#73BBF8]";
        if (ball.isExtra) return "bg-[#c9861a] text-white border-[#c9861a]";
        if (ball.runs === 0) return "bg-white text-gray-400 border-gray-400";
        return "bg-white text-[#1E3A5F] border-[#1E3A5F]";
    };

    return (
        <span
            className={`flex items-center justify-center shrink-0 grow-0 aspect-square
                w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11
                min-w-6 min-h-6 sm:min-w-9 sm:min-h-9 md:min-w-10 md:min-h-10 lg:min-w-11 lg:min-h-11
                rounded-full border sm:border-2
                text-[10px] sm:text-sm lg:text-base font-bold font-rajdhani leading-none ${getStyle()}`}
            title={ball.label}
        >
            {getShortLabel(ball)}
        </span>
    );
}

// Groups a flat balls[] array (each ball already has an `over` field) into
// consecutive per-over segments: { over, balls: [...], totalRuns }.
// Consecutive-only grouping (not a full re-sort) so ordering always matches
// how the balls actually happened, even across MAX_BALLS truncation.
function groupBallsByOver(balls) {
    const groups = [];
    let current = null;

    for (const ball of balls) {
        if (!ball || ball.label === undefined) continue;

        if (!current || current.over !== ball.over) {
            current = { over: ball.over, balls: [], totalRuns: 0 };
            groups.push(current);
        }

        current.balls.push(ball);
        current.totalRuns += ball.runs || 0;
    }

    return groups;
}

export default function ScoreHeader({
    sseConnected,
    matchId,
    onRefresh,
    match,
    tossMessage = "",
    settings,
    scoreStatus,
    // Real ball-by-ball history — replaces the old recentBalls/thisOver mock shape
    balls = [],
    // Innings-aware score props
    firstBattingTeam = "",
    secondBattingTeam = "",
    currentInnings = 1, // 1 = 1st inn live, 2 = 2nd inn live, 3 = match complete
    firstInningsScore = null, // { runs, wickets, overs } — frozen once 2nd inn starts
    secondInningsScore = null, // { runs, wickets, overs } — frozen once match complete
    runs = 0,
    wickets = 0,
    overs = 0,
    team1Score = "",
    team2Score = "",
}) {
    const containerRef = useRef(null);
    const prevBallsLength = useRef(0);

    useEffect(() => {
        if (containerRef.current && balls.length > 0) {
            const container = containerRef.current;

            if (balls.length > prevBallsLength.current) {
                requestAnimationFrame(() => {
                    container.scrollTo({
                        left: container.scrollWidth,
                        behavior: "smooth",
                    });
                });
            }

            prevBallsLength.current = balls.length;
        }
    }, [balls]);

    const overGroups = useMemo(() => groupBallsByOver(balls), [balls]);

    // Format the score string: runs/wickets (overs)
    const formatScore = (r, w, o) => `${r}/${w} (${Number(o).toFixed(1)})`;

    const normalize = (s) => (s || "").trim().toLowerCase();
    const isFirstBatter = (team) =>
        !!firstBattingTeam && !!team && normalize(firstBattingTeam) === normalize(team);
    const isSecondBatter = (team) =>
        !!secondBattingTeam && !!team && normalize(secondBattingTeam) === normalize(team);

    // Live score always reflects whichever innings is currently in progress
    const getLiveScore = () => formatScore(runs, wickets, overs);

    // Decide what score (if any) belongs under a given physical team (match.team1 / match.team2)
    const getTeamScoreText = (team) => {
        if (isFirstBatter(team)) {
            if (currentInnings === 1) {
                return getLiveScore();
            }
            if (firstInningsScore) {
                return formatScore(firstInningsScore.runs, firstInningsScore.wickets, firstInningsScore.overs);
            }
            return null;
        }

        if (isSecondBatter(team)) {
            if (currentInnings === 2) {
                return getLiveScore();
            }
            if (currentInnings === 3 && secondInningsScore) {
                return formatScore(secondInningsScore.runs, secondInningsScore.wickets, secondInningsScore.overs);
            }
            return null;
        }

        return null;
    };

    const getTeamDisplay = (team) => {
        const scoreStr = getTeamScoreText(team);
        return scoreStr ? `${team} ${scoreStr}` : team;
    };

    // Determine what to show in the middle badge
    const getMiddleBadgeText = () => {
        // Priority 1: Use scoreStatus if provided
        if (scoreStatus) {
            return scoreStatus;
        }
        // Priority 2: Match complete
        if (currentInnings === 3) {
            return "MATCH COMPLETE";
        }
        // Priority 3: Use live score if a team is batting
        if (firstBattingTeam || secondBattingTeam) {
            return getLiveScore();
        }
        // Priority 4: Show BET OPEN/LOCKED/CLOSED
        if (settings?.betLock) {
            return "BET LOCKED";
        }
        if (settings?.marketStatus === "OPEN") {
            return "BET OPEN";
        }
        return settings?.marketStatus || "";
    };

    const middleText = getMiddleBadgeText();

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
                            {getTeamDisplay(match?.team1)}
                        </p>
                        <p className="text-[#D6E4F5] text-[10px] sm:text-sm md:text-base lg:text-lg font-bold font-serif leading-tight py-1 sm:py-1.5 lg:py-2 truncate">
                            {getTeamDisplay(match?.team2)}
                        </p>
                        <p className="text-[#90B4D4] text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold font-serif leading-tight py-1 sm:py-1.5 lg:py-2 truncate">
                            {tossMessage || "Toss pending"}
                        </p>
                    </div>
                </div>

                {/* Right - Bet Status / Live Score Status */}
                {/* Right - Bet Status / Live Score Status */}
                <div className="bg-[#1E3A5F] flex items-center justify-center px-2 sm:px-4 lg:px-6 shrink-0 w-[110px] sm:w-[160px] md:w-[190px] lg:w-[220px]">
                    <div className="text-white text-[11px] sm:text-xl md:text-2xl lg:text-3xl font-bold font-serif text-center leading-tight break-words">
                        {middleText.split(' ').map((word, i) => (
                            <React.Fragment key={i}>
                                {word}
                                {i < middleText.split(' ').length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section - grouped-by-over ball ticker, driven by real balls[] */}
            <div className="bg-[#3A5F9A] px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-4 mt-1.5 sm:mt-3 lg:mt-4 overflow-hidden">
                <div
                    ref={containerRef}
                    className="score-ticker flex items-center gap-1.5 sm:gap-2 md:gap-3 whitespace-nowrap overflow-x-auto overflow-y-hidden scroll-smooth"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    {overGroups.length === 0 ? (
                        <span className="text-white/70 text-[11px] sm:text-sm px-1">
                            No balls bowled yet
                        </span>
                    ) : (
                        overGroups.map((group, gIdx) => (
                            <React.Fragment key={`${group.over}-${gIdx}`}>
                                <span className="text-white text-[10px] sm:text-lg font-bold font-serif shrink-0 grow-0">
                                    Over {group.over + 1}
                                </span>
                                <span className="text-[#D6E4F5] shrink-0 grow-0">|</span>

                                {group.balls.map((ball, bIdx) => (
                                    <BallChip key={bIdx} ball={ball} />
                                ))}

                                <span className="text-white shrink-0 grow-0">-</span>
                                <span className="text-white text-[10px] sm:text-lg font-bold font-serif shrink-0 grow-0">
                                    {group.totalRuns} Runs
                                </span>

                                {gIdx < overGroups.length - 1 && (
                                    <span className="text-[#D6E4F5] shrink-0 grow-0">|</span>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </div>

                <style>{`
                    .score-ticker::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </div>
        </div>
    );
}
