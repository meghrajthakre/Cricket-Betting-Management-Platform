import axios from "axios";

export const SUPPORT_TOKEN_KEY = "support-token";
export const SUPPORT_USER_KEY = "support-user";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(SUPPORT_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(SUPPORT_TOKEN_KEY);
      localStorage.removeItem(SUPPORT_USER_KEY);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
