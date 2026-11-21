'use client';

/**
 * Orbital Tracking adapter: everything satellite-specific that the generic globe engine used to contain.
 *
 * The engine (SpaceTecGlobeEngine.js) knows nothing about this file. It is composed from the outside:
 *
 *   const subject = createOrbitalTrackingSubject({ getEntities, tick, tickMs, getPath, ... });
 *   <SpaceTecGlobeEngine subject={subject} />
 *
 * What lives here: orbit categories and render types, classification, the representative spacecraft models
 * (see orbitalModels.js), selection-card content, UI labels, and two content providers behind the same factory:
 *   - the generated test fleet (circular orbits; Globe Lab development preview), and
 *   - the REAL provider (createRealOrbitalSubject): Supabase satellite rows -> SGP4 (orbitalPropagation.js) ->
 *     live positions, with orbit paths generated on demand for the selected satellite.
 * Supabase loading lives in orbitalSatelliteSource.js and the React hook in useRealOrbitalTracking.js, so
 * importing this file (Globe Lab does) needs no Supabase client or environment variables.
 *
 * Three different classifications are kept apart on purpose:
 *   satellite_type  mission family from the database (broadband, navigation, communications, ...)
 *   category        orbital class (leo / meo / geo / station / other)
 *   render type     which model/colour the globe draws (a key of ORBITAL_TYPES), chosen by this adapter
 */
import { createElement, useCallback, useMemo, useState } from 'react';
import { DEG, EARTH_KM, mulberry32 } from '../globeShared';
import { ORBITAL_MODELS } from './orbitalModels';
import {
  EARTH_RADIUS_KM,
  buildSatrec,
  computeSatelliteState,
  generateOrbitPath,
  getOrbitalPeriodMinutes,
  normalizeLongitude,
  safeNumber,
} from './orbitalPropagation';

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

// satellite_type (mission family written by scripts/sync-satellites.js) -> render type.
// Earth-observation missions share the weather/EO model; research and 'other' use the generic marker.
export const SATELLITE_TYPE_LABELS = {
  broadband: 'Broadband constellation',
  navigation: 'Navigation',
  communications: 'Communications',
  weather: 'Weather',
  earth_observation: 'Earth observation',
  cubesat: 'CubeSat',
  station: 'Space station',
  research: 'Research',
  other: 'Other',
};
export const SATELLITE_TYPE_TO_RENDER_TYPE = {
  broadband: 'starlink',
  navigation: 'nav',
  communications: 'comms',
  weather: 'weather',
  earth_observation: 'weather',
  cubesat: 'cubesat',
  station: 'station',
  research: 'generic',
  other: 'generic',
};

export function normalizeSatelliteType(value) {
  const key = String(value == null ? '' : value).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SATELLITE_TYPE_TO_RENDER_TYPE, key) ? key : null;
}

// Render type for any orbital entity: the database's satellite_type first; name/category rules
// (classifyOrbitalObject, also used by the test fleet) only when it is missing or not a known value.
export function resolveOrbitalRenderType(entity) {
  const type = normalizeSatelliteType(entity && entity.satellite_type);
  if (type) return SATELLITE_TYPE_TO_RENDER_TYPE[type];
  return classifyOrbitalObject(entity);
}

// Orbital class from the database `category` when valid, else derived once from the orbital period.
// (sync-satellites.js does not write `category`, so most rows take the derived path.)
export function deriveOrbitalCategory(row, periodMin) {
  const given = String((row && row.category) == null ? '' : row.category).trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ORBITAL_CATEGORIES, given)) return given;
  if (normalizeSatelliteType(row && row.satellite_type) === 'station') return 'station';
  const p = Number(periodMin);
  if (!Number.isFinite(p) || p <= 0) return 'other';
  if (p < 128) return 'leo'; // below ~2,000 km altitude
  if (p >= 1400 && p <= 1480) return 'geo'; // ~1 sidereal day
  if (p < 1400) return 'meo';
  return 'other'; // highly elliptical / beyond GEO
}

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
    resolveType: source.resolveType || resolveOrbitalRenderType,
    describeEntity: source.describeEntity || describeOrbitalObject,
    labels: { legend: 'Satellite categories', selected: 'Selected satellite', path: 'Orbit path', ...(source.labels || {}) },
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
// REAL provider: Supabase rows -> SGP4 -> live entities
// ---------------------------------------------------------------------------
const LIVE_TICK_MS = 1000; // same ~1 s cadence as OrbitalGlobe.js

