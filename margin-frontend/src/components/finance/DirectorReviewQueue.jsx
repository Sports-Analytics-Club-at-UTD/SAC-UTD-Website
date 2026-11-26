import { useCallback, useEffect, useState } from 'react';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';
import ApproveModal from './ApproveModal';
import DenyModal from './DenyModal';
import ModifyModal from './ModifyModal';

export default function DirectorReviewQueue() {
  const [requests, setRequests] = useState([]);
  const [utdQuota, setUtdQuota] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    scope: '',
    category: '',
    funding_source: '',
  });

  const [modalState, setModalState] = useState({ type: null, item: null });

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reqsData, quotaData] = await Promise.all([
        financeApi.listFundingRequests(filters),
        financeApi.getUtdQuota(),
      ]);
      setRequests(asList(reqsData));
      setUtdQuota(quotaData);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load review queue.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let active = true;
    Promise.all([
      financeApi.listFundingRequests(filters),
      financeApi.getUtdQuota(),
    ])
      .then(([reqsData, quotaData]) => {
        if (!active) return;
        setRequests(asList(reqsData));
        setUtdQuota(quotaData);
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load review queue.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  const handleToggleUtdForm = async (reqItem) => {
    try {
      await financeApi.updateUtdForm(reqItem.id, !reqItem.utd_form_completed);
      await loadQueue();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update UTD form status.'));
    }
  };

  const quotaPct = utdQuota
    ? Math.min(100, Math.round((utdQuota.used_count / Math.max(1, utdQuota.limit)) * 100))
    : 0;

  return (
    <div>
      {utdQuota && (
        <div className="sac-quota-banner">
          <div>
            <div className="sac-eyebrow">UTD Programming Funds Semester Cap</div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>
              {utdQuota.semester}:{' '}
              <span className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                {utdQuota.used_count} / {utdQuota.limit}
              </span>{' '}
              requests used ({utdQuota.remaining} remaining)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sac-quota-track">
              <div
                className={`sac-quota-fill ${utdQuota.is_limit_reached ? 'full' : ''}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
            {utdQuota.is_limit_reached && (
              <span className="sac-pill sac-pill-denied">Limit Reached</span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="sac-panel" style={{ marginBottom: 20 }}>
        <div className="sac-form-grid" style={{ marginBottom: 0 }}>
          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-status">Status</label>
            <select
              id="q-status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="unchecked">Unchecked</option>
              <option value="modified">Modified (Awaiting Confirm)</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-scope">Scope</label>
            <select
              id="q-scope"
              value={filters.scope}
              onChange={(e) => setFilters((f) => ({ ...f, scope: e.target.value }))}
            >
              <option value="">All Scopes</option>
              <option value="specific_event">Specific Event</option>
              <option value="projects_team">Projects Team</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-cat">Item Category</label>
            <select
              id="q-cat"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              <option value="food">Food</option>
              <option value="technology">Technology</option>
              <option value="logistics">Logistics</option>
              <option value="merchandise">Merchandise</option>
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-src">Funding Source</label>
            <select
              id="q-src"
              value={filters.funding_source}
              onChange={(e) => setFilters((f) => ({ ...f, funding_source: e.target.value }))}
            >
              <option value="">All Sources</option>
              <option value="club_funds">Club Funds</option>
              <option value="utd_programming_funds">UTD Programming Funds</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="sac-banner sac-banner-error">{error}</div>}

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
            <div className="sac-eyebrow">Finance Director Queue</div>
            <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
              Funding Requests ({requests.length})
            </h2>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={loadQueue}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="sac-muted">Loading funding requests...</p>
        ) : requests.length === 0 ? (
          <p className="sac-muted">No funding requests match the selected filters.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((req) => {
              const isExpanded = expandedId === req.id;
              return (
                <div
                  key={req.id}
                  style={{
                    background: 'var(--sac-void)',
                    border: '1px solid var(--sac-line)',
                    borderRadius: 'var(--sac-radius-md)',
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 16 }}>{req.title}</strong>
                        <span className={`sac-pill sac-pill-${req.status}`}>{req.status}</span>
                        {req.funding_source && (
                          <span
                            className={`sac-pill ${
                              req.funding_source === 'utd_programming_funds'
                                ? 'sac-pill-utd'
                                : 'sac-pill-club'
                            }`}
                          >
                            {req.funding_source === 'utd_programming_funds'
                              ? 'UTD Programming Funds'
                              : 'Club Funds'}
                          </span>
                        )}
                        {req.approval_id && (
                          <span className="sac-mono" style={{ color: 'var(--sac-status-green)', fontSize: 13 }}>
                            {req.approval_id}
                          </span>
                        )}
                      </div>

                      <div className="sac-muted" style={{ fontSize: 13, marginTop: 6 }}>
                        By <strong>{req.requester_username}</strong> · Scope:{' '}
                        <span style={{ textTransform: 'capitalize' }}>
                          {req.scope.replace('_', ' ')}
                        </span>
                        {req.event_classification && ` (${req.event_classification.replace('_', ' ')})`}
                        {req.event_summary && ` · Event: ${req.event_summary.name}`}
                        {req.room_number && ` · Room: ${req.room_number}`}
                        {req.reservation_id && ` · Res: ${req.reservation_id}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="sac-mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--sac-orange-400)' }}>
                        ${Number(req.total_amount).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className="sac-btn sac-btn-ghost sac-btn-sm"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        {isExpanded ? 'Hide Items' : `Items (${req.items?.length || 0})`}
                      </button>
                    </div>
                  </div>

                  {/* UTD Form Tracking */}
                  {req.funding_source === 'utd_programming_funds' && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid var(--sac-line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(req.utd_form_completed)}
                          onChange={() => handleToggleUtdForm(req)}
                        />
                        <span>UTD Programming Funds Form Submitted / Completed</span>
                      </label>
                      <span
                        className={`sac-pill ${
                          req.utd_form_completed ? 'sac-pill-approved' : 'sac-pill-pending'
                        }`}
                      >
                        {req.utd_form_completed ? 'UTD Form Complete' : 'UTD Form Pending'}
                      </span>
                    </div>
                  )}

                  {req.status === 'denied' && req.denial_reason && (
                    <div className="sac-error-text" style={{ marginTop: 10 }}>
                      Denial reason: {req.denial_reason}
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ marginTop: 14 }}>
                      {req.notes && (
                        <p className="sac-muted" style={{ fontSize: 13, marginBottom: 10 }}>
                          Notes: {req.notes}
                        </p>
                      )}
                      <div className="sac-table-wrap">
                        <table className="sac-data-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Unit</th>
                              <th>Unit Price</th>
                              <th>Category</th>
                              <th style={{ textAlign: 'right' }}>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(req.items || []).map((item) => (
                              <tr key={item.id}>
                                <td>{item.item_name}</td>
                                <td className="sac-mono">{item.quantity}</td>
                                <td className="sac-muted">{item.unit_quantity || '—'}</td>
                                <td className="sac-mono">${Number(item.unit_price).toFixed(2)}</td>
                                <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                                <td className="sac-mono" style={{ textAlign: 'right' }}>
                                  ${Number(item.line_total).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Director Action Buttons */}
                  {(req.status === 'unchecked' || req.status === 'modified') && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid var(--sac-line)',
                      }}
                    >
                      {req.status === 'unchecked' && (
                        <>
                          <button
                            type="button"
                            className="sac-btn sac-btn-success sac-btn-sm"
                            onClick={() => setModalState({ type: 'approve', item: req })}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="sac-btn sac-btn-primary sac-btn-sm"
                            onClick={() => setModalState({ type: 'modify', item: req })}
                          >
                            Modify Items
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="sac-btn sac-btn-danger sac-btn-sm"
                        onClick={() => setModalState({ type: 'deny', item: req })}
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalState.type === 'approve' && modalState.item && (
        <ApproveModal
          requestItem={modalState.item}
          utdQuota={utdQuota}
          onClose={() => setModalState({ type: null, item: null })}
          onSuccess={() => {
            setModalState({ type: null, item: null });
            loadQueue();
          }}
        />
      )}

      {modalState.type === 'modify' && modalState.item && (
        <ModifyModal
          requestItem={modalState.item}
          utdQuota={utdQuota}
          onClose={() => setModalState({ type: null, item: null })}
          onSuccess={() => {
            setModalState({ type: null, item: null });
            loadQueue();
          }}
        />
      )}

      {modalState.type === 'deny' && modalState.item && (
        <DenyModal
          requestItem={modalState.item}
          onClose={() => setModalState({ type: null, item: null })}
          onSuccess={() => {
            setModalState({ type: null, item: null });
            loadQueue();
          }}
        />
      )}
    </div>
  );
}
