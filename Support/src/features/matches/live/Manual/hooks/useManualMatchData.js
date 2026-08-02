import { useCallback, useEffect, useState } from "react";
import apiClient from "../../../../../shared/api/apiClient";
import { getManualOptions } from "../../../api/manualOptionsApi";

const MAX_BALLS = 10;

export function useManualMatchData(matchId) {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [scoreData, setScoreData] = useState({
        firstBattingTeam: "",
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: [],
    });
    const [selectedStatus, setSelectedStatus] = useState("");
    const [marketStatus, setMarketStatus] = useState("OPEN");
    const [manualSettings, setManualSettings] = useState(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
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
            if (!data?.data) return;

            setScoreData((previous) => ({
                ...previous,
                ...data.data,
                balls: Array.isArray(data.data.balls)
                    ? data.data.balls.slice(-MAX_BALLS)
                    : previous.balls,
            }));
            if (data.data.status) setSelectedStatus(data.data.status);
        } catch (requestError) {
            console.error("Failed to fetch score:", requestError);
        }
    }, [matchId]);

    const fetchSettings = useCallback(async () => {
        if (!matchId) return;
        try {
            const { data } = await apiClient.get(`/manual/settings/${matchId}`);
            setManualSettings(data?.data || null);
            if (data?.data?.marketStatus) setMarketStatus(data.data.marketStatus);
        } catch (requestError) {
            console.error("Failed to fetch settings:", requestError);
        } finally {
            setSettingsLoaded(true);
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
        // These memoized functions start the page's initial async data load.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMatch();
        fetchScore();
        fetchSettings();
        fetchOptions();
    }, [fetchMatch, fetchScore, fetchSettings, fetchOptions]);

    return {
        match,
        setMatch,
        loading,
        error,
        scoreData,
        setScoreData,
        selectedStatus,
        setSelectedStatus,
        marketStatus,
        setMarketStatus,
        manualSettings,
        setManualSettings,
        settingsLoaded,
        options,
        setOptions,
    };
}
