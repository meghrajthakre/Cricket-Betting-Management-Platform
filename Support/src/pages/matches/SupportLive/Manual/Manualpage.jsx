import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import MatchHeader from "./MatchHeader";
import RunnerTable from "./RunnerTable";
import SessionTable from "./SessionTable";
import Controls from "./Controls";
import SessionManagement from "./SessionManagement";
import { apiClient } from "../../../../services/api";
import {
    getManualSessions,
    updateManualSession,
    updateManualSessionStatus,
    updateManualSessionVisibility,
    updateAllManualSessionStatuses,
} from "../../../../services/manualSessionService";

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
    const [manualSettings, setManualSettings] = useState(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState("");
    const [pendingFields, setPendingFields] = useState(new Set());
    const [bulkSessionPending, setBulkSessionPending] = useState(false);

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
            setManualSettings(data?.data || null);
            if (data?.data?.marketStatus) {
                setMarketStatus(data.data.marketStatus);
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        } finally {
            setSettingsLoaded(true);
        }
    }, [matchId]);

    const fetchSessions = useCallback(async () => {
        if (!matchId) return;
        setSessionsLoading(true);
        setSessionsError("");
        try {
            const { data } = await getManualSessions(matchId);
            setSessions(data?.data?.sessions || []);
        } catch (err) {
            setSessionsError(
                err.response?.data?.message || err.message || "Failed to fetch sessions"
            );
        } finally {
            setSessionsLoading(false);
        }
    }, [matchId]);

    useEffect(() => {
        // These memoized functions perform the page's initial async data load.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchMatch();
        fetchScore();
        fetchSettings();
        fetchSessions();
    }, [fetchMatch, fetchScore, fetchSettings, fetchSessions]);

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
                    setManualSettings(parsed.payload);
                    if (parsed.payload.marketStatus) {
                        setMarketStatus(parsed.payload.marketStatus);
                    }
                }

                if (parsed.type === "SESSION_UPDATED" && parsed.payload?.matchId === matchId) {
                    const updated = parsed.payload.session;
                    setSessions((prev) =>
                        prev.map((session) => session.id === updated.id ? updated : session)
                    );
                }

                if (parsed.type === "SESSIONS_UPDATED" && parsed.payload?.matchId === matchId) {
                    setSessions(parsed.payload.sessions || []);
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
            // EventSource reconnects automatically. Creating another instance
            // here can leave multiple live connections for the same match.
        };

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, [matchId]);

    const updateSessionField = useCallback(async (
        sessionId,
        field,
        value,
        request,
        forceUpdate = false
    ) => {
        const pendingKey = `${sessionId}:${field}`;
        if (pendingFields.has(pendingKey)) return;

        const previous = sessions.find((session) => session.id === sessionId);
        if (!previous || (!forceUpdate && previous[field] === value)) return;

        setPendingFields((current) => new Set(current).add(pendingKey));
        setSessions((current) =>
            current.map((session) =>
                session.id === sessionId ? { ...session, [field]: value } : session
            )
        );

        try {
            const { data } = await request();
            const saved = data?.data?.session;
            if (saved) {
                setSessions((current) =>
                    current.map((session) => session.id === sessionId ? saved : session)
                );
            }
        } catch (err) {
            setSessions((current) =>
                current.map((session) => session.id === sessionId ? previous : session)
            );
            setSessionsError(
                err.response?.data?.message || err.message || "Failed to update session"
            );
        } finally {
            setPendingFields((current) => {
                const next = new Set(current);
                next.delete(pendingKey);
                return next;
            });
        }
    }, [pendingFields, sessions]);

    const handleSessionField = (sessionId, field, value) =>
        updateSessionField(
            sessionId,
            field,
            value,
            () => updateManualSession(matchId, sessionId, { [field]: value })
        );

    const handleSessionStatus = (sessionId, status) =>
        updateSessionField(
            sessionId,
            "status",
            status,
            () => updateManualSessionStatus(matchId, sessionId, status),
            true
        );

    const handleSessionVisibility = (sessionId, isVisible) =>
        updateSessionField(
            sessionId,
            "isVisible",
            isVisible,
            async () => {
                const response = await updateManualSessionVisibility(
                    matchId,
                    sessionId,
                    isVisible
                );

                return response;
            }
        );

    const updateAllStatuses = async (status) => {
        if (bulkSessionPending) return;
        const previous = sessions;
        setBulkSessionPending(true);
        setSessions((current) => current.map((session) => ({ ...session, status })));
        try {
            const { data } = await updateAllManualSessionStatuses(matchId, status);
            setSessions(data?.data?.sessions || []);
        } catch (err) {
            setSessions(previous);
            setSessionsError(
                err.response?.data?.message || err.message || "Failed to update sessions"
            );
        } finally {
            setBulkSessionPending(false);
        }
    };

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

    const visibleSessions = sessions.filter((s) => s.isVisible);

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
                            <SessionTable
                                sessions={visibleSessions}
                                onUpdateStatus={handleSessionStatus}
                                onSuspendAll={() => updateAllStatuses("suspend")}
                                onOpenAll={() => updateAllStatuses("open")}
                                pendingFields={pendingFields}
                                bulkPending={bulkSessionPending}
                            />
                            <Controls
                                setRateDiff={setRateDiff}
                                initialSettings={manualSettings}
                                settingsLoaded={settingsLoaded}
                            />
                            <SessionManagement
                                sessions={sessions}
                                loading={sessionsLoading}
                                error={sessionsError}
                                pendingFields={pendingFields}
                                onToggleVisible={handleSessionVisibility}
                                onUpdateField={handleSessionField}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
