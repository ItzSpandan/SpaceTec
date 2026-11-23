/**
 * LaunchpadLocatorAdapter - feeds the Launchpad Locator's real launch-site records to the generic
 * SpaceTecGlobeEngine through the generic subject interface.
 *
 *   records (the hub's existing `allLaunchpads` array) -> normalizeLaunchpad -> GlobeEntity
 *   createLaunchpadSubject(records, { filter, onSelect }) -> GlobeSubject
 *
 * Nothing here is satellite specific (no SGP4, no satellite.js, no TLE) and nothing launch-pad specific lives in
 * the engine. Launch sites are fixed on the ground, so the subject has no tick and no path: it only pushes a new
 * list when the filter or the records change.
 *
 * Entity shape (the engine reads id / lat / lng / altitudeKm / type; everything else is opaque metadata that the
 * UI reads back through the selection callback or getRecord()):
 *   { id, name, lat, lng, altitudeKm: 0, type: 'major' | 'minor', agency, country, status, tagline, established,
 *     isMajor, accentColor, source: <the original record> }
 *
 * Markers reuse the engine's own marker capability: the engine draws one instanced marker per render type. Both
 * types are small white round dots (the legacy globe's look); major sites are simply drawn larger.
 */
import { bakeParts, UNIT_SPH } from '../globeShared';

export const LAUNCHPAD_FILTERS = ['all', 'major', 'minor'];
export const DEFAULT_LAUNCHPAD_FILTER = 'all';

// Render types: white dots like the legacy globe; major sites are larger. (Colour comes from the baked marker, below;
// `color` here is only the legend swatch.)
export const LAUNCHPAD_TYPES = {
  major: { label: 'Major launch sites', color: '#ffffff', size: 0.013 },
  minor: { label: 'Other launch sites', color: '#ffffff', size: 0.0085 },
};

// One tiny vertex-coloured white sphere per type (the engine multiplies it by the type's size).
export const LAUNCHPAD_MODELS = {
  silhouette: typeKey =>
    bakeParts([{ geo: UNIT_SPH, scale: [1, 1, 1], pos: [0, 0, 0], color: '#ffffff' }], 1),
};

export function resolveLaunchpadType(entity) {
  return entity && entity.type === 'major' ? 'major' : 'minor';
}

// Number(null) and Number('') are 0, which would silently put a record in the Gulf of Guinea: treat as missing.
function coord(value) {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
}

function slug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts one launch-site record into a globe entity, or returns null when it has no usable position.
 * Accepts the hub's shape (`lon`, `operator`, `isMajor`) and the already-normalised shape (`lng`, `agency`, `type`).
 */
export function normalizeLaunchpad(record) {
  if (!record || typeof record !== 'object') return null;
  const lat = coord(record.lat);
  const lng = coord(record.lng !== undefined && record.lng !== null ? record.lng : record.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const name = record.name ? String(record.name) : '';
  const rawId = record.id !== undefined && record.id !== null && String(record.id) !== '' ? String(record.id) : '';
  const id = rawId || `pad-${slug(name) || 'unnamed'}-${lat.toFixed(3)}-${lng.toFixed(3)}`;
  const type = record.type || (record.isMajor ? 'major' : 'minor');
  return {
    id,
    name: name || 'LAUNCH PAD',
    lat,
    lng,
    altitudeKm: 0,
    type,
    agency: record.operator || record.agency || '',
    country: record.country || '',
    status: record.status || '',
    tagline: record.tagline || '',
    established: record.established || '',
    isMajor: Boolean(record.isMajor) || type === 'major',
    accentColor: record.accentColor || '',
    source: record,
  };
}

/**
 * Converts every record. Invalid records are skipped and reported; a repeated id gets a deterministic "~2", "~3"
 * suffix so every entity keeps a unique, stable id (the engine keys picking and selection by id).
 * Positions are never altered (two sites with identical coordinates simply overlap, as before).
 */
export function buildLaunchpadEntities(records) {
  const entities = [];
  const skipped = [];
  const seen = new Map();
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    const entity = normalizeLaunchpad(record);
    if (!entity) {
      skipped.push({ index, id: record && record.id !== undefined ? String(record.id) : null, reason: 'invalid coordinates' });
      return;
    }
    const n = (seen.get(entity.id) || 0) + 1;
    seen.set(entity.id, n);
    if (n > 1) entity.id = `${entity.id}~${n}`;
    entities.push(entity);
  });
  return { entities, skipped };
}

export function filterLaunchpads(entities, filter) {
  if (!filter || filter === 'all') return entities;
  return entities.filter(e => e.type === filter);
}

export function isValidLaunchpadFilter(filter) {
  return LAUNCHPAD_FILTERS.includes(filter);
}

function describeLaunchpad(entity) {
  const rows = [
    { label: 'Operator', value: entity.agency || '--' },
    { label: 'Country', value: entity.country || '--' },
    { label: 'Coordinates', value: `${entity.lat.toFixed(4)}°, ${entity.lng.toFixed(4)}°` },
  ];
  if (entity.status) rows.push({ label: 'Status', value: entity.status });
  if (entity.established) rows.push({ label: 'Established', value: String(entity.established) });
  return { title: entity.name, subtitle: entity.tagline || entity.country || '', rows };
}

/**
 * Builds the GlobeSubject. The returned object also has launch-pad helpers the UI uses (the engine ignores them):
 *   setFilter(f) / getFilter()  'all' | 'major' | 'minor'; pushes the new list to every attached engine
 *   update(records)             replaces the dataset (keeps the filter) and pushes
 *   getAll() / getEntity(id) / getRecord(id)   unfiltered list, one entity, or its original record
 *   stats()                     { total, shown, skipped }
 */
export function createLaunchpadSubject(records, options = {}) {
  const listeners = new Set();
  let all = [];
  let skipped = [];
  let filter = isValidLaunchpadFilter(options.filter) ? options.filter : DEFAULT_LAUNCHPAD_FILTER;
  let shown = [];
  let byId = new Map();

  const rebuild = () => {
    shown = filterLaunchpads(all, filter);
  };
  const load = next => {
    const built = buildLaunchpadEntities(next);
    all = built.entities;
    skipped = built.skipped;
    byId = new Map(all.map(e => [e.id, e]));
    rebuild();
  };
  const publish = () => listeners.forEach(push => push(shown));

  load(records);

  return {
    id: options.id || 'launchpad-locator',
    getEntities: () => shown,
    subscribe(push) {
      listeners.add(push);
      return () => listeners.delete(push);
    },
    types: LAUNCHPAD_TYPES,
    models: LAUNCHPAD_MODELS,
    resolveType: resolveLaunchpadType,
    describeEntity: describeLaunchpad,
    labels: { legend: 'Launch sites' },
    onSelect: options.onSelect,

    setFilter(next) {
      if (!isValidLaunchpadFilter(next) || next === filter) return;
      filter = next;
      rebuild();
      publish();
    },
    getFilter: () => filter,
    update(next) {
      load(next);
      publish();
    },
    getAll: () => all,
    getEntity: id => byId.get(String(id)) || null,
    getRecord(id) {
      const e = byId.get(String(id));
      return e ? e.source : null;
    },
    stats: () => ({ total: all.length, shown: shown.length, skipped: skipped.length }),
  };
}
