import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FinancePage from "../pages/FinancePage";

vi.mock("../apiClient", () => ({
  portalApi: { financeSummary: vi.fn(), listBudgetEntries: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { portalApi } from "../apiClient";

describe("FinancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the balance/income/expense stats once loaded", async () => {
    portalApi.financeSummary.mockResolvedValue({
      balance: 900,
      total_income: 1500,
      total_expense: 600,
    });
    portalApi.listBudgetEntries.mockResolvedValue([]);
    render(<FinancePage />);

    expect(await screen.findByText("$900")).toBeInTheDocument();
    expect(screen.getByText("$1,500")).toBeInTheDocument();
    expect(screen.getByText("$600")).toBeInTheDocument();
  });

  it("renders each budget entry row with its category and amount", async () => {
    portalApi.financeSummary.mockResolvedValue({ balance: 0, total_income: 0, total_expense: 0 });
    portalApi.listBudgetEntries.mockResolvedValue([
      {
        id: 1,
        date: "2026-08-01",
        category_name: "Events",
        entry_type: "expense",
        amount: "150.00",
        description: "Trivia night supplies",
      },
    ]);
    render(<FinancePage />);

    expect(await screen.findByText("Events")).toBeInTheDocument();
    expect(screen.getByText("$150")).toBeInTheDocument();
    expect(screen.getByText("Trivia night supplies")).toBeInTheDocument();
  });

  it("shows a placeholder dash when a budget entry has no description", async () => {
    portalApi.financeSummary.mockResolvedValue({ balance: 0, total_income: 0, total_expense: 0 });
    portalApi.listBudgetEntries.mockResolvedValue([
      { id: 1, date: "2026-08-01", category_name: "Merch", entry_type: "income", amount: "20.00", description: "" },
    ]);
    render(<FinancePage />);

    expect(await screen.findByText("Merch")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries yet", async () => {
    portalApi.financeSummary.mockResolvedValue({ balance: 0, total_income: 0, total_expense: 0 });
    portalApi.listBudgetEntries.mockResolvedValue([]);
    render(<FinancePage />);

    expect(await screen.findByText(/no budget entries recorded/i)).toBeInTheDocument();
  });
});
