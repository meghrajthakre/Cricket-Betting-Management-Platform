import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getManualState, getManualSettings, getManualScore, getSSEUrl, getSavedMatchById } from "../../../api/userService";
import ScoreHeader from "./ScoreHeader.jsx";
import OddsMarket from "./Oddsmarket.jsx";
import SessionMarket from "./Sessionmarket.jsx";
import LoadingState from "./LoadingState.jsx";
import ErrorState from "./ErrorState.jsx";
import SettingsDebug from "./SettingsDebug.jsx";
import { MOCK_DATA } from "./mockData.js";

export default function MatchDetails() {
    const { matchId } = useParams();

    const [runners, setRunners] = useState([]);
    const [settings, setSettings] = useState({
        rateDiff: 1,
        betLock: false,
        sessionLock: false,
        mode: "Lagai",
        marketStatus: "OPEN",
    });

    // Live match status set via the manual ScoreButtons (e.g. "OUT", "6 RUN", "Not Out")
    const [scoreStatus, setScoreStatus] = useState("");

    // Dynamic match info (team names) pulled from the saved-match API.
    const [savedMatch, setSavedMatch] = useState(null);

    // Real score data from the API
    const [scoreData, setScoreData] = useState({
        firstBattingTeam: "",
        secondBattingTeam: "",
        currentInnings: 1, // 1 = 1st inn live, 2 = 2nd inn live, 3 = match complete
        firstInningsScore: null, // { runs, wickets, overs } — frozen once 2nd inn starts
        secondInningsScore: null, // { runs, wickets, overs } — frozen once match complete
        runs: 0,
        wickets: 0,
        overs: 0,
    });

    const [highlightedOdds, setHighlightedOdds] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sseConnected, setSseConnected] = useState(false);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const esRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const highlightTimeoutRef = useRef(null);

    // Fetch the saved match (home/away teams) once per matchId.
    useEffect(() => {
        if (!matchId) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await getSavedMatchById(matchId);
                if (!cancelled) setSavedMatch(res?.data || null);
            } catch (err) {
                console.error("Failed to load saved match:", err?.response?.data || err.message);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [matchId]);

    const fetchLatestData = useCallback(async () => {
        if (!matchId) return;

        try {
            const [stateRes, settingsRes, scoreRes] = await Promise.all([
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
            ]);

            if (stateRes?.data) {
                const data = stateRes.data;
                setRunners(Array.isArray(data) ? data : []);
            }

            if (settingsRes?.data) {
                setSettings((prev) => ({ ...prev, ...settingsRes.data }));
            }

            if (scoreRes?.data) {
                // Update score data
                setScoreData((prev) => ({
                    ...prev,
                    firstBattingTeam: scoreRes.data.firstBattingTeam || "",
                    secondBattingTeam: scoreRes.data.secondBattingTeam || "",
                    currentInnings: scoreRes.data.currentInnings ?? prev.currentInnings,
                    firstInningsScore: scoreRes.data.firstInningsScore ?? prev.firstInningsScore,
                    secondInningsScore: scoreRes.data.secondInningsScore ?? prev.secondInningsScore,
                    runs: scoreRes.data.runs || 0,
                    wickets: scoreRes.data.wickets || 0,
                    overs: scoreRes.data.overs || 0,
                }));
                if (scoreRes.data.status !== undefined) {
                    setScoreStatus(scoreRes.data.status);
                }
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
                    setError(
                        e?.response?.data?.message || e.message || "Failed to load data"
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadInitialData();

        const connectSSE = () => {
            try {
                const sseUrl = getSSEUrl(matchId);

                const es = new EventSource(sseUrl, {
                    withCredentials: true,
                });
                esRef.current = es;

                es.onopen = () => {
                    setSseConnected(true);
                    setReconnectAttempts(0);
                    setError(null);
                };

                es.onmessage = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.data);
                        console.log("SSE message received:", parsed);

                        if (parsed.type === "RUNNER_UPDATED" && parsed.payload) {
                            const { runnerId, runnerName, lagai, khai, status } =
                                parsed.payload;

                            setHighlightedOdds((prev) => ({
                                ...prev,
                                [runnerId]: { lagai: true, khai: true },
                            }));

                            if (highlightTimeoutRef.current) {
                                clearTimeout(highlightTimeoutRef.current);
                            }
                            highlightTimeoutRef.current = setTimeout(() => {
                                setHighlightedOdds({});
                            }, 1500);

                            setRunners((prev) => {
                                const idx = prev.findIndex((r) => r.runnerId === runnerId);
                                if (idx === -1) {
                                    return [
                                        ...prev,
                                        { runnerId, runnerName, lagai, khai, status },
                                    ];
                                }
                                const next = [...prev];
                                next[idx] = { ...next[idx], runnerName, lagai, khai, status };
                                return next;
                            });
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
                            // Update score data from SSE
                            setScoreData((prev) => ({
                                ...prev,
                                firstBattingTeam: parsed.payload.firstBattingTeam ?? prev.firstBattingTeam,
                                secondBattingTeam: parsed.payload.secondBattingTeam ?? prev.secondBattingTeam,
                                currentInnings: parsed.payload.currentInnings ?? prev.currentInnings,
                                firstInningsScore: parsed.payload.firstInningsScore ?? prev.firstInningsScore,
                                secondInningsScore: parsed.payload.secondInningsScore ?? prev.secondInningsScore,
                                runs: parsed.payload.runs !== undefined ? parsed.payload.runs : prev.runs,
                                wickets: parsed.payload.wickets !== undefined ? parsed.payload.wickets : prev.wickets,
                                overs: parsed.payload.overs !== undefined ? parsed.payload.overs : prev.overs,
                            }));
                            if (parsed.payload.status !== undefined) {
                                setScoreStatus(parsed.payload.status);
                            }
                        }

                        if (parsed.type === "STATE_UPDATED" && parsed.payload) {
                            console.log("Full state update received:", parsed.payload);
                            if (parsed.payload.runners) {
                                setRunners(parsed.payload.runners);
                            }
                            if (parsed.payload.settings) {
                                setSettings((prev) => ({
                                    ...prev,
                                    ...parsed.payload.settings,
                                }));
                            }
                            if (parsed.payload.score) {
                                setScoreData((prev) => ({
                                    ...prev,
                                    ...parsed.payload.score,
                                    firstInningsScore: parsed.payload.score.firstInningsScore ?? prev.firstInningsScore,
                                    secondInningsScore: parsed.payload.score.secondInningsScore ?? prev.secondInningsScore,
                                }));
                                if (parsed.payload.score.status) {
                                    setScoreStatus(parsed.payload.score.status);
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Failed to parse SSE event:", err);
                    }
                };

                es.onerror = (err) => {
                    console.error("SSE connection error:", err);
                    setSseConnected(false);

                    if (esRef.current) {
                        esRef.current.close();
                    }

                    const maxAttempts = 5;
                    const baseDelay = 2000;
                    const currentAttempt = reconnectAttempts + 1;

                    if (currentAttempt <= maxAttempts) {
                        const delay = baseDelay * Math.pow(1.5, currentAttempt - 1);
                        console.log(
                            `Reconnecting in ${delay}ms (attempt ${currentAttempt}/${maxAttempts})`
                        );

                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }

                        reconnectTimeoutRef.current = setTimeout(() => {
                            if (!cancelled) {
                                setReconnectAttempts(currentAttempt);
                                connectSSE();
                            }
                        }, delay);
                    } else {
                        setError(
                            "Unable to establish live connection. Please refresh the page."
                        );
                    }
                };
            } catch (err) {
                console.error("Failed to establish SSE connection:", err);
                setError("Failed to connect to live updates");
            }
        };

        connectSSE();

        const pollInterval = setInterval(() => {
            if (!sseConnected && !cancelled) {
                console.log("Polling for updates...");
                fetchLatestData();
            }
        }, 5000);

        return () => {
            cancelled = true;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (highlightTimeoutRef.current) {
                clearTimeout(highlightTimeoutRef.current);
            }
            if (esRef.current) {
                esRef.current.close();
            }
            clearInterval(pollInterval);
        };
    }, [matchId, fetchLatestData, sseConnected, reconnectAttempts]);

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

    const { recentBalls, thisOver, bookmaker, sessions, evenOdd } = MOCK_DATA;

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
                    settings={settings}
                    scoreStatus={scoreStatus}
                    recentBalls={recentBalls}
                    thisOver={thisOver}
                    // Pass real score data
                    firstBattingTeam={scoreData.firstBattingTeam}
                    secondBattingTeam={scoreData.secondBattingTeam}
                    currentInnings={scoreData.currentInnings}
                    firstInningsScore={scoreData.firstInningsScore}
                    secondInningsScore={scoreData.secondInningsScore}
                    runs={scoreData.runs}
                    wickets={scoreData.wickets}
                    overs={scoreData.overs}
                />

                <OddsMarket
                    runners={runners}
                    bookmaker={bookmaker}
                    settings={settings}
                    highlightedOdds={highlightedOdds}
                />

                <SessionMarket
                    sessions={sessions}
                    settings={settings}
                    onPlaceBet={handlePlaceBet}
                />

                <SettingsDebug settings={settings} />
            </div>
        </div>
    );
}