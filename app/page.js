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

  // Fetch Multi-Agency Launches (ISRO, SpaceX, NASA, ESA, JAXA) via Launch Library 2
  try {
    const res = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=4', { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      upcomingLaunches = data.results || [];
    }
  } catch (error) {
    console.error("Error fetching launch data:", error);
  }

  return (
    <div style={{ backgroundColor: '#080c14', color: '#ffffff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' }}>
      
      {/* Top Navigation / Header */}
      <header style={{ maxWidth: '1100px', margin: '0 auto 2.5rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '1.2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#38bdf8', letterSpacing: '0.5px' }}>🚀 SpaceTec</h1>
          <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Global Space Hub • NASA • ISRO • SpaceX • ESA • JAXA</p>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Section 1: NASA APOD */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1rem' }}>🌌 Daily Cosmic Overview</h2>
          {apodData ? (
            <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e293b' }}>
              {apodData.media_type === 'image' ? (
                <img src={apodData.url} alt={apodData.title} style={{ width: '100%', maxHeight: '450px', objectFit: 'cover' }} />
              ) : (
                <iframe src={apodData.url} title={apodData.title} style={{ width: '100%', height: '400px', border: 'none' }} />
              )}
              <div style={{ padding: '1.2rem 1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#38bdf8' }}>{apodData.title}</h3>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>{apodData.explanation}</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#0f172a', borderRadius: '12px' }}>
              <p style={{ color: '#94a3b8' }}>Loading space imagery...</p>
            </div>
          )}
        </section>

        {/* Section 2: Multi-Agency Launch Tracker */}
        <section>
          <h2 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '1rem' }}>🛰️ Upcoming Global Launches</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {upcomingLaunches.map((launch) => (
              <div key={launch.id} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1.2rem' }}>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#0284c7', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold' }}>
                  {launch.launch_service_provider?.name || 'Space Agency'}
                </span>
                <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: '0.8rem 0 0.4rem 0' }}>{launch.name}</h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  📅 {new Date(launch.net).toLocaleDateString()}
                </p>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>
                  📍 {launch.pad?.location?.name || 'Launch Site'}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
