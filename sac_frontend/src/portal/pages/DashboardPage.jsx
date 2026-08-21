import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { portalApi } from "../apiClient";

const CARD_CONFIG = {
  secretary: {
    label: "Secretary",
    metric: (d) => d.pending_members,
    caption: "members awaiting approval",
  },
  events: {
    label: "Events",
    metric: (d) => d.upcoming_events,
    caption: "upcoming events on the calendar",
  },
  marketing: {
    label: "Marketing",
    metric: (d) => d.pending_media,
    caption: "uploads awaiting review",
  },
  finance: {
    label: "Finance",
    metric: (d) => `$${Number(d.balance).toLocaleString()}`,
    caption: "current balance",
  },
  rnd: {
    label: "R&D",
    metric: (d) => d.open_ideas + d.open_todos,
    caption: "open ideas + to-dos",
  },
  exec: {
    label: "Exec",
    metric: (d) => d.open_requests,
    caption: "unresolved requests",
  },
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    portalApi
      .dashboard()
      .then(setDashboard)
      .catch(() => setError("Couldn't load your dashboard summary."));
  }, []);

  if (error) return <p className="sac-error-text">{error}</p>;
  if (!dashboard) return <p className="sac-muted">Loading your dashboard…</p>;

  const sections = Object.keys(dashboard);

  if (sections.length === 0) {
    return (
      <p className="sac-muted">
        No sections available yet — this shouldn't happen for a
        director account. Check your role assignment with the Secretary.
      </p>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {sections.map((section) => {
        const config = CARD_CONFIG[section];
        if (!config) return null;
        return (
          <Link
            key={section}
            to={`/portal/${section}`}
            className="sac-panel"
            style={{
              display: "block",
              padding: 20,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div className="sac-eyebrow">{config.label}</div>
            <div className="sac-stat-number" style={{ marginTop: 8 }}>
              {config.metric(dashboard[section])}
            </div>
            <div className="sac-muted" style={{ fontSize: 13, marginTop: 4 }}>
              {config.caption}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
