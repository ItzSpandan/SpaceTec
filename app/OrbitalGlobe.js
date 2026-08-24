'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      INITIALIZING DEEP SPACE RADAR CLOUD...
    </div>
  ),
});

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Pacific Spaceport Complex (Alaska)', agency: 'Astra / USSF', lat: 57.4358, lng: -152.3477, type: 'minor', country: 'USA' },
  { id: 7, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 8, name: 'Esrange Space Center', agency: 'SSC', lat: 67.8894, lng: 21.1050, type: 'minor', country: 'Sweden' },
  { id: 9, name: 'Andøya Spaceport', agency: 'Andøya Space', lat: 69.2933, lng: 16.0167, type: 'minor', country: 'Norway' },
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 11, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 12, name: 'Vostochny Cosmodrome', agency: 'Roscosmos', lat: 51.8841, lng: 128.3339, type: 'major', country: 'Russia' },
  { id: 13, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 15, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 16, name: 'Xichang Satellite Launch Center', agency: 'CNSA', lat: 28.2465, lng: 102.0264, type: 'minor', country: 'China' },
  { id: 17, name: 'Taiyuan Satellite Launch Center', agency: 'CNSA', lat: 38.8490, lng: 111.6080, type: 'minor', country: 'China' },
  { id: 18, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 19, name: 'Uchinoura Space Center', agency: 'JAXA', lat: 31.2515, lng: 131.0825, type: 'minor', country: 'Japan' },
  { id: 20, name: 'Naro Space Center', agency: 'KARI', lat: 34.4315, lng: 127.5350, type: 'minor', country: 'South Korea' },
  { id: 21, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 22, name: 'Arnhem Space Centre', agency: 'Equatorial Launch Australia', lat: -12.3780, lng: 136.8150, type: 'minor', country: 'Australia' },
  { id: 23, name: 'Imam Khomeini Spaceport', agency: 'ISA', lat: 35.2344, lng: 53.9211, type: 'minor', country: 'Iran' },
  { id: 24, name: 'Al-Dahik Launch Site', agency: 'NARSS', lat: 28.4890, lng: 30.4120, type: 'minor', country: 'Egypt' }
];

