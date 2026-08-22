export default async function Home() {
  const nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  
  let apodData = null;
  let upcomingLaunches = [];

  // Fetch NASA Astronomy Picture of the Day
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`, { next: { revalidate: 3600 } });
    if (res.ok) apodData = await res.json();
  } catch (error) {
    console.error("Error fetching APOD:", error);
  }

  // Fetch Multi-Agency Launches (ISRO, SpaceX, NASA, ESA, JAXA)
  try {
    const res = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=6', { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      upcomingLaunches = data.results || [];
    }
  } catch (error) {
    console.error("Error fetching launch data:", error);
  }

  const agencies = [
    { name: 'NASA', color: '#3b82f6' },
    { name: 'SpaceX', color: '#06b6d4' },
    { name: 'ISRO', color: '#f97316' },
    { name: 'ESA', color: '#6366f1' },
    { name: 'JAXA', color: '#ec4899' }
  ];

  return (
    <div style={{ backgroundColor: '#030712', color: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Inline Animation & Hover Styles */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; filter: blur(40px); }
          50% { opacity: 0.8; filter: blur(60px); }
        }
        .glow-bg {
          position: absolute; width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(0, 0, 0, 0) 70%);
          border-radius: 50%; pointer-events: none; animation: pulseGlow 6s infinite ease-in-out;
        }
        .feature-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          transform: translateY(-8px);
          border-color: #38bdf8 !important;
          box-shadow: 0 10px 30px -10px rgba(56, 189, 248, 0.3);
        }
      `}</style>

      {/* Hero Header Section */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #1e293b', padding: '4rem 1.5rem 3rem 1.5rem', textAlign: 'center' }}>
        <div className="glow-bg" style={{ top: '-50px', left: '50%', transform: 'translateX(-50%)' }}></div>
        
        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '700', padding: '0.4rem 1rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            Universal Exploration Hub
          </span>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', margin: '1.2rem 0 0.8rem 0', background: 'linear-gradient(135deg, #ffffff 0%, #38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
            SPACETEC
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#94a3b8', maxWidth: '650px', margin: '0 auto 2rem auto', lineHeight: '1.6' }}>
            Unified real-time telemetry, deep-space observation feeds, and mission intelligence across global space agencies.
          </p>

          {/* Agency Badges */}
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {agencies.map((agency) => (
              <span key={agency.name} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: agency.color, padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ● {agency.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        
        {/* Live Telemetry Stats Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3.5rem' }}>
          {[
            { label: 'Agencies Synced', val: '5 Active' },
            { label: 'Upcoming Mission', val: upcomingLaunches[0]?.name?.split('|')[0] || 'Tracking...' },
            { label: 'Orbital Feed Status', val: '🟢 Live' },
            { label: 'Data Latency', val: '< 12ms' }
          ].map((stat, i) => (
            <div key={i} style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid #1e293b', borderRadius: '12px', padding: '1rem 1.2rem', backdropFilter: 'blur(8px)' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '1rem', color: '#f8fafc', fontWeight: 'bold' }}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Section 1: NASA APOD Deep Space Showcase */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', margin: 0, fontWeight: '800' }}>🌌 Daily Cosmic Observation</h2>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>NASA APOD Stream</span>
          </div>

          {apodData ? (
            <div className="feature-card" style={{ backgroundColor: '#0f172a', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e293b', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              <div>
                {apodData.media_type === 'image' ? (
                  <img src={apodData.url} alt={apodData.title} style={{ width: '100%', height: '100%', minHeight: '350px', objectFit: 'cover' }} />
                ) : (
                  <iframe src={apodData.url} title={apodData.title} style={{ width: '100%', height: '100%', minHeight: '350px', border: 'none' }} />
                )}
              </div>
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Image of the Day</span>
                <h3 style={{ margin: '0.5rem 0 1rem 0', color: '#ffffff', fontSize: '1.5rem' }}>{apodData.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>{apodData.explanation ? `${apodData.explanation.slice(0, 320)}...` : ''}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b' }}>
              <p style={{ color: '#94a3b8' }}>Establishing deep space telemetry link...</p>
            </div>
          )}
        </section>

        {/* Section 2: Real-time Multi-Agency Rocket Launches */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', margin: 0, fontWeight: '800' }}>🛰️ Global Mission Manifest</h2>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>Live Schedule</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem' }}>
            {upcomingLaunches.map((launch) => (
              <div key={launch.id} className="feature-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 'bold', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {launch.launch_service_provider?.name || 'Space Agency'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>● Scheduled</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', color: '#f8fafc', margin: '0 0 0.8rem 0', lineHeight: '1.4' }}>{launch.name}</h3>
                </div>
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.8rem', marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: '0 0 0.3rem 0' }}>
                    📅 {new Date(launch.net).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    📍 {launch.pad?.location?.name || 'Vandenberg / Cape Canaveral'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Feature Roadmap Grid */}
        <section style={{ borderTop: '1px solid #1e293b', paddingTop: '3.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', marginBottom: '1.5rem', fontWeight: '800' }}>⚡ SpaceTec Exploration Suite</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.2rem' }}>
            {[
              { title: 'ISS Live Tracker', desc: 'Real-time orbital telemetry and astronaut crew manifest.', icon: '🛰️' },
              { title: 'Mars Rover Vault', desc: 'Curated high-res surface captures from Curiosity and Perseverance.', icon: '🔴' },
              { title: 'Asteroid Defense Radar', desc: 'Near-Earth hazard monitoring and trajectory calculations.', icon: '☄️' },
              { title: 'Exoplanet Index', desc: 'Searchable catalogue of habitable deep-space worlds.', icon: '🪐' }
            ].map((feat, index) => (
              <div key={index} className="feature-card" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '14px', padding: '1.5rem' }}>
                <span style={{ fontSize: '1.8rem' }}>{feat.icon}</span>
                <h3 style={{ color: '#f8fafc', fontSize: '1.1rem', margin: '0.8rem 0 0.4rem 0' }}>{feat.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
