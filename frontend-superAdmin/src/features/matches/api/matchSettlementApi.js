import api from "../../../shared/api/apiClient";

export const getSavedMatches = (signal) =>
  api.get("/matches/saved", { signal }).then((response) =>
    Array.isArray(response.data?.data) ? response.data.data : []
  );

export const getMatchRunners = (matchId, signal) =>
  api.get(`/manual/state/${encodeURIComponent(matchId)}`, { signal }).then((response) =>
    Array.isArray(response.data?.data) ? response.data.data : []
  );

export const settleSavedMatch = (matchId, winningRunnerId) =>
  api.post("/bet/settle-match", { matchId, winningRunnerId }).then((response) => response.data);

export const reverseSavedMatchSettlement = (matchId) =>
  api.post("/bet/reverse-match-settlement", { matchId }).then((response) => response.data);
