import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: ''});
  const [status, setStatus] = useState({ type: '', message: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: 'Authenticating...' });

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('sac_auth_token', data.token);
        setStatus({ type: '', message: '' });
        navigate('/');
      } else {
        // Change this line in your handleLogin catch/else block:
      setStatus({ type: 'error', message: data.non_field_errors?.[0] || data.detail || JSON.stringify(data) });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error connecting to the backend.' });
    }
  };

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
          
          <div style={{ marginTop: '16px' }}>
            <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>
              ← Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}