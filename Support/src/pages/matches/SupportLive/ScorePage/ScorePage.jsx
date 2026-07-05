import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import ScoreHeader from "./ScoreHeader";
import ScoreOdds from "./ScoreOdds";
import { apiClient } from "../../../../services/api";
import ScoreButtons from "./ScoreButtons";
import Controls from "./Controls";

export default function ScorePage() {
    const { matchId } = useParams();

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    const fetchMatch = useCallback(async () => {
        if (!matchId) return;
        setLoading(true);
        setError("");
        try {
            const { data } = await apiClient.get(`/matches/saved/${matchId}`);
            setMatch(data.data || null);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to fetch match");
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        fetchMatch();
    }, [fetchMatch]);

    const team1 = match?.homeTeam || "";
    const team2 = match?.awayTeam || "";

    const runners = match
        ? [
            { name: team1, lagai: match.odds?.minRate ?? "", khai: match.odds?.maxRate ?? "" },
            { name: team2, lagai: match.odds?.minRate ?? "", khai: match.odds?.maxRate ?? "" },
        ]
        : [];

    const handleStatusSelect = (label) => {
        setSelectedStatus(label);
        // Optional: send this to the backend as the live match status
        // apiClient.post(`/matches/saved/${matchId}/status`, { status: label });
        console.log("Selected:", label);
    };

    return (
        <div className="min-h-screen bg-[#f0f0f0] flex justify-center py-6 px-3">
            <div className="w-full max-w-3xl">
                {loading && (
                    <div className="text-center text-gray-400 py-10">Loading match...</div>
                )}

                {!loading && error && (
                    <div className="text-center text-red-500 py-10">{error}</div>
                )}

                {!loading && !error && match && (
                    <>
                        <ScoreHeader
                            team1={team1}
                            team2={team2}
                            team1Score={match?.team1Score || ""}
                            team2Score={match?.team2Score || ""}
                            scoreText={selectedStatus || match?.status || ""}
                        />
                        <ScoreOdds runners={runners} />

                        {/* Footer bar */}
                        <div className="mt-3 bg-[#4f6a9c] text-white font-bold text-center text-sm sm:text-base py-3 rounded-sm">
                            Match Score &amp; Status
                        </div>

                        <ScoreButtons selected={selectedStatus} onSelect={handleStatusSelect} />
                        <Controls teams={[team1, team2]} onAction={(action) => console.log("Control action:", action)} />
                    </>
                )}
            </div>
        </div>
    );
}