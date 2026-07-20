import { apiClient } from "../../../../../services/api";
import {
    advanceOverByOneBall,
    MAX_BALLS,
    parseButtonAction,
    reverseOverByOneBall,
} from "../utils/scoreCalculations";

export function useScoreActions({
    matchId,
    scoreData,
    setScoreData,
    setSelectedStatus,
    setMarketStatus,
}) {
    const persistScore = (updates, message) =>
        apiClient.post("/manual/score/update", { matchId, ...updates })
            .catch((error) => console.error(message, error));

    const handleStatusSelect = async (label) => {
        const action = parseButtonAction(label);
        setSelectedStatus(label);

        if (action.marketStatus) {
            setMarketStatus(action.marketStatus);
            try {
                await apiClient.post("/manual/settings/update", { matchId, marketStatus: action.marketStatus });
                await apiClient.post("/manual/score/update", { matchId, status: action.statusLabel || label });
            } catch (error) {
                console.error("Failed to update market status:", error);
            }
            return;
        }

        if (action.isUndo) {
            setScoreData((previous) => {
                const balls = previous.balls || [];
                if (!balls.length) return previous;
                const lastBall = balls[balls.length - 1];
                const next = {
                    ...previous,
                    runs: Math.max(0, previous.runs - (lastBall.runs || 0)),
                    wickets: Math.max(0, previous.wickets - (lastBall.isWicket ? 1 : 0)),
                    overs: lastBall.advanceBall ? reverseOverByOneBall(previous.overs) : previous.overs,
                    balls: balls.slice(0, -1),
                };
                persistScore({
                    status: label,
                    runs: next.runs,
                    wickets: next.wickets,
                    overs: next.overs,
                    balls: next.balls,
                }, "Failed to undo score:");
                return next;
            });
            return;
        }

        if (action.isNotOutReview) {
            setScoreData((previous) => {
                const balls = previous.balls || [];
                const lastBall = balls[balls.length - 1];
                if (!lastBall?.isWicket) {
                    persistScore({ status: label }, "Failed to update status:");
                    return previous;
                }
                const next = {
                    ...previous,
                    wickets: Math.max(0, previous.wickets - 1),
                    balls: [...balls.slice(0, -1), { ...lastBall, isWicket: false, label: "NOT OUT" }],
                };
                persistScore({ status: label, wickets: next.wickets, balls: next.balls }, "Failed to reverse wicket:");
                return next;
            });
            return;
        }

        if (action.runs === undefined && action.wickets === undefined) {
            persistScore({ status: label }, "Failed to update status:");
            return;
        }

        setScoreData((previous) => {
            const newBall = {
                over: Math.floor(previous.overs) || 0,
                label,
                runs: action.runs || 0,
                isWicket: Boolean(action.wickets),
                isExtra: Boolean(action.isExtra),
                advanceBall: Boolean(action.advanceBall),
            };
            const next = {
                ...previous,
                runs: previous.runs + (action.runs || 0),
                wickets: previous.wickets + (action.wickets || 0),
                overs: action.advanceBall ? advanceOverByOneBall(previous.overs) : previous.overs,
                balls: [...(previous.balls || []), newBall].slice(-MAX_BALLS),
            };
            persistScore({
                status: label,
                runs: next.runs,
                wickets: next.wickets,
                overs: next.overs,
                balls: next.balls,
            }, "Failed to update score:");
            return next;
        });
    };

    const handleAction = async (action, payload) => {
        try {
            if (action === "firstInnBat") {
                setScoreData((previous) => ({ ...previous, firstBattingTeam: payload.team, currentInnings: 1 }));
                await apiClient.post("/manual/score/update", { matchId, firstBattingTeam: payload.team, currentInnings: 1 });
            } else if (action === "secondInnBat") {
                const firstInningsScore = { runs: scoreData.runs, wickets: scoreData.wickets, overs: scoreData.overs };
                const updates = {
                    secondBattingTeam: payload.team,
                    firstInningsScore,
                    currentInnings: 2,
                    runs: 0,
                    wickets: 0,
                    overs: 0,
                    balls: [],
                };
                setScoreData((previous) => ({ ...previous, ...updates }));
                await apiClient.post("/manual/score/update", { matchId, ...updates });
            } else if (action === "completeSecondInn") {
                const secondInningsScore = { runs: scoreData.runs, wickets: scoreData.wickets, overs: scoreData.overs };
                setScoreData((previous) => ({ ...previous, secondInningsScore, currentInnings: 3 }));
                await apiClient.post("/manual/score/update", { matchId, secondInningsScore, currentInnings: 3 });
            } else if (action === "updateLastScore") {
                const overs = `${payload.over || 0}.${payload.ball || 0}`;
                const updates = {
                    runs: Number(payload.run) || 0,
                    wickets: Number(payload.wicket) || 0,
                    overs: Number(overs),
                };
                setScoreData((previous) => ({ ...previous, ...updates }));
                await apiClient.post("/manual/score/update", { matchId, runs: payload.run, wickets: payload.wicket, overs });
            }
        } catch (error) {
            console.error("Failed to update:", error);
        }
    };

    return { handleStatusSelect, handleAction };
}

