'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const POLL_INTERVAL_MS = 60 * 1000;
const ENTER_DELAY_MS = 2000;

// --- formatting helpers -----------------------------------------------

function parseNoaaTime(raw) {
  if (!raw) return null;
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = iso.endsWith('Z') ? iso : `${iso}Z`;
  const date = new Date(withZone);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatClockUTC(date) {
  if (!date) return '--:--:--';
  return date.toISOString().substring(11, 19);
}

function fmtNum(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value).toFixed(digits);
}

function toneForStatus(status) {
  if (!status) return '#64748b';
  const s = status.toUpperCase();
  if (s === 'QUIET') return '#22c55e';
  if (s.includes('UNSETTLED') || s.includes('MINOR')) return '#eab308';
  if (s.includes('MODERATE') || s.includes('ACTIVE')) return '#f97316';
  if (s.includes('STRONG') || s.includes('SEVERE') || s.includes('EXTREME')) return '#ef4444';
  return '#64748b';
}

// --- small presentational pieces ---------------------------------------

function Unavailable() {
  return <span className="sw-unavailable">DATA UNAVAILABLE</span>;
}

function DataRow({ label, value, tone }) {
  return (
    <div className="sw-row">
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
    <div className="sw-panel">
      <div className="sw-panel-head">
        <span className="sw-kicker">{kicker}</span>
        <h3>{title}</h3>
      </div>
      <div className="sw-panel-body">{children}</div>
    </div>
  );
}

