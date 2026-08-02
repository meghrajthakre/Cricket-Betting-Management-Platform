import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, getStoredUser, login, logout } from "../api/authApi";
import { AuthContext } from "./authContext";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    getCurrentUser(controller.signal)
      .then(setUser)
      .catch((error) => {
        if (error.code !== "ERR_CANCELED") setUser(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const session = await login(username, password);
    setUser(session.user);
    return session;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login: signIn, logout: signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
