'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const canvasRef = useRef(null);

  // Dynamic list of dark space photographs for cycling background
  const spaceBackgrounds = [
    apodData?.media_type === 'image' ? apodData.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069'
  ];

  // Rotate background photography every 7 seconds
  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, [spaceBackgrounds.length]);

  // Ambient Star Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Trigger smooth scroll transition into dashboard
  useEffect(() => {
    if (entered) return;

    const handleScroll = (e) => {
      if (e.deltaY > 5) setEntered(true);
    };

    const handleTouch = () => setEntered(true);

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [entered]);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '"Space Grotesk", -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap');

        @keyframes scrollPulse {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(8px); opacity: 1; }
        }

        .space-bg-layer {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transition: opacity 1.8s ease-in-out;
          filter: brightness(0.45) contrast(1.2);
        }

        .dark-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.95) 100%),
                      linear-gradient(180deg, rgba(0,0,0,0.6) 0%, #000000 100%);
          z-index: 1;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(15, 15, 15, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {/* DYNAMIC CROSS-FADING DARK SPACE PHOTOGRAPHY BACKGROUND */}
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={bgUrl}
          className="space-bg-layer"
          style={{
            backgroundImage: `url('${bgUrl}')`,
            opacity: bgIndex === idx ? 1 : 0
          }}
        />
      ))}
      <div className="dark-overlay" />

      {/* AMBIENT STARFIELD CANVAS */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* NAVIGATION HEADER */}
      <motion.header 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          padding: '2.5rem 3.5rem',
          pointerEvents: entered ? 'auto' : 'none'
        }}
      >
        {/* LOGO (Positioned top-left once entered) */}
        <div style={{ height: '2rem', display: 'flex', alignItems: 'center' }}>
          {entered && (
            <motion.span
              layoutId="spacetec-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: '1.3rem',
                fontWeight: '900',
                letterSpacing: '8px',
                color: '#ffffff',
                textTransform: 'uppercase',
                display: 'inline-block'
              }}
            >
              SPACETEC
            </motion.span>
          )}
        </div>

        {/* TOP RIGHT MENU ITEMS */}
        <motion.div 
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : -10 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{ display: 'flex', gap: '2.5rem', fontSize: '0.75rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8' }}
        >
          <span style={{ color: '#ffffff', fontWeight: '600' }}>Live Telemetry</span>
          <span>Agencies</span>
          <span>Orbital Map</span>
        </motion.div>
      </motion.header>

      {/* FULL-SCREEN INTRO OVERLAY */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between',
              alignItems: 'center',
              padding: '4rem 2rem'
            }}
          >
            <div />

            {/* SPACETEC CENTERPIECE (SLIDES TO HEADER ON ENTER) */}
            <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => setEntered(true)}>
              <motion.div
                layoutId="spacetec-brand"
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.12em' }}
                animate={{ opacity: 1, scale: 1, letterSpacing: '0.2em' }}
              >
                <h1 style={{
                  fontSize: 'calc(3.8rem + 5vw)',
                  fontWeight: '900',
                  margin: 0,
                  textTransform: 'uppercase',
                  color: '#ffffff',
                  filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.2))'
                }}>
                  SPACETEC
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{
                  fontSize: 'calc(0.75rem + 0.3vw)',
                  letterSpacing: '10px',
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  marginTop: '1.8rem',
                  fontWeight: '400'
                }}
              >
                Humanity's Gateway to the Cosmos
              </motion.p>
            </div>

            {/* SCROLL TO ENTER INDICATOR */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              onClick={() => setEntered(true)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '0.65rem', letterSpacing: '5px', color: '#71717a', textTransform: 'uppercase', fontWeight: '600' }}>
                SCROLL OR CLICK TO ENTER
              </span>
              <div style={{ animation: 'scrollPulse 2s infinite ease-in-out' }}>
                <svg width="16" height="24" viewBox="0 0 16 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0.5" y="0.5" width="15" height="23" rx="7.5" stroke="#ffffff" strokeOpacity="0.3"/>
                  <circle cx="8" cy="7" r="2" fill="#ffffff"/>
                </svg>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN DASHBOARD CONTENT */}
      <div style={{ position: 'relative', zIndex: 3, paddingTop: '10rem' }}>
        
        {/* HERO SECTION */}
        <section style={{ padding: '4rem 3.5rem', maxWidth: '1400px', margin: '0 auto' }}>
          <motion.div 
            initial="hidden"
            animate={entered ? "visible" : "hidden"}
            variants={staggerContainer}
            style={{ maxWidth: '900px' }}
          >
            <motion.p variants={fadeInUp} style={{ fontSize: '0.75rem', letterSpacing: '6px', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '1.5rem', fontWeight: '600' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </motion.p>
            
            <motion.h2 variants={fadeInUp} style={{ fontSize: 'calc(2.5rem + 3.5vw)', fontWeight: '900', lineHeight: '1.02', letterSpacing: '2px', margin: '0 0 2rem 0', textTransform: 'uppercase', color: '#ffffff' }}>
              HUMANITY'S GATEWAY TO THE COSMOS.
            </motion.h2>

            <motion.p variants={fadeInUp} style={{ fontSize: '1.1rem', color: '#d4d4d8', lineHeight: '1.7', maxWidth: '650px', marginBottom: '3rem', fontWeight: '300' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from NASA, SpaceX, ISRO, ESA, and JAXA.
            </motion.p>
            
            <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
              <motion.button 
                whileHover={{ scale: 1.03, backgroundColor: '#ffffff', color: '#000000' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: '#ffffff', color: '#000000', border: '1px solid #ffffff', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900', fontSize: '0.75rem', padding: '1rem 2.5rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                EXPLORE LAUNCHES
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: '#ffffff' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'transparent', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900', fontSize: '0.75rem', padding: '1rem 2.5rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                TELEMETRY DATA
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* STATS STRIP */}
        <section style={{ margin: '2rem 3.5rem 6rem 3.5rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card" 
            style={{ padding: '2rem 3rem', borderRadius: '2px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}
          >
            {[
              { label: 'DEEP SPACE OBSERVATION', val: apodData?.title ? apodData.title.slice(0, 24) + '...' : 'NASA APOD' },
              { label: 'NETWORK NODES', val: 'NASA • ISRO • SPACEX' },
              { label: 'NEXT LAUNCH WINDOW', val: upcomingLaunches[0] ? new Date(upcomingLaunches[0].net).toLocaleDateString() : 'SYNCING...' },
              { label: 'SYSTEM STATUS', val: 'ONLINE / OPTICAL' }
            ].map((stat, idx) => (
              <div key={idx}>
                <span style={{ fontSize: '0.65rem', color: '#71717a', letterSpacing: '3px', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '2px', color: '#ffffff', textTransform: 'uppercase' }}>
                  {stat.val}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* NASA APOD FEATURED OBSERVATION */}
        {apodData && (
          <section style={{ padding: '0 3.5rem 6rem 3.5rem', maxWidth: '1400px', margin: '0 auto' }}>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="glass-card" 
              style={{ padding: '3.5rem', borderRadius: '2px' }}
            >
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // TODAY'S FEATURED DEEP SPACE OBSERVATION
              </span>
              <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase', margin: '1rem 0 1.2rem 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                {apodData.title}
              </h2>
              <p style={{ color: '#a1a1aa', lineHeight: '1.8', maxWidth: '900px', fontSize: '0.95rem', margin: 0, fontWeight: '300' }}>
                {apodData.explanation}
              </p>
            </motion.div>
          </section>
        )}

        {/* UPCOMING LAUNCHES GRID */}
        <section style={{ padding: '0 3.5rem 8rem 3.5rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                UPCOMING GLOBAL LAUNCHES
              </h2>
            </div>
            <span style={{ fontSize: '0.7rem', letterSpacing: '3px', color: '#71717a', textTransform: 'uppercase' }}>
              AUTO-SYNCED DATA
            </span>
          </div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.8rem' }}
          >
            {upcomingLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                variants={fadeInUp}
                whileHover={{ y: -6, borderColor: '#ffffff' }}
                className="glass-card" 
                style={{ padding: '2.2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', padding: '0.3rem 0.7rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                      {launch.launch_service_provider?.name || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.8rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                    NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    PAD: {launch.pad?.location?.name || 'Vandenberg Space Force Base'}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

      </div>
    </div>
  );
}
