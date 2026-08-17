import { useEffect, useState } from "react";
import { portalApi, asList } from "../apiClient";
import { ApiError } from "../../shared/apiClient";

const initialForm = { name: "", date: "", start_time: "", location: "", capacity: "" };

export default function EventsPage() {
  const [events, setEvents] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function load() {
    portalApi.listEvents().then((data) => setEvents(asList(data)));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.capacity) delete payload.capacity;
      await portalApi.createEvent(payload);
      setForm(initialForm);
      load();
    } catch (err) {
      if (err instanceof ApiError && typeof err.data === "object") {
        setFieldErrors(err.data);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
      <div>
        <h2 className="sac-heading-md" style={{ marginBottom: 16 }}>
          Calendar
        </h2>
        {!events ? (
          <p className="sac-muted">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="sac-muted">No events on the calendar yet.</p>
        ) : (
          <table className="sac-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.name}</td>
                  <td className="sac-muted">{ev.date}</td>
                  <td className="sac-muted">{ev.start_time}</td>
                  <td className="sac-muted">
                    {ev.registration_count}
                    {ev.capacity ? ` / ${ev.capacity}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="sac-panel" style={{ padding: 20, height: "fit-content" }}>
        <h3 className="sac-heading-md" style={{ marginBottom: 16 }}>
          New event
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="sac-field">
            <label htmlFor="ev-name">Name</label>
            <input
              id="ev-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            {fieldErrors.name && <span className="sac-error-text">{fieldErrors.name[0]}</span>}
          </div>
          <div className="sac-field">
            <label htmlFor="ev-date">Date</label>
            <input
              id="ev-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            {fieldErrors.date && <span className="sac-error-text">{fieldErrors.date[0]}</span>}
          </div>
          <div className="sac-field">
            <label htmlFor="ev-time">Start time</label>
            <input
              id="ev-time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />
            {fieldErrors.start_time && <span className="sac-error-text">{fieldErrors.start_time[0]}</span>}
          </div>
          <div className="sac-field">
            <label htmlFor="ev-location">Location</label>
            <input
              id="ev-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="sac-field">
            <label htmlFor="ev-capacity">Capacity (optional)</label>
            <input
              id="ev-capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            {fieldErrors.capacity && <span className="sac-error-text">{fieldErrors.capacity[0]}</span>}
          </div>
          <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}