export default function OrbitalGlobeApp() {
  const globeRef = useRef(null);
  const leolabsRef = useRef(null);
  
  const [appMode, setAppMode] = useState('standard'); // 'standard' or 'leolabs-page'
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('active'); 
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  
  const [standardSats, setStandardSats] = useState([]);
  const [leolabsSats, setLeolabsSats] = useState([]);
  const [loadingSating, setLoadingSating] = useState(false);

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Fetch standard data
  useEffect(() => {
    const fetchStandard = async () => {
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${satFilter}&FORMAT=json`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.slice(0, 1000).map((sat, idx) => ({
            id: sat.NORAD_CAT_ID || idx,
            name: sat.OBJECT_NAME?.trim() || `SAT-${idx}`,
            baseLng: (idx * 20) % 360 - 180,
            lat: (sat.INCLINATION || 45) > 90 ? 180 - (sat.INCLINATION || 45) : (sat.INCLINATION || 45),
            lng: (idx * 20) % 360 - 180,
            altitude: 0.35 + ((idx % 4) * 0.1),
            speed: 0.05 + ((idx % 5) * 0.02),
            color: '#38bdf8',
            velocity: `${(7.5 + (idx % 3) * 0.1).toFixed(2)} km/s`
          }));
          setStandardSats(mapped);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStandard();
  }, [satFilter]);

  // Fetch high-density LeoLabs separate page data (combining multiple feeds for thousands of objects)
  useEffect(() => {
    const fetchLeoLabsDenseData = async () => {
      setLoadingSating(true);
      try {
        // Fetch active payloads and debris catalogs to simulate LeoLabs high density
        const [resActive, resVisual] = await Promise.all([
          fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json'),
          fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=json')
        ]);
        
        const activeData = await resActive.json();
        const visualData = await resVisual.json();
        
        const combined = [...(Array.isArray(activeData) ? activeData : []), ...(Array.isArray(visualData) ? visualData : [])];
        const sliced = combined.slice(0, 3500); // Massive density count

        const formatted = sliced.map((sat, idx) => {
          const incl = sat.INCLINATION || Math.random() * 90;
          const nameStr = sat.OBJECT_NAME?.trim() || `NODE-${idx}`;
          
          // LeoLabs Color Code: Debris/Rocket body = Red, Payloads = Green/Cyan
          let col = '#22c55e'; // Green payload
          if (nameStr.includes('DEB') || nameStr.includes('R/B') || nameStr.includes('DEBRIS')) {
            col = '#ef4444'; // Red debris
          } else if (nameStr.includes('STARLINK')) {
            col = '#38bdf8'; // Cyan
          }

          return {
            id: sat.NORAD_CAT_ID || idx,
            name: nameStr,
            baseLng: (idx * 13) % 360 - 180,
            lat: incl > 90 ? 180 - incl : incl,
            lng: (idx * 13) % 360 - 180,
            // HIGH ALTITUDE GAP: Sits cleanly out in space away from the globe surface
            altitude: 0.55 + ((idx % 7) * 0.08),
            speed: 0.04 + ((idx % 6) * 0.015),
            color: col,
            velocity: `${(7.4 + (idx % 5) * 0.15).toFixed(2)} km/s`
          };
        });

        setLeolabsSats(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSating(false);
      }
    };

    fetchLeoLabsDenseData();
  }, []);

  // Real-time orbital rotation loop for both views
  useEffect(() => {
    let animId;
    const animate = () => {
      setStandardSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.001 * s.speed)) % 360 - 180 })));
      setLeolabsSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.001 * s.speed)) % 360 - 180 })));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '1480px', margin: '0 auto', fontFamily: 'monospace' }}>
      
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

      {/* Top Header Navigation Switcher */}
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
          MODE: {appMode === 'standard' ? 'STANDARD VIEW' : 'DEDICATED LEOLABS PAGE'}
        </div>
      </div>

      {/* APP MODE 1: STANDARD VIEW */}
      {appMode === 'standard' && (
        <>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
                // LAYER:
              </span>
              {[
                { key: 'pads', label: 'Launch Facilities' },
                { key: 'satellites', label: 'Space Satellite Cloud' }
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setViewMode(btn.key)}
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

            {viewMode === 'pads' && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['all', 'major', 'minor'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setPadFilter(f)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: padFilter === f ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
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

            {viewMode === 'satellites' && (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['active', 'stations', 'starlink', 'visual'].map((f) => (
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
                pointLabel={d => `
                  <div style="background: rgba(3, 7, 18, 0.95); padding: 8px 12px; border: 1px solid #38bdf8; font-size: 11px; color: #fff;">
                    <b style="color: #38bdf8;">${d.name}</b><br/>
                    ${viewMode === 'pads' ? `Agency: ${d.agency}` : `Velocity: ${d.velocity}`}
                  </div>
                `}
              />
            </div>
          </div>

          {/* Launch Facilities Cards Panel */}
          {viewMode === 'pads' && (
            <div style={{ padding: '1.2rem', borderRadius: '2px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(10, 15, 25, 0.9)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
                  // LAUNCH FACILITIES ({padFilter.toUpperCase()} FILTER: {filteredPads.length} SITES)
                </span>
                <span style={{ fontSize: '0.6rem', color: '#71717a' }}>Click any card to lock target on globe</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.8rem', maxHeight: '180px', overflowY: 'auto' }}>
                {filteredPads.map((pad) => {
                  const isSelected = selectedPad?.id === pad.id;
                  return (
                    <div
                      key={pad.id}
                      onClick={() => {
                        setSelectedPad(pad);
                        if (globeRef.current) globeRef.current.pointOfView({ lat: pad.lat, lng: pad.lng, altitude: 1.5 }, 1000);
                      }}
                      style={{
                        padding: '0.8rem',
                        background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#ffffff', fontWeight: '700' }}>{pad.name}</h4>
                        <span style={{ fontSize: '0.55rem', padding: '2px 6px', background: pad.type === 'major' ? '#3b82f6' : '#2dd4bf', color: '#030712', fontWeight: '800' }}>
                          {pad.type.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.7rem', color: '#2dd4bf' }}>{pad.agency}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* APP MODE 2: DEDICATED FULL-PAGE LEOLABS RADAR CONSOLE */}
      {appMode === 'leolabs-page' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1rem', background: '#020617', padding: '1rem', border: '2px solid #38bdf8', minHeight: '750px' }}>
          
          <div style={{ position: 'relative', height: '720px', border: '1px solid rgba(56, 189, 248, 0.4)' }} className="moving-space-bg">
            <div style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, background: 'rgba(0,0,0,0.9)', padding: '8px 14px', border: '1px solid #2dd4bf' }}>
              <span style={{ fontSize: '0.7rem', color: '#2dd4bf', fontWeight: 'bold' }}>LEOLABS FULL-PAGE SPACE RADAR CLOUD // {leolabsSats.length} NODES DISPLAYED</span>
            </div>
            <ReactGlobe
              ref={leolabsRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
              backgroundColor="rgba(0,0,0,0)"
              pointsData={leolabsSats}
              pointLat="lat"
              pointLng="lng"
              pointAltitude="altitude"
              pointColor={d => d.color}
              pointRadius={0.6}
              pointLabel={d => `
                <div style="background: rgba(3, 7, 18, 0.95); padding: 8px 12px; border: 1px solid #38bdf8; font-size: 11px; color: #fff;">
                  <b style="color: #38bdf8;">${d.name}</b><br/>
                  Velocity: ${d.velocity}
                </div>
              `}
            />
            {loadingSating && (
              <div style={{ position: 'absolute', bottom: '15px', left: '15px', background: 'rgba(0,0,0,0.9)', padding: '6px 12px', border: '1px solid #38bdf8' }}>
                <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>SCANNING DEBRIS & PAYLOAD SHELLS...</span>
              </div>
            )}
          </div>

          {/* LeoLabs Sidebar Legend & Metrics */}
          <div style={{ background: 'rgba(10, 15, 25, 0.95)', padding: '1.2rem', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold' }}>// OBJECT TYPE CLASSIFICATION</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', background: '#22c55e' }}></div>
                <span style={{ color: '#fff' }}>Payload / Active Satellite</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', background: '#38bdf8' }}></div>
                <span style={{ color: '#fff' }}>Starlink Shell Nodes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '12px', height: '12px', background: '#ef4444' }}></div>
                <span style={{ color: '#fff' }}>Debris & Rocket Bodies</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.2rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 'bold' }}>// RADAR CONSOLE METRICS</span>
              <div style={{ fontSize: '0.7rem', color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.8rem' }}>
                <p style={{ margin: 0 }}>Radar Network: <span style={{ color: '#2dd4bf' }}>GLOBAL PHASED ARRAY</span></p>
                <p style={{ margin: 0 }}>Active Tracking Shell: <span style={{ color: '#fff' }}>LEO (Low Earth Orbit)</span></p>
                <p style={{ margin: 0 }}>Total Space Objects: <span style={{ color: '#38bdf8' }}>{leolabsSats.length} Nodes</span></p>
                <p style={{ margin: 0 }}>Visual Gap Distance: <span style={{ color: '#2dd4bf' }}>Active (0.55+ Altitude)</span></p>
              </div>
            </div>

            <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8' }}>
              <span style={{ fontSize: '0.65rem', color: '#38bdf8', lineHeight: '1.4' }}>
                This dedicated full-page console pulls multi-source orbital streams, rendering high-density revolving space nodes separated cleanly from the Earth.
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
