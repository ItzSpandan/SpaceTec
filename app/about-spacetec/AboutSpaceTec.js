'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  TILE_ROW_1,
  TILE_ROW_2,
  FEATURE_GROUPS,
  NETWORK_NODES,
  MOTION_MODULES,
  CONNECTION_CHAINS,
  SOCIAL_LINKS,
  WHAT_IS_SPACETEC,
} from './aboutData';
import { XIcon, DiscordIcon, YouTubeIcon, InstagramIcon, GitHubIcon } from './SocialIcons';

const SOCIAL_ICONS = {
  x: XIcon,
  discord: DiscordIcon,
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  github: GitHubIcon,
};

// Small helper so both the network diagram's live pulses and the social
// entrance animation can back off for people who've asked for less motion.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

const ENTER_DELAY_MS = 2000;

// Same rotating dimmed space-photo background used on the SpaceTec homepage
// (see the `spaceBackgrounds` array + `.space-bg-layer` / `.dark-overlay`
// classes in SpaceTecHub.js). Reused as-is rather than inventing a new one.
const SPACE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069',
];

const BG_ROTATE_MS = 7000;

// --- Section kicker/heading, matching the restrained label style used
// across the rest of SpaceTec's dedicated pages (uppercase, letter-spaced,
// small monospace-ish kicker above a larger heading). -----------------------
function SectionHead({ kicker, title, sub, centered }) {
  return (
    <div className={`as-section-head${centered ? ' as-section-head-center' : ''}`}>
      <span className="as-kicker">{kicker}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

// --- One tile in the moving feature streams --------------------------------
function FeatureTile({ tile }) {
  return (
    <a href={tile.href} className="as-tile">
      <div className="as-tile-top">
        <span className="as-tile-title">{tile.title}</span>
        <span className="as-tile-sub">{tile.sub}</span>
      </div>
      <div className="as-tile-detail">
        <p>{tile.detail}</p>
        <span className="as-tile-explore">EXPLORE →</span>
      </div>
    </a>
  );
}

// --- A single continuously-scrolling row. The tile array is duplicated once
// so the CSS transform loop (0% -> -50%) is seamless, and the whole loop is
// pure CSS (no per-frame JS/timers), per the performance requirement. -------
function TileRow({ tiles, duration, reverse }) {
  const doubled = [...tiles, ...tiles];
  return (
    <div className="as-row-mask">
      <div
        className={`as-row-track${reverse ? ' as-row-reverse' : ''}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {doubled.map((tile, idx) => (
          <FeatureTile tile={tile} key={`${tile.title}-${idx}`} />
        ))}
      </div>
    </div>
  );
}

// --- "SpaceTec in Motion" — smaller, purely visual traveling modules -------
function MotionRow() {
  const doubled = [...MOTION_MODULES, ...MOTION_MODULES];
  return (
    <div className="as-row-mask as-motion-mask">
      <div className="as-motion-track">
        {doubled.map((mod, idx) => (
          <div className="as-motion-module" key={`${mod.label}-${idx}`}>
            <span className="as-motion-label">{mod.label}</span>
            <span className="as-motion-sub">{mod.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SpaceTec network — "the ecosystem coming together" -------------------
// Not a circle: eight feature modules sit in a fixed editorial arrangement
// around a central SPACETEC core. On first scroll into view the modules
// settle into place, then a thin trace draws from each one back to the
// core, and the core itself settles in last — a single one-time sequence
// (useInView with `once: true`), not a loop. Layout math is a handful of
// constants (no per-frame JS); the only animation is Framer Motion's
// opacity/transform/pathLength, which is GPU-cheap and fully skipped for
// `prefers-reduced-motion` and whenever the section is off-screen.
const ASSEMBLY_POS = {
  tl: { x: 16.67, y: 16.67 },
  tc: { x: 50, y: 16.67 },
  tr: { x: 83.33, y: 16.67 },
  ml: { x: 16.67, y: 50 },
  mr: { x: 83.33, y: 50 },
  bl: { x: 16.67, y: 83.33 },
  bc: { x: 50, y: 83.33 },
  br: { x: 83.33, y: 83.33 },
};
const ASSEMBLY_CORE = { x: 50, y: 50 };

function NetworkAssembly({ reducedMotion }) {
  const wrapRef = useRef(null);
  const inView = useInView(wrapRef, { amount: 0.4, once: true, margin: '0px 0px -10% 0px' });
  const [hovered, setHovered] = useState(null);
  const play = inView || reducedMotion;

  const points = NETWORK_NODES.map((node) => ({
    ...node,
    ...(ASSEMBLY_POS[node.pos] || ASSEMBLY_CORE),
  }));

  const nodeDelay = (i) => 0.15 + i * 0.11;
  const lineDelay = (i) => 0.95 + i * 0.09;
  const coreDelay = 0.95 + points.length * 0.09 + 0.3;
  const t = (delay) => (reducedMotion ? { duration: 0 } : { duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] });

  return (
    <div className="as-assembly-wrap" ref={wrapRef}>
      <svg viewBox="0 0 100 100" className="as-assembly-svg" preserveAspectRatio="xMidYMid meet">
        {points.map((p, i) => (
          <motion.line
            key={`line-${i}`}
            x1={ASSEMBLY_CORE.x}
            y1={ASSEMBLY_CORE.y}
            x2={p.x}
            y2={p.y}
            className={`as-assembly-line${hovered === i ? ' is-highlighted' : ''}`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={t(lineDelay(i))}
          />
        ))}
      </svg>

      {points.map((p, i) => (
        <div key={`slot-${i}`} className="as-assembly-node-slot" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <motion.a
            href={p.href}
            className="as-assembly-node"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            initial={{ opacity: 0, x: (p.x - ASSEMBLY_CORE.x) * 1.1, y: (p.y - ASSEMBLY_CORE.y) * 1.1 }}
            animate={
              play
                ? { opacity: 1, x: 0, y: 0 }
                : { opacity: 0, x: (p.x - ASSEMBLY_CORE.x) * 1.1, y: (p.y - ASSEMBLY_CORE.y) * 1.1 }
            }
            transition={t(nodeDelay(i))}
          >
            {p.label}
          </motion.a>
        </div>
      ))}

      <div className="as-assembly-core-slot" style={{ left: `${ASSEMBLY_CORE.x}%`, top: `${ASSEMBLY_CORE.y}%` }}>
        <motion.div
          className="as-assembly-core"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={play ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
          transition={t(coreDelay)}
        >
          <span className="as-assembly-core-label">SPACETEC</span>
        </motion.div>
      </div>
    </div>
  );
}

// --- One "how the systems connect" chain -----------------------------------
function ConnectionChain({ chain }) {
  return (
    <div className="as-chain">
      <span className="as-chain-title">{chain.title}</span>
      <div className="as-chain-steps">
        {chain.steps.map((step, i) => (
          <div className="as-chain-step-row" key={step}>
            <span className="as-chain-step">{step}</span>
            {i < chain.steps.length - 1 && <span className="as-chain-arrow">↓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Stay connected: staggered, one-time entrance so every icon gets seen
// before the row settles — no looping, no re-hiding once shown. -----------
const socialContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.35, delayChildren: 0.1 } },
};

const socialItemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const socialContainerVariantsReduced = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

const socialItemVariantsReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

function SocialButton({ social, variants }) {
  const Icon = SOCIAL_ICONS[social.id];
  const content = (
    <>
      <Icon className="as-social-icon" />
      <span className="as-social-label">{social.label}</span>
    </>
  );

  return (
    <motion.div className="as-social-item" variants={variants}>
      {social.href ? (
        <a href={social.href} target="_blank" rel="noopener noreferrer" className="as-social-btn">
          {content}
        </a>
      ) : (
        <button type="button" className="as-social-btn" onClick={(e) => e.preventDefault()}>
          {content}
        </button>
      )}
    </motion.div>
  );
}

function SocialRow({ reducedMotion }) {
  const containerVariants = reducedMotion ? socialContainerVariantsReduced : socialContainerVariants;
  const itemVariants = reducedMotion ? socialItemVariantsReduced : socialItemVariants;

  return (
    <motion.div
      className="as-social-row"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={containerVariants}
    >
      {SOCIAL_LINKS.map((social) => (
        <SocialButton social={social} variants={itemVariants} key={social.id} />
      ))}
    </motion.div>
  );
}

export default function AboutSpaceTec() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const canvasRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  // Intro hold, then dock the SPACETEC wordmark into the header — same
  // pattern as space-weather/page.js, astronomy-tonight/page.js, etc.
  useEffect(() => {
    const t = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Rotating dimmed background photo, same interval as the homepage.
  useEffect(() => {
    const t = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SPACE_BACKGROUNDS.length);
    }, BG_ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  // Starfield canvas — identical approach to the one in SpaceTecHub.js
  // (180 slow-drifting dots), reused here rather than a new effect.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
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
      speed: Math.random() * 0.2 + 0.05,
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

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="as-page">
      {/* HOMEPAGE-STYLE BACKGROUND: rotating dimmed photo + dark overlay + starfield */}
      {SPACE_BACKGROUNDS.map((bgUrl, idx) => (
        <div
          key={bgUrl}
          className="as-bg-layer"
          style={{ backgroundImage: `url('${bgUrl}')`, opacity: bgIndex === idx ? 1 : 0 }}
        />
      ))}
      <div className="as-dark-overlay" />
      <canvas ref={canvasRef} className="as-starfield" />

      {/* HEADER */}
      <header className="as-header">
        <div className="as-brand-slot">
          <button
            type="button"
            className="as-brand-link"
            onClick={() => entered && goHome()}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="about-spacetec-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="as-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <div className="as-header-tag" style={{ opacity: entered ? 1 : 0 }}>
          ABOUT SPACETEC
        </div>
        <button
          type="button"
          className="as-back"
          onClick={goHome}
          style={{ opacity: entered ? 1 : 0, pointerEvents: entered ? 'auto' : 'none' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      {/* INTRO / SPACETEC → PAGE TRANSITION */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="as-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="as-intro-screen"
          >
            <motion.div
              layoutId="about-spacetec-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 className="as-intro-title">SPACETEC</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="as-intro-tagline"
            >
              THIS IS WHAT SPACETEC IS
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAGE CONTENT */}
      <motion.main
        className="as-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* SHORT INTRODUCTION */}
        <section className="as-section as-hero">
          <span className="as-kicker">UNIFIED COSMIC INTELLIGENCE</span>
          <h1 className="as-hero-title">One interface for everything SpaceTec tracks.</h1>
          <p className="as-hero-sub">
            Satellites, launches, missions, spacecraft, agencies, astronauts, the sky above you and the
            space environment around it — organized into a single, connected system.
          </p>
        </section>

        {/* MOVING FEATURE-TILE STREAMS */}
        <section className="as-section as-streams">
          <TileRow tiles={TILE_ROW_1} duration={54} />
          <TileRow tiles={TILE_ROW_2} duration={68} reverse />
        </section>

        {/* ORGANIZED FEATURE GROUPS */}
        <section className="as-section as-groups">
          <SectionHead
            kicker="THE SPACETEC ECOSYSTEM"
            title="Organized into four areas"
            sub="Every feature below already exists in SpaceTec — grouped here by what it's for."
          />
          <div className="as-group-grid">
            {FEATURE_GROUPS.map((group) => (
              <div className="as-group-card" key={group.name}>
                <h3>{group.name}</h3>
                <p className="as-group-blurb">{group.blurb}</p>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* SPACETEC NETWORK */}
        <section className="as-section as-network-section">
          <SectionHead
            kicker="ONE CONNECTED SYSTEM"
            title="The SpaceTec network"
            sub="Individually, each of these is its own system. Together, they connect back to one core."
          />
          <NetworkAssembly reducedMotion={reducedMotion} />
        </section>

        {/* SPACETEC IN MOTION */}
        <section className="as-section as-motion-section">
          <SectionHead kicker="SPACETEC IN MOTION" title="Always something in view" />
          <MotionRow />
        </section>

        {/* WHAT IS SPACETEC */}
        <section className="as-section as-what-is">
          <SectionHead kicker="WHAT IS SPACETEC?" title="A single view of the space around us" />
          <p className="as-what-is-text">{WHAT_IS_SPACETEC}</p>
        </section>

        {/* HOW THE SYSTEMS CONNECT */}
        <section className="as-section as-connections">
          <SectionHead
            kicker="HOW THE SYSTEMS CONNECT"
            title="SpaceTec is a connected ecosystem"
            sub="A few examples of how information flows between its parts."
          />
          <div className="as-chain-grid">
            {CONNECTION_CHAINS.map((chain) => (
              <ConnectionChain chain={chain} key={chain.title} />
            ))}
          </div>
        </section>

        {/* STAY CONNECTED */}
        <section className="as-section as-social">
          <SectionHead
            kicker="STAY CONNECTED"
            title="Connect with SpaceTec"
            sub="Follow the project and get involved."
            centered
          />
          <SocialRow reducedMotion={reducedMotion} />
        </section>

        {/* EXPLORE SPACETEC / FINAL CTA */}
        <section className="as-section as-cta">
          <h2>Explore SpaceTec</h2>
          <p>Start anywhere — every part of the system connects back to the rest.</p>
          <div className="as-cta-actions">
            <button type="button" className="as-cta-secondary" onClick={goHome}>
              [← BACK TO MAIN]
            </button>
          </div>
        </section>
      </motion.main>

      <style jsx global>{`
        .as-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #ffffff;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
          overflow-x: hidden;
        }

        .as-bg-layer {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transition: opacity 1.8s ease-in-out;
          filter: brightness(0.4) contrast(1.25);
        }

        .as-dark-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.95) 100%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, #000000 100%);
          z-index: 1;
          pointer-events: none;
        }

        .as-starfield {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }

        .as-header {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 5rem;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .as-brand-slot {
          display: flex;
          align-items: center;
          min-width: 180px;
        }

        .as-brand-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .as-brand-text {
          display: inline-block;
          color: #ffffff;
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: 8px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .as-header-tag {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          transition: opacity 0.6s ease;
        }

        .as-back {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          padding: 0.6rem 1.1rem;
          cursor: pointer;
          font-size: 0.7rem;
          letter-spacing: 2px;
          font-weight: 700;
          text-transform: uppercase;
          font-family: inherit;
          transition: opacity 0.6s ease, background 0.3s ease;
          min-width: 150px;
          text-align: right;
        }

        .as-back:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .as-intro-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: #000000;
          padding: 2rem;
        }

        .as-intro-title {
          font-size: calc(3.5rem + 4vw);
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          color: #ffffff;
        }

        .as-intro-tagline {
          font-size: calc(0.7rem + 0.3vw);
          letter-spacing: 12px;
          color: #ffffff;
          text-transform: uppercase;
          margin-top: 1.5rem;
          font-weight: 500;
          text-align: center;
        }

        .as-content {
          position: relative;
          z-index: 3;
          max-width: 1280px;
          margin: 0 auto;
          padding: 3rem 2rem 6rem;
        }

        .as-section {
          padding: 5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .as-section:last-child {
          border-bottom: none;
        }

        .as-kicker {
          display: inline-block;
          color: #38bdf8;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .as-section-head {
          margin-bottom: 3rem;
          max-width: 640px;
        }

        .as-section-head h2 {
          margin: 0.7rem 0 0.6rem;
          font-size: clamp(1.6rem, 2.4vw, 2.2rem);
          font-weight: 800;
          color: #f8fafc;
        }

        .as-section-head p {
          margin: 0;
          color: #a1a1aa;
          font-size: 0.92rem;
          line-height: 1.6;
        }

        .as-section-head-center {
          margin-left: auto;
          margin-right: auto;
          text-align: center;
        }

        /* HERO */
        .as-hero {
          padding-top: 2rem;
          text-align: left;
          max-width: 760px;
        }

        .as-hero-title {
          margin: 0.8rem 0 1.2rem;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 800;
          line-height: 1.15;
          color: #f8fafc;
        }

        .as-hero-sub {
          margin: 0;
          color: #a1a1aa;
          font-size: 1rem;
          line-height: 1.7;
          max-width: 620px;
        }

        /* MOVING TILE STREAMS */
        .as-streams {
          padding-left: 0;
          padding-right: 0;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }

        .as-row-mask {
          overflow: hidden;
          width: 100%;
          mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
          -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
        }

        .as-row-track {
          display: flex;
          gap: 1.1rem;
          width: max-content;
          animation-name: as-scroll-left;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .as-row-track.as-row-reverse {
          animation-name: as-scroll-right;
        }

        .as-row-mask:hover .as-row-track {
          animation-play-state: paused;
        }

        @keyframes as-scroll-left {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes as-scroll-right {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }

        .as-tile {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 0 0 auto;
          width: 260px;
          min-height: 108px;
          padding: 1.2rem 1.3rem;
          background: rgba(15, 15, 15, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.12);
          text-decoration: none;
          color: inherit;
          transition: transform 0.35s ease, border-color 0.35s ease, background 0.35s ease;
          overflow: hidden;
        }

        .as-tile:hover {
          transform: scale(1.045);
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(20, 20, 20, 0.9);
          z-index: 2;
        }

        .as-tile-top {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .as-tile-title {
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #f8fafc;
          text-transform: uppercase;
        }

        .as-tile-sub {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 1.5px;
          color: #64748b;
          text-transform: uppercase;
        }

        .as-tile-detail {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 0.35s ease, opacity 0.35s ease, margin-top 0.35s ease;
        }

        .as-tile:hover .as-tile-detail {
          max-height: 120px;
          opacity: 1;
          margin-top: 0.7rem;
        }

        .as-tile-detail p {
          margin: 0 0 0.5rem;
          font-size: 0.74rem;
          line-height: 1.5;
          color: #a1a1aa;
        }

        .as-tile-explore {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #38bdf8;
        }

        /* FEATURE GROUPS */
        .as-group-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.4rem;
        }

        .as-group-card {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.6rem;
          background: rgba(255, 255, 255, 0.015);
        }

        .as-group-card h3 {
          margin: 0 0 0.6rem;
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 2px;
          color: #f8fafc;
          text-transform: uppercase;
        }

        .as-group-blurb {
          margin: 0 0 1.1rem;
          color: #71717a;
          font-size: 0.78rem;
          line-height: 1.55;
        }

        .as-group-card ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        .as-group-card li {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .as-group-card li:first-child {
          border-top: none;
        }

        .as-group-card a {
          display: block;
          padding: 0.65rem 0;
          color: #d4d4d8;
          text-decoration: none;
          font-size: 0.82rem;
          letter-spacing: 0.3px;
          transition: color 0.25s ease, padding-left 0.25s ease;
        }

        .as-group-card a:hover {
          color: #ffffff;
          padding-left: 0.4rem;
        }

        /* SPACETEC NETWORK ASSEMBLY */
        .as-assembly-wrap {
          position: relative;
          width: 100%;
          max-width: 720px;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
        }

        .as-assembly-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }

        .as-assembly-line {
          stroke: rgba(255, 255, 255, 0.18);
          stroke-width: 0.35;
          vector-effect: non-scaling-stroke;
          transition: stroke 0.35s ease, stroke-width 0.35s ease;
        }

        .as-assembly-line.is-highlighted {
          stroke: rgba(56, 189, 248, 0.6);
        }

        .as-assembly-node-slot,
        .as-assembly-core-slot {
          position: absolute;
          transform: translate(-50%, -50%);
        }

        .as-assembly-node {
          display: inline-block;
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 1.4px;
          color: #a1a1aa;
          text-decoration: none;
          background: #000000;
          padding: 0.55rem 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          white-space: nowrap;
          transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
        }

        .as-assembly-node:hover {
          color: #ffffff;
          border-color: rgba(56, 189, 248, 0.5);
          background: rgba(56, 189, 248, 0.08);
          transform: translateY(-2px);
        }

        .as-assembly-core {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 130px;
          min-height: 62px;
          padding: 0.8rem 1.4rem;
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.28);
        }

        .as-assembly-core-label {
          font-size: 0.95rem;
          font-weight: 900;
          letter-spacing: 3px;
          color: #ffffff;
        }

        /* SPACETEC IN MOTION */
        .as-motion-mask {
          padding: 0.5rem 0;
        }

        .as-motion-track {
          display: flex;
          gap: 1rem;
          width: max-content;
          animation: as-scroll-left 40s linear infinite;
        }

        .as-motion-mask:hover .as-motion-track {
          animation-play-state: paused;
        }

        .as-motion-module {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          padding: 0.9rem 1.3rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          min-width: 170px;
        }

        .as-motion-label {
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 2px;
          color: #f8fafc;
        }

        .as-motion-sub {
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 1.2px;
          color: #64748b;
        }

        /* WHAT IS SPACETEC */
        .as-what-is-text {
          max-width: 780px;
          color: #d4d4d8;
          font-size: 1rem;
          line-height: 1.85;
        }

        /* CONNECTIONS */
        .as-chain-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 2rem;
        }

        .as-chain {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.6rem;
        }

        .as-chain-title {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #64748b;
          margin-bottom: 1.2rem;
        }

        .as-chain-steps {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .as-chain-step-row {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .as-chain-step {
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #f8fafc;
          padding: 0.35rem 0.7rem;
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .as-chain-arrow {
          color: #38bdf8;
          font-size: 0.9rem;
          padding: 0.2rem 0 0.2rem 0.9rem;
        }

        /* STAY CONNECTED */
        .as-social-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          margin: 0 auto;
        }

        .as-social-item {
          flex: 0 0 auto;
        }

        .as-social-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.8rem 1.3rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #a1a1aa;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
          transition: border-color 0.25s ease, color 0.25s ease, background 0.25s ease, transform 0.25s ease;
        }

        .as-social-btn:hover {
          border-color: rgba(255, 255, 255, 0.35);
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .as-social-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .as-social-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        /* CTA */
        .as-cta {
          text-align: center;
        }

        .as-cta h2 {
          margin: 0 0 0.6rem;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 800;
          color: #f8fafc;
        }

        .as-cta p {
          margin: 0 0 2rem;
          color: #a1a1aa;
          font-size: 0.95rem;
        }

        .as-cta-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .as-cta-secondary {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          padding: 0.85rem 1.5rem;
          cursor: pointer;
          font-size: 0.72rem;
          letter-spacing: 2px;
          font-weight: 700;
          text-transform: uppercase;
          font-family: inherit;
        }

        .as-cta-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 720px) {
          .as-header {
            padding: 0 1.1rem;
          }
          .as-header-tag {
            display: none;
          }
          .as-content {
            padding: 2rem 1.1rem 4rem;
          }
          .as-tile {
            width: 220px;
          }
          .as-assembly-node {
            font-size: 0.56rem;
            padding: 0.4rem 0.55rem;
          }
          .as-assembly-core {
            min-width: 96px;
            min-height: 46px;
            padding: 0.5rem 0.9rem;
          }
          .as-assembly-core-label {
            font-size: 0.72rem;
            letter-spacing: 2px;
          }
        }
      `}</style>
    </div>
  );
}
