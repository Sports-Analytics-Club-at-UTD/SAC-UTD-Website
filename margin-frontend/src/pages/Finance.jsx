import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { extractErrorMessage, financeApi } from '../api/financeApi';
import CostAnalyticsDashboard from '../components/finance/CostAnalyticsDashboard';
import FundingRequestForm from '../components/finance/FundingRequestForm';
import GlobalBudgetPanel from '../components/finance/GlobalBudgetPanel';
import UnifiedRequestsHub from '../components/finance/UnifiedRequestsHub';
import { SEMESTER_OPTIONS, getCurrentSemesterKey } from '../utils/semesters';
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

  const rawTab = searchParams.get('tab') || '';
  const normalizedTab = rawTab === 'review' || rawTab === 'refunds' ? 'requests' : rawTab;

  const allowedTabs = isFinanceDirector
    ? ['submit', 'requests', 'analytics', 'global_budget']
    : ['submit', 'requests'];
  const activeTab = allowedTabs.includes(normalizedTab)
    ? normalizedTab
    : isFinanceDirector
      ? 'requests'
      : 'submit';

  const hasSemesterParam = searchParams.has('semester');
  const selectedSemester = hasSemesterParam
    ? searchParams.get('semester') || ''
    : getCurrentSemesterKey();

  const setTab = (tabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabKey);
    setSearchParams(next, { replace: true });
  };

  const setSemester = (semKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('semester', semKey);
    setSearchParams(next, { replace: true });
  };

  const prefilledApprovalId = searchParams.get('approval_id') || '';

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

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="global-semester-select" className="sac-eyebrow">
                    Semester
                  </label>
                  <select
                    id="global-semester-select"
                    value={selectedSemester}
                    onChange={(e) => setSemester(e.target.value)}
                    style={{
                      background: 'var(--sac-panel-hi)',
                      border: '1px solid var(--sac-line)',
                      borderRadius: 'var(--sac-radius-sm)',
                      color: 'var(--sac-text-100)',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {SEMESTER_OPTIONS.map((opt) => (
                      <option key={opt.value || 'all'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sac-node-badge">{roleBadgeLabel}</div>
              </div>
            </header>

            <nav className="sac-tabs" aria-label="Finance Sections">
              <button
                type="button"
                className={`sac-tab ${activeTab === 'submit' ? 'active' : ''}`}
                onClick={() => setTab('submit')}
              >
                Submit Request
              </button>

              <button
                type="button"
                className={`sac-tab ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setTab('requests')}
              >
                Requests
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

              {isFinanceDirector && (
                <button
                  type="button"
                  className={`sac-tab ${activeTab === 'global_budget' ? 'active' : ''}`}
                  onClick={() => setTab('global_budget')}
                >
                  Global Budget
                </button>
              )}
            </nav>

            {activeTab === 'submit' && (
              <FundingRequestForm user={user} semester={selectedSemester} />
            )}
            {activeTab === 'requests' && (
              <UnifiedRequestsHub
                semester={selectedSemester}
                isFinanceDirector={isFinanceDirector}
                initialApprovalId={prefilledApprovalId}
              />
            )}
            {activeTab === 'analytics' && isFinanceDirector && (
              <CostAnalyticsDashboard semester={selectedSemester} />
            )}
            {activeTab === 'global_budget' && isFinanceDirector && (
              <GlobalBudgetPanel semester={selectedSemester} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
