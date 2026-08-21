import { Link } from "react-router-dom";

export default function ForbiddenPage() {
  return (
    <div className="sac-page" style={{ paddingTop: 96, maxWidth: 480 }}>
      <div className="sac-eyebrow" style={{ color: "var(--sac-status-red)", marginBottom: 8 }}>
        Access denied
      </div>
      <h1 className="sac-heading-lg">This section isn't part of your clearance.</h1>
      <p className="sac-muted" style={{ marginTop: 12 }}>
        Your role gives you access to specific parts of the Director
        Portal, not all of it. If you think this is wrong, ask the
        Secretary to double-check your assigned role.
      </p>
      <Link to="/portal" className="sac-btn sac-btn-primary" style={{ marginTop: 24, textDecoration: "none" }}>
        Back to your dashboard
      </Link>
    </div>
  );
}