function Sparkline({ data, color = '#38bdf8', useLog = false }) {
  if (!Array.isArray(data) || data.length < 2) {
    return (
      <div className="sw-chart-empty">
        <Unavailable />
      </div>
    );
  }

  const width = 600;
  const height = 140;
  const padX = 6;
  const padY = 10;

  const values = data.map((d) => (useLog ? Math.log10(Math.max(d.value, 1e-9)) : d.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (width - padX * 2);
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return [x, y];
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${height - padY} L${points[0][0].toFixed(1)},${height - padY} Z`;

  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div className="sw-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={padX} y1={height / 2} x2={width - padX} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <path d={areaPath} fill={color} opacity="0.08" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
      <div className="sw-chart-range">
        <span>{parseNoaaTime(first.time) ? formatClockUTC(parseNoaaTime(first.time)) : ''}</span>
        <span>{parseNoaaTime(last.time) ? formatClockUTC(parseNoaaTime(last.time)) : ''}</span>
      </div>
    </div>
  );
}

// --- page -----------------------------------------------------------------

export default function SpaceWeatherPage() {
  const [entered, setEntered] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('ACQUIRING'); // ACQUIRING | LIVE | DELAYED
  const [lastUpdate, setLastUpdate] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    // Let the docked header brand paint first so framer-motion has a known
    // "small, top-left" layout to grow from, then swap to the big centered
    // version, hold, then swap back — a genuine grow-from-corner / shrink-
    // back-to-corner cycle using the shared layoutId.
    const growTimer = setTimeout(() => setShowIntro(true), 120);
    const shrinkTimer = setTimeout(() => {
      setShowIntro(false);
      setEntered(true);
    }, 120 + ENTER_DELAY_MS);
    return () => {
      clearTimeout(growTimer);
      clearTimeout(shrinkTimer);
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/space-weather', { cache: 'no-store' });
      if (!res.ok) throw new Error('feed unavailable');
      const json = await res.json();
      if (!mounted.current) return;
      setData(json);
      setLastUpdate(new Date());
      setStatus('LIVE');
    } catch (err) {
      console.error('Space weather fetch failed:', err);
      if (!mounted.current) return;
      setStatus((prev) => (prev === 'ACQUIRING' ? 'DELAYED' : 'DELAYED'));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const overallStatus = data?.overallStatus ?? null;
  const geo = data?.geomagnetic ?? {};
  const wind = data?.solarWind ?? {};
  const xray = data?.xray ?? {};
  const solar = data?.solarActivity ?? {};
  const aurora = data?.aurora ?? null;
  const env = data?.environment ?? {};
  const sources = data?.sources ?? [];

  const xrayTrend = (() => {
    const hist = xray.history;
    if (!Array.isArray(hist) || hist.length < 2) return null;
    const delta = hist[hist.length - 1].value - hist[hist.length - 2].value;
    if (Math.abs(delta) < hist[hist.length - 1].value * 0.02) return 'STABLE';
    return delta > 0 ? 'RISING' : 'DECLINING';
  })();

  return (
    <main className="sw-page">
      <div className="sw-stars" />

      <header className="sw-header">
        <div className="sw-brand-slot">
          <button
            type="button"
            className="sw-brand-link"
            onClick={() => { if (entered) window.location.href = '/'; }}
            style={{ pointerEvents: entered ? 'auto' : 'none' }}
          >
            <motion.span
              layoutId="sw-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              className="sw-brand-text"
            >
              SPACETEC
            </motion.span>
          </button>
        </div>

        <div className="sw-header-status" style={{ opacity: entered ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <span className={`sw-dot ${status.toLowerCase()}`} />
          {status === 'LIVE' ? 'LIVE FEED' : status === 'ACQUIRING' ? 'ACQUIRING' : 'DATA DELAYED'}
        </div>
      </header>

      {/* ENTRY TRANSITION: SPACETEC grows from the header corner to big & centered, holds, then shrinks back */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="sw-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem',
            }}
          >
            <motion.div
              layoutId="sw-brand"
              transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
              initial={{ scale: 0.9, letterSpacing: '0.12em' }}
              animate={{ scale: 1, letterSpacing: '0.22em' }}
            >
              <h1
                style={{
                  fontSize: 'calc(3.5rem + 4vw)',
                  fontWeight: '900',
                  margin: 0,
                  textTransform: 'uppercase',
                  color: '#ffffff',
                }}
              >
                SPACETEC
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                fontSize: 'calc(0.7rem + 0.3vw)',
                letterSpacing: '12px',
                color: '#ffffff',
                textTransform: 'uppercase',
                marginTop: '1.5rem',
                fontWeight: '500',
              }}
            >
              CONNECTING TO SPACE WEATHER NETWORK...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sw-content">
        <section className="sw-hero">
          <span className="sw-kicker">SPACE WEATHER CENTER</span>
          <h1>SPACE WEATHER</h1>
          <p>
            SpaceTec continuously monitors solar activity, the interplanetary magnetic field, and geomagnetic
            conditions affecting Earth and near-Earth space, using public real-time feeds from NOAA&apos;s
            Space Weather Prediction Center.
          </p>

          <div className="sw-status-line">
            <span>CURRENT CONDITIONS:</span>
            {overallStatus ? (
              <b style={{ color: toneForStatus(overallStatus) }}>{overallStatus}</b>
            ) : (
              <Unavailable />
            )}
          </div>
        </section>

        <section className="sw-grid">
          <Panel kicker="01" title="SOLAR ACTIVITY">
            <DataRow
              label="ACTIVITY LEVEL"
              value={xray.class ? (xray.class[0] >= 'M' ? 'ACTIVE' : xray.class[0] === 'C' ? 'MODERATE' : 'QUIET') : null}
              tone={xray.class ? toneForStatus(xray.class[0] >= 'M' ? 'MODERATE' : 'QUIET') : null}
            />
            <DataRow label="FLARE CLASSIFICATION" value={xray.class} />
            <DataRow
              label="RECENT FLARES (7D)"
              value={Array.isArray(solar.recentFlares) ? `${solar.recentFlares.length} DETECTED` : null}
            />
            <DataRow
              label="LATEST FLARE"
              value={solar.recentFlares?.[0]?.maxClass ?? null}
            />
            <DataRow
              label="SOLAR RADIO FLUX (F10.7)"
              value={solar.solarFluxIndex != null ? `${fmtNum(solar.solarFluxIndex, 0)} SFU` : null}
            />
          </Panel>

          <Panel kicker="02" title="SOLAR WIND">
            <DataRow label="SPEED" value={wind.speed != null ? `${fmtNum(wind.speed, 0)} KM/S` : null} />
            <DataRow label="DENSITY" value={wind.density != null ? `${fmtNum(wind.density, 1)} P/CM³` : null} />
            <DataRow label="TEMPERATURE" value={wind.temperature != null ? `${fmtNum(wind.temperature, 0)} K` : null} />
            <DataRow label="MAGNETIC FIELD (BT)" value={wind.bt != null ? `${fmtNum(wind.bt, 1)} nT` : null} />
            <DataRow label="MAGNETIC FIELD (BZ)" value={wind.bz != null ? `${fmtNum(wind.bz, 1)} nT` : null} />
          </Panel>

          <Panel kicker="03" title="GEOMAGNETIC ACTIVITY">
            <DataRow
              label="KP INDEX"
              value={geo.currentKp != null ? fmtNum(geo.currentKp, 0) : null}
              tone={geo.stormLevel ? toneForStatus(geo.stormLevel) : null}
            />
            <DataRow
              label="STORM LEVEL"
              value={geo.stormLevel}
              tone={geo.stormLevel ? toneForStatus(geo.stormLevel) : null}
            />
            <DataRow label="NOAA G-SCALE" value={geo.scale?.text ?? null} />
            <DataRow
              label="RECENT TREND"
              value={
                Array.isArray(geo.history) && geo.history.length >= 2
                  ? geo.history[geo.history.length - 1].value >= geo.history[geo.history.length - 2].value
                    ? 'RISING'
                    : 'FALLING'
                  : null
              }
            />
          </Panel>
        </section>

        <section className="sw-grid">
          <Panel kicker="04" title="SOLAR X-RAY">
            <DataRow label="CURRENT FLUX" value={xray.flux != null ? `${xray.flux.toExponential(2)} W/M²` : null} />
            <DataRow label="CLASSIFICATION" value={xray.class} />
            <DataRow label="RECENT CHANGE" value={xrayTrend} />
            <DataRow label="RADIO BLACKOUT (R-SCALE)" value={xray.radioBlackoutScale?.text ?? null} />
          </Panel>

          <Panel kicker="05" title="AURORA CONDITIONS">
            <DataRow label="BASIS" value={aurora ? `KP ${aurora.kp}` : null} />
            <DataRow
              label="VISIBILITY BOUNDARY"
              value={aurora ? `~${fmtNum(aurora.latitude, 1)}° GEOMAGNETIC LAT.` : null}
            />
            <DataRow label="INDICATIVE REGIONS" value={aurora ? aurora.regions.toUpperCase() : null} />
            <p className="sw-note">Estimate derived from the current Kp index, not a direct imaging feed.</p>
          </Panel>

          <Panel kicker="06" title="SPACE ENVIRONMENT">
            <DataRow
              label="PROTON FLUX (≥10 MEV)"
              value={env.protonFlux != null ? `${env.protonFlux.toExponential(2)} PFU` : null}
            />
            <DataRow label="RADIATION STORM (S-SCALE)" value={env.radiationStormScale?.text ?? null} />
          </Panel>
        </section>

        <section className="sw-charts">
          <div className="sw-chart-block">
            <span className="sw-kicker">KP INDEX — RECENT HISTORY</span>
            <Sparkline data={geo.history} color="#a78bfa" />
          </div>
          <div className="sw-chart-block">
            <span className="sw-kicker">SOLAR WIND SPEED — LAST 2 HOURS</span>
            <Sparkline data={wind.speedHistory} color="#38bdf8" />
          </div>
          <div className="sw-chart-block">
            <span className="sw-kicker">X-RAY FLUX — LAST 6 HOURS</span>
            <Sparkline data={xray.history} color="#f97316" useLog />
          </div>
        </section>

        <section className="sw-events">
          <span className="sw-kicker">RECENT SOLAR EVENTS</span>
          {Array.isArray(solar.recentFlares) && solar.recentFlares.length ? (
            <div className="sw-events-list">
              {solar.recentFlares.map((flare, idx) => (
                <div className="sw-event-row" key={`${flare.beginTime}-${idx}`}>
                  <b style={{ color: toneForStatus(flare.maxClass?.[0] >= 'M' ? 'MODERATE' : 'QUIET') }}>
                    {flare.maxClass ?? '--'}
                  </b>
                  <span>BEGIN {flare.beginTime ?? '--'}</span>
                  <span>MAX {flare.maxTime ?? '--'}</span>
                  <span>END {flare.endTime ?? '--'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="sw-events-empty">
              <Unavailable />
            </div>
          )}
        </section>

        <section className="sw-footer">
          <div>
            <span className="sw-kicker">LAST UPDATED</span>
            <p>{lastUpdate ? `${formatClockUTC(lastUpdate)} UTC` : '--:--:-- UTC'}</p>
          </div>
          <div>
            <span className="sw-kicker">DATA SOURCES</span>
            <ul>
              {sources.length ? (
                sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  </li>
                ))
              ) : (
                <li>NOAA Space Weather Prediction Center</li>
              )}
            </ul>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .sw-page {
          min-height: 100vh;
          width: 100%;
          background: #000000;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
        }

        .sw-stars {
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

        .sw-header {
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

        .sw-brand-slot {
          display: flex;
          align-items: center;
          min-width: 180px;
        }

        .sw-brand-link {
          border: 0;
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        .sw-brand-text {
          display: inline-block;
          color: #ffffff;
          font-weight: 900;
          font-size: 1.25rem;
          letter-spacing: 8px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .sw-header-status {
          min-width: 110px;
          text-align: right;
          color: #64748b;
          font: 600 0.58rem/1 monospace;
          letter-spacing: 2px;
        }

        .sw-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          margin-right: 7px;
          background: #64748b;
        }

        .sw-dot.live {
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
        }

        .sw-dot.delayed {
          background: #eab308;
          box-shadow: 0 0 8px rgba(234, 179, 8, 0.6);
        }

        .sw-content {
          position: relative;
          z-index: 5;
          max-width: 1240px;
          margin: 0 auto;
          padding: 60px 30px 90px;
        }

        .sw-kicker {
          display: block;
          color: #64748b;
          font: 700 0.62rem/1.4 monospace;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }

        .sw-hero {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 36px;
          margin-bottom: 40px;
        }

        .sw-hero h1 {
          margin: 10px 0 18px;
          color: #f8fafc;
          font: 800 3.4rem/0.95 'Space Grotesk', sans-serif;
          letter-spacing: -2px;
        }

        .sw-hero p {
          max-width: 720px;
          color: #a1a1aa;
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .sw-status-line {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font: 700 0.72rem/1 monospace;
          letter-spacing: 1.5px;
        }

        .sw-status-line span {
          color: #64748b;
        }

        .sw-status-line b {
          font-size: 0.85rem;
        }

        .sw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 40px;
        }

        .sw-panel {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 22px;
        }

        .sw-panel-head h3 {
          margin: 6px 0 16px;
          color: #f1f5f9;
          font: 700 1rem/1.2 'Space Grotesk', sans-serif;
          letter-spacing: 0.5px;
        }

        .sw-row {
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

        .sw-row:first-child {
          border-top: none;
        }

        .sw-row b {
          color: #dbe4ef;
          font-size: 0.72rem;
          text-align: right;
        }

        .sw-unavailable {
          color: #3f3f46;
          font-style: italic;
          font-size: 0.62rem;
          letter-spacing: 1px;
        }

        .sw-note {
          margin: 14px 0 0;
          color: #52525b;
          font-size: 0.65rem;
          line-height: 1.5;
          font-style: italic;
        }

        .sw-charts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 40px;
        }

        .sw-chart-block {
          background: #000000;
          padding: 20px;
        }

        .sw-chart {
          margin-top: 14px;
        }

        .sw-chart svg {
          width: 100%;
          height: 100px;
          display: block;
        }

        .sw-chart-empty {
          margin-top: 14px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255, 255, 255, 0.08);
        }

        .sw-chart-range {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          color: #3f3f46;
          font: 600 0.55rem/1 monospace;
          letter-spacing: 1px;
        }

        .sw-events {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
          margin-bottom: 40px;
        }

        .sw-events-list {
          margin-top: 16px;
        }

        .sw-event-row {
          display: grid;
          grid-template-columns: 60px 1fr 1fr 1fr;
          gap: 16px;
          align-items: center;
          padding: 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font: 600 0.62rem/1.3 monospace;
          letter-spacing: 1px;
          color: #64748b;
        }

        .sw-events-empty {
          margin-top: 16px;
        }

        .sw-footer {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 24px;
        }

        .sw-footer p {
          margin: 8px 0 0;
          color: #dbe4ef;
          font: 700 0.8rem/1.3 monospace;
        }

        .sw-footer ul {
          list-style: none;
          margin: 8px 0 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 10px 20px;
        }

        .sw-footer li {
          font: 600 0.6rem/1.3 monospace;
          letter-spacing: 0.5px;
        }

        .sw-footer a {
          color: #64748b;
          text-decoration: none;
        }

        .sw-footer a:hover {
          color: #fff;
        }

        @media (max-width: 1024px) {
          .sw-grid,
          .sw-charts {
            grid-template-columns: 1fr;
          }

          .sw-footer {
            grid-template-columns: 1fr;
          }

          .sw-hero h1 {
            font-size: 2.6rem;
          }

          .sw-event-row {
            grid-template-columns: 50px 1fr;
            grid-template-rows: auto auto auto;
          }
        }

        @media (max-width: 640px) {
          .sw-brand-slot,
          .sw-header-status {
            min-width: 0;
            font-size: 0.5rem;
          }

          .sw-brand-text {
            font-size: 0.85rem;
            letter-spacing: 4px;
          }
        }
      `}</style>
    </main>
  );
}
