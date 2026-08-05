import api from "../../../shared/api/apiClient";

export const getSubCompanies = () => api.get("/sub-companies").then((response) => response.data);
export const getNextSubCompanyUsername = () => api.get("/sub-companies/next-username").then((response) => response.data);
export const createSubCompany = (body) => api.post("/sub-companies", body).then((response) => response.data);
export const toggleSubCompanyStatus = (id) => api.patch(`/sub-companies/${id}/status`).then((response) => response.data);
