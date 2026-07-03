export default function EvenOddMarket({ evenOdd }) {
    return (
        <div className="bg-white mt-2 rounded shadow-sm overflow-hidden mb-4">
            <div className="bg-[#4B75B8] px-3 py-2">
                <p className="text-white text-sm font-semibold font-rajdhani">
                    Market : {evenOdd.market}
                </p>
            </div>

            <div className="grid grid-cols-3 bg-[#1E3A5F] text-white text-xs font-bold font-rajdhani px-3 py-1.5 tracking-wider">
                <div>RUNNER</div>
                <div className="text-center">RATE</div>
                <div className="text-right">POSITION</div>
            </div>

            {evenOdd.runners.map((r, i) => (
                <div
                    key={i}
                    className="grid grid-cols-3 items-center px-3 py-2 border-b border-[#CDD9E5] last:border-0"
                >
                    <div
                        className={`text-sm font-semibold rounded px-2 py-0.5 w-fit ${r.name === "Even"
                            ? "bg-[#5aab6e] text-white"
                            : "text-[#1A2B3C]"
                            }`}
                    >
                        {r.name}
                    </div>
                    <div className="flex justify-center">
                        <button className="bg-[#a8cce8] hover:bg-[#7fb3d9] transition-colors rounded px-4 py-1 text-sm font-bold text-[#1A2B3C] font-rajdhani">
                            {r.rate.toFixed(2)}
                        </button>
                    </div>
                    <div className="text-right text-sm font-semibold text-[#1A2B3C]">
                        {r.position}
                    </div>
                </div>
            ))}
        </div>
    );
}
