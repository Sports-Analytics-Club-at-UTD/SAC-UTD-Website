import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "officer_marketing", label: "Marketing Officer" },
  { value: "officer_rnd", label: "R&D Officer" },
  { value: "director_secretary", label: "Secretary" },
  { value: "director_events", label: "Events Director" },
  { value: "director_marketing", label: "Marketing Director" },
  { value: "director_finance", label: "Finance Director" },
  { value: "director_rnd", label: "R&D Director" },
  { value: "exec", label: "Exec" },
];

export default function SecretaryPage() {
  const [pending, setPending] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [savingId, setSavingId] = useState(null);

  function load() {
    portalApi
      .pendingMembers()
      .then((data) => setPending(asList(data)))
      .catch(() => setLoadError("Couldn't load pending members."));
  }

  useEffect(load, []);

  async function handleApprove(member) {
    const role = selectedRoles[member.id] || "member";
    setSavingId(member.id);
    setActionError(null);
    try {
      await portalApi.updateMemberRole(member.id, { role, is_approved: true });
      setPending((prev) => prev.filter((m) => m.id !== member.id));
    } catch {
      // Deliberately a SEPARATE state from loadError. An approve action
      // failing should show a banner without wiping out the table —
      // the Secretary still needs to see (and act on) everyone else
      // waiting, not lose the whole page because one approval failed.
      setActionError(`Couldn't update ${member.username}. Try again.`);
    } finally {
      setSavingId(null);
    }
  }

  if (loadError) return <p className="sac-error-text">{loadError}</p>;
  if (!pending) return <p className="sac-muted">Loading pending members…</p>;

  return (
    <div>
      <h2 className="sac-heading-md" style={{ marginBottom: 4 }}>
        Pending approvals
      </h2>
      <p className="sac-muted" style={{ fontSize: 13, marginBottom: 24 }}>
        Every new signup lands here unapproved. Assign a role and approve
        to give them access to the site.
      </p>

      {actionError && (
        <p className="sac-error-text" style={{ marginBottom: 16 }}>
          {actionError}
        </p>
      )}

      {pending.length === 0 ? (
        <p className="sac-muted">Nobody's waiting on approval right now.</p>
      ) : (
        <table className="sac-data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Assign role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((member) => (
              <tr key={member.id}>
                <td>{member.username}</td>
                <td>
                  {member.first_name || member.last_name
                    ? `${member.first_name} ${member.last_name}`.trim()
                    : "—"}
                </td>
                <td className="sac-muted">{member.email}</td>
                <td>
                  <select
                    value={selectedRoles[member.id] || "member"}
                    onChange={(e) =>
                      setSelectedRoles((prev) => ({ ...prev, [member.id]: e.target.value }))
                    }
                    style={{
                      background: "var(--sac-panel-hi)",
                      border: "1px solid var(--sac-line)",
                      color: "var(--sac-text-100)",
                      borderRadius: 4,
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="sac-btn sac-btn-primary"
                    onClick={() => handleApprove(member)}
                    disabled={savingId === member.id}
                  >
                    {savingId === member.id ? "Approving…" : "Approve"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}