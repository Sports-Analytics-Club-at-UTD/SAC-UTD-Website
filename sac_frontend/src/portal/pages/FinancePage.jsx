import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";

export default function FinancePage() {
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    portalApi.financeSummary().then(setSummary);
    portalApi.listBudgetEntries().then((data) => setEntries(asList(data)));
  }, []);

  return (
    <div>
      <h2 className="sac-heading-md" style={{ marginBottom: 16 }}>
        Budget
      </h2>

      {summary && (
        <div style={{ display: "flex", gap: 32, marginBottom: 32 }}>
          <Stat label="Balance" value={`$${Number(summary.balance).toLocaleString()}`} />
          <Stat label="Total income" value={`$${Number(summary.total_income).toLocaleString()}`} />
          <Stat label="Total expense" value={`$${Number(summary.total_expense).toLocaleString()}`} />
        </div>
      )}

      <h3 className="sac-heading-md" style={{ marginBottom: 12, fontSize: 16 }}>
        Recent entries
      </h3>
      {!entries ? (
        <p className="sac-muted">Loading entries…</p>
      ) : entries.length === 0 ? (
        <p className="sac-muted">No budget entries recorded yet.</p>
      ) : (
        <table className="sac-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="sac-muted">{entry.date}</td>
                <td>{entry.category_name}</td>
                <td style={{ color: entry.entry_type === "income" ? "var(--sac-status-green)" : "var(--sac-status-red)" }}>
                  {entry.entry_type}
                </td>
                <td>${Number(entry.amount).toLocaleString()}</td>
                <td className="sac-muted">{entry.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="sac-eyebrow">{label}</div>
      <div className="sac-stat-number" style={{ marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
