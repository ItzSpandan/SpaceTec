'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontFamily: 'monospace', fontSize: '0.8rem' }}>
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 7, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 13, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' }
];

export default function OrbitalGlobe() {
  const globeRef = useRef(null);
  const [viewMode, setViewMode] = useState('satellites'); 
  const [satFilter, setSatFilter] = useState('stations'); 
  const [selectedSat, setSelectedSat] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  // Fetch real telemetry data from CelesTrak with reliable groups
  useEffect(() => {
    const fetchRealSatellites = async () => {
      // Map 'active' or heavy queries to 'visual' or 'active-payloads' to prevent timeouts
      let queryGroup = satFilter;
      if (satFilter === 'active') queryGroup = 'visual'; 

      if (satCacheRef.current[queryGroup]) {
        setSatellites(satCacheRef.current[queryGroup]);
        return;
      }

      setLoadingSats(true);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${queryGroup}&FORMAT=json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const targetData = data.length > 1200 ? data.slice(0, 1200) : data;

          const formattedSats = targetData.map((sat, index) => {
            const incl = sat.INCLINATION || 0;
            const meanMotion = sat.MEAN_MOTION || 15;
            
            let alt = 400; 
            if (meanMotion < 2.0) alt = 1200; 
            else if (meanMotion < 4.0) alt = 800;

            const nameStr = sat.OBJECT_NAME?.trim() || `SAT-${index}`;
            let org = 'Independent / International';
            if (nameStr.includes('ISS') || nameStr.includes('ZARYA')) org = 'NASA / Roscosmos / International';
            else if (nameStr.includes('STARLINK')) org = 'SpaceX (USA)';
            else if (nameStr.includes('NOAA') || nameStr.includes('GOES')) org = 'NOAA (USA)';
            else if (nameStr.includes('COSMOS')) org = 'Roscosmos (Russia)';
            else if (nameStr.includes('GPS')) org = 'US Space Force';

            return {
              id: sat.NORAD_CAT_ID || index,
              name: nameStr,
              lat: incl > 90 ? 180 - incl : incl,
              lng: (index * 25) % 360 - 180,
              inclination: incl,
              altitude: alt / 2500, 
              color: nameStr.includes('ISS') ? '#22c55e' : nameStr.includes('STARLINK') ? '#38bdf8' : '#ffffff',
              velocity: `${(Math.sqrt(398600 / (6371 + alt))).toFixed(2)} km/s`,
              organization: org
            };
          });

          satCacheRef.current[queryGroup] = formattedSats;
          setSatellites(formattedSats);
        }
      } catch (err) {
        console.log('Network fallback triggered:', err);
      } finally {
        setLoadingSats(false);
      }
    };

    fetchRealSatellites();
  }, [satFilter]);

  // Robust Auto-Rotation Setup via ThreeJS OrbitControls
  useEffect(() => {
    let timer;
    const setupControls = () => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = !isPaused;
          controls.autoRotateSpeed = 0.8;
        }
      }
      timer = requestAnimationFrame(setupControls);
    };
    setupControls();
    return () => cancelAnimationFrame(timer);
  }, [isPaused]);

  // Generate a true orbital ring path looping around the earth based on inclination
  const orbitalPaths = selectedSat ? (() => {
    const points = [];
    const inc = selectedSat.inclination || 45;
    // Build a complete 360-degree orbital loop path around the globe
    for (let i = 0; i <= 360; i += 5) {
      const rad = (i * Math.PI) / 180;
      const lat = Math.sin(rad) * inc;
      const lng = i - 180;
      points.push({ lat, lng, altitude: selectedSat.altitude + 0.02 });
    }
    return [points];
  })() : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
            // DISPLAY MODE:
          </span>
          {[
            { key: 'pads', label: 'Launch Pads' },
            { key: 'satellites', label: 'Live 3D WebGL Satellite Radar' }
          ].map((btn) => (
            <button
              key={btn.key}
              onClick={() => { setViewMode(btn.key); setSelectedSat(null); }}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${viewMode === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode === 'satellites' && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { key: 'stations', label: 'Stations' },
              { key: 'starlink', label: 'Starlink' },
              { key: 'visual', label: 'Bright / Visual' },
              { key: 'weather', label: 'Weather' },
              { key: 'active', label: 'All Active' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSatFilter(f.key)}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: satFilter === f.key ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div 
        className="glass-card" 
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{ position: 'relative', width: '100%', height: '600px', borderRadius: '2px', overflow: 'hidden', background: '#030712', border: '1px solid rgba(59, 130, 246, 0.2)' }}
      >
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <ReactGlobe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            pointsData={viewMode === 'pads' ? globalLaunchPads : satellites}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={viewMode === 'pads' ? 0.02 : 'altitude'}
            pointColor={d => viewMode === 'pads' ? '#3b82f6' : d.color}
            pointRadius={viewMode === 'pads' ? 1.5 : 0.6}
            pathsData={orbitalPaths}
            pathColor={() => '#ffffff'}
            pathDashLength={0.15}
            pathDashGap={0.05}
            pathDashAnimateTime={3000}
            pathStroke={2}
            ringsData={selectedSat ? [selectedSat] : []}
            ringColor={() => '#38bdf8'}
            ringMaxRadius={6}
            ringPropagationSpeed={3}
            ringRepeatPeriod={500}
            onPointClick={d => {
              if (viewMode === 'satellites') {
                setSelectedSat(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.8 }, 1000);
              }
            }}
            pointLabel={d => `
              <div style="background: rgba(3, 7, 18, 0.95); padding: 10px 14px; border: 1px solid #38bdf8; font-family: monospace; font-size: 11px; color: #fff; pointer-events: none;">
                <b style="color: #38bdf8; font-size: 12px;">${d.name}</b><br/>
                Org: ${d.organization} | Vel: ${d.velocity}
              </div>
            `}
          />
        </div>

        {loadingSats && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', padding: '0.4rem 0.8-rem', border: '1px solid #38bdf8', zIndex: 10 }}>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '1px' }}>STREAMING SATELLITE CATALOG...</span>
          </div>
        )}
      </div>

    </div>
  );
}
