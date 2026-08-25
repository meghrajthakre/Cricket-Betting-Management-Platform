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

  // Feature screens handle authorization errors; a 401 must not erase the session.
  api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );

  export default api;
