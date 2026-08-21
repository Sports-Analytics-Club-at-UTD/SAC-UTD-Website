import { Link } from "react-router-dom";
import { useAuth } from "../shared/AuthContext";

/**
 * Drop this into your navbar wherever nav links live:
 *
 *   import DirectorPortalNavLink from "../portal/DirectorPortalNavLink";
 *   ...
 *   <DirectorPortalNavLink />
 *
 * It renders NOTHING for a non-director — not hidden with CSS, never
 * in the DOM — so there's no coordination needed between your navbar
 * and the portal's own access rules. Pass className to match your
 * navbar's existing button styling instead of the portal's.
 */
export default function DirectorPortalNavLink({ className, children = "Director Portal" }) {
  const { user } = useAuth();
  if (!user?.is_director) return null;

  return (
    <Link to="/portal" className={className}>
      {children}
    </Link>
  );
}
