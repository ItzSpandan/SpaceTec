'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeAgency, setActiveAgency] = useState(null);
  const canvasRef = useRef(null);

  const spaceBackgrounds = [
    apodData?.media_type === 'image' ? apodData.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069'
  ];

  // 5 Main Agencies with custom interactive gradient/motion styles
  const agencies = [
    {
      id: 'spacex',
      name: 'SPACEX',
      tagline: 'STARSHIP ORBITAL FLEET',
      bgGradient: 'linear-gradient(180deg, rgba(255,102,0,0.3) 0%, rgba(15,15,15,0.95) 100%)',
      accentColor: '#ff6600',
      specialty: 'Starship Super Heavy Launch & Reusable Mars Architecture'
    },
    {
      id: 'nasa',
      name: 'NASA',
      tagline: 'SATURN V & ARTEMIS DEEP SPACE',
      bgGradient: 'linear-gradient(180deg, rgba(11,61,145,0.4) 0%, rgba(15,15,15,0.95) 100%)',
      accentColor: '#3b82f6',
      specialty: 'Saturn V Lunar Legacy, Webb Telescope & Artemis Moon Missions'
    },
    {
      id: 'isro',
      name: 'ISRO',
      tagline: 'GSLV MK III & CHANDRAYAAN',
      bgGradient: 'linear-gradient(180deg, rgba(255,153,51,0.35) 0%, rgba(15,15,15,0.95) 100%)',
      accentColor: '#ff9933',
      specialty: 'GSLV Heavy Launcher, Chandrayaan South Pole & Gaganyaan'
    },
    {
      id: 'esa',
      name: 'ESA',
      tagline: 'ARIANE 6 & COSMIC VISION',
      bgGradient: 'linear-gradient(180deg, rgba(0,51,153,0.4) 0%, rgba(15,15,15,0.95) 100%)',
      accentColor: '#60a5fa',
      specialty: 'Ariane 6 Heavy Lift System & Euclid Dark Energy Mapping'
    },
    {
      id: 'jaxa',
      name: 'JAXA',
      tagline: 'H3 LAUNCHER & ASTEROID SAMPLING',
      bgGradient: 'linear-gradient(180deg, rgba(20,184,166,0.35) 0%, rgba(15,15,15,0.95) 100%)',
      accentColor: '#2dd4bf',
      specialty: 'H3 Next-Gen Rocket & Hayabusa Asteroid Sample Return'
    }
  ];

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const autoEnterTimer = setTimeout(() => {
      setEntered(true);
    }, 2500);
    return () => clearTimeout(autoEnterTimer);
  }, []);

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

        .space-bg-layer {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transition: opacity 1.8s ease-in-out;
          filter: brightness(0.4) contrast(1.25);
        }

        .dark-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%),
                      linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%);
          z-index: 1;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(15, 15, 15, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .content-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          box-sizing: border-box;
          width: 100%;
        }

        .agency-column {
          position: relative;
          height: 480px;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
          cursor: pointer;
          transition: flex 0.6s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.2rem 1.4rem;
          box-sizing: border-box;
        }

        .agency-column:last-child {
          border-right: none;
        }

        .agency-column-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          transition: transform 0.8s ease, opacity 0.5s ease;
        }

        .agency-column:hover .agency-column-bg {
          transform: scale(1.08);
        }
      `}</style>

      {/* BACKGROUND IMAGES */}
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

      {/* STARFIELD CANVAS */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* HEADER */}
      <motion.header 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 100,
          backgroundColor: entered ? 'rgba(0, 0, 0, 0.85)' : 'transparent',
          backdropFilter: entered ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: entered ? 'blur(16px)' : 'none',
          borderBottom: entered ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid transparent',
          transition: 'background-color 0.6s ease, backdrop-filter 0.6s ease, border-color 0.6s ease'
        }}
      >
        <div className="content-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {entered && (
              <motion.span
                layoutId="spacetec-brand"
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  fontSize: '1.25rem',
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

          <motion.div 
            animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : -10 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', fontSize: '0.75rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8' }}
          >
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Live Telemetry</span>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <span>Agencies</span>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <span>Orbital Map</span>
          </motion.div>
        </div>
      </motion.header>

      {/* INTRO OVERLAY */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <motion.div
                layoutId="spacetec-brand"
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.12em' }}
                animate={{ opacity: 1, scale: 1, letterSpacing: '0.22em' }}
              >
                <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', filter: 'drop-shadow(0 0 35px rgba(255,255,255,0.25))' }}>
                  SPACETEC
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#a1a1aa', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
              >
                UNIFIED COSMIC INTELLIGENCE
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div style={{ position: 'relative', zIndex: 3, paddingTop: '8rem' }}>
        
        {/* HERO SECTION */}
        <section className="content-container" style={{ paddingBottom: '4rem' }}>
          <motion.div 
            initial="hidden"
            animate={entered ? "visible" : "hidden"}
            variants={staggerContainer}
            style={{ maxWidth: '850px' }}
          >
            <motion.p variants={fadeInUp} style={{ fontSize: '0.75rem', letterSpacing: '6px', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '1.5rem', fontWeight: '600' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </motion.p>
            
            <motion.h2 variants={fadeInUp} style={{ fontSize: 'calc(2.2rem + 3vw)', fontWeight: '900', lineHeight: '1.05', letterSpacing: '2px', margin: '0 0 2rem 0', textTransform: 'uppercase', color: '#ffffff' }}>
              HUMANITY'S GATEWAY TO THE COSMOS.
            </motion.h2>

            <motion.p variants={fadeInUp} style={{ fontSize: '1.05rem', color: '#d4d4d8', lineHeight: '1.7', maxWidth: '650px', marginBottom: '2.5rem', fontWeight: '300' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from NASA, SpaceX, ISRO, ESA, and JAXA.
            </motion.p>
            
            <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
              <motion.button 
                whileHover={{ scale: 1.03, backgroundColor: '#ffffff', color: '#000000' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: '#ffffff', color: '#000000', border: '1px solid #ffffff', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900', fontSize: '0.75rem', padding: '1rem 2.2rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                EXPLORE LAUNCHES
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: '#ffffff' }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'transparent', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '900', fontSize: '0.75rem', padding: '1rem 2.2rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              >
                TELEMETRY DATA
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* TELEMETRY STRIP */}
        <section className="content-container" style={{ paddingBottom: '5rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card" 
            style={{ padding: '2rem 2.5rem', borderRadius: '2px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}
          >
            {[
              { label: 'DEEP SPACE OBSERVATION', val: apodData?.title ? apodData.title.slice(0, 20) + '...' : 'NASA APOD' },
              { label: 'NETWORK NODES', val: 'NASA • ISRO • SPACEX' },
              { label: 'NEXT LAUNCH WINDOW', val: upcomingLaunches[0] ? new Date(upcomingLaunches[0].net).toLocaleDateString() : 'SYNCING...' },
              { label: 'SYSTEM STATUS', val: 'ONLINE / OPTICAL' }
            ].map((stat, idx) => (
              <div key={idx} style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '1px', color: '#ffffff', textTransform: 'uppercase', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stat.val}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* FEATURED OBSERVATION */}
        {apodData && (
          <section className="content-container" style={{ paddingBottom: '5rem' }}>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="glass-card" 
              style={{ padding: '3rem', borderRadius: '2px' }}
            >
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // TODAY'S FEATURED DEEP SPACE OBSERVATION
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '1rem 0 1.2rem 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                {apodData.title}
              </h2>
              <p style={{ color: '#a1a1aa', lineHeight: '1.8', maxWidth: '900px', fontSize: '0.95rem', margin: 0, fontWeight: '300' }}>
                {apodData.explanation}
              </p>
            </motion.div>
          </section>
        )}

        {/* EXPLORE SPACE AGENCIES ACROSS THE GLOBE (5 DIVISIONS) */}
        <section className="content-container" style={{ paddingBottom: '6rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
              // GLOBAL AEROSPACE ARCHITECTURE
            </span>
            <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
              EXPLORE SPACE AGENCIES ACROSS THE GLOBE
            </h2>
          </div>

          <div className="glass-card" style={{ display: 'flex', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
            {agencies.map((agency) => {
              const isHovered = activeAgency === agency.id;
              return (
                <div
                  key={agency.id}
                  className="agency-column"
                  style={{ flex: isHovered ? 2.5 : 1 }}
                  onMouseEnter={() => setActiveAgency(agency.id)}
                  onMouseLeave={() => setActiveAgency(null)}
                >
                  {/* Dynamic Gradient / Atmosphere Canvas */}
                  <div
                    className="agency-column-bg"
                    style={{
                      background: agency.bgGradient,
                      opacity: isHovered ? 1 : 0.5
                    }}
                  />

                  {/* Agency Number */}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: isHovered ? agency.accentColor : '#a1a1aa', fontWeight: '800', transition: 'color 0.3s ease' }}>
                      // 0{agencies.indexOf(agency) + 1}
                    </span>
                  </div>

                  {/* Content Container */}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '3px', margin: '0 0 0.5rem 0', color: '#ffffff', textTransform: 'uppercase' }}>
                      {agency.name}
                    </h3>
                    
                    <p style={{ fontSize: '0.65rem', letterSpacing: '2px', color: agency.accentColor, textTransform: 'uppercase', margin: '0 0 0.8rem 0', fontWeight: '700' }}>
                      {agency.tagline}
                    </p>

                    <p style={{ fontSize: '0.75rem', color: '#d4d4d8', lineHeight: '1.5', margin: 0, opacity: isHovered ? 1 : 0.7, transition: 'opacity 0.3s ease' }}>
                      {agency.specialty}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* EXPLORE MORE AGENCIES BAR */}
          <motion.div 
            whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: '#ffffff' }}
            style={{ marginTop: '1.5rem', padding: '1.2rem', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.2)', cursor: 'pointer', background: 'rgba(10, 10, 10, 0.6)', transition: 'all 0.3s ease' }}
          >
            <span style={{ fontSize: '0.75rem', letterSpacing: '4px', fontWeight: '900', textTransform: 'uppercase', color: '#ffffff' }}>
              EXPLORE MORE AGENCIES →
            </span>
          </motion.div>
        </section>

        {/* UPCOMING GLOBAL LAUNCHES GRID */}
        <section className="content-container" style={{ paddingBottom: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}
          >
            {upcomingLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                variants={fadeInUp}
                whileHover={{ y: -6, borderColor: '#ffffff' }}
                className="glass-card" 
                style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                      {launch.launch_service_provider?.name || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 1rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
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
