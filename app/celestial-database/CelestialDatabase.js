'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { CELESTIAL_OBJECTS, OBJECT_TYPES } from './celestialData';
import { computeStats, searchObjects, filterObjects, getDetailFields } from './celestialUtils';

const ENTER_DELAY_MS = 2000;

// The 3D viewer (and Three.js itself) is only pulled in once a detail view
// actually mounts it — never on the listing grid.
const CelestialViewer = dynamic(() => import('./CelestialViewer'), {
  ssr: false,
  loading: () => <div className="cd-viewer-loading">LOADING 3D MODEL...</div>,
});

function ObjectCard({ object, onSelect }) {
  return (
    <button type="button" className="cd-card" onClick={() => onSelect(object.id)}>
      <div className="cd-card-meta">
        <span className="cd-type">{object.type}</span>
        {object.catalog && <span className="cd-catalog">{object.catalog}</span>}
      </div>
      <h3 className="cd-card-name">{object.name}</h3>
      <p className="cd-card-desc">{object.description}</p>
      <div className="cd-card-footer">
        <span>{object.domain}</span>
        <span className="cd-card-arrow">VIEW DETAILS →</span>
      </div>
    </button>
  );
}

function DetailView({ object, onBack }) {
  const fields = useMemo(() => getDetailFields(object), [object]);
  const has3D = object.render && object.render.kind !== 'none';

  return (
    <section className="cd-detail">
      <button type="button" className="cd-back" onClick={onBack}>← BACK TO DATABASE</button>

      <div className="cd-detail-head">
        <span className="cd-kicker">{object.type}</span>
        <h1>{object.name}</h1>
        <p>{object.description}</p>
      </div>

      <div className="cd-detail-grid">
        <div className="cd-detail-viewer">
          {has3D ? (
            <CelestialViewer render={object.render} label={object.name} />
          ) : (
            <div className="cd-viewer-fallback">
              <span>NO 3D MODEL FOR THIS OBJECT TYPE</span>
              <p>{object.name} is represented here through scientific data only — a conventional 3D model would misrepresent this kind of object.</p>
            </div>
          )}
        </div>

        <div className="cd-detail-data">
          <span className="cd-kicker">KEY SCIENTIFIC DATA</span>
          <div className="cd-field-list">
            {fields.map((f) => (
              <div className="cd-field-row" key={f.key}>
                <span>{f.label}</span>
                <b>{f.display}</b>
              </div>
            ))}
          </div>

          {object.related?.length > 0 && (
            <>
              <span className="cd-kicker" style={{ marginTop: '28px' }}>RELATED</span>
              <div className="cd-related-list">
                {object.related.map((r) => (
                  <a key={r.label} href={r.href} className="cd-related-link">{r.label}</a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function CelestialDatabase() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('ALL');
  const [activeDomain, setActiveDomain] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  const stats = useMemo(() => computeStats(CELESTIAL_OBJECTS), []);

  const results = useMemo(() => {
    const filtered = filterObjects(CELESTIAL_OBJECTS, { type: activeType, domain: activeDomain });
    return searchObjects(filtered, query);
  }, [query, activeType, activeDomain]);

  const selectedObject = useMemo(
    () => CELESTIAL_OBJECTS.find((o) => o.id === selectedId) || null,
    [selectedId]
  );

  return (
    <main className="cd-page">
      <div className="cd-stars" />

      <header className="cd-header">
        <div className="cd-brand-slot">
          <button
            type="button"
            className="cd-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="cd-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="cd-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <div className="cd-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          DATABASE ONLINE
        </div>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="cd-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              backgroundColor: '#000000', padding: '2rem',
            }}
          >
            <motion.div
              layoutId="cd-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
                CELESTIAL DATABASE
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
            >
              INDEXING KNOWN OBJECTS...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="cd-content">
        {selectedObject ? (
          <DetailView object={selectedObject} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="cd-hero">
              <span className="cd-kicker">SPACETEC DATABASE</span>
              <h1>CELESTIAL DATABASE</h1>
              <p>SpaceTec&apos;s searchable index of major celestial objects — planets, moons, asteroids, comets, exoplanets and deep-space objects.</p>

              <div className="cd-stats">
                <div className="cd-stat"><b>{stats.TOTAL}</b><span>TOTAL OBJECTS</span></div>
                <div className="cd-stat"><b>{stats.PLANETS}</b><span>PLANETS</span></div>
                <div className="cd-stat"><b>{stats.MOONS}</b><span>MOONS</span></div>
                <div className="cd-stat"><b>{stats.ASTEROIDS}</b><span>ASTEROIDS</span></div>
                <div className="cd-stat"><b>{stats.COMETS}</b><span>COMETS</span></div>
                <div className="cd-stat"><b>{stats.EXOPLANETS}</b><span>EXOPLANETS</span></div>
              </div>
            </section>

            <section className="cd-controls">
              <input
                type="text"
                className="cd-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search celestial objects..."
              />

              <div className="cd-filter-row">
                <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
                  <option value="ALL">ALL TYPES</option>
                  {OBJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={activeDomain} onChange={(e) => setActiveDomain(e.target.value)}>
                  <option value="ALL">ALL DOMAINS</option>
                  <option value="SOLAR SYSTEM">SOLAR SYSTEM</option>
                  <option value="DEEP SPACE">DEEP SPACE</option>
                </select>
              </div>
            </section>

            <section className="cd-grid-section">
              {results.length === 0 ? (
                <div className="cd-empty">NO OBJECTS MATCH THIS QUERY</div>
              ) : (
                <div className="cd-grid">
                  {results.map((o) => (
                    <ObjectCard key={o.id} object={o} onSelect={setSelectedId} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .cd-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .cd-stars {
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

        .cd-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 68px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .cd-brand-link { background: none; border: none; cursor: pointer; padding: 0; }
        .cd-brand-text { display: inline-block; color: #fff; font-weight: 800; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; }
        .cd-header-status { color: #64748b; font: 600 0.58rem/1 monospace; letter-spacing: 2px; }

        .cd-content { position: relative; z-index: 5; max-width: 1240px; margin: 0 auto; padding: 60px 30px 90px; }

        .cd-kicker { display: block; color: #64748b; font: 700 0.62rem/1.4 monospace; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 10px; }

        .cd-hero { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 32px; margin-bottom: 32px; }
        .cd-hero h1 { margin: 10px 0 18px; color: #f8fafc; font: 800 3.4rem/0.95 'Space Grotesk', sans-serif; letter-spacing: -2px; }
        .cd-hero p { max-width: 720px; color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; }

        .cd-stats { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 28px; }
        .cd-stat { display: flex; flex-direction: column; }
        .cd-stat b { color: #38bdf8; font: 800 1.6rem/1 'Space Grotesk', sans-serif; }
        .cd-stat span { color: #64748b; font: 700 0.58rem/1.6 monospace; letter-spacing: 1.5px; }

        .cd-controls { margin-bottom: 32px; }
        .cd-search {
          width: 100%; max-width: 480px; background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12); color: #fff; padding: 11px 14px;
          font: 500 0.85rem 'Space Grotesk', sans-serif; letter-spacing: 0.4px; margin-bottom: 16px; display: block;
        }
        .cd-search::placeholder { color: #52525b; }
        .cd-search:focus { outline: none; border-color: rgba(56, 189, 248, 0.5); }

        .cd-filter-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .cd-filter-row select {
          background: #000; border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8;
          padding: 8px 12px; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
        }

        .cd-grid-section { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; }

        .cd-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); }

        .cd-card {
          background: #000; text-align: left; border: none; color: #fff; padding: 22px;
          display: flex; flex-direction: column; cursor: pointer; font-family: inherit;
        }
        .cd-card:hover { background: rgba(255, 255, 255, 0.03); }

        .cd-card-meta { display: flex; justify-content: space-between; color: #38bdf8; font: 700 0.58rem/1 monospace; letter-spacing: 1.5px; margin-bottom: 10px; }
        .cd-catalog { color: #64748b; }

        .cd-card-name { margin: 0 0 8px; color: #f8fafc; font: 700 1.1rem/1.3 'Space Grotesk', sans-serif; }
        .cd-card-desc { color: #a1a1aa; font-size: 0.8rem; line-height: 1.55; margin: 0 0 16px; flex: 1; }

        .cd-card-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; color: #64748b; font: 700 0.58rem/1 monospace; letter-spacing: 1px; }
        .cd-card-arrow { color: #38bdf8; }

        .cd-empty { padding: 40px 0; color: #52525b; font: 700 0.75rem/1 monospace; letter-spacing: 1.5px; text-align: center; border: 1px dashed rgba(255, 255, 255, 0.08); }

        .cd-back { background: none; border: none; color: #64748b; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; cursor: pointer; padding: 0; margin-bottom: 28px; }
        .cd-back:hover { color: #fff; }

        .cd-detail-head { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 28px; margin-bottom: 32px; }
        .cd-detail-head h1 { margin: 10px 0 14px; color: #f8fafc; font: 800 2.6rem/1 'Space Grotesk', sans-serif; letter-spacing: -1px; }
        .cd-detail-head p { max-width: 720px; color: #a1a1aa; font-size: 0.9rem; line-height: 1.6; }

        .cd-detail-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; }

        .cd-detail-viewer { border: 1px solid rgba(255, 255, 255, 0.08); height: 420px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .cd-viewer-canvas { width: 100%; height: 100%; }
        .cd-viewer-loading, .cd-viewer-fallback { color: #52525b; font: 700 0.68rem/1.6 monospace; letter-spacing: 1.5px; text-align: center; padding: 30px; }
        .cd-viewer-fallback p { color: #71717a; font: 400 0.72rem/1.6 'Space Grotesk', sans-serif; letter-spacing: 0.2px; text-transform: none; margin-top: 10px; }

        .cd-field-list { border-top: 1px solid rgba(255, 255, 255, 0.08); }
        .cd-field-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font: 600 0.65rem/1.3 monospace; letter-spacing: 1px; color: #64748b; }
        .cd-field-row b { color: #dbe4ef; font-size: 0.72rem; text-align: right; }

        .cd-related-list { display: flex; flex-direction: column; gap: 8px; }
        .cd-related-link { color: #38bdf8; text-decoration: none; font: 700 0.65rem/1 monospace; letter-spacing: 1px; }
        .cd-related-link:hover { text-decoration: underline; }

        @media (max-width: 1024px) {
          .cd-grid { grid-template-columns: repeat(2, 1fr); }
          .cd-detail-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .cd-grid { grid-template-columns: 1fr; }
          .cd-hero h1 { font-size: 2.4rem; }
          .cd-brand-text { font-size: 0.85rem; letter-spacing: 4px; }
        }
      `}</style>
    </main>
  );
}
