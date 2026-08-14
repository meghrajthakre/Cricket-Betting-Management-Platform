import API, { USER_ACCESS_TOKEN_KEY } from "./apiClient";

// ========== Auth ==========
export const loginUser = async (data) => {
  const response = await API.post("/auth/login", data);
  const token = response.data?.data?.accessToken;
  if (token) localStorage.setItem(USER_ACCESS_TOKEN_KEY, token);
  return response.data;
};

export const logoutUser = async () => {
  try {
    const response = await API.post("/auth/logout");
    return response.data;
  } finally {
    localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
  }
};
export const getMe = () => API.get("/auth/me").then((r) => r.data);
export const changeOwnPassword = (currentPassword, newPassword, confirmPassword) =>
  API.patch("/user/password", { currentPassword, newPassword, confirmPassword })
    .then((response) => response.data);

// ========== Banner ==========
export const getBanner = () => API.get("/banner").then((r) => r.data);
export const updateBanner = (text) => API.put("/banner", { text }).then((r) => r.data);

// ========== Saved Matches ==========
export const getSavedMatches = () => API.get("/matches/saved").then((r) => r.data);
export const getSavedMatchById = (matchId) => API.get(`/matches/saved/${matchId}`).then((r) => r.data);
const pendingMatchEntries = new Map();
export const enterSavedMatch = (matchId) => {
  const key = String(matchId);
  if (pendingMatchEntries.has(key)) return pendingMatchEntries.get(key);
  const request = API.post(`/matches/saved/${matchId}/enter`)
    .then((r) => r.data)
    .finally(() => pendingMatchEntries.delete(key));
  pendingMatchEntries.set(key, request);
  return request;
};

// ========== Wallet ==========
export const creditWallet = (userId, amount) => API.post("/wallet/credit", { userId, amount });
export const debitWallet = (userId, amount) => API.post("/wallet/debit", { userId, amount });
export const getWalletBalance = (userId) => API.get(`/wallet/${userId}/balance`);
export const getWalletHistory = (userId, limit = 10, skip = 0) => 
  API.get(`/wallet/${userId}/history`, { params: { limit, skip } });
export const getUserLedger = (page = 1, limit = 20) =>
  API.get("/user/ledger", { params: { page, limit } }).then((r) => r.data);
export const getLedgerMatchBets = (matchId) =>
  API.get(`/user/ledger/matches/${encodeURIComponent(matchId)}`).then((r) => r.data);

// ========== Betting ==========
const createClientBetId = () => globalThis.crypto?.randomUUID?.() ||
  `bet-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const placeBet = (userId, matchId, stake, rate, extra = {}) => {
  const clientBetId = extra.clientBetId || createClientBetId();
  return API.post("/bet/place", {
    userId,
    matchId,
    amount: stake,
    rate,
    ...extra,
    clientBetId,
  }).then((r) => r.data);
};

export const getMyBets = (matchId) =>
  API.get("/bet/mine", { params: { matchId } }).then((r) => r.data);

// ========== Live Cricket (cricketController) ==========
export const getLiveMatches = () => API.get("/cricket/live").then((r) => r.data);
export const getLiveSummary = () => API.get("/cricket/live/summary").then((r) => r.data);

export const getLiveScores = (sportKey, daysFrom = 1) =>
  API.get(`/cricket/live/${sportKey}/scores`, { params: { daysFrom } }).then((r) => r.data);

export const getMatchOdds = (sportKey, eventId) =>
  API.get(`/cricket/live/${sportKey}/match/${eventId}/odds`).then((r) => r.data);

// ========== Manual State Management ==========
export const getManualState = (matchId) => 
  API.get(`/manual/state/${matchId}`).then((r) => r.data);

export const getManualSettings = (matchId) => 
  API.get(`/manual/settings/${matchId}`).then((r) => r.data);

export const getSessions = (matchId) =>
  API.get(`/session/${matchId}`).then((r) => r.data);

export const getManualOptions = (matchId) =>
  API.get(`/manual/options/${matchId}`).then((r) => r.data);

export const updateManualState = (matchId, data) => 
  API.put(`/manual/state/${matchId}`, data).then((r) => r.data);

export const updateManualSettings = (matchId, settings) => 
  API.put(`/manual/settings/${matchId}`, settings).then((r) => r.data);

// ========== SSE Connection Helper ==========
export const getSSEUrl = (matchId) => {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
  // Remove trailing /api if present to avoid duplication
  const baseUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
  return `${baseUrl}/api/manual/events?matchId=${matchId}`;
};

// ========== Manual Score/Status ==========
export const getManualScore = (matchId) =>
  API.get(`/manual/score/${matchId}`).then((r) => r.data);

export const updateManualScore = (matchId, status) =>
  API.post(`/manual/score/update`, { matchId, status }).then((r) => r.data);
