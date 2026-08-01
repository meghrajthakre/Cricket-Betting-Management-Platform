import api from "../constants/api";

export const getBanner = () =>
  api.get("/banner").then((response) => response.data);

export const updateBanner = (text) =>
  api.put("/banner", { text }).then((response) => response.data);
