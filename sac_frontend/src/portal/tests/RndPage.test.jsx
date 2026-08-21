import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RndPage from "../pages/RndPage";

vi.mock("../apiClient", () => ({
  portalApi: { listIdeas: vi.fn(), listRndTodos: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { portalApi } from "../apiClient";

describe("RndPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders ideas and to-dos in their own independent columns", async () => {
    portalApi.listIdeas.mockResolvedValue([{ id: 1, title: "Player tracking model", status: "proposed" }]);
    portalApi.listRndTodos.mockResolvedValue([{ id: 1, title: "Audit site traffic", status: "open" }]);
    render(<RndPage />);

    expect(await screen.findByText("Player tracking model")).toBeInTheDocument();
    expect(screen.getByText("Audit site traffic")).toBeInTheDocument();
  });

  it("each column loads and empties independently of the other", async () => {
    portalApi.listIdeas.mockResolvedValue([]);
    portalApi.listRndTodos.mockResolvedValue([{ id: 1, title: "Solo todo", status: "open" }]);
    render(<RndPage />);

    expect(await screen.findByText(/no ideas logged/i)).toBeInTheDocument();
    expect(screen.getByText("Solo todo")).toBeInTheDocument();
  });

  it("unwraps paginated responses for both endpoints", async () => {
    portalApi.listIdeas.mockResolvedValue({ results: [{ id: 2, title: "Paginated idea", status: "proposed" }] });
    portalApi.listRndTodos.mockResolvedValue({ results: [{ id: 2, title: "Paginated todo", status: "open" }] });
    render(<RndPage />);

    expect(await screen.findByText("Paginated idea")).toBeInTheDocument();
    expect(screen.getByText("Paginated todo")).toBeInTheDocument();
  });
});
