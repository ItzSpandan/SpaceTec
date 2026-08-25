'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import OrbitalGlobe from './OrbitalGlobe';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeAgency, setActiveAgency] = useState(null);
  const [agencyBatchIndex, setAgencyBatchIndex] = useState(0);
  const [expandedLaunch, setExpandedLaunch] = useState(null); 
  const [showAllLaunchesPage, setShowAllLaunchesPage] = useState(false);
  const canvasRef = useRef(null);

  const spaceBackgrounds = [
    apodData?.media_type === 'image' ? apodData.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069'
  ];

  const allAgencies = [
    {
      id: 'nasa',
      batch: 0,
      name: 'NASA',
      tagline: 'EUROPA CLIPPER & ARTEMIS',
      accentColor: '#3b82f6',
      specialty: 'Europa Clipper Mission & Deep Space Planetary Exploration',
      brief: 'Headquartered in Washington, D.C., directing worldwide aeronautics research and manned space exploration.',
      videoUrl: '/nasa.mp4.mp4', 
      hqImage: '/nasa.jpeg',
      logoText: 'NASA HQ // KENNEDY SPACE CENTER'
    },
    {
      id: 'spacex',
      batch: 0,
      name: 'SPACEX',
      tagline: 'STARSHIP FLEET',
      accentColor: '#ff6600',
      specialty: 'Starship Super Heavy Launch & Reusable Mars Architecture',
      brief: 'Headquartered at Starbase & Rocket Road, revolutionizing aerospace manufacturing and transport.',
      videoUrl: '/spacex.mp4.mp4',
      hqImage: '/spacex.jpeg',
      logoText: 'SPACEX HQ // HAWTHORNE, CA'
    },
    {
      id: 'esa',
      batch: 0,
      name: 'ESA',
      tagline: 'ARIANE 6 & SMILE MISSION',
      accentColor: '#60a5fa',
      specialty: 'Vega-C & European Cosmic Vision Space Probes',
      brief: 'Headquartered in Paris, coordinating the space flight programs of 22 European member states.',
      videoUrl: '/esa.mp4.mp4',
      hqImage: '/esa.jpeg',
      logoText: 'ESA HQ // PARIS, FRANCE'
    },
    {
      id: 'jaxa',
      batch: 1,
      name: 'JAXA',
      tagline: 'H3 & ASTEROID SAMPLING',
      accentColor: '#2dd4bf',
      specialty: 'H3 Next-Gen Rocket & Hayabusa Asteroid Sample Return',
      brief: 'Headquartered in Tokyo, unifying Japan’s national aerospace research and orbital development.',
      videoUrl: '/jaxa.mp4.mp4',
      hqImage: '/jaxa.jpeg',
      logoText: 'JAXA HQ // TOKYO, JAPAN'
    },
    {
      id: 'isro',
      batch: 1,
      name: 'ISRO',
      tagline: 'GSLV MK III & CHANDRAYAAN',
      accentColor: '#ff9933',
      specialty: 'GSLV Heavy Launcher, Chandrayaan South Pole & Gaganyaan',
      brief: 'Headquartered in Bengaluru, driving breakthrough cost-effective interplanetary and satellite missions.',
      videoUrl: '/isro.mp4.mp4',
      hqImage: '/isro.jpeg',
      logoText: 'ISRO HQ // BENGALURU, INDIA'
    },
    {
      id: 'cnsa',
      batch: 1,
      name: 'CNSA',
      tagline: 'CHANG\'E & TIANWEN',
      accentColor: '#f43f5e',
      specialty: 'Chang\'e Lunar Sample Return & Tianwen Mars Rover Missions',
      brief: 'Headquartered in Beijing, managing national space administration and planetary research programs.',
      videoUrl: '/cnsa.mp4.mp4',
      hqImage: '/cnsa.jpeg',
      logoText: 'CNSA HQ // BEIJING, CHINA'
    }
  ];

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const batchTimer = setInterval(() => {
      if (!activeAgency) {
        setAgencyBatchIndex((prev) => (prev === 0 ? 1 : 0));
      }
    }, 12000);
    return () => clearInterval(batchTimer);
  }, [activeAgency]);

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

  const currentBatchAgencies = allAgencies.filter(a => a.batch === agencyBatchIndex);

  // Separate latest 9 cards for main page, and remaining for the explore more page
  const latestLaunches = upcomingLaunches?.slice(0, 9) || [];
  const remainingLaunches = upcomingLaunches?.slice(9) || [];

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '"Space Grotesk", -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap');

        html {
          scroll-behavior: smooth;
        }

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
          background: rgba(15, 15, 15, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .content-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          box-sizing: border-box;
          width: 100%;
        }

        .nav-link {
          background: none;
          border: none;
          color: #94a3b8;
          font-family: inherit;
          font-size: 0.75rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.3s ease;
          padding: 0;
        }

        .nav-link:hover {
          color: #ffffff;
        }

        .brand-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .agency-column {
          position: relative;
          height: 480px;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
          cursor: pointer;
          transition: flex 0.5s cubic-bezier(0.16, 1, 0.3, 1), padding 0.5s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 2rem;
          box-sizing: border-box;
          background: #0b0b0b;
        }

        .agency-column:last-child {
          border-right: none;
        }

        .agency-video-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          transform: translate(-50%, -50%);
          object-fit: cover;
          pointer-events: none;
          z-index: 1;
          filter: brightness(0.7);
        }

        .agency-content-layer {
          position: relative;
          z-index: 4;
        }

        .agency-text-shield {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 2;
          pointer-events: none;
        }

        .explore-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
          width: 100%;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-family: inherit;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .explore-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #ffffff;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* BACKGROUND SLIDESHOW */}
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
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          pointerEvents: entered ? 'auto' : 'none'
        }}
      >
        <div className="content-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px' }}>
            {entered && (
              <button className="brand-link" onClick={() => scrollToSection('hero')}>
                <motion.span
                  layoutId="spacetec-brand"
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
                >
                  SPACETEC
                </motion.span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem' }}>
            <button className="nav-link" onClick={() => scrollToSection('telemetry')}>
              Live Telemetry
            </button>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button className="nav-link" onClick={() => scrollToSection('agencies')}>
              Agencies
            </button>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button className="nav-link" onClick={() => scrollToSection('orbital-map')}>
              Orbital Map
            </button>
          </div>
        </div>
      </motion.header>

      {/* INTRO SCREEN */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}
          >
            <div style={{ textAlign: 'center' }}>
              <motion.div
                layoutId="spacetec-brand"
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.12em' }}
                animate={{ opacity: 1, scale: 1, letterSpacing: '0.22em' }}
              >
                <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
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

      {/* MAIN DASHBOARD */}
      <motion.div 
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ position: 'relative', zIndex: 3, paddingTop: '8rem', pointerEvents: entered ? 'auto' : 'none' }}
      >
        
        {/* HERO SECTION */}
        <section id="hero" className="content-container" style={{ paddingBottom: '4rem', scrollMarginTop: '8rem' }}>
          <motion.div initial="hidden" animate={entered ? "visible" : "hidden"} variants={staggerContainer} style={{ maxWidth: '850px' }}>
            <motion.p variants={fadeInUp} style={{ fontSize: '0.75rem', letterSpacing: '6px', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '1.5rem', fontWeight: '600' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </motion.p>
            
            <motion.h2 variants={fadeInUp} style={{ fontSize: 'calc(2.2rem + 3vw)', fontWeight: '900', lineHeight: '1.1', letterSpacing: '1px', margin: '0 0 1.8rem 0', textTransform: 'uppercase', color: '#ffffff' }}>
              HUMANITY'S GATEWAY TO THE COSMOS.
            </motion.h2>

            <motion.p variants={fadeInUp} style={{ fontSize: '1.05rem', color: '#d4d4d8', lineHeight: '1.7', maxWidth: '680px', marginBottom: '2.5rem', fontWeight: '400' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from global aerospace networks.
            </motion.p>
          </motion.div>
        </section>

        {/* TELEMETRY STRIP */}
        <section id="telemetry" className="content-container" style={{ paddingBottom: '5rem', scrollMarginTop: '8rem' }}>
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
              { label: 'NETWORK NODES', val: '6 GLOBAL AGENCIES' },
              { label: 'NEXT LAUNCH WINDOW', val: upcomingLaunches?.[0] ? new Date(upcomingLaunches[0].net).toLocaleDateString() : 'SYNCING...' },
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

        {/* AGENCIES SECTION */}
        <section id="agencies" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.0rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // GLOBAL AEROSPACE ARCHITECTURE
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                EXPLORE SPACE AGENCIES ACROSS THE GLOBE
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                {activeAgency ? 'ROTATION PAUSED' : `BATCH ${agencyBatchIndex + 1} / 2`}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={agencyBatchIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="glass-card" 
              style={{ display: 'flex', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {currentBatchAgencies.map((agency, index) => {
                const isHovered = activeAgency === agency.id;
                let flexValue = 1;
                if (activeAgency !== null) {
                  flexValue = isHovered ? 12 : 0;
                }

                return (
                  <div
                    key={agency.id}
                    className="agency-column"
                    style={{ 
                      flex: flexValue, 
                      padding: isHovered ? '3rem 3.5rem' : '2.5rem 2rem'
                    }}
                    onMouseEnter={() => setActiveAgency(agency.id)}
                    onMouseLeave={() => setActiveAgency(null)}
                  >
                    {!isHovered && (
                      <video
                        className="agency-video-bg"
                        src={agency.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    )}

                    {isHovered && (
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 1,
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <Image
                            src={agency.hqImage}
                            alt={agency.name}
                            fill
                            style={{ objectFit: 'cover', opacity: 0.85 }}
                            unoptimized
                          />
                        </div>
                      </div>
                    )}

                    <div className="agency-text-shield" />

                    <div className="agency-content-layer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: isHovered ? agency.accentColor : '#a1a1aa', fontWeight: '800', transition: 'color 0.3s ease' }}>
                        // 0{agencyBatchIndex * 3 + index + 1}
                      </span>
                      {isHovered && (
                        <motion.span 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#ffffff', background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.8rem', border: `1px solid ${agency.accentColor}`, fontWeight: '700' }}
                        >
                          {agency.logoText}
                        </motion.span>
                      )}
                    </div>

                    <div className="agency-content-layer" style={{ 
                      transform: isHovered ? 'translateY(-14px)' : 'translateY(0px)', 
                      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }}>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '3px', margin: '0 0 0.5rem 0', color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {agency.name}
                      </h3>
                      
                      <p style={{ fontSize: '0.7rem', letterSpacing: '2px', color: agency.accentColor, textTransform: 'uppercase', margin: '0 0 1rem 0', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {agency.tagline}
                      </p>

                      <p style={{ fontSize: '0.85rem', color: '#d4d4d8', lineHeight: '1.6', margin: 0, opacity: isHovered ? 1 : 0.6, transition: 'opacity 0.3s ease', display: isHovered || activeAgency === null ? 'block' : 'none' }}>
                        {agency.specialty}
                      </p>

                      {isHovered && (
                        <motion.p 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          style={{ fontSize: '0.8rem', color: '#a1a1aa', lineHeight: '1.6', margin: '1rem 0 0 0', maxWidth: '540px', borderLeft: `2px solid ${agency.accentColor}`, paddingLeft: '1rem' }}
                        >
                          {agency.brief}
                        </motion.p>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          <button 
            className="explore-btn"
            onClick={() => {
              setAgencyBatchIndex((prev) => (prev === 0 ? 1 : 0));
              scrollToSection('agencies');
            }}
          >
            <span>Switch Agency Batch ({agencyBatchIndex === 0 ? 'Show JAXA, ISRO, CNSA' : 'Show NASA, SpaceX, ESA'})</span>
            <span>→</span>
          </button>
        </section>

        {/* ORBITAL MAP SECTION */}
        <section id="orbital-map" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
              // GLOBAL TELEMETRY & GEO-SPATIAL MAPPING
            </span>
            <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
              INTERACTIVE 3D ORBITAL GLOBE & LAUNCH PADS
            </h2>
          </div>

          <OrbitalGlobe />
        </section>

        {/* UPCOMING LAUNCHES (LIMITED TO FIRST 9) */}
        <section id="launches" className="content-container" style={{ paddingBottom: '8rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                UPCOMING GLOBAL LAUNCHES
              </h2>
            </div>
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {latestLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                layoutId={`launch-card-${launch.id}`}
                variants={fadeInUp}
                whileHover={{ y: -6, borderColor: '#ffffff' }}
                onClick={() => setExpandedLaunch(launch)}
                className="glass-card" 
                style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                      {launch.provider || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.2rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.80rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                    NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    PAD: {launch.pad_location || 'Vandenberg Space Force Base'}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* EXPLORE MORE LAUNCHES BUTTON */}
          {remainingLaunches.length > 0 && (
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button 
                className="explore-btn" 
                onClick={() => setShowAllLaunchesPage(true)}
                style={{ maxWidth: '400px', margin: '0 auto' }}
              >
                <span>Explore More Launches ({remainingLaunches.length} More)</span>
                <span>→</span>
              </button>
            </div>
          )}
        </section>

      </motion.div>

      {/* EXPLORE MORE LAUNCHES FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllLaunchesPage && (
          <AllLaunchesPage 
            launches={remainingLaunches} 
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllLaunchesPage(false)}
            onSelectLaunch={(launch) => setExpandedLaunch(launch)}
          />
        )}
      </AnimatePresence>

      {/* EXPANDED MODAL CONTAINER WITH BACKGROUND SLIDESHOW & STARFIELD CANVAS */}
      <AnimatePresence>
        {expandedLaunch && (
          <LaunchCountdownModal 
            launch={expandedLaunch} 
            onClose={() => setExpandedLaunch(null)} 
            spaceBackgrounds={spaceBackgrounds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate Page Component for Remaining Launches
function AllLaunchesPage({ launches, spaceBackgrounds, onClose, onSelectLaunch }) {
  const [bgIdx, setBgIdx] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#000000',
        zIndex: 99998,
        overflowY: 'auto',
        padding: '4rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={`all-bg-${idx}`}
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: bgIdx === idx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            filter: 'brightness(0.4) contrast(1.25)',
            pointerEvents: 'none'
          }}
        />
      ))}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '3rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
              // ARCHIVED ORBITAL MANIFEST
            </span>
            <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
              EXPLORE MORE LAUNCHES
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.3)', 
              color: '#fff', 
              padding: '0.8rem 1.5rem', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              letterSpacing: '2px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}
          >
            [← BACK TO MAIN]
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {launches.map((launch) => (
            <div 
              key={launch.id}
              onClick={() => onSelectLaunch(launch)}
              className="glass-card" 
              style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease', cursor: 'pointer' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                    {launch.provider || 'AGENCY'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.2rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                  {launch.name}
                </h3>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.80rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                  NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  PAD: {launch.pad_location || 'Vandenberg Space Force Base'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Sub-component featuring shared layout transition animation, independent scrollable content, and website header name
function LaunchCountdownModal({ launch, onClose, spaceBackgrounds }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [modalBgIdx, setModalBgIdx] = useState(0);
  const modalCanvasRef = useRef(null);

  // Background slideshow rotation inside modal
  useEffect(() => {
    const modalBgTimer = setInterval(() => {
      setModalBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(modalBgTimer);
  }, [spaceBackgrounds.length]);

  // Starfield canvas animation inside modal
  useEffect(() => {
    const canvas = modalCanvasRef.current;
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

  useEffect(() => {
    if (!launch?.net) return;

    const targetTime = new Date(launch.net).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [launch]);

  if (!launch) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#000000',
        zIndex: 99999,
        overflowY: 'auto',
        padding: '4rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {/* Background Slideshow Layers for Modal */}
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={`modal-bg-${idx}`}
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: modalBgIdx === idx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            filter: 'brightness(0.4) contrast(1.25)',
            pointerEvents: 'none'
          }}
        />
      ))}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Starfield Canvas for Modal */}
      <canvas ref={modalCanvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <motion.div 
        layoutId={`launch-card-${launch.id}`}
        style={{ maxWidth: '900px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 3 }}
      >
        {/* Modal Top Nav / Close */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2.5rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            {/* Website Name on top of the header inside expanded view */}
            <div style={{ fontSize: '0.85rem', fontWeight: '900', letterSpacing: '6px', color: '#ffffff', textTransform: 'uppercase', marginBottom: '0.8rem', opacity: 0.9 }}>
              SPACETEC // MISSION TELEMETRY
            </div>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
              // FULL MISSION TELEMETRY & PAD ENVIRONMENT
            </span>
            <h2 style={{ color: '#fff', fontSize: '1.8rem', margin: 0, textTransform: 'uppercase', fontWeight: '900', lineHeight: '1.3' }}>
              {launch.name}
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.3)', 
              color: '#fff', 
              padding: '0.8rem 1.5rem', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              letterSpacing: '2px',
              fontWeight: '700',
              textTransform: 'uppercase',
              flexShrink: 0
            }}
          >
            [X CLOSE]
          </button>
        </div>

        {/* Countdown Box */}
        <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.75rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
            {timeLeft.isPast ? 'LAUNCH WINDOW OPEN / LIFTED' : 'LIVE T-MINUS COUNTDOWN TIMER'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'DAYS', val: timeLeft.days },
              { label: 'HOURS', val: timeLeft.hours },
              { label: 'MINS', val: timeLeft.minutes },
              { label: 'SECS', val: timeLeft.seconds }
            ].map((t, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.8)', padding: '1.5rem 1rem', textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>{String(t.val).padStart(2, '0')}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '2px' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Details and Live Weather Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', paddingBottom: '3rem' }}>
          
          {/* Mission Info Grid */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
              // LAUNCH PARAMETERS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>PROVIDER / AGENCY:</span>
                <span style={{ color: '#fff', fontWeight: '700', textTransform: 'uppercase' }}>{launch.provider || 'GLOBAL PARTNER'}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>EXACT TIMESTAMP (NET):</span>
                <span style={{ color: '#2dd4bf', fontWeight: '700' }}>{new Date(launch.net).toUTCString()}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>LAUNCH PAD COMPLEX:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>{launch.pad_location || 'Vandenberg Space Force Base'}</span>
              </div>
            </div>
          </div>

          {/* Live Pad Weather Telemetry */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
              // PAD METEOROLOGICAL TELEMETRY
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>WIND VELOCITY</span>
                <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>12.4 knots</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>CLOUD COVER</span>
                <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>15% (Clear)</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>AMBIENT TEMP</span>
                <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>24°C / 75°F</p>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>GO/NO-GO STATUS</span>
                <p style={{ color: '#22c55e', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>GO FOR LAUNCH</p>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
