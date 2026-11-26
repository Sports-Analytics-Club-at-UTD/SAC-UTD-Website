import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { extractErrorMessage, financeApi } from '../api/financeApi';
import DirectorReviewQueue from '../components/finance/DirectorReviewQueue';
import FundingRequestForm from '../components/finance/FundingRequestForm';
import '../styles/financePortal.css';

export default function Finance() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (!token) {
      navigate('/portal', { replace: true });
      return;
    }

    financeApi
      .getWhoAmI()
      .then((data) => setUser(data))
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('sac_auth_token');
          navigate('/portal', { replace: true });
          return;
        }
        setAuthError(extractErrorMessage(err, 'Failed to verify session.'));
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const isFinanceDirector = Boolean(
    user && (user.is_superuser || user.role === 'director_finance' || user.role === 'exec')
  );

  const requestedTab = searchParams.get('tab') || '';
  const allowedTabs = isFinanceDirector
    ? ['submit', 'review', 'refunds', 'analytics']
    : ['submit', 'refunds'];
  const activeTab = allowedTabs.includes(requestedTab)
    ? requestedTab
    : isFinanceDirector
      ? 'review'
      : 'submit';

  const setTab = (tabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabKey);
    setSearchParams(next, { replace: true });
  };

  const roleBadgeLabel = user?.is_superuser
    ? 'ACCESS: SUPERUSER'
    : user?.role === 'exec'
      ? 'ACCESS: EXEC · ALL SECTIONS'
      : user?.role === 'director_finance'
        ? 'ACCESS: FINANCE DIRECTOR'
        : `ACCESS: ${(user?.role_display || 'MEMBER').toUpperCase()}`;

  return (
    <div className="sac-portal">
      <div className="sac-page">
        <Link to="/" className="sac-back-link">
          ← Return to Homepage
        </Link>

        {loading ? (
          <div className="sac-panel">
            <p className="sac-muted">Loading Finance Dashboard...</p>
          </div>
        ) : authError ? (
          <div className="sac-panel">
            <div className="sac-banner sac-banner-error" style={{ marginBottom: 0 }}>
              {authError}
            </div>
          </div>
        ) : (
          <>
            <header className="sac-portal-header">
              <div>
                <div className="sac-eyebrow">SAC Finance Portal</div>
                <h1 className="sac-heading-lg" style={{ marginTop: 4 }}>
                  Finance Dashboard
                </h1>
              </div>
              <div className="sac-node-badge">{roleBadgeLabel}</div>
            </header>

            <nav className="sac-tabs" aria-label="Finance Sections">
              <button
                type="button"
                className={`sac-tab ${activeTab === 'submit' ? 'active' : ''}`}
                onClick={() => setTab('submit')}
              >
                Submit Request
              </button>

              {isFinanceDirector && (
                <button
                  type="button"
                  className={`sac-tab ${activeTab === 'review' ? 'active' : ''}`}
                  onClick={() => setTab('review')}
                >
                  Review Queue
                </button>
              )}

              <button
                type="button"
                className={`sac-tab ${activeTab === 'refunds' ? 'active' : ''}`}
                onClick={() => setTab('refunds')}
              >
                Refunds
              </button>

              {isFinanceDirector && (
                <button
                  type="button"
                  className={`sac-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setTab('analytics')}
                >
                  Cost Analytics
                </button>
              )}
            </nav>

            {activeTab === 'submit' && <FundingRequestForm user={user} />}
            {activeTab === 'review' && isFinanceDirector && <DirectorReviewQueue />}
            {activeTab === 'refunds' && (
              <div className="sac-panel">
                <div className="sac-eyebrow">Phase 4</div>
                <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
                  Refund Requests &amp; Receipt Queue
                </h2>
                <p className="sac-muted" style={{ marginBottom: 0 }}>
                  Refund submission (with live Approval ID lookup &amp; private receipt upload) and
                  the Finance Director Refund Queue will be wired in Phase 4.
                  {searchParams.get('approval_id') && (
                    <>
                      {' '}
                      Pre-selected Approval ID:{' '}
                      <span className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                        {searchParams.get('approval_id')}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
            {activeTab === 'analytics' && isFinanceDirector && (
              <div className="sac-panel">
                <div className="sac-eyebrow">Phase 4</div>
                <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
                  Cost Breakdown &amp; Analytics
                </h2>
                <p className="sac-muted" style={{ marginBottom: 0 }}>
                  Recharts visualizations, KPI cards, and CSV audit export will be wired in Phase 4.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
