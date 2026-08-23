'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const globalLaunchPads = [
  // USA
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lon: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lon: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lon: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lon: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lon: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Pacific Spaceport Complex (Alaska)', agency: 'Astra / USSF', lat: 57.4358, lon: -152.3477, type: 'minor', country: 'USA' },

  // Europe & South America
  { id: 7, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lon: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 8, name: 'Esrange Space Center', agency: 'SSC', lat: 67.8894, lon: 21.1050, type: 'minor', country: 'Sweden' },
  { id: 9, name: 'Andøya Spaceport', agency: 'Andøya Space', lat: 69.2933, lon: 16.0167, type: 'minor', country: 'Norway' },

  // Asia (Russia, India, China, Japan)
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lon: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 11, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lon: 40.5735, type: 'major', country: 'Russia' },
  { id: 12, name: 'Vostochny Cosmodrome', agency: 'Roscosmos', lat: 51.8841, lon: 128.3339, type: 'major', country: 'Russia' },
  { id: 13, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lon: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lon: 100.2917, type: 'major', country: 'China' },
  { id: 15, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lon: 110.9510, type: 'major', country: 'China' },
  { id: 16, name: 'Xichang Satellite Launch Center', agency: 'CNSA', lat: 28.2465, lon: 102.0264, type: 'minor', country: 'China' },
  { id: 17, name: 'Taiyuan Satellite Launch Center', agency: 'CNSA', lat: 38.8490, lon: 111.6080, type: 'minor', country: 'China' },
  { id: 18, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lon: 130.9700, type: 'major', country: 'Japan' },
  { id: 19, name: 'Uchinoura Space Center', agency: 'JAXA', lat: 31.2515, lon: 131.0825, type: 'minor', country: 'Japan' },
  { id: 20, name: 'Naro Space Center', agency: 'KARI', lat: 34.4315, lon: 127.5350, type: 'minor', country: 'South Korea' },

  // Oceania
  { id: 21, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lon: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 22, name: 'Arnhem Space Centre', agency: 'Equatorial Launch Australia', lat: -12.3780, lon: 136.8150, type: 'minor', country: 'Australia' }
];

