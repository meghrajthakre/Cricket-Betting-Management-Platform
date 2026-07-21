import { apiClient } from "./api";

const path = (matchId) => `/manual/options/${encodeURIComponent(matchId)}`;

export const getManualOptions = (matchId) => apiClient.get(path(matchId));
export const updateManualOptions = (matchId, updates) => apiClient.put(path(matchId), updates);
export const settleManualToss = (matchId, tossResult, tossTeam) =>
  apiClient.post(`${path(matchId)}/settle-toss`, { tossResult, tossTeam });
export const settleManualTie = (matchId, tieResult) =>
  apiClient.post(`${path(matchId)}/settle-tie`, { tieResult });
