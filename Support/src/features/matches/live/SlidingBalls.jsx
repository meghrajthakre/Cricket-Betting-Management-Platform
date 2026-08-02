import React, { useRef, useEffect } from 'react';
import {
    MAX_DISPLAY_BALLS,
    BALL_STYLES,
    BALL_CHIP_CLASSES,
    SHORT_LABELS,
    LABEL_SHORT_MAP,
    LABEL_STYLE_MAP,
    EMPTY_STATE_TEXT,
    BOUNDARY_RUNS,
} from './slidingBallsConstants';

// Short display label shown inside each chip.
// Tries the exact-label map first (covers combos like "4 + No Ball" -> "4Nb"),
// then falls back to generic wicket/extra/runs logic for anything unmapped.
function getShortLabel(ball) {
    const upper = (ball.label || "").toUpperCase().trim();

    if (LABEL_SHORT_MAP[upper]) {
        return LABEL_SHORT_MAP[upper];
    }

    if (ball.isWicket) return SHORT_LABELS.wicket;
    if (ball.isExtra) {
        if (upper.includes("WIDE")) return SHORT_LABELS.wide;
        if (upper.includes("NO BALL") || upper.includes("NB")) return SHORT_LABELS.noBall;
        return SHORT_LABELS.extraFallback;
    }
    return String(ball.runs ?? 0);
}

// Chip color, same exact-map-first / generic-fallback pattern.
function getStyleKey(ball) {
    const upper = (ball.label || "").toUpperCase().trim();

    if (LABEL_STYLE_MAP[upper]) {
        return LABEL_STYLE_MAP[upper];
    }

    if (ball.isWicket) return "wicket";
    if (ball.isExtra) return "extra";
    if (BOUNDARY_RUNS.includes(ball.runs)) return "boundary";
    if (ball.runs === 0) return "dot";
    return "default";
}

// Ball chip component for individual balls
function BallChip({ ball }) {
    const styleKey = getStyleKey(ball);
    const styleClasses = BALL_STYLES[styleKey] || BALL_STYLES.default;

    return (
        <span
            className={`${BALL_CHIP_CLASSES} ${styleClasses}`}
            title={ball.label}
        >
            {getShortLabel(ball)}
        </span>
    );
}

// Sliding balls component — driven purely by real data passed in via props
export default function SlidingBalls({ balls = [] }) {
    const containerRef = useRef(null);
    const prevLength = useRef(0);

    // Auto-scroll to show latest balls whenever new balls arrive
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

    const displayBalls = balls.filter(ball => ball && ball.label).slice(-MAX_DISPLAY_BALLS);

    return (
        <div className="w-full max-w-lg mx-auto px-4">
            <div className=" px-4 py-3 ">
                <div
                    ref={containerRef}
                    className="flex items-center justify-center gap-2 overflow-x-auto overflow-y-hidden scroll-smooth"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {displayBalls.length === 0 ? (
                        <span className="text-xs text-gray-400">{EMPTY_STATE_TEXT}</span>
                    ) : (
                        displayBalls.map((ball, idx) => (
                            <BallChip key={idx} ball={ball} />
                        ))
                    )}
                </div>
                <style>{`
                    .scroll-smooth::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </div>
        </div>
    );
}