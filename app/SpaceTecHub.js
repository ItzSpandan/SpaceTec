'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [progress, setProgress] = useState(0);

  // High-tech booting progress counter
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 20);

    return () => clearInterval(timer);
  }, []);

  const bgImage = apodData?.media_type === 'image' 
    ? apodData.url 
    : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072';

  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  return (
    <div style={{ backgroundColor: '#020408', color: '#f8fafc', minHeight: '100vh', fontFamily: '"Space Grotesk", -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;600;700&display=swap');

        .nasa-backdrop {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-image: linear-gradient(180deg, rgba(2, 4, 8, 0.5) 0%, rgba(2, 4, 8, 0.88) 65%, #020408 100%), url('${bgImage}');
          background-size: cover;
          background-position: center;
          z-index: 0;
          filter: brightness(0.7) contrast(1.1);
        }

        .cyber-grid {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background-size: 60px 60px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          z-index: 1;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(10, 16, 28, 0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hud-line {
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent);
          pointer-events: none;
        }
      `}</style>

      {/* ACTIVE THEORY STYLE SPLASH INTRO OVERLAY */}
      <AnimatePresence style={{ zIndex: 9999 }}>
        {!entered && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: '#020408',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}
          >
            {/* Ambient Background Video Loop */}
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: 'absolute',
                width: '100vw',
                height: '100vh',
                objectFit: 'cover',
                opacity: 0.25,
                filter: 'grayscale(0.3) contrast(1.2)'
              }}
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-outer-space-and-stars-animation-41551-large.mp4" type="video/mp4" />
            </video>

            {/* Cyber Grid Overlay */}
            <div className="cyber-grid" style={{ zIndex: 1 }} />

            {/* Central HUD Loading Terminal */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '600px', width: '90%' }}>
              
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span style={{ fontSize: '0.75rem', letterSpacing: '4px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '700' }}>
                  // SPACETEC DEEP SPACE OPERATING SYSTEM
                </span>
                <h1 style={{ fontSize: '3rem', fontWeight: '900', letterSpacing: '6px', margin: '0.8rem 0 2rem 0', background: 'linear-gradient(180deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  SPACETEC
                </h1>
              </motion.div>

              {/* Progress HUD Bar */}
              <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)', position: 'relative', margin: '2rem 0', borderRadius: '2px', overflow: 'hidden' }}>
                <motion.div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    width: `${progress}%`,
                    boxShadow: '0 0 15px #38bdf8'
                  }}
                />
              </div>

              {/* Status Indicator */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', letterSpacing: '2px', color: '#64748b', marginBottom: '3rem' }}>
                <span>INITIALIZING ORBITAL LINK...</span>
                <span style={{ color: '#38bdf8', fontWeight: '700' }}>{progress}%</span>
              </div>

              {/* Trigger Interactive Enter Button when Ready */}
              {progress >= 100 ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, backgroundColor: '#38bdf8', color: '#000000', boxShadow: '0 0 40px rgba(56, 189, 248, 0.8)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEntered(true)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #38bdf8',
                    color: '#38bdf8',
                    padding: '1.2rem 3rem',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  INITIALIZE NEURAL LINK ↵
                </motion.button>
              ) : (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '3px', textTransform: 'uppercase' }}>
                  ESTABLISHING NASA TELEMETRY STREAM
                </span>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atmospheric Background */}
      <div className="nasa-backdrop"></div>
      <div className="cyber-grid"></div>

      {/* Main Container */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        
        {/* Navigation HUD */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: entered ? 1 : 0, y: entered ? 0 : -20 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 3rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '4px', background: 'linear-gradient(180deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              SPACETEC
            </span>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', letterSpacing: '2px', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.2rem 0.5rem', borderRadius: '2px' }}>
              SYS.VER.2026.1
            </span>
          </div>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', color: '#94a3b8' }}>
            <span style={{ color: '#fff' }}>● Live Telemetry</span>
            <span>Agencies</span>
            <span>Orbital Map</span>
          </div>
        </motion.header>

        {/* Hero Section */}
        <section style={{ padding: '7rem 3rem 4rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <motion.div 
            initial="hidden"
            animate={entered ? "visible" : "hidden"}
            variants={staggerContainer}
            style={{ maxWidth: '850px' }}
          >
            <motion.p variants={fadeInUp} style={{ fontSize: '0.8rem', letterSpacing: '4px', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '1.5rem', fontWeight: '700' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </motion.p>
            <motion.h1 variants={fadeInUp} style={{ fontSize: 'calc(2.5rem + 3vw)', fontWeight: '700', lineHeight: '1.05', letterSpacing: '-1px', margin: '0 0 2rem 0', textTransform: 'uppercase' }}>
              HUMANITY'S GATEWAY TO THE COSMOS.
            </motion.h1>
            <motion.p variants={fadeInUp} style={{ fontSize: '1.1rem', color: '#cbd5e1', lineHeight: '1.7', maxWidth: '620px', marginBottom: '2.5rem', fontWeight: '300' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from NASA, SpaceX, ISRO, ESA, and JAXA.
            </motion.p>
            
            <motion.div variants={fadeInUp} style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
              <motion.button 
                whileHover={{ scale: 1.04, backgroundColor: '#38bdf8', borderColor: '#38bdf8', boxShadow: '0 0 30px rgba(56, 189, 248, 0.6)' }}
                whileTap={{ scale: 0.96 }}
                style={{ background: '#ffffff', color: '#000000', border: '1px solid #ffffff', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700', fontSize: '0.75rem', padding: '0.9rem 2rem', cursor: 'pointer' }}
              >
                EXPLORE LAUNCHES
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.04, backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: '#38bdf8', color: '#38bdf8', boxShadow: '0 0 25px rgba(56, 189, 248, 0.35)' }}
                whileTap={{ scale: 0.96 }}
                style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700', fontSize: '0.75rem', padding: '0.9rem 2rem', cursor: 'pointer' }}
              >
                TELEMETRY DATA
              </motion.button>
            </motion.div>
          </motion.div>
        </section>

        {/* Scroll Reveal: Live Telemetry Banner */}
        <section style={{ margin: '0 3rem 5rem 3rem' }}>
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.8 }}
            className="glass-card" 
            style={{ padding: '1.8rem 2.5rem', borderRadius: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', position: 'relative', overflow: 'hidden' }}
          >
            <div className="hud-line"></div>
            {[
              { label: 'COSMIC BACKGROUND STREAM', val: apodData?.title ? apodData.title.slice(0, 22) + '...' : 'NASA APOD' },
              { label: 'ACTIVE AGENCIES', val: 'NASA • ISRO • SPACEX' },
              { label: 'NEXT MISSION NET', val: upcomingLaunches[0] ? new Date(upcomingLaunches[0].net).toLocaleDateString() : 'SYNCING...' },
              { label: 'NETWORK LATENCY', val: '0.04 MS / OPTICAL' }
            ].map((stat, idx) => (
              <div key={idx}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '2px', display: 'block', marginBottom: '0.4rem' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '1px', color: '#38bdf8' }}>
                  {stat.val}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Scroll Reveal: NASA APOD Feature Card */}
        {apodData && (
          <section style={{ padding: '0 3rem 5rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.8 }}
              whileHover={{ y: -6, borderColor: 'rgba(56, 189, 248, 0.5)', boxShadow: '0 20px 40px -10px rgba(56, 189, 248, 0.2)' }}
              className="glass-card" 
              style={{ padding: '3rem', borderRadius: '4px', position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }}
            >
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
                // TODAY'S FEATURED DEEP SPACE OBSERVATION
              </span>
              <h2 style={{ fontSize: '2.2rem', textTransform: 'uppercase', margin: '0.8rem 0 1.2rem 0', fontWeight: '700' }}>
                {apodData.title}
              </h2>
              <p style={{ color: '#94a3b8', lineHeight: '1.8', maxWidth: '850px', fontSize: '0.95rem', margin: 0 }}>
                {apodData.explanation}
              </p>
            </motion.div>
          </section>
        )}

        {/* Scroll Reveal: Multi-Agency Launch Grid */}
        <section style={{ padding: '0 3rem 8rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
                // REAL-TIME ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.4rem 0 0 0', fontWeight: '700' }}>
                UPCOMING GLOBAL LAUNCHES
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', letterSpacing: '2px', color: '#64748b' }}>
              AUTO-SYNCED WITH LAUNCH LIBRARY 2
            </span>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}
          >
            {upcomingLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                variants={fadeInUp}
                whileHover={{ y: -8, scale: 1.01, borderColor: 'rgba(56, 189, 248, 0.5)', boxShadow: '0 20px 40px -10px rgba(56, 189, 248, 0.25)' }}
                className="glass-card" 
                style={{ padding: '2rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.2rem 0.6rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                      {launch.launch_service_provider?.name || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#22c55e', letterSpacing: '1px' }}>● CONFIRMED</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', fontWeight: '600', lineHeight: '1.4' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '1px' }}>
                    NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
