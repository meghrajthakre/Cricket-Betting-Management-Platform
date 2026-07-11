// Pure reducers for turning SSE/API payloads into next state.
// Kept side-effect free so they're easy to unit test independently
// of the SSE plumbing / React lifecycle.

export function nextScoreDataFromFetch(prev, data) {
    return {
        ...prev,
        firstBattingTeam: data.firstBattingTeam || "",
        secondBattingTeam: data.secondBattingTeam || "",
        currentInnings: data.currentInnings ?? prev.currentInnings,
        firstInningsScore: data.firstInningsScore ?? prev.firstInningsScore,
        secondInningsScore: data.secondInningsScore ?? prev.secondInningsScore,
        runs: data.runs || 0,
        wickets: data.wickets || 0,
        overs: data.overs || 0,
    };
}

export function nextScoreDataFromSSE(prev, payload) {
    return {
        ...prev,
        firstBattingTeam: payload.firstBattingTeam ?? prev.firstBattingTeam,
        secondBattingTeam: payload.secondBattingTeam ?? prev.secondBattingTeam,
        currentInnings: payload.currentInnings ?? prev.currentInnings,
        firstInningsScore: payload.firstInningsScore ?? prev.firstInningsScore,
        secondInningsScore: payload.secondInningsScore ?? prev.secondInningsScore,
        runs: payload.runs !== undefined ? payload.runs : prev.runs,
        wickets: payload.wickets !== undefined ? payload.wickets : prev.wickets,
        overs: payload.overs !== undefined ? payload.overs : prev.overs,
    };
}

export function nextScoreDataFromFullState(prev, score) {
    return {
        ...prev,
        ...score,
        firstInningsScore: score.firstInningsScore ?? prev.firstInningsScore,
        secondInningsScore: score.secondInningsScore ?? prev.secondInningsScore,
    };
}

export function nextRunnersFromRunnerUpdate(prevRunners, payload) {
    const { runnerId, runnerName, lagai, khai, status } = payload;
    const idx = prevRunners.findIndex((r) => r.runnerId === runnerId);

    if (idx === -1) {
        return [...prevRunners, { runnerId, runnerName, lagai, khai, status }];
    }

    const next = [...prevRunners];
    next[idx] = { ...next[idx], runnerName, lagai, khai, status };
    return next;
}