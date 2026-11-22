'use client';
/**
 * OrbitalGlobeV2 - production wrapper that renders the Orbital Tracking SATELLITE view with the in-house
 * SpaceTecGlobeEngine and real Supabase data (useRealOrbitalTracking + OrbitalTrackingAdapter).
 *
 *  - Same props as OrbitalGlobe: { requestedView, launchpads }. app/OrbitalGlobe.js is untouched and stays the
 *    default and the fallback.
 *  - Implementation switch (see orbitalGlobeV2Logic.resolveGlobeImplementation):
 *      default                       -> the legacy OrbitalGlobe, exactly as before
 *      ?orbitGlobe=engine            -> new engine for satellites (URL wins)
 *      NEXT_PUBLIC_ORBITAL_GLOBE=engine (build setting) -> new engine for satellites
 *  - Launch pads always render on the legacy globe (which then hides its own mode buttons, because this wrapper
 *    owns them). Exactly ONE WebGL globe is mounted at any time: switching view unmounts one before mounting
 *    the other.
 *  - If the new engine cannot start (no WebGL, init error) or its UI throws, the wrapper falls back to the
 *    legacy globe in satellite view.
 */
import { Component, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import OrbitalGlobe from './OrbitalGlobe';
import SpaceTecGlobeEngine from './SpaceTecGlobeEngine';
import { useRealOrbitalTracking } from './globe/adapters/useRealOrbitalTracking';
import {
  SAT_FILTERS,
  DEFAULT_SAT_FILTER,
  DEFAULT_SAT_LIMIT,
  engineFilterFor,
  limitFor,
  resolveGlobeImplementation,
  buildPanelRows,
  buildHoverLines,
  placeTooltip,
} from './globe/orbitalGlobeV2Logic';

// Same UI styles as the production globe (copied, because OrbitalGlobe.js does not export them), plus the rule
// that hides the legacy globe's own LAUNCH PADS / ACTIVE SATELLITES buttons while it is embedded here.
const OG_CSS = `/* ===== Orbital Globe – all rules scoped to .og-* or the original component classes ===== */
.cosmos-viewport {
  background-color: #000000;
  background-image:
    radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 300px 80px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 600px 320px, rgba(255,255,255,0.35), transparent);
  background-size: 700px 400px;
}
.orbital-scroll::-webkit-scrollbar { width: 5px; }
.orbital-scroll::-webkit-scrollbar-track { background: #000000; }
.orbital-scroll::-webkit-scrollbar-thumb { background: #27272a; border-radius: 2px; }
.hud-btn { transition: background 0.12s, color 0.12s; }
.hud-btn:hover { background: #27272a !important; color: #ffffff !important; }
.vertical-slider {
  -webkit-appearance: none; appearance: none; width: 4px; height: 110px;
  background: #27272a; border-radius: 2px; outline: none;
  writing-mode: vertical-lr; direction: rtl; cursor: pointer;
}
.vertical-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 12px; height: 12px;
  background: #ffffff; border-radius: 1px; cursor: pointer;
}
.v-preset-btn {
  width: 100%; padding: 3px 0; font-size: 0.58rem; font-family: monospace;
  background: #09090b; border: 1px solid #27272a; color: #71717a; cursor: pointer;
  border-radius: 1px; transition: all 0.12s; text-align: center;
}
.v-preset-btn.active { background: #ffffff; border-color: #ffffff; color: #000000; font-weight: 700; }
.v-preset-btn:hover:not(.active) { border-color: #52525b; color: #d4d4d8; }

.og-root { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; max-width: min(1400px, 100%); margin: 0 auto; box-sizing: border-box; }
.og-toolbar { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.og-row { display: flex; gap: 0.3rem; flex-wrap: wrap; align-items: center; }
.og-body { display: block; min-width: 0; }
.og-stage { position: relative; width: 100%; height: 580px; border-radius: 1px; overflow: hidden; border: 1px solid #27272a; min-width: 0; }
.og-globe-layer { position: absolute; inset: 0; }
.og-globe-layer canvas { display: block; }
.og-globe-fallback { height: 100%; display: flex; gap: 0.8rem; flex-direction: column; align-items: center; justify-content: center; color: #71717a; font-family: monospace; font-size: 0.75rem; }
.og-chip { position: absolute; z-index: 10; background: rgba(0,0,0,0.82); border: 1px solid #27272a; padding: 0.4rem 0.65rem; font-family: monospace; color: #fff; pointer-events: none; }
.og-chip small { display: block; font-size: 0.52rem; color: #71717a; }
.og-chip b { font-size: 0.82rem; }
.og-loading { top: 0.75rem; right: 0.75rem; font-size: 0.58rem; max-width: 70%; }
.og-btn { background: #09090b; border: 1px solid #27272a; color: #d4d4d8; font-family: monospace; font-size: 0.62rem; letter-spacing: 0.5px; padding: 0.4rem 0.7rem; cursor: pointer; text-transform: uppercase; }
.og-btn:hover { background: #27272a; color: #fff; }
.og-btn.on { background: #ffffff; color: #000; border-color: #fff; }
.og-explore { position: absolute; z-index: 12; right: 0.75rem; top: 0.75rem; display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
.og-hint { font-family: monospace; font-size: 0.52rem; color: #71717a; background: rgba(0,0,0,0.7); padding: 2px 5px; }
.og-sheet {
  position: absolute; z-index: 14; left: 0.5rem; right: 0.5rem; bottom: 0.5rem;
  max-height: 46%; overflow: auto; box-sizing: border-box;
  padding: 0.7rem 0.8rem calc(0.7rem + env(safe-area-inset-bottom, 0px));
  background: rgba(0,0,0,0.92); border: 1px solid #3f3f46; -webkit-overflow-scrolling: touch;
}
.og-info-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.og-info-title { font-family: monospace; font-size: 0.62rem; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
.og-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.55rem 0.8rem; margin-top: 0.6rem; }
.og-info-grid > div { min-width: 0; }
.og-info-grid p { margin: 0; font-family: monospace; }
.og-k { font-size: 0.54rem; color: #71717a; letter-spacing: 0.4px; text-transform: uppercase; }
.og-v { font-size: 0.78rem; color: #fff; margin-top: 0.15rem !important; overflow-wrap: anywhere; }
.og-foot { margin-top: 0.7rem; padding-top: 0.5rem; border-top: 1px solid #18181b; font-family: monospace; font-size: 0.54rem; color: #71717a; }

/* ===== Desktop fullscreen orbital operations console ===== */
.og-root.og-fs {
  position: fixed; inset: 0; z-index: 1000000; max-width: none; margin: 0; gap: 0;
  background: #02050c; color: #dbe6f5; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.og-fs .og-topbar {
  flex: 0 0 auto; display: flex; align-items: center; gap: 1rem; padding: 0.55rem 1rem;
  background: linear-gradient(180deg, #06101f, #040a14); border-bottom: 1px solid rgba(56,189,248,0.18);
}
.og-fs .og-exit { border-color: rgba(56,189,248,0.5); color: #7dd3fc; background: rgba(56,189,248,0.08); font-weight: 700; }
.og-fs .og-exit:hover { background: rgba(56,189,248,0.2); color: #fff; }
.og-fs .og-title { font-size: 0.72rem; font-weight: 700; letter-spacing: 2px; color: #e6f1ff; }
.og-fs .og-title small { display: block; font-size: 0.52rem; font-weight: 400; letter-spacing: 1.5px; color: #5f7a99; margin-top: 2px; }
.og-fs .og-topstats { margin-left: auto; display: flex; gap: 1.4rem; font-size: 0.6rem; color: #8ba3c0; align-items: center; }
.og-fs .og-topstats b { color: #7dd3fc; font-weight: 600; }
.og-live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22d3ee; box-shadow: 0 0 6px #22d3ee; margin-right: 6px; }
.og-fs .og-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 264px minmax(0, 1fr) 304px; }
@media (min-width: 1280px) { .og-fs .og-body { grid-template-columns: 288px minmax(0, 1fr) 332px; } }
.og-fs .og-stage {
  height: auto; min-height: 0; border: 0; border-radius: 0;
  background:
    radial-gradient(ellipse at center, rgba(14,40,86,0.35) 0%, rgba(2,5,12,0) 62%),
    radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.4), transparent),
    radial-gradient(1px 1px at 300px 80px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1px 1px at 600px 320px, rgba(255,255,255,0.35), transparent),
    #02050c;
  background-size: auto, 700px 400px, 700px 400px, 700px 400px, auto;
}
.og-panel { min-height: 0; overflow-y: auto; background: #050b16; padding: 0.85rem; box-sizing: border-box; }
.og-panel-left { border-right: 1px solid rgba(56,189,248,0.14); }
.og-panel-right { border-left: 1px solid rgba(56,189,248,0.14); }
.og-panel::-webkit-scrollbar { width: 5px; }
.og-panel::-webkit-scrollbar-thumb { background: #16263d; border-radius: 2px; }
.og-sec { margin-bottom: 1rem; padding-bottom: 0.9rem; border-bottom: 1px solid rgba(56,189,248,0.1); }
.og-sec:last-child { border-bottom: 0; }
.og-sec-h { font-size: 0.56rem; letter-spacing: 1.6px; color: #5f7a99; margin-bottom: 0.55rem; display: flex; justify-content: space-between; align-items: baseline; }
.og-sec-h b { color: #7dd3fc; font-weight: 600; font-size: 0.7rem; letter-spacing: 0.5px; }
.og-fs .og-btn { background: #07101e; border-color: #15263d; color: #8ba3c0; }
.og-fs .og-btn:hover { background: #0d1d33; color: #fff; }
.og-fs .og-btn.on { background: rgba(56,189,248,0.16); border-color: rgba(56,189,248,0.6); color: #e6f6ff; }
.og-fs .og-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
.og-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem; }
.og-range { width: 100%; accent-color: #38bdf8; margin: 0.2rem 0 0.5rem; }
.og-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.3rem; }
.og-note { font-size: 0.54rem; line-height: 1.5; color: #5f7a99; margin-top: 0.45rem; }
.og-fs .og-info-grid { grid-template-columns: 1fr 1fr; }
.og-fs .og-info-grid .og-span { grid-column: 1 / -1; }
.og-fs .og-k { color: #5f7a99; }
.og-fs .og-v { color: #e6f1ff; font-size: 0.8rem; }
.og-fs .og-foot { border-top-color: rgba(56,189,248,0.12); color: #5f7a99; }
.og-placeholder { border: 1px dashed rgba(56,189,248,0.25); padding: 1.4rem 1rem; text-align: center; color: #7b92ae; font-size: 0.66rem; line-height: 1.6; }
.og-placeholder b { display: block; color: #bcd6f2; letter-spacing: 1.5px; margin-bottom: 0.5rem; font-size: 0.62rem; }
.og-fs .og-chip { background: rgba(2,8,18,0.8); border-color: rgba(56,189,248,0.2); }
.og-fs .og-loading { top: 0.75rem; left: 50%; right: auto; transform: translateX(-50%); }
.og-fs .og-explore { display: none; }
.og2-pads .og-toolbar > .og-row:first-child { display: none; }
.og2-pads .og-root { gap: 0.75rem; }
.og2-tip { position: absolute; z-index: 16; pointer-events: none; background: rgba(0,0,0,0.88); border: 1px solid #3f3f46; padding: 0.4rem 0.55rem; font-family: monospace; font-size: 0.6rem; line-height: 1.45; color: #e4e4e7; white-space: nowrap; }
.og2-tip b { color: #ffffff; font-size: 0.66rem; }
.og2-retry { pointer-events: auto; margin-left: 0.6rem; }
`;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, [query]);
  return matches;
}

