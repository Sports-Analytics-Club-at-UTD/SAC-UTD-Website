import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MarketingPage from "../pages/MarketingPage";

vi.mock("../apiClient", () => ({
  portalApi: { listMedia: vi.fn(), reviewMedia: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { portalApi } from "../apiClient";

const UPLOADS = [
  { id: 1, title: "Tailgate photo", uploaded_by: "officer1", status: "pending" },
  { id: 2, title: "Old approved photo", uploaded_by: "officer2", status: "approved" },
];

describe("MarketingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("splits uploads into a pending queue and an already-reviewed table", async () => {
    portalApi.listMedia.mockResolvedValue(UPLOADS);
    render(<MarketingPage />);

    expect(await screen.findByText("Tailgate photo")).toBeInTheDocument();
    expect(screen.getByText("Old approved photo")).toBeInTheDocument();
    expect(screen.getByText(/already reviewed/i)).toBeInTheDocument();
  });

  it("unwraps a paginated response — /api/media/ IS paginated unlike /api/media/approved/", async () => {
    // Regression coverage for the exact bug fixed during development:
    // MarketingPage originally assumed a bare array from this endpoint.
    portalApi.listMedia.mockResolvedValue({
      count: 1, next: null, previous: null,
      results: [{ id: 3, title: "Paginated upload", uploaded_by: "officer3", status: "pending" }],
    });
    render(<MarketingPage />);
    expect(await screen.findByText("Paginated upload")).toBeInTheDocument();
  });

  it("approving an upload calls reviewMedia with status=approved and moves it out of the pending queue", async () => {
    const user = userEvent.setup();
    portalApi.listMedia.mockResolvedValue([UPLOADS[0]]);
    portalApi.reviewMedia.mockResolvedValue({});
    render(<MarketingPage />);

    await screen.findByText("Tailgate photo");
    await user.click(screen.getByRole("button", { name: /^approve$/i }));

    await waitFor(() => {
      expect(portalApi.reviewMedia).toHaveBeenCalledWith(1, { status: "approved" });
    });
    // Once approved, it should move into "already reviewed", not vanish.
    expect(await screen.findByText(/already reviewed/i)).toBeInTheDocument();
  });

  it("rejecting an upload calls reviewMedia with status=rejected", async () => {
    const user = userEvent.setup();
    portalApi.listMedia.mockResolvedValue([UPLOADS[0]]);
    portalApi.reviewMedia.mockResolvedValue({});
    render(<MarketingPage />);

    await screen.findByText("Tailgate photo");
    await user.click(screen.getByRole("button", { name: /^reject$/i }));

    await waitFor(() => {
      expect(portalApi.reviewMedia).toHaveBeenCalledWith(1, { status: "rejected" });
    });
  });

  it("shows a placeholder title for an upload with no title set", async () => {
    portalApi.listMedia.mockResolvedValue([{ id: 4, title: "", uploaded_by: "officer4", status: "pending" }]);
    render(<MarketingPage />);
    expect(await screen.findByText("Untitled upload")).toBeInTheDocument();
  });

  it("shows a friendly message when there's nothing pending", async () => {
    portalApi.listMedia.mockResolvedValue([]);
    render(<MarketingPage />);
    expect(await screen.findByText(/nothing waiting on review/i)).toBeInTheDocument();
  });
});
