import { Routes, Route } from "react-router-dom";
import { RequireAuth } from "../shared/RequireAuth";
import { RequireDirector, RequireSection } from "./guards";
import DirectorPortalLayout from "./pages/DirectorPortalLayout";
import DashboardPage from "./pages/DashboardPage";
import SecretaryPage from "./pages/SecretaryPage";
import EventsPage from "./pages/EventsPage";
import MarketingPage from "./pages/MarketingPage";
import FinancePage from "./pages/FinancePage";
import RndPage from "./pages/RndPage";
import ExecPage from "./pages/ExecPage";
import ForbiddenPage from "./ForbiddenPage";
import "./portal.css";

/**
 * The entire Director Portal, self-contained. Mount it with exactly
 * ONE line in your app's router:
 *
 *   <Route path="/portal/*" element={<DirectorPortalApp />} />
 *
 * That's the full integration surface. Nothing else needs to import
 * from src/portal/, know its internal route structure, or coordinate
 * file names with it — this module owns everything under /portal/
 * and nothing outside it.
 *
 * Requirements from the rest of the app:
 *   1. <AuthProvider> (src/shared/AuthContext.jsx) must wrap the whole
 *      app once, above this route — this module reads auth state via
 *      useAuth() rather than managing its own session.
 *   2. A route at /login must exist somewhere (see
 *      src/shared/RequireAuth.jsx's LOGIN_PATH constant) for the
 *      redirect-when-logged-out case to land somewhere real.
 *   3. To show/hide a nav link to this portal, import
 *      DirectorPortalNavLink from "./portal/DirectorPortalNavLink" and
 *      drop it into your own navbar — don't build a competing one.
 *
 * The .sac-portal wrapper below is where ALL of this module's styling
 * lives (see portal.css) — every class and CSS variable in that file
 * is scoped under it, so importing this component cannot visually
 * affect anything outside of it.
 */
export default function DirectorPortalApp() {
  return (
    <div className="sac-portal">
      <Routes>
        <Route path="forbidden" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<RequireDirector />}>
            <Route element={<DirectorPortalLayout />}>
              <Route index element={<DashboardPage />} />

              <Route element={<RequireSection section="secretary" />}>
                <Route path="secretary" element={<SecretaryPage />} />
              </Route>
              <Route element={<RequireSection section="events" />}>
                <Route path="events" element={<EventsPage />} />
              </Route>
              <Route element={<RequireSection section="marketing" />}>
                <Route path="marketing" element={<MarketingPage />} />
              </Route>
              <Route element={<RequireSection section="finance" />}>
                <Route path="finance" element={<FinancePage />} />
              </Route>
              <Route element={<RequireSection section="rnd" />}>
                <Route path="rnd" element={<RndPage />} />
              </Route>
              <Route element={<RequireSection section="exec" />}>
                <Route path="exec" element={<ExecPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
