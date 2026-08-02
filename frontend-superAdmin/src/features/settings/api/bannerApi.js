import api from "../../../shared/api/apiClient";

export const getBanner = () =>
  api.get("/banner").then((response) => response.data);

export const updateBanner = (text, speed) =>
  api.put("/banner", { text, speed }).then((response) => response.data);
