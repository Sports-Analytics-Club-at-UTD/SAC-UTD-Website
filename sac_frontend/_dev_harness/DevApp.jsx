import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "../src/shared/AuthContext";
import DirectorPortalApp from "../src/portal/DirectorPortalApp";
import DevHomePage from "./DevHomePage";
import DevLoginPage from "./DevLoginPage";

/**
 * ⚠️ DEV HARNESS ONLY — see DevHomePage.jsx for why.
 *
 * This is what your App.jsx should end up looking like structurally,
 * minus the "Dev" prefixes: AuthProvider wraps everything once, your
 * real pages take "/" and "/login" (and "/member", "/signup", etc),
 * and the Director Portal mounts with exactly the one line below.
 */
export default function DevApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<DevHomePage />} />
        <Route path="/login" element={<DevLoginPage />} />

        {/* <-- This is the actual integration point. Everything else
               in this file is throwaway dev scaffolding. */}
        <Route path="/portal/*" element={<DirectorPortalApp />} />
      </Routes>
    </AuthProvider>
  );
}
