import api from "./apiClient";

export const getNextUsername = (signal) =>
  api
    .get("/sub-companies/panel/users/next-username", { signal })
    .then((response) => response.data);
export const getLimitSummary = (signal) =>
  api
    .get("/sub-companies/panel/limit-summary", { signal })
    .then((response) => response.data);
export const getUsers = (params, signal) =>
  api
    .get("/sub-companies/panel/users", { params, signal })
    .then((response) => response.data);
export const createUser = (body) =>
  api
    .post("/sub-companies/panel/users", body)
    .then((response) => response.data);
export const toggleUserStatus = (id) =>
  api
    .patch(`/sub-companies/panel/users/${id}/status`)
    .then((response) => response.data);
export const changeUserPassword = (id, password, confirmPassword) =>
  api
    .patch(`/sub-companies/panel/users/${id}/password`, {
      password,
      confirmPassword,
    })
    .then((response) => response.data);
export const updateUserBalance = (id, coins) =>
  api
    .patch(`/sub-companies/panel/users/${id}/balance`, { coins })
    .then((response) => response.data);
export const deleteUser = (id) =>
  api
    .delete(`/sub-companies/panel/users/${id}`)
    .then((response) => response.data);
