import { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

export default function Secretary() {
  const [pendingMembers, setPendingMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Common roles based on standard club structures
  const ROLES = [
    { value: 'member', label: 'Member' },
    { value: 'exec', label: 'Executive' },
    { value: 'director', label: 'Director' },
    { value: 'director_secretary', label: 'Secretary' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('sac_auth_token');
    if (!token) return;

    try {
      // Fetch Pending Members
      const pendingRes = await fetch(`${BASE_URL}/auth/pending/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        // Check if Django paginated the response
        if (Array.isArray(pendingData)) {
          setPendingMembers(pendingData);
        } else if (pendingData && Array.isArray(pendingData.results)) {
          setPendingMembers(pendingData.results);
        } else {
          setPendingMembers([]); // Fallback to prevent crash
        }
      }

      // Fetch All Active Members
      const membersRes = await fetch(`${BASE_URL}/auth/members/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        // Check if Django paginated the response
        if (Array.isArray(membersData)) {
          setAllMembers(membersData);
        } else if (membersData && Array.isArray(membersData.results)) {
          setAllMembers(membersData.results);
        } else {
          setAllMembers([]); // Fallback to prevent crash
        }
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to fetch user data.' });
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    const token = localStorage.getItem('sac_auth_token');
    setStatus({ type: 'loading', message: 'Updating role...' });

    try {
      const response = await fetch(`${BASE_URL}/auth/members/${userId}/role/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole, is_approved: true }) 
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Role updated successfully.' });
        fetchUsers(); // Refresh the lists to move users between tables
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Failed to update role.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error updating role.' });
    }
  };

  return (
    <main className="portal-container" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        <h2>Secretary Dashboard</h2>
        <p>Manage club access and assign user roles.</p>

        {status.message && (
          <div className="badge" style={{ 
            backgroundColor: status.type === 'error' ? 'rgba(229,72,77,0.15)' : 'rgba(21,71,52,0.15)', 
            color: status.type === 'error' ? 'var(--red)' : 'var(--green)',
            marginBottom: '20px'
          }}>
            {status.message}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '24px 0' }} />

        {/* PENDING MEMBERS SECTION */}
        <h3 style={{ color: 'var(--accent)' }}>Pending Approvals ({pendingMembers.length})</h3>
        {pendingMembers.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No new users waiting for approval.</p>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '12px 8px' }}>Name</th>
                  <th style={{ padding: '12px 8px' }}>Email</th>
                  <th style={{ padding: '12px 8px' }}>Major</th>
                  <th style={{ padding: '12px 8px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingMembers.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 8px' }}>{user.name || user.username}</td>
                    <td style={{ padding: '12px 8px' }}>{user.email}</td>
                    <td style={{ padding: '12px 8px' }}>{user.major}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <button 
                        onClick={() => handleRoleUpdate(user.id, 'member')}
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Approve as Member
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVE MEMBERS SECTION */}
        <h3>Manage Active Roster ({allMembers.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '12px 8px' }}>Name</th>
                <th style={{ padding: '12px 8px' }}>Role</th>
                <th style={{ padding: '12px 8px' }}>Update Role</th>
              </tr>
            </thead>
            <tbody>
              {allMembers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 8px' }}>{user.name || user.username}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className="badge" style={{ marginBottom: 0 }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                      style={{ 
                        background: 'var(--panel-2)', 
                        color: 'var(--text)', 
                        border: '1px solid var(--line)', 
                        padding: '6px 10px', 
                        borderRadius: '3px' 
                      }}
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}