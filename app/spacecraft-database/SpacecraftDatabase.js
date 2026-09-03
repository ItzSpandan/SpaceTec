'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPACECRAFT, TYPE_VALUES, STATUS_VALUES } from './spacecraftData';
import {
  computeStats,
  searchSpacecraft,
  filterSpacecraft,
  sortSpacecraft,
  uniqueValues,
  formatDate,
  specRows,
  profileRows,
} from './spacecraftUtils';
import CelestialBackground from '../celestial-database/CelestialBackground';

const ENTER_DELAY_MS = 2000;

function SpacecraftCard({ craft, onSelect }) {
  const firstFlightYear = craft.firstFlight ? craft.firstFlight.slice(0, 4) : null;
  return (
    <button type="button" className="sc-card" onClick={() => onSelect(craft.id)}>
      <div className="sc-card-meta">
        <span className="sc-status" data-status={craft.status}>{craft.status}</span>
        <span className="sc-type">{craft.type}</span>
      </div>
      <h3 className="sc-card-name">{craft.name}</h3>
      <div className="sc-card-sub">
        {craft.agency && <span>{craft.agency}</span>}
        {craft.agency && firstFlightYear && <span className="sc-card-sub-dot">•</span>}
        {firstFlightYear && <span>SINCE {firstFlightYear}</span>}
      </div>
      <p className="sc-card-desc">{craft.summary}</p>
      <div className="sc-card-footer">
        <span>{craft.missions?.length || 0} LOGGED MISSION{craft.missions?.length === 1 ? '' : 'S'}</span>
        <span className="sc-card-arrow">VIEW PROFILE →</span>
      </div>
    </button>
  );
}

