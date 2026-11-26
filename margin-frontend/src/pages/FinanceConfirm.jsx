import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { extractErrorMessage, financeApi } from '../api/financeApi';
import '../styles/financePortal.css';

export default function FinanceConfirm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    financeApi
      .getConfirmFundingRequest(id, token)
      .then((data) => {
        if (!active) return;
        setRequestData(data);
        if (data.status === 'approved') {
          setConfirmed(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(
          extractErrorMessage(
            err,
            'Unable to load this modification request. Make sure you opened the full link from your email or are logged in as the requester.'
          )
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, token]);

  const handleConfirm = async () => {
    setError('');
    setConfirming(true);
    try {
      const updated = await financeApi.confirmFundingRequest(id, token);
      setRequestData(updated);
      setConfirmed(true);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to confirm modifications.'));
    } finally {
      setConfirming(false);
    }
  };

  const latestLog = requestData?.modification_logs?.[0];
  const diff = latestLog?.diff;

  return (
    <div className="sac-portal">
      <div className="sac-page" style={{ maxWidth: 860 }}>
        <Link to="/finance" className="sac-back-link">
          ← Back to Finance Portal
        </Link>

        <div className="sac-portal-header">
          <div>
            <div className="sac-eyebrow">Funding Request Confirmation</div>
            <h1 className="sac-heading-lg" style={{ marginTop: 4 }}>
              Review Finance Director Modifications
            </h1>
          </div>
          {requestData && (
            <span className={`sac-pill sac-pill-${requestData.status}`}>
              {requestData.status}
            </span>
          )}
        </div>

        {loading ? (
          <div className="sac-panel">
            <p className="sac-muted">Loading request details...</p>
          </div>
        ) : error && !requestData ? (
          <div className="sac-panel">
            <div className="sac-banner sac-banner-error" style={{ marginBottom: 0 }}>
              {error}
            </div>
          </div>
        ) : requestData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && <div className="sac-banner sac-banner-error">{error}</div>}

            {confirmed && (
              <div className="sac-banner sac-banner-success">
                <strong>Approved!</strong> Your confirmation finalized this request. Approval ID:{' '}
                <span className="sac-mono" style={{ fontWeight: 600 }}>
                  {requestData.approval_id}
                </span>
                <div style={{ marginTop: 10 }}>
                  <Link
                    to={`/finance?tab=refunds&approval_id=${encodeURIComponent(
                      requestData.approval_id || ''
                    )}`}
                    className="sac-btn sac-btn-primary sac-btn-sm"
                  >
                    Proceed to Refund Request
                  </Link>
                </div>
              </div>
            )}

            <div className="sac-panel">
              <div className="sac-eyebrow">Request Summary</div>
              <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
                {requestData.title}
              </h2>
              <div className="sac-muted" style={{ fontSize: 13, marginTop: 6 }}>
                Funding Source:{' '}
                <strong>
                  {requestData.funding_source === 'utd_programming_funds'
                    ? 'UTD Programming Funds'
                    : 'Club Funds'}
                </strong>{' '}
                · Updated Total:{' '}
                <strong className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                  ${Number(requestData.total_amount).toFixed(2)}
                </strong>
              </div>

              {latestLog && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: 'var(--sac-void)',
                    border: '1px solid var(--sac-line)',
                    borderRadius: 'var(--sac-radius-sm)',
                  }}
                >
                  <div className="sac-eyebrow">Changes Made by {latestLog.modified_by_username || 'Finance Director'}</div>
                  {latestLog.summary && (
                    <p style={{ margin: '8px 0', fontSize: 14 }}>{latestLog.summary}</p>
                  )}
                  {diff && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      <div className="sac-mono" style={{ fontSize: 12, color: 'var(--sac-text-400)' }}>
                        Total: ${diff.previous_total} → ${diff.new_total}
                      </div>
                      {(diff.added || []).map((item, idx) => (
                        <div key={`add-${idx}`} className="sac-diff-added">
                          + {item.item_name} ({item.quantity} × ${item.unit_price} = ${item.line_total})
                        </div>
                      ))}
                      {(diff.updated || []).map((entry, idx) => (
                        <div key={`upd-${idx}`} className="sac-diff-updated">
                          ~ {entry.after.item_name}: {entry.before.quantity} × ${entry.before.unit_price} ($
                          {entry.before.line_total}) → {entry.after.quantity} × ${entry.after.unit_price} ($
                          {entry.after.line_total})
                        </div>
                      ))}
                      {(diff.removed || []).map((item, idx) => (
                        <div key={`rem-${idx}`} className="sac-diff-removed">
                          - {item.item_name} ({item.quantity} × ${item.unit_price} = ${item.line_total})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sac-panel">
              <div className="sac-eyebrow" style={{ marginBottom: 10 }}>
                Updated Line Items
              </div>
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
                    {(requestData.items || []).map((item) => (
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

              {requestData.status === 'modified' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    type="button"
                    className="sac-btn sac-btn-success"
                    disabled={confirming}
                    onClick={handleConfirm}
                  >
                    {confirming ? 'Confirming...' : 'Confirm & Finalize Approval'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
