import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Marketing() {
  const [userProfile, setUserProfile] = useState(null);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetch(`${BASE_URL}/auth/whoami/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data))
      .catch(err => console.error(err));
      
      fetchPendingMedia();
    }
  }, []);

  const fetchPendingMedia = async () => {
    const dummyMedia = [
      {
        id: 1,
        filename: 'MBB_Commitment_Graphic_V2.png',
        uploadedBy: 'Member Name',
        date: '2026-08-18',
        type: 'Graphic Design',
        previewColor: '#154734' 
      },
      {
        id: 2,
        filename: 'Homecoming_Tailgate_Flyer.jpg',
        uploadedBy: 'Officer Name',
        date: '2026-08-17',
        type: 'Event Promo',
        previewColor: '#332D37'
      }
    ];

    try {
      const response = await fetch(`${BASE_URL}/media/pending/`);
      if (response.ok) {
        const data = await response.json();
        setPendingMedia(data.results || data);
      } else {
        setPendingMedia(dummyMedia);
      }
    } catch (err) {
      setPendingMedia(dummyMedia);
    }
  };

  const handleApprove = async (mediaId) => {
    setStatus({ type: 'success', message: 'Graphic approved! Added to homepage media scroller.' });
    setPendingMedia(pendingMedia.filter(m => m.id !== mediaId));
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const handleReject = async (mediaId) => {
    setStatus({ type: 'error', message: 'Graphic rejected and removed from queue.' });
    setPendingMedia(pendingMedia.filter(m => m.id !== mediaId));
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const hasAccess = userProfile && (userProfile.role === 'director_marketing' || userProfile.role === 'exec');

  return (
    <main className="portal-container" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ maxWidth: '1000px', width: '100%', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '24px' }}>
          <Link to="/" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '14px' }}>
            ← Return to Homepage
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ marginTop: '0' }}>Marketing Portal</h2>
            <p style={{ margin: 0 }}>Approve graphics for the media scroller and manage club assets.</p>
          </div>
          <a 
            href="https://drive.google.com/drive/folders/13UeTL1NGKHBzyeIpbUNn2ggrPAM_2uGE/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            ↗ Open Master GDrive
          </a>
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

        {!hasAccess && userProfile ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel-2)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <h3 style={{ color: 'var(--red)', marginTop: 0 }}>Restricted Access</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 0 }}>You must be the Marketing Director or an Executive to approve club media.</p>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Pending Scroller Approvals ({pendingMedia.length})</h3>
            
            {pendingMedia.length === 0 ? (
              <p style={{ color: 'var(--text-dim)' }}>The media queue is currently empty.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {pendingMedia.map((media) => (
                  <div key={media.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                    
                    <div style={{ height: '160px', background: media.previewColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                      [ Image Preview ]
                    </div>
                    
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', wordBreak: 'break-all' }}>{media.filename}</h4>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                        Uploaded by {media.uploadedBy} • {media.date}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button 
                          onClick={() => handleApprove(media.id)} 
                          className="btn-primary" 
                          style={{ padding: '8px', fontSize: '12px', justifyContent: 'center' }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleReject(media.id)} 
                          className="btn-ghost" 
                          style={{ padding: '8px', fontSize: '12px', justifyContent: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}