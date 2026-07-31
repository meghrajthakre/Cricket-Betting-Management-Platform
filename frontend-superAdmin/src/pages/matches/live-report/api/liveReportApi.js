import api from "../../../../constants/api";

const fulfilledData = (result) =>
  result.status === "fulfilled" ? result.value.data : undefined;

export async function fetchLiveReport(matchId) {
  const encodedMatchId = encodeURIComponent(matchId);
  const [matchResult, scoreResult, runnersResult, sessionsResult, betsResult] =
    await Promise.allSettled([
      api.get(`/matches/saved/${encodedMatchId}`),
      api.get(`/manual/score/${encodedMatchId}`),
      api.get(`/manual/state/${encodedMatchId}`),
      api.get(`/session/${encodedMatchId}`),
      api.get("/bet/match", { params: { matchId } }),
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
      ? (Array.isArray(runnersData.data) ? runnersData.data : [])
      : undefined,
    sessions: sessionsData
      ? (Array.isArray(sessionsData.data?.sessions)
          ? sessionsData.data.sessions
          : [])
      : undefined,
    bets: betsData
      ? (Array.isArray(betsData.data) ? betsData.data : [])
      : undefined,
    betsError:
      betsResult.status === "rejected"
        ? betsResult.reason?.response?.data?.error ||
          betsResult.reason?.message ||
          "Live bets load nahi ho paaye."
        : "",
  };
}

export async function fetchRecentMatches() {
  const [liveResult, savedResult] = await Promise.allSettled([
    api.get("/cricket/live"),
    api.get("/matches/saved"),
  ]);

  const liveData = fulfilledData(liveResult);
  const savedData = fulfilledData(savedResult);
  const live = Array.isArray(liveData?.matches)
    ? liveData.matches.map((item) => ({ ...item, isLive: true }))
    : [];
  const saved = Array.isArray(savedData?.data)
    ? savedData.data.map((item) => ({ ...item, isLive: false }))
    : [];

  const matchesById = new Map(saved.map((item) => [item.matchId, item]));
  live.forEach((item) => matchesById.set(item.matchId, item));

  return [...matchesById.values()].sort(
    (a, b) =>
      new Date(b.commenceTime || 0).getTime() -
      new Date(a.commenceTime || 0).getTime()
  );
}

export async function fetchMatchBets(matchId) {
  const response = await api.get("/bet/match", { params: { matchId } });
  return Array.isArray(response.data?.data) ? response.data.data : [];
}
