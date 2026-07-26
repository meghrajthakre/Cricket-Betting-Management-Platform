import { useState, useEffect, useRef, useCallback } from "react";
import {
    getManualState,
    getManualSettings,
    getManualScore,
    getSessions,
    getManualOptions,
    getSSEUrl,
} from "../../../../api/userService";
import useHighlightedOdds from "./useHighlightedOdds";
import {
    nextScoreDataFromFetch,
    nextScoreDataFromSSE,
    nextScoreDataFromFullState,
    nextRunnersFromRunnerUpdate,
} from "../utils/manualScoreEvents";

const INITIAL_SCORE_DATA = {
    firstBattingTeam: "",
    secondBattingTeam: "",
    currentInnings: 1, // 1 = 1st inn live, 2 = 2nd inn live, 3 = match complete
    firstInningsScore: null, // { runs, wickets, overs } — frozen once 2nd inn starts
    secondInningsScore: null, // { runs, wickets, overs } — frozen once match complete
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: [], // ball-by-ball history: { over, label, runs, isWicket, isExtra, advanceBall }
};

const INITIAL_SETTINGS = {
    rateDiff: 1,
    betLock: false,
    sessionLock: false,
    mode: "Lagai",
    marketStatus: "OPEN",
};

const INITIAL_OPTIONS = {
    tossWinMessage: "",
    errorMessage: "",
    tossVisibility: "remove",
    tossResult: "",
    tossTeam: "",
    tieResult: "",
    matchMaxBet: 100000,
    sessionMaxBet: 100000,
};

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 2000;
const POLL_INTERVAL = 5000;

