import React, { useRef, useEffect, useState } from 'react';

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
            {ball.label}
        </span>
    );
}

// Generate dummy ball data
const generateDummyBalls = () => {
    const ballLabels = ['0', '1', '2', '3', '4', '6', 'W', 'WB', 'NB'];
    const dummyBalls = [];
    
    // Generate 25 overs of dummy data
    for (let over = 0; over < 25; over++) {
        // Each over has 6 balls (some overs might have extras)
        const ballsInOver = Math.random() > 0.3 ? 6 : 6 + Math.floor(Math.random() * 3);
        
        for (let ball = 0; ball < ballsInOver; ball++) {
            const label = ballLabels[Math.floor(Math.random() * ballLabels.length)];
            const isWicket = label === 'W';
            const isExtra = label === 'WB' || label === 'NB';
            let runs = 0;
            
            if (label === 'W') runs = 0;
            else if (label === 'WB' || label === 'NB') runs = 1;
            else runs = parseInt(label) || 0;
            
            dummyBalls.push({
                over: over,
                label: label,
                runs: runs,
                isWicket: isWicket,
                isExtra: isExtra,
            });
        }
    }
    
    return dummyBalls;
};

// Sliding balls component with dummy data
export default function SlidingBalls({ balls: propBalls = [], useDummyData = true }) {
    const containerRef = useRef(null);
    const prevLength = useRef(0);
    const [balls, setBalls] = useState([]);

    // Initialize with dummy data if no props provided
    useEffect(() => {
        if (useDummyData && propBalls.length === 0) {
            setBalls(generateDummyBalls());
        } else {
            setBalls(propBalls);
        }
    }, [propBalls, useDummyData]);

    // Auto-scroll to show latest balls
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

    // Get last 30 balls for display
    const displayBalls = balls.filter(ball => ball && ball.label).slice(-30);

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