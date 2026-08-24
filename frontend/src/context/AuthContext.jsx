import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, authApi } from '../api/client.js';

const TOKEN_KEY = 'mediconnect.token';
const AuthContext = createContext(null);

const readStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  // Starts true when a token exists: we do not yet know if it is still valid,
  // and routes must wait rather than bouncing the user to /login.
  const [loading, setLoading] = useState(Boolean(readStoredToken()));

  const persistToken = useCallback((next) => {
    setToken(next);
    try {
      if (next) localStorage.setItem(TOKEN_KEY, next);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage unavailable; the session simply will not survive a reload.
    }
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  /*
   * Verify a stored token on startup. A 24h JWT can easily expire while the tab
   * is closed, and rendering a logged-in shell around a dead token means every
   * action fails with a 401. Checking once here avoids that.
   */
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const payload = await authApi.me(token);
        if (!cancelled) setUser(payload.data);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          logout();
        }
        // Any other failure (server down) leaves the token in place so a
        // reload once the API is back does not force a fresh login.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const adoptSession = useCallback(
    ({ user: nextUser, token: nextToken }) => {
      persistToken(nextToken);
      setUser(nextUser);
      setLoading(false);
      return nextUser;
    },
    [persistToken]
  );

  const login = useCallback(
    async (credentials) => adoptSession((await authApi.login(credentials)).data),
    [adoptSession]
  );

  const register = useCallback(
    async (details) => adoptSession((await authApi.register(details)).data),
    [adoptSession]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
      isDoctor: user?.role === 'doctor',
      isPatient: user?.role === 'patient',
    }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
