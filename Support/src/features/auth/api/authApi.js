import apiClient, {
  SUPPORT_TOKEN_KEY,
  SUPPORT_USER_KEY,
} from "../../../shared/api/apiClient";

const saveSession = (token, user) => {
  localStorage.setItem(SUPPORT_TOKEN_KEY, token);
  localStorage.setItem(SUPPORT_USER_KEY, JSON.stringify(user));
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(SUPPORT_USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const login = async (username, password) => {
  try {
    const response = await apiClient.post("/auth/login", { username, password });
    const session = response.data?.data;

    if (!session?.accessToken || !session?.user) {
      throw new Error("Authentication failed.");
    }
    if (session.user.role !== "support") {
      throw new Error("Access denied. Support accounts only.");
    }

    saveSession(session.accessToken, session.user);
    return session;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || "Unable to sign in.",
      { cause: error },
    );
  }
};

export const getCurrentUser = async (signal) => {
  const response = await apiClient.get("/auth/me", { signal });
  const user = response.data?.data?.user;
  if (user?.role !== "support") throw new Error("Support access required.");
  localStorage.setItem(SUPPORT_USER_KEY, JSON.stringify(user));
  return user;
};

export const logout = async () => {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    localStorage.removeItem(SUPPORT_TOKEN_KEY);
    localStorage.removeItem(SUPPORT_USER_KEY);
  }
};
