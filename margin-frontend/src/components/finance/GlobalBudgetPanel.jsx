import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { extractErrorMessage, financeApi } from '../../api/financeApi';
import {
  SEMESTER_OPTIONS,
  getCurrentSemesterKey,
  getSemesterLabel,
} from '../../utils/semesters';

function formatDollar(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function GlobalBudgetPanel({ semester }) {
  const effectiveSemester = semester || getCurrentSemesterKey();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [balanceInput, setBalanceInput] = useState('0.00');
  const [treasuryNotes, setTreasuryNotes] = useState('');
  const [savingTreasury, setSavingTreasury] = useState(false);

  const [goalSemester, setGoalSemester] = useState(effectiveSemester);
  const [spendingGoal, setSpendingGoal] = useState('0.00');
  const [fundraisingGoal, setFundraisingGoal] = useState('0.00');
  const [fundraisingRaised, setFundraisingRaised] = useState('0.00');
  const [semesterNotes, setSemesterNotes] = useState('');
  const [savingSemester, setSavingSemester] = useState(false);

  const syncSemesterFields = (payload, semKey) => {
    const match = (payload?.semesters || []).find((s) => s.semester_key === semKey);
    if (match) {
      setSpendingGoal(String(match.spending_goal ?? '0.00'));
      setFundraisingGoal(String(match.fundraising_goal ?? '0.00'));
      setFundraisingRaised(String(match.fundraising_raised ?? '0.00'));
      setSemesterNotes(match.notes || '');
    } else {
      setSpendingGoal('0.00');
      setFundraisingGoal('0.00');
      setFundraisingRaised('0.00');
      setSemesterNotes('');
    }
  };

  useEffect(() => {
    let active = true;
    financeApi
      .getGlobalBudget()
      .then((res) => {
        if (!active) return;
        setData(res);
        setBalanceInput(String(res?.treasury?.current_balance ?? '0.00'));
        setTreasuryNotes(res?.treasury?.notes || '');
        syncSemesterFields(res, effectiveSemester);
      })
      .catch((err) => {
        if (!active) return;
        setError(extractErrorMessage(err, 'Failed to load global budget.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [effectiveSemester]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGoalSemester(effectiveSemester);
      if (data) syncSemesterFields(data, effectiveSemester);
    }, 0);
    return () => clearTimeout(timer);
  }, [effectiveSemester, data]);

  const handleSaveTreasury = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingTreasury(true);
    try {
      const updated = await financeApi.updateClubTreasury({
        current_balance: balanceInput,
        notes: treasuryNotes.trim(),
      });
      setData(updated);
      setSuccess('Updated current club treasury balance.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update club balance.'));
    } finally {
      setSavingTreasury(false);
    }
  };

  const handleSaveSemesterGoals = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSavingSemester(true);
    try {
      const updated = await financeApi.upsertSemesterBudget(goalSemester, {
        spending_goal: spendingGoal,
        fundraising_goal: fundraisingGoal,
        fundraising_raised: fundraisingRaised,
        notes: semesterNotes.trim(),
      });
      setData(updated);
      setSuccess(`Saved ${getSemesterLabel(goalSemester)} spending & fundraising goals.`);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save semester goals.'));
    } finally {
      setSavingSemester(false);
    }
  };

  const handleGoalSemesterChange = (nextSem) => {
    setGoalSemester(nextSem);
    if (data) syncSemesterFields(data, nextSem);
  };

  const activeSemRow = (data?.semesters || []).find((s) => s.semester_key === goalSemester);
  const chartRows = (data?.semesters || []).map((s) => ({
    name: s.label,
    'Spending Goal': Number(s.spending_goal || 0),
    'Approved Spend': Number(s.actual_approved_spend || 0),
    'Fundraising Goal': Number(s.fundraising_goal || 0),
    'Fundraising Raised': Number(s.fundraising_raised || 0),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && <div className="sac-banner sac-banner-error">{error}</div>}
      {success && <div className="sac-banner sac-banner-success">{success}</div>}

      {loading && !data ? (
        <div className="sac-panel">
          <p className="sac-muted">Loading Global Budget...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Summary */}
          <div className="sac-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="sac-kpi-card">
              <div className="sac-eyebrow">Current Club Balance</div>
              <div className="sac-stat-number">
                {formatDollar(data?.treasury?.current_balance)}
              </div>
              <div className="sac-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Cash currently held by SAC
              </div>
            </div>

            <div className="sac-kpi-card" style={{ borderTopColor: 'var(--sac-status-green)' }}>
              <div className="sac-eyebrow">Projected Balance After Club Spend</div>
              <div
                className="sac-stat-number"
                style={{
                  color:
                    Number(data?.projected_balance_after_club_spend || 0) >= 0
                      ? 'var(--sac-status-green)'
                      : 'var(--sac-status-red)',
                }}
              >
                {formatDollar(data?.projected_balance_after_club_spend)}
              </div>
              <div className="sac-muted sac-mono" style={{ fontSize: 12, marginTop: 4 }}>
                Club Funds Approved: {formatDollar(data?.total_club_funds_approved)}
              </div>
            </div>

            <div className="sac-kpi-card">
              <div className="sac-eyebrow">{getSemesterLabel(goalSemester)} Spending</div>
              <div className="sac-stat-number">
                {formatDollar(activeSemRow?.actual_approved_spend || 0)}
              </div>
              <div className="sac-muted sac-mono" style={{ fontSize: 12, marginTop: 4 }}>
                Goal: {formatDollar(activeSemRow?.spending_goal || 0)} ·{' '}
                {activeSemRow?.spending_pct || 0}% used
              </div>
            </div>

            <div className="sac-kpi-card" style={{ borderTopColor: 'var(--sac-green-500)' }}>
              <div className="sac-eyebrow">{getSemesterLabel(goalSemester)} Fundraising</div>
              <div className="sac-stat-number" style={{ color: 'var(--sac-status-green)' }}>
                {formatDollar(activeSemRow?.fundraising_raised || 0)}
              </div>
              <div className="sac-muted sac-mono" style={{ fontSize: 12, marginTop: 4 }}>
                Goal: {formatDollar(activeSemRow?.fundraising_goal || 0)} ·{' '}
                {activeSemRow?.fundraising_pct || 0}% raised
              </div>
            </div>
          </div>

          {/* Forms Grid: Club Treasury + Per-Semester Goals */}
          <div className="sac-split-view">
            <form className="sac-panel" onSubmit={handleSaveTreasury}>
              <div className="sac-eyebrow">Global Club Treasury</div>
              <h2 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Current Club Funds
              </h2>

              <div className="sac-field">
                <label htmlFor="gb-balance">Current Club Balance *</label>
                <input
                  id="gb-balance"
                  type="number"
                  step="0.01"
                  className="sac-mono"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  required
                />
              </div>

              <div className="sac-field">
                <label htmlFor="gb-treasury-notes">Treasury Notes</label>
                <textarea
                  id="gb-treasury-notes"
                  rows={2}
                  placeholder="Account source, carry-over balance notes..."
                  value={treasuryNotes}
                  onChange={(e) => setTreasuryNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="sac-btn sac-btn-primary" disabled={savingTreasury}>
                  {savingTreasury ? 'Saving...' : 'Save Club Balance'}
                </button>
              </div>
            </form>

            <form className="sac-panel" onSubmit={handleSaveSemesterGoals}>
              <div className="sac-eyebrow">Semester Targets</div>
              <h2 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
                Per-Semester Spending &amp; Fundraising Goals
              </h2>

              <div className="sac-form-grid">
                <div className="sac-field">
                  <label htmlFor="gb-sem-select">Semester *</label>
                  <select
                    id="gb-sem-select"
                    value={goalSemester}
                    onChange={(e) => handleGoalSemesterChange(e.target.value)}
                  >
                    {SEMESTER_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sac-field">
                  <label htmlFor="gb-spend-goal">Spending Goal *</label>
                  <input
                    id="gb-spend-goal"
                    type="number"
                    step="0.01"
                    min="0"
                    className="sac-mono"
                    value={spendingGoal}
                    onChange={(e) => setSpendingGoal(e.target.value)}
                    required
                  />
                </div>

                <div className="sac-field">
                  <label htmlFor="gb-raise-goal">Fundraising Goal *</label>
                  <input
                    id="gb-raise-goal"
                    type="number"
                    step="0.01"
                    min="0"
                    className="sac-mono"
                    value={fundraisingGoal}
                    onChange={(e) => setFundraisingGoal(e.target.value)}
                    required
                  />
                </div>

                <div className="sac-field">
                  <label htmlFor="gb-raised">Fundraising Raised So Far</label>
                  <input
                    id="gb-raised"
                    type="number"
                    step="0.01"
                    min="0"
                    className="sac-mono"
                    value={fundraisingRaised}
                    onChange={(e) => setFundraisingRaised(e.target.value)}
                  />
                </div>
              </div>

              <div className="sac-field">
                <label htmlFor="gb-sem-notes">Semester Budget Notes</label>
                <input
                  id="gb-sem-notes"
                  type="text"
                  placeholder="e.g. Sponsorship push + 2 major workshops"
                  value={semesterNotes}
                  onChange={(e) => setSemesterNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="sac-btn sac-btn-primary" disabled={savingSemester}>
                  {savingSemester ? 'Saving...' : `Save ${getSemesterLabel(goalSemester)} Goals`}
                </button>
              </div>
            </form>
          </div>

          {/* Per-Semester Breakdown Table & Chart */}
          <div className="sac-panel">
            <div className="sac-eyebrow">Semester Comparison</div>
            <h3 className="sac-heading-md" style={{ marginTop: 4, marginBottom: 14 }}>
              All Configured Semesters
            </h3>

            {(data?.semesters || []).length === 0 ? (
              <p className="sac-muted">
                No semester goals configured yet. Save goals above to track semester progress.
              </p>
            ) : (
              <>
                <div className="sac-table-wrap" style={{ marginBottom: 24 }}>
                  <table className="sac-data-table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th style={{ textAlign: 'right' }}>Spending Goal</th>
                        <th style={{ textAlign: 'right' }}>Approved Spend</th>
                        <th style={{ textAlign: 'right' }}>Remaining</th>
                        <th style={{ textAlign: 'right' }}>Fundraising Goal</th>
                        <th style={{ textAlign: 'right' }}>Raised</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.semesters.map((s) => (
                        <tr key={s.semester_key}>
                          <td style={{ fontWeight: 600 }}>{s.label}</td>
                          <td className="sac-mono" style={{ textAlign: 'right' }}>
                            {formatDollar(s.spending_goal)}
                          </td>
                          <td className="sac-mono" style={{ textAlign: 'right', color: 'var(--sac-orange-400)' }}>
                            {formatDollar(s.actual_approved_spend)}
                          </td>
                          <td
                            className="sac-mono"
                            style={{
                              textAlign: 'right',
                              color:
                                Number(s.spending_remaining) >= 0
                                  ? 'var(--sac-status-green)'
                                  : 'var(--sac-status-red)',
                            }}
                          >
                            {formatDollar(s.spending_remaining)}
                          </td>
                          <td className="sac-mono" style={{ textAlign: 'right' }}>
                            {formatDollar(s.fundraising_goal)}
                          </td>
                          <td className="sac-mono" style={{ textAlign: 'right', color: 'var(--sac-status-green)' }}>
                            {formatDollar(s.fundraising_raised)}
                          </td>
                          <td className="sac-muted">{s.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={chartRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
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
                      <Bar dataKey="Spending Goal" fill="#3fa9f5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Approved Spend" fill="#e8720c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Fundraising Goal" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Fundraising Raised" fill="#4cad7d" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
