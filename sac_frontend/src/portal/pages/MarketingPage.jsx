import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";

export default function MarketingPage() {
  const [uploads, setUploads] = useState(null);
  const [actingId, setActingId] = useState(null);

  function load() {
    // /api/media/ (standard list action) IS paginated by DRF's global
    // PageNumberPagination — unlike /api/media/approved/, a custom
    // @action that bypasses pagination. asList() unwraps either shape.
    portalApi.listMedia().then((data) => setUploads(asList(data)));
  }

  useEffect(load, []);

  async function handleReview(upload, status) {
    setActingId(upload.id);
    try {
      await portalApi.reviewMedia(upload.id, { status });
      setUploads((prev) => prev.map((u) => (u.id === upload.id ? { ...u, status } : u)));
    } finally {
      setActingId(null);
    }
  }

  if (!uploads) return <p className="sac-muted">Loading uploads…</p>;

  const pending = uploads.filter((u) => u.status === "pending");
  const reviewed = uploads.filter((u) => u.status !== "pending");

  return (
    <div>
      <h2 className="sac-heading-md" style={{ marginBottom: 4 }}>
        Media approval queue
      </h2>
      <p className="sac-muted" style={{ fontSize: 13, marginBottom: 24 }}>
        Approved uploads feed the homepage media scroller automatically.
      </p>

      {pending.length === 0 ? (
        <p className="sac-muted">Nothing waiting on review.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
          {pending.map((upload) => (
            <div
              key={upload.id}
              className="sac-panel"
              style={{
                padding: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div>{upload.title || "Untitled upload"}</div>
                <div className="sac-muted" style={{ fontSize: 12 }}>
                  submitted by {upload.uploaded_by}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="sac-btn sac-btn-primary"
                  disabled={actingId === upload.id}
                  onClick={() => handleReview(upload, "approved")}
                >
                  Approve
                </button>
                <button
                  className="sac-btn sac-btn-danger"
                  disabled={actingId === upload.id}
                  onClick={() => handleReview(upload, "rejected")}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h3 className="sac-heading-md" style={{ fontSize: 16, marginBottom: 12 }}>
            Already reviewed
          </h3>
          <table className="sac-data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((u) => (
                <tr key={u.id}>
                  <td>{u.title || "Untitled"}</td>
                  <td style={{ color: u.status === "approved" ? "var(--sac-status-green)" : "var(--sac-status-red)" }}>
                    {u.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
