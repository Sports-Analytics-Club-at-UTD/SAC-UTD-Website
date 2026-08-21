const ROLE_LABELS = {
  member: "MEMBER",
  officer_marketing: "MARKETING OFFICER",
  officer_rnd: "R&D OFFICER",
  director_secretary: "SECRETARY",
  director_events: "EVENTS DIRECTOR",
  director_marketing: "MARKETING DIRECTOR",
  director_finance: "FINANCE DIRECTOR",
  director_rnd: "R&D DIRECTOR",
  exec: "EXEC",
};

/**
 * The clearance indicator — styled as a "node," echoing the logo's own
 * connected-dot scatter-plot mark (see the ::before dot in
 * .sac-node-badge). Not decorative: it's the IAM concept made visible,
 * so "why can't I see the Finance tab" has an answer right on screen.
 */
export default function RoleBadge({ role, isExec }) {
  const label = ROLE_LABELS[role] || role?.toUpperCase();
  return (
    <span className="sac-node-badge">
      ACCESS: {label}
      {isExec ? " · ALL SECTIONS" : ""}
    </span>
  );
}
