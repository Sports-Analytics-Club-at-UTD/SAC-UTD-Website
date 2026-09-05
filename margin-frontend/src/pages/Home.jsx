import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';

export default function Home() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [approvedMedia, setApprovedMedia] = useState([]);
  const navigate = useNavigate();
  const [games, setGames] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('sac_auth_token');
    if (token) {
      fetch(`${BASE_URL}/api/auth/whoami/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => {
        if (!res.ok) {
          // If token is invalid/expired, clear it so it stops spamming
          localStorage.removeItem('sac_auth_token');
          throw new Error('Invalid token');
        }
        return res.json();
      })
      .then(data => {
        if (data.id) setUserProfile(data);
      })
      .catch(err => console.log("Session cleared or invalid token."));
    }

    // Fetch approved media for the homepage scroller
    fetch(`${BASE_URL}/api/media/uploads/approved/`)
      .then(res => res.json())
      .then(data => {
        setApprovedMedia(data.results || data);
      })
      .catch(err => console.error("Failed to load scroller media", err));
  }, []);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        // Must use HTTPS to prevent mixed-content blocking on Vercel
        const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard');
        const data = await response.json();
        
        const tickerGames = data.events.map(event => {
          const competition = event.competitions[0];
          
          // ESPN returns strings like "FINAL" or "3rd - 8:41"
          const statusText = event.status.type.shortDetail; 
          const isLive = event.status.type.state === 'in';
          
          const homeTeam = competition.competitors.find(team => team.homeAway === 'home');
          const awayTeam = competition.competitors.find(team => team.homeAway === 'away');
          
          // Safely determine the winner for your CSS classes
          let winner = null;
          if (homeTeam.winner) winner = 'home';
          else if (awayTeam.winner) winner = 'away';

          return {
            status: statusText.toUpperCase(),
            league: 'CFB',
            away: awayTeam.team.abbreviation,
            awayScore: parseInt(awayTeam.score, 10),
            home: homeTeam.team.abbreviation,
            homeScore: parseInt(homeTeam.score, 10),
            winner: winner,
            live: isLive
          };
        });
        
        setGames(tickerGames);
      } catch (error) {
        console.error("Failed to fetch CFB scores:", error);
      }
    };

    // Fetch immediately when the homepage loads
    fetchScores();
    
    // Poll the ESPN endpoint every 60 seconds
    const intervalId = setInterval(fetchScores, 60000);
    
    // Cleanup the interval if the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('sac_auth_token');
    setUserProfile(null);
    navigate('/');
  };


  const renderTickerItems = () => {
    return games.map((g, index) => (
      <div className="ticker-item" key={index}>
        <span className={`ticker-status ${g.live ? 'live' : 'final'}`}>{g.status}</span>
        <span style={{ color: 'var(--text-dim)' }}>{g.league}</span>
        <span className={`team ${g.winner === 'away' ? 'win' : ''}`}>{g.away}</span>
        <span className={`score ${g.winner === 'away' ? 'win' : ''}`}>{g.awayScore}</span>
        <span style={{ color: 'var(--text-dim)' }}>–</span>
        <span className={`score ${g.winner === 'home' ? 'win' : ''}`}>{g.homeScore}</span>
        <span className={`team ${g.winner === 'home' ? 'win' : ''}`}>{g.home}</span>
      </div>
    ));
  };

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="wrap">
          <a href="#top" className="brand">
            <img src="/SAC Submark Logo Light.png" alt="SAC Submark" style={{ width: '36px', height: '36px' }} />
            <span>SAC UTD<small>SPORTS ANALYTICS CLUB</small></span>
          </a>

          <nav className={`nav-links ${isNavOpen ? 'open' : ''}`} id="navLinks">
            <a href="#reports" onClick={() => setIsNavOpen(false)}>Reports</a>
            <a href="#scroller" onClick={() => setIsNavOpen(false)}>Media</a>
            <a href="#numbers" onClick={() => setIsNavOpen(false)}>By The Numbers</a>
            
            {userProfile ? (
              <>
                <Link to="/events" onClick={() => setIsNavOpen(false)}>Events</Link>
                <Link to="/projects" onClick={() => setIsNavOpen(false)}>Projects</Link>
                
                {(userProfile.role === 'director_marketing' || userProfile.role === 'exec') && (
                  <Link to="/marketing" style={{ color: 'var(--accent)' }} onClick={() => setIsNavOpen(false)}>Marketing</Link>
                )}
                {(userProfile.role === 'director_secretary' || userProfile.role === 'exec') && (
                  <Link to="/secretary" style={{ color: 'var(--accent)' }} onClick={() => setIsNavOpen(false)}>Secretary</Link>
                )}

                <button onClick={handleLogout} className="nav-cta" style={{ display: 'inline-flex' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/portal" onClick={() => setIsNavOpen(false)}>Login</Link>
                <Link to="/signup" className="nav-cta" style={{ display: 'inline-flex' }}>Join The Club</Link>
              </>
            )}
          </nav>

          {!userProfile && (
            <Link to="/signup" className="nav-cta nav-cta-mobile">Join The Club</Link>
          )}
          
          <button 
            className="nav-toggle" 
            onClick={() => setIsNavOpen(!isNavOpen)} 
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ================= SCORE TICKER ================= */}
      <div className="ticker" id="top">
        <div className="ticker-track">
          {renderTickerItems()}
          {renderTickerItems()}
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="hero" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '80px' }}>
        <div className="wrap">
          <div>
            <div className="eyebrow">Est. 2024 · Campus Analytics Collective</div>
            <h1>We read the box score<br />before it's <em>final.</em></h1>
            <p className="lede">SAC UTD is the campus club where students build models, argue about win probability, and publish the numbers that explain why teams actually win — or don't.</p>
            <div className="hero-actions">
              <a href="#reports" className="btn-primary">Read latest report →</a>
            </div>
          </div>

          <div className="stat-panel">
            <div className="stat-panel-head">
              <span><span className="dot">●</span> LIVE MODEL OUTPUT</span>
              <span>WK 2</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Win probability model, accuracy</span>
              <span className="stat-value up mono">71.4%</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active predictive models</span>
              <span className="stat-value mono">12</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Reports published this season</span>
              <span className="stat-value mono">38</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Club members</span>
              <span className="stat-value mono">64</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= REPORTS ================= */}
      <section id="reports">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-tag">01 / LATEST WORK</div>
              <h2>Recent reports</h2>
            </div>
            <a href="#" className="section-link">View all reports →</a>
          </div>

          <div className="card-grid">
            <div className="card">
              <span className="card-tag">Basketball · Model</span>
              <h3>Placeholder headline — swap in your first published report title</h3>
              <p>Short summary goes here. Describe the question the analysis answers and the headline finding in one or two sentences.</p>
              <div className="card-meta"><span>By Member Name</span><span>MMM DD</span></div>
            </div>
            <div className="card">
              <span className="card-tag">Football · Deep Dive</span>
              <h3>Placeholder headline — swap in your second report title</h3>
              <p>Short summary goes here. Describe the question the analysis answers and the headline finding in one or two sentences.</p>
              <div className="card-meta"><span>By Member Name</span><span>MMM DD</span></div>
            </div>
            <div className="card">
              <span className="card-tag">Baseball · Notebook</span>
              <h3>Placeholder headline — swap in your third report title</h3>
              <p>Short summary goes here. Describe the question the analysis answers and the headline finding in one or two sentences.</p>
              <div className="card-meta"><span>By Member Name</span><span>MMM DD</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CLUB HIGHLIGHTS ================= */}
      {approvedMedia.length > 0 && (
        <section style={{ 
          background: 'var(--bg)', 
          borderTop: '1px solid var(--line)', 
          borderBottom: '1px solid var(--line)', 
          padding: '40px 0',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            padding: '0 24px',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none', // Hides scrollbar on Firefox
            msOverflowStyle: 'none',  // Hides scrollbar on IE/Edge
          }}>
            <style>{`
              /* Hides scrollbar for Chrome, Safari and Opera */
              section div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {approvedMedia.map((item) => {
              // Construct clean public URL without nested bucket folder duplication
              // Replace this block in your .map((item) => { ... }) loop:
              let imageUrl = item.file;
              if (imageUrl) {
                if (!imageUrl.startsWith('http')) {
                  // Relative path from django-storages
                  imageUrl = `https://autkzjewmeifwfsrgrvi.supabase.co/storage/v1/object/public/marketing-media/${imageUrl}`;
                } else {
                  // If django-storages returned an absolute URL using the /s3/ endpoint, swap it to public
                  imageUrl = imageUrl.replace('/storage/v1/s3/', '/storage/v1/object/public/');
                }
              }

              return (
                <div key={item.id} style={{ 
                  minWidth: '320px', 
                  maxWidth: '320px', 
                  height: '200px',
                  flex: '0 0 auto', 
                  background: 'var(--panel)', 
                  border: '1px solid var(--line)', 
                  borderRadius: '6px', 
                  overflow: 'hidden', 
                  scrollSnapAlign: 'start',
                  position: 'relative'
                }}>
                  <img 
                    src={imageUrl} 
                    alt="Club Highlight" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      display: 'block' 
                    }}
                    onError={(e) => {
                      e.target.parentElement.style.display = 'none'; // Gracefully hides if an asset fails to load
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= BY THE NUMBERS ================= */}
      <section id="numbers">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-tag">03 / THE CLUB IN STATS</div>
              <h2>By the numbers</h2>
            </div>
          </div>

          <div className="numbers-strip mono">
            <div>
              <div className="big">64</div>
              <div className="label">Active members</div>
            </div>
            <div>
              <div className="big">12</div>
              <div className="label">Models in production</div>
            </div>
            <div>
              <div className="big">6</div>
              <div className="label">Varsity sports covered</div>
            </div>
            <div>
              <div className="big">3</div>
              <div className="label">Conference partnerships</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <div className="brand">
            <img src="/SAC Banner Light.png" alt="SAC UTD Banner" style={{ height: '28px' }} />
          </div>
          <div className="foot-links">
            <a href="#reports">Reports</a>
            <a href="#scroller">Media</a>
            <a href="#numbers">By The Numbers</a>
          </div>
          <div className="foot-meta">© 2026 SAC UTD</div>
        </div>
      </footer>
    </>
  );
}