import { useState } from "react";
import { useParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  BetsTable,
  DeclaredSessionsTable,
  LiveReportLoader,
  OddsTable,
  RecentLiveMatches,
  ScorePanel,
  SessionTable,
} from "./live-report/components";
import { useLiveReportData } from "./live-report/hooks/useLiveReportData";

export default function MatchLiveReport() {
  const { id: matchId } = useParams();
  const [showMatchBets, setShowMatchBets] = useState(false);
  const {
    match,
    score,
    runners,
    bets,
    liveMatches,
    error,
    isInitialLoading,
    positions,
    runningSessions,
    declaredSessions,
  } = useLiveReportData(matchId);

  const matchBets = bets.filter((bet) => bet.marketType === "match");

  if (isInitialLoading) {
    return (
      <div className="min-h-full bg-(--color-bg-main) px-3 py-5 md:px-6">
        <LiveReportLoader />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-(--color-bg-main) px-3 py-5 text-(--color-text-dark) md:px-6">
      <Toaster position="top-center" />
      <div className="w-full space-y-4">
        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ScorePanel match={match} score={score} />
        <OddsTable runners={runners} positions={positions} />
        <SessionTable sessions={runningSessions} bets={bets} />
        <DeclaredSessionsTable sessions={declaredSessions} bets={bets} />
        <RecentLiveMatches
          matches={liveMatches}
          currentMatchId={matchId}
          onOpen={(nextMatchId) => {
            window.location.assign(
              `/superadmin/matches/${encodeURIComponent(nextMatchId)}/live-report`
            );
          }}
        />

        <button
          type="button"
          onClick={() => setShowMatchBets((visible) => !visible)}
          className="w-full cursor-pointer rounded-lg bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-(--color-btn-hover)"
        >
          {showMatchBets ? "Hide All Bets" : "Show All Bets"}
        </button>

        {showMatchBets && <BetsTable bets={matchBets} />}
      </div>
    </div>
  );
}
