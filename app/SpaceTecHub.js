'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeAgency, setActiveAgency] = useState(null);
  const [agencyBatchIndex, setAgencyBatchIndex] = useState(0);
  const canvasRef = useRef(null);

  const spaceBackgrounds = [
    apodData?.media_type === 'image' ? apodData.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069'
  ];

  // Agencies configuration
  const agencyBatches = [
    [
      {
        id: 'nasa',
        name: 'NASA',
        tagline: 'SATURN V & ARTEMIS',
        accentColor: '#3b82f6',
        specialty: 'Saturn V Lunar Legacy, Webb Telescope & Artemis Moon Missions',
        brief: 'Pioneering deep space exploration, advanced planetary defense, and sustained human habitats on the lunar surface.',
        tileVideo: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-satellite-imagery-41961-large.mp4',
        expandedVideo: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-satellite-imagery-41961-large.mp4'
      },
      {
        id: 'spacex',
        name: 'SPACEX',
        tagline: 'STARSHIP FLEET',
        accentColor: '#ff6600',
        specialty: 'Starship Super Heavy Launch & Reusable Mars Architecture',
        brief: 'Developing fully reusable heavy-lift transportation systems designed to make humanity multi-planetary.',
        // PASTE YOUR SPACEX VIDEO LINK / FILE PATH HERE:
        tileVideo: '', 
        expandedVideo: ''
      },
      {
        id: 'esa',
        name: 'ESA',
        tagline: 'ARIANE 6 & COSMIC VISION',
        accentColor: '#60a5fa',
        specialty: 'Ariane 6 Heavy Lift System & Euclid Dark Energy Mapping',
        brief: 'Coordinating European collaboration in space research, satellite earth observation, and deep space probes.',
        tileVideo: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-satellite-orbiting-the-earth-41960-large.mp4',
        expandedVideo: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-satellite-orbiting-the-earth-41960-large.mp4'
      }
    ],
    [
      {
        id: 'jaxa',
        name: 'JAXA',
        tagline: 'H3 & ASTEROID SAMPLING',
        accentColor: '#2dd4bf',
        specialty: 'H3 Next-Gen Rocket & Hayabusa Asteroid Sample Return',
        brief: 'Advancing high-precision robotic asteroid exploration, global satellite navigation, and next-generation rocketry.',
        tileVideo: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-satellite-imagery-41961-large.mp4',
        expandedVideo: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-satellite-imagery-41961-large.mp4'
      },
      {
        id: 'isro',
        name: 'ISRO',
        tagline: 'GSLV MK III & CHANDRAYAAN',
        accentColor: '#ff9933',
        specialty: 'GSLV Heavy Launcher, Chandrayaan South Pole & Gaganyaan',
        brief: 'Executing cost-effective lunar polar exploration, orbital space stations, and indigenous human spaceflight.',
        tileVideo: 'https://assets.mixkit.co/videos/preview/mixkit-spinning-planet-earth-in-space-41959-large.mp4',
        expandedVideo: 'https://assets.mixkit.co/videos/preview/mixkit-spinning-planet-earth-in-space-41959-large.mp4'
      },
      {
        id: 'cnsa',
        name: 'CNSA',
        tagline: 'CHANG\'E & TIANWEN',
        accentColor: '#f43f5e',
        specialty: 'Chang\'e Lunar Sample Return & Tianwen Mars Rover Missions',
        brief: 'Operating successful lunar far-side sample missions, orbital laboratories, and interplanetary rovers.',
        tileVideo: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-satellite-orbiting-the-earth-41960-large.mp4',
        expandedVideo: 'https://assets.mixkit.co/videos/preview/mixkit-animation-of-a-satellite-orbiting-the-earth-41960-large.mp4'
      }
    ]
  ];

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
    }, 8000);
    return () => clearInterval(batchTimer);
  }, [activeAgency]);

  useEffect(() => {
    const autoEnterTimer = setTimeout(() => {
      setEntered(true);
    }, 2500);
    return () => clearInterval(autoEnterTimer);
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
          background: #000000;
        }

        .agency-column:last-child {
          border-right: none;
        }

        .agency-video-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 177.77vh;
          height: 100vh;
          min-width: 100%;
          min-height: 100%;
          transform: translate(-50%, -50%);
          object-fit: cover;
          z-index: 1;
          opacity: 0.9;
          pointer-events: none;
        }

        .agency-content-layer {
          position: relative;
          z-index: 3;
        }

        .agency-text-shield {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, #000000 0%, rgba(0,0,0,0.85) 40%, rgba(0,0,0,0.25) 70%, transparent 100%);
          z-index: 2;
          pointer-events: none;
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
              <motion.span
                layoutId="spacetec-brand"
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
              >
                SPACETEC
              </motion.span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', fontSize: '0.75rem', letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8' }}>
            <span style={{ color: '#ffffff', fontWeight: '600' }}>Live Telemetry</span>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <span>Agencies</span>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <span>Orbital Map</span>
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
        <section className="content-container" style={{ paddingBottom: '4rem' }}>
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

        {/* AGENCIES SECTION */}
        <section className="content-container" style={{ paddingBottom: '6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.0rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // GLOBAL AEROSPACE ARCHITECTURE
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                EXPLORE SPACE AGENCIES ACROSS THE GLOBE
              </h2>
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
              {agencyBatches[agencyBatchIndex].map((agency, index) => {
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
                    <video
                      className="agency-video-bg"
                      src={isHovered ? agency.expandedVideo : agency.tileVideo}
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <div className="agency-text-shield" />

                    <div className="agency-content-layer">
                      <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: isHovered ? agency.accentColor : '#a1a1aa', fontWeight: '800', transition: 'color 0.3s ease' }}>
                        // 0{agencyBatchIndex * 3 + index + 1}
                      </span>
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
        </section>

      </motion.div>
    </div>
  );
}
