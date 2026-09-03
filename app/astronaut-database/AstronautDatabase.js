'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASTRONAUTS, STATUS_VALUES } from './astronautData';
import {
  computeStats,
  searchAstronauts,
  filterAstronauts,
  sortAstronauts,
  uniqueValues,
  uniqueSpacecraft,
  formatDate,
  display,
} from './astronautUtils';
import CelestialBackground from '../celestial-database/CelestialBackground';

const ENTER_DELAY_MS = 2000;

function AstronautCard({ astronaut, onSelect }) {
  return (
    <button type="button" className="crew-card" onClick={() => onSelect(astronaut.id)}>
      <div className="crew-card-meta">
        <span className="crew-status" data-status={astronaut.status}>{astronaut.status}</span>
        <span className="crew-agency">{astronaut.agency}</span>
      </div>
      <h3 className="crew-card-name">{astronaut.name}</h3>
      <p className="crew-card-desc">{astronaut.nationality}</p>
      <div className="crew-card-footer">
        <span>{astronaut.missions?.length || 0} SPACEFLIGHT{astronaut.missions?.length === 1 ? '' : 'S'}</span>
        <span className="crew-card-arrow">VIEW PROFILE →</span>
      </div>
    </button>
  );
}

function DetailView({ astronaut, onBack }) {
  const spacewalks = astronaut.spacewalks;
  const hasSpacewalks = spacewalks && spacewalks.count > 0;

  return (
    <section className="crew-detail">
      <button type="button" className="crew-back" onClick={onBack}>← BACK TO DATABASE</button>

      <div className="crew-detail-head">
        <span className="crew-kicker">{astronaut.status}</span>
        <h1>{astronaut.name}</h1>
        <p>{astronaut.nationality}</p>
      </div>

      <div className="crew-detail-grid">
        <div className="crew-detail-col">
          <span className="crew-kicker">PROFILE</span>
          <div className="crew-field-list">
            <div className="crew-field-row">
              <span>AGENCY</span>
              {astronaut.agencyLinkId ? (
                <a href={`/#agencies`} className="crew-field-link">{astronaut.agency}</a>
              ) : (
                <b>{astronaut.agency}</b>
              )}
            </div>
            <div className="crew-field-row"><span>NATIONALITY</span><b>{display(astronaut.nationality)}</b></div>
            <div className="crew-field-row"><span>STATUS</span><b>{display(astronaut.status)}</b></div>
            <div className="crew-field-row"><span>SELECTION YEAR</span><b>{display(astronaut.selectionYear)}</b></div>
            <div className="crew-field-row"><span>FIRST SPACEFLIGHT</span><b>{formatDate(astronaut.missions?.[0]?.launchDate)}</b></div>
            <div className="crew-field-row"><span>MOST RECENT SPACEFLIGHT</span><b>{formatDate(astronaut.missions?.[astronaut.missions.length - 1]?.launchDate)}</b></div>
            <div className="crew-field-row"><span>NUMBER OF SPACEFLIGHTS</span><b>{display(astronaut.missions?.length)}</b></div>
          </div>

          <span className="crew-kicker" style={{ marginTop: '28px' }}>SPACECRAFT FLOWN</span>
          <div className="crew-tag-list">
            {(astronaut.spacecraftFlown || []).length > 0
              ? astronaut.spacecraftFlown.map((s) => <span key={s} className="crew-tag">{s}</span>)
              : <span className="crew-empty-inline">DATA UNAVAILABLE</span>}
          </div>

          <span className="crew-kicker" style={{ marginTop: '24px' }}>LAUNCH VEHICLES FLOWN</span>
          <div className="crew-tag-list">
            {(astronaut.launchVehiclesFlown || []).length > 0 ? (
              astronaut.launchVehiclesFlown.map((v) => (
                <a key={v} href="/rocket-database" className="crew-tag crew-tag-link">{v}</a>
              ))
            ) : (
              <span className="crew-empty-inline">DATA UNAVAILABLE</span>
            )}
          </div>

          <span className="crew-kicker" style={{ marginTop: '24px' }}>LAUNCH SITES</span>
          <div className="crew-tag-list">
            {(astronaut.launchSites || []).length > 0
              ? astronaut.launchSites.map((s) => <span key={s} className="crew-tag">{s}</span>)
              : <span className="crew-empty-inline">DATA UNAVAILABLE</span>}
          </div>

          <span className="crew-kicker" style={{ marginTop: '24px' }}>SPACEWALK HISTORY</span>
          {hasSpacewalks ? (
            <div className="crew-field-list">
              <div className="crew-field-row"><span>NUMBER OF EVAS</span><b>{spacewalks.count}</b></div>
              <div className="crew-field-row"><span>TOTAL EVA TIME</span><b>{display(spacewalks.totalTime)}</b></div>
            </div>
          ) : (
            <div className="crew-empty-inline" style={{ marginTop: '8px' }}>NO RECORDED SPACEWALKS</div>
          )}
        </div>

        <div className="crew-detail-col">
          <span className="crew-kicker">MISSION HISTORY</span>
          <div className="crew-mission-list">
            {(astronaut.missions || []).map((m) => (
              <div className="crew-mission" key={m.name + m.launchDate}>
                <div className="crew-mission-head">
                  <h4>{m.name}</h4>
                  <span>{formatDate(m.launchDate)}</span>
                </div>
                <div className="crew-mission-fields">
                  <div><span>SPACECRAFT</span><b>{display(m.spacecraft)}</b></div>
                  <div><span>LAUNCH VEHICLE</span><b>{display(m.launchVehicle)}</b></div>
                  <div><span>LAUNCH SITE</span><b>{display(m.launchSite)}</b></div>
                  <div><span>ROLE</span><b>{display(m.role)}</b></div>
                  <div><span>DURATION</span><b>{display(m.duration)}</b></div>
                </div>
                {m.note && <p className="crew-mission-note">{m.note}</p>}
              </div>
            ))}
          </div>

          <a href="/#launches" className="crew-related-link" style={{ marginTop: '20px', display: 'inline-block' }}>
            VIEW MISSION DATABASE →
          </a>
        </div>
      </div>
    </section>
  );
}

