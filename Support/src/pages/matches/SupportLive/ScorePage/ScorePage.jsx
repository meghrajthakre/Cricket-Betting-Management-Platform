import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import ScoreHeader from "./ScoreHeader";
import ScoreOdds from "./ScoreOdds";
import { apiClient } from "../../../../services/api";
import ScoreButtons from "./ScoreButtons";
import Controls from "./Controls";
import SlidingBalls from "./SlidingBalls";

// Base URL used for the raw EventSource connection (apiClient's baseURL, e.g. "https://api.example.com/api")
// Adjust the path below ("/manual/events") if your manual router is mounted under a different prefix.
const API_BASE = apiClient.defaults.baseURL;

// Only the last N balls are kept in history / persisted.
const MAX_BALLS = 15;

// ---- Score-button label parsing -------------------------------------
// Turns a ScoreButtons label into a scoring delta.
// See assumptions in chat: N RUN, OUT, N + WIDE BALL / No Ball, etc.
function parseButtonAction(label) {
    const upper = (label || "").toUpperCase().trim();

    // Non-scoring market controls
    if (upper === "BET OPEN") return { marketStatus: "OPEN", statusLabel: "BET OPEN" };
    if (upper === "BET CLOSED") return { marketStatus: "CLOSED", statusLabel: "BET CLOSED" };

    // Undo last scoring ball
    if (upper === "SCORE BACK") return { isUndo: true, statusLabel: label };

    // "NOT OUT" - if the previous ball was a wicket pending review (e.g. THIRD UMPIRE),
    // this reverses that wicket. Checked before generic OUT matching.
    if (upper === "NOT OUT") return { statusLabel: "NOT OUT", isNotOutReview: true };

    // Combo: "N + WIDE BALL" or "N + No Ball" or "N + OUT"
    const comboMatch = upper.match(/^(\d+)\s*\+\s*(WIDE BALL|NO BALL|OUT)$/);
    if (comboMatch) {
        const n = parseInt(comboMatch[1], 10) || 0;
        const kind = comboMatch[2];
        if (kind === "OUT") {
            return { runs: n, wickets: 1, advanceBall: true, statusLabel: label };
        }
        // wide/no ball extra: n scored runs + 1 for the extra itself, no legal ball bowled
        return { runs: n + 1, advanceBall: false, statusLabel: label, isExtra: true };
    }

    // "WIDE BALL + OUT"
    if (upper === "WIDE BALL + OUT") {
        return { runs: 1, wickets: 1, advanceBall: false, statusLabel: label, isExtra: true };
    }

    // Plain "N RUN"
    const runMatch = upper.match(/^(\d+)\s*RUN$/);
    if (runMatch) {
        return { runs: parseInt(runMatch[1], 10) || 0, advanceBall: true, statusLabel: label };
    }

    // Plain wide/no ball
    if (upper === "WIDE BALL" || upper === "NO BALL") {
        return { runs: 1, advanceBall: false, statusLabel: label, isExtra: true };
    }

    // OUT on its own
    if (upper === "OUT") {
        return { wickets: 1, advanceBall: true, statusLabel: label };
    }

    // Everything else (breaks, checks, reviews, umpire calls, TIE, etc.)
    // is a non-scoring status update only.
    return { statusLabel: label };
}

// Advance overs by one legal ball: N.B -> N.(B+1), rolling over at 6 balls.
function advanceOverByOneBall(overs) {
    const value = Number(overs) || 0;
    const wholeOvers = Math.floor(value);
    // Round to avoid float artifacts like 1.2999999
    let balls = Math.round((value - wholeOvers) * 10);
    balls += 1;
    if (balls >= 6) {
        return wholeOvers + 1;
    }
    return Number(`${wholeOvers}.${balls}`);
}

// Inverse of advanceOverByOneBall — used by SCORE BACK to undo a legal ball.
function reverseOverByOneBall(overs) {
    const value = Number(overs) || 0;
    const wholeOvers = Math.floor(value);
    let balls = Math.round((value - wholeOvers) * 10);
    balls -= 1;
    if (balls < 0) {
        // Was at X.0 (start of an over) — step back into the previous over's 5th ball.
        return Number(`${Math.max(0, wholeOvers - 1)}.5`);
    }
    return Number(`${wholeOvers}.${balls}`);
}

