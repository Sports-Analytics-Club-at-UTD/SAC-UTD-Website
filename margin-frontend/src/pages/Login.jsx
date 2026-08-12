import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [userProfile, setUserProfile] = useState(null); // null = not logged in

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetchUserProfile(token);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const response = await fetch(`${BASE_URL}/auth/whoami/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUserProfile(userData);
      } else {
        localStorage.removeItem('sac_auth_token');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Authenticating...' });

    try {
      const response = await fetch(`${BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('sac_auth_token', data.token);
        setStatus({ type: '', message: '' });
        fetchUserProfile(data.token);
      } else {
        setStatus({ type: 'error', message: data.error || 'Invalid credentials.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error connecting to the backend.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sac_auth_token');
    setUserProfile(null);
    setCredentials({ username: '', password: '' });
  };

  if (userProfile) {
    const isDirector = userProfile.is_director || userProfile.is_exec;
    
    return (
      <main className="portal-container">
        <div className="card" style={{ maxWidth: '800px', width: '100%' }}>
          <span className={`badge ${isDirector ? 'director' : ''}`}>
            {(userProfile.role || 'Member').replace('_', ' ')}
          </span>
          <h2>Welcome back, {userProfile.username || 'Member'}.</h2>
          <p>Your authenticated session is active. Select a workspace below.</p>
          
          <div className="dashboard-grid">
            <div className="dash-module">
              <h3>Projects Portal</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Access Kanban boards and active model pipelines.</p>
            </div>
            <div className="dash-module">
              <h3>Events & Calendar</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>View upcoming watch parties and club meetings.</p>
            </div>
            {isDirector && (
              <div className="dash-module" style={{ borderColor: 'var(--accent-dim)' }}>
                <h3 style={{ color: 'var(--accent)' }}>Director Tools</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Finance budget, media approvals, and exec requests.</p>
              </div>
            )}
          </div>
          
          <button onClick={handleLogout} className="nav-cta" style={{ marginTop: '30px' }}>Sign Out</button>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-container">
      <div className="card">
        <h2>Member Login</h2>
        <p>Sign in to access models, datasets, and club resources.</p>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input type="text" name="username" value={credentials.username} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" name="password" value={credentials.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Authenticate
          </button>
          
          {status.message && (
            <div className="error-text" style={{ color: status.type === 'error' ? 'var(--red)' : 'var(--text-dim)' }}>
              {status.message}
            </div>
          )}
        </form>
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-dim)' }}>
          Need an account? <Link to="/signup" style={{ color: 'var(--accent)' }}>Apply here</Link>
        </div>
      </div>
    </main>
  );
}