import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ExecPage from "../pages/ExecPage";

vi.mock("../apiClient", () => ({
  portalApi: { listRequests: vi.fn(), resolveRequest: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { portalApi } from "../apiClient";

const REQUESTS = [
  { id: 1, title: "Fix homepage bug", category: "site_bug", submitted_by_name: "mkt_dir", status: "open" },
  { id: 2, title: "Already handled", category: "general", submitted_by_name: "fin_dir", status: "resolved" },
];

describe("ExecPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only shows OPEN requests in the actionable list, not already-resolved ones", async () => {
    portalApi.listRequests.mockResolvedValue(REQUESTS);
    render(<ExecPage />);

    expect(await screen.findByText("Fix homepage bug")).toBeInTheDocument();
    expect(screen.queryByText("Already handled")).not.toBeInTheDocument();
  });

  it("shows submitter and category as context on each request", async () => {
    portalApi.listRequests.mockResolvedValue([REQUESTS[0]]);
    render(<ExecPage />);
    expect(await screen.findByText(/site_bug.*mkt_dir/i)).toBeInTheDocument();
  });

  it("resolving a request calls resolveRequest and removes it from the open list", async () => {
    const user = userEvent.setup();
    portalApi.listRequests.mockResolvedValue([REQUESTS[0]]);
    portalApi.resolveRequest.mockResolvedValue({});
    render(<ExecPage />);

    await screen.findByText("Fix homepage bug");
    await user.click(screen.getByRole("button", { name: /mark resolved/i }));

    await waitFor(() => {
      expect(portalApi.resolveRequest).toHaveBeenCalledWith(1, { status: "resolved" });
    });
    await waitFor(() => {
      expect(screen.queryByText("Fix homepage bug")).not.toBeInTheDocument();
    });
  });

  it("shows a friendly message when there are no open requests", async () => {
    portalApi.listRequests.mockResolvedValue([]);
    render(<ExecPage />);
    expect(await screen.findByText(/no open requests/i)).toBeInTheDocument();
  });
});