export default function OrbitalGlobe() {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('pads'); // 'pads', 'satellites'
  const [padFilter, setPadFilter] = useState('all'); 
  const [satFilter, setSatFilter] = useState('all'); 
  const [selectedPad, setSelectedPad] = useState(null);
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);
  
  const [countriesData, setCountriesData] = useState([]);
  const [satellites, setSatellites] = useState([]);

  const rotationRef = useRef({ x: 0.2, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const mouseCanvasPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        if (data && data.features) setCountriesData(data.features);
      })
      .catch(err => console.log('GeoJSON load note:', err));

    const mockLiveSatellites = Array.from({ length: 50 }, (_, i) => {
      let category = 'LEO';
      let name = `COSMOS DEBRIS-${200 + i}`;
      let incl = Math.sin(i * 1.3) * 65;
      let alt = 400 + (i * 20);
      let vel = '7.66 km/s';

      if (i === 0) {
        name = 'ISS (ZARYA)';
        category = 'Station';
        incl = 51.6;
        alt = 420;
        vel = '7.66 km/s';
      } else if (i < 15) {
        name = `STARLINK-${1000 + i}`;
        category = 'Starlink';
        incl = 53.0;
        alt = 550;
        vel = '7.56 km/s';
      } else if (i % 3 === 0) {
        category = 'MEO';
        alt = 20200;
        incl = 55.0;
        vel = '3.87 km/s';
      } else if (i % 5 === 0) {
        category = 'GEO';
        alt = 35786;
        incl = 0.1;
        vel = '3.07 km/s';
      }

      return {
        id: i,
        name,
        category,
        lat: incl,
        lon: (i * 28) % 360 - 180,
        altitude: alt,
        velocity: vel,
        inclination: `${incl.toFixed(1)}°`
      };
    });
    setSatellites(mockLiveSatellites);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth || 600);
    let height = (canvas.height = 500);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement.clientWidth || 600;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseCanvasPosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;
      
      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x - deltaY * 0.005));
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = () => {
      if (viewMode !== 'satellites') return;
      const globeRadius = Math.min(width, height) * 0.38;
      const centerX = width / 2;
      const centerY = height / 2;

      const filteredSats = satellites.filter(s => satFilter === 'all' || s.category === satFilter);
      let clickedItem = null;

      filteredSats.forEach((sat) => {
        const currentLon = (sat.lon + rotationRef.current.y * (sat.category === 'GEO' ? 2 : 12)) % 360;
        const pt = projectCoordinates(sat.lat, currentLon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
        if (pt.visible) {
          const dist = Math.hypot(pt.x - mouseCanvasPosRef.current.x, pt.y - mouseCanvasPosRef.current.y);
          if (dist < 10) clickedItem = sat;
        }
      });

      if (clickedItem) setSelectedSat(clickedItem);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleClick);

    const projectCoordinates = (lat, lon, radius, rotX, rotY, centerX, centerY) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180) + rotY;

      let x = -radius * Math.sin(phi) * Math.cos(theta);
      let y = -radius * Math.cos(phi); 
      let z = radius * Math.sin(phi) * Math.sin(theta);

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z * sinX;
      const z2 = y * sinX + z * cosX;

      return {
        x: centerX + x,
        y: centerY + y2,
        visible: z2 > 0
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const globeRadius = Math.min(width, height) * 0.38;

      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.0015;
      }

      const gradient = ctx.createRadialGradient(centerX, centerY, globeRadius * 0.9, centerX, centerY, globeRadius * 1.2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.lineWidth = 1;

      countriesData.forEach((feature) => {
        const geom = feature.geometry;
        if (!geom) return;
        const coordsLists = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];

        coordsLists.forEach((polygon) => {
          polygon.forEach((ring) => {
            ctx.beginPath();
            let hasStarted = false;
            ring.forEach(([lon, lat]) => {
              const pt = projectCoordinates(lat, lon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
              if (pt.visible) {
                if (!hasStarted) { ctx.moveTo(pt.x, pt.y); hasStarted = true; }
                else { ctx.lineTo(pt.x, pt.y); }
              } else { hasStarted = false; }
            });
            ctx.stroke();
          });
        });
      });

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (viewMode === 'pads') {
        const filteredPads = globalLaunchPads.filter(pad => padFilter === 'all' || pad.type === padFilter);
        filteredPads.forEach((pad) => {
          const pt = projectCoordinates(pad.lat, pad.lon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
          if (pt.visible) {
            const isSelected = selectedPad?.id === pad.id;
            ctx.fillStyle = pad.type === 'major' ? '#3b82f6' : '#2dd4bf';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isSelected ? 6 : 4, 0, Math.PI * 2);
            ctx.fill();

            if (pad.type === 'major') {
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        });
      } else {
        let currentHover = null;
        const filteredSats = satellites.filter(s => satFilter === 'all' || s.category === satFilter);

        filteredSats.forEach((sat) => {
          const currentLon = (sat.lon + rotationRef.current.y * (sat.category === 'GEO' ? 2 : 12)) % 360;
          const pt = projectCoordinates(sat.lat, currentLon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
          
          if (pt.visible) {
            const dist = Math.hypot(pt.x - mouseCanvasPosRef.current.x, pt.y - mouseCanvasPosRef.current.y);
            if (dist < 10) currentHover = sat;

            const isHovered = hoveredSat?.id === sat.id;
            const isSelected = selectedSat?.id === sat.id;

            if (isHovered || isSelected) {
              ctx.strokeStyle = isHovered ? 'rgba(45, 212, 191, 0.6)' : 'rgba(59, 130, 246, 0.8)';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              for (let lonStep = -180; lonStep <= 180; lonStep += 5) {
                const ringLon = (lonStep + rotationRef.current.y * (sat.category === 'GEO' ? 2 : 12)) % 360;
                const orbitPt = projectCoordinates(sat.lat, ringLon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
                if (orbitPt.visible) {
                  if (lonStep === -180) ctx.moveTo(orbitPt.x, orbitPt.y);
                  else ctx.lineTo(orbitPt.x, orbitPt.y);
                }
              }
              ctx.stroke();
            }

            ctx.fillStyle = sat.category === 'Station' ? '#22c55e' : sat.category === 'Starlink' ? '#38bdf8' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isHovered || isSelected ? 5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        setHoveredSat(currentHover);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, padFilter, satFilter, selectedPad, selectedSat, hoveredSat, countriesData, satellites]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
            // DISPLAY MODE:
          </span>
          {[
            { key: 'pads', label: 'Launch Pads' },
            { key: 'satellites', label: 'Live Satellite Radar' }
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
            {['all', 'LEO', 'MEO', 'GEO', 'Starlink', 'Station'].map((f) => (
              <button
                key={f}
                onClick={() => setSatFilter(f)}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: satFilter === f ? 'rgba(45, 212, 191, 0.25)' : 'transparent',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
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

      <div className="glass-card" style={{ position: 'relative', borderRadius: '2px', overflow: 'hidden', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
        
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [MODE: {viewMode.toUpperCase()} // HOVER FOR ORBIT PATH // CLICK OBJECT FOR DETAILS]
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
                onClick={() => setSelectedPad(pad)}
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
            // SATELLITE TELEMETRY INSPECTOR
          </span>
          {selectedSat ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.8rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>OBJECT NAME</p>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', color: '#ffffff' }}>{selectedSat.name}</h3>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORBIT TYPE</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#38bdf8', fontWeight: '700' }}>{selectedSat.category}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ALTITUDE</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedSat.altitude} km</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a' }}>ORBITAL VELOCITY</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedSat.velocity}</p>
              </div>
            </div>
          ) : (
            <p style={{ margin: '0.6rem 0 0 0', fontSize: '0.8rem', color: '#a1a1aa' }}>
              Click any satellite node on the globe radar to load telemetry specifications here.
            </p>
          )}
        </div>
      )}

    </div>
  );
}
