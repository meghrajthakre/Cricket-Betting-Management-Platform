import API from "./axios";

// ========== Auth ==========
export const loginUser = (data) => API.post("/auth/login", data).then((r) => r.data);
export const logoutUser = () => API.post("/auth/logout").then((r) => r.data);
export const getMe = () => API.get("/auth/me").then((r) => r.data);

// ========== Banner ==========
export const getBanner = () => API.get("/banner").then((r) => r.data);
export const updateBanner = (text) => API.put("/banner", { text }).then((r) => r.data);

// ========== Saved Matches ==========
export const getSavedMatches = () => API.get("/matches/saved").then((r) => r.data);
export const getSavedMatchById = (matchId) => API.get(`/matches/saved/${matchId}`).then((r) => r.data);

// ========== Wallet ==========
export const creditWallet = (userId, amount) => API.post("/wallet/credit", { userId, amount });
export const debitWallet = (userId, amount) => API.post("/wallet/debit", { userId, amount });
export const getWalletBalance = (userId) => API.get(`/wallet/${userId}/balance`);
export const getWalletHistory = (userId, limit = 10, skip = 0) => 
  API.get(`/wallet/${userId}/history`, { params: { limit, skip } });

// ========== Betting ==========
export const placeBet = (userId, matchId, stake, rate, extra = {}) =>
  API.post("/bet/place", { userId, matchId, amount: stake, rate, ...extra }).then((r) => r.data);

export const getMyBets = (userId, matchId) =>
  API.get("/bets", { params: { userId, matchId } }).then((r) => r.data);

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

export const getManualSessions = (matchId) =>
  API.get(`/manual/sessions/${matchId}`).then((r) => r.data);

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
