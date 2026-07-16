import { apiClient } from "./api";

const sessionPath = (matchId) =>
  `/manual/sessions/${encodeURIComponent(matchId)}`;

const sessionItemPath = (matchId, sessionId) =>
  `${sessionPath(matchId)}/${encodeURIComponent(sessionId)}`;

export const getManualSessions = (matchId) =>
  apiClient.get(sessionPath(matchId));

export const updateManualSession = (matchId, sessionId, updates) =>
  apiClient.patch(sessionItemPath(matchId, sessionId), updates);

export const updateManualSessionStatus = (matchId, sessionId, status) =>
  apiClient.patch(`${sessionItemPath(matchId, sessionId)}/status`, { status });

export const updateManualSessionVisibility = (matchId, sessionId, isVisible) =>
  apiClient.patch(`${sessionItemPath(matchId, sessionId)}/visibility`, {
    isVisible,
  });

export const updateAllManualSessionStatuses = (matchId, status) =>
  apiClient.patch(`${sessionPath(matchId)}/status`, { status });

export const resetManualSessions = (matchId) =>
  apiClient.post(`${sessionPath(matchId)}/reset`);
