import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';
import axios from 'axios';

const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1EAmT49FEeOvyRzxkKU_PkYpwyfQ0rEBV';

// Supabase serves S3-uploaded files from its public-object path, not the S3 one.
const mediaUrl = (file) => {
  if (!file) return null;
  if (!file.startsWith('http')) {
    return `https://autkzjewmeifwfsrgrvi.supabase.co/storage/v1/object/public/marketing-media/${file}`;
  }
  return file.replace('/storage/v1/s3/', '/storage/v1/object/public/');
};

export default function Marketing() {
  const [userProfile, setUserProfile] = useState(null);
  const [pendingMedia, setPendingMedia] = useState([]);
  const [featuredMedia, setFeaturedMedia] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  // All uploads library: '' = every status
  const [uploads, setUploads] = useState([]);
  const [uploadsFilter, setUploadsFilter] = useState('');
  const [uploadsPage, setUploadsPage] = useState(1);
  const [uploadsHasMore, setUploadsHasMore] = useState(false);

  // Upload Form State
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      fetchUploads('', 1);
    }
  }, []);

  // Fetch all currently approved (featured) media for scroller management
  const fetchFeaturedMedia = useCallback(async () => {
    const token = localStorage.getItem('sac_auth_token');
    if (!token) {
      navigate('/portal');
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/media/uploads/approved/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch featured media.');
      const data = await res.json();
      setFeaturedMedia(data.results || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    // State is only set after the fetch resolves, not synchronously in the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFeaturedMedia();
  }, [fetchFeaturedMedia]);

  // Take an image off the scroller; it stays in All Uploads as rejected so it can be re-approved.
  const handleRemove = async (id) => {
    const token = localStorage.getItem('sac_auth_token');
    if (!token) return;

    if (!window.confirm("Are you sure you want to remove this image from the scroller?")) return;

    try {
      await axios.post(`${BASE_URL}/api/media/uploads/${id}/review/`,
        { status: 'rejected' },
        { headers: { 'Authorization': `Token ${token}` } }
      );

      // Remove from local state instantly
      setFeaturedMedia(prev => prev.filter(item => item.id !== id));
      fetchUploads(uploadsFilter, 1);
      setStatus({ type: 'success', message: 'Media successfully removed from scroller.' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch {
      setStatus({ type: 'error', message: 'Failed to remove media from scroller.' });
    }
  };

  async function fetchPendingMedia() {
    try {
      const token = localStorage.getItem('sac_auth_token');
      // shortcut: first page only (25 items); the rest are reachable under All Uploads > Pending.
      const response = await fetch(`${BASE_URL}/api/media/uploads/?status=pending`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setPendingMedia(data.results || data);
      }
    } catch (err) {
      console.error("Failed to fetch media queue", err);
    }
  }

  // Page 1 replaces the list (new filter / refresh); later pages append ("Load more").
  async function fetchUploads(filter, page) {
    const token = localStorage.getItem('sac_auth_token');
    if (!token) return;
    try {
      const params = new URLSearchParams({ page });
      if (filter) params.set('status', filter);
      const res = await fetch(`${BASE_URL}/api/media/uploads/?${params}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUploads(prev => (page === 1 ? data.results : [...prev, ...data.results]));
      setUploadsPage(page);
      setUploadsHasMore(Boolean(data.next));
    } catch {
      setStatus({ type: 'error', message: 'Failed to load uploads.' });
    }
  }

  const handleFilterChange = (filter) => {
    setUploadsFilter(filter);
    fetchUploads(filter, 1);
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
      fetchUploads(uploadsFilter, 1);
      setTimeout(() => setStatus({ type: '', message: '' }), 4000);
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.file?.[0] || 'Failed to upload media. Check permissions and try again.');
    } finally {
      setUploading(false);
    }
  };

  // --- Approval Queue Handlers ---
  const handleApprove = async (mediaId) => {
    try {
      const token = localStorage.getItem('sac_auth_token');
      await axios.post(`${BASE_URL}/api/media/uploads/${mediaId}/review/`, 
        { status: 'approved' }, 
        { headers: token ? { 'Authorization': `Token ${token}` } : {} }
      );
      
      setStatus({ type: 'success', message: 'Graphic approved! Added to homepage media scroller.' });
      fetchPendingMedia();
      fetchFeaturedMedia(); // Refresh active list
      fetchUploads(uploadsFilter, 1);
    } catch (e) {
      console.error("Failed to approve media", e);
      setStatus({ type: 'error', message: 'Failed to update approval status.' });
    }
    setTimeout(() => setStatus({ type: '', message: '' }), 3000);
  };

  const handleReject = async (mediaId) => {
    try {
      const token = localStorage.getItem('sac_auth_token');
      await axios.post(`${BASE_URL}/api/media/uploads/${mediaId}/review/`, 
        { status: 'rejected' },
        { headers: token ? { 'Authorization': `Token ${token}` } : {} }
      );

      setStatus({ type: 'error', message: 'Graphic rejected and removed from queue.' });
      fetchPendingMedia();
      fetchUploads(uploadsFilter, 1);
    } catch (e) {
      console.error("Failed to reject media", e);
      setStatus({ type: 'error', message: 'Failed to update approval status.' });
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
            href={DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ fontSize: '13px' }}
          >
            ↗ Open Marketing Drive
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

        {/* --- UPLOAD SECTION --- */}
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

        {/* --- ACTIVE FEATURED MEDIA MANAGEMENT (Marketing/Exec Only) --- */}
        {hasAccess && (
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Currently Featured in Scroller ({featuredMedia.length})</h3>
            {loading ? <p style={{ color: 'var(--text-dim)' }}>Loading featured assets...</p> : null}
            {error && <p style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</p>}
            
            {!loading && featuredMedia.length === 0 && (
              <p style={{ color: 'var(--text-dim)' }}>No photos are currently active in the homepage scroller.</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {featuredMedia.map((item) => {
                const imageUrl = mediaUrl(item.file);

                return (
                  <div key={item.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: '160px', background: '#000', overflow: 'hidden' }}>
                      <img src={imageUrl} alt={item.title || 'Scroller Asset'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', wordBreak: 'break-all' }}>{item.title || 'Untitled Asset'}</h4>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '16px' }}>
                          Uploaded: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        style={{
                          background: '#8b0000',
                          color: '#fff',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          width: '100%',
                          textAlign: 'center'
                        }}
                      >
                        Remove from Scroller
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '30px 0 0 0' }} />
          </div>
        )}

        {/* --- APPROVAL QUEUE SECTION --- */}
        {!hasAccess ? (
          userProfile && (
            <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel-2)', borderRadius: '4px', border: '1px solid var(--line)' }}>
              <h3 style={{ color: 'var(--red)', marginTop: 0 }}>Restricted Approval Access</h3>
              <p style={{ color: 'var(--text-dim)', marginBottom: 0 }}>You can submit files above, but you must be the Marketing Director or an Executive to approve items into the homepage scroller.</p>
            </div>
          )
        ) : (
          <>
            <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Pending Scroller Approvals ({pendingMedia.length})</h3>
            
            {pendingMedia.length === 0 ? (
              <p style={{ color: 'var(--text-dim)' }}>The media queue is currently empty.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {pendingMedia.map((media) => {
                  const imageUrl = mediaUrl(media.file);

                  return (
                    <div key={media.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '160px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '12px', backgroundImage: imageUrl ? `url(${imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {!imageUrl && '[ Image Preview ]'}
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
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* --- ALL UPLOADS (Director/Exec see everyone's; officers see their own) --- */}
        {userProfile && (
          <div style={{ marginTop: '40px' }}>
            <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 30px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--accent)', margin: 0 }}>{hasAccess ? 'All Uploads' : 'My Uploads'}</h3>
              <label style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                Status{' '}
                <select
                  value={uploadsFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  style={{ padding: '6px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '4px', color: 'var(--text)' }}
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved (on the wheel)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>

            {uploads.length === 0 ? (
              <p style={{ color: 'var(--text-dim)' }}>No uploads yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {uploads.map((item) => {
                  const imageUrl = mediaUrl(item.file);
                  return (
                    <div key={item.id} style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      <a href={imageUrl || undefined} target="_blank" rel="noopener noreferrer">
                        <div style={{ height: '140px', background: '#222', backgroundImage: imageUrl ? `url(${imageUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      </a>
                      <div style={{ padding: '12px' }}>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', wordBreak: 'break-all' }}>{item.title || 'Untitled Asset'}</h4>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px' }}>
                          {item.uploaded_by_username} • {item.created_at?.split('T')[0]} • {item.status}
                        </div>
                        {hasAccess && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {item.status !== 'approved' && (
                              <button onClick={() => handleApprove(item.id)} className="btn-primary" style={{ padding: '6px', fontSize: '12px', flex: 1, justifyContent: 'center' }}>
                                Approve
                              </button>
                            )}
                            {item.status === 'pending' && (
                              <button onClick={() => handleReject(item.id)} className="btn-ghost" style={{ padding: '6px', fontSize: '12px', flex: 1, justifyContent: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}>
                                Reject
                              </button>
                            )}
                            {item.status === 'approved' && (
                              <button onClick={() => handleRemove(item.id)} className="btn-ghost" style={{ padding: '6px', fontSize: '12px', flex: 1, justifyContent: 'center', borderColor: 'var(--red)', color: 'var(--red)' }}>
                                Remove from Scroller
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {uploadsHasMore && (
              <button onClick={() => fetchUploads(uploadsFilter, uploadsPage + 1)} className="btn-ghost" style={{ marginTop: '16px', fontSize: '13px' }}>
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}