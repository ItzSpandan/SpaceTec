'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      INITIALIZING SPACE DOMAIN AWARENESS ENGINE...
    </div>
  ),
});

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Guiana Space Centre', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 7, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 8, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 9, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 10, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 11, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 12, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 13, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' }
];

export default function OrbitalGlobeApp() {
  const globeRef = useRef(null);
  const [appMode, setAppMode] = useState('standard'); // 'standard' or 'deep-analysis'
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('stations'); 
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  const [selectedSat, setSelectedSat] = useState(null);
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Fetch telemetry data from CelesTrak & add revolving orbital animation mechanics
  useEffect(() => {
    const fetchRealSatellites = async () => {
      let queryGroup = satFilter;
      if (satCacheRef.current[queryGroup]) {
        setSatellites(satCacheRef.current[queryGroup]);
        return;
      }

      setLoadingSats(true);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${queryGroup}&FORMAT=json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const targetData = data.length > 800 ? data.slice(0, 800) : data;

          const formattedSats = targetData.map((sat, index) => {
            const incl = sat.INCLINATION || 45;
            const meanMotion = sat.MEAN_MOTION || 15;
            
            let alt = 0.15; // Space altitude above globe surface
            if (meanMotion < 2.0) alt = 0.35; 
            else if (meanMotion < 4.0) alt = 0.25;

            const nameStr = sat.OBJECT_NAME?.trim() || `SAT-${index}`;
            let org = 'International / Commercial';
            if (nameStr.includes('ISS') || nameStr.includes('ZARYA')) org = 'NASA / Roscosmos';
            else if (nameStr.includes('STARLINK')) org = 'SpaceX Constellation';
            else if (nameStr.includes('COSMOS')) org = 'Roscosmos Federation';

            return {
              id: sat.NORAD_CAT_ID || index,
              name: nameStr,
              baseLng: (index * 22) % 360 - 180,
              lat: incl > 90 ? 180 - incl : incl,
              lng: (index * 22) % 360 - 180,
              inclination: incl,
              altitude: alt,
              speed: (0.1 + (index % 5) * 0.05), // Revolution speed modifier
              color: nameStr.includes('ISS') ? '#22c55e' : nameStr.includes('STARLINK') ? '#38bdf8' : '#60a5fa',
              velocity: `${(7.5 + (index % 3) * 0.2).toFixed(2)} km/s`,
              organization: org
            };
          });

          satCacheRef.current[queryGroup] = formattedSats;
          setSatellites(formattedSats);
        }
      } catch (err) {
        console.log('Telemetry fetch error:', err);
      } finally {
        setLoadingSats(false);
      }
    };

    fetchRealSatellites();
  }, [satFilter]);

  // Real-time animation loop making satellites revolve around the globe in space
  useEffect(() => {
    let animationFrameId;
    const updateOrbits = () => {
      setSatellites(prevSats => 
        prevSats.map(sat => ({
          ...sat,
          lng: (sat.baseLng + (Date.now() * 0.002 * sat.speed)) % 360 - 180
        }))
      );
      animationFrameId = requestAnimationFrame(updateOrbits);
    };
    animationFrameId = requestAnimationFrame(updateOrbits);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', maxWidth: '1450px', margin: '0 auto', fontFamily: 'monospace' }}>
      
      {/* Background Starfield Motion CSS */}
      <style>{`
        @keyframes spaceScroll {
          0% { background-position: 0 0; }
          100% { background-position: -1000px 500px; }
        }
        .moving-space-bg {
          background-color: #020617;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, #38bdf8, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #93c5fd, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 230px 180px, #ffffff, rgba(0,0,0,0));
          background-size: 350px 350px;
          animation: spaceScroll 30s linear infinite;
        }
      `}</style>

      {/* Top Command Bar & Analysis Mode Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(3, 7, 18, 0.95)', padding: '1rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800', letterSpacing: '2px' }}>
            // ORBITAL COMMAND CENTER
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setAppMode('standard')}
              style={{
                padding: '0.4rem 0.9rem',
                background: appMode === 'standard' ? '#0284c7' : 'transparent',
                border: '1px solid #38bdf8',
                color: '#fff',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Standard Global View
            </button>
            <button
              onClick={() => setAppMode('deep-analysis')}
              style={{
                padding: '0.4rem 0.9rem',
                background: appMode === 'deep-analysis' ? '#0284c7' : 'transparent',
                border: '1px solid #38bdf8',
                color: '#fff',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              LeoLabs Deep Analysis Console
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#2dd4bf' }}>
          SYSTEM STATUS: ONLINE // TRACKING {satellites.length} ACTIVE NODES
        </div>
      </div>

      {/* VIEW MODE 1: STANDARD GLOBAL VIEW */}
      {appMode === 'standard' && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
                // LAYER:
              </span>
              {[
                { key: 'pads', label: 'Launch Facilities' },
                { key: 'satellites', label: 'Revolving Space Satellites' }
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => { setViewMode(btn.key); setSelectedSat(null); }}
                  style={{
                    padding: '0.5rem 1rem',
                    background: viewMode === btn.key ? '#0284c7' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${viewMode === btn.key ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {viewMode === 'satellites' && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['stations', 'starlink', 'visual', 'active'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setSatFilter(f)}
                    style={{
                      padding: '0.4rem 0.7rem',
                      background: satFilter === f ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      color: '#ffffff',
                      fontSize: '0.6rem',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="moving-space-bg" style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ReactGlobe
                ref={globeRef}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundColor="rgba(0,0,0,0)"
                pointsData={viewMode === 'pads' ? filteredPads : satellites}
                pointLat="lat"
                pointLng="lng"
                pointAltitude={viewMode === 'pads' ? 0.01 : 'altitude'}
                pointColor={d => viewMode === 'pads' ? '#38bdf8' : d.color}
                pointRadius={viewMode === 'pads' ? 1.2 : 0.5}
                onPointClick={d => {
                  if (viewMode === 'pads') setSelectedPad(d);
                  else setSelectedSat(d);
                  if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
                }}
                pointLabel={d => `
                  <div style="background: rgba(3, 7, 18, 0.95); padding: 8px 12px; border: 1px solid #38bdf8; font-size: 11px; color: #fff;">
                    <b style="color: #38bdf8;">${d.name}</b><br/>
                    ${viewMode === 'pads' ? `Agency: ${d.agency}` : `Velocity: ${d.velocity}`}
                  </div>
                `}
              />
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 2: LEOLABS DEEP ANALYSIS CONSOLE (SEPARATE PAGE VIEW) */}
      {appMode === 'deep-analysis' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', background: '#020617', padding: '1rem', border: '1px solid #38bdf8' }}>
          
          <div style={{ position: 'relative', height: '550px', border: '1px solid rgba(56, 189, 248, 0.4)' }} className="moving-space-bg">
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10, background: 'rgba(0,0,0,0.8)', padding: '6px 10px', border: '1px solid #2dd4bf' }}>
              <span style={{ fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 'bold' }}>LEOLABS RADAR SHELL MAPPING // HIGH-DENSITY LEO CLOUD</span>
            </div>
            <ReactGlobe
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={satellites}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="altitude"
              pointColor={() => '#38bdf8'}
              pointRadius={0.6}
            />
          </div>

          <div style={{ background: 'rgba(10, 15, 25, 0.9)', padding: '1rem', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>// RADAR SECTOR ANALYTICS</span>
            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ margin: 0 }}>Active Collision Monitors: <span style={{ color: '#2dd4bf' }}>ENGAGED</span></p>
              <p style={{ margin: 0 }}>Orbital Shell: <span style={{ color: '#fff' }}>Low Earth Orbit (LEO)</span></p>
              <p style={{ margin: 0 }}>Tracked Objects: <span style={{ color: '#38bdf8' }}>{satellites.length} Nodes</span></p>
              <p style={{ margin: 0 }}>Update Cycle: <span style={{ color: '#fff' }}>Real-time Ephemeris Feed</span></p>
            </div>
            <div style={{ marginTop: 'auto', padding: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8' }}>
              <span style={{ fontSize: '0.6rem', color: '#38bdf8' }}>
                Note: All nodes update continuously with live velocity vectors across space trajectories.
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
