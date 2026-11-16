import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';
import { ArrowUpRight, ArrowRight, Menu, Activity, Users, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
          if (res.status === 401 || res.status === 403) localStorage.removeItem('sac_auth_token');
          throw new Error('Invalid token');
        }
        return res.json();
      })
      .then(data => {
        if (data.id) setUserProfile(data);
      })
      .catch(() => {});
    }

    // Fetch approved media for the homepage scroller
    fetch(`${BASE_URL}/api/media/uploads/approved/`)
      .then(res => { if (!res.ok) throw new Error('Media unavailable'); return res.json(); })
      .then(data => {
        setApprovedMedia(Array.isArray(data.results || data) ? (data.results || data) : []);
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
                live: isLive,
                scheduled: event.status?.type?.state === 'pre'
              };
            });
          } catch (err) {
            console.error(`Failed to fetch ${league.key}:`, err);
            return [];
          }
        });

        const results = await Promise.all(promises);
        const allGames = results.flat();
        
        setGames(allGames);
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


  const portalLinks = userProfile ? [
    ['/events', 'Events'], ['/projects', 'Projects'],
    ...(['exec', 'director_rnd', 'officer_rnd'].includes(userProfile.role) || userProfile.is_superuser ? [['/rnd', 'R&D portal']] : []),
    ...(['exec', 'director_marketing'].includes(userProfile.role) ? [['/marketing', 'Marketing']] : []),
    ...(['exec', 'director_secretary'].includes(userProfile.role) ? [['/secretary', 'Secretary']] : []),
  ] : [];

  const navigation = <>
    <a href="#work" onClick={() => setIsNavOpen(false)}>Our work</a>
    <a href="#community" onClick={() => setIsNavOpen(false)}>Community</a>
    {portalLinks.map(([to, label]) => <Link key={to} to={to} onClick={() => setIsNavOpen(false)}>{label}</Link>)}
    {userProfile ? <Button variant="outline" onClick={handleLogout}>Log out</Button> : <>
      <Button variant="ghost" asChild><Link to="/portal">Log in</Link></Button>
      <Button asChild><Link to="/signup">Join the club <ArrowUpRight /></Link></Button>
    </>}
  </>;

  return (
    <div className="club-site">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="club-header">
        <div className="club-wrap flex min-h-20 items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3" aria-label="SAC UTD home">
            <span className="flex size-10 items-center justify-center rounded-lg bg-neutral-900"><img src="/SAC Submark Logo Light.png" alt="" className="size-8 object-contain" /></span>
            <span className="text-sm font-semibold tracking-tight">Sports Analytics Club<span className="block text-xs font-normal text-muted-foreground">The University of Texas at Dallas</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm text-muted-foreground xl:flex">{navigation}</nav>
          <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
            <SheetTrigger asChild><Button variant="outline" size="icon" className="xl:hidden" aria-label="Open navigation"><Menu /></Button></SheetTrigger>
            <SheetContent className="club-site">
              <SheetHeader><SheetTitle>SAC UTD</SheetTitle><SheetDescription>Explore the club and your member resources.</SheetDescription></SheetHeader>
              <nav aria-label="Mobile navigation" className="flex flex-col gap-5 p-6 text-sm">{navigation}</nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main id="main-content">
        <section className="club-wrap grid gap-12 py-20 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:py-28">
          <div>
            <Badge variant="outline" className="mb-7 gap-2 font-normal"><span className="size-1.5 rounded-full bg-orange-700" />Student-led. Sports-obsessed.</Badge>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">A better question.<br /><span className="text-muted-foreground">A different game.</span></h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">We’re UT Dallas students using data to understand sports. Build a model, explore a new idea, and find people who care about the details as much as you do.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button size="lg" asChild><Link to={userProfile ? '/projects' : '/signup'}>{userProfile ? 'Open your projects' : 'Find your team'}<ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild><a href="#work">Explore our work</a></Button></div>
            <p className="mt-5 text-xs text-muted-foreground">All majors welcome. Curiosity is a good place to start.</p>
          </div>
          <Card className="overflow-hidden shadow-none">
            <div className="court-art" aria-hidden="true"><div className="court-center" /><div className="court-key court-key-left" /><div className="court-key court-key-right" /><span className="court-ball" /></div>
            <CardHeader><div className="flex items-center justify-between"><Badge variant="secondary">Featured project</Badge><span className="text-xs text-muted-foreground">Basketball</span></div><CardTitle className="mt-3 text-xl">March Madness Predictor</CardTitle><CardDescription className="leading-relaxed">From historical games to tournament probabilities. Explore the models, the assumptions, and the code behind our brackets.</CardDescription></CardHeader>
            <CardContent><Button variant="outline" asChild><a href="https://github.com/Sports-Analytics-Club-at-UTD/March-Madness-Predictor" target="_blank" rel="noreferrer">Explore the project<ArrowUpRight /></a></Button></CardContent>
          </Card>
        </section>
        <section id="work" className="border-y bg-muted/40 py-16 sm:py-20">
          <div className="club-wrap">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Built by students</p><h2 className="text-3xl font-semibold tracking-tight">More than a box score.</h2></div><Button variant="ghost" asChild><a href="https://github.com/Sports-Analytics-Club-at-UTD" target="_blank" rel="noreferrer">All projects<ArrowUpRight /></a></Button></div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['F1-Telemetry-Project', 'Motorsport', 'F1 telemetry', 'Explore the data behind the lap.'],
                ['Soccer-Impact-Engine-Index', 'Soccer', 'Player impact', 'Investigate how players contribute to a team.'],
                ['MLB-Pitch-Repertoire-Design-Movement-Classifier', 'Baseball', 'Pitch repertoire', 'Study pitch movement and repertoire design.'],
              ].map(([repo, sport, title, description]) => <Card key={repo} className="shadow-none"><CardHeader><span className="mb-5 text-xs text-muted-foreground">{sport}</span><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button variant="link" className="h-auto p-0" asChild><a href={'https://github.com/Sports-Analytics-Club-at-UTD/' + repo} target="_blank" rel="noreferrer">View repository<ArrowUpRight /></a></Button></CardContent></Card>)}
            </div>
          </div>
        </section>
        {approvedMedia.length > 0 && <section id="media" className="club-wrap py-16"><h2 className="mb-6 text-2xl font-semibold tracking-tight">Around the club</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{approvedMedia.filter(item => item.file).map(item => {
          const imageUrl = item.file.startsWith('http') ? item.file.replace('/storage/v1/s3/', '/storage/v1/object/public/') : 'https://autkzjewmeifwfsrgrvi.supabase.co/storage/v1/object/public/marketing-media/' + item.file;
          return <img key={item.id} src={imageUrl} alt={item.title || 'Club highlight'} loading="lazy" className="aspect-video w-full rounded-xl border object-cover" />;
        })}</div></section>}
        <section id="community" className="club-wrap py-16 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2"><div><p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Find your people</p><h2 className="text-3xl font-semibold tracking-tight">Bring your curiosity.<br />We’ll bring the conversation.</h2><p className="mt-5 max-w-md leading-relaxed text-muted-foreground">Trade ideas, work through a dataset, or debate a call. There’s room here for your first notebook and your next big project.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild><a href="https://discord.gg/yrEzMR9rn" target="_blank" rel="noreferrer">Join our Discord<ArrowUpRight /></a></Button><Button variant="outline" asChild><a href="https://www.instagram.com/sacutd/" target="_blank" rel="noreferrer">Instagram<ArrowUpRight /></a></Button></div></div>
          <div className="divide-y">{[[Users, 'Learn together', 'Meet students across majors who share your interest in sports.'], [Code2, 'Make something real', 'Work with data and contribute to open club projects.'], [Activity, 'Follow the questions', 'Test an idea, share what you found, and keep improving.']].map(([Icon, title, description]) => <div key={title} className="flex gap-4 py-5 first:pt-0"><Icon className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div></div>)}</div>
          </div>
        </section>
        {games.length > 0 && <section className="border-t bg-muted/40 py-8" aria-label="Sports scoreboard"><div className="club-wrap"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Around the leagues</h2><span className="text-xs text-muted-foreground">ESPN · updates every minute</span></div><div className="flex gap-3 overflow-x-auto pb-2" tabIndex={0} aria-label="Scroll scores">{games.map((game, index) => <div className="min-w-52 rounded-lg border bg-card p-4 text-sm" key={index}><div className="mb-3 flex justify-between gap-3 text-[10px] text-muted-foreground"><span>{game.league}</span><span className={game.live ? 'text-orange-700' : ''}>{game.status}</span></div><div className="flex justify-between"><span>{game.away}</span><span className="tabular-nums">{game.scheduled ? '—' : game.awayScore}</span></div><div className="mt-1 flex justify-between"><span>{game.home}</span><span className="tabular-nums">{game.scheduled ? '—' : game.homeScore}</span></div></div>)}</div></div></section>}
      </main>
      <footer className="border-t py-8"><div className="club-wrap flex flex-wrap items-center justify-between gap-5 text-xs text-muted-foreground"><span>Sports Analytics Club · UT Dallas</span><div className="flex gap-6"><a href="https://github.com/Sports-Analytics-Club-at-UTD">GitHub</a><a href="https://www.instagram.com/sacutd/">Instagram</a><span>© {new Date().getFullYear()} SAC UTD</span></div></div></footer>
    </div>
  );
}
