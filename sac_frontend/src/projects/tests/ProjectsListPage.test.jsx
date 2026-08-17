import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjectsListPage from "../pages/ProjectsListPage";

vi.mock("../apiClient", () => ({
  projectsApi: { listProjects: vi.fn() },
  asList: (data) => (Array.isArray(data) ? data : data?.results || []),
}));

import { projectsApi } from "../apiClient";

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectsListPage />
    </MemoryRouter>
  );
}

const PROJECTS = [
  { id: 1, name: "Football Win Probability", status: "active", member_count: 3 },
  { id: 2, name: "Basketball Shot Chart", status: "planning", member_count: 0 },
];

describe("ProjectsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and renders all projects with no search term", async () => {
    projectsApi.listProjects.mockResolvedValue(PROJECTS);
    renderPage();

    expect(await screen.findByText("Football Win Probability")).toBeInTheDocument();
    expect(screen.getByText("Basketball Shot Chart")).toBeInTheDocument();
  });

  it("calls listProjects with the search term as the user types", async () => {
    projectsApi.listProjects.mockResolvedValue(PROJECTS);
    renderPage();
    await screen.findByText("Football Win Probability");

    fireEvent.change(screen.getByLabelText(/filter projects by name/i), {
      target: { value: "Football" },
    });

    await waitFor(() => {
      expect(projectsApi.listProjects).toHaveBeenLastCalledWith("Football");
    });
  });

  it("shows a singular vs plural member count correctly", async () => {
    projectsApi.listProjects.mockResolvedValue(PROJECTS);
    renderPage();

    await screen.findByText("Football Win Probability");
    // 3 members -> plural
    expect(screen.getByText(/3 members/)).toBeInTheDocument();
    // 0 members -> plural too (0 is not 1)
    expect(screen.getByText(/0 members/)).toBeInTheDocument();
  });

  it("shows a search-aware empty state when filtering finds nothing", async () => {
    projectsApi.listProjects.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(projectsApi.listProjects).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/filter projects by name/i), {
      target: { value: "Nonexistent Project" },
    });

    expect(await screen.findByText(/no projects match "Nonexistent Project"/i)).toBeInTheDocument();
  });

  it("shows a generic empty state (not search-specific) when there's no search term", async () => {
    projectsApi.listProjects.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No projects yet.")).toBeInTheDocument();
  });

  it("shows an error message if loading fails", async () => {
    projectsApi.listProjects.mockRejectedValue(new Error("network error"));
    renderPage();
    expect(await screen.findByText(/couldn't load projects/i)).toBeInTheDocument();
  });

  it("each project card links to its own board", async () => {
    projectsApi.listProjects.mockResolvedValue(PROJECTS);
    renderPage();

    const link = await screen.findByRole("link", { name: /football win probability/i });
    expect(link).toHaveAttribute("href", "/projects/1");
  });
});