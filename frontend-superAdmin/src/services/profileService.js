import api from "../constants/api";

export const getSuperadminProfile = () =>
  api.get("/superadmin/profile").then((r) => r.data);

export const updateSuperadminProfile = (body) =>
  api.patch("/superadmin/profile", body).then((r) => r.data);
