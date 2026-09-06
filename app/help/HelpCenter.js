'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HELP_SECTIONS } from './helpContent';

const ENTER_DELAY_MS = 2000;

function normalize(text) {
  return (text || '').toLowerCase();
}

export default function HelpCenter() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null); // only one FAQ open at a time, across all sections
  const [reducedMotion, setReducedMotion] = useState(false);

  // Same intro hold + dock-into-header pattern used by the other dedicated
  // SpaceTec pages (Help & Review, Space Weather, etc.).
  useEffect(() => {
    const t = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const goHome = () => { window.location.href = '/'; };

  const filteredSections = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return HELP_SECTIONS;
    return HELP_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => normalize(item.q).includes(q) || normalize(item.a).includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [query]);

  const totalResults = filteredSections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <main className="help-page">
      <div className="help-stars" />

      <header className="help-header">
        <div className="help-brand-slot">
          <button
            type="button"
            className="help-brand-link"
            onClick={() => { if (entered) goHome(); }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="help-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="help-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>

        <div className="help-header-tag" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          HELP CENTER
        </div>

        <button
          type="button"
          className="help-back"
          onClick={goHome}
          style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: entered ? 'auto' : 'none' }}
        >
          [← BACK TO MAIN]
        </button>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="help-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="help-intro-screen"
          >
            <motion.div
              layoutId="help-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 className="help-intro-title">SPACETEC</h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="help-intro-tagline"
            >
              HELP CENTER
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="help-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
      >
        <span className="help-kicker">HELP CENTER</span>
        <h1 className="help-title">Find answers and learn how to use SpaceTec.</h1>

        <div className="help-search-wrap">
          <label htmlFor="help-search" className="help-search-label">SEARCH HELP</label>
          <input
            id="help-search"
            type="text"
            className="help-search-input"
            placeholder="Search help articles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {totalResults === 0 ? (
          <div className="help-empty">
            <p className="help-empty-title">NO HELP ARTICLES FOUND</p>
            <p className="help-empty-sub">Try another search term.</p>
          </div>
        ) : (
          filteredSections.map((section) => (
            <section key={section.id} className="help-section">
              <h2 className="help-section-title">{section.title}</h2>
              <div className="help-faq-list">
                {section.items.map((item, idx) => {
                  const itemId = `${section.id}-${idx}`;
                  const isOpen = openId === itemId;
                  const answerId = `help-answer-${itemId}`;
                  return (
                    <div className="help-faq-item" key={itemId}>
                      <h3 className="help-faq-heading">
                        <button
                          type="button"
                          className="help-faq-question"
                          aria-expanded={isOpen}
                          aria-controls={answerId}
                          onClick={() => setOpenId(isOpen ? null : itemId)}
                        >
                          <span>{item.q}</span>
                          <span className={`help-faq-chevron${isOpen ? ' help-faq-chevron-open' : ''}`} aria-hidden="true">▾</span>
                        </button>
                      </h3>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            id={answerId}
                            role="region"
                            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                            animate={reducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                            exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                            transition={{ duration: reducedMotion ? 0.01 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <p className="help-faq-answer">{item.a}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </motion.div>

      <style jsx global>{`
        .help-page {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', -apple-system, sans-serif;
        }

        .help-stars {
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

        .help-header {
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

        .help-brand-slot { display: flex; align-items: center; min-width: 180px; }
        .help-brand-link { border: 0; background: transparent; cursor: pointer; padding: 0; }
        .help-brand-text {
          display: inline-block; color: #ffffff; font-weight: 900; font-size: 1.25rem;
          letter-spacing: 8px; text-transform: uppercase; white-space: nowrap;
        }
        .help-header-tag { color: #64748b; font-size: 0.7rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
        .help-back {
          background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.3); color: #fff;
          padding: 0.6rem 1.1rem; cursor: pointer; font-size: 0.7rem; letter-spacing: 2px; font-weight: 700;
          text-transform: uppercase; font-family: inherit; min-width: 150px; text-align: right;
        }
        .help-back:hover { background: rgba(255, 255, 255, 0.15); }

        .help-intro-screen {
          position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column;
          justify-content: center; align-items: center; background: #000000; padding: 2rem;
        }
        .help-intro-title { font-size: calc(3.5rem + 4vw); font-weight: 900; margin: 0; text-transform: uppercase; color: #ffffff; }
        .help-intro-tagline {
          font-size: calc(0.7rem + 0.3vw); letter-spacing: 12px; color: #ffffff; text-transform: uppercase;
          margin-top: 1.5rem; font-weight: 500; text-align: center;
        }

        .help-content {
          position: relative;
          z-index: 3;
          max-width: 760px;
          margin: 0 auto;
          padding: 4rem 2rem 8rem;
          box-sizing: border-box;
        }

        .help-kicker {
          display: inline-block; color: #71717a; font-size: 0.68rem; font-weight: 700;
          letter-spacing: 3px; text-transform: uppercase;
        }
        .help-title {
          margin: 0.8rem 0 2rem; font-size: clamp(1.5rem, 3vw, 2.1rem); font-weight: 800; color: #f8fafc;
          max-width: 600px;
        }

        .help-search-wrap { margin-bottom: 3rem; }
        .help-search-label {
          display: block; color: #71717a; font-size: 0.65rem; letter-spacing: 2px;
          text-transform: uppercase; font-weight: 700; margin-bottom: 0.5rem;
        }
        .help-search-input {
          width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 0.9rem 1rem;
          font-size: 0.9rem; font-family: inherit; outline: none;
        }
        .help-search-input:focus { border-color: rgba(255,255,255,0.45); }

        .help-empty { padding: 3rem 0; text-align: center; }
        .help-empty-title { color: #f8fafc; font-size: 0.9rem; letter-spacing: 2px; font-weight: 800; margin: 0 0 0.5rem; }
        .help-empty-sub { color: #71717a; font-size: 0.8rem; margin: 0; }

        .help-section { margin-bottom: 2.5rem; }
        .help-section-title {
          color: #71717a; font-size: 0.7rem; font-weight: 800; letter-spacing: 3px;
          text-transform: uppercase; margin: 0 0 1rem; padding-bottom: 0.6rem;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .help-faq-list { display: flex; flex-direction: column; }
        .help-faq-item { border-bottom: 1px solid rgba(255,255,255,0.08); }
        .help-faq-heading { margin: 0; }
        .help-faq-question {
          width: 100%; background: none; border: none; color: #f8fafc; font-family: inherit;
          font-size: 0.88rem; font-weight: 600; text-align: left; padding: 1rem 0; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between; gap: 1rem;
        }
        .help-faq-question:hover { color: #ffffff; }
        .help-faq-question:focus-visible { outline: 1px solid rgba(255,255,255,0.4); outline-offset: 2px; }
        .help-faq-chevron { display: inline-block; color: #71717a; transition: transform 0.25s ease; flex-shrink: 0; }
        .help-faq-chevron-open { transform: rotate(180deg); }
        .help-faq-answer { color: #a1a1aa; font-size: 0.85rem; line-height: 1.7; margin: 0 0 1.2rem; padding-right: 1.6rem; }

        @media (prefers-reduced-motion: reduce) {
          .help-faq-chevron { transition: none; }
        }

        @media (max-width: 720px) {
          .help-header { padding: 0 1.1rem; }
          .help-header-tag { display: none; }
          .help-content { padding: 3rem 1.1rem 6rem; }
        }
      `}</style>
    </main>
  );
}
