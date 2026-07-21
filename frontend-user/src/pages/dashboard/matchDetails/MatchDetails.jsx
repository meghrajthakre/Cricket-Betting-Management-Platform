import { useParams } from "react-router-dom";
import useSavedMatch from "./hooks/useSavedMatch";
import useManualScoreboard from "./hooks/useManualScoreboard.js";
import ScoreHeader from "./ScoreHeader.jsx";
import OddsMarket from "./Oddsmarket.jsx";
import SessionMarket from "./Sessionmarket.jsx";
import LoadingState from "./LoadingState.jsx";
import ErrorState from "./ErrorState.jsx";
import { MOCK_DATA } from "./mockData.js";
import MatchMessages from "./MatchMessages.jsx";

export default function MatchDetails() {
    const { matchId } = useParams();

    const savedMatch = useSavedMatch(matchId);
    const {
        runners,
        sessions,
        options,
        settings,
        scoreStatus,
        scoreData,
        highlightedOdds,
        loading,
        error,
        sseConnected,
        fetchLatestData,
    } = useManualScoreboard(matchId);

    const handlePlaceBet = (sessionName, type, rate) => {
        if (settings.sessionLock) {
            console.log("Session is locked, bet blocked:", sessionName);
            return;
        }
        console.log(`Bet placed: ${sessionName} - ${type} @ ${rate}`);
    };

    if (!matchId) {
        return (
            <div className="flex items-center justify-center h-40 bg-[#E8EDF3]">
                <p className="text-[#d23131] font-semibold">
                    No matchId found in the URL.
                </p>
            </div>
        );
    }

    if (loading && runners.length === 0) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState error={error} onRetry={() => window.location.reload()} />;
    }

    const visibleSessions = sessions.filter((session) => session.isVisible);

    const match = {
        ...MOCK_DATA.match,
        ...(savedMatch && {
            team1: savedMatch.homeTeam,
            team2: savedMatch.awayTeam,
        }),
    };

    return (
        <div className="bg-[#E8EDF3] min-h-screen">
            <div className="max-w-4xl mx-auto px-2 py-2 ">
                <ScoreHeader
                    sseConnected={sseConnected}
                    matchId={matchId}
                    onRefresh={fetchLatestData}
                    match={match}
                    tossMessage={options.tossVisibility !== "remove" ? options.tossWinMessage : ""}
                    chaseBalls={options.balls}
                    revisedTarget={options.newTarget}
                    settings={settings}
                    scoreStatus={scoreStatus}
                    balls={scoreData.balls}
                    firstBattingTeam={scoreData.firstBattingTeam}
                    secondBattingTeam={scoreData.secondBattingTeam}
                    currentInnings={scoreData.currentInnings}
                    firstInningsScore={scoreData.firstInningsScore}
                    secondInningsScore={scoreData.secondInningsScore}
                    runs={scoreData.runs}
                    wickets={scoreData.wickets}
                    overs={scoreData.overs}
                />

                <MatchMessages options={options} />

                <OddsMarket
                    runners={runners}
                    teamNames={[match.team1, match.team2]}
                    settings={settings}
                    highlightedOdds={highlightedOdds}
                    maxBet={options.matchMaxBet}
                />

                <SessionMarket
                    sessions={visibleSessions}
                    settings={settings}
                    onPlaceBet={handlePlaceBet}
                    maxBet={options.sessionMaxBet}
                />

            </div>
        </div>
    );
}