export default function AstronautDatabase() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [query, setQuery] = useState('');
  const [activeAgency, setActiveAgency] = useState('ALL');
  const [activeNationality, setActiveNationality] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [activeSpacecraft, setActiveSpacecraft] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  // Deep link from Global Search: /astronaut-database?id=<astronaut-id>
  // opens straight to that astronaut's profile instead of the full list.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelectedId(id);
  }, []);

  const stats = useMemo(() => computeStats(ASTRONAUTS), []);
  const agencyOptions = useMemo(() => uniqueValues(ASTRONAUTS, 'agency'), []);
  const nationalityOptions = useMemo(() => uniqueValues(ASTRONAUTS, 'nationality'), []);
  const spacecraftOptions = useMemo(() => uniqueSpacecraft(ASTRONAUTS), []);

  const results = useMemo(() => {
    const filtered = filterAstronauts(ASTRONAUTS, {
      agency: activeAgency,
      nationality: activeNationality,
      status: activeStatus,
      spacecraft: activeSpacecraft,
    });
    const searched = searchAstronauts(filtered, query);
    return sortAstronauts(searched, sortBy);
  }, [query, activeAgency, activeNationality, activeStatus, activeSpacecraft, sortBy]);

  const selectedAstronaut = useMemo(
    () => ASTRONAUTS.find((a) => a.id === selectedId) || null,
    [selectedId]
  );

  return (
    <main className="crew-page">
      <CelestialBackground />

      <header className="crew-header">
        <div className="crew-brand-slot">
          <button
            type="button"
            className="crew-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="crew-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="crew-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <div className="crew-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          DATABASE ONLINE
        </div>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="crew-intro"
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
              layoutId="crew-brand"
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
              INDEXING FLIGHT CREW RECORDS...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="crew-content">
        {selectedAstronaut ? (
          <DetailView astronaut={selectedAstronaut} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="crew-hero">
              <span className="crew-kicker">SPACETEC DATABASE</span>
              <h1>ASTRONAUT DATABASE</h1>
              <p>SpaceTec&apos;s searchable index of astronauts and spaceflight crew from major space agencies and human-spaceflight programs, past and present.</p>

              <div className="crew-stats">
                <div className="crew-stat"><b>{stats.TOTAL}</b><span>TOTAL ASTRONAUTS</span></div>
                <div className="crew-stat"><b>{stats.ACTIVE}</b><span>ACTIVE</span></div>
                <div className="crew-stat"><b>{stats.RETIRED}</b><span>RETIRED</span></div>
                <div className="crew-stat"><b>{stats.AGENCIES}</b><span>AGENCIES</span></div>
                <div className="crew-stat"><b>{stats.COUNTRIES}</b><span>COUNTRIES</span></div>
                <div className="crew-stat"><b>{stats.SPACEFLIGHTS}</b><span>SPACEFLIGHTS</span></div>
              </div>
            </section>

            <section className="crew-controls">
              <input
                type="text"
                className="crew-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search astronauts..."
              />

              <div className="crew-filter-row">
                <select value={activeAgency} onChange={(e) => setActiveAgency(e.target.value)}>
                  <option value="ALL">ALL AGENCIES</option>
                  {agencyOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={activeNationality} onChange={(e) => setActiveNationality(e.target.value)}>
                  <option value="ALL">ALL COUNTRIES</option>
                  {nationalityOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)}>
                  <option value="ALL">ALL STATUSES</option>
                  {STATUS_VALUES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={activeSpacecraft} onChange={(e) => setActiveSpacecraft(e.target.value)}>
                  <option value="ALL">ALL SPACECRAFT</option>
                  {spacecraftOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">SORT: NAME</option>
                  <option value="firstFlight">SORT: FIRST FLIGHT</option>
                  <option value="missions">SORT: MISSIONS</option>
                  <option value="agency">SORT: AGENCY</option>
                </select>
              </div>
            </section>

            <section className="crew-grid-section">
              {results.length === 0 ? (
                <div className="crew-empty">NO ASTRONAUTS MATCH THIS QUERY</div>
              ) : (
                <div className="crew-grid">
                  {results.map((a) => (
                    <AstronautCard key={a.id} astronaut={a} onSelect={setSelectedId} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .crew-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .crew-header {
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

        .crew-brand-link { background: none; border: none; cursor: pointer; padding: 0; }
        .crew-brand-text { display: inline-block; color: #fff; font-weight: 800; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; }
        .crew-header-status { color: #64748b; font: 600 0.58rem/1 monospace; letter-spacing: 2px; }

        .crew-content { position: relative; z-index: 5; max-width: 1240px; margin: 0 auto; padding: 60px 30px 90px; }

        .crew-kicker { display: block; color: #64748b; font: 700 0.62rem/1.4 monospace; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 10px; }

        .crew-hero { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 32px; margin-bottom: 32px; }
        .crew-hero h1 { margin: 10px 0 18px; color: #f8fafc; font: 800 3.4rem/0.95 'Space Grotesk', sans-serif; letter-spacing: -2px; }
        .crew-hero p { max-width: 720px; color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; }

        .crew-stats { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 28px; }
        .crew-stat { display: flex; flex-direction: column; }
        .crew-stat b { color: #38bdf8; font: 800 1.6rem/1 'Space Grotesk', sans-serif; }
        .crew-stat span { color: #64748b; font: 700 0.58rem/1.6 monospace; letter-spacing: 1.5px; }

        .crew-controls { margin-bottom: 32px; }
        .crew-search {
          width: 100%; max-width: 480px; background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12); color: #fff; padding: 11px 14px;
          font: 500 0.85rem 'Space Grotesk', sans-serif; letter-spacing: 0.4px; margin-bottom: 16px; display: block;
        }
        .crew-search::placeholder { color: #52525b; }
        .crew-search:focus { outline: none; border-color: rgba(56, 189, 248, 0.5); }

        .crew-filter-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .crew-filter-row select {
          background: #000; border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8;
          padding: 8px 12px; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
        }

        .crew-grid-section { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; }

        .crew-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); }

        .crew-card {
          background: #000; text-align: left; border: none; color: #fff; padding: 22px;
          display: flex; flex-direction: column; cursor: pointer; font-family: inherit;
        }
        .crew-card:hover { background: rgba(255, 255, 255, 0.03); }

        .crew-card-meta { display: flex; justify-content: space-between; align-items: center; font: 700 0.58rem/1 monospace; letter-spacing: 1.5px; margin-bottom: 10px; }
        .crew-status { color: #38bdf8; }
        .crew-status[data-status='DECEASED'] { color: #64748b; }
        .crew-agency { color: #64748b; }

        .crew-card-name { margin: 0 0 8px; color: #f8fafc; font: 700 1.1rem/1.3 'Space Grotesk', sans-serif; }
        .crew-card-desc { color: #a1a1aa; font-size: 0.8rem; line-height: 1.55; margin: 0 0 16px; flex: 1; }

        .crew-card-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; color: #64748b; font: 700 0.58rem/1 monospace; letter-spacing: 1px; }
        .crew-card-arrow { color: #38bdf8; }

        .crew-empty { padding: 40px 0; color: #52525b; font: 700 0.75rem/1 monospace; letter-spacing: 1.5px; text-align: center; border: 1px dashed rgba(255, 255, 255, 0.08); }

        .crew-back { background: none; border: none; color: #64748b; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; cursor: pointer; padding: 0; margin-bottom: 28px; }
        .crew-back:hover { color: #fff; }

        .crew-detail-head { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 28px; margin-bottom: 32px; }
        .crew-detail-head h1 { margin: 10px 0 14px; color: #f8fafc; font: 800 2.6rem/1 'Space Grotesk', sans-serif; letter-spacing: -1px; }
        .crew-detail-head p { max-width: 720px; color: #a1a1aa; font-size: 0.9rem; line-height: 1.6; }

        .crew-detail-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 40px; }

        .crew-field-list { border-top: 1px solid rgba(255, 255, 255, 0.08); }
        .crew-field-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font: 600 0.65rem/1.3 monospace; letter-spacing: 1px; color: #64748b; }
        .crew-field-row b { color: #dbe4ef; font-size: 0.72rem; text-align: right; }
        .crew-field-link { color: #38bdf8; text-decoration: none; font-size: 0.72rem; font-weight: 700; }
        .crew-field-link:hover { text-decoration: underline; }

        .crew-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .crew-tag {
          display: inline-block; color: #d4d4d8; border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 6px 10px; font: 700 0.6rem/1 monospace; letter-spacing: 1px; text-decoration: none;
        }
        .crew-tag-link { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        .crew-tag-link:hover { border-color: rgba(56, 189, 248, 0.7); }
        .crew-empty-inline { color: #52525b; font: 700 0.62rem/1 monospace; letter-spacing: 1px; }

        .crew-mission-list { display: flex; flex-direction: column; gap: 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 4px; }
        .crew-mission { border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 16px; }
        .crew-mission-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-top: 14px; }
        .crew-mission-head h4 { margin: 0; color: #f8fafc; font: 700 0.95rem/1.3 'Space Grotesk', sans-serif; }
        .crew-mission-head span { color: #64748b; font: 700 0.6rem/1 monospace; letter-spacing: 1px; white-space: nowrap; }
        .crew-mission-fields { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; margin-top: 8px; }
        .crew-mission-fields div { display: flex; justify-content: space-between; gap: 8px; font: 600 0.6rem/1.4 monospace; letter-spacing: 0.5px; color: #64748b; }
        .crew-mission-fields b { color: #dbe4ef; font-size: 0.65rem; text-align: right; }
        .crew-mission-note { color: #a1a1aa; font-size: 0.75rem; line-height: 1.5; margin: 10px 0 0; }

        .crew-related-link { color: #38bdf8; text-decoration: none; font: 700 0.65rem/1 monospace; letter-spacing: 1px; }
        .crew-related-link:hover { text-decoration: underline; }

        @media (max-width: 1024px) {
          .crew-grid { grid-template-columns: repeat(2, 1fr); }
          .crew-detail-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .crew-grid { grid-template-columns: 1fr; }
          .crew-hero h1 { font-size: 2.4rem; }
          .crew-brand-text { font-size: 0.85rem; letter-spacing: 4px; }
          .crew-mission-fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
