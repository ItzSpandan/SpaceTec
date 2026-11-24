/**
 * Pure helpers for OrbitalGlobeV2.js (no React, no three.js, no DOM), kept separate so they can be unit-tested.
 */
import { SATELLITE_TYPE_LABELS, normalizeSatelliteType } from './adapters/OrbitalTrackingAdapter';

// The production globe's satellite filter chips, mapped onto the adapter's satellite_type filters (Step 4A).
// NOTE: the old globe matched satellite NAMES; these use the database satellite_type, so counts can differ.
export const SAT_FILTERS = [
  { key: 'stations', label: 'SPACE STATIONS', engine: 'stations' },
  { key: 'broadband', label: 'BROADBAND', engine: 'starlink' },
  { key: 'weather', label: 'WEATHER', engine: 'weather' },
  { key: 'active', label: 'ALL ACTIVE', engine: 'all' },
];

export const DEFAULT_SAT_FILTER = 'stations';
export const DEFAULT_SAT_LIMIT = 1000;

export function engineFilterFor(key) {
  const f = SAT_FILTERS.find(x => x.key === key);
  return f ? f.engine : 'all';
}

// The production count slider only applied to ALL ACTIVE; the other filters show every matching object.
export function limitFor(key, satLimit) {
  return key === 'active' && Number(satLimit) > 0 ? Number(satLimit) : undefined;
}

// Which implementation renders the Orbital Tracking globe ('legacy' default, 'engine' opt-in): see globeImplementation.js.
export { resolveGlobeImplementation } from './globeImplementation';

export function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function fmt(value, digits, suffix = '') {
  const n = numOrNull(value);
  return n === null ? 'N/A' : `${n.toFixed(digits)}${suffix}`;
}

// Rows of the satellite details panel (same fields and formats as the production panel's SatelliteInfo).
export function buildPanelRows(entity, telemetry) {
  const t = telemetry || {};
  const orbit =
    numOrNull(t.apogeeKm) !== null && numOrNull(t.perigeeKm) !== null
      ? `${t.perigeeKm.toFixed(0)} × ${t.apogeeKm.toFixed(0)} km`
      : 'N/A';
  const type = normalizeSatelliteType(entity.satellite_type);
  const rows = [
    { label: 'Object name', value: entity.name || 'N/A', span: true },
    { label: 'NORAD ID', value: entity.id ?? 'N/A' },
    { label: 'Organization', value: entity.organization || 'N/A' },
    { label: 'Mission type', value: type ? SATELLITE_TYPE_LABELS[type] : 'Unclassified' },
    { label: 'Altitude (live)', value: fmt(entity.altitudeKm, 2, ' km') },
    { label: 'Velocity (live)', value: fmt(entity.velocityKmS, 3, ' km/s') },
    { label: 'Latitude (live)', value: fmt(entity.lat, 4, '°') },
    { label: 'Longitude (live)', value: fmt(entity.lng, 4, '°') },
    { label: 'Inclination', value: fmt(t.inclination, 3, '°') },
    { label: 'Orbital period', value: fmt(t.periodMin, 2, ' min') },
    { label: 'Eccentricity', value: fmt(t.eccentricity, 6) },
    { label: 'Perigee × apogee', value: orbit },
  ];
  if (t.epoch) rows.push({ label: 'Element epoch', value: t.epoch, span: true });
  rows.push({ label: 'Solver', value: entity.trackable ? 'SGP4 PROPAGATOR' : 'STATIC DATABASE' });
  const ts = numOrNull(entity.timestamp);
  rows.push({ label: 'UTC tick', value: ts === null ? 'N/A' : `${new Date(ts).toISOString().slice(11, 19)} UTC` });
  return rows;
}

// Hover tooltip lines (same fields as the production globe's point label).
export function buildHoverLines(entity) {
  return [
    entity.name || 'UNKNOWN OBJECT',
    `NORAD: ${entity.id ?? 'N/A'}`,
    `LAT: ${numOrNull(entity.lat) === null ? 'N/A' : `${Number(entity.lat).toFixed(4)}°`}`,
    `LNG: ${numOrNull(entity.lng) === null ? 'N/A' : `${Number(entity.lng).toFixed(4)}°`}`,
    `ALT: ${numOrNull(entity.altitudeKm) === null ? 'N/A' : `${Number(entity.altitudeKm).toFixed(1)} km`}`,
    `VEL: ${numOrNull(entity.velocityKmS) === null ? 'N/A' : `${Number(entity.velocityKmS).toFixed(2)} km/s`}`,
  ];
}

// Keeps the tooltip inside the stage: returns { left, top } in pixels.
export function placeTooltip(pos, stage, box = { w: 190, h: 120 }) {
  const gap = 14;
  let left = pos.x + gap;
  let top = pos.y + gap;
  if (left + box.w > stage.w) left = Math.max(0, pos.x - gap - box.w);
  if (top + box.h > stage.h) top = Math.max(0, pos.y - gap - box.h);
  return { left, top };
}

// ----- expanded console: Network overview and satellite list helpers -----
export function typeLabelFor(entity) {
  const t = normalizeSatelliteType(entity && entity.satellite_type);
  return t ? SATELLITE_TYPE_LABELS[t] : 'Unclassified';
}

// Counts for the Network overview. `database` = { total, active, inactive } from the downloaded rows (or null while
// loading); `visible` = objects currently drawn (filter + limit). Database figures and visible figures stay separate.
export function buildNetworkOverview(database, visible) {
  const n = v => (Number.isFinite(Number(v)) ? Number(v) : null);
  return {
    visible: n(visible),
    total: database ? n(database.total) : null,
    active: database ? n(database.active) : null,
    inactive: database ? n(database.inactive) : null,
  };
}

export function formatCount(v) {
  return v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US');
}

// Search over the already-loaded visible objects (name, NORAD id, organisation). Returns the first `max` matches
// and the total number of matches, so a 16,000-object list never renders 16,000 rows.
export function searchEntities(entities, query, max = 150) {
  const list = Array.isArray(entities) ? entities : [];
  const q = String(query || '').trim().toLowerCase();
  const hits = q
    ? list.filter(e => String(e.name || '').toLowerCase().includes(q) || String(e.id).toLowerCase().includes(q) || String(e.organization || '').toLowerCase().includes(q))
    : list;
  return { shown: hits.slice(0, max), matches: hits.length };
}
