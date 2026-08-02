import api from "../../../shared/api/apiClient";

export const getSuperadminProfile = () =>
  api.get("/superadmin/profile").then((r) => r.data);

export const updateSuperadminProfile = (body) =>
  api.patch("/superadmin/profile", body).then((r) => r.data);
