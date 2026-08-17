import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { projectsApi, asList } from "../apiClient";

export default function ProjectsListPage() {
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Guards against a slow earlier request resolving AFTER a faster
    // later one and overwriting it with stale results — a real risk
    // here since every keystroke fires a new request.
    let cancelled = false;
    projectsApi
      .listProjects(search)
      .then((data) => {
        if (!cancelled) setProjects(asList(data));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load projects.");
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="sac-projects-page">
      <h1 className="sac-projects-heading-lg">Projects</h1>

      <input
        className="sac-projects-search"
        type="text"
        placeholder="Filter by project name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Filter projects by name"
      />

      {error && <p className="sac-projects-error">{error}</p>}

      {!projects ? (
        <p className="sac-projects-muted">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="sac-projects-muted">
          {search ? `No projects match "${search}".` : "No projects yet."}
        </p>
      ) : (
        <div className="sac-projects-grid">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="sac-projects-card">
              <div className="sac-projects-card-name">{project.name}</div>
              <div className="sac-projects-card-meta">
                {project.status.replace("_", " ")} · {project.member_count}{" "}
                {project.member_count === 1 ? "member" : "members"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}