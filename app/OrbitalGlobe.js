'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Sample global launch pad coordinates database
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
  const [filter, setFilter] = useState('all'); // 'all', 'major', 'minor'
  const [selectedPad, setSelectedPad] = useState(null);
  
  // Globe rotation angles
  const rotationRef = useRef({ x: 0.2, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

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

    // Mouse drag handlers to spin the globe manually
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

    // Helper: Convert lat/lon to 3D spherical coordinates projected on 2D canvas
    const projectCoordinates = (lat, lon, radius, rotX, rotY, centerX, centerY) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180) + rotY;

      // 3D spherical coordinates
      let x = -radius * Math.sin(phi) * Math.cos(theta);
      let y = radius * Math.cos(phi);
      let z = radius * Math.sin(phi) * Math.sin(theta);

      // Apply pitch rotation (rotX)
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z * sinX;
      const z2 = y * sinX + z * cosX;

      return {
        x: centerX + x,
        y: centerY + y2,
        visible: z2 > 0 // Only show points facing the user
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const globeRadius = Math.min(width, height) * 0.38;

      // Auto-rotate slowly when not dragging
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.003;
      }

      // Draw Globe Outer Glow / Atmosphere
      const gradient = ctx.createRadialGradient(centerX, centerY, globeRadius * 0.9, centerX, centerY, globeRadius * 1.2);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Draw Globe Base Circle
      ctx.fillStyle = '#050b14';
      ctx.beginPath();
      ctx.arc(centerX, centerY, globeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Latitude / Longitude Grid Lines for 3D effect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 10) {
          const pt = projectCoordinates(lat, lon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);
          if (pt.visible) {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.stroke();
      }

      // Filter pads based on active UI choice
      const filteredPads = globalLaunchPads.filter(pad => {
        if (filter === 'all') return true;
        return pad.type === filter;
      });

      // Draw Launch Pad Nodes on Globe
      filteredPads.forEach((pad) => {
        const pt = projectCoordinates(pad.lat, pad.lon, globeRadius, rotationRef.current.x, rotationRef.current.y, centerX, centerY);

        if (pt.visible) {
          const isSelected = selectedPad?.id === pad.id;
          
          ctx.fillStyle = pad.type === 'major' ? '#3b82f6' : '#2dd4bf';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isSelected ? 6 : 4, 0, Math.PI * 2);
          ctx.fill();

          // Outer pulsing ring for major spaceports
          if (pad.type === 'major') {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      });

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
  }, [filter, selectedPad]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* FILTER BUTTONS BAR */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '700' }}>
          // PAD FILTERS:
        </span>
        {[
          { key: 'all', label: 'All Global Pads' },
          { key: 'major', label: 'Major Spaceports' },
          { key: 'minor', label: 'Commercial / Minor Pads' }
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              padding: '0.5rem 1rem',
              background: filter === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filter === btn.key ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
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

      {/* 3D GLOBE CONTAINER */}
      <div className="glass-card" style={{ position: 'relative', borderRadius: '2px', overflow: 'hidden', height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
        
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '1.5rem', pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [INTERACTIVE: CLICK & DRAG TO ROTATE GLOBE]
          </p>
        </div>
      </div>

      {/* PAD SELECTOR CARDS LIST */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {globalLaunchPads
          .filter(pad => filter === 'all' || pad.type === filter)
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

    </div>
  );
}
