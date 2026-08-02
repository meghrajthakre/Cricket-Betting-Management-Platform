import axios from "axios";
import { useAuthStore } from "../../store/authStore";
import { useCoinStore } from "../../store/coinStore";

export const USER_ACCESS_TOKEN_KEY = "userAccessToken";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem(USER_ACCESS_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirectingToLogin = false;

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const hadAccessToken = Boolean(localStorage.getItem(USER_ACCESS_TOKEN_KEY));
    const isLoginRequest = requestUrl.includes("/auth/login");

    if (
      status === 401 &&
      hadAccessToken &&
      !isLoginRequest &&
      !redirectingToLogin
    ) {
      redirectingToLogin = true;
      useAuthStore.getState().logout();
      useCoinStore.getState().setCoins(0);
      localStorage.removeItem(USER_ACCESS_TOKEN_KEY);
      localStorage.removeItem("token");
      localStorage.removeItem("auth-store");
      localStorage.removeItem("coin-store");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default API;
