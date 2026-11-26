import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';
import { createEmptyLineItem } from '../../utils/financeLineItems';
import LineItemGrid from './LineItemGrid';

const SCOPE_OPTIONS = [
  { value: 'specific_event', label: 'Specific Event' },
  { value: 'projects_team', label: 'Projects Team (Cloud / Compute)' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'social', label: 'Social' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'speaker_event', label: 'Speaker Event' },
  { value: 'projects', label: 'Projects' },
];

export default function FundingRequestForm({ user }) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('specific_event');
  const [eventId, setEventId] = useState('');
  const [eventClassification, setEventClassification] = useState('workshop');
  const [roomNumber, setRoomNumber] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [requesterEmail, setRequesterEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
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
        financeApi.listFundingRequests(),
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
      financeApi.listFundingRequests(),
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
  }, []);

  const handleEventSelect = (selectedId) => {
    setEventId(selectedId);
    const match = events.find((ev) => String(ev.id) === String(selectedId));
    if (match) {
      if (match.location && !roomNumber.trim()) {
        setRoomNumber(match.location);
      }
      if (!title.trim()) {
        setTitle(`${match.name} Funding`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanedItems = items.map((row, idx) => ({
      item_name: row.item_name.trim(),
      quantity: row.quantity,
      unit_quantity: row.unit_quantity.trim(),
      unit_price: row.unit_price,
      category: row.category,
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
      items: cleanedItems,
    };

    if (scope === 'specific_event') {
      payload.event_id = eventId ? Number(eventId) : null;
      payload.event_classification = eventClassification;
      payload.room_number = roomNumber.trim();
      payload.reservation_id = reservationId.trim();
    }

    setSubmitting(true);
    try {
      const created = await financeApi.createFundingRequest(payload);
      setSuccess(
        `Submitted "${created.title}" (Status: Unchecked). You will receive an email once the Finance Director reviews it.`
      );
      setTitle('');
      setEventId('');
      setRoomNumber('');
      setReservationId('');
      setNotes('');
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
              Event Details (Events Dashboard Integration)
            </div>
            <div className="sac-form-grid">
              <div className="sac-field">
                <label htmlFor="fr-event">Linked Event (Events Dashboard)</label>
                <select
                  id="fr-event"
                  value={eventId}
                  onChange={(e) => handleEventSelect(e.target.value)}
                >
                  <option value="">— Optional: Select an event —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.date})
                    </option>
                  ))}
                </select>
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
            </div>
          </div>
        )}

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

        <hr className="sac-divider" />

        <LineItemGrid items={items} onChange={setItems} disabled={submitting} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
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
                      {req.event_summary && (
                        <div className="sac-muted" style={{ fontSize: 12 }}>
                          {req.event_summary.name} · {req.room_number}
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
