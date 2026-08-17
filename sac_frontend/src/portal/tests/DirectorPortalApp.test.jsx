import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import DirectorPortalApp from "../DirectorPortalApp";

vi.mock("../../shared/AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("../apiClient", () => ({
  portalApi: { dashboard: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { useAuth } from "../../shared/AuthContext";
import { portalApi } from "../apiClient";

/**
 * Unlike portal/tests/guards.test.jsx (which builds its OWN small route
 * tree to test RequireAuth/RequireDirector/RequireSection in
 * isolation), this file renders the actual, real DirectorPortalApp
 * exactly the way the co-director's App.jsx would mount it:
 *
 *   <Route path="/portal/*" element={<DirectorPortalApp />} />
 *
 * This is what actually proves the "one-line mount" claim in the
 * README works, not just that the individual gate components behave
 * correctly in a synthetic tree.
 */
function renderApp(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/portal/*" element={<DirectorPortalApp />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DirectorPortalApp (integration smoke test)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gates a logged-out visitor to the real top-level /login route", () => {
    useAuth.mockReturnValue({ user: null, loading: false, portalAccess: null });
    renderApp("/portal");
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("gates a non-director to the real ForbiddenPage component, not a stand-in", () => {
    useAuth.mockReturnValue({
      user: { username: "member1", is_director: false },
      loading: false,
      portalAccess: null,
    });
    renderApp("/portal");
    expect(screen.getByText(/isn't part of your clearance/i)).toBeInTheDocument();
  });

  it("renders the real Dashboard, inside the real Layout, for a director hitting the index route", async () => {
    portalApi.dashboard.mockResolvedValue({ finance: { balance: 500 } });
    useAuth.mockReturnValue({
      user: { username: "fin_dir", is_director: true, role: "director_finance" },
      loading: false,
      portalAccess: { sections: ["finance"], is_exec: false },
    });
    renderApp("/portal");

    // From DirectorPortalLayout (the real layout, not a mock):
    expect(await screen.findByText(/welcome back, fin_dir/i)).toBeInTheDocument();
    // From DashboardPage (the real page, actually fetching via the
    // mocked portalApi.dashboard — proves the whole chain is wired,
    // not just that isolated components render in a vacuum):
    expect(await screen.findByText("$500")).toBeInTheDocument();
    expect(screen.getByText(/current balance/i)).toBeInTheDocument();
  });

  it("gates a director without the right section to ForbiddenPage, before the section page ever mounts", () => {
    useAuth.mockReturnValue({
      user: { username: "fin_dir", is_director: true, role: "director_finance" },
      loading: false,
      portalAccess: { sections: ["finance"], is_exec: false }, // no "secretary"
    });
    renderApp("/portal/secretary");
    expect(screen.getByText(/isn't part of your clearance/i)).toBeInTheDocument();
  });
});
