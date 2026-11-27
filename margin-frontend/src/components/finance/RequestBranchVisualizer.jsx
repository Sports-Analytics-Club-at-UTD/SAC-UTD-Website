export default function RequestBranchVisualizer({ request }) {
  const refunds = request.refund_requests || [];
  const hasReimbursed = refunds.some((r) => r.status === 'reimbursed');
  const hasPendingRefund = refunds.some((r) => r.status === 'pending');

  const isSchoolPath = request.funding_source === 'utd_programming_funds';
  const isClubPath = request.funding_source === 'club_funds';

  // Stage 2: Director Decision
  const reviewState =
    request.status === 'approved'
      ? 'done'
      : request.status === 'denied'
        ? 'rejected'
        : 'active';

  const reviewLabel =
    request.status === 'approved'
      ? 'Director Approved'
      : request.status === 'modified'
        ? 'Modified · Awaiting Confirm'
        : request.status === 'denied'
          ? 'Director Rejected'
          : 'Pending Director Review';

  // Stage 3: Funding Path
  const pathState = request.funding_source ? 'done' : 'pending';
  const pathLabel = isSchoolPath
    ? 'School Funds'
    : isClubPath
      ? request.diverted_from_school
        ? 'Club Funds · Diverted from School'
        : 'Club Funds'
      : 'Choose Funding Source';

  // School sub-steps
  const schoolStatus = request.school_review_status || 'not_submitted';
  const schoolSubmittedState =
    schoolStatus !== 'not_submitted' ? 'done' : request.status === 'approved' ? 'active' : 'pending';
  const schoolDecisionState =
    schoolStatus === 'approved' || schoolStatus === 'modified'
      ? 'done'
      : schoolStatus === 'rejected'
        ? 'rejected'
        : schoolStatus === 'submitted'
          ? 'active'
          : 'pending';
  const schoolDecisionLabel =
    schoolStatus === 'approved'
      ? 'School Approved'
      : schoolStatus === 'modified'
        ? 'School Modified'
        : schoolStatus === 'rejected'
          ? 'School Rejected · Divert to Club'
          : schoolStatus === 'submitted'
            ? 'School Review Pending'
            : 'School Decision';

  const boughtState = request.items_bought
    ? 'done'
    : (isClubPath && request.status === 'approved') ||
        (isSchoolPath && (schoolStatus === 'approved' || schoolStatus === 'modified'))
      ? 'active'
      : 'pending';

  const clubRefundedState = request.club_refunded
    ? 'done'
    : request.items_bought
      ? 'active'
      : 'pending';

  const officerRefundState = hasReimbursed
    ? 'done'
    : hasPendingRefund
      ? 'active'
      : 'pending';

  const officerRefundLabel = hasReimbursed
    ? `Officer Refunded · ${refunds.length}`
    : hasPendingRefund
      ? `Officer Refund Pending · ${refunds.length}`
      : 'Officer Refund · Optional';

  return (
    <div className="sac-branch-box">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span className="sac-eyebrow">Request Lifecycle Branch</span>
        {request.diverted_from_school && (
          <span className="sac-pill sac-pill-modified">Diverted from School Funds</span>
        )}
      </div>

      <div className="sac-branch-track">
        <span className="sac-branch-node done">Submitted</span>
        <span className="sac-branch-arrow">→</span>
        <span className={`sac-branch-node ${reviewState}`}>{reviewLabel}</span>

        {request.status !== 'denied' && (
          <>
            <span className="sac-branch-arrow">→</span>
            <span className={`sac-branch-node ${pathState}`}>{pathLabel}</span>
          </>
        )}

        {isSchoolPath && request.status !== 'denied' && (
          <>
            <span className="sac-branch-arrow">→</span>
            <span className={`sac-branch-node ${schoolSubmittedState}`}>
              {schoolStatus !== 'not_submitted' ? 'Submitted to School' : 'Submit to School'}
            </span>
            <span className="sac-branch-arrow">→</span>
            <span className={`sac-branch-node ${schoolDecisionState}`}>{schoolDecisionLabel}</span>

            {schoolStatus !== 'rejected' && (
              <>
                <span className="sac-branch-arrow">→</span>
                <span className={`sac-branch-node ${boughtState}`}>Bought Items</span>
                <span className="sac-branch-arrow">→</span>
                <span className={`sac-branch-node ${clubRefundedState}`}>Club Refunded</span>
                <span className="sac-branch-arrow">→</span>
                <span className={`sac-branch-node ${officerRefundState}`}>{officerRefundLabel}</span>
              </>
            )}
          </>
        )}

        {isClubPath && request.status === 'approved' && (
          <>
            <span className="sac-branch-arrow">→</span>
            <span className={`sac-branch-node ${boughtState}`}>Bought Items</span>
            <span className="sac-branch-arrow">→</span>
            <span className={`sac-branch-node ${officerRefundState}`}>{officerRefundLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
