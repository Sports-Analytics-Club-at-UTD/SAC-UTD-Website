import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../shared/AuthContext";
import RoleBadge from "../RoleBadge";

const SECTION_LABELS = {
  secretary: "Secretary",
  events: "Events",
  marketing: "Marketing",
  finance: "Finance",
  rnd: "R&D",
  exec: "Exec",
};

export default function DirectorPortalLayout() {
  const { user, portalAccess } = useAuth();
  const sections = portalAccess?.sections || [];

  return (
    <div className="sac-page" style={{ paddingTop: 40, paddingBottom: 96 }}>
      <div style={{ marginBottom: 8 }}>
        <div className="sac-eyebrow">Director Portal</div>
        <h1 className="sac-heading-lg" style={{ marginTop: 4 }}>
          Welcome back, {user?.username}
        </h1>
      </div>

      <div style={{ marginTop: 16, marginBottom: 32 }}>
        <RoleBadge role={user?.role} isExec={portalAccess?.is_exec} />
      </div>

      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--sac-line)",
          marginBottom: 32,
        }}
      >
        <PortalTab to="/portal" label="Dashboard" end />
        {sections.map((section) => (
          <PortalTab key={section} to={`/portal/${section}`} label={SECTION_LABELS[section] || section} />
        ))}
      </nav>

      <Outlet />
    </div>
  );
}

function PortalTab({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        color: isActive ? "var(--sac-orange-400)" : "var(--sac-text-400)",
        borderBottom: isActive ? "2px solid var(--sac-orange-500)" : "2px solid transparent",
        marginBottom: -1,
      })}
    >
      {label}
    </NavLink>
  );
}
