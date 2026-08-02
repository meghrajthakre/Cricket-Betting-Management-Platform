import api from "./apiClient";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const loginUser = async (username, password) => {
  const res = await api.post("/auth/login", {
    username: username.trim().toLowerCase(),
    password,
  });

  // Store token in sessionStorage so the axios interceptor
  // can attach it as Authorization: Bearer <token> on every request.
  // This is the mobile fix — cookies are often blocked on mobile browsers.
  const token = res.data?.data?.accessToken;
  if (token) {
    sessionStorage.setItem("accessToken", token);
  }

  return res.data;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    // Always clear local token even if server request fails
    sessionStorage.removeItem("accessToken");
  }
};

export const getMe = (signal) =>
  api.get("/auth/me", { signal }).then((r) => r.data);

// ── Users (superadmin) ────────────────────────────────────────────────────────

export const getUsers = (params, signal) =>
  api.get("/superadmin/users", { params, signal }).then((response) => response.data);

export const getUser = (id) =>
  api.get(`/superadmin/users/${id}`).then((r) => r.data);

export const createUser = (body) =>
  api.post("/superadmin/users", body).then((r) => r.data);

export const updateUser = (id, body) =>
  api.patch(`/superadmin/users/${id}`, body).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`/superadmin/users/${id}`).then((r) => r.data);

export const toggleUserStatus = (id) =>
  api.patch(`/superadmin/users/${id}/status`).then((r) => r.data);

export const changeUserPassword = (id, password, confirmPassword) =>
  api
    .patch(`/superadmin/users/${id}/password`, { password, confirmPassword })
    .then((r) => r.data);

