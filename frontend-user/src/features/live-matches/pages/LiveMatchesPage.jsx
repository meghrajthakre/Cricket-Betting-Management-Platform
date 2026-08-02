import MatchCard from "../components/MatchCard";
import MatchSkeleton from "../components/MatchSkeleton";
import { EmptyState, ErrorState } from "../components/LiveStates";
import useTodayMatches from "../hooks/useTodayMatches";
import { groupMatchesByDate } from "../utils/matchUtils";

export default function Live() {
  const { matches, loading, error, lastFetched } = useTodayMatches();
  const groupedMatches = groupMatchesByDate(matches);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-main)", fontFamily: "var(--font-nunito)" }}>
      <div style={{ padding: "16px 12px", maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", color: "var(--color-text-dark)", opacity: 0.35, fontFamily: "var(--font-nunito)" }}>
            {lastFetched
              ? `Updated ${lastFetched.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Fetching..."}
          </span>
        </div>

        {loading && matches.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[1, 2, 3].map((item) => <MatchSkeleton key={item} />)}
          </div>
        )}

        {!loading && error && <ErrorState message={error} />}
        {!loading && !error && matches.length === 0 && <EmptyState />}

        {!loading && !error && Object.entries(groupedMatches).map(([dateLabel, groupMatches]) => (
          <div key={dateLabel} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontFamily: "var(--font-rajdhani)", fontWeight: "700", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: "var(--color-primary)", whiteSpace: "nowrap" }}>
                {dateLabel}
              </span>
              <span style={{ flex: 1, height: "1px", backgroundColor: "var(--color-border)" }} />
            </div>
            {groupMatches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
