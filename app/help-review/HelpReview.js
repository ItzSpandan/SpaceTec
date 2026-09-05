'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ENTER_DELAY_MS = 2000;

export default function HelpReview() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  // Same intro hold + dock-into-header pattern used by the other dedicated
  // SpaceTec pages (space-weather, astronomy-tonight, etc.): the intro is
  // visible from first paint so there's no flash of the page underneath.
  useEffect(() => {
    const t = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <main className="hr-page">
      <div className="hr-stars" />

      <header className="hr-header">
        <div className="hr-brand-slot">
          <button
            type="button"
            className="hr-brand-link"
            onClick={() => { if (entered) goHome(); }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="hr-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="hr-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>

        <div className="hr-header-tag" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          HELP &amp; REVIEW
        </div>

        <button
          type="button"
          className="hr-back"
          onClick={goHome}
          style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: entered ? 'auto' : 'none' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      {/* ENTRY TRANSITION: SPACETEC big & centered, holds, then docks into the header */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="hr-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="hr-intro-screen"
          >
            <motion.div
              layoutId="hr-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 className="hr-intro-title">SPACETEC</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hr-intro-tagline"
            >
              HELP &amp; REVIEW
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="hr-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="hr-kicker">HELP &amp; REVIEW</span>
        <h1 className="hr-title">How can we help?</h1>
        <p className="hr-sub">Get help with SpaceTec, or leave a review of your experience.</p>

        <div className="hr-options">
          <button type="button" className="hr-option" onClick={() => alert('Help coming soon!')}>
            <span className="hr-option-title">HELP</span>
            <span className="hr-option-desc">Find answers or get support with SpaceTec.</span>
          </button>
          <button type="button" className="hr-option" onClick={() => alert('Review coming soon!')}>
            <span className="hr-option-title">REVIEW</span>
            <span className="hr-option-desc">Share feedback on your SpaceTec experience.</span>
          </button>
        </div>
      </motion.div>

      <style jsx global>{`
        .hr-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
        }

        .hr-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.3;
          z-index: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0 1px, transparent 1.2px),
            radial-gradient(circle, rgba(255, 255, 255, 0.5) 0 1px, transparent 1.2px);
          background-size: 97px 97px, 157px 157px;
          background-position: 10px 20px, 50px 70px;
        }

        .hr-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 68px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #000000;
        }

        .hr-brand-slot {
          display: flex;
          align-items: center;
          min-width: 180px;
        }

        .hr-brand-link {
          border: 0;
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        .hr-brand-text {
          display: inline-block;
          color: #ffffff;
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: 8px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .hr-header-tag {
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .hr-back {
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
          min-width: 150px;
          text-align: right;
        }

        .hr-back:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .hr-intro-screen {
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

        .hr-intro-title {
          font-size: calc(3.5rem + 4vw);
          font-weight: 900;
          margin: 0;
          text-transform: uppercase;
          color: #ffffff;
        }

        .hr-intro-tagline {
          font-size: calc(0.7rem + 0.3vw);
          letter-spacing: 12px;
          color: #ffffff;
          text-transform: uppercase;
          margin-top: 1.5rem;
          font-weight: 500;
          text-align: center;
        }

        .hr-content {
          position: relative;
          z-index: 3;
          max-width: 720px;
          margin: 0 auto;
          padding: 6rem 2rem 8rem;
          text-align: center;
        }

        .hr-kicker {
          display: inline-block;
          color: #38bdf8;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .hr-title {
          margin: 0.8rem 0 0.8rem;
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          color: #f8fafc;
        }

        .hr-sub {
          margin: 0 0 3rem;
          color: #a1a1aa;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .hr-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.4rem;
        }

        .hr-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 1.6rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: inherit;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease;
        }

        .hr-option:hover {
          border-color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.05);
          transform: translateY(-2px);
        }

        .hr-option-title {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: 2px;
          color: #f8fafc;
        }

        .hr-option-desc {
          font-size: 0.8rem;
          line-height: 1.5;
          color: #a1a1aa;
        }

        @media (max-width: 720px) {
          .hr-header {
            padding: 0 1.1rem;
          }
          .hr-header-tag {
            display: none;
          }
          .hr-content {
            padding: 4rem 1.1rem 6rem;
          }
        }
      `}</style>
    </main>
  );
}
