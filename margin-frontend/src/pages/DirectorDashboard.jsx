import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { extractErrorMessage, financeApi } from '../api/financeApi';
import EventRequestForm from '../components/director/EventRequestForm';
import FundingRequestForm from '../components/finance/FundingRequestForm';
import RefundRequestForm from '../components/finance/RefundRequestForm';
import '../styles/financePortal.css';

const DIRECTOR_LINKS = [
  {
    title: 'Events Calendar',
    description: 'View upcoming club events, registrations, and room schedules.',
    to: '/events',
  },
  {
    title: 'Projects Board',
    description: 'Track SAC technical project teams and task boards.',
    to: '/projects',
  },
  {
    title: 'R&D Portal',
    description: 'Manage research ideas, industry connections, and workshop items.',
    to: '/rnd',
  },
  {
    title: 'Marketing Portal',
    description: 'Upload media and approve featured homepage scroller assets.',
    to: '/marketing',
  },
  {
    title: 'Secretary Portal',
    description: 'Approve pending member signups and manage club roles.',
    to: '/secretary',
  },
  {
    title: 'Finance Dashboard',
    description: 'Review funding requests, attached refunds, analytics, and global budget.',
    to: '/finance',
  },
  {
    title: 'Club Homepage',
    description: 'Return to the public SAC UTD landing page and live score ticker.',
    to: '/',
  },
];

export default function DirectorDashboard() {
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

  const rawTab = searchParams.get('tab') || 'forms';
  const activeTab = rawTab === 'links' ? 'links' : 'forms';
  const activeForm = searchParams.get('form') || 'funding';

  const setActiveTab = (tabKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabKey);
    setSearchParams(next, { replace: true });
  };

  const setActiveForm = (formKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'forms');
    next.set('form', formKey);
    setSearchParams(next, { replace: true });
  };

  const isDirector = Boolean(user && (user.is_superuser || user.is_director));

  const roleBadgeLabel = user?.is_superuser
    ? 'ACCESS: SUPERUSER'
    : user?.role === 'exec'
      ? 'ACCESS: EXEC · ALL SECTIONS'
      : `ACCESS: ${(user?.role_display || 'DIRECTOR').toUpperCase()}`;

  return (
    <div className="sac-portal">
      <div className="sac-page">
        <Link to="/" className="sac-back-link">
          ← Return to Homepage
        </Link>

        {loading ? (
          <div className="sac-panel">
            <p className="sac-muted">Loading General Director Dashboard...</p>
          </div>
        ) : authError ? (
          <div className="sac-panel">
            <div className="sac-banner sac-banner-error" style={{ marginBottom: 0 }}>
              {authError}
            </div>
          </div>
        ) : !isDirector ? (
          <div className="sac-panel">
            <div className="sac-banner sac-banner-error" style={{ marginBottom: 0 }}>
              Director or Exec clearance is required to access the General Director Dashboard.
            </div>
          </div>
        ) : (
          <>
            <header className="sac-portal-header">
              <div>
                <div className="sac-eyebrow">SAC Director Hub</div>
                <h1 className="sac-heading-lg" style={{ marginTop: 4 }}>
                  General Director Dashboard
                </h1>
              </div>

              <div className="sac-node-badge">{roleBadgeLabel}</div>
            </header>

            <nav className="sac-tabs" aria-label="Director Dashboard Sections">
              <button
                type="button"
                className={`sac-tab ${activeTab === 'forms' ? 'active' : ''}`}
                onClick={() => setActiveTab('forms')}
              >
                Forms
              </button>
              <button
                type="button"
                className={`sac-tab ${activeTab === 'links' ? 'active' : ''}`}
                onClick={() => setActiveTab('links')}
              >
                Links
              </button>
            </nav>

            {activeTab === 'forms' && (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                    marginBottom: 24,
                  }}
                >
                  <button
                    type="button"
                    className={`sac-btn ${
                      activeForm === 'funding' ? 'sac-btn-primary' : 'sac-btn-ghost'
                    }`}
                    style={{ padding: '14px 18px', fontSize: 15 }}
                    onClick={() => setActiveForm('funding')}
                  >
                    Funding Request Form
                  </button>

                  <button
                    type="button"
                    className={`sac-btn ${
                      activeForm === 'refund' ? 'sac-btn-primary' : 'sac-btn-ghost'
                    }`}
                    style={{ padding: '14px 18px', fontSize: 15 }}
                    onClick={() => setActiveForm('refund')}
                  >
                    Refund Request Form
                  </button>

                  <button
                    type="button"
                    className={`sac-btn ${
                      activeForm === 'event' ? 'sac-btn-primary' : 'sac-btn-ghost'
                    }`}
                    style={{ padding: '14px 18px', fontSize: 15 }}
                    onClick={() => setActiveForm('event')}
                  >
                    Event Request Form
                  </button>
                </div>

                {activeForm === 'funding' && <FundingRequestForm user={user} />}
                {activeForm === 'refund' && <RefundRequestForm />}
                {activeForm === 'event' && <EventRequestForm user={user} />}
              </>
            )}

            {activeTab === 'links' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                }}
              >
                {DIRECTOR_LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="sac-panel"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 12,
                      borderTop: '2px solid var(--sac-orange-500)',
                    }}
                  >
                    <div>
                      <div className="sac-eyebrow">Portal Link</div>
                      <h2 className="sac-heading-md" style={{ marginTop: 4 }}>
                        {item.title}
                      </h2>
                      <p className="sac-muted" style={{ fontSize: 13, marginBottom: 0 }}>
                        {item.description}
                      </p>
                    </div>
                    <div
                      className="sac-mono"
                      style={{ fontSize: 13, color: 'var(--sac-orange-400)', fontWeight: 600 }}
                    >
                      Open {item.title} ↗
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