function DetailView({ craft, onBack }) {
  const specs = specRows(craft.specs);
  const profile = profileRows(craft);
  const hasMissions = (craft.missions || []).length > 0;
  const hasLaunchVehicles = (craft.launchVehicles || []).length > 0;

  return (
    <section className="sc-detail">
      <button type="button" className="sc-back" onClick={onBack}>← BACK TO DATABASE</button>

      <div className="sc-detail-head">
        <span className="sc-kicker">{craft.type}</span>
        <h1>{craft.name}</h1>
        <p>{craft.summary}</p>
      </div>

      <div className="sc-detail-grid">
        <div className="sc-detail-col">
          {profile.length > 0 && (
            <>
              <span className="sc-kicker">PROFILE</span>
              <div className="sc-field-list">
                {profile.map((row) => (
                  <div className="sc-field-row" key={row.label}>
                    <span>{row.label}</span>
                    {row.link ? (
                      <a href={row.link} className="sc-field-link">{row.value}</a>
                    ) : (
                      <b>{row.value}</b>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {specs.length > 0 && (
            <>
              <span className="sc-kicker" style={{ marginTop: '28px' }}>SPECIFICATIONS</span>
              <div className="sc-field-list">
                {specs.map((row) => (
                  <div className="sc-field-row" key={row.label}><span>{row.label}</span><b>{row.value}</b></div>
                ))}
              </div>
            </>
          )}

          {hasLaunchVehicles && (
            <>
              <span className="sc-kicker" style={{ marginTop: '24px' }}>LAUNCH VEHICLES USED</span>
              <div className="sc-tag-list">
                {craft.launchVehicles.map((v) => (
                  <a key={v} href="/rocket-database" className="sc-tag sc-tag-link">{v}</a>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="sc-detail-col">
          {hasMissions ? (
            <>
              <span className="sc-kicker">MISSION HISTORY</span>
              <div className="sc-mission-list">
                {craft.missions.map((m) => (
                  <div className="sc-mission" key={m.name + m.date}>
                    <div className="sc-mission-head">
                      <h4>{m.name}</h4>
                      <span>{formatDate(m.date)}</span>
                    </div>
                    {m.launchVehicle && (
                      <div className="sc-mission-fields">
                        <div><span>LAUNCH VEHICLE</span><b>{m.launchVehicle}</b></div>
                      </div>
                    )}
                    {m.description && <p className="sc-mission-note">{m.description}</p>}
                  </div>
                ))}
              </div>
              <a href="/#launches" className="sc-related-link" style={{ marginTop: '20px', display: 'inline-block' }}>
                VIEW MISSION DATABASE →
              </a>
            </>
          ) : (
            <>
              <span className="sc-kicker">MISSION HISTORY</span>
              <div className="sc-empty-inline">NO LOGGED MISSIONS YET</div>
              <a href="/#launches" className="sc-related-link" style={{ marginTop: '20px', display: 'inline-block' }}>
                VIEW MISSION DATABASE →
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SpacecraftDatabase() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [query, setQuery] = useState('');
  const [activeAgency, setActiveAgency] = useState('ALL');
  const [activeType, setActiveType] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  // Deep link from Global Search: /spacecraft-database?id=<spacecraft-id>
  // opens straight to that spacecraft's profile instead of the full list.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelectedId(id);
  }, []);

  const stats = useMemo(() => computeStats(SPACECRAFT), []);
  const agencyOptions = useMemo(() => uniqueValues(SPACECRAFT, 'agency'), []);

  const results = useMemo(() => {
    const filtered = filterSpacecraft(SPACECRAFT, {
      agency: activeAgency,
      type: activeType,
      status: activeStatus,
    });
    const searched = searchSpacecraft(filtered, query);
    return sortSpacecraft(searched, sortBy);
  }, [query, activeAgency, activeType, activeStatus, sortBy]);

  const selectedCraft = useMemo(
    () => SPACECRAFT.find((s) => s.id === selectedId) || null,
    [selectedId]
  );

  return (
    <main className="sc-page">
      <CelestialBackground />

      <header className="sc-header">
        <div className="sc-brand-slot">
          <button
            type="button"
            className="sc-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="sc-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="sc-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <div className="sc-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          DATABASE ONLINE
        </div>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="sc-intro"
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
              layoutId="sc-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
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
              INDEXING SPACECRAFT RECORDS...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sc-content">
        {selectedCraft ? (
          <DetailView craft={selectedCraft} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="sc-hero">
              <span className="sc-kicker">SPACETEC DATABASE</span>
              <h1>SPACECRAFT DATABASE</h1>
              <p>SpaceTec&apos;s searchable index of crewed vehicles, cargo craft, space stations, robotic probes, landers and space telescopes from major agencies and programs, past and present.</p>

              <div className="sc-stats">
                <div className="sc-stat"><b>{stats.TOTAL}</b><span>TOTAL SPACECRAFT</span></div>
                <div className="sc-stat"><b>{stats.ACTIVE}</b><span>ACTIVE</span></div>
                <div className="sc-stat"><b>{stats.RETIRED}</b><span>RETIRED</span></div>
                <div className="sc-stat"><b>{stats.TYPES}</b><span>TYPES</span></div>
                <div className="sc-stat"><b>{stats.AGENCIES}</b><span>AGENCIES</span></div>
                <div className="sc-stat"><b>{stats.MISSIONS}</b><span>LOGGED MISSIONS</span></div>
              </div>
            </section>

            <section className="sc-controls">
              <input
                type="text"
                className="sc-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search spacecraft..."
              />

              <div className="sc-filter-row">
                <select value={activeAgency} onChange={(e) => setActiveAgency(e.target.value)}>
                  <option value="ALL">ALL AGENCIES</option>
                  {agencyOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
                  <option value="ALL">ALL TYPES</option>
                  {TYPE_VALUES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)}>
                  <option value="ALL">ALL STATUSES</option>
                  {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">SORT: NAME</option>
                  <option value="firstFlight">SORT: FIRST FLIGHT</option>
                  <option value="missions">SORT: MISSIONS</option>
                  <option value="agency">SORT: AGENCY</option>
                </select>
              </div>
            </section>

            <section className="sc-grid-section">
              {results.length === 0 ? (
                <div className="sc-empty">NO SPACECRAFT MATCH THIS QUERY</div>
              ) : (
                <div className="sc-grid">
                  {results.map((s) => (
                    <SpacecraftCard key={s.id} craft={s} onSelect={setSelectedId} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .sc-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .sc-header {
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

        .sc-brand-link { background: none; border: none; cursor: pointer; padding: 0; }
        .sc-brand-text { display: inline-block; color: #fff; font-weight: 800; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; }
        .sc-header-status { color: #64748b; font: 600 0.58rem/1 monospace; letter-spacing: 2px; }

        .sc-content { position: relative; z-index: 5; max-width: 1240px; margin: 0 auto; padding: 60px 30px 90px; }

        .sc-kicker { display: block; color: #64748b; font: 700 0.62rem/1.4 monospace; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 10px; }

        .sc-hero { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 32px; margin-bottom: 32px; }
        .sc-hero h1 { margin: 10px 0 18px; color: #f8fafc; font: 800 3.4rem/0.95 'Space Grotesk', sans-serif; letter-spacing: -2px; }
        .sc-hero p { max-width: 720px; color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; }

        .sc-stats { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 28px; }
        .sc-stat { display: flex; flex-direction: column; }
        .sc-stat b { color: #38bdf8; font: 800 1.6rem/1 'Space Grotesk', sans-serif; }
        .sc-stat span { color: #64748b; font: 700 0.58rem/1.6 monospace; letter-spacing: 1.5px; }

        .sc-controls { margin-bottom: 32px; }
        .sc-search {
          width: 100%; max-width: 480px; background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12); color: #fff; padding: 11px 14px;
          font: 500 0.85rem 'Space Grotesk', sans-serif; letter-spacing: 0.4px; margin-bottom: 16px; display: block;
        }
        .sc-search::placeholder { color: #52525b; }
        .sc-search:focus { outline: none; border-color: rgba(56, 189, 248, 0.5); }

        .sc-filter-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .sc-filter-row select {
          background: #000; border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8;
          padding: 8px 12px; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
        }

        .sc-grid-section { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; }

        .sc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); }

        .sc-card {
          background: #000; text-align: left; border: none; color: #fff; padding: 22px;
          display: flex; flex-direction: column; cursor: pointer; font-family: inherit;
        }
        .sc-card:hover { background: rgba(255, 255, 255, 0.03); }

        .sc-card-meta { display: flex; justify-content: space-between; align-items: center; font: 700 0.58rem/1 monospace; letter-spacing: 1.5px; margin-bottom: 10px; }
        .sc-status { color: #38bdf8; }
        .sc-status[data-status='RETIRED'] { color: #64748b; }
        .sc-status[data-status='IN DEVELOPMENT'] { color: #facc15; }
        .sc-type { color: #64748b; }

        .sc-card-name { margin: 0 0 6px; color: #f8fafc; font: 700 1.1rem/1.3 'Space Grotesk', sans-serif; }
        .sc-card-sub { display: flex; align-items: center; gap: 6px; color: #71717a; font: 700 0.6rem/1 monospace; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; min-height: 12px; }
        .sc-card-sub-dot { color: #3f3f46; }
        .sc-card-desc { color: #a1a1aa; font-size: 0.8rem; line-height: 1.55; margin: 0 0 16px; flex: 1; }

        .sc-card-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; color: #64748b; font: 700 0.58rem/1 monospace; letter-spacing: 1px; }
        .sc-card-arrow { color: #38bdf8; }

        .sc-empty { padding: 40px 0; color: #52525b; font: 700 0.75rem/1 monospace; letter-spacing: 1.5px; text-align: center; border: 1px dashed rgba(255, 255, 255, 0.08); }

        .sc-back { background: none; border: none; color: #64748b; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; cursor: pointer; padding: 0; margin-bottom: 28px; }
        .sc-back:hover { color: #fff; }

        .sc-detail-head { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 28px; margin-bottom: 32px; }
        .sc-detail-head h1 { margin: 10px 0 14px; color: #f8fafc; font: 800 2.6rem/1 'Space Grotesk', sans-serif; letter-spacing: -1px; }
        .sc-detail-head p { max-width: 720px; color: #a1a1aa; font-size: 0.9rem; line-height: 1.6; }

        .sc-detail-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 40px; }

        .sc-field-list { border-top: 1px solid rgba(255, 255, 255, 0.08); }
        .sc-field-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font: 600 0.65rem/1.3 monospace; letter-spacing: 1px; color: #64748b; }
        .sc-field-row b { color: #dbe4ef; font-size: 0.72rem; text-align: right; }
        .sc-field-link { color: #38bdf8; text-decoration: none; font-size: 0.72rem; font-weight: 700; }
        .sc-field-link:hover { text-decoration: underline; }

        .sc-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .sc-tag {
          display: inline-block; color: #d4d4d8; border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 6px 10px; font: 700 0.6rem/1 monospace; letter-spacing: 1px; text-decoration: none;
        }
        .sc-tag-link { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        .sc-tag-link:hover { border-color: rgba(56, 189, 248, 0.7); }
        .sc-empty-inline { display: block; color: #52525b; font: 700 0.62rem/1 monospace; letter-spacing: 1px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; }

        .sc-mission-list { display: flex; flex-direction: column; gap: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 4px; }
        .sc-mission { border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 16px; }
        .sc-mission-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-top: 14px; }
        .sc-mission-head h4 { margin: 0; color: #f8fafc; font: 700 0.95rem/1.3 'Space Grotesk', sans-serif; }
        .sc-mission-head span { color: #64748b; font: 700 0.6rem/1 monospace; letter-spacing: 1px; white-space: nowrap; }
        .sc-mission-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; margin-top: 8px; }
        .sc-mission-fields div { display: flex; justify-content: space-between; gap: 8px; font: 600 0.6rem/1.4 monospace; letter-spacing: 0.5px; color: #64748b; }
        .sc-mission-fields b { color: #dbe4ef; font-size: 0.65rem; text-align: right; }
        .sc-mission-note { color: #a1a1aa; font-size: 0.75rem; line-height: 1.5; margin: 10px 0 0; }

        .sc-related-link { color: #38bdf8; text-decoration: none; font: 700 0.65rem/1 monospace; letter-spacing: 1px; }
        .sc-related-link:hover { text-decoration: underline; }

        @media (max-width: 1024px) {
          .sc-grid { grid-template-columns: repeat(2, 1fr); }
          .sc-detail-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .sc-grid { grid-template-columns: 1fr; }
          .sc-hero h1 { font-size: 2.4rem; }
          .sc-brand-text { font-size: 0.85rem; letter-spacing: 4px; }
          .sc-mission-fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
