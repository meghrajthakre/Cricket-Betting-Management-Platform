export default function LoadingState() {
    return (
        <div className="min-h-screen bg-[#E8EDF3]" aria-label="Loading match details" aria-busy="true">
            <div className="max-w-4xl mx-auto px-2 py-2 animate-pulse">
                <div className="rounded-xl bg-white border border-[#CDD9E5] overflow-hidden mb-2">
                    <div className="h-9 bg-[#D7E0EA]" />
                    <div className="p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="h-5 w-28 rounded bg-[#D7E0EA]" />
                            <div className="h-10 w-24 rounded-lg bg-[#C7D4E2]" />
                            <div className="h-5 w-28 rounded bg-[#D7E0EA]" />
                        </div>
                        <div className="h-4 w-40 rounded bg-[#E1E7EE] mx-auto mt-4" />
                    </div>
                </div>

                <div className="rounded-xl bg-white border border-[#CDD9E5] overflow-hidden mb-2">
                    <div className="h-9 bg-[#D7E0EA]" />
                    {[1, 2].map((row) => (
                        <div key={row} className="grid grid-cols-3 gap-3 p-3 border-t border-[#E1E7EE]">
                            <div className="h-7 rounded bg-[#E1E7EE]" />
                            <div className="h-7 rounded bg-[#C7D4E2]" />
                            <div className="h-7 rounded bg-[#E1E7EE]" />
                        </div>
                    ))}
                </div>

                <div className="rounded-xl bg-white border border-[#CDD9E5] p-3">
                    <div className="h-8 rounded bg-[#D7E0EA] mb-3" />
                    {[1, 2, 3].map((row) => (
                        <div key={row} className="flex gap-3 mb-2 last:mb-0">
                            <div className="h-7 flex-1 rounded bg-[#E1E7EE]" />
                            <div className="h-7 w-20 rounded bg-[#C7D4E2]" />
                            <div className="h-7 w-20 rounded bg-[#D7E0EA]" />
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs text-[#60758A] mt-4">Loading live match data...</p>
            </div>
        </div>
    );
}
