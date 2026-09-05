'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RequireAuth from '../components/RequireAuth';

const ENTER_DELAY_MS = 2000;
const PAGE_SIZE = 20;

// Same rotating space imagery + dark overlay treatment used on the SpaceTec homepage.
const SPACE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069',
];

function fmt(value, unit = '') {
  if (value == null || value === '') return null;
  return `${value}${unit}`;
}

function RocketDatabaseContent() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [rockets, setRockets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-total_launch_count');
  const [page, setPage] = useState(0);
  const [expandedRocket, setExpandedRocket] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [bgIndex, setBgIndex] = useState(0);
  const mounted = useRef(true);
  // Holds an id from a Global Search deep link until the matching rocket
  // has actually loaded, so it can be auto-expanded once it's available.
  const pendingRocketIdRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const id = params.get('id');
    if (q) setSearch(q);
    if (id) pendingRocketIdRef.current = id;
  }, []);

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SPACE_BACKGROUNDS.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, []);

  useEffect(() => {
    // Intro is visible from the very first paint (showIntro starts true) so
    // there's no flash of the docked page underneath before the big centered
    // SPACETEC transition plays. Data loading (see `load` below) kicks off
    // immediately in parallel, so it finishes during this hold instead of
    // popping in only after the transition ends.
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, ENTER_DELAY_MS);
    return () => clearTimeout(shrinkTimer);
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), ordering });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/rocket-database?${params.toString()}`, { cache: 'no-store' });
      const json = await res.json();
      if (!mounted.current) return;
      setRockets(json.results || []);
      setTotalCount(json.count || 0);
      setLoadError(json.error ? (json.upstreamStatus ? `Upstream error (HTTP ${json.upstreamStatus})` : 'Upstream error') : null);

      // If Global Search deep-linked a specific rocket, open it as soon as
      // it shows up in a loaded page of results.
      if (pendingRocketIdRef.current) {
        const match = (json.results || []).find(
          (r) => String(r.id) === String(pendingRocketIdRef.current)
        );
        if (match) {
          setExpandedRocket(match);
          pendingRocketIdRef.current = null;
        }
      }
    } catch (err) {
      console.error('Rocket database load failed:', err);
      if (!mounted.current) return;
      setRockets([]);
      setTotalCount(0);
      setLoadError('Network error');
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, [page, ordering, search]);

  useEffect(() => {
    const debounce = setTimeout(load, 300);
    return () => clearTimeout(debounce);
  }, [load]);

  const maxPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#000000',
        padding: '4rem 2rem',
        boxSizing: 'border-box',
        fontFamily: '"Space Grotesk", -apple-system, sans-serif',
      }}
    >
      {SPACE_BACKGROUNDS.map((bgUrl, idx) => (
        <div
          key={`rdb-bg-${idx}`}
          className="space-bg-layer"
          style={{ backgroundImage: `url('${bgUrl}')`, opacity: bgIndex === idx ? 1 : 0 }}
        />
      ))}
      <div className="dark-overlay" />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ minWidth: '180px' }}>
            <button
              className="brand-link"
              onClick={() => { if (entered) window.location.href = '/'; }}
              style={{ pointerEvents: entered ? 'auto' : 'none' }}
            >
              <motion.span
                layoutId="spacetec-brand"
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
              >
                SPACETEC
              </motion.span>
            </button>
          </div>
          <button
            onClick={() => { window.location.href = '/'; }}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase', opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease', pointerEvents: entered ? 'auto' : 'none' }}
          >
            [← BACK TO MAIN]
          </button>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
            // ROCKET DATABASE
          </span>
          <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>GLOBAL ROCKET DATABASE</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
            TOTAL MATCHES: {totalCount.toLocaleString()}
          </span>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by name, family, or manufacturer..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.3)', padding: '0.7rem 1rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', width: 'min(100%, 320px)', outline: 'none' }}
            />
            <select
              value={ordering}
              onChange={(event) => { setOrdering(event.target.value); setPage(0); }}
              style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              <option value="-total_launch_count">Most Launches</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        <div className="glass-card" style={{ overflowX: 'auto', marginBottom: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#94a3b8', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem' }}>Rocket</th>
                <th style={{ padding: '1rem' }}>Family</th>
                <th style={{ padding: '1rem' }}>Manufacturer</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Total Launches</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem 1rem', color: '#94a3b8', textAlign: 'center' }}>
                    QUERYING ROCKET DATABASE...
                  </td>
                </tr>
              ) : rockets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem 1rem', color: '#d4d4d8', textAlign: 'center' }}>
                    <div>NO ROCKETS FOUND</div>
                    {loadError && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.65rem', color: '#71717a', fontStyle: 'italic' }}>
                        {loadError} — try again shortly.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                rockets.map((rocket) => (
                  <tr
                    key={rocket.id}
                    onClick={() => setExpandedRocket(rocket)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '1.2rem 1rem', fontWeight: '700', color: '#fff' }}>{rocket.fullName}</td>
                    <td style={{ padding: '1.2rem 1rem' }}>{rocket.family || 'Unclassified'}</td>
                    <td style={{ padding: '1.2rem 1rem' }}>{rocket.manufacturer || 'Unknown'}</td>
                    <td style={{ padding: '1.2rem 1rem', color: rocket.active ? '#22c55e' : '#71717a', fontWeight: '700' }}>
                      {rocket.active == null ? 'UNKNOWN' : rocket.active ? 'ACTIVE' : 'RETIRED'}
                    </td>
                    <td style={{ padding: '1.2rem 1rem', color: '#e4e4e7', fontWeight: '700' }}>
                      {rocket.totalLaunchCount ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#d4d4d8', letterSpacing: '1px' }}>PAGE {page + 1} OF {maxPages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
              style={{ padding: '0.7rem 1rem', background: page === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: page === 0 ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              PREV PAGE
            </button>
            <button
              disabled={page + 1 >= maxPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              style={{ padding: '0.7rem 1rem', background: page + 1 >= maxPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: page + 1 >= maxPages ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page + 1 >= maxPages ? 'not-allowed' : 'pointer' }}
            >
              NEXT PAGE
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {expandedRocket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedRocket(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.86)' }}
          >
            <motion.article
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24 }}
              onClick={(event) => event.stopPropagation()}
              style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#050505', border: '1px solid rgba(255,255,255,0.25)', padding: '2rem', boxSizing: 'border-box' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '800' }}>
                    // {(expandedRocket.family || 'ROCKET').toUpperCase()}
                  </span>
                  <h2 style={{ margin: '0.5rem 0 0', color: '#fff', fontSize: '2rem', letterSpacing: '1px' }}>{expandedRocket.fullName}</h2>
                </div>
                <button onClick={() => setExpandedRocket(null)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 0.7rem', cursor: 'pointer' }}>
                  CLOSE
                </button>
              </div>

              <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
                <section>
                  <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>01 / OVERVIEW</p>
                  <p style={{ color: '#fff', margin: '0.4rem 0 0' }}>
                    {expandedRocket.manufacturer || 'Unknown manufacturer'}
                    {expandedRocket.manufacturerCountry ? ` // ${expandedRocket.manufacturerCountry}` : ''}
                  </p>
                  <p style={{ color: expandedRocket.active ? '#22c55e' : '#71717a', margin: '0.3rem 0 0', fontWeight: '700' }}>
                    {expandedRocket.active == null ? 'STATUS UNKNOWN' : expandedRocket.active ? 'ACTIVE' : 'RETIRED'}
                    {expandedRocket.reusable ? ' // REUSABLE' : ''}
                  </p>
                </section>

                <section>
                  <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>02 / SPECIFICATIONS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
                    {[
                      ['LENGTH', fmt(expandedRocket.length, ' M')],
                      ['DIAMETER', fmt(expandedRocket.diameter, ' M')],
                      ['LAUNCH MASS', fmt(expandedRocket.launchMass, ' KG')],
                      ['LEO CAPACITY', fmt(expandedRocket.leoCapacity, ' KG')],
                      ['GTO CAPACITY', fmt(expandedRocket.gtoCapacity, ' KG')],
                      ['MAIDEN FLIGHT', expandedRocket.maidenFlight],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>{label}</span>
                        <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{value ?? 'DATA UNAVAILABLE'}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>03 / LAUNCH RECORD</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
                    {[
                      ['TOTAL LAUNCHES', expandedRocket.totalLaunchCount],
                      ['SUCCESSFUL', expandedRocket.successfulLaunches],
                      ['FAILED', expandedRocket.failedLaunches],
                      ['CONSECUTIVE SUCCESS', expandedRocket.consecutiveSuccessfulLaunches],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>{label}</span>
                        <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{value ?? 'DATA UNAVAILABLE'}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>04 / DESCRIPTION</p>
                  <p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>
                    {expandedRocket.description || 'No description available.'}
                  </p>
                </section>

                {(expandedRocket.wikiUrl || expandedRocket.infoUrl) && (
                  <section>
                    <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>05 / REFERENCE</p>
                    <p style={{ margin: '0.4rem 0 0' }}>
                      <a
                        href={expandedRocket.wikiUrl || expandedRocket.infoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#94a3b8' }}
                      >
                        {expandedRocket.wikiUrl ? 'View on Wikipedia' : 'View source'}
                      </a>
                    </p>
                  </section>
                )}
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTRY TRANSITION: SPACETEC grows from the header corner to big & centered, holds, then shrinks back */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="rdb-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: '2rem' }}
          >
            <motion.div
              layoutId="spacetec-brand"
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
              CONNECTING TO ROCKET DATABASE...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .glass-card {
          background: rgba(15, 15, 15, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .brand-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
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
      `}</style>
    </main>
  );
}

export default function RocketDatabasePage() {
  return (
    <RequireAuth>
      <RocketDatabaseContent />
    </RequireAuth>
  );
}
