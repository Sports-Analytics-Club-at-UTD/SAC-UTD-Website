import { useCallback, useEffect, useState } from 'react';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';

export default function DirectorRefundQueue({ semester = '' }) {
  const [refunds, setRefunds] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [receiptInfo, setReceiptInfo] = useState(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const [nextStatus, setNextStatus] = useState('reimbursed');
  const [directorNotes, setDirectorNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (semester) params.semester = semester;
      const res = await financeApi.listRefundRequests(params);
      const list = asList(res);
      setRefunds(list);
      setSelected((prev) => {
        if (!prev) return list[0] || null;
        return list.find((r) => r.id === prev.id) || list[0] || null;
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load refund queue.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, semester]);

  useEffect(() => {
    let active = true;
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (semester) params.semester = semester;
    financeApi
      .listRefundRequests(params)
      .then((res) => {
        if (!active) return;
        const list = asList(res);
        setRefunds(list);
        setSelected((prev) => {
          if (!prev) return list[0] || null;
          return list.find((r) => r.id === prev.id) || list[0] || null;
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load refund queue.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter, semester]);

  useEffect(() => {
    if (!selected) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setNextStatus(selected.status === 'pending' ? 'reimbursed' : selected.status);
      setDirectorNotes(selected.director_notes || '');
      setLoadingReceipt(true);
      setReceiptInfo(null);

      financeApi
        .getReceiptUrl(selected.id)
        .then((data) => {
          if (active) setReceiptInfo(data);
        })
        .catch(() => {
          if (active) setReceiptInfo(null);
        })
        .finally(() => {
          if (active) setLoadingReceipt(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selected]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setUpdating(true);
    try {
      await financeApi.updateRefundStatus(selected.id, {
        status: nextStatus,
        director_notes: directorNotes.trim(),
      });
      await loadRefunds();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update refund status.'));
    } finally {
      setUpdating(false);
    }
  };

  const summary = selected?.funding_request_summary;
  const isPdf = (receiptInfo?.content_type || selected?.receipt_content_type || '').includes('pdf');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="sac-panel">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div className="sac-eyebrow">Finance Director Refund Queue</div>
            <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
              Refund Requests · {refunds.length}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'var(--sac-panel-hi)',
                border: '1px solid var(--sac-line)',
                borderRadius: 'var(--sac-radius-sm)',
                color: 'var(--sac-text-100)',
                padding: '7px 12px',
                fontSize: 13,
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reimbursed">Reimbursed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={loadRefunds}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="sac-banner sac-banner-error">{error}</div>}

        {loading ? (
          <p className="sac-muted">Loading refund requests...</p>
        ) : refunds.length === 0 ? (
          <p className="sac-muted">No refund requests found.</p>
        ) : (
          <div className="sac-table-wrap">
            <table className="sac-data-table">
              <thead>
                <tr>
                  <th>Approval ID</th>
                  <th>Requester</th>
                  <th>Funding Request</th>
                  <th style={{ textAlign: 'right' }}>Claimed</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((ref) => {
                  const isActive = selected?.id === ref.id;
                  return (
                    <tr
                      key={ref.id}
                      onClick={() => setSelected(ref)}
                      style={{
                        cursor: 'pointer',
                        background: isActive ? 'rgba(232, 114, 12, 0.08)' : undefined,
                      }}
                    >
                      <td className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                        {ref.approval_id_entered}
                      </td>
                      <td>{ref.requester_username}</td>
                      <td>{ref.funding_request_summary?.title || '—'}</td>
                      <td className="sac-mono" style={{ textAlign: 'right' }}>
                        ${Number(ref.amount_claimed).toFixed(2)}
                      </td>
                      <td>
                        <span className={`sac-pill sac-pill-${ref.status}`}>{ref.status}</span>
                      </td>
                      <td className="sac-muted" style={{ fontSize: 12 }}>
                        {ref.receipt_original_filename}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-Side Receipt Viewer & Approved Line Items */}
      {selected && (
        <div className="sac-split-view">
          <div className="sac-panel">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div>
                <div className="sac-eyebrow">Uploaded Receipt</div>
                <h3 className="sac-heading-md" style={{ marginTop: 4 }}>
                  {selected.receipt_original_filename}
                </h3>
              </div>
              {receiptInfo?.url && (
                <a
                  href={receiptInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sac-btn sac-btn-ghost sac-btn-sm"
                >
                  Open in New Tab ↗
                </a>
              )}
            </div>

            {loadingReceipt ? (
              <p className="sac-muted">Generating signed receipt URL...</p>
            ) : !receiptInfo?.url ? (
              <p className="sac-error-text">Could not load receipt preview.</p>
            ) : isPdf ? (
              <iframe
                src={receiptInfo.url}
                title="Receipt PDF"
                style={{
                  width: '100%',
                  height: 460,
                  border: '1px solid var(--sac-line)',
                  borderRadius: 'var(--sac-radius-sm)',
                  background: '#fff',
                }}
              />
            ) : (
              <img
                src={receiptInfo.url}
                alt={selected.receipt_original_filename}
                style={{
                  width: '100%',
                  maxHeight: 520,
                  objectFit: 'contain',
                  border: '1px solid var(--sac-line)',
                  borderRadius: 'var(--sac-radius-sm)',
                  background: 'var(--sac-void)',
                }}
              />
            )}

            {selected.comments && (
              <div
                style={{
                  marginTop: 14,
                  padding: 12,
                  background: 'var(--sac-void)',
                  border: '1px solid var(--sac-line)',
                  borderRadius: 'var(--sac-radius-sm)',
                  fontSize: 13,
                }}
              >
                <div className="sac-eyebrow" style={{ marginBottom: 4 }}>
                  Member Purchase Notes
                </div>
                {selected.comments}
              </div>
            )}
          </div>

          <div className="sac-panel">
            <div className="sac-eyebrow">Approved Request Comparison</div>
            <h3 className="sac-heading-md" style={{ marginTop: 4 }}>
              {summary?.title || selected.approval_id_entered}
            </h3>
            <div className="sac-muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 14 }}>
              Approval ID: <span className="sac-mono">{selected.approval_id_entered}</span> ·
              Claimed:{' '}
              <strong className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                ${Number(selected.amount_claimed).toFixed(2)}
              </strong>{' '}
              vs Approved:{' '}
              <strong className="sac-mono">
                ${Number(summary?.total_amount || 0).toFixed(2)}
              </strong>
            </div>

            <div className="sac-table-wrap" style={{ marginBottom: 18 }}>
              <table className="sac-data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Vendor</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.item_name}</td>
                      <td className="sac-muted">{item.vendor || '—'}</td>
                      <td className="sac-mono">{item.quantity}</td>
                      <td className="sac-mono">${Number(item.unit_price).toFixed(2)}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        {item.category.replace('_', ' ')}
                      </td>
                      <td className="sac-mono" style={{ textAlign: 'right' }}>
                        ${Number(item.line_total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="sac-divider" />

            <form onSubmit={handleStatusUpdate}>
              <div className="sac-form-grid">
                <div className="sac-field">
                  <label htmlFor="ref-status-select">Refund Status *</label>
                  <select
                    id="ref-status-select"
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="reimbursed">Reimbursed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="sac-field">
                  <label htmlFor="ref-dir-notes">Director Notes</label>
                  <input
                    id="ref-dir-notes"
                    type="text"
                    placeholder="e.g. Reimbursed via Zelle"
                    value={directorNotes}
                    onChange={(e) => setDirectorNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="sac-btn sac-btn-primary" disabled={updating}>
                  {updating ? 'Updating...' : 'Update Refund Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
