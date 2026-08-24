'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      LOADING ORBITAL TELEMETRY...
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

export default function SpaceTechApp() {
  const globeRef = useRef(null);
  
  const [appMode, setAppMode] = useState('standard'); // 'standard' or 'leolabs-page'
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('active'); 
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
  
  const [standardSats, setStandardSats] = useState([]);
  const [leolabsSats, setLeolabsSats] = useState([]);

  const filteredPads = globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter);

  // Initialize static stable datasets with fixed, non-fluctuating altitudes
  useEffect(() => {
    // Standard satellites
    const standardArr = Array.from({ length: 500 }).map((_, idx) => ({
      id: idx,
      name: `SAT-OBJ-${1000 + idx}`,
      baseLng: (idx * 20) % 360 - 180,
      lat: ((idx * 31) % 160) - 80,
      lng: (idx * 20) % 360 - 180,
      altitude: 0.4, // Fixed scalar so it never jumps/blinks
      speed: 0.03 + ((idx % 4) * 0.005),
      color: '#38bdf8',
      velocity: `${(7.5 + (idx % 3) * 0.1).toFixed(2)} km/s`
    }));
    setStandardSats(standardArr);

    // LeoLabs dense cloud with fixed altitude (completely stops vertical blinking)
    const denseArr = Array.from({ length: 2500 }).map((_, idx) => {
      let col = '#22c55e'; // Green payload
      let nameStr = `LEO-PAYLOAD-${idx}`;
      
      if (idx % 4 === 0) {
        col = '#ef4444'; // Red debris
        nameStr = `DEBRIS-RM-${idx}`;
      } else if (idx % 5 === 0) {
        col = '#38bdf8'; // Cyan constellation
        nameStr = `CONSTELLATION-${idx}`;
      }

      return {
        id: idx,
        name: nameStr,
        baseLng: (idx * 17) % 360 - 180,
        lat: ((idx * 43) % 170) - 85,
        lng: (idx * 17) % 360 - 180,
        altitude: 0.65, // Perfectly locked floating shell height above Earth
        speed: 0.02 + ((idx % 5) * 0.004),
        color: col,
        velocity: `${(7.2 + (idx % 6) * 0.12).toFixed(2)} km/s`
      };
    });
    setLeolabsSats(denseArr);
  }, []);

  // Smooth longitude updates only (altitude remains completely static to prevent visual glitches)
  useEffect(() => {
    let animId;
    const animate = () => {
      setStandardSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.0005 * s.speed)) % 360 - 180 })));
      setLeolabsSats(prev => prev.map(s => ({ ...s, lng: (s.baseLng + (Date.now() * 0.0005 * s.speed)) % 360 - 180 })));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '1480px', margin: '0 auto', padding: '1rem', boxSizing: 'border-box', fontFamily: 'monospace' }}>
      
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

      {/* Navigation Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(3, 7, 18, 0.95)', padding: '0.8rem 1.2rem', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '800', letterSpacing: '2px' }}>
            // SPACETEC COMMAND CENTER
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
          SYSTEM STABLE: ONLINE
        </div>
      </div>

      {/* STANDARD MODE */}
      {appMode === 'standard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              {[
                { key: 'pads', label: 'Launch Facilities' },
                { key: 'satellites', label: 'Satellite Cloud' }
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
                    cursor: 'pointer',
                    textTransform: 'uppercase'
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
          </div>

          <div className="moving-space-bg" style={{ position: 'relative', width: '100%', height: '480px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
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

          {viewMode === 'pads' && (
            <div style={{ padding: '1.2rem', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'rgba(10, 15, 25, 0.9)' }}>
              <span style={{ fontSize: '0.65rem', color: '#3b82f6', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '0.8rem' }}>
                // LAUNCH FACILITIES ({padFilter.toUpperCase()}: {filteredPads.length} SITES)
              </span>
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
        </div>
      )}

      {/* LEOLABS FULL-PAGE CONSOLE MODE */}
      {appMode === 'leolabs-page' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
          
          <div className="moving-space-bg" style={{ position: 'relative', width: '100%', height: '620px', border: '1px solid #38bdf8' }}>
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
              pointRadius={0.5}
            />
          </div>

          {/* Sidebar Legend */}
          <div style={{ background: 'rgba(10, 15, 25, 0.95)', padding: '1.2rem', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '1.2rem', height: '620px' }}>
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
              <p style={{ margin: 0 }}>Total Nodes: <span style={{ color: '#38bdf8' }}>2,500</span></p>
              <p style={{ margin: 0 }}>Orbit Shell: <span style={{ color: '#2dd4bf' }}>LEO Deep Space</span></p>
              <p style={{ margin: 0 }}>Status: <span style={{ color: '#22c55e' }}>Stable</span></p>
            </div>

            <div style={{ marginTop: 'auto', padding: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8' }}>
              <span style={{ fontSize: '0.6rem', color: '#38bdf8', lineHeight: '1.4' }}>
                Fixed altitude shell routing applied. No flickering or jumping nodes.
              </span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
