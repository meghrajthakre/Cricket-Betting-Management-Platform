import api from "../../../shared/api/apiClient";

export const creditWallet = (userId, amount) =>
  api.post("/wallet/credit", { userId, amount });

export const debitWallet = (userId, amount) =>
  api.post("/wallet/debit", { userId, amount });

export const getWalletBalance = (userId) =>
  api.get(`/wallet/${userId}/balance`);

export const getWalletHistory = (userId, limit = 10, skip = 0) =>
  api.get(`/wallet/${userId}/history`, { params: { limit, skip } });
