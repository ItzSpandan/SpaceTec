'use client';

/**
 * Orbital Tracking adapter: everything satellite-specific that the generic globe engine used to contain.
 *
 * The engine (SpaceTecGlobeEngine.js) knows nothing about this file. It is composed from the outside:
 *
 *   const subject = createOrbitalTrackingSubject({ getEntities, tick, tickMs, getPath, ... });
 *   <SpaceTecGlobeEngine subject={subject} />
 *
 * What lives here: orbit categories and render types, classification (name/category -> type), the
 * representative spacecraft models (see orbitalModels.js), selection-card content, UI labels, orbit-path
 * data for the generated test fleet, and that test fleet itself (circular orbits, a stand-in for the
 * SGP4-propagated data that the real Orbital Tracking feature will supply through the same factory).
 */
import { createElement, useCallback, useMemo, useState } from 'react';
import { DEG, EARTH_KM, mulberry32 } from '../globeShared';
import { ORBITAL_MODELS } from './orbitalModels';

const MU = 398600.4418; // km^3 / s^2
const OMEGA_E = 7.2921159e-5; // rad / s

// ---------------------------------------------------------------------------
// Orbit categories, render types and classification
// ---------------------------------------------------------------------------
const ORBITAL_CATEGORIES = {
  leo: { label: 'Low orbit', color: '#7fd4ff', size: 0.0042, shape: 'octa' },
  meo: { label: 'Medium orbit', color: '#ffd27a', size: 0.0062, shape: 'box' },
  geo: { label: 'Geostationary', color: '#ff9f80', size: 0.0085, shape: 'tetra' },
  station: { label: 'Stations', color: '#ffffff', size: 0.012, shape: 'ico' },
  other: { label: 'Other', color: '#b9c2d0', size: 0.0042, shape: 'octa' },
};

// Render types: the globe draws one InstancedMesh per type. `category` (orbit class) stays in the data;
// `kind` is an optional hint, otherwise the type is derived from category / name (display only).
const ORBITAL_TYPES = {
  comms: { label: 'Communications', color: '#ffcf70', size: 0.0105 },
  starlink: { label: 'Broadband constellation', color: '#cfe6ff', size: 0.0075 },
  nav: { label: 'Navigation', color: '#9fe3b0', size: 0.0085 },
  weather: { label: 'Weather & Earth observation', color: '#8fc5ff', size: 0.0085 },
  cubesat: { label: 'CubeSat', color: '#d9a8ff', size: 0.0045 },
  station: { label: 'Space station', color: '#ffffff', size: 0.016 },
  generic: { label: 'Other', color: '#b9c2d0', size: 0.0055 },
};


export function classifyOrbitalObject(sat) {
  if (sat && sat.kind && ORBITAL_TYPES[sat.kind]) return sat.kind;
  const name = String((sat && sat.name) || '').toUpperCase();
  if ((sat && sat.category === 'station') || /\b(ISS|ZARYA|TIANGONG|CSS)\b/.test(name)) return 'station';
  if (name.includes('STARLINK')) return 'starlink';
  if (/NAVSTAR|\bGPS\b|GALILEO|GLONASS|BEIDOU|QZS/.test(name)) return 'nav';
  if (/NOAA|GOES|METEOR|METOP|JPSS|HIMAWARI|LANDSAT|SENTINEL|FENGYUN/.test(name)) return 'weather';
  if (/CUBESAT|\bCUBE\b|\bDOVE\b|FLOCK|LEMUR/.test(name)) return 'cubesat';
  if (sat && sat.category === 'geo') return 'comms';
  if (sat && sat.category === 'meo') return 'nav';
  return 'generic';
}

// Orbit-class names for the selection card (display only).
export { ORBITAL_CATEGORIES, ORBITAL_TYPES };

