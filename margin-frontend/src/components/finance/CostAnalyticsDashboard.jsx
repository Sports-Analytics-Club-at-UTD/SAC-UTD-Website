import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { extractErrorMessage, financeApi } from '../../api/financeApi';
import { ITEM_CATEGORIES } from '../../utils/financeLineItems';
import { getSemesterLabel } from '../../utils/semesters';

const CATEGORY_LABELS = Object.fromEntries(ITEM_CATEGORIES.map((c) => [c.value, c.label]));
const CHART_COLORS = ['#e8720c', '#4cad7d', '#f0923d', '#3fa9f5', '#2d6a4f', '#8fa396', '#ff5d5d'];

function formatDollar(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function CostAnalyticsDashboard({ semester = '' }) {
  const [dateFilters, setDateFilters] = useState({
    date_from: '',
    date_to: '',
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    const params = { ...dateFilters, semester };
    financeApi
      .getAnalytics(params)
      .then((res) => {
        if (!active) return;
        setData(res);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load cost analytics.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dateFilters, semester]);

  const handleExportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      await financeApi.downloadAnalyticsCsv({ ...dateFilters, semester });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to export CSV.'));
    } finally {
      setExporting(false);
    }
  };

  const kpis = data?.kpis;
  const utdQuota = data?.utd_quota;

  const categoryData = (data?.by_category || [])
    .map((row) => ({
      name: CATEGORY_LABELS[row.category] || row.category.replace('_', ' '),
      total: Number(row.total || 0),
    }))
    .filter((row) => row.total > 0 || ITEM_CATEGORIES.some((c) => c.label === row.name));

  const sourceData = (data?.by_funding_source || []).map((row) => ({
    name: row.label,
    total: Number(row.total || 0),
    count: row.count,
  }));

  const scopeData = (data?.by_scope_classification || []).map((row) => ({
    name: row.label,
    total: Number(row.total || 0),
  }));

  const approvedVsReimbursedData = (data?.approved_vs_reimbursed || []).map((row) => ({
    name: row.label,
    Approved: Number(row.approved || 0),
    Reimbursed: Number(row.reimbursed || 0),
    Pending: Number(row.pending_reimbursement || 0),
  }));

  return (
    <div>
      {/* Filter & Export Bar */}
      <div className="sac-panel" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
          }}
        >
          <div className="sac-form-grid" style={{ flex: 1, marginBottom: 0 }}>
            <div className="sac-field" style={{ marginBottom: 0 }}>
              <label>Active Semester</label>
              <div
                style={{
                  background: 'var(--sac-void)',
                  border: '1px solid var(--sac-line)',
                  borderRadius: 'var(--sac-radius-sm)',
                  padding: '10px 12px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--sac-orange-400)',
                }}
              >
                {getSemesterLabel(semester)}
              </div>
            </div>

            <div className="sac-field" style={{ marginBottom: 0 }}>
              <label htmlFor="an-from">Date From</label>
              <input
                id="an-from"
                type="date"
                value={dateFilters.date_from}
                onChange={(e) => setDateFilters((f) => ({ ...f, date_from: e.target.value }))}
              />
            </div>

            <div className="sac-field" style={{ marginBottom: 0 }}>
              <label htmlFor="an-to">Date To</label>
              <input
                id="an-to"
                type="date"
                value={dateFilters.date_to}
                onChange={(e) => setDateFilters((f) => ({ ...f, date_to: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sac-btn sac-btn-ghost sac-btn-sm"
              onClick={() => setDateFilters({ date_from: '', date_to: '' })}
            >
              Clear Dates
            </button>
            <button
              type="button"
              className="sac-btn sac-btn-primary sac-btn-sm"
              disabled={exporting}
              onClick={handleExportCsv}
            >
              {exporting ? 'Exporting...' : 'Export Audit CSV'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="sac-banner sac-banner-error">{error}</div>}

      {loading && !data ? (
        <div className="sac-panel">
          <p className="sac-muted">Loading analytics...</p>
        </div>
      ) : data ? (
        <>
          {utdQuota && (
            <div className="sac-quota-banner">
              <div>
                <div className="sac-eyebrow">UTD Programming Funds Semester Cap</div>
                <div style={{ marginTop: 4, fontWeight: 600 }}>
                  {utdQuota.semester}:{' '}
                  <span className="sac-mono" style={{ color: 'var(--sac-orange-400)' }}>
                    {utdQuota.used_count} / {utdQuota.limit}
                  </span>{' '}
                  used · {utdQuota.remaining} remaining · Pending UTD Forms:{' '}
                  <span className="sac-mono">{kpis?.utd_forms_pending_count || 0}</span>
                </div>
              </div>
              <div className="sac-quota-track">
                <div
                  className={`sac-quota-fill ${utdQuota.is_limit_reached ? 'full' : ''}`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((utdQuota.used_count / Math.max(1, utdQuota.limit)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="sac-kpi-grid">
            <div className="sac-kpi-card">
              <div className="sac-eyebrow">Total Approved</div>
              <div className="sac-stat-number">{formatDollar(kpis?.total_approved)}</div>
              <div className="sac-muted sac-mono" style={{ fontSize: 12, marginTop: 4 }}>
                Subtotal {formatDollar(kpis?.total_subtotal)} · TX Tax {formatDollar(kpis?.total_tax)}
              </div>
            </div>

            <div className="sac-kpi-card" style={{ borderTopColor: 'var(--sac-status-green)' }}>
              <div className="sac-eyebrow">Total Reimbursed</div>
              <div className="sac-stat-number" style={{ color: 'var(--sac-status-green)' }}>
                {formatDollar(kpis?.total_reimbursed)}
              </div>
              <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Completed refund payouts
              </div>
            </div>

            <div className="sac-kpi-card">
              <div className="sac-eyebrow">Pending Reimbursement</div>
              <div className="sac-stat-number">{formatDollar(kpis?.pending_reimbursement)}</div>
              <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                {kpis?.pending_refund_count || 0} refund requests awaiting payout
              </div>
            </div>

            <div className="sac-kpi-card" style={{ borderTopColor: 'var(--sac-green-500)' }}>
              <div className="sac-eyebrow">Remaining Allocation</div>
              <div className="sac-stat-number" style={{ color: 'var(--sac-text-100)' }}>
                {formatDollar(kpis?.remaining_allocation)}
              </div>
              <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                {kpis?.approved_request_count || 0} approved · {kpis?.pending_review_count || 0}{' '}
                awaiting review
              </div>
            </div>

            {data?.semester_budget && (
              <div className="sac-kpi-card">
                <div className="sac-eyebrow">Semester Goals</div>
                <div className="sac-stat-number" style={{ fontSize: 22 }}>
                  Spend {formatDollar(data.semester_budget.spending_goal)}
                </div>
                <div className="sac-muted sac-mono" style={{ fontSize: 12, marginTop: 6 }}>
                  Fundraising: {formatDollar(data.semester_budget.fundraising_raised)} /{' '}
                  {formatDollar(data.semester_budget.fundraising_goal)}
                </div>
              </div>
            )}
          </div>

          {/* Recharts Visualizations */}
          <div className="sac-chart-grid">
            <div className="sac-panel">
              <div className="sac-eyebrow">Category Breakdown</div>
              <h3 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Spend by Category
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={categoryData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#223529" />
                    <XAxis
                      dataKey="name"
                      stroke="#8fa396"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                    />
                    <YAxis stroke="#8fa396" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(val) => formatDollar(val)}
                      contentStyle={{
                        backgroundColor: '#10201a',
                        borderColor: '#223529',
                        color: '#f4f7f4',
                      }}
                    />
                    <Bar dataKey="total" name="Spend" fill="#e8720c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sac-panel">
              <div className="sac-eyebrow">Funding Source Mix</div>
              <h3 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Club Funds vs UTD Programming Funds
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {sourceData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatDollar(val)}
                      contentStyle={{
                        backgroundColor: '#10201a',
                        borderColor: '#223529',
                        color: '#f4f7f4',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sac-panel">
              <div className="sac-eyebrow">Scope &amp; Event Classification</div>
              <h3 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Spend by Scope &amp; Classification
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={scopeData} margin={{ top: 8, right: 16, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#223529" />
                    <XAxis
                      dataKey="name"
                      stroke="#8fa396"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#8fa396" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(val) => formatDollar(val)}
                      contentStyle={{
                        backgroundColor: '#10201a',
                        borderColor: '#223529',
                        color: '#f4f7f4',
                      }}
                    />
                    <Bar dataKey="total" name="Approved Spend" fill="#4cad7d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="sac-panel">
              <div className="sac-eyebrow">Cashflow Tracking</div>
              <h3 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Approved vs Reimbursed Spend
              </h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={approvedVsReimbursedData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#223529" />
                    <XAxis dataKey="name" stroke="#8fa396" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#8fa396" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(val) => formatDollar(val)}
                      contentStyle={{
                        backgroundColor: '#10201a',
                        borderColor: '#223529',
                        color: '#f4f7f4',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Approved" fill="#e8720c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Reimbursed" fill="#4cad7d" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pending" fill="#3fa9f5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
