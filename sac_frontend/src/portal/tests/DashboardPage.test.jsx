import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";

vi.mock("../apiClient", () => ({
  portalApi: { dashboard: vi.fn() },
}));

import { portalApi } from "../apiClient";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the dashboard payload resolves", () => {
    portalApi.dashboard.mockReturnValue(new Promise(() => {})); // never resolves
    renderDashboard();
    expect(screen.getByText(/loading your dashboard/i)).toBeInTheDocument();
  });

  it("shows an error message if the dashboard fetch fails", async () => {
    portalApi.dashboard.mockRejectedValue(new Error("network error"));
    renderDashboard();
    expect(await screen.findByText(/couldn't load your dashboard/i)).toBeInTheDocument();
  });

  it("renders one card per section the backend returned, with the right metric", async () => {
    portalApi.dashboard.mockResolvedValue({
      secretary: { pending_members: 3 },
      finance: { balance: 1250.5 },
    });
    renderDashboard();

    expect(await screen.findByText("Secretary")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/members awaiting approval/i)).toBeInTheDocument();

    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("$1,250.5")).toBeInTheDocument();
  });

  it("only renders cards for sections actually present in the response", async () => {
    // A Finance Director's dashboard response only ever has a "finance"
    // key (see portal/views.py's accessible_sections scoping) — this
    // proves the frontend respects that rather than assuming every
    // section is always present.
    portalApi.dashboard.mockResolvedValue({ finance: { balance: 100 } });
    renderDashboard();

    expect(await screen.findByText("Finance")).toBeInTheDocument();
    expect(screen.queryByText("Secretary")).not.toBeInTheDocument();
    expect(screen.queryByText("Events")).not.toBeInTheDocument();
  });

  it("shows a fallback message when no sections are available at all", async () => {
    portalApi.dashboard.mockResolvedValue({});
    renderDashboard();
    expect(await screen.findByText(/no sections available/i)).toBeInTheDocument();
  });
});