function UtcClock() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{now ? now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC' : '--'}</span>;
}

function InfoRow({ label, value, span }) {
  return (
    <div className={span ? 'og-span' : undefined}>
      <p className="og-k">{label}</p>
      <p className="og-v">{value}</p>
    </div>
  );
}

function SatelliteInfo({ rows, onClose, footer, following, onToggleFollow }) {
  return (
    <>
      <div className="og-info-head">
        <span className="og-info-title">REAL-TIME ORBITAL TELEMETRY</span>
        <span style={{ display: 'flex', gap: '0.3rem' }}>
          <button className={`og-btn ${following ? 'on' : ''}`} aria-pressed={following} onClick={onToggleFollow}>
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="og-btn" onClick={onClose} aria-label="Close satellite information">
            Close ✕
          </button>
        </span>
      </div>
      <div className="og-info-grid">
        {rows.map(row => (
          <InfoRow key={row.label} label={row.label} value={row.value} span={row.span} />
        ))}
      </div>
      {footer && <div className="og-foot">{footer}</div>}
    </>
  );
}

// ---------------------------------------------------------------------------
// The satellite view on the in-house engine (plus the launch-pad hand-off to the legacy globe)
// ---------------------------------------------------------------------------
function EngineOrbitalGlobe({ requestedView, launchpads, onFallback }) {
  const stageRef = useRef(null);
  const exitButtonRef = useRef(null);
  const globeRef = useRef(null);
  const exploreRef = useRef(false);
  const showOrbitRef = useRef(true);

  // Start in the mode the hub already asked for, so a first "satellites" request never mounts the legacy globe
  // for a frame (a second WebGL context) before switching.
  const startSats = !!requestedView && requestedView.mode === 'satellites';
  const [viewMode, setViewMode] = useState(startSats ? 'satellites' : 'pads');
  const [consoleRequested, setConsoleRequested] = useState(startSats);
  const [satsRequested, setSatsRequested] = useState(startSats); // once true the catalogue stays loaded
  const [padsEntry, setPadsEntry] = useState(0);
  const [satFilter, setSatFilter] = useState(DEFAULT_SAT_FILTER);
  const [satLimit, setSatLimit] = useState(DEFAULT_SAT_LIMIT);
  const [explore, setExplore] = useState(false);
  const [showOrbit, setShowOrbit] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [hover, setHover] = useState(null);
  const [following, setFollowing] = useState(false);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [, setSecond] = useState(0);

  const canFullscreen = useMediaQuery('(min-width: 900px)');
  const fullscreen = viewMode === 'satellites' && consoleRequested && canFullscreen;

  const real = useRealOrbitalTracking({
    enabled: satsRequested,
    filter: engineFilterFor(satFilter),
    limit: limitFor(satFilter, satLimit),
  });
  const { subject: realSubject, status, message, count, reload } = real;

  // Request from the hub (telemetry menu, mobile nav, sidebar): same contract as OrbitalGlobe.
  useEffect(() => {
    if (!requestedView || !requestedView.mode) return;
    const mode = requestedView.mode === 'satellites' ? 'satellites' : 'pads';
    setViewMode(mode);
    setConsoleRequested(mode === 'satellites');
    if (mode === 'satellites') setSatsRequested(true);
    else setPadsEntry(n => n + 1);
    setSelectedId(null);
    setHover(null);
  }, [requestedView]);

  // The orbit path can be switched off without re-attaching the subject: the wrapper answers "no path".
  showOrbitRef.current = showOrbit;
  const subject = useMemo(() => {
    if (!realSubject) return null;
    return {
      ...realSubject,
      getPath: (id, nowMs) => (showOrbitRef.current ? realSubject.getPath(id, nowMs) : null),
    };
  }, [realSubject]);

  // Lock page scroll while the console is open; put the scroll position back on exit. Esc leaves.
  useEffect(() => {
    if (!fullscreen) return undefined;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (exitButtonRef.current) exitButtonRef.current.focus();
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    };
  }, [fullscreen]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (fullscreen) setConsoleRequested(false);
      else if (exploreRef.current) setExplore(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Explore: the console is interactive; the embedded globe is not, so the page scrolls over it.
  useEffect(() => {
    setExplore(fullscreen);
  }, [fullscreen]);
  exploreRef.current = explore;

  useEffect(() => {
    if (fullscreen || !explore || typeof IntersectionObserver === 'undefined' || !stageRef.current) return undefined;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0] && entries[0].intersectionRatio < 0.25) setExplore(false);
      },
      { threshold: [0, 0.25, 0.5] }
    );
    io.observe(stageRef.current);
    return () => io.disconnect();
  }, [explore, fullscreen]);

  // stage size for tooltip placement
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [viewMode, fullscreen]);

  // Live telemetry in the panel: entity objects are updated in place once per second by the subject.
  useEffect(() => {
    if (selectedId === null || selectedId === undefined) return undefined;
    const id = setInterval(() => setSecond(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [selectedId]);

  const selectedEntity = realSubject && selectedId != null ? realSubject.getEntity(selectedId) : null;
  // re-read on every render; the 1 Hz interval above re-renders while something is selected
  const panelRows = selectedEntity ? buildPanelRows(selectedEntity, realSubject.getTelemetry(selectedEntity.id)) : null;

  const onSelect = useCallback(entity => {
    setSelectedId(entity ? entity.id : null);
    setHover(null);
    if (!entity) setFollowing(false);
  }, []);
  const onHover = useCallback((entity, pos) => setHover(entity && pos ? { entity, pos } : null), []);
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setHover(null);
    setFollowing(false);
  }, []);
  const toggleFollow = useCallback(() => {
    if (globeRef.current) globeRef.current.setFollow(!following);
  }, [following]);

  const switchMode = key => {
    setViewMode(key);
    setConsoleRequested(key === 'satellites');
    if (key === 'satellites') setSatsRequested(true);
    else setPadsEntry(n => n + 1);
    clearSelection();
  };
  const pickFilter = key => {
    setSatFilter(key);
    clearSelection();
  };

  const onEngineStatus = useCallback(
    s => {
      if (s === 'unavailable' || s === 'error') onFallback('satellites');
    },
    [onFallback]
  );

  const padsView = useMemo(() => ({ mode: 'pads', requestId: padsEntry }), [padsEntry]);
  const trackedCount = count || 0;

  const modeButtons = (
    <div className="og-row" style={{ gap: '0.5rem' }}>
      {[
        { key: 'pads', label: 'LAUNCH PADS' },
        { key: 'satellites', label: `ACTIVE SATELLITES (${trackedCount})` },
      ].map(btn => (
        <button
          key={btn.key}
          className="hud-btn"
          onClick={() => switchMode(btn.key)}
          style={{
            padding: '0.45rem 0.9rem',
            background: viewMode === btn.key ? '#ffffff' : '#09090b',
            border: viewMode === btn.key ? '1px solid #ffffff' : '1px solid #27272a',
            color: viewMode === btn.key ? '#000000' : '#a1a1aa',
            fontSize: '0.68rem',
            fontFamily: 'monospace',
            fontWeight: '700',
            letterSpacing: '0.5px',
            cursor: 'pointer',
          }}
        >
          {btn.label}
        </button>
      ))}
      {viewMode === 'satellites' && canFullscreen && (
        <button className="og-btn" onClick={() => setConsoleRequested(true)}>⛶ Fullscreen</button>
      )}
    </div>
  );

  // ----- launch pads: legacy globe (the only WebGL globe mounted in this mode) -----
  if (viewMode === 'pads') {
    return (
      <div className="og-root">
        <style>{OG_CSS}</style>
        <div className="og-toolbar">{modeButtons}</div>
        <div className="og2-pads">
          <OrbitalGlobe requestedView={padsView} launchpads={launchpads} />
        </div>
      </div>
    );
  }

  // ----- satellites: in-house engine -----
  const loading = satsRequested && (status === 'idle' || status === 'loading');
  const interactive = fullscreen || explore ? true : 'pick'; // embedded: camera locked (page scrolls) but tap + hover still work

  const stage = (
    <div ref={stageRef} className="cosmos-viewport og-stage">
      <div className="og-globe-layer">
        <SpaceTecGlobeEngine
          ref={globeRef}
          subject={subject}
          selectedId={selectedId}
          onSelect={onSelect}
          onHover={onHover}
          onFollowChange={setFollowing}
          onStatusChange={onEngineStatus}
          interactive={interactive}
          isolateSelected
          showControls={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {!fullscreen && satFilter === 'active' && !selectedId && (
        <div
          style={{
            position: 'absolute', left: '1rem', top: '4.5rem', background: '#000000', border: '1px solid #27272a',
            padding: '0.75rem 0.55rem', zIndex: 15, fontFamily: 'monospace', width: '68px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
          }}
        >
          <div style={{ fontSize: '0.52rem', color: '#71717a', textAlign: 'center', letterSpacing: '0.5px' }}>LIMIT</div>
          <div style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 'bold' }}>
            {satLimit >= 16000 ? '16K' : satLimit >= 1000 ? `${satLimit / 1000}K` : satLimit}
          </div>
          <input
            type="range" min="500" max="16000" step="500" value={satLimit}
            onChange={e => setSatLimit(Number(e.target.value))} className="vertical-slider"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
            {[16000, 10000, 5000, 2500, 1000, 500].map(val => (
              <button key={val} onClick={() => setSatLimit(val)} className={`v-preset-btn ${satLimit === val ? 'active' : ''}`}>
                {val >= 1000 ? `${val / 1000}K` : val}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="og-chip" style={{ left: '0.75rem', bottom: '0.75rem', zIndex: 10 }}>
        <b style={{ fontSize: '0.58rem', letterSpacing: '0.5px' }}>● REAL-TIME SGP4 ORBITAL PHYSICS</b>
        <small>1000ms Live Clock • NORAD Coordinate Frame</small>
      </div>

      {loading && (
        <div className="og-chip og-loading">{message || 'INITIALIZING FEED...'}</div>
      )}
      {status === 'error' && (
        <div className="og-chip og-loading">
          {message || 'TELEMETRY FEED OFFLINE'}
          <button className="og-btn og2-retry" onClick={reload}>RETRY</button>
        </div>
      )}
      {status === 'ready' && trackedCount === 0 && (
        <div className="og-chip og-loading">NO OBJECTS MATCH THIS FILTER</div>
      )}

      <div className="og-chip" style={{ top: '0.75rem', left: '0.75rem' }}>
        <small>TRACKED OBJECTS</small>
        <b>{trackedCount.toLocaleString()}</b>
      </div>

      {hover && (
        <div className="og2-tip" style={placeTooltip(hover.pos, stageSize)}>
          {buildHoverLines(hover.entity).map((line, i) => (i === 0 ? <b key={i}>{line}</b> : <div key={i}>{line}</div>))}
        </div>
      )}

      {!fullscreen && (
        <div className="og-explore">
          <button className={`og-btn ${explore ? 'on' : ''}`} onClick={() => setExplore(v => !v)} aria-pressed={explore}>
            {explore ? 'Exit Explore ✕' : 'Explore globe'}
          </button>
          <span className="og-hint">
            {explore ? 'Drag to rotate • pinch / wheel to zoom' : 'Page scrolls normally • tap a marker to inspect'}
          </span>
        </div>
      )}

      {!fullscreen && panelRows && (
        <div className="og-sheet" role="region" aria-label="Selected satellite">
          <SatelliteInfo
            rows={panelRows}
            onClose={clearSelection}
            following={following}
            onToggleFollow={toggleFollow}
            footer="● PROPAGATING AT 1 SECOND INTERVALS • TAP THE GLOBE TO RESTORE CONSTELLATION"
          />
        </div>
      )}
    </div>
  );

  const leftPanel = (
    <aside className="og-panel og-panel-left" aria-label="Controls">
      <div className="og-sec">
        <div className="og-sec-h">
          <span>SATELLITE COUNT</span>
          <b>{satLimit.toLocaleString()}</b>
        </div>
        <input
          className="og-range" type="range" min="500" max="16000" step="500" value={satLimit}
          disabled={satFilter !== 'active'} onChange={e => setSatLimit(Number(e.target.value))} aria-label="Satellite count"
        />
        <div className="og-presets">
          {[500, 1000, 2500, 5000, 10000, 16000].map(val => (
            <button key={val} className={`og-btn ${satLimit === val ? 'on' : ''}`} disabled={satFilter !== 'active'} onClick={() => setSatLimit(val)}>
              {val >= 1000 ? `${val / 1000}K` : val}
            </button>
          ))}
        </div>
        <p className="og-note">
          {satFilter === 'active'
            ? 'Number of ALL ACTIVE objects drawn (default 1,000, up to 16,000).'
            : 'Count applies to the ALL ACTIVE filter. Other filters show every matching object.'}
        </p>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>FILTER</span></div>
        <div className="og-grid2">
          {SAT_FILTERS.map(f => (
            <button key={f.key} className={`og-btn ${satFilter === f.key ? 'on' : ''}`} onClick={() => pickFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>ORBIT VISUALISATION</span></div>
        <div className="og-grid2">
          <button className={`og-btn ${showOrbit ? 'on' : ''}`} aria-pressed={showOrbit} onClick={() => setShowOrbit(v => !v)}>
            Orbit path
          </button>
        </div>
        <p className="og-note">Orbit path is drawn for the selected satellite.</p>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>INTERACTION</span></div>
        <button className={`og-btn ${explore ? 'on' : ''}`} style={{ width: '100%' }} aria-pressed={explore} onClick={() => setExplore(v => !v)}>
          Explore mode: {explore ? 'ON' : 'OFF'}
        </button>
        <p className="og-note">Drag to rotate, wheel / pinch to zoom, click a marker to select. Esc exits the console.</p>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>SYSTEM</span></div>
        <p className="og-note" style={{ marginTop: 0 }}>
          PROPAGATOR: SGP4 (satellite.js)<br />
          UPDATE: 1 s live clock<br />
          SOURCE: NORAD orbital elements
        </p>
      </div>
    </aside>
  );

  const rightPanel = (
    <aside className="og-panel og-panel-right" aria-label="Satellite information">
      {panelRows ? (
        <SatelliteInfo
          rows={panelRows}
          onClose={clearSelection}
          following={following}
          onToggleFollow={toggleFollow}
          footer="● PROPAGATING AT 1 SECOND INTERVALS"
        />
      ) : (
        <>
          <div className="og-info-head"><span className="og-info-title">OBJECT TELEMETRY</span></div>
          <div className="og-placeholder" style={{ marginTop: '0.8rem' }}>
            <b>NO OBJECT SELECTED</b>
            Select a satellite marker on the globe to view its live telemetry here.
          </div>
        </>
      )}
    </aside>
  );

  return (
    <div
      className={`og-root ${fullscreen ? 'og-fs' : ''}`}
      {...(fullscreen ? { role: 'dialog', 'aria-label': 'Orbital operations console' } : {})}
    >
      <style>{OG_CSS}</style>

      {fullscreen ? (
        <div className="og-topbar">
          <button ref={exitButtonRef} className="og-btn og-exit" onClick={() => setConsoleRequested(false)}>
            ← Exit fullscreen
          </button>
          <div className="og-title">
            ORBITAL OPERATIONS CONSOLE
            <small>LIVE SATELLITE TRACKING • SGP4</small>
          </div>
          <div className="og-topstats">
            <span><span className="og-live-dot" />LIVE</span>
            <span>OBJECTS <b>{trackedCount.toLocaleString()}</b></span>
            <UtcClock />
          </div>
        </div>
      ) : (
        <div className="og-toolbar">
          {modeButtons}
          <div className="og-row">
            {SAT_FILTERS.map(filter => (
              <button
                key={filter.key}
                className="hud-btn"
                onClick={() => pickFilter(filter.key)}
                style={{
                  padding: '0.35rem 0.7rem',
                  background: satFilter === filter.key ? '#27272a' : '#09090b',
                  border: '1px solid #27272a',
                  color: satFilter === filter.key ? '#ffffff' : '#71717a',
                  fontSize: '0.62rem', fontFamily: 'monospace', textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="og-body">
        {fullscreen ? leftPanel : null}
        {stage}
        {fullscreen ? rightPanel : null}
      </div>
    </div>
  );
}

class EngineBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error('[OrbitalGlobeV2] new globe crashed, falling back to the legacy globe', error);
    if (this.props.onError) this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function OrbitalGlobeV2({ requestedView, launchpads }) {
  const [impl, setImpl] = useState(() => resolveGlobeImplementation('', process.env.NEXT_PUBLIC_ORBITAL_GLOBE));
  const [fallback, setFallback] = useState(null); // { view, from }

  useEffect(() => {
    setImpl(resolveGlobeImplementation(window.location.search, process.env.NEXT_PUBLIC_ORBITAL_GLOBE));
  }, []);

  const handleFallback = useCallback(
    mode => {
      setFallback(prev => prev || { view: { mode: mode || 'satellites', requestId: 'v2-fallback' }, from: requestedView });
    },
    [requestedView]
  );

  if (impl !== 'engine' || fallback) {
    // a newer hub request always wins over the remembered fallback view
    const view = fallback && fallback.from === requestedView ? fallback.view : requestedView;
    return <OrbitalGlobe requestedView={view} launchpads={launchpads} />;
  }
  return (
    <EngineBoundary onError={() => handleFallback('satellites')}>
      <EngineOrbitalGlobe requestedView={requestedView} launchpads={launchpads} onFallback={handleFallback} />
    </EngineBoundary>
  );
            }
