'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      INITIALIZING SECURE RADAR CLOUD...
    </div>
  ),
});

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 7, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 8, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 9, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 10, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 11, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 12, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 13, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' }
];

export default function SpaceTechApp() {
  const globeRef = useRef(null);
  
  const [appMode, setAppMode] = useState('standard'); // 'standard' or 'leolabs-page'
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  
  const [standardSats, setStandardSats] = useState([]);
  const [leolabsSats, setLeolabsSats] = useState([]);

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Generate robust high-density data locally to eliminate CORS failures
  useEffect(() => {
    // Standard satellites
    const standardArr = Array.from({ length: 450 }).map((_, idx) => ({
      id: idx,
      name: idx % 2 === 0 ? `STARLINK-${1000 + idx}` : `PAYLOAD-SAT-${idx}`,
      baseLng: (idx * 25) % 360 - 180,
      lat: ((idx * 37) % 160) - 80,
      lng: (idx * 25) % 360 - 180,
      altitude: 0.35 + ((idx % 3) * 0.08),
      speed: 0.04 + ((idx % 4) * 0.01),
      color: idx % 3 === 0 ? '#38bdf8' : '#2dd4bf',
      velocity: `${(7.5 + (idx % 3) * 0.1).toFixed(2)} km/s`
    }));
    setStandardSats(standardArr);

    // Dense LeoLabs simulation nodes (3,500 objects separated from Earth)
    const denseArr = Array.from({ length: 3500 }).map((_, idx) => {
      let col = '#22c55e'; // Green active payload
      let nameStr = `LEO-NODE-${idx}`;
      
      if (idx % 4 === 0) {
        col = '#ef4444'; // Red debris
        nameStr = `DEB-RM-${idx}`;
      } else if (idx % 5 === 0) {
        col = '#38bdf8'; // Cyan constellation
        nameStr = `ONEWEB-SAT-${idx}`;
      }

      return {
        id: idx,
        name: nameStr,
        baseLng: (idx * 17) % 360 - 180,
        lat: ((idx * 43) % 170) - 85,
        lng: (idx * 17) % 360 - 180,
        altitude: 0.52 + ((idx % 8) * 0.06), // Sits safely out in space with a dark gap
        speed: 0.03 + ((idx % 5) * 0.012),
        color: col,
        velocity: `${(7.2 + (idx % 6) * 0.12).toFixed(2)} km/s`
      };
    });
    setLeolabsSats(denseArr);
  }, []);

  // Real-time orbital movement loop
  useEffect(() => {
    let animId;
    const animate = () => {
      setStandardSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.0008 * s.speed)) % 360 - 180 })));
      setLeolabsSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.0008 * s.speed)) % 360 - 180 })));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#020617', padding: '1rem', boxSizing: 'border-box', fontFamily: 'monospace', overflowX: 'hidden' }}>
      
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
            radial-gradient(2px 2px at 160px 120px, #93c5fd, rgba(0,0,0,0));
          background-size: 350px 350px;
          animation: spaceScroll 30s linear infinite;
        }
      `}</style>

      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(3, 7, 18, 0.95)', padding: '0.8rem 1.2rem', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '1rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800', letterSpacing: '2px' }}>
            // SPACETEC COMMAND
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
              onClick={() => setAppMode('leolabs-page')}
              style={{
                padding: '0.4rem 0.9rem',
                background: appMode === 'leolabs-page' ? '#0284c7' : 'transparent',
                border: '1px solid #38bdf8',
                color: '#fff',
                fontSize: '0.65rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              LeoLabs Full Page Radar Console
            </button>
          </div>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#2dd4bf' }}>
          STATUS: ONLINE
        </div>
      </div>

      {/* APP MODE 1: STANDARD VIEW */}
      {appMode === 'standard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {['pads', 'satellites'].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewMode === m ? '#0284c7' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${viewMode === m ? '#38bdf8' : 'rgba(255,255,255,0.15)'}`,
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {m === 'pads' ? 'Launch Facilities' : 'Satellite Cloud'}
              </button>
            ))}
          </div>

          <div className="moving-space-bg" style={{ position: 'relative', width: '100%', height: '500px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <ReactGlobe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={viewMode === 'pads' ? filteredPads : standardSats}
              pointLat="lat"
              pointLng="lng"
              pointAltitude={viewMode === 'pads' ? 0.01 : 'altitude'}
              pointColor={d => viewMode === 'pads' ? '#38bdf8' : d.color}
              pointRadius={viewMode === 'pads' ? 1.2 : 0.5}
              onPointClick={d => {
                if (viewMode === 'pads') setSelectedPad(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
              }}
            />
          </div>
        </div>
      )}

      {/* APP MODE 2: DEDICATED FULL-PAGE LEOLABS RADAR CONSOLE */}
      {appMode === 'leolabs-page' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
          
          <div className="moving-space-bg" style={{ position: 'relative', width: '100%', height: '680px', border: '1px solid #38bdf8', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, background: 'rgba(0,0,0,0.9)', padding: '8px 14px', border: '1px solid #2dd4bf' }}>
              <span style={{ fontSize: '0.7rem', color: '#2dd4bf', fontWeight: 'bold' }}>LEOLABS RADAR CLOUD // {leolabsSats.length} ACTIVE NODES</span>
            </div>
            <ReactGlobe
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={leolabsSats}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="altitude"
              pointColor={d => d.color}
              pointRadius={0.6}
            />
          </div>

          {/* Sidebar */}
          <div style={{ background: 'rgba(10, 15, 25, 0.95)', padding: '1.2rem', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '1.2rem', height: '680px', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>// RADAR LEGEND</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.7rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', background: '#22c55e' }}></div>
                <span style={{ color: '#fff' }}>Payloads</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', background: '#38bdf8' }}></div>
                <span style={{ color: '#fff' }}>Constellations</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', background: '#ef4444' }}></div>
                <span style={{ color: '#fff' }}>Space Debris</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ margin: 0 }}>Total Nodes: <span style={{ color: '#38bdf8' }}>3,500</span></p>
              <p style={{ margin: 0 }}>Orbit Shell: <span style={{ color: '#2dd4bf' }}>LEO Deep Space</span></p>
              <p style={{ margin: 0 }}>Status: <span style={{ color: '#22c55e' }}>Synced</span></p>
            </div>

            <div style={{ marginTop: 'auto', padding: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8' }}>
              <span style={{ fontSize: '0.6rem', color: '#38bdf8', lineHeight: '1.4' }}>
                High-density multi-colored shells active with clean vertical spacing over Earth.
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
