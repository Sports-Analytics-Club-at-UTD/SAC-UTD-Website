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
        const leagues = [
          { key: 'CFB', url: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard' },
          { key: 'NFL', url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' },
          { key: 'MLB', url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' },
          { key: 'EPL', url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard' }
        ];

        // Define the 7-day window (now until 7 days from now)
        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const promises = leagues.map(async (league) => {
          try {
            const res = await fetch(league.url);
            if (!res.ok) return [];
            const data = await res.json();
            if (!data.events) return [];

            // Filter events to only include live games or those within the next 7 days
            const upcomingEvents = data.events.filter(event => {
              const eventDate = new Date(event.date);
              const isLive = event.status?.type?.state === 'in';
              
              // Keep if currently live, or scheduled between now and 7 days out
              return isLive || (eventDate >= now && eventDate <= sevenDaysLater);
            });

            return upcomingEvents.map(event => {
              const competition = event.competitions?.[0];
              const statusText = event.status?.type?.shortDetail || 'UPCOMING';
              const isLive = event.status?.type?.state === 'in';
              
              const homeTeam = competition?.competitors?.find(team => team.homeAway === 'home');
              const awayTeam = competition?.competitors?.find(team => team.homeAway === 'away');
              
              let winner = null;
              if (homeTeam?.winner) winner = 'home';
              else if (awayTeam?.winner) winner = 'away';

              return {
                status: statusText.toUpperCase(),
                league: league.key,
                away: awayTeam?.team?.abbreviation || 'TBD',
                awayScore: parseInt(awayTeam?.score || 0, 10),
                home: homeTeam?.team?.abbreviation || 'TBD',
                homeScore: parseInt(homeTeam?.score || 0, 10),
                winner: winner,
                live: isLive
              };
            });
          } catch (err) {
            console.error(`Failed to fetch ${league.key}:`, err);
            return [];
          }
        });

        const results = await Promise.all(promises);
        const allGames = results.flat();
        
        if (allGames.length > 0) {
          setGames(allGames);
        }
      } catch (error) {
        console.error("Failed to fetch sports scores:", error);
      }
    };

    fetchScores();
    const intervalId = setInterval(fetchScores, 60000);
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

                {(userProfile.role === 'exec' || userProfile.role === 'director_rnd' || userProfile.role === 'officer_rnd' || userProfile.is_superuser) && (
                  <Link to="/Rnd" style={{ color: 'var(--accent)' }} onClick={() => setIsNavOpen(false)}>
                    R&D Portal
                  </Link>
                )}
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

      {/* ================= COMMUNITY & SOCIALS ================= */}
      <section id="community" style={{ padding: '60px 0', borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
        <div className="wrap" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          
          <div className="section-head" style={{ marginBottom: '30px' }}>
            <div>
              <div className="section-tag">04 / COMMUNITY FEED</div>
              <h2>Stay connected</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* --- LIVE DISCORD WIDGET CARD --- */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#5865F2', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>DISCORD</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Community Server</span>
                  </div>
                  <a href="https://discord.gg/yrEzMR9rn" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                    Invite Link ↗
                  </a>
                </div>

                {/* Official Discord Widget iFrame (Replace YOUR_SERVER_ID with your actual Discord Server ID) */}
                <div style={{ width: '100%', height: '280px', borderRadius: '6px', overflow: 'hidden', background: 'var(--panel-2)', border: '1px solid var(--line)' }}>
                  <iframe 
                    src="https://discord.com/widget?id=YOUR_SERVER_ID&theme=dark" 
                    width="100%" 
                    height="100%" 
                    allowTransparency="true" 
                    frameBorder="0" 
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                    title="Discord Community Widget"
                  ></iframe>
                </div>
              </div>

              <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center' }}>
                Active discussions, model development channels, and match day threads.
              </div>
            </div>

            {/* --- INSTAGRAM FEED CARD --- */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>INSTAGRAM</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>@sacutd</span>
                  </div>
                  <a href="https://www.instagram.com/sacutd/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                    Follow ↗
                  </a>
                </div>
                
                {/* Visual Preview Box linked to latest post output */}
                <div style={{ height: '220px', background: 'var(--panel-2)', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
                  <img src="/SAC Submark Logo Light.png" alt="SAC Instagram Visual Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.75)', padding: '10px 14px', backdropFilter: 'blur(4px)' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      📊 Data deep-dive on win probabilities & sports analytics graphics.
                    </p>
                  </div>
                </div>

                <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                  Catch our latest commitment graphics, match-day previews, and visual media breakdowns on the official profile.
                </p>
              </div>

              <a 
                href="https://www.instagram.com/sacutd/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ marginTop: '20px', textAlign: 'center', justifyContent: 'center', background: 'linear-gradient(45deg, #f09433, #dc2743, #bc1888)', borderColor: 'transparent' }}
              >
                View Full Feed on Instagram →
              </a>
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