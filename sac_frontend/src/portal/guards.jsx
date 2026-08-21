import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../shared/AuthContext";
import { FullPageLoading } from "../shared/RequireAuth";

/**
 * Must specifically be a director/exec, not just logged in. This is
 * what actually keeps a member or officer out of the portal even
 * though RequireAuth already let them through (being logged in isn't
 * the same thing as being a director).
 *
 * Redirects to "forbidden" (relative — resolves to /portal/forbidden
 * since DirectorPortalApp mounts this whole module at /portal/*),
 * NOT a top-level /forbidden route. That's deliberate: this gate
 * doesn't need the rest of the app to define anything for it to work.
 *
 * IMPORTANT: this only controls what renders. The real security
 * boundary is portal.permissions.IsDirectorPortalUser on the backend —
 * every /api/portal/*, /api/events/, /api/finance/* etc endpoint
 * enforces its own permission check regardless of what this component
 * decides to show.
 */
export function RequireDirector() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  // Absolute path, not relative "forbidden" — relative navigation
  // through nested pathless layout routes (RequireAuth -> RequireDirector
  // -> DirectorPortalLayout, none of which declare their own `path`) can
  // resolve ambiguously in React Router v6's declarative <Routes> API.
  // An absolute path removes any doubt regardless of nesting depth.
  if (!user?.is_director) return <Navigate to="/portal/forbidden" replace />;

  return <Outlet />;
}

/**
 * Must have this specific section in their accessible list — stops a
 * Finance Director from reaching /portal/secretary just by typing the
 * URL, even though RequireDirector already let them into the portal
 * generally.
 */
export function RequireSection({ section }) {
  const { portalAccess, loading } = useAuth();

  if (loading) return <FullPageLoading />;
  if (!portalAccess?.sections?.includes(section)) {
    return <Navigate to="/portal/forbidden" replace />;
  }

  return <Outlet />;
}
