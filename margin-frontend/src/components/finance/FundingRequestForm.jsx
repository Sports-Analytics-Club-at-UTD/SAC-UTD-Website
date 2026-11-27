import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';
import { createEmptyLineItem } from '../../utils/financeLineItems';
import { SAMPLE_EVENTS } from '../../utils/sampleEvents';
import LineItemGrid from './LineItemGrid';

const SCOPE_OPTIONS = [
  { value: 'specific_event', label: 'Specific Event' },
  { value: 'projects_team', label: 'Projects Team' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'social', label: 'Social' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'speaker_event', label: 'Speaker Event' },
  { value: 'projects', label: 'Projects' },
];

export default function FundingRequestForm({ user, semester = '' }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('specific_event');
  const [selectedEventKey, setSelectedEventKey] = useState('');
  const [eventId, setEventId] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventClassification, setEventClassification] = useState('workshop');
  const [roomNumber, setRoomNumber] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLead, setEventLead] = useState('');
  const [eventLeadEmail, setEventLeadEmail] = useState('');
  const [eventEstimatedAttendance, setEventEstimatedAttendance] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [requesterEmail, setRequesterEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [includeTax, setIncludeTax] = useState(true);
  const [items, setItems] = useState([createEmptyLineItem()]);

  const [events, setEvents] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    setLoadingRequests(true);
    try {
      const [eventsRes, reqsRes] = await Promise.all([
        financeApi.getEvents().catch(() => []),
        financeApi.listFundingRequests(semester ? { semester } : {}),
      ]);
      setEvents(asList(eventsRes));
      setMyRequests(asList(reqsRes));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load funding requests.'));
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      financeApi.getEvents().catch(() => []),
      financeApi.listFundingRequests(semester ? { semester } : {}),
    ])
      .then(([eventsRes, reqsRes]) => {
        if (!active) return;
        setEvents(asList(eventsRes));
        setMyRequests(asList(reqsRes));
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load funding requests.'));
      })
      .finally(() => {
        if (active) setLoadingRequests(false);
      });
    return () => {
      active = false;
    };
  }, [semester]);

  const handleEventImport = (selectedKey) => {
    setSelectedEventKey(selectedKey);
    if (!selectedKey) {
      setEventId('');
      return;
    }

    const sampleMatch = SAMPLE_EVENTS.find((ev) => ev.id === selectedKey);
    if (sampleMatch) {
      setEventId('');
      setEventName(sampleMatch.name);
      setEventClassification(sampleMatch.classification);
      setRoomNumber(sampleMatch.room_number);
      setReservationId(sampleMatch.reservation_id);
      setEventDate(sampleMatch.date);
      setEventStartTime(sampleMatch.start_time);
      setEventEndTime(sampleMatch.end_time);
      setEventLead(sampleMatch.event_lead);
      setEventLeadEmail(sampleMatch.event_lead_email);
      setEventEstimatedAttendance(
        sampleMatch.estimated_attendance != null ? String(sampleMatch.estimated_attendance) : ''
      );
      setEventDescription(sampleMatch.description);
      if (!title.trim()) {
        setTitle(`${sampleMatch.name} Funding`);
      }
      return;
    }

    const dbMatch = events.find((ev) => String(ev.id) === String(selectedKey));
    if (dbMatch) {
      setEventId(String(dbMatch.id));
      setEventName(dbMatch.name || '');
      if (dbMatch.classification) setEventClassification(dbMatch.classification);
      setRoomNumber(dbMatch.room_number || dbMatch.location || '');
      if (dbMatch.reservation_id) setReservationId(dbMatch.reservation_id);
      setEventDate(dbMatch.date || '');
      setEventStartTime((dbMatch.start_time || '').slice(0, 5));
      setEventEndTime((dbMatch.end_time || '').slice(0, 5));
      setEventLead(dbMatch.event_lead || '');
      setEventLeadEmail(dbMatch.event_lead_email || '');
      const estAtt = dbMatch.estimated_attendance ?? dbMatch.capacity;
      setEventEstimatedAttendance(estAtt != null ? String(estAtt) : '');
      setEventDescription(dbMatch.description || '');
      if (!title.trim() && dbMatch.name) {
        setTitle(`${dbMatch.name} Funding`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanedItems = items.map((row, idx) => ({
      item_name: row.item_name.trim(),
      vendor: (row.vendor || '').trim(),
      quantity: row.quantity,
      unit_quantity: row.unit_quantity.trim(),
      unit_price: row.unit_price,
      category: row.category,
      item_url: (row.item_url || '').trim(),
      sort_order: idx,
    }));

    if (cleanedItems.some((r) => !r.item_name)) {
      setError('Every line item must have an Item Name.');
      return;
    }

    const payload = {
      title: title.trim(),
      scope,
      requester_email: requesterEmail.trim(),
      notes: notes.trim(),
      include_tax: includeTax,
      items: cleanedItems,
    };

    if (scope === 'specific_event') {
      payload.event_id = eventId ? Number(eventId) : null;
      payload.event_classification = eventClassification;
      payload.event_name = eventName.trim();
      payload.event_description = eventDescription.trim();
      payload.event_date = eventDate || null;
      payload.event_start_time = eventStartTime || null;
      payload.event_end_time = eventEndTime || null;
      payload.event_lead = eventLead.trim();
      payload.event_lead_email = eventLeadEmail.trim();
      payload.event_estimated_attendance = eventEstimatedAttendance
        ? Number(eventEstimatedAttendance)
        : null;
      payload.room_number = roomNumber.trim();
      payload.reservation_id = reservationId.trim();
    }

    setSubmitting(true);
    try {
      const created = await financeApi.createFundingRequest(payload);
      setSuccess(
        `Submitted "${created.title}" with status Unchecked. You will receive an email once the Finance Director reviews it.`
      );
      setTitle('');
      setSelectedEventKey('');
      setEventId('');
      setEventName('');
      setRoomNumber('');
      setReservationId('');
      setEventDate('');
      setEventStartTime('');
      setEventEndTime('');
      setEventLead('');
      setEventLeadEmail('');
      setEventEstimatedAttendance('');
      setEventDescription('');
      setNotes('');
      setIncludeTax(true);
      setItems([createEmptyLineItem()]);
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit funding request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <form className="sac-panel" onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <div className="sac-eyebrow">New Request</div>
          <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
            Submit Funding Request
          </h2>
        </div>

        {error && <div className="sac-banner sac-banner-error">{error}</div>}
        {success && <div className="sac-banner sac-banner-success">{success}</div>}

        <div className="sac-form-grid">
          <div className="sac-field">
            <label htmlFor="fr-title">Request Title *</label>
            <input
              id="fr-title"
              type="text"
              placeholder="e.g. March Workshop Catering"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="fr-scope">Funding Scope *</label>
            <select
              id="fr-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sac-field">
            <label htmlFor="fr-email">Notification Email</label>
            <input
              id="fr-email"
              type="email"
              placeholder="netid@utdallas.edu"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
            />
          </div>
        </div>

        {scope === 'specific_event' && (
          <div
            style={{
              background: 'var(--sac-void)',
              border: '1px solid var(--sac-line)',
              borderRadius: 'var(--sac-radius-sm)',
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div className="sac-eyebrow" style={{ marginBottom: 12 }}>
              Import Event
            </div>

            <div className="sac-field">
              <label htmlFor="fr-event">Select Event to Auto-Import</label>
              <select
                id="fr-event"
                value={selectedEventKey}
                onChange={(e) => handleEventImport(e.target.value)}
              >
                <option value="">— Select a live or sample event to import —</option>
                {events.length > 0 && (
                  <optgroup label="Events Dashboard — Live">
                    {events.map((ev) => (
                      <option key={`db-${ev.id}`} value={String(ev.id)}>
                        Live Event · {ev.name} — {ev.date}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Sample Events">
                  {SAMPLE_EVENTS.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.source_label} · {ev.name} — {ev.date}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="sac-form-grid">
              <div className="sac-field">
                <label htmlFor="fr-ev-name">Event Name</label>
                <input
                  id="fr-ev-name"
                  type="text"
                  placeholder="Imported event name"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-class">Event Classification *</label>
                <select
                  id="fr-class"
                  value={eventClassification}
                  onChange={(e) => setEventClassification(e.target.value)}
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
                <label htmlFor="fr-room">Room Number *</label>
                <input
                  id="fr-room"
                  type="text"
                  placeholder="e.g. ECSS 2.412"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-res">Reservation ID *</label>
                <input
                  id="fr-res"
                  type="text"
                  placeholder="e.g. RES-2026-0412"
                  value={reservationId}
                  onChange={(e) => setReservationId(e.target.value)}
                  required
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-date">Date</label>
                <input
                  id="fr-ev-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-start">Start Time</label>
                <input
                  id="fr-ev-start"
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-end">End Time</label>
                <input
                  id="fr-ev-end"
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-lead">Event Lead</label>
                <input
                  id="fr-ev-lead"
                  type="text"
                  placeholder="e.g. Maya Patel"
                  value={eventLead}
                  onChange={(e) => setEventLead(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-lead-email">Event Lead Email</label>
                <input
                  id="fr-ev-lead-email"
                  type="email"
                  placeholder="lead@utdallas.edu"
                  value={eventLeadEmail}
                  onChange={(e) => setEventLeadEmail(e.target.value)}
                />
              </div>

              <div className="sac-field">
                <label htmlFor="fr-ev-att">Estimated Attendance</label>
                <input
                  id="fr-ev-att"
                  type="number"
                  min="0"
                  placeholder="e.g. 65"
                  value={eventEstimatedAttendance}
                  onChange={(e) => setEventEstimatedAttendance(e.target.value)}
                />
              </div>
            </div>

            <div className="sac-field" style={{ marginBottom: 0 }}>
              <label htmlFor="fr-ev-desc">Event Description</label>
              <textarea
                id="fr-ev-desc"
                rows={2}
                placeholder="Imported event description..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        <LineItemGrid
          items={items}
          onChange={setItems}
          disabled={submitting}
          includeTax={includeTax}
          onToggleTax={setIncludeTax}
        />

        <hr className="sac-divider" />

        <div className="sac-field">
          <label htmlFor="fr-notes">Notes / Justification</label>
          <textarea
            id="fr-notes"
            rows={2}
            placeholder="Optional context for the Finance Director..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Funding Request'}
          </button>
        </div>
      </form>

      {/* Requester's own submitted requests */}
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
            <div className="sac-eyebrow">History</div>
            <h3 className="sac-heading-md" style={{ marginTop: 4 }}>
              My Funding Requests
            </h3>
          </div>
          <button
            type="button"
            className="sac-btn sac-btn-ghost sac-btn-sm"
            onClick={loadData}
          >
            Refresh
          </button>
        </div>

        {loadingRequests ? (
          <p className="sac-muted">Loading requests...</p>
        ) : myRequests.length === 0 ? (
          <p className="sac-muted">You have not submitted any funding requests yet.</p>
        ) : (
          <div className="sac-table-wrap">
            <table className="sac-data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Scope</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Approval ID</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Action / Notes</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.title}</div>
                      {(req.event_summary?.name || req.event_name) && (
                        <div className="sac-muted" style={{ fontSize: 12 }}>
                          {req.event_summary?.name || req.event_name}
                          {req.room_number ? ` · ${req.room_number}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="sac-muted" style={{ textTransform: 'capitalize' }}>
                      {req.scope.replace('_', ' ')}
                    </td>
                    <td>
                      <span className={`sac-pill sac-pill-${req.status}`}>{req.status}</span>
                    </td>
                    <td>
                      {req.funding_source ? (
                        <span
                          className={`sac-pill ${
                            req.funding_source === 'utd_programming_funds'
                              ? 'sac-pill-utd'
                              : 'sac-pill-club'
                          }`}
                        >
                          {req.funding_source === 'utd_programming_funds'
                            ? 'UTD Funds'
                            : 'Club Funds'}
                        </span>
                      ) : (
                        <span className="sac-muted">—</span>
                      )}
                    </td>
                    <td className="sac-mono">
                      {req.approval_id ? (
                        <span style={{ color: 'var(--sac-status-green)' }}>{req.approval_id}</span>
                      ) : (
                        <span className="sac-muted">—</span>
                      )}
                    </td>
                    <td className="sac-mono" style={{ textAlign: 'right' }}>
                      ${Number(req.total_amount).toFixed(2)}
                    </td>
                    <td>
                      {req.status === 'modified' && (
                        <Link
                          to={`/finance/requests/${req.id}/confirm`}
                          className="sac-btn sac-btn-primary sac-btn-sm"
                        >
                          Review &amp; Confirm
                        </Link>
                      )}
                      {req.status === 'denied' && req.denial_reason && (
                        <span className="sac-error-text">{req.denial_reason}</span>
                      )}
                      {req.status === 'approved' && req.approval_id && (
                        <Link
                          to={`/finance?tab=refunds&approval_id=${encodeURIComponent(req.approval_id)}`}
                          className="sac-btn sac-btn-ghost sac-btn-sm"
                        >
                          Request Refund
                        </Link>
                      )}
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
