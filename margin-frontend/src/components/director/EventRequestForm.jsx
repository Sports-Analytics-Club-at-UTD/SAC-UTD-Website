import { useEffect, useState } from 'react';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';

const CLASSIFICATION_OPTIONS = [
  { value: 'social', label: 'Social' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'speaker_event', label: 'Speaker Event' },
  { value: 'projects', label: 'Projects' },
];

export default function EventRequestForm({ user }) {
  const [name, setName] = useState('');
  const [classification, setClassification] = useState('workshop');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [roomNumber, setRoomNumber] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [eventLead, setEventLead] = useState(user?.username || '');
  const [eventLeadEmail, setEventLeadEmail] = useState(user?.email || '');
  const [estimatedAttendance, setEstimatedAttendance] = useState('');
  const [description, setDescription] = useState('');

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshEvents = async () => {
    try {
      const res = await financeApi.getEvents();
      setEvents(asList(res));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load events.'));
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    let active = true;
    financeApi
      .getEvents()
      .then((res) => {
        if (active) setEvents(asList(res));
      })
      .catch((err) => {
        if (active) setError(extractErrorMessage(err, 'Failed to load events.'));
      })
      .finally(() => {
        if (active) setLoadingEvents(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSubmitting(true);
    try {
      const created = await financeApi.createEventRequest({
        name: name.trim(),
        classification,
        date,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime ? (endTime.length === 5 ? `${endTime}:00` : endTime) : null,
        room_number: roomNumber.trim(),
        location: roomNumber.trim(),
        reservation_id: reservationId.trim(),
        event_lead: eventLead.trim(),
        event_lead_email: eventLeadEmail.trim(),
        estimated_attendance: estimatedAttendance ? Number(estimatedAttendance) : null,
        description: description.trim(),
      });
      setSuccess(`Created event "${created.name}" on ${created.date}. It is now available in Funding Requests.`);
      setName('');
      setRoomNumber('');
      setReservationId('');
      setEstimatedAttendance('');
      setDescription('');
      await refreshEvents();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit event request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <form className="sac-panel" onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <div className="sac-eyebrow">Events Calendar</div>
          <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
            Event Request Form
          </h2>
        </div>

        {error && <div className="sac-banner sac-banner-error">{error}</div>}
        {success && <div className="sac-banner sac-banner-success">{success}</div>}

        <div className="sac-form-grid">
          <div className="sac-field">
            <label htmlFor="ev-name">Event Name *</label>
            <input
              id="ev-name"
              type="text"
              placeholder="e.g. Spring Sports Analytics Workshop"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-class">Event Classification *</label>
            <select
              id="ev-class"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              required
            >
              {CLASSIFICATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sac-field">
            <label htmlFor="ev-date">Date *</label>
            <input
              id="ev-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-start">Start Time *</label>
            <input
              id="ev-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-end">End Time</label>
            <input
              id="ev-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-room">Room Number *</label>
            <input
              id="ev-room"
              type="text"
              placeholder="e.g. ECSS 2.412"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-res">Reservation ID</label>
            <input
              id="ev-res"
              type="text"
              placeholder="e.g. RES-2026-1041"
              value={reservationId}
              onChange={(e) => setReservationId(e.target.value)}
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-lead">Event Lead *</label>
            <input
              id="ev-lead"
              type="text"
              placeholder="e.g. Maya Patel"
              value={eventLead}
              onChange={(e) => setEventLead(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-lead-email">Event Lead Email *</label>
            <input
              id="ev-lead-email"
              type="email"
              placeholder="lead@utdallas.edu"
              value={eventLeadEmail}
              onChange={(e) => setEventLeadEmail(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ev-att">Estimated Attendance</label>
            <input
              id="ev-att"
              type="number"
              min="0"
              placeholder="e.g. 65"
              value={estimatedAttendance}
              onChange={(e) => setEstimatedAttendance(e.target.value)}
            />
          </div>
        </div>

        <div className="sac-field">
          <label htmlFor="ev-desc">Event Description</label>
          <textarea
            id="ev-desc"
            rows={2}
            placeholder="Describe the event format, goals, and audience..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Event Request'}
          </button>
        </div>
      </form>

      <div className="sac-panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <div className="sac-eyebrow">Database Records</div>
            <h3 className="sac-heading-md" style={{ marginTop: 4 }}>
              Club Events · {events.length}
            </h3>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={refreshEvents}>
            Refresh
          </button>
        </div>

        {loadingEvents ? (
          <p className="sac-muted">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="sac-muted">No events recorded yet.</p>
        ) : (
          <div className="sac-table-wrap">
            <table className="sac-data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Classification</th>
                  <th>Date &amp; Time</th>
                  <th>Room</th>
                  <th>Reservation ID</th>
                  <th>Event Lead</th>
                  <th style={{ textAlign: 'right' }}>Est. Attendance</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ fontWeight: 600 }}>{ev.name}</td>
                    <td className="sac-muted" style={{ textTransform: 'capitalize' }}>
                      {(ev.classification || '—').replace('_', ' ')}
                    </td>
                    <td className="sac-mono">
                      {ev.date} · {(ev.start_time || '').slice(0, 5)}
                      {ev.end_time ? `–${ev.end_time.slice(0, 5)}` : ''}
                    </td>
                    <td>{ev.room_number || ev.location || '—'}</td>
                    <td className="sac-mono">{ev.reservation_id || '—'}</td>
                    <td>{ev.event_lead || '—'}</td>
                    <td className="sac-mono" style={{ textAlign: 'right' }}>
                      {ev.estimated_attendance ?? ev.capacity ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
