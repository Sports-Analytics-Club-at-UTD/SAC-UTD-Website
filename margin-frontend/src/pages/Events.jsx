import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetch(`${BASE_URL}/auth/whoami/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data))
      .catch(err => console.error(err));
      
      fetchEvents();
    }
  }, []);

const fetchEvents = async () => {
    const token = localStorage.getItem('sac_auth_token'); 
    
    const dummyEvents = [
      {
        id: 1,
        title: 'Basketball Tracking API Workshop',
        date: '2026-09-15',
        time: '18:00',
        location: 'Student Union',
        description: 'Learn how to pull and process live scheduling and spatial tracking data for basketball analytics pipelines.'
      }
    ];

    try {
      const response = await fetch(`${BASE_URL}/events/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const eventList = Array.isArray(data) ? data : (data.results || []);
        setEvents(eventList.length > 0 ? eventList : dummyEvents);
      } else {
        setEvents(dummyEvents);
      }
    } catch (err) {
      setEvents(dummyEvents);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('sac_auth_token');
    setStatus({ type: 'loading', message: 'Publishing event...' });

    try {
      const response = await fetch(`${BASE_URL}/events/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Event successfully added to the calendar.' });
        setFormData({ title: '', date: '', time: '', location: '', description: '' });
        setShowForm(false);
        fetchEvents();
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      } else {
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Failed to create event.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error connecting to backend.' });
    }
  };

  const handleRegister = async (eventId) => {
    alert(`Registration logic for event ${eventId} will trigger here.`);
  };

  const canManageEvents = userProfile && (userProfile.role === 'director_events' || userProfile.role === 'exec');

  return (
    <main className="portal-container" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '14px' }}>
            ← Return to Homepage
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h2 style={{ marginTop: '0' }}>Club Calendar</h2>
            <p style={{ margin: 0 }}>Upcoming watch parties, meetings, and workshops.</p>
          </div>
          {canManageEvents && (
            <button 
              className={showForm ? "btn-ghost" : "btn-primary"} 
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ New Event'}
            </button>
          )}
        </div>

        {status.message && (
          <div className="badge" style={{ 
            backgroundColor: status.type === 'error' ? 'rgba(229,72,77,0.15)' : 'rgba(21,71,52,0.15)', 
            color: status.type === 'error' ? 'var(--red)' : 'var(--green)',
            marginBottom: '20px',
            width: '100%'
          }}>
            {status.message}
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 30px 0' }} />

        {showForm && canManageEvents && (
          <div style={{ background: 'var(--panel-2)', padding: '24px', borderRadius: '4px', border: '1px solid var(--line)', marginBottom: '30px' }}>
            <h3 style={{ color: 'var(--accent)', marginTop: 0 }}>Publish New Event</h3>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label htmlFor="title">Event Name</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} required />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="date">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="time">Time</label>
                  <input type="time" name="time" value={formData.time} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g., JSOM 1.118 or Zoom Link" required />
              </div>

              <div className="form-group">
                <label htmlFor="description">Details</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  rows="3" 
                  style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--line)', padding: '10px', borderRadius: '3px', fontFamily: 'var(--font-body)', resize: 'vertical' }}
                  required 
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Publish</button>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {events.length === 0 ? (
            <p style={{ color: 'var(--text-dim)' }}>No upcoming events scheduled at this time.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-2)', padding: '20px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '20px' }}>{event.title}</h3>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)', marginBottom: '8px' }}>
                    {event.date} • {event.time} • {event.location}
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-dim)', maxWidth: '500px' }}>
                    {event.description}
                  </p>
                </div>
                <div>
                  <button onClick={() => handleRegister(event.id)} className="btn-primary">
                    Register
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}