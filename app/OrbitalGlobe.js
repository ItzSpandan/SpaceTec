'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lon: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Vandenberg Space Force Base', agency: 'SpaceX / USSF', lat: 34.7420, lon: -120.5724, type: 'major', country: 'USA' },
  { id: 3, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lon: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 4, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lon: 130.9700, type: 'major', country: 'Japan' },
  { id: 5, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lon: 80.2304, type: 'major', country: 'India' },
  { id: 6, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lon: 110.9510, type: 'major', country: 'China' },
  { id: 7, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lon: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 8, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lon: 63.3052, type: 'major', country: 'Kazakhstan' }
];

export default function OrbitalGlobe() {
  const canvasRef = useRef(null);
  const [viewMode, setViewMode] = useState('pads'); // 'pads', 'satellites'
  const [filter, setFilter] = useState('all'); 
  const [selectedPad, setSelectedPad] = useState(null);
  const [countriesData, setCountriesData] = useState([]);
  const [satellites, setSatellites] = useState([]);

  const rotationRef = useRef({ x: 0.2, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Fetch simplified country borders GeoJSON on mount
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        if (data && data.features) {
          setCountriesData(data.features);
        }
      })
      .catch(err => console.log('GeoJSON load note:', err));

    // Simulated real-time orbital tracking objects feed (Mocking live radar positions based on real inclinations)
    const mockLiveSatellites = Array.from({ length: 45 }, (_, i) => ({
      id: i,
      name: i === 0 ? 'ISS (ZARYA)' : i < 15 ? `STARLINK-${1000 + i}` : `COSMOS/DEBRIS-${200 + i}`,
      lat: Math.sin(i * 1.5) * 55, // orbital inclination bounds
      lon: (i * 35 + Date.now() * 0.01) % 360 - 180,
      altitude: 400 + (i * 15)
    }));
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

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const projectCoordinates = (lat, lon, radius, rotX, rotY, centerX, centerY) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180) + rotY;

      let x = -radius * Math.sin(phi) * Math.cos(theta);
      let y = radius * Math.cos(phi);
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
        rotationRef.current.y += 0.002;
      }

      // Atmosphere Glow
      const gradient = ctx.createRadialGradient(centerX, centerY, globeRadius * 0.9, centerX, centerY, globeRadius * 1.2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Globe Base Fill
      ctx.fillStyle = '#030712';
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Render Country Outlines from GeoJSON
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
                if (!hasStarted) {
                  ctx.moveTo(pt.x, pt.y);
                  hasStarted = true;
                } else {
                  ctx.lineTo(pt.x, pt.y);
                }
              } else {
                hasStarted = false;
              }
            });
            ctx.stroke();
          });
        });
      });

      // Globe Rim Stroke
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Mode 1: Launch Pads View
      if (viewMode === 'pads') {
        const filteredPads = globalLaunchPads.filter(pad => filter === 'all' || pad.type === filter);
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
      } 
      // Mode 2: Satellite Radar View
      else {
        satellites.forEach((sat) => {
          // Dynamic drift simulation for radar feel
          const currentLon = (sat.lon + rotationRef.current.y * 15) % 360;
          const pt = projectCoordinates(sat.lat, currentLon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
          
          if (pt.visible) {
            ctx.fillStyle = sat.name.includes('ISS') ? '#22c55e' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, sat.name.includes('ISS') ? 4 : 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, filter, selectedPad, countriesData, satellites]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* VIEW MODE TOGGLE BAR */}
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
              onClick={() => setViewMode(btn.key)}
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

        {viewMode === 'pads' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['all', 'major', 'minor'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: filter === f ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
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
        )}
      </div>

      {/* 3D CANVAS GLOBE CONTAINER */}
      <div className="glass-card" style={{ position: 'relative', borderRadius: '2px', overflow: 'hidden', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
        
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [MODE: {viewMode.toUpperCase()} // DRAG TO ROTATE GLOBE]
          </p>
        </div>
      </div>

    </div>
  );
}
