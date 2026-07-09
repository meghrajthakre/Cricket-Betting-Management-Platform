import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import MatchHeader from "./MatchHeader";
import RunnerTable from "./RunnerTable";
import SessionTable from "./SessionTable";
import Controls from "./Controls";
import SessionManagement from "./SessionManagement";
import { apiClient } from "../../../../services/api"; 
import { C, MATCH } from "./constants";

// Base URL used for the raw EventSource connection
const API_BASE = apiClient.defaults.baseURL;

// Only the last N balls are kept in history / displayed.
const MAX_BALLS = 10;

export default function ManualPage() {
    const { matchId } = useParams();
    const [rateDiff, setRateDiff] = useState(1);

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Score state for the manual page
    const [scoreData, setScoreData] = useState({
        firstBattingTeam: "",
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: [],
    });
    const [selectedStatus, setSelectedStatus] = useState("");
    const [marketStatus, setMarketStatus] = useState("OPEN");

    const eventSourceRef = useRef(null);

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

    // Fetch the current persisted score on load
    const fetchScore = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await apiClient.get(`/manual/score/${matchId}`);
            if (data?.data) {
                setScoreData((prev) => ({
                    ...prev,
                    ...data.data,
                    balls: Array.isArray(data.data.balls)
                        ? data.data.balls.slice(-MAX_BALLS)
                        : prev.balls,
                }));
                if (data.data.status) {
                    setSelectedStatus(data.data.status);
                }
            }
        } catch (err) {
            console.error("Failed to fetch score:", err);
        }
    }, [matchId]);

    // Fetch settings for marketStatus
    const fetchSettings = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await apiClient.get(`/manual/settings/${matchId}`);
            if (data?.data?.marketStatus) {
                setMarketStatus(data.data.marketStatus);
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        }
    }, [matchId]);

    useEffect(() => {
        fetchMatch();
        fetchScore();
        fetchSettings();
    }, [fetchMatch, fetchScore, fetchSettings]);

    // Subscribe to SSE for live score/status/settings updates
    useEffect(() => {
        if (!matchId) return;

        const es = new EventSource(`${API_BASE}/manual/events?matchId=${matchId}`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);

                if (parsed.type === "SCORE_UPDATED" && parsed.payload?.matchId === matchId) {
                    setScoreData((prev) => ({
                        ...prev,
                        ...parsed.payload,
                        balls: Array.isArray(parsed.payload.balls)
                            ? parsed.payload.balls.slice(-MAX_BALLS)
                            : prev.balls,
                    }));
                    if (parsed.payload.status !== undefined) {
                        setSelectedStatus(parsed.payload.status);
                    }
                }

                if (parsed.type === "SETTINGS_UPDATED" && parsed.payload?.matchId === matchId) {
                    if (parsed.payload.marketStatus) {
                        setMarketStatus(parsed.payload.marketStatus);
                    }
                }

                // Also handle match updates if needed
                if (parsed.type === "MATCH_UPDATED" && parsed.payload?.matchId === matchId) {
                    setMatch((prev) => ({ ...prev, ...parsed.payload }));
                }
            } catch (err) {
                console.error("Failed to parse SSE message:", err);
            }
        };

        es.onerror = (err) => {
            console.error("SSE connection error:", err);
            // Optionally attempt to reconnect after a delay
            setTimeout(() => {
                if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
                    eventSourceRef.current = new EventSource(`${API_BASE}/manual/events?matchId=${matchId}`);
                }
            }, 3000);
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [matchId]);

    const team1 = match?.homeTeam || "";
    const team2 = match?.awayTeam || "";

    // Determine what to show in the middle badge
    const getScoreText = () => {
        if (selectedStatus) {
            return selectedStatus;
        }
        if (scoreData.firstBattingTeam) {
            return `${scoreData.runs}/${scoreData.wickets} (${Number(scoreData.overs).toFixed(1)})`;
        }
        return match?.status || "";
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-sm">
            <div className="max-w-5xl mx-auto py-6 px-4">
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-1 md:p-6">
                    {loading && (
                        <div className="text-center text-gray-400 py-10">Loading match...</div>
                    )}

                    {!loading && error && (
                        <div className="text-center text-red-500 py-10">{error}</div>
                    )}

                    {!loading && !error && (
                        <>

                            <MatchHeader 
                                match={match}
                                team1={team1}
                                team2={team2}
                                firstBattingTeam={scoreData.firstBattingTeam}
                                runs={scoreData.runs}
                                wickets={scoreData.wickets}
                                overs={scoreData.overs}
                                marketStatus={marketStatus}
                                scoreText={getScoreText()}
                                balls={scoreData.balls || []}
                            />
                            <RunnerTable rateDiff={rateDiff} match={match} />
                            <SessionTable match={match} />
                            <Controls rateDiff={rateDiff} setRateDiff={setRateDiff} />
                            <SessionManagement match={match} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}