'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import OrbitalGlobe from './OrbitalGlobe';
import { supabase } from './supabase';

export default function SpaceTecHub({ apodData, upcomingLaunches }) {
  const [entered, setEntered] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [activeAgency, setActiveAgency] = useState(null);
  const [agencyBatchIndex, setAgencyBatchIndex] = useState(0);
  const [expandedLaunch, setExpandedLaunch] = useState(null); 
  const [showAllLaunchesPage, setShowAllLaunchesPage] = useState(false);
  const [isTransitioningExplore, setIsTransitioningExplore] = useState(false);
  const [showAllAgenciesPage, setShowAllAgenciesPage] = useState(false);
  const [isTransitioningAgencies, setIsTransitioningAgencies] = useState(false);
  const [globeViewMode, setGlobeViewMode] = useState({ mode: 'pads', requestId: 0 });
  
  // New States for Satellite Wiki Page View
  const [showSatelliteWikiPage, setShowSatelliteWikiPage] = useState(false);
  const [isTransitioningWiki, setIsTransitioningWiki] = useState(false);
  
  // Dropdown & Menu States
  const [showTelemetryDropdown, setShowTelemetryDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

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

  const agencyDirectory = [
    ...allAgencies,
    { id: 'roscosmos', name: 'ROSCOSMOS', tagline: 'RUSSIAN SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Moscow, Russia', history: 'Established in 1992 as the Russian federal space agency after the Soviet space programme.', majorPrograms: 'Soyuz missions, Progress cargo spacecraft, GLONASS navigation and lunar exploration.', brief: 'Russia’s civil space corporation responsible for national spaceflight programmes.' },
    { id: 'csa', name: 'CANADIAN SPACE AGENCY', tagline: 'CANADARM & EARTH SCIENCE', accentColor: '#f87171', category: 'Government agency', headquarters: 'Saint-Hubert, Quebec, Canada', history: 'Founded in 1989 to coordinate Canada’s civil space activities.', majorPrograms: 'Canadarm and Canadarm2 robotics, RADARSAT Earth observation and lunar science.', brief: 'Canada’s national civil space agency and international mission partner.' },
    { id: 'uksa', name: 'UK SPACE AGENCY', tagline: 'UK SPACE CAPABILITY', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Swindon, United Kingdom', history: 'Formed in 2010 to coordinate the United Kingdom’s civil space programme.', majorPrograms: 'Satellite applications, Earth observation, launch capability and international programmes.', brief: 'The United Kingdom’s civil space agency.' },
    { id: 'dlr', name: 'DLR', tagline: 'GERMAN AEROSPACE RESEARCH', accentColor: '#facc15', category: 'Government research agency', headquarters: 'Cologne, Germany', history: 'Germany’s national aerospace research centre developed from earlier national aerospace research institutions.', majorPrograms: 'Earth observation, space robotics, launch research and human spaceflight support.', brief: 'Germany’s national centre for aeronautics and space research.' },
    { id: 'cnes', name: 'CNES', tagline: 'FRENCH SPACE AGENCY', accentColor: '#38bdf8', category: 'Government agency', headquarters: 'Paris, France', history: 'Created in 1961 to shape and deliver France’s national space policy and programmes.', majorPrograms: 'Ariane cooperation, Earth observation, space science and launch-site operations.', brief: 'France’s government space agency.' },
    { id: 'asi', name: 'ITALIAN SPACE AGENCY', tagline: 'ITALIAN SPACE PROGRAMMES', accentColor: '#22d3ee', category: 'Government agency', headquarters: 'Rome, Italy', history: 'Established in 1988 to coordinate Italy’s civil space activities.', majorPrograms: 'Earth observation, ESA cooperation, scientific satellites and human spaceflight contributions.', brief: 'Italy’s national civil space agency.' },
    { id: 'kari', name: 'KARI', tagline: 'KOREAN AEROSPACE RESEARCH', accentColor: '#a78bfa', category: 'Government research institute', headquarters: 'Daejeon, South Korea', history: 'Founded in 1989 to lead South Korea’s aerospace research and development.', majorPrograms: 'Nuri launch vehicle, KOMPSAT satellites and lunar exploration.', brief: 'South Korea’s national aerospace research institute.' },
    { id: 'uaesa', name: 'UAE SPACE AGENCY', tagline: 'EMIRATES SPACE PROGRAMME', accentColor: '#34d399', category: 'Government agency', headquarters: 'Abu Dhabi, United Arab Emirates', history: 'Established in 2014 to guide the UAE’s national space sector.', majorPrograms: 'Emirates Mars Mission, satellite development and astronaut missions.', brief: 'The UAE body coordinating national space policy and growth.' },
    { id: 'asa', name: 'AUSTRALIAN SPACE AGENCY', tagline: 'AUSTRALIAN SPACE SECTOR', accentColor: '#f97316', category: 'Government agency', headquarters: 'Adelaide, Australia', history: 'Created in 2018 to grow Australia’s civil space capability and industry.', majorPrograms: 'Space regulation, Earth observation applications and international partnerships.', brief: 'Australia’s national civil space agency.' },
    { id: 'conae', name: 'CONAE', tagline: 'ARGENTINE SPACE ACTIVITIES', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Buenos Aires, Argentina', history: 'Established in 1991 to execute Argentina’s national space activities.', majorPrograms: 'SAOCOM radar satellites, Earth observation and satellite applications.', brief: 'Argentina’s national space activities commission.' },
    { id: 'aeb', name: 'BRAZILIAN SPACE AGENCY', tagline: 'BRAZILIAN SPACE PROGRAMME', accentColor: '#22c55e', category: 'Government agency', headquarters: 'Brasilia, Brazil', history: 'Created in 1994 to coordinate Brazil’s national space programme.', majorPrograms: 'Earth observation, launch systems and Alcantara spaceport development.', brief: 'Brazil’s agency for national space policy and programmes.' },
    { id: 'sansa', name: 'SANSA', tagline: 'SOUTH AFRICAN SPACE AGENCY', accentColor: '#f59e0b', category: 'Government agency', headquarters: 'Pretoria, South Africa', history: 'Established in 2010 to promote and manage South Africa’s space activities.', majorPrograms: 'Space weather, Earth observation and satellite navigation services.', brief: 'South Africa’s national space agency.' },
    { id: 'tua', name: 'TURKISH SPACE AGENCY', tagline: 'TURKISH NATIONAL SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Ankara, Turkey', history: 'Established in 2018 to coordinate Turkey’s national space policy.', majorPrograms: 'National space programme, satellite systems and lunar mission planning.', brief: 'Turkey’s national space agency.' },
    { id: 'blue-origin', name: 'BLUE ORIGIN', tagline: 'REUSABLE LAUNCH SYSTEMS', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Kent, Washington, USA', history: 'Founded in 2000 to pursue reusable launch systems and long-term space access.', majorPrograms: 'New Shepard, New Glenn and BE-4 engines.', brief: 'A private aerospace company focused on reusable space transportation.' },
    { id: 'rocket-lab', name: 'ROCKET LAB', tagline: 'SMALL LAUNCH & SPACE SYSTEMS', accentColor: '#a78bfa', category: 'Private company', headquarters: 'Long Beach, California, USA', history: 'Founded in 2006 and developed the Electron small-launch vehicle.', majorPrograms: 'Electron, Neutron, Photon spacecraft and satellite systems.', brief: 'A launch and space-systems company serving commercial and government missions.' },
    { id: 'arianespace', name: 'ARIANESPACE', tagline: 'EUROPEAN LAUNCH SERVICES', accentColor: '#60a5fa', category: 'Private launch services company', headquarters: 'Evry-Courcouronnes, France', history: 'Founded in 1980 to operate Europe’s Ariane launch services commercially.', majorPrograms: 'Ariane 6 and Vega-C launch services.', brief: 'A European provider of launch services.' },
    { id: 'sierra-space', name: 'SIERRA SPACE', tagline: 'COMMERCIAL SPACEPLANE & HABITATS', accentColor: '#f8fafc', category: 'Private company', headquarters: 'Louisville, Colorado, USA', history: 'Formed as an independent commercial space company in 2021.', majorPrograms: 'Dream Chaser spaceplane and commercial space habitats.', brief: 'A commercial space company developing transportation and orbital infrastructure.' },
    { id: 'firefly', name: 'FIREFLY AEROSPACE', tagline: 'RESPONSIVE SPACE SERVICES', accentColor: '#fb7185', category: 'Private company', headquarters: 'Cedar Park, Texas, USA', history: 'Founded in 2017 to develop launch vehicles and lunar delivery services.', majorPrograms: 'Alpha rocket, Blue Ghost lunar lander and space utility vehicles.', brief: 'A private aerospace company focused on launch and lunar missions.' },
    { id: 'planet', name: 'PLANET LABS', tagline: 'DAILY EARTH OBSERVATION', accentColor: '#facc15', category: 'Private company', headquarters: 'San Francisco, California, USA', history: 'Founded in 2010 to build a high-frequency Earth-imaging satellite constellation.', majorPrograms: 'Dove, SuperDove and Pelican Earth-observation satellites.', brief: 'A commercial Earth-observation data company.' },
    { id: 'maxar', name: 'MAXAR SPACE SYSTEMS', tagline: 'SPACECRAFT & EARTH INTELLIGENCE', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Palo Alto, California, USA', history: 'Built from long-standing satellite and spacecraft businesses operating under the Maxar name.', majorPrograms: 'Spacecraft buses, high-resolution Earth imaging and robotic systems.', brief: 'A space-technology company providing spacecraft and Earth-intelligence capabilities.' },
    { id: 'intuitive-machines', name: 'INTUITIVE MACHINES', tagline: 'LUNAR DELIVERY SERVICES', accentColor: '#f97316', category: 'Private company', headquarters: 'Houston, Texas, USA', history: 'Founded in 2013 to develop commercial lunar services.', majorPrograms: 'Nova-C lunar landers, lunar data services and communications infrastructure.', brief: 'A commercial lunar exploration and services company.' },
    { id: 'astroscale', name: 'ASTROSCALE', tagline: 'ORBITAL DEBRIS SERVICES', accentColor: '#2dd4bf', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2013 to develop orbital-sustainability and debris-removal services.', majorPrograms: 'ELSA-d and in-orbit servicing technologies.', brief: 'A private company focused on sustainable operations in Earth orbit.' },
    { id: 'ispace', name: 'ISPACE', tagline: 'COMMERCIAL LUNAR EXPLORATION', accentColor: '#e2e8f0', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2010 to build commercial lunar exploration services.', majorPrograms: 'HAKUTO-R lunar landers and lunar payload delivery.', brief: 'A commercial lunar exploration company.' }
  ];
  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowTelemetryDropdown(false);
    setShowHamburgerMenu(false);
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
    }, 3500); 
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

  const latestLaunches = upcomingLaunches?.slice(0, 9) || [];
  const remainingLaunches = upcomingLaunches?.slice(9) || [];

  const handleOpenExploreMore = () => {
    setIsTransitioningExplore(true);
    setTimeout(() => {
      setIsTransitioningExplore(false);
      setShowAllLaunchesPage(true);
    }, 3500); 
  };


  const handleOpenAllAgencies = () => {
    setIsTransitioningAgencies(true);
    setTimeout(() => {
      setIsTransitioningAgencies(false);
      setShowAllAgenciesPage(true);
    }, 3500);
  };
  const handleOpenSatelliteWiki = () => {
    setIsTransitioningWiki(true);
    setTimeout(() => {
      setIsTransitioningWiki(false);
      setShowSatelliteWikiPage(true);
    }, 3500);
  };

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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', position: 'relative' }}>
            
            {/* Live Telemetry Dropdown Menu */}
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-link" 
                onClick={() => {
                  setShowTelemetryDropdown(!showTelemetryDropdown);
                  setShowHamburgerMenu(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Live Telemetry <span>▾</span>
              </button>

              {showTelemetryDropdown && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    left: 0,
                    width: '240px',
                    padding: '0.8rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    zIndex: 200,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <button 
                    onClick={() => {
                      setShowTelemetryDropdown(false);
                      handleOpenSatelliteWiki();
                    }} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Satellite Database
                  </button>
                  <button 
                    onClick={() => scrollToSection('launches')} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Rocket Launch Telemetry
                  </button>
                  <button 
                    onClick={() => {
                      setGlobeViewMode((current) => ({ mode: 'satellites', requestId: current.requestId + 1 }));
                      scrollToSection('orbital-map');
                    }} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Live Satellite Tracking
                  </button>                  <button 
                    onClick={() => scrollToSection('orbital-map')} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Launch Pad Telemetry
                  </button>
                </div>
              )}
            </div>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button className="nav-link" onClick={() => scrollToSection('agencies')}>
              Agencies
            </button>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
            {/* ISS Tracker Replaced Button */}
            <button className="nav-link" onClick={() => alert('ISS Tracker separate live telemetry view coming soon!')}>
              ISS Tracker
            </button>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* 3-Bar Menu Shortcut */}
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-link" 
                onClick={() => {
                  setShowHamburgerMenu(!showHamburgerMenu);
                  setShowTelemetryDropdown(false);
                }}
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              >
                ☰
              </button>

              {showHamburgerMenu && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    right: 0,
                    width: '220px',
                    padding: '0.8rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    zIndex: 200,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <div 
                    style={{ color: '#fff', padding: '0.6rem 1rem', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '700', cursor: 'default', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Shortcuts & Features
                  </div>
                  <button 
                    onClick={() => alert('Astronaut Telemetry feature coming soon!')} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Astronaut Telemetry
                  </button>
                  <button 
                    onClick={() => alert('Space Encyclopedia feature coming soon!')} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Space Encyclopedia
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.header>

      {/* INTRO SCREEN (3.5 SECONDS) */}
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
                style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
              >
                UNIFIED COSMIC INTELLIGENCE
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPLORE MORE TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningExplore && (
          <motion.div
            key="explore-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`trans-bg-${idx}`}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  backgroundImage: `url('${bgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  opacity: bgIndex === idx ? 1 : 0,
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
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                LOADING ARCHIVED MANIFEST...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGENCIES DIRECTORY TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningAgencies && (
          <motion.div key="agencies-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: '2rem' }}>
            {spaceBackgrounds.map((bgUrl, idx) => <div key={`agencies-trans-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIndex === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>LOADING GLOBAL AGENCY DIRECTORY...</motion.p></div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* SATELLITE WIKI TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningWiki && (
          <motion.div
            key="wiki-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`wiki-trans-bg-${idx}`}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  backgroundImage: `url('${bgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  opacity: bgIndex === idx ? 1 : 0,
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
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                LOADING SATELLITE DATABASE...
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
            onClick={handleOpenAllAgencies}
          >
            <span>Explore More Space Agencies</span>
            <span>→</span>
          </button>
        </section>

        {/* ORBITAL MAP / LAUNCH PAD TELEMETRY SECTION */}
        <section id="orbital-map" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
              // GLOBAL ORBITAL INTELLIGENCE & LIVE TRACKING
            </span>
            <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
              GLOBAL ORBITAL OPERATIONS CENTER
            </h2>
          </div>

          <div style={{ background: '#000000', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <OrbitalGlobe requestedView={globeViewMode} />
          </div>
        </section>

        {/* UPCOMING LAUNCHES */}
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

          {remainingLaunches.length > 0 && (
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button 
                className="explore-btn" 
                onClick={handleOpenExploreMore}
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

      {/* SATELLITE WIKI FULL PAGE VIEW */}
      <AnimatePresence>
        {showSatelliteWikiPage && (
          <SatelliteWikiPage 
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowSatelliteWikiPage(false)}
          />
        )}
      </AnimatePresence>
      {/* ALL AGENCIES FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllAgenciesPage && (
          <AllAgenciesPage 
            agencies={agencyDirectory}
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllAgenciesPage(false)}
          />
        )}
      </AnimatePresence>

      {/* EXPANDED MODAL CONTAINER */}
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

function SatelliteWikiPage({ spaceBackgrounds, onClose }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [satellites, setSatellites] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const pageSize = 50;
  const maxPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
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
    const fetchSatelliteCatalog = async () => {
      setIsLoading(true);
      try {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let query = supabase
          .from('satellites')
          .select('*', { count: 'exact' });

        const trimmedSearch = search.trim();
        if (trimmedSearch) {
          query = !isNaN(trimmedSearch)
            ? query.or(`name.ilike.%${trimmedSearch}%,id.eq.${trimmedSearch}`)
            : query.ilike('name', `%${trimmedSearch}%`);
        }

        const { data, count, error } = await query
          .order('id', { ascending: true })
          .range(from, to);
        if (error) throw error;

        setSatellites(data || []);
        setTotalCount(count || 0);
      } catch (error) {
        console.error('Satellite database fetch error:', error);
        setSatellites([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchSatelliteCatalog, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  const handleBackToMainWithTransition = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000000', zIndex: 99998, overflowY: 'auto', padding: '4rem 2rem', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div key={`wiki-page-bg-${idx}`} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />
      ))}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}>SPACETEC</motion.span>
          <button onClick={handleBackToMainWithTransition} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>[← BACK TO MAIN]</button>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>// SATELLITE DATABASE</span>
          <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>GLOBAL SATELLITE DATABASE</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>TOTAL MATCHES: {totalCount.toLocaleString()}</span>
          <input type="text" placeholder="Search by name or NORAD ID..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '0.7rem 1rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', width: 'min(100%, 320px)', outline: 'none' }} />
        </div>

        <div className="glass-card" style={{ overflowX: 'auto', marginBottom: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#38bdf8', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}><th style={{ padding: '1rem' }}>NORAD ID</th><th style={{ padding: '1rem' }}>Object Name</th><th style={{ padding: '1rem' }}>Organization</th><th style={{ padding: '1rem' }}>Status</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="4" style={{ padding: '2rem 1rem', color: '#38bdf8', textAlign: 'center' }}>QUERYING SATELLITE DATABASE...</td></tr> : satellites.length === 0 ? <tr><td colSpan="4" style={{ padding: '2rem 1rem', color: '#d4d4d8', textAlign: 'center' }}>NO SATELLITES FOUND</td></tr> : satellites.map((satellite) => <tr key={satellite.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}><td style={{ padding: '1.2rem 1rem', color: '#2dd4bf', fontWeight: '700' }}>{satellite.id}</td><td style={{ padding: '1.2rem 1rem', fontWeight: '700', color: '#fff' }}>{satellite.name || 'UNKNOWN'}</td><td style={{ padding: '1.2rem 1rem' }}>{satellite.organization || 'Independent / International'}</td><td style={{ padding: '1.2rem 1rem', color: '#22c55e', fontWeight: '700' }}>ACTIVE</td></tr>)}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#d4d4d8', letterSpacing: '1px' }}>PAGE {page + 1} OF {maxPages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={page === 0} onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))} style={{ padding: '0.7rem 1rem', background: page === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: page === 0 ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page === 0 ? 'not-allowed' : 'pointer' }}>PREV PAGE</button>
            <button disabled={page + 1 >= maxPages} onClick={() => setPage((currentPage) => currentPage + 1)} style={{ padding: '0.7rem 1rem', background: page + 1 >= maxPages ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: page + 1 >= maxPages ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page + 1 >= maxPages ? 'not-allowed' : 'pointer' }}>NEXT PAGE</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isReturningMain && <motion.div key="returning-main-wiki" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}><div style={{ textAlign: 'center' }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p></div></motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}
function AllAgenciesPage({ agencies, spaceBackgrounds, onClose }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [expandedAgency, setExpandedAgency] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setBgIdx((current) => (current + 1) % spaceBackgrounds.length), 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  const handleBackToMain = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }} style={{ position: 'fixed', inset: 0, zIndex: 99998, overflowY: 'auto', backgroundColor: '#000000', padding: '4rem 2rem', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
      {spaceBackgrounds.map((bgUrl, idx) => <div key={`all-agencies-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}><motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase' }}>SPACETEC</motion.span><button onClick={handleBackToMain} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>[← BACK TO MAIN]</button></div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2rem', marginBottom: '2.5rem' }}><span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>// GLOBAL SPACE AGENCY DIRECTORY</span><h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>EXPLORE SPACE AGENCIES</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {agencies.map((agency, index) => <motion.article key={agency.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} onClick={() => setExpandedAgency(agency)} style={{ cursor: 'pointer', minHeight: '310px', position: 'relative', overflow: 'hidden', border: `1px solid ${agency.accentColor}66`, backgroundColor: 'rgba(0,0,0,0.72)', padding: '2rem', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: agency.hqImage ? "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.92) 100%), url('" + agency.hqImage + "')" : 'linear-gradient(135deg, rgba(2,6,23,0.96), rgba(0,0,0,0.98))', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.72 }} />
            <div style={{ position: 'relative', zIndex: 1 }}><span style={{ color: agency.accentColor, fontSize: '0.65rem', letterSpacing: '2px', fontWeight: '800' }}>// {String(index + 1).padStart(2, '0')}</span><h3 style={{ color: '#fff', margin: '0.7rem 0', fontSize: '1.6rem', letterSpacing: '2px' }}>{agency.name}</h3><p style={{ color: agency.accentColor, margin: '0 0 0.8rem', fontSize: '0.72rem', letterSpacing: '1.4px', fontWeight: '700' }}>{agency.tagline}</p><p style={{ color: '#d4d4d8', margin: 0, lineHeight: '1.6', fontSize: '0.83rem' }}>{agency.brief}</p></div>
          </motion.article>)}
        </div>        <AnimatePresence>
          {expandedAgency && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedAgency(null)} style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.86)' }}><motion.article initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} onClick={(event) => event.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#050505', border: `1px solid ${expandedAgency.accentColor || '#38bdf8'}`, padding: '2rem', boxSizing: 'border-box' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}><div><span style={{ color: expandedAgency.accentColor || '#38bdf8', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '800' }}>// {expandedAgency.category || 'SPACE ORGANIZATION'}</span><h2 style={{ margin: '0.5rem 0 0', color: '#fff', fontSize: '2rem', letterSpacing: '1px' }}>{expandedAgency.name}</h2></div><button onClick={() => setExpandedAgency(null)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 0.7rem', cursor: 'pointer' }}>CLOSE</button></div><div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>01 / HEADQUARTERS</p><p style={{ color: '#fff', margin: '0.4rem 0 0' }}>{expandedAgency.headquarters || expandedAgency.logoText || 'Not listed'}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>02 / HISTORY</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.history || expandedAgency.brief}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>03 / MAJOR PROGRAMMES & CAPABILITIES</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.majorPrograms || expandedAgency.specialty}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>04 / OVERVIEW</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.brief}</p></section></div></motion.article></motion.div>}
        </AnimatePresence>      </div>
      <AnimatePresence>{isReturningMain && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}><div style={{ textAlign: 'center' }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p></div></motion.div>}</AnimatePresence>
    </motion.div>
  );
}
function AllLaunchesPage({ launches, spaceBackgrounds, onClose, onSelectLaunch }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [sortBy, setSortBy] = useState('latest');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [isReturningMain, setIsReturningMain] = useState(false);
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

  const handleBackToMainWithTransition = () => {
    setIsReturningMain(true);
    setTimeout(() => {
      onClose();
    }, 3000); 
  };

  const providers = ['all', ...new Set(launches.map(l => l.provider).filter(Boolean))];

  const filteredLaunches = launches.filter(l => {
    if (selectedProvider === 'all') return true;
    return l.provider === selectedProvider;
  }).sort((a, b) => {
    const dateA = new Date(a.net).getTime();
    const dateB = new Date(b.net).getTime();
    if (sortBy === 'latest') return dateA - dateB; 
    if (sortBy === 'oldest') return dateB - dateA; 
    return 0;
  });

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
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <motion.span 
              layoutId="spacetec-brand"
              style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
            >
              SPACETEC
            </motion.span>
          </div>

          <button 
            onClick={handleBackToMainWithTransition}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
              // ARCHIVED ORBITAL MANIFEST
            </span>
            <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
              EXPLORE MORE LAUNCHES
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Sort by Date</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                <option value="latest">Chronological (Upcoming First)</option>
                <option value="oldest">Distant Future First</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Filter Agency</span>
              <select 
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                {providers.map(p => (
                  <option key={p} value={p}>{p === 'all' ? 'All Agencies' : p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {filteredLaunches.map((launch) => (
            <motion.div 
              key={launch.id}
              layoutId={`launch-card-${launch.id}`}
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
            </motion.div>
          ))}
          {filteredLaunches.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#a1a1aa' }}>
              No launches found matching the selected filter criteria.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isReturningMain && (
          <motion.div
            key="returning-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`ret-bg-${idx}`}
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
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                CONNECTING TO MAIN...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LaunchCountdownModal({ launch, onClose, spaceBackgrounds }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [modalBgIdx, setModalBgIdx] = useState(0);
  const modalCanvasRef = useRef(null);

  useEffect(() => {
    const modalBgTimer = setInterval(() => {
      setModalBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(modalBgTimer);
  }, [spaceBackgrounds.length]);

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

      <canvas ref={modalCanvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <motion.div 
        layoutId={`launch-card-${launch.id}`}
        style={{ maxWidth: '900px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 3 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2.5rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}>
                SPACETEC
              </span>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', paddingBottom: '3rem' }}>
          
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