// ---------------------------------------------------------------------------
// Generated test fleet (circular orbits; stands in for real propagated data)
// ---------------------------------------------------------------------------
export function generateTestFleet(count, timeScale) {
  const rnd = mulberry32(2024);
  const sats = [];
  const recs = [];
  const byId = new Map();
  const add = (category, name, altKm, incDeg, raanDeg, phaseDeg, kind) => {
    const a = EARTH_KM + altKm;
    const inc = incDeg * DEG;
    const raan = raanDeg * DEG;
    const n = Math.sqrt(MU / (a * a * a));
    const id = `STG-${10000 + sats.length}`;
    const sat = {
      id,
      name,
      category,
      kind,
      lat: 0,
      lng: 0,
      altitudeKm: altKm,
      velocityKmS: Math.sqrt(MU / a),
      inclinationDeg: incDeg,
      periodMin: (2 * Math.PI) / n / 60,
      isTest: true,
      timestamp: 0,
    };
    const rec = { a, n, m0: phaseDeg * DEG, cosI: Math.cos(inc), sinI: Math.sin(inc), cosR: Math.cos(raan), sinR: Math.sin(raan) };
    sats.push(sat);
    recs.push(rec);
    byId.set(id, rec);
  };

  add('station', 'Test station Alpha', 410, 51.6, 40, 10, 'station');
  add('station', 'Test station Beta', 390, 41.5, 200, 120, 'station');
  add('station', 'Test station Gamma', 430, 97.4, 300, 250, 'station');
  const incLeo = [53, 53, 70, 97.6, 98.2, 86.4, 43];
  for (let i = sats.length; i < count; i += 1) {
    const r = rnd();
    const num = 10000 + i;
    if (r < 0.46) {
      add('leo', `Broadband-${num}`, 530 + rnd() * 60, [53, 53, 53, 70, 97.6][Math.floor(rnd() * 5)] + (rnd() - 0.5) * 0.3, rnd() * 360, rnd() * 360, 'starlink');
    } else if (r < 0.58) {
      add('leo', `EO-${num}`, 600 + rnd() * 250, 97.4 + rnd() * 1.4, rnd() * 360, rnd() * 360, 'weather');
    } else if (r < 0.72) {
      add('leo', `Cube-${num}`, 400 + rnd() * 200, 50 + rnd() * 48, rnd() * 360, rnd() * 360, 'cubesat');
    } else if (r < 0.78) {
      add('leo', `LEO-${num}`, 350 + Math.pow(rnd(), 1.5) * 1400, incLeo[Math.floor(rnd() * incLeo.length)] + (rnd() - 0.5) * 0.4, rnd() * 360, rnd() * 360, 'generic');
    } else if (r < 0.88) {
      add('meo', `Nav-${num}`, 19100 + rnd() * 4100, rnd() < 0.5 ? 55 + rnd() : 64.8 + rnd(), rnd() * 360, rnd() * 360, 'nav');
    } else if (r < 0.97) {
      add('geo', `Comms-${num}`, 35786, rnd() * 4, rnd() * 360, rnd() * 360, 'comms');
    } else {
      add('other', `OBJ-${num}`, 600 + rnd() * 900, rnd() * 100, rnd() * 360, rnd() * 360, 'generic');
    }
  }

  const t0 = Date.now();
  const frameAt = ms => {
    const t = ((ms - t0) / 1000) * timeScale;
    return { t, theta: OMEGA_E * t };
  };
  const wrap = d => ((((d + 180) % 360) + 360) % 360) - 180;

  function update(ms) {
    const { t, theta } = frameAt(ms);
    for (let i = 0; i < sats.length; i += 1) {
      const r = recs[i];
      const u = r.m0 + r.n * t;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const x1 = r.a * cu;
      const y1 = r.a * su * r.cosI;
      const z1 = r.a * su * r.sinI;
      const x = x1 * r.cosR - y1 * r.sinR;
      const y = x1 * r.sinR + y1 * r.cosR;
      const s = sats[i];
      s.lat = Math.asin(z1 / r.a) / DEG;
      s.lng = wrap((Math.atan2(y, x) - theta) / DEG);
      s.timestamp = ms; // sample time, used for interpolation of the selected satellite
    }
  }

  function orbitPath(id, ms) {
    const r = byId.get(id);
    if (!r) return null;
    const { theta } = frameAt(ms);
    const pts = [];
    for (let k = 0; k <= 180; k += 1) {
      const u = (k / 180) * Math.PI * 2;
      const x1 = r.a * Math.cos(u);
      const y1 = r.a * Math.sin(u) * r.cosI;
      const z1 = r.a * Math.sin(u) * r.sinI;
      const x = x1 * r.cosR - y1 * r.sinR;
      const y = x1 * r.sinR + y1 * r.cosR;
      pts.push({ lat: Math.asin(z1 / r.a) / DEG, lng: wrap((Math.atan2(y, x) - theta) / DEG), altitudeKm: r.a - EARTH_KM });
    }
    return pts;
  }

  update(t0);
  return { sats, update, orbitPath };
}

