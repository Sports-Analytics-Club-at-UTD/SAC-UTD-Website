import { useEffect, useRef, useState } from 'react';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';

export default function RefundRequestForm({
  initialApprovalId = '',
  semester = '',
  onSubmitted = null,
}) {
  const fileInputRef = useRef(null);

  const [approvalId, setApprovalId] = useState(initialApprovalId);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [amountClaimed, setAmountClaimed] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [comments, setComments] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [myRefunds, setMyRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshRefunds = async () => {
    try {
      const res = await financeApi.listRefundRequests(semester ? { semester } : {});
      setMyRefunds(asList(res));
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load refund requests.'));
    } finally {
      setLoadingRefunds(false);
    }
  };

  useEffect(() => {
    let active = true;
    financeApi
      .listRefundRequests(semester ? { semester } : {})
      .then((res) => {
        if (!active) return;
        setMyRefunds(asList(res));
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load refund requests.'));
      })
      .finally(() => {
        if (active) setLoadingRefunds(false);
      });
    return () => {
      active = false;
    };
  }, [semester]);

  useEffect(() => {
    const trimmed = approvalId.trim();
    if (!trimmed) {
      const timer = setTimeout(() => {
        setLookupResult(null);
        setLookingUp(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let active = true;
    const timer = setTimeout(() => {
      setLookingUp(true);
      financeApi
        .lookupApprovalId(trimmed)
        .then((res) => {
          if (!active) return;
          setLookupResult(res);
          if (res?.valid && !amountTouched && res.approved_total) {
            setAmountClaimed(String(res.approved_total));
          }
        })
        .catch(() => {
          if (!active) return;
          setLookupResult({ valid: false, detail: 'Unable to validate Approval ID.' });
        })
        .finally(() => {
          if (active) setLookingUp(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [approvalId, amountTouched]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setReceiptFile(file);
    if (file && file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl('');
    }
  };

  const handleOpenReceipt = async (refundId) => {
    try {
      const data = await financeApi.getReceiptUrl(refundId);
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to open receipt.'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!lookupResult?.valid) {
      setError('Enter a valid Approval ID from an approved funding request.');
      return;
    }
    if (!receiptFile) {
      setError('Please upload a receipt image or PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('approval_id', approvalId.trim());
    if (amountClaimed.trim()) {
      formData.append('amount_claimed', amountClaimed.trim());
    }
    formData.append('comments', comments.trim());
    formData.append('receipt', receiptFile);

    setSubmitting(true);
    try {
      const created = await financeApi.createRefundRequest(formData);
      setSuccess(
        `Refund request submitted for ${created.approval_id_entered} — $${Number(
          created.amount_claimed
        ).toFixed(2)}.`
      );
      setApprovalId('');
      setLookupResult(null);
      setAmountClaimed('');
      setAmountTouched(false);
      setComments('');
      setReceiptFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshRefunds();
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit refund request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <form className="sac-panel" onSubmit={handleSubmit}>
        <div style={{ marginBottom: 18 }}>
          <div className="sac-eyebrow">Member Reimbursement</div>
          <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
            Submit Refund Request
          </h2>
        </div>

        {error && <div className="sac-banner sac-banner-error">{error}</div>}
        {success && <div className="sac-banner sac-banner-success">{success}</div>}

        <div className="sac-form-grid">
          <div className="sac-field">
            <label htmlFor="ref-approval-id">Approval ID *</label>
            <input
              id="ref-approval-id"
              type="text"
              className="sac-mono"
              placeholder="e.g. SAC-2026-A7F3K9"
              value={approvalId}
              onChange={(e) => setApprovalId(e.target.value)}
              required
            />
          </div>

          <div className="sac-field">
            <label htmlFor="ref-amount">Amount Claimed *</label>
            <input
              id="ref-amount"
              type="number"
              step="0.01"
              min="0.01"
              className="sac-mono"
              placeholder="0.00"
              value={amountClaimed}
              onChange={(e) => {
                setAmountTouched(true);
                setAmountClaimed(e.target.value);
              }}
              required
            />
          </div>
        </div>

        {lookingUp && <p className="sac-muted" style={{ fontSize: 13 }}>Checking Approval ID...</p>}

        {!lookingUp && lookupResult && (
          <div
            className={`sac-banner ${
              lookupResult.valid ? 'sac-banner-success' : 'sac-banner-warn'
            }`}
          >
            {lookupResult.valid ? (
              <div>
                <strong>Verified Approved Request:</strong> {lookupResult.title}
                {lookupResult.event_name ? ` · Event: ${lookupResult.event_name}` : ''}
                {' · '}Approved Total:{' '}
                <span className="sac-mono">${Number(lookupResult.approved_total).toFixed(2)}</span>
                {' · '}
                {lookupResult.funding_source === 'utd_programming_funds'
                  ? 'UTD Programming Funds'
                  : 'Club Funds'}
              </div>
            ) : (
              <div>{lookupResult.detail}</div>
            )}
          </div>
        )}

        <div className="sac-field">
          <label htmlFor="ref-receipt">Receipt Image or PDF *</label>
          <input
            ref={fileInputRef}
            id="ref-receipt"
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
              PNG, JPG, WEBP, or PDF up to 10 MB — stored privately in Supabase Storage
            </div>
          </div>

          {previewUrl && (
            <div style={{ marginTop: 12 }}>
              <img
                src={previewUrl}
                alt="Receipt preview"
                style={{
                  maxHeight: 260,
                  maxWidth: '100%',
                  borderRadius: 'var(--sac-radius-sm)',
                  border: '1px solid var(--sac-line)',
                }}
              />
            </div>
          )}
        </div>

        <div className="sac-field">
          <label htmlFor="ref-comments">Purchase Notes / Comments</label>
          <textarea
            id="ref-comments"
            rows={2}
            placeholder="Add payment details, Zelle/Venmo handle, or partial purchase notes..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="sac-btn sac-btn-primary" disabled={submitting}>
            {submitting ? 'Uploading & Submitting...' : 'Submit Refund Request'}
          </button>
        </div>
      </form>

      {/* Member's Refund History */}
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
              My Refund Requests
            </h3>
          </div>
          <button
            type="button"
            className="sac-btn sac-btn-ghost sac-btn-sm"
            onClick={refreshRefunds}
          >
            Refresh
          </button>
        </div>

        {loadingRefunds ? (
          <p className="sac-muted">Loading refund requests...</p>
        ) : myRefunds.length === 0 ? (
          <p className="sac-muted">No refund requests submitted yet.</p>
        ) : (
          <div className="sac-table-wrap">
            <table className="sac-data-table">
              <thead>
                <tr>
                  <th>Approval ID</th>
                  <th>Funding Request</th>
                  <th style={{ textAlign: 'right' }}>Amount Claimed</th>
                  <th>Status</th>
                  <th>Director Notes</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {myRefunds.map((ref) => (
                  <tr key={ref.id}>
                    <td className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                      {ref.approval_id_entered}
                    </td>
                    <td>{ref.funding_request_summary?.title || '—'}</td>
                    <td className="sac-mono" style={{ textAlign: 'right' }}>
                      ${Number(ref.amount_claimed).toFixed(2)}
                    </td>
                    <td>
                      <span className={`sac-pill sac-pill-${ref.status}`}>{ref.status}</span>
                    </td>
                    <td className="sac-muted">{ref.director_notes || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="sac-btn sac-btn-ghost sac-btn-sm"
                        onClick={() => handleOpenReceipt(ref.id)}
                      >
                        View Receipt ↗
                      </button>
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
