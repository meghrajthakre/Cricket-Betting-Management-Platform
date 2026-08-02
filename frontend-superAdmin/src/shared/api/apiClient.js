  import axios from "axios";

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    withCredentials: true,
    timeout: 10000,
  });

  // ── Request interceptor — attach Bearer token for mobile ──────────────────────
  api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  // ── Response interceptor — global 401 handler ─────────────────────────────────
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        sessionStorage.removeItem("accessToken");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  export default api;