export default async function Home() {
  const nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  
  let apodData = null;
  let upcomingLaunches = [];

  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`, { next: { revalidate: 3600 } });
    if (res.ok) apodData = await res.json();
  } catch (error) {
    console.error("APOD Fetch Error:", error);
  }

  try {
    const res = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=6', { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      upcomingLaunches = data.results || [];
    }
  } catch (error) {
    console.error("Launch Fetch Error:", error);
  }

  const bgImage = apodData?.media_type === 'image' 
    ? apodData.url 
    : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072';

  return (
    <div style={{ backgroundColor: '#020408', color: '#f8fafc', minHeight: '100vh', fontFamily: '"Space Grotesk", -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Dynamic Keyframes & Motion Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap');

        /* Entrance Animations */
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.06); }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(800%); }
        }

        .anim-fade-1 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-fade-2 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards; opacity: 0; }
        .anim-fade-3 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
        .anim-fade-4 { animation: fadeUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards; opacity: 0; }

        /* Full Bleed Backdrop */
        .nasa-backdrop {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-image: linear-gradient(180deg, rgba(2, 4, 8, 0.5) 0%, rgba(2, 4, 8, 0.88) 65%, #020408 100%), url('${bgImage}');
          background-size: cover;
          background-position: center;
          z-index: 0;
          filter: brightness(0.7) contrast(1.1);
          animation: pulseGlow 12s infinite ease-in-out;
        }

        .cyber-grid {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background-size: 60px 60px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          z-index: 1;
          pointer-events: none;
        }

        /* Glassmorphism Cards */
        .glass-card {
          background: rgba(10, 16, 28, 0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .glass-card:hover {
          border-color: rgba(56, 189, 248, 0.5);
          transform: translateY(-8px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(56, 189, 248, 0.25);
        }

        /* Fixed SpaceX Button Styles */
        .btn-primary {
          background: #ffffff;
          color: #000000;
          border: 1px solid #ffffff;
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.9rem 2rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .btn-primary:hover {
          background: #38bdf8;
          border-color: #38bdf8;
          color: #000000;
          box-shadow: 0 0 30px rgba(56, 189, 248, 0.6);
          transform: translateY(-3px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          letter-spacing: 3px;
          text-transform: uppercase;
          font-weight: 700;
          font-size: 0.75rem;
          padding: 0.9rem 2rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
          box-shadow: 0 0 25px rgba(56, 189, 248, 0.35);
          transform: translateY(-3px);
        }

        .hud-line {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent);
          animation: scanline 5s linear infinite;
          pointer-events: none;
        }
      `}</style>

      {/* Atmospheric NASA Backdrop */}
      <div className="nasa-backdrop"></div>
      <div className="cyber-grid"></div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Navigation HUD */}
        <header className="anim-fade-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SPACETEC
            </span>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '2px', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '2px' }}>
              SYS.VER.2026.1
            </span>
          </div>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
            <span style={{ color: '#fff' }}>● Live Telemetry</span>
            <span>Agencies</span>
            <span>Orbital Map</span>
          </div>
        </header>

        {/* Animated Hero Section */}
        <section className="anim-fade-2" style={{ padding: '7rem 3rem 4rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ maxWidth: '850px' }}>
            <p style={{ fontSize: '0.8rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '1.5rem', fontWeight: '700' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </p>
            <h1 style={{ fontSize: 'calc(2.5rem + 3vw)', fontWeight: '700', lineHeight: '1.05', letterSpacing: '-1px', margin: '0 0 2rem 0', textTransform: 'uppercase' }}>
              HUMANITY'S GATEWAY TO THE COSMOS.
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: '1.7', maxWidth: '620px', marginBottom: '2.5rem', fontWeight: '300' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from NASA, SpaceX, ISRO, ESA, and JAXA.
            </p>
            
            {/* Fixed Buttons */}
            <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
              <button className="btn-primary">EXPLORE LAUNCHES</button>
              <button className="btn-secondary">TELEMETRY DATA</button>
            </div>
          </div>
        </section>

        {/* Live HUD Telemetry Strip */}
        <section className="anim-fade-3" style={{ margin: '0 3rem 5rem 3rem' }}>
          <div className="glass-card" style={{ padding: '1.8rem 2.5rem', borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', position: 'relative', overflow: 'hidden' }}>
            <div className="hud-line"></div>
            {[
              { label: 'COSMIC BACKGROUND STREAM', val: apodData?.title ? apodData.title.slice(0, 22) + '...' : 'NASA APOD' },
              { label: 'ACTIVE AGENCIES', val: 'NASA • ISRO • SPACEX' },
              { label: 'NEXT MISSION NET', val: upcomingLaunches[0] ? new Date(upcomingLaunches[0].net).toLocaleDateString() : 'SYNCING...' },
              { label: 'NETWORK LATENCY', val: '0.04 MS / OPTICAL' }
            ].map((stat, idx) => (
              <div key={idx}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '2px', display: 'block', marginBottom: '0.4rem' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '1px', color: '#38bdf8' }}>
                  {stat.val}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* NASA APOD Feature Card */}
        {apodData && (
          <section className="anim-fade-4" style={{ padding: '0 3rem 5rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: '3rem', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
                // TODAY'S FEATURED DEEP SPACE OBSERVATION
              </span>
              <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase', margin: '0.8rem 0 1.2rem 0', fontWeight: '700' }}>
                {apodData.title}
              </h2>
              <p style={{ color: '#94a3b8', lineHeight: '1.8', maxWidth: '850px', fontSize: '0.95rem', margin: 0 }}>
                {apodData.explanation}
              </p>
            </div>
          </section>
        )}

        {/* Multi-Agency Launch Grid */}
        <section className="anim-fade-4" style={{ padding: '0 3rem 8rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
                // REAL-TIME ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.4rem 0 0 0', fontWeight: '700' }}>
                UPCOMING GLOBAL LAUNCHES
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', letterSpacing: '2px', color: '#64748b' }}>
              AUTO-SYNCED WITH LAUNCH LIBRARY 2
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {upcomingLaunches.map((launch) => (
              <div key={launch.id} className="glass-card" style={{ padding: '2rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.2rem 0.6rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {launch.launch_service_provider?.name || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', letterSpacing: '1px' }}>● CONFIRMED</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: '600', lineHeight: '1.4' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '1px' }}>
                    NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    PAD: {launch.pad?.location?.name || 'Vandenberg Space Force Base'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
