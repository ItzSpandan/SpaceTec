'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ENTER_DELAY_MS = 2000;
const GEO_TIMEOUT_MS = 6000;

// Same rotating space imagery + dark overlay treatment used on the SpaceTec
// homepage and other SpaceTec sub-pages — this page intentionally reuses it
// rather than introducing a new background.
const SPACE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
  'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069',
];

// --- formatting helpers -----------------------------------------------

function formatClock(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  if (seconds == null) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}H ${m}M`;
}

function formatDateShort(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- small presentational pieces ---------------------------------------

function Unavailable() {
  return <span className="at-unavailable">DATA UNAVAILABLE</span>;
}

function DataRow({ label, value, tone }) {
  return (
    <div className="at-row">
      <span>{label}</span>
      {value == null || value === '' ? (
        <Unavailable />
      ) : (
        <b style={tone ? { color: tone } : undefined}>{value}</b>
      )}
    </div>
  );
}

function Panel({ kicker, title, children }) {
  return (
    <div className="at-panel">
      <div className="at-panel-head">
        <span className="at-kicker">{kicker}</span>
        <h3>{title}</h3>
      </div>
      <div className="at-panel-body">{children}</div>
    </div>
  );
}

// --- page -----------------------------------------------------------------

export default function AstronomyTonightPage() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('ACQUIRING'); // ACQUIRING | LIVE | DELAYED
  const [lastUpdate, setLastUpdate] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
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
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SPACE_BACKGROUNDS.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, []);

  const load = useCallback(async (lat, lng) => {
    try {
      const params = new URLSearchParams();
      if (lat != null && lng != null) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      const res = await fetch(`/api/astronomy-tonight?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('feed unavailable');
      const json = await res.json();
      if (!mounted.current) return;
      setData(json);
      setLastUpdate(new Date());
      setStatus(json.error ? 'DELAYED' : 'LIVE');
    } catch (err) {
      console.error('Astronomy tonight fetch failed:', err);
      if (!mounted.current) return;
      setStatus('DELAYED');
    }
  }, []);

  useEffect(() => {
    // Ask for location so times/moon data reflect the visitor's sky; fall
    // back to the API's default location if permission is denied, the
    // browser doesn't support it, or it simply takes too long to resolve.
    let settled = false;
    const finish = (lat, lng) => {
      if (settled) return;
      settled = true;
      load(lat, lng);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const timeout = setTimeout(() => finish(null, null), GEO_TIMEOUT_MS);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeout);
          finish(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          clearTimeout(timeout);
          finish(null, null);
        },
        { timeout: GEO_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 }
      );
    } else {
      finish(null, null);
    }
  }, [load]);

  const sun = data?.sun ?? null;
  const moon = data?.moon ?? null;
  const darkSkyWindow = data?.darkSkyWindow ?? null;
  const isDefaultLocation = data?.location?.isDefaultLocation ?? true;
  const sources = data?.sources ?? [];

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
          key={`at-bg-${idx}`}
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
            // ASTRONOMY TONIGHT
          </span>
          <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>TONIGHT&apos;S SKY</h2>
          <p style={{ maxWidth: '720px', color: '#a1a1aa', fontSize: '0.9rem', lineHeight: 1.6, margin: '1rem 0 0' }}>
            Solar and lunar conditions for observing tonight, computed from your location and public astronomical
            data. {isDefaultLocation
              ? 'Showing a default reference location — allow location access for conditions specific to you.'
              : 'Showing conditions for your current location.'}
          </p>
          <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.7rem', letterSpacing: '1.5px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span style={{ color: '#64748b' }}>STATUS:</span>
            <span className={`at-dot ${status.toLowerCase()}`} />
            <span style={{ color: '#d4d4d8' }}>
              {status === 'LIVE' ? 'LIVE FEED' : status === 'ACQUIRING' ? 'ACQUIRING' : 'DATA DELAYED'}
            </span>
          </div>
        </div>

        <div className="at-grid" style={{ marginBottom: '2rem' }}>
          <Panel kicker="01" title="SOLAR TIMES">
            <DataRow label="SUNRISE" value={formatClock(sun?.sunrise)} />
            <DataRow label="SUNSET" value={formatClock(sun?.sunset)} />
            <DataRow label="SOLAR NOON" value={formatClock(sun?.solarNoon)} />
            <DataRow label="DAY LENGTH" value={formatDuration(sun?.dayLengthSeconds)} />
          </Panel>

          <Panel kicker="02" title="TWILIGHT">
            <DataRow label="CIVIL DUSK" value={formatClock(sun?.civilTwilightEnd)} />
            <DataRow label="NAUTICAL DUSK" value={formatClock(sun?.nauticalTwilightEnd)} />
            <DataRow label="ASTRONOMICAL DUSK" value={formatClock(sun?.astronomicalTwilightEnd)} />
            <p className="at-note">Astronomical dusk marks true dark sky — the best window for faint-object viewing.</p>
          </Panel>

          <Panel kicker="03" title="DARK SKY WINDOW">
            {darkSkyWindow ? (
              <>
                <DataRow
                  label="STATUS"
                  value={darkSkyWindow.inProgress ? 'IN PROGRESS' : 'STARTS TONIGHT'}
                  tone={darkSkyWindow.inProgress ? '#22c55e' : '#38bdf8'}
                />
                <DataRow label="BEGINS" value={darkSkyWindow.start ? formatClock(darkSkyWindow.start) : 'IN PROGRESS'} />
                <DataRow label="ENDS" value={formatClock(darkSkyWindow.end)} />
              </>
            ) : (
              <DataRow label="STATUS" value={null} />
            )}
            <p className="at-note">Window between astronomical dusk and the following dawn, when the sky is darkest.</p>
          </Panel>
        </div>

        <div className="at-grid" style={{ marginBottom: '2rem' }}>
          <Panel kicker="04" title="LUNAR CONDITIONS">
            <DataRow label="PHASE" value={moon?.phaseName ?? null} />
            <DataRow label="ILLUMINATION" value={moon?.illuminationPct != null ? `${moon.illuminationPct}%` : null} />
            <DataRow label="MOON AGE" value={moon?.ageDays != null ? `${moon.ageDays} DAYS` : null} />
          </Panel>

          <Panel kicker="05" title="UPCOMING PHASES">
            <DataRow label="NEXT FULL MOON" value={formatDateShort(moon?.nextFullMoon)} />
            <DataRow label="NEXT NEW MOON" value={formatDateShort(moon?.nextNewMoon)} />
            <p className="at-note">
              {moon?.illuminationPct != null && moon.illuminationPct < 50
                ? 'Lower moonlight tonight favors deep-sky viewing.'
                : 'Brighter moonlight tonight will wash out fainter objects.'}
            </p>
          </Panel>

          <Panel kicker="06" title="OBSERVING NOTES">
            <p className="at-note" style={{ marginTop: 0 }}>
              For the clearest views, let your eyes adapt to darkness for 20–30 minutes and avoid white light —
              use a red flashlight if you need one.
            </p>
            <p className="at-note">
              Light pollution, humidity, and cloud cover all affect visibility beyond what times alone can show.
            </p>
          </Panel>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4rem', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '1px' }}>
            LAST UPDATED: {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#64748b', letterSpacing: '1px' }}>
            SOURCES:{' '}
            {sources.length ? (
              sources.map((s, idx) => (
                <span key={s.url}>
                  {idx > 0 ? ', ' : ''}
                  <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#94a3b8' }}>
                    {s.name}
                  </a>
                </span>
              ))
            ) : (
              'sunrise-sunset.org, local lunar calculation'
            )}
          </span>
        </div>
      </div>

      {/* ENTRY TRANSITION: SPACETEC grows from the header corner to big & centered, holds, then shrinks back */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="at-intro"
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
              CONNECTING TO OBSERVATORY NETWORK...
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

        .at-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
        }

        .at-panel {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 22px;
          background: rgba(0, 0, 0, 0.4);
        }

        .at-kicker {
          display: block;
          color: #64748b;
          font: 700 0.62rem/1.4 monospace;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }

        .at-panel-head h3 {
          margin: 6px 0 16px;
          color: #f1f5f9;
          font: 700 1rem/1.2 'Space Grotesk', sans-serif;
          letter-spacing: 0.5px;
        }

        .at-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 9px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font: 600 0.62rem/1.3 monospace;
          letter-spacing: 1px;
          color: #64748b;
        }

        .at-row:first-child {
          border-top: none;
        }

        .at-row b {
          color: #dbe4ef;
          font-size: 0.72rem;
          text-align: right;
        }

        .at-unavailable {
          color: #3f3f46;
          font-style: italic;
          font-size: 0.62rem;
          letter-spacing: 1px;
        }

        .at-note {
          margin: 14px 0 0;
          color: #52525b;
          font-size: 0.65rem;
          line-height: 1.5;
          font-style: italic;
        }

        .at-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #64748b;
        }

        .at-dot.live {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
        }

        .at-dot.delayed {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.6);
        }

        @media (max-width: 1024px) {
          .at-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
