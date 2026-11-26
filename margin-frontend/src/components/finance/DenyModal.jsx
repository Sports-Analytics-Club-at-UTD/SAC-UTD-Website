import { useState } from 'react';
import { extractErrorMessage, financeApi } from '../../api/financeApi';

export default function DenyModal({ requestItem, onClose, onSuccess }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Written denial reasoning is required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await financeApi.denyFundingRequest(requestItem.id, reason.trim());
      onSuccess();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to deny request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sac-modal-backdrop" role="dialog" aria-modal="true">
      <div className="sac-modal">
        <div className="sac-modal-header">
          <div>
            <div className="sac-eyebrow">Deny Funding Request</div>
            <h3 className="sac-heading-md">{requestItem.title}</h3>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sac-modal-body">
            {error && <div className="sac-banner sac-banner-error">{error}</div>}
            <div className="sac-field">
              <label htmlFor="deny-reason">Written Denial Reasoning — emailed to requester *</label>
              <textarea
                id="deny-reason"
                rows={4}
                placeholder="Explain why this funding request is being denied..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="sac-modal-footer">
            <button type="button" className="sac-btn sac-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sac-btn sac-btn-danger" disabled={submitting}>
              {submitting ? 'Denying...' : 'Confirm Denial & Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
