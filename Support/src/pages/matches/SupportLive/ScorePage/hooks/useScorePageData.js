import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../../../../services/api";
import { MAX_BALLS } from "../utils/scoreCalculations";
import { getManualOptions } from "../../../../../services/manualOptionsService";

const API_BASE = apiClient.defaults.baseURL;

const initialScore = {
    firstBattingTeam: "",
    secondBattingTeam: "",
    currentInnings: 1,
    firstInningsScore: null,
    secondInningsScore: null,
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: [],
};

const mergeScore = (previous, next) => ({
    ...previous,
    ...next,
    currentInnings: next.currentInnings ?? previous.currentInnings,
    firstInningsScore: next.firstInningsScore ?? previous.firstInningsScore,
    secondInningsScore: next.secondInningsScore ?? previous.secondInningsScore,
    balls: Array.isArray(next.balls) ? next.balls.slice(-MAX_BALLS) : previous.balls,
});

export function useScorePageData(matchId) {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [scoreData, setScoreData] = useState(initialScore);
    const [marketStatus, setMarketStatus] = useState("OPEN");
    const [options, setOptions] = useState({ tossWinMessage: "", tossVisibility: "remove" });

    const fetchMatch = useCallback(async () => {
        if (!matchId) return;
        setLoading(true);
        setError("");
        try {
            const { data } = await apiClient.get(`/matches/saved/${matchId}`);
            setMatch(data.data || null);
        } catch (requestError) {
            setError(requestError.response?.data?.message || requestError.message || "Failed to fetch match");
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    const fetchScore = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await apiClient.get(`/manual/score/${matchId}`);
            if (data?.data) {
                setScoreData((previous) => mergeScore(previous, data.data));
                if (data.data.status) setSelectedStatus(data.data.status);
            }
        } catch (requestError) {
            console.error("Failed to fetch score:", requestError);
        }
    }, [matchId]);

    const fetchSettings = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await apiClient.get(`/manual/settings/${matchId}`);
            if (data?.data?.marketStatus) setMarketStatus(data.data.marketStatus);
        } catch (requestError) {
            console.error("Failed to fetch settings:", requestError);
        }
    }, [matchId]);

    const fetchOptions = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await getManualOptions(matchId);
            if (data?.data) setOptions(data.data);
        } catch (requestError) {
            console.error("Failed to fetch manual options:", requestError);
        }
    }, [matchId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMatch();
        fetchScore();
        fetchSettings();
        fetchOptions();
    }, [fetchMatch, fetchScore, fetchSettings, fetchOptions]);

    useEffect(() => {
        if (!matchId) return undefined;
        const eventSource = new EventSource(`${API_BASE}/manual/events?matchId=${matchId}`);

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.payload?.matchId !== matchId) return;
                if (parsed.type === "SCORE_UPDATED") {
                    setScoreData((previous) => mergeScore(previous, parsed.payload));
                    if (parsed.payload.status !== undefined) setSelectedStatus(parsed.payload.status);
                }
                if (parsed.type === "SETTINGS_UPDATED" && parsed.payload.marketStatus) {
                    setMarketStatus(parsed.payload.marketStatus);
                }
                if (parsed.type === "OPTIONS_UPDATED") {
                    setOptions(parsed.payload);
                }
            } catch (parseError) {
                console.error("Failed to parse SSE message:", parseError);
            }
        };
        eventSource.onerror = (connectionError) => console.error("SSE connection error:", connectionError);
        return () => eventSource.close();
    }, [matchId]);

    return {
        match,
        loading,
        error,
        selectedStatus,
        setSelectedStatus,
        scoreData,
        setScoreData,
        marketStatus,
        setMarketStatus,
        options,
    };
}
