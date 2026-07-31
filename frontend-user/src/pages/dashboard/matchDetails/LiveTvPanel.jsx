import { Tv, X } from "lucide-react";
import { useState } from "react";

export default function LiveTvPanel() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {isOpen ? (
                <section className="mb-2 overflow-hidden rounded border border-[#B8C7D8] bg-white shadow-sm">
                    <div className="flex items-center justify-between bg-[#1E3A5F] px-3 py-2 text-white">
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <Tv aria-hidden="true" size={17} />
                            <span>Live TV</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex h-7 w-7 items-center justify-center rounded text-white/80 transition hover:bg-white/10 hover:text-white"
                            aria-label="Close live TV"
                            title="Close"
                        >
                            <X aria-hidden="true" size={17} />
                        </button>
                    </div>
                    <div className="flex aspect-video w-full items-center justify-center bg-[#07182A] text-center text-sm font-semibold text-white/65">
                        Live stream unavailable
                    </div>
                </section>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-[#1E3A5F] text-white shadow-lg transition hover:bg-[#294f79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4E9BD1] focus-visible:ring-offset-2 active:scale-95 sm:bottom-6 sm:right-6"
                    aria-label="Open live TV"
                    title="Open live TV"
                >
                    <Tv aria-hidden="true" size={22} strokeWidth={2} />
                </button>
            )}
        </>
    );
}
