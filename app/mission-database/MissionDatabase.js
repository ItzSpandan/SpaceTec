'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MISSIONS, MISSION_TYPES, MISSION_STATUSES } from './missionData';
import {
  computeStats,
  searchMissions,
  filterMissions,
  sortMissions,
  uniqueValues,
  uniqueYears,
  formatDate,
  display,
} from './missionUtils';
import { ASTRONAUTS } from '../astronaut-database/astronautData';
import CelestialBackground from '../celestial-database/CelestialBackground';

const ENTER_DELAY_MS = 2000;

function crewMembers(mission) {
  return (mission.crewIds || [])
    .map((id) => ASTRONAUTS.find((a) => a.id === id))
    .filter(Boolean);
}

function MissionCard({ mission, onSelect }) {
  return (
    <button type="button" className="msn-card" onClick={() => onSelect(mission.id)}>
      <div className="msn-card-meta">
        <span className="msn-status" data-status={mission.status}>{mission.status}</span>
        <span className="msn-agency">{mission.agency}</span>
      </div>
      <h3 className="msn-card-name">{mission.name}</h3>
      <p className="msn-card-desc">
        {mission.type} &middot; {display(mission.destination)}
      </p>
      <div className="msn-card-footer">
        <span>{mission.launchDate ? formatDate(mission.launchDate) : 'LAUNCH TBD'}</span>
        <span className="msn-card-arrow">VIEW MISSION →</span>
      </div>
    </button>
  );
}

