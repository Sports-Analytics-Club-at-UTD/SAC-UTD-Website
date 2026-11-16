import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Signup() {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', passwordConfirm: '',
    fullName: '', grade: '', major: '', interests: '', 
    favoriteSport: '', favoriteTeam: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.passwordConfirm) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setStatus({ type: 'loading', message: 'Submitting...' });

    try {
      const response = await fetch(`${BASE_URL}/api/auth/signup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.fullName,
          grade: formData.grade,
          major: formData.major,
          interests: formData.interests,
          favorite_sport: formData.favoriteSport,
          favorite_team: formData.favoriteTeam
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setStatus({ type: 'error', message: data.error || data.detail || 'Failed to create account.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error connecting to the backend.' });
    }
  };

  if (isSuccess) {
    return (
      <main className="portal-container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="card" style={{ textAlign: 'center', maxWidth: '420px' }}>
          <h2 style={{ color: 'var(--green)' }}>Application Received</h2>
          <p>Your account has been successfully created and is now pending Secretary approval.</p>
          <Link to="/" className="btn-primary" style={{ marginTop: '20px' }}>Return to Home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="portal-container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <div className="card" style={{ maxWidth: '500px' }}>
        <h2>Join the Club</h2>
        <p>Create your account to access datasets and active models. Note: All new accounts require Secretary approval.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <Input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Student Email</label>
            <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <Input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="passwordConfirm">Confirm Password</label>
              <Input type="password" id="passwordConfirm" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} required />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '24px 0' }} />

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <Input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="grade">Grade</label>
              <select id="grade" name="grade" value={formData.grade} onChange={handleChange} required>
                <option value="" disabled>Select year...</option>
                <option value="Freshman">Freshman</option>
                <option value="Sophomore">Sophomore</option>
                <option value="Junior">Junior</option>
                <option value="Senior">Senior</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="major">Major</label>
              <Input type="text" id="major" name="major" value={formData.major} onChange={handleChange} placeholder="e.g., Statistics, Finance..." required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="interests">Analytics Interests</label>
            <Input type="text" id="interests" name="interests" value={formData.interests} onChange={handleChange} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="favoriteSport">Favorite Sport</label>
              <Input type="text" id="favoriteSport" name="favoriteSport" value={formData.favoriteSport} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="favoriteTeam">Favorite Team</label>
              <Input type="text" id="favoriteTeam" name="favoriteTeam" value={formData.favoriteTeam} onChange={handleChange} required />
            </div>
          </div>

          <Button type="submit" disabled={status.type === 'loading'} style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
            Submit Application
          </Button>
          
          {status.message && (
            <div role="status" className="error-text" style={{ color: status.type === 'error' ? 'var(--red)' : 'var(--text-dim)' }}>
              {status.message}
            </div>
          )}
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-dim)' }}>
          Already applied? <Link to="/portal" style={{ color: 'var(--accent)' }}>Log in here</Link>
          
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