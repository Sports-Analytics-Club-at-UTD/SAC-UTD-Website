import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asList, extractErrorMessage, financeApi } from '../../api/financeApi';
import { ITEM_CATEGORIES } from '../../utils/financeLineItems';
import ApproveModal from './ApproveModal';
import AttachRefundModal from './AttachRefundModal';
import DenyModal from './DenyModal';
import ModifyModal from './ModifyModal';
import RequestBranchVisualizer from './RequestBranchVisualizer';

export default function UnifiedRequestsHub({
  semester = '',
  isFinanceDirector = false,
  initialApprovalId = '',
}) {
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
    refund_status: '',
  });

  const [modalState, setModalState] = useState({ type: null, item: null });
  const [attachTarget, setAttachTarget] = useState(null);
  const [receiptModal, setReceiptModal] = useState({
    refund: null,
    fundingRequest: null,
    urlInfo: null,
    loading: false,
    nextStatus: 'reimbursed',
    directorNotes: '',
    saving: false,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        status: filters.status,
        scope: filters.scope,
        category: filters.category,
        funding_source: filters.funding_source,
      };
      if (semester) params.semester = semester;

      const [reqsData, quotaData] = await Promise.all([
        financeApi.listFundingRequests(params),
        isFinanceDirector ? financeApi.getUtdQuota(semester) : Promise.resolve(null),
      ]);
      setRequests(asList(reqsData));
      setUtdQuota(quotaData);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load requests.'));
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.scope, filters.category, filters.funding_source, semester, isFinanceDirector]);

  useEffect(() => {
    let active = true;
    const params = {
      status: filters.status,
      scope: filters.scope,
      category: filters.category,
      funding_source: filters.funding_source,
    };
    if (semester) params.semester = semester;

    Promise.all([
      financeApi.listFundingRequests(params),
      isFinanceDirector ? financeApi.getUtdQuota(semester) : Promise.resolve(null),
    ])
      .then(([reqsData, quotaData]) => {
        if (!active) return;
        const list = asList(reqsData);
        setRequests(list);
        setUtdQuota(quotaData);
        if (initialApprovalId) {
          const match = list.find(
            (r) =>
              r.approval_id &&
              r.approval_id.toLowerCase() === initialApprovalId.trim().toLowerCase()
          );
          if (match) setAttachTarget(match);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load requests.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    filters.status,
    filters.scope,
    filters.category,
    filters.funding_source,
    semester,
    isFinanceDirector,
    initialApprovalId,
  ]);

  const handleWorkflowUpdate = async (reqId, payload) => {
    setError('');
    try {
      await financeApi.updateFundingWorkflow(reqId, payload);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update request workflow.'));
    }
  };

  const openReceiptReview = async (refund, fundingRequest) => {
    setReceiptModal({
      refund,
      fundingRequest,
      urlInfo: null,
      loading: true,
      nextStatus: refund.status === 'pending' ? 'reimbursed' : refund.status,
      directorNotes: refund.director_notes || '',
      saving: false,
    });
    try {
      const info = await financeApi.getReceiptUrl(refund.id);
      setReceiptModal((prev) => ({ ...prev, urlInfo: info, loading: false }));
    } catch {
      setReceiptModal((prev) => ({ ...prev, urlInfo: null, loading: false }));
    }
  };

  const handleSaveRefundStatus = async (e) => {
    e.preventDefault();
    if (!receiptModal.refund) return;
    setReceiptModal((prev) => ({ ...prev, saving: true }));
    try {
      await financeApi.updateRefundStatus(receiptModal.refund.id, {
        status: receiptModal.nextStatus,
        director_notes: receiptModal.directorNotes.trim(),
      });
      setReceiptModal({
        refund: null,
        fundingRequest: null,
        urlInfo: null,
        loading: false,
        nextStatus: 'reimbursed',
        directorNotes: '',
        saving: false,
      });
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update refund status.'));
      setReceiptModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const filteredRequests = filters.refund_status
    ? requests.filter((req) => {
        const refunds = req.refund_requests || [];
        if (filters.refund_status === 'none') return refunds.length === 0;
        return refunds.some((r) => r.status === filters.refund_status);
      })
    : requests;

  const quotaPct = utdQuota
    ? Math.min(100, Math.round((utdQuota.used_count / Math.max(1, utdQuota.limit)) * 100))
    : 0;

  return (
    <div>
      {isFinanceDirector && utdQuota && (
        <div className="sac-quota-banner">
          <div>
            <div className="sac-eyebrow">UTD Programming Funds Semester Cap</div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>
              {utdQuota.semester}:{' '}
              <span className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                {utdQuota.used_count} / {utdQuota.limit}
              </span>{' '}
              requests used · {utdQuota.remaining} remaining
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

      {/* Global Filters */}
      <div className="sac-panel" style={{ marginBottom: 20 }}>
        <div className="sac-form-grid" style={{ marginBottom: 0 }}>
          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-status">Request Status</label>
            <select
              id="u-status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="unchecked">Unchecked</option>
              <option value="modified">Modified — Awaiting Confirm</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-scope">Scope</label>
            <select
              id="u-scope"
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
            <label htmlFor="u-cat">Item Category</label>
            <select
              id="u-cat"
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              {ITEM_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-src">Funding Source</label>
            <select
              id="u-src"
              value={filters.funding_source}
              onChange={(e) => setFilters((f) => ({ ...f, funding_source: e.target.value }))}
            >
              <option value="">All Sources</option>
              <option value="club_funds">Club Funds</option>
              <option value="utd_programming_funds">School Funds</option>
            </select>
          </div>

          <div className="sac-field" style={{ marginBottom: 0 }}>
            <label htmlFor="u-ref">Officer Refunds</label>
            <select
              id="u-ref"
              value={filters.refund_status}
              onChange={(e) => setFilters((f) => ({ ...f, refund_status: e.target.value }))}
            >
              <option value="">All Refund States</option>
              <option value="pending">Has Pending Refund</option>
              <option value="reimbursed">Has Reimbursed Refund</option>
              <option value="rejected">Has Rejected Refund</option>
              <option value="none">No Refund Attached</option>
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
            <div className="sac-eyebrow">Global Requests &amp; Refunds Hub</div>
            <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
              Requests · {filteredRequests.length}
            </h2>
          </div>
          <button type="button" className="sac-btn sac-btn-ghost sac-btn-sm" onClick={loadAll}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="sac-muted">Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p className="sac-muted">No requests match the selected filters for this semester.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredRequests.map((req) => {
              const isExpanded = expandedId === req.id;
              const isSchool = req.funding_source === 'utd_programming_funds';
              const attachedRefunds = req.refund_requests || [];

              return (
                <div
                  key={req.id}
                  style={{
                    background: 'var(--sac-void)',
                    border: '1px solid var(--sac-line)',
                    borderRadius: 'var(--sac-radius-md)',
                    padding: 18,
                  }}
                >
                  {/* Top Header */}
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
                              isSchool ? 'sac-pill-utd' : 'sac-pill-club'
                            }`}
                          >
                            {isSchool ? 'School Funds' : 'Club Funds'}
                          </span>
                        )}
                        {req.approval_id && (
                          <span
                            className="sac-mono"
                            style={{ color: 'var(--sac-status-green)', fontSize: 13 }}
                          >
                            {req.approval_id}
                          </span>
                        )}
                      </div>

                      <div className="sac-muted" style={{ fontSize: 13, marginTop: 6 }}>
                        By <strong>{req.requester_username}</strong> · Scope:{' '}
                        <span style={{ textTransform: 'capitalize' }}>
                          {req.scope.replace('_', ' ')}
                        </span>
                        {req.event_classification &&
                          ` · ${req.event_classification.replace('_', ' ')}`}
                        {(req.event_summary?.name || req.event_name) &&
                          ` · Event: ${req.event_summary?.name || req.event_name}`}
                        {req.room_number && ` · Room: ${req.room_number}`}
                        {req.reservation_id && ` · Res: ${req.reservation_id}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        className="sac-mono"
                        style={{ fontSize: 20, fontWeight: 600, color: 'var(--sac-orange-400)' }}
                      >
                        ${Number(req.total_amount).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className="sac-btn sac-btn-ghost sac-btn-sm"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        {isExpanded ? 'Hide Items' : `Items · ${req.items?.length || 0}`}
                      </button>
                    </div>
                  </div>

                  {/* Branch Visualizer */}
                  <RequestBranchVisualizer request={req} />

                  {/* Requester Confirm Link */}
                  {req.status === 'modified' && (
                    <div style={{ marginTop: 12 }}>
                      <Link
                        to={`/finance/requests/${req.id}/confirm`}
                        className="sac-btn sac-btn-primary sac-btn-sm"
                      >
                        Review &amp; Confirm Director Modifications
                      </Link>
                    </div>
                  )}

                  {req.status === 'denied' && req.denial_reason && (
                    <div className="sac-error-text" style={{ marginTop: 10 }}>
                      Denial reason: {req.denial_reason}
                    </div>
                  )}

                  {/* Expanded Items & Event Details */}
                  {isExpanded && (
                    <div style={{ marginTop: 14 }}>
                      {(req.event_name ||
                        req.event_date ||
                        req.event_lead ||
                        req.event_description) && (
                        <div
                          className="sac-muted"
                          style={{
                            fontSize: 13,
                            marginBottom: 12,
                            padding: 12,
                            background: 'var(--sac-panel)',
                            border: '1px solid var(--sac-line)',
                            borderRadius: 'var(--sac-radius-sm)',
                          }}
                        >
                          {req.event_name && (
                            <div>
                              <strong>Event:</strong> {req.event_name}
                              {req.event_date && ` · ${req.event_date}`}
                              {req.event_start_time &&
                                ` · ${req.event_start_time.slice(0, 5)}${
                                  req.event_end_time ? `–${req.event_end_time.slice(0, 5)}` : ''
                                }`}
                              {req.event_estimated_attendance != null &&
                                ` · Est. Attendance: ${req.event_estimated_attendance}`}
                            </div>
                          )}
                          {req.event_lead && (
                            <div style={{ marginTop: 4 }}>
                              <strong>Lead:</strong> {req.event_lead}
                              {req.event_lead_email && ` · ${req.event_lead_email}`}
                            </div>
                          )}
                          {req.event_description && (
                            <div style={{ marginTop: 4 }}>{req.event_description}</div>
                          )}
                        </div>
                      )}
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
                              <th>Vendor</th>
                              <th>Qty</th>
                              <th>Unit</th>
                              <th>Unit Price</th>
                              <th>Category</th>
                              <th>Item Link</th>
                              <th style={{ textAlign: 'right' }}>Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(req.items || []).map((item) => (
                              <tr key={item.id}>
                                <td>{item.item_name}</td>
                                <td className="sac-muted">{item.vendor || '—'}</td>
                                <td className="sac-mono">{item.quantity}</td>
                                <td className="sac-muted">{item.unit_quantity || '—'}</td>
                                <td className="sac-mono">${Number(item.unit_price).toFixed(2)}</td>
                                <td style={{ textTransform: 'capitalize' }}>
                                  {item.category.replace('_', ' ')}
                                </td>
                                <td>
                                  {item.item_url ? (
                                    <a
                                      href={item.item_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: 'var(--sac-orange-400)',
                                        textDecoration: 'underline',
                                      }}
                                    >
                                      Open Link ↗
                                    </a>
                                  ) : (
                                    <span className="sac-muted">—</span>
                                  )}
                                </td>
                                <td className="sac-mono" style={{ textAlign: 'right' }}>
                                  ${Number(item.line_total).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div
                        className="sac-mono"
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 20,
                          marginTop: 10,
                          fontSize: 13,
                          color: 'var(--sac-text-400)',
                        }}
                      >
                        <span>
                          Subtotal: ${Number(req.subtotal_amount ?? req.total_amount).toFixed(2)}
                        </span>
                        <span>TX Tax · 8.25%: ${Number(req.tax_amount ?? 0).toFixed(2)}</span>
                        <span style={{ color: 'var(--sac-orange-400)', fontWeight: 600 }}>
                          Grand Total: ${Number(req.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Director Review & Lifecycle Controls */}
                  {isFinanceDirector && (
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

                      {(req.status === 'unchecked' || req.status === 'modified') && (
                        <button
                          type="button"
                          className="sac-btn sac-btn-danger sac-btn-sm"
                          onClick={() => setModalState({ type: 'deny', item: req })}
                        >
                          Reject
                        </button>
                      )}

                      {/* School Funds Branch Controls */}
                      {isSchool && req.status === 'approved' && (
                        <>
                          <button
                            type="button"
                            className="sac-btn sac-btn-ghost sac-btn-sm"
                            onClick={() =>
                              financeApi
                                .downloadUtdBudgetXlsx(req.id, req.approval_id)
                                .catch((err) =>
                                  setError(extractErrorMessage(err, 'Failed to export UTD XLSX.'))
                                )
                            }
                          >
                            Download UTD Budget XLSX
                          </button>

                          {req.school_review_status === 'not_submitted' && (
                            <button
                              type="button"
                              className="sac-btn sac-btn-primary sac-btn-sm"
                              onClick={() =>
                                handleWorkflowUpdate(req.id, { school_review_status: 'submitted' })
                              }
                            >
                              Mark Submitted to School
                            </button>
                          )}

                          {req.school_review_status === 'submitted' && (
                            <>
                              <button
                                type="button"
                                className="sac-btn sac-btn-success sac-btn-sm"
                                onClick={() =>
                                  handleWorkflowUpdate(req.id, { school_review_status: 'approved' })
                                }
                              >
                                School Approved
                              </button>
                              <button
                                type="button"
                                className="sac-btn sac-btn-primary sac-btn-sm"
                                onClick={() =>
                                  handleWorkflowUpdate(req.id, { school_review_status: 'modified' })
                                }
                              >
                                School Modified
                              </button>
                              <button
                                type="button"
                                className="sac-btn sac-btn-danger sac-btn-sm"
                                onClick={() =>
                                  handleWorkflowUpdate(req.id, { school_review_status: 'rejected' })
                                }
                              >
                                School Rejected
                              </button>
                            </>
                          )}

                          {req.school_review_status === 'rejected' && (
                            <button
                              type="button"
                              className="sac-btn sac-btn-primary sac-btn-sm"
                              onClick={() =>
                                handleWorkflowUpdate(req.id, { divert_to_club_funds: true })
                              }
                            >
                              Divert to Club Funds
                            </button>
                          )}
                        </>
                      )}

                      {/* Purchase & Club Refund Milestones */}
                      {req.status === 'approved' &&
                        (!isSchool ||
                          req.school_review_status === 'approved' ||
                          req.school_review_status === 'modified') && (
                          <button
                            type="button"
                            className={`sac-btn sac-btn-sm ${
                              req.items_bought ? 'sac-btn-success' : 'sac-btn-ghost'
                            }`}
                            onClick={() =>
                              handleWorkflowUpdate(req.id, { items_bought: !req.items_bought })
                            }
                          >
                            {req.items_bought ? 'Bought Items ✓' : 'Mark Items Bought'}
                          </button>
                        )}

                      {isSchool &&
                        req.status === 'approved' &&
                        (req.school_review_status === 'approved' ||
                          req.school_review_status === 'modified') && (
                          <button
                            type="button"
                            className={`sac-btn sac-btn-sm ${
                              req.club_refunded ? 'sac-btn-success' : 'sac-btn-ghost'
                            }`}
                            onClick={() =>
                              handleWorkflowUpdate(req.id, { club_refunded: !req.club_refunded })
                            }
                          >
                            {req.club_refunded ? 'Club Refunded ✓' : 'Mark Club Refunded'}
                          </button>
                        )}
                    </div>
                  )}

                  {/* Attached Officer Refund Requests Section */}
                  {req.status === 'approved' && (
                    <div
                      style={{
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: '1px solid var(--sac-line)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: attachedRefunds.length > 0 ? 10 : 0,
                        }}
                      >
                        <span className="sac-eyebrow">
                          Officer Refund Requests · {attachedRefunds.length}
                        </span>
                        <button
                          type="button"
                          className="sac-btn sac-btn-ghost sac-btn-sm"
                          onClick={() => setAttachTarget(req)}
                        >
                          + Add Refund Request
                        </button>
                      </div>

                      {attachedRefunds.length > 0 && (
                        <div className="sac-table-wrap">
                          <table className="sac-data-table">
                            <thead>
                              <tr>
                                <th>Requester</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                <th>Status</th>
                                <th>Comments / Notes</th>
                                <th>Receipt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attachedRefunds.map((ref) => (
                                <tr key={ref.id}>
                                  <td>{ref.requester_username}</td>
                                  <td className="sac-mono" style={{ textAlign: 'right' }}>
                                    ${Number(ref.amount_claimed).toFixed(2)}
                                  </td>
                                  <td>
                                    <span className={`sac-pill sac-pill-${ref.status}`}>
                                      {ref.status}
                                    </span>
                                  </td>
                                  <td className="sac-muted" style={{ fontSize: 13 }}>
                                    {ref.director_notes || ref.comments || '—'}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="sac-btn sac-btn-ghost sac-btn-sm"
                                      onClick={() => openReceiptReview(ref, req)}
                                    >
                                      {isFinanceDirector ? 'Review Receipt' : 'View Receipt'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Funding Review Modals */}
      {modalState.type === 'approve' && modalState.item && (
        <ApproveModal
          requestItem={modalState.item}
          utdQuota={utdQuota}
          onClose={() => setModalState({ type: null, item: null })}
          onSuccess={() => {
            setModalState({ type: null, item: null });
            loadAll();
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
            loadAll();
          }}
        />
      )}

      {modalState.type === 'deny' && modalState.item && (
        <DenyModal
          requestItem={modalState.item}
          onClose={() => setModalState({ type: null, item: null })}
          onSuccess={() => {
            setModalState({ type: null, item: null });
            loadAll();
          }}
        />
      )}

      {/* Attach Refund Modal */}
      {attachTarget && (
        <AttachRefundModal
          fundingRequest={attachTarget}
          onClose={() => setAttachTarget(null)}
          onSuccess={() => {
            setAttachTarget(null);
            loadAll();
          }}
        />
      )}

      {/* Side-by-Side Receipt Review Modal */}
      {receiptModal.refund && (
        <div className="sac-modal-backdrop" role="dialog" aria-modal="true">
          <div className="sac-modal wide">
            <div className="sac-modal-header">
              <div>
                <div className="sac-eyebrow">Officer Refund Review</div>
                <h3 className="sac-heading-md">
                  {receiptModal.fundingRequest?.title} · {receiptModal.refund.approval_id_entered}
                </h3>
              </div>
              <button
                type="button"
                className="sac-btn sac-btn-ghost sac-btn-sm"
                onClick={() =>
                  setReceiptModal((prev) => ({ ...prev, refund: null, fundingRequest: null }))
                }
              >
                Close
              </button>
            </div>

            <div className="sac-modal-body">
              <div className="sac-split-view">
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span className="sac-eyebrow">
                      {receiptModal.refund.receipt_original_filename}
                    </span>
                    {receiptModal.urlInfo?.url && (
                      <a
                        href={receiptModal.urlInfo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sac-btn sac-btn-ghost sac-btn-sm"
                      >
                        Open in New Tab ↗
                      </a>
                    )}
                  </div>

                  {receiptModal.loading ? (
                    <p className="sac-muted">Loading signed receipt URL...</p>
                  ) : !receiptModal.urlInfo?.url ? (
                    <p className="sac-error-text">Unable to load receipt preview.</p>
                  ) : (
                      receiptModal.urlInfo.content_type ||
                      receiptModal.refund.receipt_content_type ||
                      ''
                    ).includes('pdf') ? (
                    <iframe
                      src={receiptModal.urlInfo.url}
                      title="Receipt PDF"
                      style={{
                        width: '100%',
                        height: 380,
                        border: '1px solid var(--sac-line)',
                        borderRadius: 'var(--sac-radius-sm)',
                        background: '#fff',
                      }}
                    />
                  ) : (
                    <img
                      src={receiptModal.urlInfo.url}
                      alt={receiptModal.refund.receipt_original_filename}
                      style={{
                        width: '100%',
                        maxHeight: 380,
                        objectFit: 'contain',
                        border: '1px solid var(--sac-line)',
                        borderRadius: 'var(--sac-radius-sm)',
                        background: 'var(--sac-void)',
                      }}
                    />
                  )}
                </div>

                <div>
                  <div className="sac-eyebrow" style={{ marginBottom: 8 }}>
                    Approved Items vs Claimed
                  </div>
                  <div className="sac-muted" style={{ fontSize: 13, marginBottom: 10 }}>
                    Claimed:{' '}
                    <strong className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                      ${Number(receiptModal.refund.amount_claimed).toFixed(2)}
                    </strong>{' '}
                    of{' '}
                    <strong className="sac-mono">
                      ${Number(receiptModal.fundingRequest?.total_amount || 0).toFixed(2)}
                    </strong>
                  </div>

                  {receiptModal.refund.comments && (
                    <p className="sac-muted" style={{ fontSize: 13 }}>
                      Member notes: {receiptModal.refund.comments}
                    </p>
                  )}

                  {isFinanceDirector && (
                    <form onSubmit={handleSaveRefundStatus} style={{ marginTop: 14 }}>
                      <div className="sac-field">
                        <label htmlFor="m-ref-status">Refund Status *</label>
                        <select
                          id="m-ref-status"
                          value={receiptModal.nextStatus}
                          onChange={(e) =>
                            setReceiptModal((prev) => ({ ...prev, nextStatus: e.target.value }))
                          }
                        >
                          <option value="pending">Pending</option>
                          <option value="reimbursed">Reimbursed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>

                      <div className="sac-field">
                        <label htmlFor="m-ref-notes">Director Notes</label>
                        <input
                          id="m-ref-notes"
                          type="text"
                          placeholder="e.g. Reimbursed via Zelle"
                          value={receiptModal.directorNotes}
                          onChange={(e) =>
                            setReceiptModal((prev) => ({
                              ...prev,
                              directorNotes: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <button
                        type="submit"
                        className="sac-btn sac-btn-primary"
                        disabled={receiptModal.saving}
                      >
                        {receiptModal.saving ? 'Saving...' : 'Update Refund Status'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