function describeRealSatellite(sat) {
  const typeKey = normalizeSatelliteType(sat.satellite_type);
  const renderType = ORBITAL_TYPES[resolveOrbitalRenderType(sat)];
  const rows = [
    { label: 'Mission type', value: typeKey ? SATELLITE_TYPE_LABELS[typeKey] : 'Unclassified' },
    { label: 'Orbit class', value: (ORBITAL_CATEGORIES[sat.category] || ORBITAL_CATEGORIES.other).label },
    { label: 'Model', value: `Representative ${renderType.label.toLowerCase()}` },
    { label: 'Altitude', value: `${Number(sat.altitudeKm).toFixed(0)} km` },
    { label: 'Latitude', value: `${Number(sat.lat).toFixed(2)}°` },
    { label: 'Longitude', value: `${Number(sat.lng).toFixed(2)}°` },
  ];
  if (Number.isFinite(Number(sat.velocityKmS))) rows.push({ label: 'Speed', value: `${Number(sat.velocityKmS).toFixed(2)} km/s` });
  if (sat.organization) rows.push({ label: 'Operator', value: String(sat.organization) });
  rows.push({ label: 'Source', value: sat.trackable ? 'Database orbital elements · SGP4' : 'Stored database position (not propagated)' });
  return { title: sat.name || String(sat.id), subtitle: `NORAD ${sat.id}`, rows };
}

function isInactiveRow(row) {
  const status = String((row && (row.status || row.operational_status)) || '').toLowerCase();
  return status.includes('decay') || status.includes('dead') || status.includes('inactive');
}

// Turns one database row into { entity, satrec, pathInput } or null. The entity is a PERSISTENT object that
// the live updater mutates in place, so ids and array order never change between updates.
export function buildOrbitalRecord(row, nowMs = Date.now()) {
  if (!row || isInactiveRow(row)) return null;
  const id = row.id ?? row.norad_id;
  if (id === null || id === undefined) return null;

  const satrec = buildSatrec(row);
  const usable = satrec && satrec.error === 0 ? satrec : null;
  const state = usable ? computeSatelliteState(usable, new Date(nowMs)) : null;

  let lat;
  let lng;
  let altitudeKm;
  let velocityKmS;
  if (state) {
    ({ lat, lng, altitudeKm, velocityKmS } = state);
  } else {
    // Same fallback as formatDatabaseSatellite: the stored snapshot position, if the row has one.
    // Supabase returns NULL (not undefined) for columns the sync could not fill, and Number(null) is 0,
    // so a missing position must be rejected explicitly or the row would land on (0, 0).
    const hasStoredPosition = [row.lat, row.lng].every(v => v !== null && v !== undefined && String(v).trim() !== '');
    const dbLat = hasStoredPosition ? safeNumber(row.lat, null) : null;
    const dbLng = hasStoredPosition ? safeNumber(row.lng, null) : null;
    if (dbLat === null || dbLng === null) return null; // nothing drawable
    lat = dbLat;
    lng = normalizeLongitude(dbLng);
    const rawAlt = safeNumber(row.altitude, 500);
    altitudeKm = rawAlt > 0 ? rawAlt : 500;
    velocityKmS = safeNumber(row.velocity, null);
  }

  const pathInput = { satrec: usable, mean_motion: row.mean_motion };
  const periodMin = usable || safeNumber(row.mean_motion, null) ? getOrbitalPeriodMinutes(pathInput) : null;
  const entity = {
    id,
    name: row.name || 'UNKNOWN OBJECT',
    organization: row.organization || '',
    satellite_type: row.satellite_type == null ? null : row.satellite_type,
    category: deriveOrbitalCategory(row, periodMin),
    lat,
    lng,
    altitudeKm,
    velocityKmS,
    timestamp: nowMs,
    trackable: Boolean(state),
  };
  return { entity, satrec: usable, pathInput };
}

