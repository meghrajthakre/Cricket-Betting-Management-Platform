import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "support-token";
const USER_KEY  = "support-user";

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) logout();
    return Promise.reject(error);
  }
);

export const login = async (username, password) => {
  try {
    const { data } = await apiClient.post("/auth/login", { username, password });

    if (!data?.data?.accessToken) throw new Error("Authentication failed.");
    if (data.data.user.role !== "support")
      throw new Error("Access denied. Support accounts only.");

    localStorage.setItem(TOKEN_KEY, data.data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));

    return data.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || "Unable to sign in."
    );
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(localStorage.getItem(TOKEN_KEY));
