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
                w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9
                min-w-6 min-h-6 sm:min-w-8 sm:min-h-8 md:min-w-9 md:min-h-9
                rounded-full border sm:border-2
                text-[10px] sm:text-xs md:text-sm font-bold leading-none ${getStyle()}`}
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

// Sliding, grouped-by-over ball ticker — driven purely by real data passed in via props.
// Renders: Over N | ● ● 4 ● - X Runs | Over N+1 | ...
export default function SlidingBalls({ balls = [] }) {
    const containerRef = useRef(null);
    const prevLength = useRef(0);

    useEffect(() => {
        if (containerRef.current && balls.length > 0) {
            const container = containerRef.current;

            if (balls.length > prevLength.current) {
                requestAnimationFrame(() => {
                    container.scrollTo({
                        left: container.scrollWidth,
                        behavior: "smooth",
                    });
                });
            }

            prevLength.current = balls.length;
        }
    }, [balls]);

    const overGroups = useMemo(() => groupBallsByOver(balls), [balls]);

    return (
        <div className="w-full bg-[#3A5F9A] rounded-md overflow-hidden">
            <div
                ref={containerRef}
                className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-4 py-2 sm:py-3
                    overflow-x-auto overflow-y-hidden scroll-smooth whitespace-nowrap"
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {overGroups.length === 0 ? (
                    <span className="text-[11px] sm:text-sm text-white/70 px-1">
                        No balls bowled yet
                    </span>
                ) : (
                    overGroups.map((group, gIdx) => (
                        <React.Fragment key={`${group.over}-${gIdx}`}>
                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-bold shrink-0 grow-0">
                                Over {group.over}
                            </span>
                            <span className="text-white/60 shrink-0 grow-0">|</span>

                            {group.balls.map((ball, bIdx) => (
                                <BallChip key={bIdx} ball={ball} />
                            ))}

                            <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold shrink-0 grow-0">
                                - {group.totalRuns} Runs
                            </span>

                            {gIdx < overGroups.length - 1 && (
                                <span className="text-white/60 shrink-0 grow-0">|</span>
                            )}
                        </React.Fragment>
                    ))
                )}
            </div>
            <style>{`
                .scroll-smooth::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}