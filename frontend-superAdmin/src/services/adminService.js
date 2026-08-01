import api from "../constants/api";

export const getAdmins = (params, signal) =>
  api.get("/superadmin/admins", { params, signal }).then((response) => response.data);

export const createAdmin = (body) =>
  api.post("/superadmin/admins", body).then((r) => r.data);

export const toggleAdminStatus = (id) =>
  api.patch(`/superadmin/admins/${id}/status`).then((r) => r.data);

export const changeAdminPassword = (id, password, confirmPassword) =>
  api
    .patch(`/superadmin/admins/${id}/password`, { password, confirmPassword })
    .then((r) => r.data);

export const updateAdmin = (id, updates) =>
  api.put(`/superadmin/admins/${id}`, updates).then((r) => r.data);

export const deleteAdmin = (id) =>
  api.delete(`/superadmin/admins/${id}`).then((r) => r.data);
