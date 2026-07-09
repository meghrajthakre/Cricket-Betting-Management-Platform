import React, { useRef, useEffect } from 'react';

// Short display label + full label (used as tooltip)
function getShortLabel(ball) {
    if (ball.isWicket) return "W";
    if (ball.isExtra) {
        const upper = (ball.label || "").toUpperCase();
        if (upper.includes("WIDE")) return "Wd";
        if (upper.includes("NO BALL") || upper.includes("NB")) return "Nb";
        return "Ex";
    }
    return String(ball.runs ?? 0);
}

// Ball chip component for individual balls
function BallChip({ ball }) {
    const getStyle = () => {
        if (ball.isWicket) return "bg-[#b3261e] text-white border-[#b3261e]";
        if (ball.isExtra) return "bg-[#c9861a] text-white border-[#c9861a]";
        if (ball.runs === 4 || ball.runs === 6) return "bg-[#2f7a34] text-white border-[#2f7a34]";
        if (ball.runs === 0) return "bg-gray-200 text-[#3a4a63] border-gray-300";
        return "bg-[#4a80a0] text-white border-[#4a80a0]";
    };

    return (
        <span
            className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full border-2 text-xs font-bold ${getStyle()}`}
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

    // Get last 10 balls for display
    const displayBalls = balls.filter(ball => ball && ball.label).slice(-10);

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
                        <span className="text-xs text-gray-400">No balls bowled yet</span>
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