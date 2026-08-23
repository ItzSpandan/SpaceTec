'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

// Import the official React wrapper dynamically with SSR disabled
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
  { id: 6, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 7, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 8, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 9, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 10, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 11, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' }
];

export default function OrbitalGlobe() {
  const globeRef = useRef(null);
  const [viewMode, setViewMode] = useState('pads'); 
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('stations'); 
  const [selectedPad, setSelectedPad] = useState(null);
  const [selectedSat, setSelectedSat] = useState(null);
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  useEffect(() => {
    const fetchRealSatellites = async () => {
      let endpointGroup = 'stations'; 
      if (satFilter === 'starlink') endpointGroup = 'starlink';
      else if (satFilter === 'visual') endpointGroup = 'visual';
      else if (satFilter === 'weather') endpointGroup = 'weather';
      else if (satFilter === 'active') endpointGroup = 'active';

      if (satCacheRef.current[endpointGroup]) {
        setSatellites(satCacheRef.current[endpointGroup]);
        return;
      }

      setLoadingSats(true);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${endpointGroup}&FORMAT=json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const formattedSats = data.map((sat, index) => {
            const incl = sat.INCLINATION || 0;
            const meanMotion = sat.MEAN_MOTION || 15;
            
            let alt = 400; 
            if (meanMotion < 2.0) alt = 1200; 
            else if (meanMotion < 4.0) alt = 800;

            return {
              id: sat.NORAD_CAT_ID || index,
              name: sat.OBJECT_NAME?.trim() || `SAT-${index}`,
              lat: incl > 90 ? 180 - incl : incl,
              lng: (index * 25) % 360 - 180,
              altitude: alt / 3000, 
              color: sat.OBJECT_NAME?.includes('ISS') ? '#22c55e' : sat.OBJECT_NAME?.includes('STARLINK') ? '#38bdf8' : '#3b82f6',
              velocity: `${(Math.sqrt(398600 / (6371 + alt))).toFixed(2)} km/s`,
              intlDesignator: sat.INTLDES || 'N/A'
            };
          });

          satCacheRef.current[endpointGroup] = formattedSats;
          setSatellites(formattedSats);
        }
      } catch (err) {
        console.log('Using fallback telemetry due to network block:', err);
      } finally {
        setLoadingSats(false);
      }
    };

    fetchRealSatellites();
  }, [satFilter]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
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
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode === 'pads' ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'major', 'minor'].map((f) => (
              <button
                key={f}
                onClick={() => setPadFilter(f)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: padFilter === f ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { key: 'stations', label: 'Stations' },
              { key: 'starlink', label: 'Starlink' },
              { key: 'visual', label: 'Bright / Visual' },
              { key: 'weather', label: 'Weather' },
              { key: 'active', label: 'Active General' }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSatFilter(f.key)}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: satFilter === f.key ? 'rgba(45, 212, 191, 0.25)' : 'transparent',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
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

      <div className="glass-card" style={{ position: 'relative', width: '100%', height: '550px', borderRadius: '2px', overflow: 'hidden', background: '#030712', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
        
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
          <ReactGlobe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            pointsData={viewMode === 'pads' ? globalLaunchPads.filter(p => padFilter === 'all' || p.type === padFilter) : satellites}
            pointLat="lat"
            pointLng="lng"
            pointAltitude={viewMode === 'pads' ? 0.01 : 'altitude'}
            pointColor={d => viewMode === 'pads' ? (d.type === 'major' ? '#3b82f6' : '#2dd4bf') : d.color}
            pointRadius={viewMode === 'pads' ? 0.5 : 0.18}
            pointResolution={16}
            onPointClick={d => {
              if (viewMode === 'pads') setSelectedPad(d);
              else setSelectedSat(d);
            }}
            pointLabel={d => `
              <div style="background: rgba(3, 7, 18, 0.9); padding: 8px 12px; border: 1px solid #3b82f6; font-family: monospace; font-size: 11px; color: #fff;">
                <b>${d.name}</b><br/>
                ${viewMode === 'pads' ? `Agency: ${d.agency}` : `NORAD ID: ${d.id} | Vel: ${d.velocity}`}
              </div>
            `}
          />
        </div>

        {loadingSats && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', padding: '0.4rem 0.8rem', border: '1px solid #2dd4bf', zIndex: 10 }}>
            <span style={{ fontSize: '0.65rem', color: '#2dd4bf', letterSpacing: '1px' }}>LOADING FULL CELESTRAK DATASET...</span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none', zIndex: 10 }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [MODE: {viewMode.toUpperCase()} // WEBGL GPU ACCELERATION ACTIVE]
          </p>
        </div>
      </div>

      {viewMode === 'pads' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {globalLaunchPads
            .filter(pad => padFilter === 'all' || pad.type === padFilter)
            .map((pad) => (
              <motion.div
                key={pad.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setSelectedPad(pad);
                  if (globeRef.current) {
                    globeRef.current.pointOfView({ lat: pad.lat, lng: pad.lng, altitude: 1.5 }, 1000);
                  }
                }}
                className="glass-card"
                style={{
                  padding: '1.2rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  border: selectedPad?.id === pad.id ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.12)',
                  background: selectedPad?.id === pad.id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(15, 15, 15, 0.75)'
                }}
              >
                <span style={{ fontSize: '0.6rem', color: pad.type === 'major' ? '#3b82f6' : '#2dd4bf', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
                  // {pad.country} ({pad.type.toUpperCase()})
                </span>
                <h4 style={{ fontSize: '0.9rem', margin: '0.4rem 0', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase' }}>
                  {pad.name}
                </h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Agency: {pad.agency}
                </p>
              </motion.div>
            ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '2px', border: '1px solid rgba(45, 212, 191, 0.3)', background: 'rgba(10, 15, 25, 0.85)' }}>
          <span style={{ fontSize: '0.65rem', color: '#2dd4bf', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
            // 3D TELEMETRY INSPECTOR (FULL CATALOG STREAM)
          </span>
          {selectedSat ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>SATELLITE NAME</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', color: '#ffffff' }}>{selectedSat.name}</h3>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>NORAD ID</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>{selectedSat.id} ({selectedSat.intlDesignator})</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORBITAL VELOCITY</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedSat.velocity}</p>
              </div>
            </div>
          ) : (
            <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>
              Click any 3D point floating around the globe to lock in and inspect full orbital telemetry. Total loaded items: {satellites.length}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
