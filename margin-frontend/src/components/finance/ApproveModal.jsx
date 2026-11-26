import { useState } from 'react';
import { extractErrorMessage, financeApi } from '../../api/financeApi';

export default function ApproveModal({ requestItem, utdQuota, onClose, onSuccess }) {
  const [fundingSource, setFundingSource] = useState('club_funds');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const limitReached = Boolean(utdQuota?.is_limit_reached);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await financeApi.approveFundingRequest(requestItem.id, fundingSource);
      onSuccess();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to approve request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sac-modal-backdrop" role="dialog" aria-modal="true">
      <div className="sac-modal">
        <div className="sac-modal-header">
          <div>
            <div className="sac-eyebrow">Approve Funding Request</div>
            <h3 className="sac-heading-md">{requestItem.title}</h3>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sac-modal-body">
            {error && <div className="sac-banner sac-banner-error">{error}</div>}

            <p className="sac-muted" style={{ marginTop: 0 }}>
              Requester: <strong>{requestItem.requester_username}</strong> · Total:{' '}
              <strong className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                ${Number(requestItem.total_amount).toFixed(2)}
              </strong>
            </p>

            {utdQuota && (
              <div className="sac-banner sac-banner-warn">
                <strong>UTD Programming Funds Quota ({utdQuota.semester}):</strong>{' '}
                {utdQuota.used_count} / {utdQuota.limit} used ({utdQuota.remaining} remaining)
                {limitReached && ' — Semester limit reached. Use Club Funds.'}
              </div>
            )}

            <div className="sac-field">
              <label htmlFor="approve-source">Select Funding Source (Required) *</label>
              <select
                id="approve-source"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
                required
              >
                <option value="club_funds">Club Funds</option>
                <option value="utd_programming_funds" disabled={limitReached}>
                  UTD Programming Funds ({utdQuota ? `${utdQuota.used_count}/${utdQuota.limit}` : 'max 4/semester'})
                </option>
              </select>
            </div>

            {fundingSource === 'utd_programming_funds' && (
              <p className="sac-muted" style={{ fontSize: 13 }}>
                Approving with UTD Programming Funds will flag this request with a UTD Programming
                Funds Form checklist item in your queue.
              </p>
            )}
          </div>

          <div className="sac-modal-footer">
            <button type="button" className="sac-btn sac-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sac-btn sac-btn-success" disabled={submitting}>
              {submitting ? 'Approving...' : 'Confirm Approval & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
