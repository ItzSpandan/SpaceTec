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
 *  - Launch pads: with the engine enabled (and a launchpads dataset) they render on the same in-house engine through
 *    LaunchpadLocatorAdapter (LaunchpadGlobeView). Without the flag, without a dataset, or if that engine cannot
 *    start, they render on the legacy globe (which then hides its own mode buttons, because this wrapper owns
 *    them). Exactly ONE WebGL globe is mounted at any time: switching view unmounts one before mounting the other.
 *  - If the new engine cannot start (no WebGL, init error) or its UI throws, the wrapper falls back to the
 *    legacy globe in satellite view.
 */
import { Component, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';

// useLayoutEffect warns during server rendering, so use a plain effect there (it never runs on the server anyway).
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import OrbitalGlobe from './OrbitalGlobe';
import SpaceTecGlobeEngine from './SpaceTecGlobeEngine';
import LaunchpadGlobeView from './LaunchpadGlobeView';
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
  typeLabelFor,
  buildNetworkOverview,
  formatCount,
  searchEntities,
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

/* ===== Desktop expanded orbital operations console (black & white, matching the site; LIVE stays green) ===== */
.og-root.og-fs {
  --fs-bg: #000; --fs-panel: #000; --fs-surface: #050505; --fs-surface-2: #000;
  --fs-border: #262626; --fs-border-2: #3a3a3a; --fs-text: #fff; --fs-muted: #a3a3a3; --fs-dim: #737373;
  --fs-accent: #fff; --fs-accent-soft: rgba(255,255,255,0.1); --fs-accent-line: rgba(255,255,255,0.55);
  position: fixed; left: 0; right: 0; bottom: 0; top: 81px; /* top is set from the real header height at runtime */
  z-index: 1000000; max-width: none; margin: 0; gap: 0;
  background: var(--fs-bg); color: var(--fs-text);
  font-family: "Space Grotesk", -apple-system, "Segoe UI", sans-serif;
}
.og-fs .og-topbar {
  flex: 0 0 auto; display: flex; align-items: center; gap: 1rem; padding: 0.6rem 1rem;
  background: var(--fs-panel); border-bottom: 1px solid var(--fs-border);
}
.og-fs .og-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 1.6px; color: var(--fs-text); }
.og-fs .og-title small { display: block; font-size: 0.62rem; font-weight: 500; letter-spacing: 1.2px; color: var(--fs-dim); margin-top: 2px; }
.og-fs .og-topstats { margin-left: auto; display: flex; gap: 1.4rem; font-size: 0.72rem; color: var(--fs-muted); align-items: center; font-variant-numeric: tabular-nums; }
.og-fs .og-topstats b { color: var(--fs-text); font-weight: 600; }
.og-live-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); margin-right: 7px; }
.og-fs .og-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr); grid-template-columns: 300px minmax(0, 1fr) 320px; }
@media (min-width: 1280px) { .og-fs .og-body { grid-template-columns: 320px minmax(0, 1fr) 344px; } }
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
/* sidebars: independent scroll containers */
.og-panel { min-height: 0; overflow-y: auto; overflow-x: hidden; background: var(--fs-panel); padding: 0.9rem; box-sizing: border-box; display: flex; flex-direction: column; gap: 0.75rem; scrollbar-width: thin; scrollbar-color: var(--fs-border-2) transparent; }
.og-panel-left { border-right: 1px solid var(--fs-border); }
.og-panel-right { border-left: 1px solid var(--fs-border); }
.og-panel::-webkit-scrollbar { width: 6px; }
.og-panel::-webkit-scrollbar-thumb { background: var(--fs-border-2); border-radius: 3px; }
.og-sec { background: var(--fs-surface); border: 1px solid var(--fs-border); border-radius: 10px; padding: 0.8rem 0.85rem; flex: 0 0 auto; }
.og-sec-h { font-size: 0.64rem; font-weight: 700; letter-spacing: 1.4px; color: var(--fs-muted); margin-bottom: 0.65rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; text-transform: uppercase; }
.og-sec-h b { color: var(--fs-text); font-weight: 600; font-size: 0.72rem; letter-spacing: 0.3px; font-variant-numeric: tabular-nums; }
/* buttons: secondary (default), chip/selected, primary, icon */
.og-fs .og-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-height: 34px; padding: 0.4rem 0.75rem;
  background: var(--fs-surface-2); border: 1px solid var(--fs-border-2); border-radius: 8px; color: #e5e5e5;
  font-family: inherit; font-size: 0.74rem; font-weight: 600; letter-spacing: 0.2px; text-transform: none; cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s, transform 0.06s;
}
.og-fs .og-btn:hover:not([disabled]) { background: #1a1a1a; border-color: #6b6b6b; color: #fff; }
.og-fs .og-btn:active:not([disabled]) { background: #0f0f0f; transform: translateY(1px); }
.og-fs .og-btn:focus-visible, .og-fs .og-switch:focus-visible, .og-fs .og-li:focus-visible, .og-fs .og-search:focus-visible, .og-fs .og-range:focus-visible { outline: 2px solid var(--fs-accent); outline-offset: 2px; }
.og-fs .og-btn.on { background: #fff; border-color: #fff; color: #000; }
.og-fs .og-btn.on:hover:not([disabled]) { background: #e5e5e5; border-color: #e5e5e5; color: #000; }
.og-fs .og-btn[disabled] { opacity: 0.42; cursor: not-allowed; }
.og-fs .og-btn-primary { min-height: 42px; width: 100%; font-size: 0.8rem; font-weight: 700; color: #fff; background: #000; border: 1px solid #fff; }
.og-fs .og-btn-primary:hover:not([disabled]) { background: #1f1f1f; border-color: #fff; color: #fff; }
.og-fs .og-btn-primary:active:not([disabled]) { background: #0f0f0f; transform: translateY(1px); }
.og-fs .og-btn-primary.on { background: #fff; color: #000; border-color: #fff; }
.og-fs .og-btn-primary.on:hover:not([disabled]) { background: #e5e5e5; color: #000; }
.og-fs .og-btn-primary[disabled] { background: #000; color: var(--fs-dim); border-color: var(--fs-border); opacity: 1; }
.og-fs .og-btn-wide { width: 100%; }
.og-fs .og-close { width: 36px; min-height: 36px; padding: 0; font-size: 1.05rem; line-height: 1; }
/* compact ON/OFF switches */
.og-switch { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; width: 100%; min-height: 38px; padding: 0.35rem 0.1rem; background: none; border: 0; border-radius: 8px; color: var(--fs-text); font-family: inherit; font-size: 0.78rem; font-weight: 500; text-align: left; cursor: pointer; }
.og-switch + .og-switch { border-top: 1px solid var(--fs-border); border-radius: 0; }
.og-switch:hover .og-track { border-color: #8a8a8a; }
.og-switch:active .og-knob { width: 16px; }
.og-switch[disabled] { opacity: 0.45; cursor: not-allowed; }
.og-switch-label small { display: block; font-size: 0.64rem; font-weight: 400; color: var(--fs-dim); margin-top: 1px; }
.og-switch-end { display: inline-flex; align-items: center; gap: 0.5rem; flex: 0 0 auto; }
.og-onoff { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.8px; color: var(--fs-dim); min-width: 22px; text-align: right; }
.og-switch[aria-checked="true"] .og-onoff { color: #fff; }
.og-track { position: relative; width: 36px; height: 20px; border-radius: 10px; background: #000; border: 1px solid var(--fs-border-2); transition: background 0.15s, border-color 0.15s; flex: 0 0 auto; }
.og-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 7px; background: #8a8a8a; transition: transform 0.15s, background 0.15s, width 0.08s; }
.og-switch[aria-checked="true"] .og-track { background: #fff; border-color: #fff; }
.og-switch[aria-checked="true"] .og-knob { transform: translateX(16px); background: #000; }
.og-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.og-range { width: 100%; accent-color: #fff; margin: 0.2rem 0 0.55rem; }
.og-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; }
.og-note { font-size: 0.68rem; line-height: 1.5; color: var(--fs-dim); margin: 0.55rem 0 0; }
/* network overview */
.og-stat-main { font-size: 2.3rem; line-height: 1; font-weight: 700; color: var(--fs-text); font-variant-numeric: tabular-nums; letter-spacing: -0.5px; }
.og-stat-cap { font-size: 0.66rem; letter-spacing: 1.2px; color: var(--fs-muted); margin-top: 0.4rem; text-transform: uppercase; }
.og-stat-cap b { color: #fff; font-weight: 600; }
.og-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; margin-top: 0.8rem; padding-top: 0.75rem; border-top: 1px solid var(--fs-border); }
.og-stat-grid div { min-width: 0; }
.og-stat-grid b { display: block; font-size: 0.95rem; font-weight: 600; color: var(--fs-text); font-variant-numeric: tabular-nums; }
.og-stat-grid span { display: block; font-size: 0.6rem; letter-spacing: 0.8px; color: var(--fs-dim); text-transform: uppercase; margin-top: 2px; }
/* search + list */
.og-search { width: 100%; box-sizing: border-box; min-height: 36px; padding: 0.45rem 0.7rem; margin-bottom: 0.6rem; background: var(--fs-bg); border: 1px solid var(--fs-border-2); border-radius: 8px; color: var(--fs-text); font-family: inherit; font-size: 0.78rem; }
.og-search::placeholder { color: var(--fs-dim); }
.og-search:focus { border-color: var(--fs-accent-line); outline: none; }
.og-results { margin: -0.1rem 0 0.8rem; border: 1px solid var(--fs-border); border-radius: 8px; background: #000; }
.og-results-h { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem; border-bottom: 1px solid var(--fs-border); font-size: 0.64rem; letter-spacing: 1.2px; color: var(--fs-muted); text-transform: uppercase; }
.og-results-h b { color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; }
.og-list { max-height: 248px; overflow-y: auto; padding: 0.3rem; scrollbar-width: thin; scrollbar-color: var(--fs-border-2) transparent; }
.og-list::-webkit-scrollbar { width: 5px; }
.og-list::-webkit-scrollbar-thumb { background: var(--fs-border-2); border-radius: 3px; }
.og-results .og-list-foot { padding: 0 0.6rem 0.5rem; margin-top: 0; }
.og-li { display: grid; grid-template-columns: 8px minmax(0, 1fr) auto; align-items: center; gap: 0.6rem; width: 100%; padding: 0.45rem 0.5rem; margin-bottom: 2px; background: transparent; border: 1px solid transparent; border-radius: 8px; color: var(--fs-text); font-family: inherit; text-align: left; cursor: pointer; transition: background 0.1s, border-color 0.1s; }
.og-li:hover { background: #141414; }
.og-li:active { background: #0f0f0f; }
.og-li.sel { background: var(--fs-accent-soft); border-color: var(--fs-accent-line); }
.og-li-name { display: block; font-size: 0.76rem; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.og-li-type { display: block; font-size: 0.64rem; color: var(--fs-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.og-li-id { font-size: 0.64rem; color: var(--fs-dim); font-variant-numeric: tabular-nums; }
.og-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--fs-dim); }
.og-dot.live { background: #fff; }
.og-list-foot { font-size: 0.64rem; color: var(--fs-dim); margin-top: 0.5rem; }
.og-empty { padding: 1.2rem 0.5rem; text-align: center; color: var(--fs-dim); font-size: 0.72rem; }
/* telemetry */
.og-fs .og-info-grid { grid-template-columns: 1fr 1fr; margin-top: 0; gap: 0.7rem 0.9rem; }
.og-fs .og-info-grid .og-span { grid-column: 1 / -1; }
.og-fs .og-k { font-size: 0.6rem; letter-spacing: 0.8px; color: var(--fs-dim); }
.og-fs .og-v { color: var(--fs-text); font-size: 0.82rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.og-fs .og-foot { border-top: 1px solid var(--fs-border); color: var(--fs-dim); font-size: 0.62rem; margin-top: 0.8rem; padding-top: 0.6rem; }
.og-placeholder { border: 1px dashed var(--fs-border-2); border-radius: 8px; padding: 1.4rem 1rem; text-align: center; color: var(--fs-muted); font-size: 0.76rem; line-height: 1.6; }
.og-placeholder b { display: block; color: var(--fs-text); letter-spacing: 1.2px; margin-bottom: 0.5rem; font-size: 0.7rem; }
.og-fs .og-chip { background: rgba(8,10,13,0.82); border-color: var(--fs-border); border-radius: 8px; }
.og-fs .og-loading { top: 0.75rem; left: 50%; right: auto; transform: translateX(-50%); }
.og-fs .og-explore { display: none; }
.og2-pads .og-toolbar > .og-row:first-child { display: none; }
.og2-pads .og-root { gap: 0.75rem; }
.og2-padsx { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; min-width: 0; }
.og2-tip { position: absolute; z-index: 16; pointer-events: none; background: rgba(0,0,0,0.88); border: 1px solid #3f3f46; padding: 0.4rem 0.55rem; font-family: monospace; font-size: 0.6rem; line-height: 1.45; color: #e4e4e7; white-space: nowrap; }
.og2-tip b { color: #ffffff; font-size: 0.66rem; }
.og2-retry { pointer-events: auto; margin-left: 0.6rem; }

/* ===== Mobile expanded orbital tracking (phones / narrow tablets only; desktop console rules above are untouched) ===== */
.og-root.og-mx { --mx-bar: 56px; }
.og-mx .og-mx-top { gap: 0.6rem; padding: 0 0.5rem 0 0.9rem; min-height: 48px; padding-left: max(0.9rem, env(safe-area-inset-left)); padding-right: max(0.5rem, env(safe-area-inset-right)); }
.og-mx .og-mx-stats { margin-left: auto; display: flex; align-items: center; gap: 0.7rem; font-size: 0.66rem; letter-spacing: 0.6px; color: var(--fs-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.og-mx .og-mx-live { color: #22c55e; font-weight: 700; }
.og-mx .og-mx-top .og-close { min-width: 44px; min-height: 44px; }
.og-mx .og-body { display: flex; flex-direction: column; position: relative; grid-template-columns: none; }
.og-mx .og-stage { flex: 1 1 0; min-height: 0; width: 100%; }
.og-mx .og-mx-over { position: absolute; left: 0; right: 0; top: 0; bottom: 0; pointer-events: none; z-index: 20; }
.og-mx .og-mx-over > * { pointer-events: auto; }
.og-mx .og-mx-scrim { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }
.og-mx .og-mx-drawer {
  position: absolute; left: 0; top: 0; bottom: 0; width: min(86vw, 340px); box-sizing: border-box;
  background: #000; border-right: 1px solid var(--fs-border); display: flex; flex-direction: column;
  animation: og-mx-in 0.18s ease-out; padding-left: env(safe-area-inset-left);
}
.og-mx .og-mx-sheet {
  flex: 0 0 auto; max-height: 50%; display: flex; flex-direction: column; box-sizing: border-box;
  background: #000; border-top: 1px solid var(--fs-border); animation: og-mx-up 0.18s ease-out;
  padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right);
}
.og-mx .og-mx-head { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 0.5rem 0 0.9rem; min-height: 44px; border-bottom: 1px solid var(--fs-border); font-size: 0.68rem; font-weight: 700; letter-spacing: 1.4px; }
.og-mx .og-mx-x { min-width: 44px; min-height: 44px; padding: 0; }
.og-mx .og-mx-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; touch-action: pan-y; -webkit-overflow-scrolling: touch; padding: 0.75rem 0.9rem; display: flex; flex-direction: column; gap: 0.75rem; }
.og-mx .og-mx-scroll .og-results, .og-mx .og-mx-scroll .og-list { max-height: 38vh; overscroll-behavior: contain; }
.og-mx .og-mx-pill {
  position: absolute; left: 0.6rem; right: 0.6rem; bottom: 0.6rem; min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
  background: #000; color: #fff; border: 1px solid var(--fs-border-2); border-radius: 4px; padding: 0 0.8rem; font: inherit; font-size: 0.7rem; letter-spacing: 0.6px; cursor: pointer;
}
.og-mx .og-mx-pill span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.og-mx .og-mx-pill span:last-child { color: var(--fs-muted); flex: 0 0 auto; }
.og-mx .og-mx-bar {
  flex: 0 0 auto; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); background: #000; border-top: 1px solid var(--fs-border);
  padding: 0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); position: relative; z-index: 30;
}
.og-mx .og-mx-btn {
  min-height: var(--mx-bar); min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 4px 2px;
  background: #000; color: #a3a3a3; border: 0; border-left: 1px solid var(--fs-border); font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.og-mx .og-mx-btn:first-child { border-left: 0; }
.og-mx .og-mx-btn i { font-style: normal; font-size: 1.05rem; line-height: 1; }
.og-mx .og-mx-btn span { font-size: 0.56rem; letter-spacing: 0.4px; font-weight: 600; text-transform: uppercase; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.og-mx .og-mx-btn.on { background: #fff; color: #000; }
.og-mx .og-mx-btn:focus-visible { outline: 2px solid #fff; outline-offset: -3px; }
.og-mx .og-btn { min-height: 44px; }
@keyframes og-mx-in { from { transform: translateX(-12px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes og-mx-up { from { transform: translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (max-width: 350px) { .og-mx .og-mx-btn span { font-size: 0.5rem; letter-spacing: 0; } }
/* short landscape screens: the telemetry / layers sheet becomes a right-hand panel so the globe keeps its height */
@media (max-height: 520px) {
  .og-mx .og-mx-sheet { position: absolute; right: 0; top: 0; bottom: calc(var(--mx-bar) + 1px + env(safe-area-inset-bottom)); width: min(50vw, 380px); max-height: none; border-top: 0; border-left: 1px solid var(--fs-border); animation: none; z-index: 25; }
}
@media (prefers-reduced-motion: reduce) { .og-mx .og-mx-drawer, .og-mx .og-mx-sheet { animation: none; } }
/* the site's floating bottom nav would sit on top of the toolbar */
html.og-expanded-open .st-bottom-nav { display: none !important; }
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

// Compact ON/OFF switch (role=switch) used by the console's toggle settings.
function Switch({ label, hint, checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} className="og-switch" onClick={() => onChange(!checked)}>
      <span className="og-switch-label">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <span className="og-switch-end">
        <span className="og-onoff">{checked ? 'ON' : 'OFF'}</span>
        <span className="og-track"><span className="og-knob" /></span>
      </span>
    </button>
  );
}

// Height of the website's fixed top bar, measured, so the expanded console sits below it instead of under it.
const FALLBACK_HEADER_PX = 81; // 5rem bar + 1px border
function useHeaderOffset(active) {
  const [top, setTop] = useState(FALLBACK_HEADER_PX);
  useEffect(() => {
    if (!active || typeof document === 'undefined' || typeof document.querySelector !== 'function') return undefined;
    const bar = document.querySelector('.st-hdr-bar');
    const header = (bar && bar.closest && bar.closest('header')) || document.querySelector('header');
    const measure = () => {
      const bottom = header ? Math.round(header.getBoundingClientRect().bottom) : 0;
      setTop(bottom > 0 ? bottom : FALLBACK_HEADER_PX);
    };
    measure();
    window.addEventListener('resize', measure);
    let ro = null;
    if (header && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(header);
    }
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [active]);
  return top;
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
  const [padsEngineFailed, setPadsEngineFailed] = useState(false); // launch-pad engine view failed -> legacy pads
  const [satFilter, setSatFilter] = useState(DEFAULT_SAT_FILTER);
  const [satLimit, setSatLimit] = useState(DEFAULT_SAT_LIMIT);
  const [explore, setExplore] = useState(false);
  const [showOrbit, setShowOrbit] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [hover, setHover] = useState(null);
  const [isolate, setIsolate] = useState(true); // dim everything except the selected satellite
  const [autoRotate, setAutoRotate] = useState(false);
  const [search, setSearch] = useState('');
  const [viewRev, setViewRev] = useState(0);
  const [following, setFollowing] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false); // phone / narrow-tablet expanded view
  const [panel, setPanel] = useState(null); // mobile: 'network' | 'telemetry' | 'layers' | null - one at a time
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [, setSecond] = useState(0);

  const canFullscreen = useMediaQuery('(min-width: 900px)');
  const fullscreen = viewMode === 'satellites' && consoleRequested && canFullscreen;
  // Mobile expanded view: same engine instance, same state; only the chrome around the globe differs.
  const mx = viewMode === 'satellites' && mobileExpanded && !canFullscreen;
  const mxRef = useRef(false);
  mxRef.current = mx;
  const locked = fullscreen || mx; // page scroll locked, globe fully interactive

  const real = useRealOrbitalTracking({
    enabled: satsRequested,
    filter: engineFilterFor(satFilter),
    limit: limitFor(satFilter, satLimit),
  });
  const { subject: realSubject, status, message, count, database, reload } = real;
  const headerTop = useHeaderOffset(locked);

  // Request from the hub (telemetry menu, mobile nav, sidebar): same contract as OrbitalGlobe.
  useEffect(() => {
    if (!requestedView || !requestedView.mode) return;
    const mode = requestedView.mode === 'satellites' ? 'satellites' : 'pads';
    setViewMode(mode);
    setConsoleRequested(mode === 'satellites');
    if (mode === 'satellites') setSatsRequested(true);
    else {
      setPadsEntry(n => n + 1);
      setMobileExpanded(false);
    }
    setPanel(null);
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
    if (!locked) return undefined;
    const scrollY = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.classList.add('og-expanded-open'); // lets the stylesheet step the site's floating bottom nav aside
    if (exitButtonRef.current) exitButtonRef.current.focus();
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      html.classList.remove('og-expanded-open');
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    };
  }, [locked]);

  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (fullscreen) setConsoleRequested(false);
      else if (mxRef.current) setPanel(p => { if (p) return null; setMobileExpanded(false); return null; });
      else if (exploreRef.current) setExplore(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // Explore: the console is interactive; the embedded globe is not, so the page scrolls over it.
  useEffect(() => {
    setExplore(locked);
  }, [locked]);
  exploreRef.current = explore;

  useEffect(() => {
    if (locked || !explore || typeof IntersectionObserver === 'undefined' || !stageRef.current) return undefined;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0] && entries[0].intersectionRatio < 0.25) setExplore(false);
      },
      { threshold: [0, 0.25, 0.5] }
    );
    io.observe(stageRef.current);
    return () => io.disconnect();
  }, [explore, locked]);

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
  }, [viewMode, fullscreen, mx]);

  // The mobile view only exists on narrow screens: rotating / resizing to a wide screen drops it.
  useEffect(() => {
    if (canFullscreen) {
      setMobileExpanded(false);
      setPanel(null);
    }
  }, [canFullscreen]);

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
    if (mxRef.current) setPanel(entity ? 'telemetry' : p => (p === 'telemetry' ? null : p));
  }, []);
  const onHover = useCallback((entity, pos) => setHover(entity && pos ? { entity, pos } : null), []);
  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setHover(null);
    setFollowing(false);
    setPanel(p => (p === 'telemetry' ? null : p));
  }, []);
  const toggleFollow = useCallback(() => {
    if (globeRef.current) globeRef.current.setFollow(!following);
  }, [following]);

  const switchMode = key => {
    if (key !== 'satellites') setMobileExpanded(false);
    setPanel(null);
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

  const resetView = useCallback(() => {
    if (globeRef.current) globeRef.current.reset(); // flies back to the default view; the selection is kept
  }, []);
  // Pick from the satellite list: select and fly to it (same engine call the marker tap path uses).
  const selectFromList = useCallback(entity => {
    setSelectedId(entity.id);
    setHover(null);
    if (mxRef.current) setPanel('telemetry'); // a result opens its telemetry (replaces the Network panel)
    if (globeRef.current) globeRef.current.focusEntity(entity.id);
  }, []);

  // The visible objects, for the satellite list. The hook applies filter / limit changes in an effect, so a tick
  // after it re-reads the subject (an effect declared later runs after the hook's).
  useEffect(() => {
    setViewRev(n => n + 1);
  }, [realSubject, satFilter, satLimit, count]);
  const listEntities = useMemo(() => (realSubject ? realSubject.getEntities() : []), [realSubject, viewRev]);
  const searchResult = useMemo(() => searchEntities(listEntities, search), [listEntities, search]);
  const overview = buildNetworkOverview(database, count);
  const isSearching = search.trim() !== '';
  const filterLabel = (SAT_FILTERS.find(f => f.key === satFilter) || SAT_FILTERS[0]).label;

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
      {viewMode === 'satellites' && !canFullscreen && (
        <button className="og-btn" onClick={() => setMobileExpanded(true)}>⛶ Expand</button>
      )}
    </div>
  );

  // ----- launch pads: the in-house engine when a dataset is given, otherwise the legacy globe -----
  // Either way exactly one WebGL globe is mounted in this mode.
  if (viewMode === 'pads') {
    const padsOnEngine = Array.isArray(launchpads) && launchpads.length > 0 && !padsEngineFailed;
    return (
      <div className="og-root">
        <style>{OG_CSS}</style>
        <div className="og-toolbar">{modeButtons}</div>
        {padsOnEngine ? (
          <EngineBoundary onError={() => setPadsEngineFailed(true)}>
            <LaunchpadGlobeView launchpads={launchpads} onUnavailable={() => setPadsEngineFailed(true)} />
          </EngineBoundary>
        ) : (
          <div className="og2-pads">
            <OrbitalGlobe requestedView={padsView} launchpads={launchpads} />
          </div>
        )}
      </div>
    );
  }

  // ----- satellites: in-house engine -----
  const loading = satsRequested && (status === 'idle' || status === 'loading');
  // explore turns on automatically when the console opens (see above); the console's Free camera switch can turn it off.
  const interactive = explore ? true : 'pick'; // camera locked (page scrolls) but tap + hover still work

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
          isolateSelected={isolate}
          adaptiveMarkers
          autoRotate={autoRotate}
          showControls={false}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {!fullscreen && !mx && satFilter === 'active' && !selectedId && (
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

      {!mx && (
        <div className="og-chip" style={{ left: '0.75rem', bottom: '0.75rem', zIndex: 10 }}>
          <b style={{ fontSize: '0.58rem', letterSpacing: '0.5px' }}>● REAL-TIME SGP4 ORBITAL PHYSICS</b>
          <small>1000ms Live Clock • NORAD Coordinate Frame</small>
        </div>
      )}

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

      {!mx && (
        <div className="og-chip" style={{ top: '0.75rem', left: '0.75rem' }}>
          <small>TRACKED OBJECTS</small>
          <b>{trackedCount.toLocaleString()}</b>
        </div>
      )}

      {hover && (
        <div className="og2-tip" style={placeTooltip(hover.pos, stageSize)}>
          {buildHoverLines(hover.entity).map((line, i) => (i === 0 ? <b key={i}>{line}</b> : <div key={i}>{line}</div>))}
        </div>
      )}

      {!fullscreen && !mx && (
        <div className="og-explore">
          <button className={`og-btn ${explore ? 'on' : ''}`} onClick={() => setExplore(v => !v)} aria-pressed={explore}>
            {explore ? 'Exit Explore ✕' : 'Explore globe'}
          </button>
          <span className="og-hint">
            {explore ? 'Drag to rotate • pinch / wheel to zoom' : 'Page scrolls normally • tap a marker to inspect'}
          </span>
        </div>
      )}

      {!fullscreen && !mx && panelRows && (
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

  // Shared by the desktop sidebar and the mobile Network panel.
  const networkSections = (
    <>
      <div className="og-sec">
        <div className="og-sec-h"><span>NETWORK OVERVIEW</span></div>
        <div className="og-stat-main">{formatCount(overview.visible)}</div>
        <div className="og-stat-cap">VISIBLE ON GLOBE · <b>{filterLabel}</b></div>
        <div className="og-stat-grid">
          <div><b>{formatCount(overview.total)}</b><span>In database</span></div>
          <div><b>{formatCount(overview.active)}</b><span>Active</span></div>
          <div><b>{formatCount(overview.inactive)}</b><span>Inactive</span></div>
        </div>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>SEARCH &amp; FILTERS</span></div>
        <input
          className="og-search" type="search" value={search} placeholder="Search name or NORAD ID"
          aria-label="Search satellites" onChange={e => setSearch(e.target.value)}
        />
        {isSearching && (
          <div className="og-results" role="region" aria-label="Search results">
            <div className="og-results-h">
              <span><b>{searchResult.matches.toLocaleString()}</b> {searchResult.matches === 1 ? 'result' : 'results'}</span>
              <button className="og-btn" onClick={() => setSearch('')} aria-label="Clear search" style={{ minHeight: '24px', padding: '0.1rem 0.5rem', fontSize: '0.64rem' }}>
                Clear
              </button>
            </div>
            <div className="og-list" role="listbox" aria-label="Search results">
              {searchResult.shown.map(sat => {
                const picked = selectedId !== null && selectedId !== undefined && String(selectedId) === String(sat.id);
                return (
                  <button
                    key={sat.id} type="button" role="option" aria-selected={picked}
                    className={`og-li ${picked ? 'sel' : ''}`} onClick={() => selectFromList(sat)}
                  >
                    <span className={`og-dot ${sat.trackable ? 'live' : ''}`} title={sat.trackable ? 'Live SGP4 tracking' : 'Static database position'} />
                    <span>
                      <span className="og-li-name">{sat.name || 'UNKNOWN OBJECT'}</span>
                      <span className="og-li-type">{typeLabelFor(sat)} · {sat.trackable ? 'Tracking' : 'Static'}</span>
                    </span>
                    <span className="og-li-id">{sat.id}</span>
                  </button>
                );
              })}
              {searchResult.matches === 0 && (
                <div className="og-empty">
                  No satellites match “{search.trim()}” among the {listEntities.length.toLocaleString()} displayed.
                  {satFilter !== 'active' ? ' Try ALL ACTIVE.' : ''}
                </div>
              )}
            </div>
            {searchResult.matches > searchResult.shown.length && (
              <div className="og-list-foot">Showing first {searchResult.shown.length.toLocaleString()} of {searchResult.matches.toLocaleString()} — refine the search to narrow down.</div>
            )}
          </div>
        )}
        <div className="og-grid2">
          {SAT_FILTERS.map(f => (
            <button key={f.key} className={`og-btn ${satFilter === f.key ? 'on' : ''}`} aria-pressed={satFilter === f.key} onClick={() => pickFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {satFilter === 'active' && (
        <div className="og-sec">
          <div className="og-sec-h">
            <span>SATELLITE COUNT</span>
            <b>{satLimit.toLocaleString()}</b>
          </div>
          <input
            className="og-range" type="range" min="500" max="16000" step="500" value={satLimit}
            onChange={e => setSatLimit(Number(e.target.value))} aria-label="Satellite count"
          />
          <div className="og-presets">
            {[500, 1000, 2500, 5000, 10000, 16000].map(val => (
              <button key={val} className={`og-btn ${satLimit === val ? 'on' : ''}`} onClick={() => setSatLimit(val)}>
                {val >= 1000 ? `${val / 1000}K` : val}
              </button>
            ))}
          </div>
          <p className="og-note">Number of ALL ACTIVE objects drawn (default 1,000, up to 16,000).</p>
        </div>
      )}
    </>
  );
  const leftPanel = (
    <aside className="og-panel og-panel-left" aria-label="Satellite network">
      {networkSections}
    </aside>
  );

  const hasSelection = selectedId !== null && selectedId !== undefined && !!selectedEntity;
  const telemetrySection = (
      <div className="og-sec">
        <div className="og-sec-h">
          <span>{panelRows ? 'REAL-TIME ORBITAL TELEMETRY' : 'OBJECT TELEMETRY'}</span>
          {panelRows && (
            <button className="og-btn" onClick={clearSelection} aria-label="Clear selection" style={{ minHeight: '28px', padding: '0.2rem 0.6rem', fontSize: '0.68rem' }}>
              Clear
            </button>
          )}
        </div>
        {panelRows ? (
          <>
            <div className="og-info-grid">
              {panelRows.map(row => (
                <InfoRow key={row.label} label={row.label} value={row.value} span={row.span} />
              ))}
            </div>
            <div className="og-foot">● PROPAGATING AT 1 SECOND INTERVALS</div>
          </>
        ) : (
          <div className="og-placeholder">
            <b>NO OBJECT SELECTED</b>
            Select a satellite on the globe or from the list to view its live telemetry.
          </div>
        )}
      </div>
  );

  const cameraSection = (
      <div className="og-sec">
        <div className="og-sec-h"><span>CAMERA</span></div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <button
            className={`og-btn og-btn-primary ${following ? 'on' : ''}`} aria-pressed={following}
            disabled={!hasSelection} onClick={toggleFollow}
          >
            {following ? '● Following satellite' : 'Follow satellite'}
          </button>
          <button className="og-btn og-btn-wide" onClick={resetView}>Reset view</button>
        </div>
        <p className="og-note">
          {hasSelection ? (following ? 'The camera is tracking the selected satellite.' : 'Keeps the selected satellite centred.') : 'Select a satellite to enable Follow.'}
        </p>
      </div>
  );

  const vizSection = (
      <div className="og-sec">
        <div className="og-sec-h"><span>ORBIT VISUALISATION</span></div>
        <Switch label="Orbit paths" hint="Path of the selected satellite" checked={showOrbit} onChange={setShowOrbit} />
        <Switch label="Isolate selected" hint="Dim all other satellites" checked={isolate} onChange={setIsolate} />
      </div>
  );

  const displaySection = (
      <div className="og-sec">
        <div className="og-sec-h"><span>DISPLAY</span></div>
        <Switch label="Auto rotation" hint="Slowly spin the globe" checked={autoRotate} onChange={setAutoRotate} />
        <Switch label="Free camera" hint="Drag to rotate, wheel to zoom" checked={explore} onChange={setExplore} />
      </div>
  );

  const systemSection = (
      <div className="og-sec">
        <div className="og-sec-h"><span>SYSTEM</span></div>
        <p className="og-note" style={{ marginTop: 0 }}>
          PROPAGATOR: SGP4 (satellite.js)<br />
          UPDATE: 1 s live clock<br />
          SOURCE: NORAD orbital elements<br />
          Esc closes the expanded view.
        </p>
      </div>
  );

  const rightPanel = (
    <aside className="og-panel og-panel-right" aria-label="Telemetry and globe controls">
      {telemetrySection}
      {cameraSection}
      {vizSection}
      {displaySection}
      {systemSection}
    </aside>
  );


  // ----- Mobile expanded view chrome: reuses the same sections, state and handlers as the desktop console -----
  const toggleMxPanel = key => setPanel(p => (p === key ? null : key));
  const mobileFollow = () => {
    if (hasSelection) toggleFollow();
    else setPanel('telemetry'); // nothing selected: show the empty state instead of a dead button
  };
  const mobileChrome = (
    <>
      <div className="og-mx-over">
        {panel === 'network' && (
          <>
            <div className="og-mx-scrim" onClick={() => setPanel(null)} aria-hidden="true" />
            <aside className="og-mx-drawer" aria-label="Satellite network">
              <div className="og-mx-head">
                <span>NETWORK</span>
                <button className="og-btn og-mx-x" onClick={() => setPanel(null)} aria-label="Close network panel">✕</button>
              </div>
              <div className="og-mx-scroll">{networkSections}</div>
            </aside>
          </>
        )}
        {!panel && hasSelection && panelRows && (
          <button className="og-mx-pill" onClick={() => setPanel('telemetry')} aria-label="Open telemetry">
            <span>{selectedEntity.name || 'Selected object'}</span><span>TELEMETRY ▴</span>
          </button>
        )}
      </div>
      {(panel === 'telemetry' || panel === 'layers') && (
        <section className="og-mx-sheet" aria-label={panel === 'telemetry' ? 'Object telemetry' : 'Layers and controls'}>
          <div className="og-mx-head">
            <span>{panel === 'telemetry' ? 'TELEMETRY' : 'LAYERS & CONTROLS'}</span>
            <button className="og-btn og-mx-x" onClick={() => setPanel(null)} aria-label={panel === 'telemetry' ? 'Close telemetry' : 'Close layers'}>✕</button>
          </div>
          <div className="og-mx-scroll">
            {panel === 'telemetry' ? (
              <>
                {telemetrySection}
                {cameraSection}
              </>
            ) : (
              <>
                {vizSection}
                {displaySection}
              </>
            )}
          </div>
        </section>
      )}
      <nav className="og-mx-bar" aria-label="Globe controls">
        <button className={`og-mx-btn ${panel === 'network' ? 'on' : ''}`} aria-pressed={panel === 'network'} onClick={() => toggleMxPanel('network')}>
          <i aria-hidden="true">☰</i><span>Network</span>
        </button>
        <button className={`og-mx-btn ${following ? 'on' : ''}`} aria-pressed={following} onClick={mobileFollow}>
          <i aria-hidden="true">◎</i><span>Follow {following ? 'ON' : 'OFF'}</span>
        </button>
        <button className="og-mx-btn" onClick={resetView}>
          <i aria-hidden="true">⟲</i><span>Reset</span>
        </button>
        <button className={`og-mx-btn ${showOrbit ? 'on' : ''}`} aria-pressed={showOrbit} onClick={() => setShowOrbit(v => !v)}>
          <i aria-hidden="true">◌</i><span>Orbits {showOrbit ? 'ON' : 'OFF'}</span>
        </button>
        <button className={`og-mx-btn ${panel === 'layers' ? 'on' : ''}`} aria-pressed={panel === 'layers'} onClick={() => toggleMxPanel('layers')}>
          <i aria-hidden="true">≡</i><span>Layers</span>
        </button>
      </nav>
    </>
  );

  return (
    <div
      className={`og-root ${locked ? 'og-fs' : ''}${mx ? ' og-mx' : ''}`}
      style={locked ? { top: headerTop } : undefined}
      {...(locked ? { role: 'dialog', 'aria-label': mx ? 'Orbital tracking' : 'Orbital operations console' } : {})}
    >
      <style>{OG_CSS}</style>

      {mx ? (
        <div className="og-topbar og-mx-top">
          <div className="og-title">ORBITAL TRACKING</div>
          <div className="og-mx-stats">
            <span className="og-mx-live"><span className="og-live-dot" />LIVE</span>
            <span>{trackedCount.toLocaleString()} {trackedCount === 1 ? 'SAT' : 'SATS'}</span>
          </div>
          <button
            ref={exitButtonRef} className="og-btn og-close" onClick={() => { setPanel(null); setMobileExpanded(false); }}
            aria-label="Close expanded view"
          >
            ✕
          </button>
        </div>
      ) : fullscreen ? (
        <div className="og-topbar">
          <button className="og-btn" onClick={() => setConsoleRequested(false)}>
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
          <button
            ref={exitButtonRef} className="og-btn og-close" onClick={() => setConsoleRequested(false)}
            aria-label="Close expanded view" title="Close (Esc)"
          >
            ✕
          </button>
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
        {fullscreen ? rightPanel : mx ? mobileChrome : null}
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

  // The server and the hydrating first render use the build setting only (no window). The URL override is then read
  // in a layout effect: it runs in the same commit, before paint and before the legacy globe's async react-globe.gl
  // import can resolve, so ?orbitGlobe=engine never lets the legacy globe create a WebGL context first.
  useIsoLayoutEffect(() => {
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
