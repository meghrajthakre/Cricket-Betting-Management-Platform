import { useParams } from "react-router-dom";
import Controls from "./Controls";
import ScoreButtons from "./ScoreButtons";
import ScoreHeader from "./ScoreHeader";
import SlidingBalls from "./SlidingBalls";
import { useScoreActions } from "./hooks/useScoreActions";
import { useScorePageData } from "./hooks/useScorePageData";

export default function ScorePage() {
    const { matchId } = useParams();
    const pageData = useScorePageData(matchId);
    const actions = useScoreActions({
        matchId,
        scoreData: pageData.scoreData,
        setScoreData: pageData.setScoreData,
        setSelectedStatus: pageData.setSelectedStatus,
        setMarketStatus: pageData.setMarketStatus,
    });

    const team1 = pageData.match?.homeTeam || "";
    const team2 = pageData.match?.awayTeam || "";
    const scoreText = pageData.selectedStatus || pageData.match?.status || "";

    return (
        <div className="min-h-screen bg-[#f0f0f0] flex justify-center py-12 px-3">
            <div className="w-full max-w-3xl">
                {pageData.loading && (
                    <div className="text-center text-gray-400 py-10">Loading match...</div>
                )}

                {!pageData.loading && pageData.error && (
                    <div className="text-center text-red-500 py-10">{pageData.error}</div>
                )}

                {!pageData.loading && !pageData.error && pageData.match && (
                    <>
                        <SlidingBalls balls={pageData.scoreData.balls || []} />
                        <ScoreHeader
                            team1={team1}
                            team2={team2}
                            team1Score={pageData.match.team1Score || ""}
                            team2Score={pageData.match.team2Score || ""}
                            firstBattingTeam={pageData.scoreData.firstBattingTeam}
                            secondBattingTeam={pageData.scoreData.secondBattingTeam}
                            currentInnings={pageData.scoreData.currentInnings || 1}
                            firstInningsScore={pageData.scoreData.firstInningsScore}
                            secondInningsScore={pageData.scoreData.secondInningsScore}
                            runs={pageData.scoreData.runs}
                            wickets={pageData.scoreData.wickets}
                            overs={pageData.scoreData.overs}
                            marketStatus={pageData.marketStatus}
                            scoreText={scoreText}
                            tossMessage={pageData.options.tossVisibility !== "remove" ? pageData.options.tossWinMessage : ""}
                            chaseBalls={pageData.options.balls}
                            revisedTarget={pageData.options.newTarget}
                        />
                        <ScoreButtons selected={pageData.selectedStatus} onSelect={actions.handleStatusSelect} />
                        <Controls teams={[team1, team2]} onAction={actions.handleAction} />
                    </>
                )}
            </div>
        </div>
    );
}
