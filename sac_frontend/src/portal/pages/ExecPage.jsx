import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";

export default function ExecPage() {
  const [requests, setRequests] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  function load() {
    portalApi.listRequests().then((data) => setRequests(asList(data)));
  }

  useEffect(load, []);

  async function handleResolve(request) {
    setResolvingId(request.id);
    try {
      await portalApi.resolveRequest(request.id, { status: "resolved" });
      setRequests((prev) => prev.map((r) => (r.id === request.id ? { ...r, status: "resolved" } : r)));
    } finally {
      setResolvingId(null);
    }
  }

  if (!requests) return <p className="sac-muted">Loading requests…</p>;

  const open = requests.filter((r) => r.status === "open");

  return (
    <div>
      <h2 className="sac-heading-md" style={{ marginBottom: 4 }}>
        Requests from directors
      </h2>
      <p className="sac-muted" style={{ fontSize: 13, marginBottom: 24 }}>
        Anything a director filed from their own page that needs your
        sign-off lands here.
      </p>

      {open.length === 0 ? (
        <p className="sac-muted">No open requests right now.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {open.map((req) => (
            <div
              key={req.id}
              className="sac-panel"
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div>{req.title}</div>
                <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {req.category} · from {req.submitted_by_name}
                </div>
              </div>
              <button
                className="sac-btn sac-btn-primary"
                disabled={resolvingId === req.id}
                onClick={() => handleResolve(req)}
              >
                {resolvingId === req.id ? "Resolving…" : "Mark resolved"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
