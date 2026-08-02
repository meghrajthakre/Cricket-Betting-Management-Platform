import apiClient from "../../../shared/api/apiClient";

const sessionPath = (matchId) => `/session/${encodeURIComponent(matchId)}`;
const sessionItemPath = (matchId, sessionId) =>
  `${sessionPath(matchId)}/${encodeURIComponent(sessionId)}`;

export const getSessions = (matchId) => apiClient.get(sessionPath(matchId));
export const getPendingBetSessions = (matchId) =>
  apiClient.get(`${sessionPath(matchId)}/pending`);
export const updateSession = (matchId, sessionId, updates) =>
  apiClient.patch(sessionItemPath(matchId, sessionId), updates);
export const updateSessionStatus = (matchId, sessionId, status) =>
  apiClient.patch(`${sessionItemPath(matchId, sessionId)}/status`, { status });
export const updateSessionVisibility = (matchId, sessionId, isVisible) =>
  apiClient.patch(`${sessionItemPath(matchId, sessionId)}/visibility`, { isVisible });
export const updateAllSessionStatuses = (matchId, status) =>
  apiClient.patch(`${sessionPath(matchId)}/status`, { status });
export const resetSessions = (matchId) => apiClient.post(`${sessionPath(matchId)}/reset`);
export const settleSession = (matchId, sessionId, resultRun) =>
  apiClient.post(`${sessionItemPath(matchId, sessionId)}/settle`, { resultRun: Number(resultRun) });
