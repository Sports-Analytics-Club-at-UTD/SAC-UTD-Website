import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Change this if your team's login route ends up somewhere other than
// /login — it's the one place this needs to be updated.
export const LOGIN_PATH = "/login";

/**
 * The one auth gate genuinely shared across the whole app — logged in
 * or not, nothing role-specific. The Director Portal's own
 * director/section gates live in src/portal/guards.jsx instead, since
 * their "access denied" destination is portal-internal, not something
 * the rest of the app needs to know about.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to={LOGIN_PATH} state={{ from: location }} replace />;

  return <Outlet />;
}

export function FullPageLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <span>Loading session…</span>
    </div>
  );
}
