import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PortfolioPage from "../pages/PortfolioPage";

vi.mock("../githubClient", () => ({
  listOrgRepos: vi.fn(),
}));

import { listOrgRepos } from "../githubClient";

const REPOS = [
  {
    id: 1,
    name: "sac-backend",
    description: "Django REST backend for the club website.",
    html_url: "https://github.com/Sports-Analytics-Club-at-UTD/sac-backend",
    language: "Python",
    stargazers_count: 4,
  },
  {
    id: 2,
    name: "sac-frontend",
    description: null,
    html_url: "https://github.com/Sports-Analytics-Club-at-UTD/sac-frontend",
    language: "JavaScript",
    stargazers_count: 0,
  },
];

describe("PortfolioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before repos resolve", () => {
    listOrgRepos.mockReturnValue(new Promise(() => {}));
    render(<PortfolioPage />);
    expect(screen.getByText(/loading repositories/i)).toBeInTheDocument();
  });

  it("renders every repo returned, with name and star count", async () => {
    listOrgRepos.mockResolvedValue(REPOS);
    render(<PortfolioPage />);

    expect(await screen.findByText("sac-backend")).toBeInTheDocument();
    expect(screen.getByText("sac-frontend")).toBeInTheDocument();
    expect(screen.getByText("★ 4")).toBeInTheDocument();
    expect(screen.getByText("★ 0")).toBeInTheDocument();
  });

  it("shows the description when present, and omits it entirely when null", async () => {
    listOrgRepos.mockResolvedValue(REPOS);
    render(<PortfolioPage />);

    expect(await screen.findByText(/django rest backend/i)).toBeInTheDocument();
    // sac-frontend has description: null — no empty/undefined text node,
    // no crash, just absent.
    const frontendCard = screen.getByText("sac-frontend").closest("a");
    expect(frontendCard).not.toHaveTextContent("null");
    expect(frontendCard).not.toHaveTextContent("undefined");
  });

  it("every repo card links out to GitHub, opening in a new tab safely", async () => {
    listOrgRepos.mockResolvedValue(REPOS);
    render(<PortfolioPage />);

    const link = await screen.findByRole("link", { name: /sac-backend/i });
    expect(link).toHaveAttribute("href", "https://github.com/Sports-Analytics-Club-at-UTD/sac-backend");
    expect(link).toHaveAttribute("target", "_blank");
    // rel="noopener noreferrer" matters here: without it, a page opened
    // via target="_blank" can access window.opener and redirect the
    // original tab (a real, if obscure, security/UX issue) — not just
    // a lint nitpick.
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows an empty state if the org genuinely has zero public repos", async () => {
    listOrgRepos.mockResolvedValue([]);
    render(<PortfolioPage />);
    expect(await screen.findByText(/no public repositories yet/i)).toBeInTheDocument();
  });

  it("shows the specific error message on failure, not a generic one", async () => {
    listOrgRepos.mockRejectedValue(new Error("GitHub API rate limit reached — try again in a bit."));
    render(<PortfolioPage />);
    expect(await screen.findByText(/rate limit reached/i)).toBeInTheDocument();
  });
});