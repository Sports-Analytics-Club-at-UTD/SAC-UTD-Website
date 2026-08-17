import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProjectBoardPage from "../pages/ProjectBoardPage";

vi.mock("../apiClient", () => ({
  projectsApi: { getProject: vi.fn(), updateTask: vi.fn() },
}));

import { projectsApi } from "../apiClient";

const PROJECT = {
  id: 1,
  name: "Football Win Probability",
  description: "Predict win probability live during games.",
  members: [
    { id: 1, username: "alice" },
    { id: 2, username: "bob" },
  ],
  tasks: [
    { id: 10, title: "Clean 2025 play-by-play data", column: "todo" },
    { id: 11, title: "Build baseline model", column: "in_progress" },
  ],
};

function renderBoard(projectId = "1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectBoardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProjectBoardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before the project resolves", () => {
    projectsApi.getProject.mockReturnValue(new Promise(() => {}));
    renderBoard();
    expect(screen.getByText(/loading board/i)).toBeInTheDocument();
  });

  it("shows a full-page error if the project itself fails to load", async () => {
    projectsApi.getProject.mockRejectedValue(new Error("404"));
    renderBoard();
    expect(await screen.findByText(/couldn't load this project/i)).toBeInTheDocument();
  });

  it("renders the project name, description, and member roster", async () => {
    projectsApi.getProject.mockResolvedValue(PROJECT);
    renderBoard();

    expect(await screen.findByText("Football Win Probability")).toBeInTheDocument();
    expect(screen.getByText(/predict win probability live/i)).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("shows a placeholder when nobody is assigned to the project", async () => {
    projectsApi.getProject.mockResolvedValue({ ...PROJECT, members: [] });
    renderBoard();
    expect(await screen.findByText(/no one assigned yet/i)).toBeInTheDocument();
  });

  it("places each task under its own column, correctly identified by aria-label", async () => {
    projectsApi.getProject.mockResolvedValue(PROJECT);
    renderBoard();

    const todoSelect = await screen.findByLabelText('Move "Clean 2025 play-by-play data"');
    expect(todoSelect).toHaveValue("todo");

    const inProgressSelect = screen.getByLabelText('Move "Build baseline model"');
    expect(inProgressSelect).toHaveValue("in_progress");
  });

  it("moving a task calls updateTask and updates its column", async () => {
    projectsApi.getProject.mockResolvedValue(PROJECT);
    projectsApi.updateTask.mockResolvedValue({});
    renderBoard();

    const select = await screen.findByLabelText('Move "Clean 2025 play-by-play data"');
    fireEvent.change(select, { target: { value: "done" } });

    await waitFor(() => {
      expect(projectsApi.updateTask).toHaveBeenCalledWith(10, { column: "done" });
    });

    // Re-query rather than reuse `select`. Tasks are grouped by
    // filtering project.tasks per column, so once this task's column
    // changes, its JSX moves out of the "To Do" column's <div> and
    // into the "Done" column's <div> — React unmounts the old <select>
    // and mounts a new one elsewhere in the tree. The original
    // `select` reference is now a stale, detached DOM node that will
    // never reflect the update; re-querying by the same aria-label
    // finds the live element wherever it currently renders.
    const movedSelect = await screen.findByLabelText('Move "Clean 2025 play-by-play data"');
    expect(movedSelect).toHaveValue("done");
  });

  it("a failed move shows an inline error WITHOUT wiping the rest of the board", async () => {
    projectsApi.getProject.mockResolvedValue(PROJECT);
    projectsApi.updateTask.mockRejectedValue(new Error("server error"));
    renderBoard();

    const select = await screen.findByLabelText('Move "Clean 2025 play-by-play data"');
    fireEvent.change(select, { target: { value: "done" } });

    expect(await screen.findByText(/couldn't move "clean 2025 play-by-play data"/i)).toBeInTheDocument();
    // The board itself — project name, other task, roster — must still
    // be fully visible. This is the exact bug class fixed in
    // SecretaryPage: a failed action must not blank the whole page.
    expect(screen.getByText("Football Win Probability")).toBeInTheDocument();
    expect(screen.getByText("Build baseline model")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    // And the task's column should NOT have changed, since the update
    // never actually succeeded.
    expect(select).toHaveValue("todo");
  });

  it("re-fetches the correct project when projectId changes", async () => {
    projectsApi.getProject.mockResolvedValue(PROJECT);
    renderBoard("42");
    await waitFor(() => {
      expect(projectsApi.getProject).toHaveBeenCalledWith("42");
    });
  });
});