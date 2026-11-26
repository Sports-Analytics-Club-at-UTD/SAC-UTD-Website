import { useState } from 'react';
import { extractErrorMessage, financeApi } from '../../api/financeApi';
import { computeGrandTotal } from '../../utils/financeLineItems';
import LineItemGrid from './LineItemGrid';

export default function ModifyModal({ requestItem, utdQuota, onClose, onSuccess }) {
  const [fundingSource, setFundingSource] = useState(
    requestItem.funding_source || 'club_funds'
  );
  const [summary, setSummary] = useState('');
  const [items, setItems] = useState(
    (requestItem.items || []).map((item) => ({
      item_name: item.item_name,
      quantity: String(item.quantity),
      unit_quantity: item.unit_quantity || '',
      unit_price: String(item.unit_price),
      category: item.category,
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const limitReached = Boolean(utdQuota?.is_limit_reached);
  const originalTotal = Number(requestItem.total_amount || 0);
  const newTotal = computeGrandTotal(items);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (items.some((r) => !r.item_name.trim())) {
      setError('Every line item must have an Item Name.');
      return;
    }

    setSubmitting(true);
    try {
      await financeApi.modifyFundingRequest(requestItem.id, {
        funding_source: fundingSource,
        summary: summary.trim(),
        items: items.map((r, idx) => ({
          item_name: r.item_name.trim(),
          quantity: r.quantity,
          unit_quantity: r.unit_quantity.trim(),
          unit_price: r.unit_price,
          category: r.category,
          sort_order: idx,
        })),
      });
      onSuccess();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to modify funding request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sac-modal-backdrop" role="dialog" aria-modal="true">
      <div className="sac-modal wide">
        <div className="sac-modal-header">
          <div>
            <div className="sac-eyebrow">Modify Line Items</div>
            <h3 className="sac-heading-md">{requestItem.title}</h3>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="sac-modal-body">
            {error && <div className="sac-banner sac-banner-error">{error}</div>}

            {utdQuota && (
              <div className="sac-banner sac-banner-warn">
                <strong>UTD Programming Funds Quota ({utdQuota.semester}):</strong>{' '}
                {utdQuota.used_count} / {utdQuota.limit} used ({utdQuota.remaining} remaining)
              </div>
            )}

            <div className="sac-form-grid">
              <div className="sac-field">
                <label htmlFor="mod-source">Funding Source (Required before approval) *</label>
                <select
                  id="mod-source"
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

              <div className="sac-field">
                <label htmlFor="mod-summary">Summary Note for Requester</label>
                <input
                  id="mod-summary"
                  type="text"
                  placeholder="e.g. Adjusted quantities to match catering cap"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
            </div>

            <div
              className="sac-mono"
              style={{
                display: 'flex',
                gap: 16,
                marginBottom: 14,
                fontSize: 13,
                color: 'var(--sac-text-400)',
              }}
            >
              <span>Original Total: ${originalTotal.toFixed(2)}</span>
              <span>→</span>
              <span style={{ color: 'var(--sac-orange-400)' }}>
                New Total: ${newTotal.toFixed(2)}
              </span>
            </div>

            <LineItemGrid items={items} onChange={setItems} disabled={submitting} />
          </div>

          <div className="sac-modal-footer">
            <button type="button" className="sac-btn sac-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting}>
              {submitting ? 'Saving & Notifying...' : 'Save Modifications & Email Requester'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