// ---------------------------------------------------------------------------
// Subject factory: turns satellite content into a generic GlobeSubject
// ---------------------------------------------------------------------------
function describeOrbitalObject(sat) {
  const rows = [
    { label: 'Orbit class', value: (ORBITAL_CATEGORIES[sat.category] || ORBITAL_CATEGORIES.other).label },
    { label: 'Model', value: `Representative ${ORBITAL_TYPES[classifyOrbitalObject(sat)].label.toLowerCase()}` },
    { label: 'Altitude', value: `${Number(sat.altitudeKm).toFixed(0)} km` },
    { label: 'Latitude', value: `${Number(sat.lat).toFixed(2)}°` },
    { label: 'Longitude', value: `${Number(sat.lng).toFixed(2)}°` },
  ];
  if (Number.isFinite(Number(sat.velocityKmS))) rows.push({ label: 'Speed', value: `${Number(sat.velocityKmS).toFixed(2)} km/s` });
  if (sat.isTest) rows.push({ label: 'Source', value: 'Generated test data' });
  return { title: sat.name || sat.id, subtitle: String(sat.id), rows };
}

/**
 * source: { id?, getEntities(), subscribe?(push), tickMs?, tick?(nowMs), getPath?(id, nowMs), onSelect?(sat|null) }
 * Entities use the satellite data contract: { id, name?, category?, kind?, lat, lng, altitudeKm, velocityKmS?, timestamp? }.
 * Returns a GlobeSubject for SpaceTecGlobeEngine.
 */
export function createOrbitalTrackingSubject(source) {
  return {
    ...source,
    id: source.id || 'orbital-tracking',
    types: ORBITAL_TYPES,
    models: ORBITAL_MODELS,
    resolveType: classifyOrbitalObject,
    describeEntity: describeOrbitalObject,
    labels: { legend: 'Satellite categories', selected: 'Selected satellite', path: 'Orbit path' },
  };
}

// The generated test fleet as a subject (Globe Lab development preview).
export function createTestFleetSubject(count = 3000, timeScale = 60) {
  const fleet = generateTestFleet(count, timeScale);
  return createOrbitalTrackingSubject({
    id: 'orbital-test-fleet',
    getEntities: () => fleet.sats,
    tickMs: 50,
    tick: ms => {
      fleet.update(ms);
      return fleet.sats;
    },
    getPath: (id, ms) => fleet.orbitPath(String(id), ms),
  });
}

// ---------------------------------------------------------------------------
// Test-fleet UI for Globe Lab (rendered into the engine's `legendExtras` slot)
// ---------------------------------------------------------------------------
export const TEST_COUNTS = [500, 1000, 3000, 5000, 10000, 20000];

export function OrbitalTestControls({ count, onChange }) {
  return createElement(
    'label',
    { className: 'stge-count' },
    'Test objects',
    createElement(
      'select',
      { value: count, onChange: e => onChange(Number(e.target.value)) },
      TEST_COUNTS.map(c => createElement('option', { key: c, value: c }, c.toLocaleString()))
    )
  );
}

// Globe Lab helper: { subject, controls } for the generated fleet, with a selectable object count.
export function useOrbitalTestFleet({ initialCount = 3000, timeScale = 60 } = {}) {
  const [count, setCount] = useState(initialCount);
  const subject = useMemo(() => createTestFleetSubject(count, timeScale), [count, timeScale]);
  const onChange = useCallback(c => setCount(c), []);
  const controls = useMemo(() => createElement(OrbitalTestControls, { count, onChange }), [count, onChange]);
  return { subject, controls };
    }