function TimelineView({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return <div className="msn-empty-inline">DATA UNAVAILABLE</div>;
  }
  return (
    <div className="msn-timeline">
      {timeline.map((event, index) => (
        <div className="msn-timeline-item" key={event.label + index}>
          <div className="msn-timeline-marker">
            <span className="msn-timeline-dot" />
            {index < timeline.length - 1 && <span className="msn-timeline-line" />}
          </div>
          <div className="msn-timeline-body">
            <div className="msn-timeline-head">
              <h4>{event.label}</h4>
              <span>{formatDate(event.date)}</span>
            </div>
            {event.note && <p className="msn-timeline-note">{event.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailView({ mission, onBack, onSelectMission }) {
  const crew = crewMembers(mission);

  return (
    <section className="msn-detail">
      <button type="button" className="msn-back" onClick={onBack}>← BACK TO DATABASE</button>

      <div className="msn-detail-head">
        <span className="msn-kicker">{mission.type} &middot; {mission.status}</span>
        <h1>{mission.name}</h1>
        <p>{mission.description}</p>
      </div>

      <div className="msn-detail-grid">
        <div className="msn-detail-col">
          <span className="msn-kicker">MISSION PROFILE</span>
          <div className="msn-field-list">
            <div className="msn-field-row">
              <span>AGENCY / OPERATOR</span>
              {mission.agencyLinkId ? (
                <a href="/#agencies" className="msn-field-link">{mission.agency}</a>
              ) : (
                <b>{display(mission.agency)}</b>
              )}
            </div>
            <div className="msn-field-row"><span>COUNTRY</span><b>{display(mission.country)}</b></div>
            <div className="msn-field-row"><span>MISSION TYPE</span><b>{display(mission.type)}</b></div>
            <div className="msn-field-row"><span>STATUS</span><b>{display(mission.status)}</b></div>
            <div className="msn-field-row"><span>CREWED / UNCREWED</span><b>{mission.crewed ? 'CREWED' : 'UNCREWED'}</b></div>
            <div className="msn-field-row"><span>LAUNCH DATE</span><b>{formatDate(mission.launchDate)}</b></div>
            <div className="msn-field-row"><span>LAUNCH SITE</span>
              {mission.launchSite ? (
                <a href="/#launchpads" className="msn-field-link">{mission.launchSite}</a>
              ) : (
                <b>DATA UNAVAILABLE</b>
              )}
            </div>
            <div className="msn-field-row"><span>DESTINATION</span><b>{display(mission.destination)}</b></div>
            <div className="msn-field-row"><span>MISSION DURATION</span><b>{display(mission.duration)}</b></div>
          </div>

          <span className="msn-kicker" style={{ marginTop: '28px' }}>LAUNCH VEHICLE</span>
          <div className="msn-tag-list">
            {mission.launchVehicle ? (
              <a href="/rocket-database" className="msn-tag msn-tag-link">{mission.launchVehicle}</a>
            ) : (
              <span className="msn-empty-inline">DATA UNAVAILABLE</span>
            )}
          </div>

          <span className="msn-kicker" style={{ marginTop: '24px' }}>SPACECRAFT</span>
          <div className="msn-tag-list">
            {mission.spacecraft ? (
              <span className="msn-tag">{mission.spacecraft}</span>
            ) : (
              <span className="msn-empty-inline">DATA UNAVAILABLE</span>
            )}
          </div>

          <span className="msn-kicker" style={{ marginTop: '24px' }}>CELESTIAL DESTINATION</span>
          <div className="msn-tag-list">
            {mission.destination ? (
              <a href="/celestial-database" className="msn-tag msn-tag-link">{mission.destination}</a>
            ) : (
              <span className="msn-empty-inline">DATA UNAVAILABLE</span>
            )}
          </div>

          {mission.crewed && (
            <>
              <span className="msn-kicker" style={{ marginTop: '24px' }}>CREW</span>
              <div className="msn-tag-list">
                {crew.length > 0 ? (
                  crew.map((a) => (
                    <a key={a.id} href="/astronaut-database" className="msn-tag msn-tag-link">{a.name}</a>
                  ))
                ) : (
                  <span className="msn-empty-inline">DATA UNAVAILABLE</span>
                )}
              </div>
            </>
          )}

          <span className="msn-kicker" style={{ marginTop: '28px' }}>MISSION OBJECTIVE</span>
          <p className="msn-objective">{display(mission.objective)}</p>
        </div>

        <div className="msn-detail-col">
          <span className="msn-kicker">MISSION TIMELINE</span>
          <TimelineView timeline={mission.timeline} />
        </div>
      </div>
    </section>
  );
}

export default function MissionDatabase() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [query, setQuery] = useState('');
  const [activeAgency, setActiveAgency] = useState('ALL');
  const [activeCountry, setActiveCountry] = useState('ALL');
  const [activeType, setActiveType] = useState('ALL');
  const [activeDestination, setActiveDestination] = useState('ALL');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [activeYear, setActiveYear] = useState('ALL');
  const [activeCrewed, setActiveCrewed] = useState('ALL');
  const [sortBy, setSortBy] = useState('launchDateDesc');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  // Deep link from Global Search: /mission-database?id=<mission-id>
  // opens straight to that mission's profile instead of the full list.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelectedId(id);
  }, []);

  const stats = useMemo(() => computeStats(MISSIONS), []);
  const agencyOptions = useMemo(() => uniqueValues(MISSIONS, 'agency'), []);
  const countryOptions = useMemo(() => uniqueValues(MISSIONS, 'country'), []);
  const destinationOptions = useMemo(() => uniqueValues(MISSIONS, 'destination'), []);
  const yearOptions = useMemo(() => uniqueYears(MISSIONS), []);

  const results = useMemo(() => {
    const filtered = filterMissions(MISSIONS, {
      agency: activeAgency,
      country: activeCountry,
      type: activeType,
      destination: activeDestination,
      status: activeStatus,
      year: activeYear,
      crewed: activeCrewed,
    });
    const searched = searchMissions(filtered, query);
    return sortMissions(searched, sortBy);
  }, [query, activeAgency, activeCountry, activeType, activeDestination, activeStatus, activeYear, activeCrewed, sortBy]);

  const selectedMission = useMemo(
    () => MISSIONS.find((m) => m.id === selectedId) || null,
    [selectedId]
  );

  return (
    <main className="msn-page">
      <CelestialBackground />

      <header className="msn-header">
        <div className="msn-brand-slot">
          <button
            type="button"
            className="msn-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="msn-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="msn-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>
        <div className="msn-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          DATABASE ONLINE
        </div>
      </header>

      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="msn-intro"
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
              layoutId="msn-brand"
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
              CONNECTING TO MISSION DATABASE...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="msn-content">
        {selectedMission ? (
          <DetailView mission={selectedMission} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <section className="msn-hero">
              <span className="msn-kicker">SPACETEC DATABASE</span>
              <h1>MISSION DATABASE</h1>
              <p>SpaceTec&apos;s comprehensive index of space missions from major agencies and commercial operators worldwide, spanning human spaceflight, lunar and planetary exploration, deep space, and Earth science.</p>

              <div className="msn-stats">
                <div className="msn-stat"><b>{stats.TOTAL}</b><span>TOTAL MISSIONS</span></div>
                <div className="msn-stat"><b>{stats.ACTIVE}</b><span>ACTIVE</span></div>
                <div className="msn-stat"><b>{stats.COMPLETED}</b><span>COMPLETED</span></div>
                <div className="msn-stat"><b>{stats.UPCOMING}</b><span>UPCOMING</span></div>
                <div className="msn-stat"><b>{stats.CREWED}</b><span>CREWED</span></div>
                <div className="msn-stat"><b>{stats.UNCREWED}</b><span>UNCREWED</span></div>
                <div className="msn-stat"><b>{stats.AGENCIES}</b><span>AGENCIES</span></div>
                <div className="msn-stat"><b>{stats.DESTINATIONS}</b><span>DESTINATIONS</span></div>
              </div>
            </section>

            <section className="msn-controls">
              <input
                type="text"
                className="msn-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search missions..."
              />

              <div className="msn-filter-row">
                <select value={activeAgency} onChange={(e) => setActiveAgency(e.target.value)}>
                  <option value="ALL">ALL AGENCIES</option>
                  {agencyOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={activeCountry} onChange={(e) => setActiveCountry(e.target.value)}>
                  <option value="ALL">ALL COUNTRIES</option>
                  {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
                  <option value="ALL">ALL TYPES</option>
                  {MISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={activeDestination} onChange={(e) => setActiveDestination(e.target.value)}>
                  <option value="ALL">ALL DESTINATIONS</option>
                  {destinationOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={activeStatus} onChange={(e) => setActiveStatus(e.target.value)}>
                  <option value="ALL">ALL STATUSES</option>
                  {MISSION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={activeYear} onChange={(e) => setActiveYear(e.target.value)}>
                  <option value="ALL">ALL YEARS</option>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={activeCrewed} onChange={(e) => setActiveCrewed(e.target.value)}>
                  <option value="ALL">CREWED / UNCREWED</option>
                  <option value="CREWED">CREWED</option>
                  <option value="UNCREWED">UNCREWED</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="launchDateDesc">SORT: NEWEST FIRST</option>
                  <option value="launchDate">SORT: OLDEST FIRST</option>
                  <option value="name">SORT: NAME</option>
                  <option value="agency">SORT: AGENCY</option>
                  <option value="status">SORT: STATUS</option>
                  <option value="destination">SORT: DESTINATION</option>
                </select>
              </div>
            </section>

            <section className="msn-grid-section">
              {results.length === 0 ? (
                <div className="msn-empty">NO MISSIONS MATCH THIS QUERY</div>
              ) : (
                <div className="msn-grid">
                  {results.map((m) => (
                    <MissionCard key={m.id} mission={m} onSelect={setSelectedId} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <style jsx global>{`
        .msn-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .msn-header {
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

        .msn-brand-link { background: none; border: none; cursor: pointer; padding: 0; }
        .msn-brand-text { display: inline-block; color: #fff; font-weight: 800; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; }
        .msn-header-status { color: #64748b; font: 600 0.58rem/1 monospace; letter-spacing: 2px; }

        .msn-content { position: relative; z-index: 5; max-width: 1240px; margin: 0 auto; padding: 60px 30px 90px; }

        .msn-kicker { display: block; color: #64748b; font: 700 0.62rem/1.4 monospace; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 10px; }

        .msn-hero { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 32px; margin-bottom: 32px; }
        .msn-hero h1 { margin: 10px 0 18px; color: #f8fafc; font: 800 3.4rem/0.95 'Space Grotesk', sans-serif; letter-spacing: -2px; }
        .msn-hero p { max-width: 760px; color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; }

        .msn-stats { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 28px; }
        .msn-stat { display: flex; flex-direction: column; }
        .msn-stat b { color: #38bdf8; font: 800 1.6rem/1 'Space Grotesk', sans-serif; }
        .msn-stat span { color: #64748b; font: 700 0.58rem/1.6 monospace; letter-spacing: 1.5px; }

        .msn-controls { margin-bottom: 32px; }
        .msn-search {
          width: 100%; max-width: 480px; background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12); color: #fff; padding: 11px 14px;
          font: 500 0.85rem 'Space Grotesk', sans-serif; letter-spacing: 0.4px; margin-bottom: 16px; display: block;
        }
        .msn-search::placeholder { color: #52525b; }
        .msn-search:focus { outline: none; border-color: rgba(56, 189, 248, 0.5); }

        .msn-filter-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .msn-filter-row select {
          background: #000; border: 1px solid rgba(255, 255, 255, 0.12); color: #d4d4d8;
          padding: 8px 12px; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;
          max-width: 220px;
        }

        .msn-grid-section { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 24px; }

        .msn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.08); }

        .msn-card {
          background: #000; text-align: left; border: none; color: #fff; padding: 22px;
          display: flex; flex-direction: column; cursor: pointer; font-family: inherit;
        }
        .msn-card:hover { background: rgba(255, 255, 255, 0.03); }

        .msn-card-meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; font: 700 0.58rem/1 monospace; letter-spacing: 1.5px; margin-bottom: 10px; }
        .msn-status { color: #38bdf8; white-space: nowrap; }
        .msn-status[data-status='COMPLETED'] { color: #22c55e; }
        .msn-status[data-status='FAILED'] { color: #ef4444; }
        .msn-status[data-status='CANCELLED'] { color: #71717a; }
        .msn-status[data-status='PARTIALLY SUCCESSFUL'] { color: #f59e0b; }
        .msn-status[data-status='UPCOMING'],
        .msn-status[data-status='PLANNED'] { color: #a78bfa; }
        .msn-status[data-status='EXTENDED'] { color: #2dd4bf; }
        .msn-agency { color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .msn-card-name { margin: 0 0 8px; color: #f8fafc; font: 700 1.1rem/1.3 'Space Grotesk', sans-serif; }
        .msn-card-desc { color: #a1a1aa; font-size: 0.8rem; line-height: 1.55; margin: 0 0 16px; flex: 1; }

        .msn-card-footer { display: flex; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.06); padding-top: 12px; color: #64748b; font: 700 0.58rem/1 monospace; letter-spacing: 1px; }
        .msn-card-arrow { color: #38bdf8; }

        .msn-empty { padding: 40px 0; color: #52525b; font: 700 0.75rem/1 monospace; letter-spacing: 1.5px; text-align: center; border: 1px dashed rgba(255, 255, 255, 0.08); }

        .msn-back { background: none; border: none; color: #64748b; font: 700 0.62rem/1 monospace; letter-spacing: 1.5px; cursor: pointer; padding: 0; margin-bottom: 28px; }
        .msn-back:hover { color: #fff; }

        .msn-detail-head { border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 28px; margin-bottom: 32px; }
        .msn-detail-head h1 { margin: 10px 0 14px; color: #f8fafc; font: 800 2.6rem/1 'Space Grotesk', sans-serif; letter-spacing: -1px; }
        .msn-detail-head p { max-width: 760px; color: #a1a1aa; font-size: 0.9rem; line-height: 1.6; }

        .msn-detail-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 40px; }

        .msn-field-list { border-top: 1px solid rgba(255, 255, 255, 0.08); }
        .msn-field-row { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); font: 600 0.65rem/1.3 monospace; letter-spacing: 1px; color: #64748b; }
        .msn-field-row b { color: #dbe4ef; font-size: 0.72rem; text-align: right; }
        .msn-field-link { color: #38bdf8; text-decoration: none; font-size: 0.72rem; font-weight: 700; text-align: right; }
        .msn-field-link:hover { text-decoration: underline; }

        .msn-tag-list { display: flex; flex-wrap: wrap; gap: 8px; }
        .msn-tag {
          display: inline-block; color: #d4d4d8; border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 6px 10px; font: 700 0.6rem/1 monospace; letter-spacing: 1px; text-decoration: none;
        }
        .msn-tag-link { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
        .msn-tag-link:hover { border-color: rgba(56, 189, 248, 0.7); }
        .msn-empty-inline { color: #52525b; font: 700 0.62rem/1 monospace; letter-spacing: 1px; }

        .msn-objective { color: #d4d4d8; line-height: 1.7; margin: 8px 0 0; font-size: 0.85rem; }

        .msn-timeline { border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 6px; }
        .msn-timeline-item { display: flex; gap: 16px; }
        .msn-timeline-marker { display: flex; flex-direction: column; align-items: center; width: 10px; }
        .msn-timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; flex-shrink: 0; margin-top: 6px; }
        .msn-timeline-line { width: 1px; flex: 1; background: rgba(255, 255, 255, 0.12); margin: 4px 0; }
        .msn-timeline-body { flex: 1; padding-bottom: 22px; }
        .msn-timeline-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
        .msn-timeline-head h4 { margin: 0; color: #f8fafc; font: 700 0.82rem/1.3 'Space Grotesk', sans-serif; letter-spacing: 0.5px; }
        .msn-timeline-head span { color: #64748b; font: 700 0.6rem/1 monospace; letter-spacing: 1px; white-space: nowrap; }
        .msn-timeline-note { color: #a1a1aa; font-size: 0.75rem; line-height: 1.5; margin: 6px 0 0; }

        @media (max-width: 1024px) {
          .msn-grid { grid-template-columns: repeat(2, 1fr); }
          .msn-detail-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .msn-grid { grid-template-columns: 1fr; }
          .msn-hero h1 { font-size: 2.4rem; }
          .msn-brand-text { font-size: 0.85rem; letter-spacing: 4px; }
          .msn-filter-row select { max-width: 100%; }
        }
      `}</style>
    </main>
  );
}
