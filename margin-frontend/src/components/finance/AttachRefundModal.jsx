import { useEffect, useRef, useState } from 'react';
import { extractErrorMessage, financeApi } from '../../api/financeApi';

export default function AttachRefundModal({ fundingRequest, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [amountClaimed, setAmountClaimed] = useState(
    String(fundingRequest.total_amount || '0.00')
  );
  const [comments, setComments] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!receiptFile) {
      setError('Please upload a receipt image or PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('funding_request_id', String(fundingRequest.id));
    if (fundingRequest.approval_id) {
      formData.append('approval_id', fundingRequest.approval_id);
    }
    if (amountClaimed.trim()) {
      formData.append('amount_claimed', amountClaimed.trim());
    }
    formData.append('comments', comments.trim());
    formData.append('receipt', receiptFile);

    setSubmitting(true);
    try {
      await financeApi.createRefundRequest(formData);
      onSuccess();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to attach refund request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sac-modal-backdrop" role="dialog" aria-modal="true">
      <div className="sac-modal">
        <div className="sac-modal-header">
          <div>
            <div className="sac-eyebrow">Attach Officer Refund Request</div>
            <h3 className="sac-heading-md">{fundingRequest.title}</h3>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sac-modal-body">
            {error && <div className="sac-banner sac-banner-error">{error}</div>}

            <p className="sac-muted" style={{ marginTop: 0 }}>
              Approval ID: <strong className="sac-mono">{fundingRequest.approval_id}</strong> ·
              Approved Total:{' '}
              <strong className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                ${Number(fundingRequest.total_amount).toFixed(2)}
              </strong>
            </p>

            <div className="sac-field">
              <label htmlFor="att-ref-amount">Amount Claimed *</label>
              <input
                id="att-ref-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="sac-mono"
                value={amountClaimed}
                onChange={(e) => setAmountClaimed(e.target.value)}
                required
              />
            </div>

            <div className="sac-field">
              <label htmlFor="att-ref-file">Receipt Image or PDF *</label>
              <input
                ref={fileInputRef}
                id="att-ref-file"
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                className="sac-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                </div>
                <div className="sac-muted" style={{ fontSize: 12 }}>
                  PNG, JPG, WEBP, or PDF up to 10 MB
                </div>
              </div>
              {previewUrl && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={previewUrl}
                    alt="Receipt preview"
                    style={{
                      maxHeight: 200,
                      maxWidth: '100%',
                      borderRadius: 'var(--sac-radius-sm)',
                      border: '1px solid var(--sac-line)',
                    }}
                  />
                </div>
              )}
            </div>

            <div className="sac-field" style={{ marginBottom: 0 }}>
              <label htmlFor="att-ref-comments">Purchase Notes / Payment Handle</label>
              <textarea
                id="att-ref-comments"
                rows={2}
                placeholder="e.g. Paid at Costco, Zelle netid@utdallas.edu"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>

          <div className="sac-modal-footer">
            <button type="button" className="sac-btn sac-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Refund Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
