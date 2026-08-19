import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/shared/AuthContext";
import DirectorPortalApp from "../src/portal/DirectorPortalApp";
import ProjectsApp from "../src/projects/ProjectsApp";
import DevHomePage from "./DevHomePage";
import DevLoginPage from "./DevLoginPage";
import PortfolioPage from "../src/portfolio/pages/PortfolioPage";

/**
 * ⚠️ DEV HARNESS ONLY — see DevHomePage.jsx for why.
 *
 * This is what your App.jsx should end up looking like structurally,
 * minus the "Dev" prefixes: AuthProvider wraps everything once, your
 * real pages take "/" and "/login" (and "/member", "/signup", etc),
 * and each self-contained module mounts with its own one-liner.
 */
export default function DevApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<DevHomePage />} />
        <Route path="/login" element={<DevLoginPage />} />

        {/* <-- These two lines are the actual integration points.
               Everything else in this file is throwaway dev scaffolding. */}
        <Route path="/portal/*" element={<DirectorPortalApp />} />
        <Route path="/projects/*" element={<ProjectsApp />} />
        <Route path="/portfolio" element={<PortfolioPage />} />
      </Routes>
    </AuthProvider>
  );
}