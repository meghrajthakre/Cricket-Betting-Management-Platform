export default function ErrorState({ error, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center h-40 bg-[#E8EDF3] gap-4">
            <p className="text-[#d23131] font-semibold">Error: {error}</p>
            <button
                onClick={onRetry}
                className="bg-[#4B75B8] text-white px-4 py-2 rounded hover:bg-[#1E3A5F] transition-colors"
            >
                Retry
            </button>
        </div>
    );
}
