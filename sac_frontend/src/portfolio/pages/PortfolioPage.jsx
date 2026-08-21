import { useEffect, useState } from "react";
import { listOrgRepos } from "../githubClient";
import "../portfolio.css";

export default function PortfolioPage() {
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listOrgRepos()
      .then(setRepos)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="sac-portfolio">
      <div className="sac-portfolio-page">
        <h1 className="sac-portfolio-heading-lg">Our GitHub</h1>
        <p className="sac-portfolio-muted">
          Every public repo from our GitHub org, pulled live — no manual updates needed here.
        </p>

        {error && <p className="sac-portfolio-error">{error}</p>}

        {!repos && !error && <p className="sac-portfolio-muted">Loading repositories…</p>}

        {repos && repos.length === 0 && (
          <p className="sac-portfolio-muted">No public repositories yet.</p>
        )}

        {repos && repos.length > 0 && (
          <div className="sac-portfolio-grid">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="sac-portfolio-card"
              >
                <div className="sac-portfolio-card-name">{repo.name}</div>
                {repo.description && (
                  <div className="sac-portfolio-card-desc">{repo.description}</div>
                )}
                <div className="sac-portfolio-card-meta">
                  {repo.language && <span>{repo.language}</span>}
                  <span>★ {repo.stargazers_count}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}