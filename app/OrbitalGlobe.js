'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const satCacheRef = useRef({});

  useEffect(() => {
    const fetchRealSatellites = async () => {
      let queryGroup = 'stations';
      if (satFilter === 'starlink') queryGroup = 'starlink';
      else if (satFilter === 'visual') queryGroup = 'visual';
      else if (satFilter === 'weather') queryGroup = 'weather';
      else if (satFilter === 'active') queryGroup = 'active';

      if (satCacheRef.current[queryGroup]) {
        setSatellites(satCacheRef.current[queryGroup]);
        return;
      }

      setLoadingSats(true);
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${queryGroup}&FORMAT=json`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const formattedSats = data.map((sat, index) => {
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
            else if (nameStr.includes('COSMOS') || nameStr.includes('GLONASS')) org = 'Roscosmos (Russia)';
            else if (nameStr.includes('GPS') || nameStr.includes('USA')) org = 'US Space Force';
            else if (nameStr.includes('METEOR')) org = 'Roshydromet (Russia)';
            else if (nameStr.includes('ONEWEB')) org = 'OneWeb (UK)';

            return {
              id: sat.NORAD_CAT_ID || index,
              name: nameStr,
              lat: incl > 90 ? 180 - incl : incl,
              lng: (index * 15) % 360 - 180,
              altitude: alt / 3000, 
              color: nameStr.includes('ISS') ? '#22c55e' : nameStr.includes('STARLINK') ? '#38bdf8' : '#3b82f6',
              velocity: `${(Math.sqrt(398600 / (6371 + alt))).toFixed(2)} km/s`,
              intlDesignator: sat.INTLDES || 'N/A',
              organization: org
            };
          });

          satCacheRef.current[queryGroup] = formattedSats;
          setSatellites(formattedSats);
        }
      } catch (err) {
        console.log('Network block fallback triggered:', err);
      } finally {
        setLoadingSats(false);
      }
    };

    fetchRealSatellites();
  }, [satFilter]);

  useEffect(() => {
    let frameId;
    const rotateGlobe = () => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.3;
          controls.update();
        }
      }
      frameId = requestAnimationFrame(rotateGlobe);
    };
    rotateGlobe();
    return () => cancelAnimationFrame(frameId);
  }, []);

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

      <div className="glass-card" style={{ position: 'relative', width: '100%', height: '600px', borderRadius: '2px', overflow: 'hidden', background: '#030712', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        
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
            pointRadius={viewMode === 'pads' ? 0.6 : 0.18}
            pointResolution={16}
            ringsData={selectedSat ? [selectedSat] : []}
            ringColor={() => '#38bdf8'}
            ringMaxRadius={2}
            ringPropagationSpeed={3}
            onPointClick={d => {
              if (viewMode === 'pads') setSelectedPad(d);
              else setSelectedSat(d);
            }}
            pointLabel={d => `
              <div style="background: rgba(3, 7, 18, 0.95); padding: 10px 14px; border: 1px solid #3b82f6; font-family: monospace; font-size: 11px; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <b style="color: #38bdf8; font-size: 12px;">${d.name}</b><br/>
                ${viewMode === 'pads' ? `Agency: ${d.agency}<br/>Country:${d.country}` : `Org: ${d.organization}<br/>NORAD ID: ${d.id} \vert{} Vel:${d.velocity}`}
              </div>
            `}
          />
        </div>

        {loadingSats && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(0,0,0,0.85)', padding: '0.4rem 0.8rem', border: '1px solid #2dd4bf', zIndex: 10 }}>
            <span style={{ fontSize: '0.65rem', color: '#2dd4bf', letterSpacing: '1px' }}>STREAMING FULL CATALOG ({satellites.length || 'LIVE'})...</span>
          </div>
        )}

        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none', zIndex: 10 }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [MODE: {viewMode.toUpperCase()} // WEBGL GPU ACCELERATION ACTIVE]
          </p>
        </div>
      </div>

      {viewMode === 'pads' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.5rem' }}>
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
            // 3D TELEMETRY & ORGANIZATION INSPECTOR
          </span>
          {selectedSat ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>SATELLITE NAME</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', color: '#ffffff' }}>{selectedSat.name}</h3>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>OPERATING ORGANIZATION / AGENCY</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#2dd4bf', fontWeight: '700' }}>{selectedSat.organization}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>NORAD ID & DESIGNATOR</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>{selectedSat.id} ({selectedSat.intlDesignator})</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORBITAL VELOCITY</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff'