// Builds records for many rows without blocking the UI: yields to the event loop every `chunk` rows.
// options: { chunk?, signal?, onProgress?(done, total), nowMs?, limit? }. Rejects with AbortError when cancelled.
export async function prepareOrbitalRecords(rows, options = {}) {
  const { chunk = 500, signal, onProgress, limit } = options;
  const source = Array.isArray(rows) ? (limit > 0 ? rows.slice(0, limit) : rows) : [];
  const records = [];
  const seen = new Set();
  for (let i = 0; i < source.length; i += chunk) {
    if (signal && signal.aborted) {
      const error = new Error('Satellite preparation aborted');
      error.name = 'AbortError';
      throw error;
    }
    const end = Math.min(i + chunk, source.length);
    const nowMs = options.nowMs || Date.now();
    for (let j = i; j < end; j += 1) {
      const rec = buildOrbitalRecord(source[j], nowMs);
      if (!rec || seen.has(String(rec.entity.id))) continue; // one marker per NORAD id
      seen.add(String(rec.entity.id));
      records.push(rec);
    }
    if (onProgress) onProgress(end, source.length);
    if (source.length > chunk) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return records;
}

/**
 * The real Orbital Tracking subject for the generic globe engine.
 * records: from prepareOrbitalRecords. options: { onSelect?(entity|null), id? }
 *
 * - getEntities(): the persistent entity array (same objects, same order, every call).
 * - tick(nowMs) every second: re-propagates each trackable satellite with SGP4 and updates its entity in place.
 *   A failed propagation keeps the previous good position (the object never vanishes or jumps to 0,0).
 * - getPath(id, nowMs): orbit path generated on demand for ONE satellite (generateOrbitPath, with its jump and
 *   near-stationary safeguards); never computed for the whole catalogue.
 * - subscribe(push): lets the owner push a replacement list; update(records) swaps the catalogue.
 */
export function createRealOrbitalSubject(records, options = {}) {
  let current = Array.isArray(records) ? records : [];
  let entities = current.map(r => r.entity);
  let byId = new Map(current.map(r => [String(r.entity.id), r]));
  const listeners = new Set();
  const stats = { propagated: 0, failed: 0, lastTickMs: 0 };

  const subject = createOrbitalTrackingSubject({
    id: options.id || 'orbital-tracking-live',
    getEntities: () => entities,
    tickMs: LIVE_TICK_MS,
    tick(nowMs) {
      const date = new Date(nowMs);
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < current.length; i += 1) {
        const rec = current[i];
        if (!rec.satrec) continue; // static (database-position) object
        const state = computeSatelliteState(rec.satrec, date);
        if (!state) {
          failed += 1;
          continue;
        }
        const e = rec.entity;
        e.lat = state.lat;
        e.lng = state.lng;
        e.altitudeKm = state.altitudeKm;
        e.velocityKmS = state.velocityKmS;
        e.timestamp = nowMs;
        ok += 1;
      }
      stats.propagated = ok;
      stats.failed = failed;
      stats.lastTickMs = nowMs;
      return entities;
    },
    getPath(id, nowMs) {
      const rec = byId.get(String(id));
      if (!rec || !rec.satrec) return null;
      const path = generateOrbitPath(rec.pathInput, new Date(nowMs));
      if (!path.length) return null;
      // generateOrbitPath returns Earth-radius units (x1.01 lift); the engine takes kilometres.
      return path.map(p => ({ lat: p.lat, lng: p.lng, altitudeKm: p.altitude * EARTH_RADIUS_KM }));
    },
    subscribe(push) {
      listeners.add(push);
      return () => listeners.delete(push);
    },
    onSelect: options.onSelect,
    describeEntity: describeRealSatellite,
  });

  // Replaces the whole catalogue (e.g. a new filter) and pushes it to every attached engine.
  subject.update = nextRecords => {
    current = Array.isArray(nextRecords) ? nextRecords : [];
    entities = current.map(r => r.entity);
    byId = new Map(current.map(r => [String(r.entity.id), r]));
    listeners.forEach(push => push(entities));
  };
  subject.getStats = () => ({ ...stats, total: current.length });
  return subject;
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