// Owns: runners, settings, scoreStatus, scoreData, loading, error,
// sseConnected, and highlightedOdds — plus the initial fetch + SSE
// connection/reconnect/poll-fallback lifecycle that keeps them in sync.
export default function useManualScoreboard(matchId) {
    const [runners, setRunners] = useState([]);
    const [settings, setSettings] = useState(INITIAL_SETTINGS);
    const [scoreStatus, setScoreStatus] = useState("");
    const [scoreData, setScoreData] = useState(INITIAL_SCORE_DATA);
    const [sessions, setSessions] = useState([]);
    const [options, setOptions] = useState(INITIAL_OPTIONS);
    const [sessionSettlementVersion, setSessionSettlementVersion] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sseConnected, setSseConnected] = useState(false);
    const { highlightedOdds, triggerHighlight } = useHighlightedOdds(1500);

    const esRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const sseConnectedRef = useRef(false);

    const fetchLatestData = useCallback(async () => {
        if (!matchId) return;

        try {
            const [stateRes, settingsRes, scoreRes, sessionsRes, optionsRes] = await Promise.all([
                getManualState(matchId).catch((err) => {
                    console.error("Failed to load state:", err);
                    return null;
                }),
                getManualSettings(matchId).catch((err) => {
                    console.error("Failed to load settings:", err);
                    return null;
                }),
                getManualScore(matchId).catch((err) => {
                    console.error("Failed to load score:", err);
                    return null;
                }),
                getSessions(matchId).catch((err) => {
                    console.error("Failed to load sessions:", err);
                    return null;
                }),
                getManualOptions(matchId).catch((err) => {
                    console.error("Failed to load match options:", err);
                    return null;
                }),
            ]);

            if (stateRes?.data) {
                setRunners(Array.isArray(stateRes.data) ? stateRes.data : []);
            }

            if (settingsRes?.data) {
                setSettings((prev) => ({ ...prev, ...settingsRes.data }));
            }

            if (scoreRes?.data) {
                setScoreData((prev) => nextScoreDataFromFetch(prev, scoreRes.data));
                if (scoreRes.data.status !== undefined) {
                    setScoreStatus(scoreRes.data.status);
                }
            }

            if (sessionsRes?.data?.sessions) {
                setSessions(sessionsRes.data.sessions);
            }

            if (optionsRes?.data) {
                setOptions((prev) => ({ ...prev, ...optionsRes.data }));
            }
        } catch (e) {
            console.error("Failed to fetch latest data:", e);
        }
    }, [matchId]);

    useEffect(() => {
        if (!matchId) {
            setLoading(false);
            setError("No match ID provided");
            return;
        }

        let cancelled = false;

        async function loadInitialData() {
            setLoading(true);
            setError(null);
            try {
                await fetchLatestData();
            } catch (e) {
                console.error("Failed to load initial data:", e);
                if (!cancelled) {
                    setError(e?.response?.data?.message || e.message || "Failed to load data");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadInitialData();

        const handleMessage = (evt) => {
            try {
                const parsed = JSON.parse(evt.data);
                console.log("SSE message received:", parsed);

                if (parsed.type === "RUNNER_UPDATED" && parsed.payload) {
                    triggerHighlight(parsed.payload.runnerId);
                    setRunners((prev) => nextRunnersFromRunnerUpdate(prev, parsed.payload));
                }

                if (parsed.type === "SETTINGS_UPDATED" && parsed.payload) {
                    console.log("Settings update received via SSE:", parsed.payload);
                    setSettings((prev) => {
                        const newSettings = { ...prev, ...parsed.payload };
                        console.log("Updated settings:", newSettings);
                        return newSettings;
                    });
                }

                if (parsed.type === "SCORE_UPDATED" && parsed.payload) {
                    console.log("Score update received via SSE:", parsed.payload);
                    setScoreData((prev) => nextScoreDataFromSSE(prev, parsed.payload));
                    if (parsed.payload.status !== undefined) {
                        setScoreStatus(parsed.payload.status);
                    }
                }

                if (parsed.type === "SESSION_UPDATED" && parsed.payload?.session) {
                    const updatedSession = parsed.payload.session;
                    setSessions((prev) => {
                        const exists = prev.some((session) => session.id === updatedSession.id);
                        return exists
                            ? prev.map((session) =>
                                session.id === updatedSession.id ? updatedSession : session
                            )
                            : [...prev, updatedSession];
                    });
                }

                if (parsed.type === "SESSIONS_UPDATED" && parsed.payload?.sessions) {
                    setSessions(parsed.payload.sessions);
                }

                if (parsed.type === "SESSION_SETTLED" && parsed.payload?.session) {
                    const settledSession = parsed.payload.session;
                    setSessions((prev) =>
                        prev.map((session) => session.id === settledSession.id ? settledSession : session)
                    );
                    setSessionSettlementVersion((current) => current + 1);
                }

                if (parsed.type === "OPTIONS_UPDATED" && parsed.payload) {
                    setOptions((prev) => ({ ...prev, ...parsed.payload }));
                }

                if (parsed.type === "STATE_UPDATED" && parsed.payload) {
                    console.log("Full state update received:", parsed.payload);
                    if (parsed.payload.runners) {
                        setRunners(parsed.payload.runners);
                    }
                    if (parsed.payload.settings) {
                        setSettings((prev) => ({ ...prev, ...parsed.payload.settings }));
                    }
                    if (parsed.payload.score) {
                        setScoreData((prev) => nextScoreDataFromFullState(prev, parsed.payload.score));
                        if (parsed.payload.score.status) {
                            setScoreStatus(parsed.payload.score.status);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to parse SSE event:", err);
            }
        };

        const connectSSE = () => {
            try {
                const es = new EventSource(getSSEUrl(matchId), { withCredentials: true });
                esRef.current = es;

                es.onopen = () => {
                    sseConnectedRef.current = true;
                    reconnectAttemptsRef.current = 0;
                    setSseConnected(true);
                    setError(null);
                };

                es.onmessage = handleMessage;

                es.onerror = (err) => {
                    console.error("SSE connection error:", err);
                    sseConnectedRef.current = false;
                    setSseConnected(false);

                    if (esRef.current) {
                        esRef.current.close();
                    }

                    const currentAttempt = reconnectAttemptsRef.current + 1;

                    if (currentAttempt <= MAX_RECONNECT_ATTEMPTS) {
                        reconnectAttemptsRef.current = currentAttempt;
                        const delay = RECONNECT_BASE_DELAY * Math.pow(1.5, currentAttempt - 1);
                        console.log(`Reconnecting in ${delay}ms (attempt ${currentAttempt}/${MAX_RECONNECT_ATTEMPTS})`);

                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }

                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (!cancelled) {
                                connectSSE();
                            }
                        }, delay);
                    } else {
                        setError("Unable to establish live connection. Please refresh the page.");
                    }
                };
            } catch (err) {
                console.error("Failed to establish SSE connection:", err);
                setError("Failed to connect to live updates");
            }
        };

        connectSSE();

        const pollInterval = setInterval(() => {
            if (!sseConnectedRef.current && !cancelled) {
                console.log("Polling for updates...");
                fetchLatestData();
            }
        }, POLL_INTERVAL);

        return () => {
            cancelled = true;
            sseConnectedRef.current = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (esRef.current) {
                esRef.current.close();
            }
            clearInterval(pollInterval);
        };
    }, [matchId, fetchLatestData, triggerHighlight]);

    return {
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
        sessionSettlementVersion,
        fetchLatestData,
    };
}
