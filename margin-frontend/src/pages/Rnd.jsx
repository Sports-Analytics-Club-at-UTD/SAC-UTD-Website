import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';
import axios from 'axios';

export default function Rnd() {
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('ideas'); // 'ideas', 'industry', 'todos', 'workshop'
  
  // Data States
  const [ideas, setIdeas] = useState([]);
  const [connections, setConnections] = useState([]);
  const [todos, setTodos] = useState([]);
  const [workshopItems, setWorkshopItems] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });

  // Form Inputs
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [link, setLink] = useState('');
  
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('sac_auth_token');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/portal');
      return;
    }

    // Verify User Role & Load Data
    fetch(`${BASE_URL}/api/auth/whoami/`, {
      headers: { 'Authorization': `Token ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setUserProfile(data);
        // Lock out unauthorized users based on backend IsRndTeam permissions
        const isAuthorized = data.is_superuser || ['exec', 'director_rnd', 'officer_rnd'].includes(data.role);
        if (!isAuthorized) {
          navigate('/');
        }
      })
      .catch(() => navigate('/portal'));

    fetchAllData(token);
  }, [navigate]);

  const fetchAllData = async (token) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Token ${token}` };
      
      const [ideasRes, connRes, todosRes, workshopRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/rnd/ideas/`, { headers }),
        axios.get(`${BASE_URL}/api/rnd/connections/`, { headers }),
        axios.get(`${BASE_URL}/api/rnd/todos/`, { headers }),
        axios.get(`${BASE_URL}/api/rnd/workshop/`, { headers })
      ]);

      setIdeas(ideasRes.data.results || ideasRes.data);
      setConnections(connRes.data.results || connRes.data);
      setTodos(todosRes.data.results || todosRes.data);
      setWorkshopItems(workshopRes.data.results || workshopRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load R&D portal data.');
    } finally {
      setLoading(false);
    }
  };

  // --- Generic Creation Handler ---
  const handleCreate = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    let endpoint = '';
    let payload = {};

    if (activeTab === 'ideas') {
      endpoint = `${BASE_URL}/api/rnd/ideas/`;
      payload = { title: formTitle, description: formDesc };
    } else if (activeTab === 'industry') {
      endpoint = `${BASE_URL}/api/rnd/connections/`;
      payload = { org_name: orgName, contact_name: contactName, contact_email: contactEmail, notes: formDesc };
    } else if (activeTab === 'todos') {
      endpoint = `${BASE_URL}/api/rnd/todos/`;
      payload = { title: formTitle, notes: formDesc };
    } else if (activeTab === 'workshop') {
      endpoint = `${BASE_URL}/api/rnd/workshop/`;
      payload = { title: formTitle, link: link, notes: formDesc };
    }

    try {
      await axios.post(endpoint, payload, { headers: { 'Authorization': `Token ${token}` } });
      setStatus({ type: 'success', message: 'Item created successfully!' });
      
      // Reset form fields
      setFormTitle('');
      setFormDesc('');
      setOrgName('');
      setContactName('');
      setContactEmail('');
      setLink('');

      fetchAllData(token);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to create entry.' });
    }
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  // --- Generic Deletion Handler ---
  const handleDelete = async (endpointPath, id) => {
    const token = getToken();
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await axios.delete(`${BASE_URL}/api/rnd/${endpointPath}/${id}/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      fetchAllData(token);
    } catch (err) {
      alert('Failed to delete item.');
    }
  };

  return (
    <main className="portal-container" style={{ alignItems: 'flex-start', padding: '40px 24px' }}>
      <div className="card" style={{ maxWidth: '1100px', width: '100%', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '14px' }}>
            ← Return to Homepage
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <div className="section-tag">R&D TEAM COMMAND</div>
            <h2 style={{ marginTop: '0', marginBottom: '6px' }}>Research & Development Portal</h2>
            <p style={{ margin: 0, color: 'var(--text-dim)' }}>Manage ideas, industry relationships, to-do tracking, and internal officer resources.</p>
          </div>
        </div>

        {status.message && (
          <div className="badge" style={{ backgroundColor: status.type === 'error' ? 'rgba(229,72,77,0.15)' : 'rgba(21,71,52,0.15)', color: status.type === 'error' ? 'var(--red)' : 'var(--green)', marginBottom: '20px', width: '100%' }}>
            {status.message}
          </div>
        )}

        {error && <div className="badge" style={{ backgroundColor: 'rgba(229,72,77,0.15)', color: 'var(--red)', marginBottom: '20px' }}>{error}</div>}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--line)', paddingBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('ideas')} className={activeTab === 'ideas' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Ideas & Pitches ({ideas.length})
          </button>
          <button onClick={() => setActiveTab('industry')} className={activeTab === 'industry' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Industry Connections ({connections.length})
          </button>
          <button onClick={() => setActiveTab('todos')} className={activeTab === 'todos' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Director To-Do ({todos.length})
          </button>
          <button onClick={() => setActiveTab('workshop')} className={activeTab === 'workshop' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Officer Workshop ({workshopItems.length})
          </button>
        </div>

        {loading ? <p>Loading R&D data...</p> : (
          <div>
            {/* --- TAB 1: IDEAS & PITCHES --- */}
            {activeTab === 'ideas' && (
              <div>
                <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '20px', marginBottom: '30px' }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', marginBottom: '14px' }}>Track New R&D Idea</h4>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Idea Title..." value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <textarea placeholder="Description & goals..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows="2" style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start', fontSize: '13px' }}>Submit Idea</button>
                  </form>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ideas.map(item => (
                    <div key={item.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{item.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-dim)' }}>{item.description}</p>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'var(--panel-2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)' }}>Status: {item.status}</span>
                      </div>
                      <button onClick={() => handleDelete('ideas', item.id)} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB 2: INDUSTRY CONNECTIONS --- */}
            {activeTab === 'industry' && (
              <div>
                <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '20px', marginBottom: '30px' }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', marginBottom: '14px' }}>Add Industry Connection</h4>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Organization / Company Name..." value={orgName} onChange={e => setOrgName(e.target.value)} required style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <input type="text" placeholder="Contact Name..." value={contactName} onChange={e => setContactName(e.target.value)} style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                      <input type="email" placeholder="Contact Email..." value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    </div>
                    <textarea placeholder="Relationship notes..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows="2" style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start', fontSize: '13px' }}>Save Contact</button>
                  </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {connections.map(item => (
                    <div key={item.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{item.org_name}</h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>Contact: {item.contact_name || 'N/A'} ({item.contact_email || 'No email'})</p>
                        <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-dim)' }}>{item.notes}</p>
                      </div>
                      <button onClick={() => handleDelete('connections', item.id)} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB 3: R&D DIRECTOR TO-DO --- */}
            {activeTab === 'todos' && (
              <div>
                <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '20px', marginBottom: '30px' }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', marginBottom: '14px' }}>Add To-Do Item</h4>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Task title..." value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <textarea placeholder="Additional notes..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows="2" style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start', fontSize: '13px' }}>Add Task</button>
                  </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {todos.map(item => (
                    <div key={item.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{item.title}</h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-dim)' }}>{item.notes}</p>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'var(--panel-2)', padding: '2px 6px', borderRadius: '4px', color: 'var(--green)' }}>Status: {item.status}</span>
                      </div>
                      <button onClick={() => handleDelete('todos', item.id)} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* --- TAB 4: OFFICER WORKSHOP --- */}
            {activeTab === 'workshop' && (
              <div>
                <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '20px', marginBottom: '30px' }}>
                  <h4 style={{ marginTop: 0, fontSize: '16px', marginBottom: '14px' }}>Add Workshop Link / Resource</h4>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input type="text" placeholder="Resource Title..." value={formTitle} onChange={e => setFormTitle(e.target.value)} required style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <input type="url" placeholder="https://..." value={link} onChange={e => setLink(e.target.value)} style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <textarea placeholder="Notes or file references..." value={formDesc} onChange={e => setFormDesc(e.target.value)} rows="2" style={{ padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }} />
                    <button type="submit" className="btn-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start', fontSize: '13px' }}>Add Workshop Asset</button>
                  </form>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {workshopItems.map(item => (
                    <div key={item.id} style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                          {item.link ? <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>{item.title} ↗</a> : item.title}
                        </h4>
                        <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-dim)' }}>{item.notes}</p>
                      </div>
                      <button onClick={() => handleDelete('workshop', item.id)} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}