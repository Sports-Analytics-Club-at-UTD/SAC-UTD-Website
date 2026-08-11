import { useState } from 'react';
import { Link } from 'react-router-dom';

// ---- Score ticker: sample data ----
// Replace this array with a live feed later.
const games = [
  { status: 'FINAL', league: 'NFL', away: 'DAL', awayScore: 27, home: 'PHI', homeScore: 24, winner: 'away' },
  { status: 'LIVE · Q3 08:41', league: 'FB', away: 'OU', awayScore: 21, home: 'TEX', homeScore: 17, winner: 'away', live: true },
  { status: 'FINAL', league: 'NBA', away: 'DAL', awayScore: 112, home: 'OKC', homeScore: 108, winner: 'away' },
  { status: 'FINAL', league: 'FB', away: 'SMU', awayScore: 34, home: 'TCU', homeScore: 27, winner: 'away' },
  { status: 'LIVE · 63\'', league: 'MLS', away: 'FCD', awayScore: 2, home: 'AUS', homeScore: 1, winner: 'away', live: true },
  { status: 'FINAL', league: 'D3 MBB', away: 'UTD', awayScore: 74, home: 'UTT', homeScore: 69, winner: 'away' },
  { status: 'FINAL/OT', league: 'MLB', away: 'TEX', awayScore: 6, home: 'HOU', homeScore: 5, winner: 'away' },
  { status: 'FINAL', league: 'FB', away: 'OSU', awayScore: 30, home: 'BAY', homeScore: 20, winner: 'away' },
  { status: 'LIVE · 2P 11:02', league: 'NHL', away: 'DAL', awayScore: 3, home: 'NSH', homeScore: 2, winner: 'away', live: true },
  { status: 'FINAL', league: 'FB', away: 'TTU', awayScore: 28, home: 'KU', homeScore: 24, winner: 'away' },
];

export default function Home() {
  // Mobile nav toggle state
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Helper to render the ticker segment
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
            <span className="brand-mark"></span>
            <span>MARGIN<small>SPORTS ANALYTICS CLUB</small></span>
          </a>

          <nav className={`nav-links ${isNavOpen ? 'open' : ''}`} id="navLinks">
            <a href="#reports" onClick={() => setIsNavOpen(false)}>Reports</a>
            <a href="#numbers" onClick={() => setIsNavOpen(false)}>By The Numbers</a>
            <a href="#projects" onClick={() => setIsNavOpen(false)}>Projects</a>
            <a href="#about" onClick={() => setIsNavOpen(false)}>About</a>
            
            <Link to="/portal" onClick={() => setIsNavOpen(false)}>Login</Link>
            
            <Link to="/signup" className="nav-cta" style={{ display: 'inline-flex' }}>Join The Club</Link>
          </nav>

          <Link to="/signup" className="nav-cta">Join The Club</Link>
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
          {/* duplicate the list once so the -50% translateX loop is seamless */}
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
            <p className="lede">MARGIN is the campus club where students build models, argue about win probability, and publish the numbers that explain why teams actually win — or don't.</p>
            <div className="hero-actions">
              <a href="#reports" className="btn-primary">Read latest report →</a>
              <a href="#about" className="btn-ghost">How we work</a>
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

      {/* ================= BY THE NUMBERS ================= */}
      <section id="numbers">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-tag">02 / THE CLUB IN STATS</div>
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

      {/* ================= TEMPLATE SCAFFOLD ================= */}
      <section id="projects">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-tag">03 / OPEN SPACE</div>
              <h2>Projects</h2>
            </div>
          </div>
          <div className="scaffold">
            <strong>This section is a placeholder</strong>
            Add a projects grid, an interactive leaderboard, embedded charts, or a signup form here.
            The card, stat-panel, and numbers-strip components above can be reused as building blocks.
          </div>
        </div>
      </section>

      <section id="about" style={{ borderBottom: 'none' }}>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="section-tag">04 / ABOUT</div>
              <h2>About the club</h2>
            </div>
          </div>
          <div className="scaffold">
            <strong>This section is a placeholder</strong>
            Add your club's mission, meeting times, officer bios, and how students can get involved.
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <div className="brand" style={{ fontSize: '22px' }}>
            <span className="brand-mark" style={{ width: '9px', height: '9px' }}></span>
            <span>MARGIN</span>
          </div>
          <div className="foot-links">
            <a href="#reports">Reports</a>
            <a href="#numbers">By The Numbers</a>
            <a href="#projects">Projects</a>
            <a href="#about">About</a>
          </div>
          <div className="foot-meta">© 2026 MARGIN SPORTS ANALYTICS CLUB</div>
        </div>
      </footer>
    </>
  );
}