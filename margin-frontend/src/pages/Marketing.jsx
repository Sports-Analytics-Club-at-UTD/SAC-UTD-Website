import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BASE_URL } from '../config';
import axios from 'axios';

export default function Marketing() {
  const [userProfile, setUserProfile] = useState(null);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  // Upload Form State
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetch(`${BASE_URL}/api/auth/whoami/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => setUserProfile(data))
      .catch(err => console.error(err));
      
      fetchPendingMedia();
    }
  }, []);

  const fetchPendingMedia = async () => {
    try {
      const token = localStorage.getItem('sac_auth_token');
      const response = await fetch(`${BASE_URL}/api/media/uploads/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        const items = data.results || data;
        
        // KEEP ONLY ITEMS WHERE STATUS IS PENDING (case-insensitive check)
        const pending = items.filter(item => 
          item.status && item.status.toLowerCase().includes('pending')
        );
        
        setPendingMedia(pending);
      }
    } catch (err) {
      console.error("Failed to fetch media queue", err);
    }
  };

  // --- File Selection Handlers ---
  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setUploadError('');
    } else {
      setUploadError('Please select a valid file.');
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setUploadError('Please attach an image or media file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);

    setUploading(true);
    try {
      const token = localStorage.getItem('sac_auth_token');
      await axios.post(`${BASE_URL}/api/media/uploads/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Token ${token}` } : {})
        },
        withCredentials: true,
      });

      setTitle('');
      setFile(null);
      setPreview(null);
      setStatus({ type: 'success', message: 'Media successfully submitted for review!' });
      fetchPendingMedia();
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } catch (err) {
      console.error(err);
      setUploadError('Failed to upload media. Check permissions and try again.');
    } finally {
      setUploading(false);
    }
  };

  // --- Approval Wheel Handlers ---
  const handleApprove = async (mediaId) => {
    try {
      const token = localStorage.getItem('sac_auth_token');
      await axios.post(`${BASE_URL}/api/media/uploads/${mediaId}/review/`, 
        { status: 'approved' }, // Send lowercase 'approved' to match database choices
        { headers: token ? { 'Authorization': `Token ${token}` } : {} }
      );
      
      setStatus({ type: 'success', message: 'Graphic approved! Added to homepage media scroller.' });
      fetchPendingMedia();
    } catch (e) {
      console.error("Failed to approve media", e);
      setStatus({ type: 'error', message: 'Failed to update approval status.' });
    }
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const handleReject = async (mediaId) => {
    try {
      const token = localStorage.getItem('sac_auth_token');
      // Call the dedicated @action review endpoint
      await axios.post(`${BASE_URL}/api/media/uploads/${mediaId}/review/`, 
        { status: 'Rejected' }, 
        { headers: token ? { 'Authorization': `Token ${token}` } : {} }
      );
      
      setStatus({ type: 'error', message: 'Graphic rejected and removed from queue.' });
      fetchPendingMedia();
    } catch (e) {
      console.error("Failed to reject media", e);
    }
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
            <p style={{ margin: 0 }}>Submit club media, approve assets for the scroller, and manage workflows.</p>
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

        {/* --- UPLOAD SECTION (Available to authenticated officers/members) --- */}
        <div style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '6px', padding: '24px', marginBottom: '40px' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text)', fontSize: '18px', marginBottom: '16px' }}>Submit New Media</h3>
          
          {uploadError && <div style={{ color: 'var(--red)', fontSize: '13px', marginBottom: '12px' }}>{uploadError}</div>}

          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--text-dim)' }}>Title / Description</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Fall Showcase Banner"
                style={{ width: '100%', padding: '10px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }}
              />
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: '6px',
                padding: '30px',
                textAlign: 'center',
                background: isDragging ? 'rgba(var(--accent-rgb), 0.05)' : 'var(--panel)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="file"
                accept="image/*,video/*"
                id="fileUploadInput"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              {preview ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <img src={preview} alt="Upload Preview" style={{ maxHeight: '120px', borderRadius: '4px', objectFit: 'cover' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{file?.name}</span>
                  <label htmlFor="fileUploadInput" style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Choose a different file
                  </label>
                </div>
              ) : (
                <label htmlFor="fileUploadInput" style={{ cursor: 'pointer', display: 'block' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '500' }}>
                    <span style={{ color: 'var(--accent)' }}>Click to browse</span> or drag and drop your media here
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)' }}>Supports PNG, JPG, MP4 assets</p>
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="btn-primary"
              style={{ padding: '10px 16px', justifyContent: 'center', opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? 'Uploading to Supabase Bucket...' : 'Upload & Submit for Review'}
            </button>
          </form>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 30px 0' }} />

        {/* --- APPROVAL QUEUE SECTION --- */}
        {!hasAccess && userProfile ? (
          <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel-2)', borderRadius: '4px', border: '1px solid var(--line)' }}>
            <h3 style={{ color: 'var(--red)', marginTop: 0 }}>Restricted Approval Access</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: 0 }}>You can submit files above, but you must be the Marketing Director or an Executive to approve items into the homepage scroller.</p>
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
                    
                    <div style={{ height: '160px', background: media.previewColor || '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px', backgroundImage: media.file ? `url(${media.file})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {!media.file && '[ Image Preview ]'}
                    </div>
                    
                    <div style={{ padding: '16px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', wordBreak: 'break-all' }}>{media.filename || media.title || 'Untitled Asset'}</h4>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                        Uploaded by {media.uploadedBy || media.uploaded_by_username || 'Officer'} • {media.date || media.created_at?.split('T')[0] || 'Recent'}
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