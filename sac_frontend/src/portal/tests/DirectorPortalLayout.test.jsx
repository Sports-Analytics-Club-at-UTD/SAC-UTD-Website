import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import DirectorPortalLayout from "../pages/DirectorPortalLayout";

vi.mock("../../shared/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../shared/AuthContext";

function renderLayout(authValue) {
  useAuth.mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={["/portal"]}>
      <Routes>
        <Route path="/portal" element={<DirectorPortalLayout />}>
          <Route index element={<div>Outlet Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("DirectorPortalLayout", () => {
  it("greets the logged-in user by username", () => {
    renderLayout({
      user: { username: "fin_dir", role: "director_finance" },
      portalAccess: { sections: ["finance"], is_exec: false },
    });
    expect(screen.getByText(/welcome back, fin_dir/i)).toBeInTheDocument();
  });

  it("renders a tab only for sections the backend actually granted", () => {
    renderLayout({
      user: { username: "fin_dir", role: "director_finance" },
      portalAccess: { sections: ["finance"], is_exec: false },
    });

    expect(screen.getByRole("link", { name: "Finance" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Secretary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Marketing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "R&D" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Exec" })).not.toBeInTheDocument();
  });

  it("renders all six section tabs for Exec", () => {
    renderLayout({
      user: { username: "exec_person", role: "exec" },
      portalAccess: {
        sections: ["secretary", "events", "marketing", "finance", "rnd", "exec"],
        is_exec: true,
      },
    });

    for (const label of ["Secretary", "Events", "Marketing", "Finance", "R&D", "Exec"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("renders the RoleBadge with the exec ALL SECTIONS suffix when is_exec is true", () => {
    renderLayout({
      user: { username: "exec_person", role: "exec" },
      portalAccess: { sections: ["exec"], is_exec: true },
    });
    expect(screen.getByText(/ALL SECTIONS/)).toBeInTheDocument();
  });

  it("still renders the Dashboard tab even when portalAccess hasn't loaded yet", () => {
    renderLayout({
      user: { username: "fin_dir", role: "director_finance" },
      portalAccess: null,
    });
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("renders the nested route's content via Outlet", () => {
    renderLayout({
      user: { username: "fin_dir", role: "director_finance" },
      portalAccess: { sections: ["finance"], is_exec: false },
    });
    expect(screen.getByText("Outlet Content")).toBeInTheDocument();
  });
});
