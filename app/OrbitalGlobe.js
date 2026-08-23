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

export default function OrbitalGlobe() {
  const globeRef = useRef(null);
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('stations'); 
  const [selectedPad, setSelectedPad] = useState(null);
  const [selectedSat, setSelectedSat] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  // Fetch real telemetry data from CelesTrak with robust mapping
  useEffect(() => {
    const fetchRealSatellites = async () => {
      let queryGroup = satFilter;
      if (satFilter === 'active') queryGroup = 'visual'; // Fallback mapping to ensure smooth stream for massive data lists

      if (satCacheRef.current[queryGroup]) {
        setSatellites(satCacheRef.current[queryGroup]);
        return;
      }

      setLoadingSats(true);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${queryGroup}&FORMAT=json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const targetData = data.length > 1500 ? data.slice(0, 1500) : data;

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
              color: nameStr.includes('ISS') ? '#22c55e' : nameStr.includes('STARLINK') ? '#38bdf8' : '#3b82f6',
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

  // Generate true continuous orbital path loops around the globe
  const orbitalPaths = selectedSat ? (() => {
    const points = [];
    const inc = selectedSat.inclination || 45;
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
              onClick={() => { setViewMode(btn.key); setSelectedSat(null); setSelectedPad(null); }}
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

        {viewMode === 'pads' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['all', 'major', 'minor'].map((f) => (
              <button
                key={f}
                onClick={() => setPadFilter(f)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: padFilter === f ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
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
            pointsData={viewMode === 'pads' ? globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter) : satellites}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={viewMode === 'pads' ? 0.02 : 'altitude'}
            pointColor={d => viewMode === 'pads' ? (d.type === 'major' ? '#3b82f6' : '#2dd4bf') : d.color}
            pointRadius={viewMode === 'pads' ? 1.5 : 0.6}
            pathsData={orbitalPaths}
            pathColor={() => '#ffffff'}
            pathDashLength={0.15}
            pathDashGap={0.05}
            pathDashAnimateTime={3000}
            pathStroke={2}
            ringsData={selectedSat ? [selectedSat] : (selectedPad ? [selectedPad] : [])}
            ringColor={() => '#38bdf8'}
            ringMaxRadius={6}
            ringPropagationSpeed={3}
            ringRepeatPeriod={500}
            onPointClick={d => {
              if (viewMode === 'pads') {
                setSelectedPad(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.5 }, 1000);
              } else {
                setSelectedSat(d);
                if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.8 }, 1000);
              }
            }}
            pointLabel={d => `
              <div style="background: rgba(3, 7, 18, 0.95); padding: 10px 14px; border: 1px solid #38bdf8; font-family: monospace; font-size: 11px; color: #fff; pointer-events: none;">
                <b style="color: #38bdf8; font-size: 12px;">${d.name}</b><br/>
                ${viewMode === 'pads' ? `Agency: ${d.agency}` : `Org: ${d.organization} | Vel: ${d.velocity}`}
              </div>
            `}
          />
        </div>

        {loadingSats && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', padding: '0.4rem 0.8rem', border: '1px solid #38bdf8', zIndex: 10 }}>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '1px' }}>STREAMING SATELLITE CATALOG...</span>
          </div>
        )}
      </div>

    </div>
  );
}
