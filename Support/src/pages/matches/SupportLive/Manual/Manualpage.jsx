import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import MatchHeader from "./MatchHeader";
import RunnerTable from "./RunnerTable";
import SessionTable from "./SessionTable";
import Controls from "./Controls";
import SessionManagement from "./SessionManagement";
import { apiClient } from "../../../../services/api"; 
import { C, MATCH, MANAGEMENT_INIT, SESSIONS_INIT } from "./constants";

// Base URL used for the raw EventSource connection
const API_BASE = apiClient.defaults.baseURL;

// Only the last N balls are kept in history / displayed.
const MAX_BALLS = 10;

// Sessions live in one shared array so SessionManagement (which controls
// visible/diff/lock) and SessionTable (which displays + suspends/opens
// whatever is currently visible) always agree on the same state. Sessions
// ALWAYS start hidden here - visible is forced to false on load regardless
// of whatever MANAGEMENT_INIT says, so no default/leftover session ever
// shows up on the table until the user explicitly clicks "Show".
function buildInitialSessions() {
    return MANAGEMENT_INIT.map((m) => {
        const extra = SESSIONS_INIT.find((s) => s.name === m.name) || {};
        return {
            name: m.name,
            visible: false,
            status: "Not",
            diff: m.diff ?? "1",
            lock: m.lock ?? "Unlock",
            group: m.group,
            maxAmt: m.maxAmt,
            oddEven: m.oddEven,
            noRun: extra.noRun ?? 0,
            noRate: extra.noRate ?? 0,
            yesRun: extra.yesRun ?? 0,
            yesRate: extra.yesRate ?? 0,
            suspended: extra.suspended ?? false,
        };
    });
}

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

    // Shared session state - see buildInitialSessions() above.
    const [sessions, setSessions] = useState(buildInitialSessions);
    // Bumped on every Show/Hide so SessionTable is given a new `key` below,
    // forcing React to fully remount (refresh) the table instead of doing a
    // partial re-render - this guarantees the table's display is clean and
    // in sync every time a session is toggled.
    const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);

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

    // --- Session handlers (shared between SessionManagement and SessionTable) ---

    // Flip a single session's visibility - this is what "Show"/"Hide" in
    // SessionManagement drives, and it's what SessionTable reads to decide
    // what to render. Also bumps sessionsRefreshKey so SessionTable fully
    // remounts/refreshes on every toggle.
    const toggleSessionVisible = (name) => {
        setSessions((prev) =>
            prev.map((s) =>
                s.name === name
                    ? { ...s, visible: !s.visible, status: !s.visible ? "Showing" : "Not" }
                    : s
            )
        );
        setSessionsRefreshKey((k) => k + 1);
    };

    const updateSessionDiff = (name, val) => {
        if (val === "" || val === "-") {
            setSessions((prev) => prev.map((s) => (s.name === name ? { ...s, diff: val } : s)));
            return;
        }
        const num = Number(val);
        if (isNaN(num)) return;
        const clamped = Math.min(10, Math.max(0, num));
        setSessions((prev) =>
            prev.map((s) => (s.name === name ? { ...s, diff: String(clamped) } : s))
        );
    };

    // Toggle suspended state for one visible session (row-level button).
    const toggleSessionSuspended = (name) =>
        setSessions((prev) =>
            prev.map((s) => (s.name === name ? { ...s, suspended: !s.suspended } : s))
        );

    // Top "Suspend Rate" / "Open Rate" buttons in SessionTable act on every
    // session currently visible on the table.
    const suspendAllVisibleSessions = () =>
        setSessions((prev) => prev.map((s) => (s.visible ? { ...s, suspended: true } : s)));

    const openAllVisibleSessions = () =>
        setSessions((prev) => prev.map((s) => (s.visible ? { ...s, suspended: false } : s)));

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

    const visibleSessions = sessions.filter((s) => s.visible);

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
                                key={sessionsRefreshKey}
                                sessions={visibleSessions}
                                onToggleSuspend={toggleSessionSuspended}
                                onSuspendAll={suspendAllVisibleSessions}
                                onOpenAll={openAllVisibleSessions}
                            />
                            <Controls rateDiff={rateDiff} setRateDiff={setRateDiff} />
                            <SessionManagement
                                sessions={sessions}
                                onToggleVisible={toggleSessionVisible}
                                onUpdateDiff={updateSessionDiff}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}