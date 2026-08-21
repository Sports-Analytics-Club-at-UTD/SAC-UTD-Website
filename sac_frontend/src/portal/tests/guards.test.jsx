import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { RequireAuth } from "../../shared/RequireAuth";
import { RequireDirector, RequireSection } from "../guards";

// Mock the shared auth context so each test controls exactly what
// "the logged-in user" looks like, without a real AuthProvider or
// live API calls. Both RequireAuth (shared/) and RequireDirector/
// RequireSection (portal/guards.jsx) import useAuth from this same
// module, so one mock covers all three gates.
vi.mock("../../shared/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../shared/AuthContext";

function renderPortalTree(authValue, initialPath = "/portal") {
  useAuth.mockReturnValue(authValue);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/portal/forbidden" element={<div>Forbidden Page</div>} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireDirector />}>
            {/* Portal Shell renders an Outlet, same as the real
                DirectorPortalLayout, so nested section routes below
                it actually get a chance to render. */}
            <Route
              path="/portal"
              element={
                <div>
                  Portal Shell
                  <Outlet />
                </div>
              }
            >
              <Route element={<RequireSection section="finance" />}>
                <Route path="finance" element={<div>Finance Page</div>} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  it("redirects to /login when nobody is logged in", () => {
    renderPortalTree({ user: null, loading: false, portalAccess: null });
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("shows a loading state instead of redirecting while the session is still resolving", () => {
    // Without this guard, a brief loading window would flash "redirect
    // to /login" for an already-logged-in user on every page refresh,
    // before whoami() has had a chance to resolve.
    renderPortalTree({ user: null, loading: true, portalAccess: null });
    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });
});

describe("RequireDirector", () => {
  it("sends a logged-in but non-director user to /portal/forbidden, not /login", () => {
    // A member IS authenticated — RequireAuth passes them through
    // fine. This gate exists to catch a different failure: logged in,
    // but not a director.
    renderPortalTree({
      user: { username: "plain_member", is_director: false },
      loading: false,
      portalAccess: null,
    });
    expect(screen.getByText("Forbidden Page")).toBeInTheDocument();
  });

  it("sends an officer (not just a plain member) to /portal/forbidden too", () => {
    renderPortalTree({
      user: { username: "mkt_officer", is_director: false, is_officer: true },
      loading: false,
      portalAccess: null,
    });
    expect(screen.getByText("Forbidden Page")).toBeInTheDocument();
  });

  it("renders the portal shell for a director", () => {
    renderPortalTree({
      user: { username: "fin_dir", is_director: true },
      loading: false,
      portalAccess: { sections: ["finance"], is_exec: false },
    });
    expect(screen.getByText("Portal Shell")).toBeInTheDocument();
  });
});

describe("RequireSection", () => {
  it("redirects to /portal/forbidden when this section isn't in the user's access list", () => {
    // A real scenario: an Events Director typing /portal/finance
    // directly, or an old bookmark. Being a director gets them past
    // RequireDirector; not having "finance" in their sections list is
    // what stops them here specifically.
    renderPortalTree(
      {
        user: { username: "events_dir", is_director: true },
        loading: false,
        portalAccess: { sections: ["events"], is_exec: false },
      },
      "/portal/finance"
    );
    expect(screen.getByText("Forbidden Page")).toBeInTheDocument();
  });

  it("renders the section when it IS in the user's access list", () => {
    renderPortalTree(
      {
        user: { username: "fin_dir", is_director: true },
        loading: false,
        portalAccess: { sections: ["finance"], is_exec: false },
      },
      "/portal/finance"
    );
    expect(screen.getByText("Finance Page")).toBeInTheDocument();
  });

  it("Exec (with every section) can reach any section", () => {
    renderPortalTree(
      {
        user: { username: "exec_person", is_director: true },
        loading: false,
        portalAccess: {
          sections: ["secretary", "events", "marketing", "finance", "rnd", "exec"],
          is_exec: true,
        },
      },
      "/portal/finance"
    );
    expect(screen.getByText("Finance Page")).toBeInTheDocument();
  });
});
