import api from "../../../../shared/api/apiClient";

const fulfilledData = (result) =>
  result.status === "fulfilled" ? result.value.data : undefined;

export async function fetchLiveReport(matchId, signal) {
  const encodedMatchId = encodeURIComponent(matchId);
  const [matchResult, scoreResult, runnersResult, sessionsResult, betsResult] =
    await Promise.allSettled([
      api.get(`/matches/saved/${encodedMatchId}`, { signal }),
      api.get(`/manual/score/${encodedMatchId}`, { signal }),
      api.get(`/manual/state/${encodedMatchId}`, { signal }),
      api.get(`/session/${encodedMatchId}`, { signal }),
      api.get("/bet/company-match", { params: { matchId }, signal }),
    ]);

  const matchData = fulfilledData(matchResult);
  const scoreData = fulfilledData(scoreResult);
  const runnersData = fulfilledData(runnersResult);
  const sessionsData = fulfilledData(sessionsResult);
  const betsData = fulfilledData(betsResult);

  return {
    match: matchData?.data,
    score: scoreData?.data,
    runners: runnersData
      ? Array.isArray(runnersData.data)
        ? runnersData.data
        : []
      : undefined,
    sessions: sessionsData
      ? Array.isArray(sessionsData.data?.sessions)
        ? sessionsData.data.sessions
        : []
      : undefined,
    bets: betsData
      ? Array.isArray(betsData.data)
        ? betsData.data
        : []
      : undefined,
    betsError:
      betsResult.status === "rejected"
        ? betsResult.reason?.response?.data?.error ||
          betsResult.reason?.message ||
          "Live bets load nahi ho paaye."
        : "",
  };
}

export async function fetchRecentMatches(signal) {
  const response = await api.get("/matches/saved", { signal });
  const saved = Array.isArray(response.data?.data)
    ? response.data.data.map((item) => ({ ...item, isLive: false }))
    : [];
  return saved.sort(
    (a, b) =>
      new Date(b.commenceTime || 0).getTime() -
      new Date(a.commenceTime || 0).getTime(),
  );
}

export async function fetchMatchBets(matchId) {
  const response = await api.get("/bet/company-match", { params: { matchId } });
  return Array.isArray(response.data?.data) ? response.data.data : [];
}