export default function ScorePage() {
    const { matchId } = useParams();

    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");

    // Betting-format score state (first/second batting team, runs, wickets, overs, ball-by-ball history)
    const [scoreData, setScoreData] = useState({
        firstBattingTeam: "",
        secondBattingTeam: "",
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: [],
    });
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
                // Only set status if it's not a market status
                if (data.data.status) {
                    setSelectedStatus(data.data.status);
                }
            }
        } catch (err) {
            console.error("Failed to fetch score:", err);
        }
    }, [matchId]);

    // Fetch settings for marketStatus (OPEN / SUSPEND / CLOSED)
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
            } catch (err) {
                console.error("Failed to parse SSE message:", err);
            }
        };

        es.onerror = (err) => {
            console.error("SSE connection error:", err);
        };

        return () => {
            es.close();
        };
    }, [matchId]);

    const team1 = match?.homeTeam || "";
    const team2 = match?.awayTeam || "";

    const runners = match
        ? [
            { name: team1, lagai: match.odds?.minRate ?? "", khai: match.odds?.maxRate ?? "" },
            { name: team2, lagai: match.odds?.minRate ?? "", khai: match.odds?.maxRate ?? "" },
        ]
        : [];

    // Handles every ScoreButtons click: 0 RUN, 4 RUN, OUT, BET OPEN, breaks, etc.
    const handleStatusSelect = async (label) => {
        const action = parseButtonAction(label);

        // Always update the selected status for display
        setSelectedStatus(label);

        // Market status buttons (BET OPEN / BET CLOSED) go through settings, not score
        if (action.marketStatus) {
            if (action.statusLabel) {
                setSelectedStatus(action.statusLabel);
            }
            setMarketStatus(action.marketStatus); // optimistic
            try {
                await apiClient.post(`/manual/settings/update`, {
                    matchId,
                    marketStatus: action.marketStatus,
                });
                await apiClient.post(`/manual/score/update`, {
                    matchId,
                    status: action.statusLabel || label,
                });
            } catch (err) {
                console.error("Failed to update market status:", err);
            }
            return;
        }

        // SCORE BACK — undo the most recent scoring ball (runs/wickets/overs + history)
        if (action.isUndo) {
            setScoreData((prev) => {
                const balls = prev.balls || [];
                if (balls.length === 0) {
                    return prev; // nothing to undo
                }
                const lastBall = balls[balls.length - 1];
                const newBalls = balls.slice(0, -1);
                const newRuns = Math.max(0, prev.runs - (lastBall.runs || 0));
                const newWickets = Math.max(0, prev.wickets - (lastBall.isWicket ? 1 : 0));
                const newOvers = lastBall.advanceBall
                    ? reverseOverByOneBall(prev.overs)
                    : prev.overs;

                const next = {
                    ...prev,
                    runs: newRuns,
                    wickets: newWickets,
                    overs: newOvers,
                    balls: newBalls,
                };

                apiClient
                    .post(`/manual/score/update`, {
                        matchId,
                        status: label,
                        runs: newRuns,
                        wickets: newWickets,
                        overs: newOvers,
                        balls: newBalls,
                    })
                    .catch((err) => console.error("Failed to undo score:", err));

                return next;
            });
            return;
        }

        // NOT OUT — if the last ball recorded was a wicket (e.g. under THIRD UMPIRE review),
        // reverse just the wicket. The ball itself already happened, so runs/overs stay put.
        if (action.isNotOutReview) {
            setScoreData((prev) => {
                const balls = prev.balls || [];
                const lastBall = balls[balls.length - 1];

                if (!lastBall || !lastBall.isWicket) {
                    // No pending wicket to reverse — treat as a plain status update.
                    apiClient
                        .post(`/manual/score/update`, { matchId, status: label })
                        .catch((err) => console.error("Failed to update status:", err));
                    return prev;
                }

                const updatedBall = { ...lastBall, isWicket: false, label: "NOT OUT" };
                const newBalls = [...balls.slice(0, -1), updatedBall];
                const newWickets = Math.max(0, prev.wickets - 1);

                const next = { ...prev, wickets: newWickets, balls: newBalls };

                apiClient
                    .post(`/manual/score/update`, {
                        matchId,
                        status: label,
                        wickets: newWickets,
                        balls: newBalls,
                    })
                    .catch((err) => console.error("Failed to reverse wicket:", err));

                return next;
            });
            return;
        }

        // Pure status label (breaks, checks, reviews) with no scoring change —
        // just persist the label so it survives refresh/SSE for other clients.
        if (action.runs === undefined && action.wickets === undefined) {
            try {
                await apiClient.post(`/manual/score/update`, { matchId, status: label });
            } catch (err) {
                console.error("Failed to update status:", err);
            }
            return;
        }

        // Scoring action: compute new totals, append the real ball, and persist
        setScoreData((prev) => {
            const newRuns = prev.runs + (action.runs || 0);
            const newWickets = prev.wickets + (action.wickets || 0);
            const newOvers = action.advanceBall ? advanceOverByOneBall(prev.overs) : prev.overs;

            // Build the ball entry that actually happened, from real button data.
            // advanceBall is stored so SCORE BACK can correctly reverse the over count.
            const newBall = {
                over: Math.floor(prev.overs) || 0,
                label,
                runs: action.runs || 0,
                isWicket: !!action.wickets,
                isExtra: !!action.isExtra,
                advanceBall: !!action.advanceBall,
            };
            const newBalls = [...(prev.balls || []), newBall].slice(-MAX_BALLS);

            const next = {
                ...prev,
                runs: newRuns,
                wickets: newWickets,
                overs: newOvers,
                balls: newBalls,
            };

            apiClient
                .post(`/manual/score/update`, {
                    matchId,
                    status: label,
                    runs: newRuns,
                    wickets: newWickets,
                    overs: newOvers,
                    balls: newBalls,
                })
                .catch((err) => console.error("Failed to update score:", err));

            return next;
        });
    };

    const handleAction = async (action, payload) => {
        try {
            if (action === "firstInnBat") {
                setScoreData((prev) => ({ ...prev, firstBattingTeam: payload.team })); // optimistic
                await apiClient.post(`/manual/score/update`, { matchId, firstBattingTeam: payload.team });
            } else if (action === "secondInnBat") {
                setScoreData((prev) => ({ ...prev, secondBattingTeam: payload.team })); // optimistic
                await apiClient.post(`/manual/score/update`, { matchId, secondBattingTeam: payload.team });
            } else if (action === "updateLastScore") {
                const overs = `${payload.over || 0}.${payload.ball || 0}`;
                setScoreData((prev) => ({
                    ...prev,
                    runs: Number(payload.run) || 0,
                    wickets: Number(payload.wicket) || 0,
                    overs: Number(overs),
                })); // optimistic
                await apiClient.post(`/manual/score/update`, {
                    matchId,
                    runs: payload.run,
                    wickets: payload.wicket,
                    overs,
                });
            }
        } catch (err) {
            console.error("Failed to update:", err);
        }
    };

    // Determine what to show in the middle badge
    const getScoreText = () => {
        if (selectedStatus) {
            return selectedStatus;
        }
        return match?.status || "";
    };

    return (
        <div className="min-h-screen bg-[#f0f0f0] flex justify-center py-12 px-3">
            <div className="w-full max-w-3xl">
                {loading && (
                    <div className="text-center text-gray-400 py-10">Loading match...</div>
                )}

                {!loading && error && (
                    <div className="text-center text-red-500 py-10">{error}</div>
                )}

                {!loading && !error && match && (
                    <>
                        <SlidingBalls balls={scoreData.balls || []} />
                        <ScoreHeader
                            team1={team1}
                            team2={team2}
                            team1Score={match?.team1Score || ""}
                            team2Score={match?.team2Score || ""}
                            firstBattingTeam={scoreData.firstBattingTeam}
                            runs={scoreData.runs}
                            wickets={scoreData.wickets}
                            overs={scoreData.overs}
                            marketStatus={marketStatus}
                            scoreText={getScoreText()}
                        />
                        <ScoreButtons selected={selectedStatus} onSelect={handleStatusSelect} />
                        <Controls teams={[team1, team2]} onAction={handleAction} />
                    </>
                )}
            </div>
        </div>
    );
}