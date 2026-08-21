import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { projectsApi } from "../apiClient";

const COLUMNS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

export default function ProjectBoardPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [moveError, setMoveError] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);

  function load() {
    projectsApi
      .getProject(projectId)
      .then(setProject)
      .catch(() => setLoadError("Couldn't load this project."));
  }

  useEffect(load, [projectId]);

  async function handleMove(task, newColumn) {
    setMovingTaskId(task.id);
    setMoveError(null);
    try {
      await projectsApi.updateTask(task.id, { column: newColumn });
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, column: newColumn } : t)),
      }));
    } catch {
      // Deliberately does NOT touch `project` state — a failed move
      // should show an inline error while leaving the whole board
      // exactly as it was, not blank the page. (This is the same class
      // of bug that shipped in an earlier draft of SecretaryPage, where
      // one failed action wiped the entire pending-members table —
      // fixed there, avoided here from the start.)
      setMoveError(`Couldn't move "${task.title}". Try again.`);
    } finally {
      setMovingTaskId(null);
    }
  }

  if (loadError) return <p className="sac-projects-error">{loadError}</p>;
  if (!project) return <p className="sac-projects-muted">Loading board…</p>;

  return (
    <div className="sac-projects-page">
      <Link to="/projects" className="sac-projects-back-link">
        ← All projects
      </Link>

      <h1 className="sac-projects-heading-lg">{project.name}</h1>
      {project.description && <p className="sac-projects-muted">{project.description}</p>}

      {moveError && <p className="sac-projects-error">{moveError}</p>}

      <div className="sac-projects-roster">
        <span className="sac-projects-roster-label">Team</span>
        {project.members.length === 0 ? (
          <span className="sac-projects-muted">No one assigned yet.</span>
        ) : (
          project.members.map((member) => (
            <span key={member.id} className="sac-projects-member-chip">
              {member.username}
            </span>
          ))
        )}
      </div>

      <div className="sac-projects-board">
        {COLUMNS.map((col) => (
          <div key={col.value} className="sac-projects-column">
            <div className="sac-projects-column-header">{col.label}</div>
            {project.tasks
              .filter((task) => task.column === col.value)
              .map((task) => (
                <div key={task.id} className="sac-projects-task-card">
                  <div className="sac-projects-task-title">{task.title}</div>
                  <select
                    className="sac-projects-task-move"
                    aria-label={`Move "${task.title}"`}
                    value={task.column}
                    disabled={movingTaskId === task.id}
                    onChange={(e) => handleMove(task, e.target.value)}
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}