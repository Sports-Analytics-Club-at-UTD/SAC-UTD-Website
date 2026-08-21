import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, getToken, setToken } from "./apiClient";

const AuthContext = createContext(null);

/**
 * Shared session state — used by the Director Portal AND whatever the
 * co-director builds for the member page / navbar / anywhere else that
 * needs to know "who's logged in." This should wrap the whole app
 * exactly once, at the top level, regardless of which branch's routes
 * are underneath it.
 *
 * This is the frontend half of the IAM story, not the authority: every
 * director-only endpoint enforces its own permission check on the
 * backend independently of anything this context believes.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // whoami payload, or null if logged out
  const [portalAccess, setPortalAccess] = useState(null); // {sections, is_exec}, or null
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setPortalAccess(null);
      setLoading(false);
      return;
    }
    try {
      const whoami = await api.whoami();
      setUser(whoami);

      if (whoami.is_director) {
        try {
          // Lazily imported so a non-director session (the common case
          // for most of the site) never even requests this endpoint,
          // and so src/shared has no hard dependency on src/portal.
          const { portalApi } = await import("../portal/apiClient");
          const access = await portalApi.access();
          setPortalAccess(access);
        } catch {
          setPortalAccess(null);
        }
      } else {
        setPortalAccess(null);
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setToken(null);
      }
      setUser(null);
      setPortalAccess(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(
    async (username, password) => {
      const { token } = await api.login(username, password);
      setToken(token);
      await loadSession();
    },
    [loadSession]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPortalAccess(null);
  }, []);

  const value = { user, portalAccess, loading, login, logout, refresh: loadSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}
