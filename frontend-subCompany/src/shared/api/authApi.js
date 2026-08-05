import api from "./apiClient";

export const login = async (username, password) => {
  const response = await api.post("/auth/login", {
    username: username.trim().toLowerCase(),
    password,
  });
  const token = response.data?.data?.accessToken;
  if (token) sessionStorage.setItem("accessToken", token);
  return response.data;
};
export const getMe = (signal) =>
  api.get("/auth/me", { signal }).then((response) => response.data);
export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    sessionStorage.removeItem("accessToken");
  }
};
