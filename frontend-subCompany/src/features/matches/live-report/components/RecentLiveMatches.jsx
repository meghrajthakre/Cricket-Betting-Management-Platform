export default function RecentLiveMatches({ matches, currentMatchId, onOpen }) {
  const recentMatches = matches
    .filter((item) => item.matchId && item.matchId !== currentMatchId)
    .slice(0, 6);

  return (
    <section className="overflow-hidden rounded-lg border border-(--color-border) bg-white shadow-sm">
      <div className="bg-(--color-banner) px-4 py-2 text-center text-sm font-bold text-white">
        Recent Live Matches
      </div>
      {recentMatches.length ? (
        <div className="divide-y divide-gray-200">
          {recentMatches.map((item) => (
            <button
              key={item.matchId}
              type="button"
              onClick={() => onOpen(item.matchId)}
              className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-3 px-3 py-3 text-left hover:bg-blue-50 sm:px-5"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-gray-900 sm:text-sm">
                  {item.homeTeam} vs {item.awayTeam}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-gray-500 sm:text-xs">
                  {item.sportTitle || item.sportKey || "Cricket"}
                </span>
              </span>
              <span
                className={`whitespace-nowrap text-[10px] font-bold uppercase sm:text-xs ${
                  item.isLive ? "text-green-600" : "text-gray-500"
                }`}
              >
                {item.isLive ? "Live" : "Recent"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-xs text-gray-400">
          Abhi koi aur live match available nahi hai.
        </p>
      )}
    </section>
  );
}
