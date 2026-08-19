import { useAuth } from "../src/shared/AuthContext";
import DirectorPortalNavLink from "../src/portal/DirectorPortalNavLink";

/**
 * ⚠️ DEV HARNESS ONLY — not part of the real app.
 *
 * This is a deliberately plain, minimally-styled stand-in for whatever
 * homepage the co-director builds. It exists so this module can be
 * tested end-to-end (login -> see/not-see the portal link -> enter the
 * portal -> get gated correctly) without waiting on their actual page.
 *
 * Notice it uses NONE of the sac-* classes or --sac-* variables from
 * portal.css — that's intentional, proving the portal's styling can't
 * leak out and affect a page that never opts into it.
 *
 * Delete this whole _dev_harness/ folder when merging with the real
 * homepage — nothing in src/portal/ or src/shared/ depends on it.
 */
export default function DevHomePage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40, background: "#fff", minHeight: "100vh" }}>
      <p style={{ background: "#ffe58a", padding: 12, fontSize: 13, marginBottom: 24 }}>
        Dev harness homepage — placeholder for local testing only.
      </p>

      <h1>Sports Analytics Club (placeholder homepage)</h1>

      <p>
        <a href="/portfolio" className="dev-portal-link">
          Portfolio
        </a>
      </p>

      {user ? (
        <div style={{ marginTop: 16 }}>
          <p>
            Logged in as <strong>{user.username}</strong> ({user.role})
          </p>
          {/* This is the actual integration point: drop this component
              into whatever navbar the co-director builds. */}
          <DirectorPortalNavLink className="dev-portal-link" />
          {/* Projects Portal has no role gating — a plain link works
              for any logged-in member, no conditional component needed. */}
          <div style={{ marginTop: 8 }}>
            <a href="/projects" className="dev-portal-link">
              Projects
            </a>
          </div>
          <div style={{ marginTop: 12 }}>
            <button onClick={logout}>Log out</button>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 16 }}>
          <a href="/login">Log in</a>
        </p>
      )}

      <style>{`.dev-portal-link { display: inline-block; margin-top: 8px; padding: 8px 16px; background: #333; color: #fff; text-decoration: none; }`}</style>
    </div>
  );
}