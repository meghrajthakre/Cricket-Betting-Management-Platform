import { useState } from "react";
import { useParams } from "react-router-dom";
import MatchHeader from "./MatchHeader";
import RunnerTable from "./RunnerTable";
import SessionTable from "./SessionTable";
import Controls from "./Controls";
import SessionManagement from "./SessionManagement";
import { useManualEvents } from "./hooks/useManualEvents";
import { useManualMatchData } from "./hooks/useManualMatchData";
import { useManualSessions } from "./hooks/useManualSessions";

export default function ManualPage() {
    const { matchId } = useParams();
    const [rateDiff, setRateDiff] = useState(1);

    const matchData = useManualMatchData(matchId);
    const sessionData = useManualSessions(matchId);

    useManualEvents(matchId, {
        setMatch: matchData.setMatch,
        setScoreData: matchData.setScoreData,
        setSelectedStatus: matchData.setSelectedStatus,
        setManualSettings: matchData.setManualSettings,
        setMarketStatus: matchData.setMarketStatus,
        setOptions: matchData.setOptions,
        setSessions: sessionData.setSessions,
    });

    const team1 = matchData.match?.homeTeam || "";
    const team2 = matchData.match?.awayTeam || "";
    const visibleSessions = sessionData.sessions.filter((session) => session.isVisible);

    const getScoreText = () => {
        if (matchData.selectedStatus) return matchData.selectedStatus;
        if (matchData.scoreData.firstBattingTeam) {
            return `${matchData.scoreData.runs}/${matchData.scoreData.wickets} (${Number(matchData.scoreData.overs).toFixed(1)})`;
        }
        return matchData.match?.status || "";
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-sm">
            <div className="max-w-5xl mx-auto py-6 px-4">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-1 md:p-6">
                    {matchData.loading && (
                        <div className="text-center text-gray-400 py-10">Loading match...</div>
                    )}

                    {!matchData.loading && matchData.error && (
                        <div className="text-center text-red-500 py-10">{matchData.error}</div>
                    )}

                    {!matchData.loading && !matchData.error && (
                        <>
                            <MatchHeader
                                match={matchData.match}
                                team1={team1}
                                team2={team2}
                                firstBattingTeam={matchData.scoreData.firstBattingTeam}
                                secondBattingTeam={matchData.scoreData.secondBattingTeam}
                                currentInnings={matchData.scoreData.currentInnings}
                                firstInningsScore={matchData.scoreData.firstInningsScore}
                                runs={matchData.scoreData.runs}
                                wickets={matchData.scoreData.wickets}
                                overs={matchData.scoreData.overs}
                                marketStatus={matchData.marketStatus}
                                scoreText={getScoreText()}
                                balls={matchData.scoreData.balls || []}
                                tossMessage={matchData.options.tossVisibility !== "remove" ? matchData.options.tossWinMessage : ""}
                                chaseBalls={matchData.options.balls}
                                revisedTarget={matchData.options.newTarget}
                            />
                            <RunnerTable rateDiff={rateDiff} match={matchData.match} />
                            <SessionTable
                                sessions={visibleSessions}
                                onUpdateStatus={sessionData.handleSessionStatus}
                                onSuspendAll={() => sessionData.updateAllStatuses("suspend")}
                                onOpenAll={() => sessionData.updateAllStatuses("open")}
                                pendingFields={sessionData.pendingFields}
                                bulkPending={sessionData.bulkSessionPending}
                            />
                            <Controls
                                setRateDiff={setRateDiff}
                                initialSettings={matchData.manualSettings}
                                settingsLoaded={matchData.settingsLoaded}
                            />
                            <SessionManagement
                                sessions={sessionData.sessions}
                                loading={sessionData.sessionsLoading}
                                error={sessionData.sessionsError}
                                pendingFields={sessionData.pendingFields}
                                onToggleVisible={sessionData.handleSessionVisibility}
                                onUpdateField={sessionData.handleSessionField}
                                onReverseSettlement={sessionData.handleReverseSettlement}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
