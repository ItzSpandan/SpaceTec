/**
 * ISSTrackerAdapter - presents the International Space Station to the generic SpaceTecGlobeEngine through the generic
 * subject interface.
 *
 *   /api/iss-tle -> issTracking.js (TLE parsing, SGP4, status, trajectory) -> createISSTrackerSubject -> engine
 *
 * The ISS is just an entity here: { id: 'iss-25544', type: 'station', lat, lng, altitudeKm, velocityKmS, timestamp }.
 * All ISS specifics (endpoint, NORAD id, TLE parsing, polling, propagation, telemetry, trajectory maths) live in
 * issTracking.js; the engine knows none of it. The subject owns NO timers: it listens to a tracker (the page's single
 * polling + propagation loop) only while an engine is attached, and the engine's own `tick` is not used, so there is
 * never a second propagation loop.
 *
 * The marker reuses the existing representative station model of the Orbital Tracking adapter (orbitalModels.js).
 */
import { ORBITAL_MODELS } from './orbitalModels';
import { ISS_ID, ISS_NAME, ISS_NORAD_ID, ISS_STATUS, TRAJECTORY_REFRESH_MS, createISSTracker } from './issTracking';
import { normalizeLongitude } from './orbitalPropagation';

export { ISS_ID };

// One render type. The 'station' model (modules, truss, arrays) is the same one Orbital Tracking draws; it is
// drawn larger than a catalogue satellite because it is the only object on this globe.
export const ISS_TYPES = {
  station: { label: 'International Space Station', color: '#ff3b30', size: 0.03 },
};

const fmt = (v, digits) => (Number.isFinite(Number(v)) && v !== null ? Number(v).toFixed(digits) : 'N/A');

export function formatTleAge(ms) {
  if (!Number.isFinite(ms) || ms === null) return 'N/A';
  const h = ms / 3600000;
  return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
}

function describeISS(entity) {
  const rows = [
    { label: 'NORAD ID', value: String(ISS_NORAD_ID) },
    { label: 'Altitude', value: `${fmt(entity.altitudeKm, 1)} km` },
    { label: 'Velocity', value: `${fmt(Number(entity.velocityKmS) * 3600, 0)} km/h` },
    { label: 'Latitude', value: `${fmt(entity.lat, 3)}°` },
    { label: 'Longitude', value: `${fmt(entity.lng, 3)}°` },
    { label: 'Status', value: entity.status || 'N/A' },
    { label: 'TLE age', value: formatTleAge(entity.tleAgeMs) },
  ];
  return { title: entity.name || ISS_NAME, subtitle: `NORAD ${ISS_NORAD_ID}`, rows };
}

/**
 * Builds the GlobeSubject for a tracker (the page's tracker, or a private one when none is given: then
 * `subject.retain()` starts and stops its loops).
 *
 * Besides the engine's subject fields it exposes: tracker, retain(), getSnapshot(), getEntity(id), isTracking().
 */
export function createISSTrackerSubject(trackerOrOptions) {
  const tracker =
    trackerOrOptions && typeof trackerOrOptions.getSnapshot === 'function' ? trackerOrOptions : createISSTracker(trackerOrOptions || {});

  const entity = { id: ISS_ID, name: ISS_NAME, type: 'station', noradId: ISS_NORAD_ID, lat: 0, lng: 0, altitudeKm: 0 };
  let entities = [];
  const listeners = new Set();
  let off = null;

  // Copies the tracker's snapshot into the (single, reused) entity. The list is empty until a valid position exists
  // and again when the data is unavailable, so the engine never shows a position the page itself would not show.
  const sync = snap => {
    const s = snap && snap.state;
    if (!s || snap.status === ISS_STATUS.UNAVAILABLE || snap.status === ISS_STATUS.ACQUIRING) {
      if (entities.length) entities = [];
      return;
    }
    entity.name = snap.name || ISS_NAME;
    entity.lat = s.lat;
    entity.lng = normalizeLongitude(s.lon);
    entity.altitudeKm = s.altitude;
    entity.velocityKmS = s.velocityKmS;
    entity.timestamp = s.date instanceof Date ? s.date.getTime() : Date.now();
    entity.status = snap.status;
    entity.tleAgeMs = snap.tleAgeMs;
    if (!entities.length) entities = [entity];
  };
  sync(tracker.getSnapshot());

  const subjectHasEntity = () => {
    sync(tracker.getSnapshot());
    return entities.length > 0;
  };

  const publish = snap => {
    sync(snap);
    listeners.forEach(push => push(entities));
  };

  return {
    id: 'iss-tracker',
    tracker,
    getEntities: () => {
      sync(tracker.getSnapshot()); // current even when no engine was listening
      return entities;
    },
    subscribe(push) {
      listeners.add(push);
      if (!off) off = tracker.subscribe(publish); // only listen to the tracker while an engine is attached
      return () => {
        listeners.delete(push);
        if (!listeners.size && off) {
          off();
          off = null;
        }
      };
    },
    // The engine asks for the path this often (default 250 ms). The trajectory only changes every 30 s (cached by the
    // tracker) and is returned as the same array in between, so the engine neither recomputes nor rebuilds anything.
    pathRefreshMs: TRAJECTORY_REFRESH_MS,
    getPath(id) {
      if (String(id) !== ISS_ID) return null;
      return tracker.getTrajectory(Date.now());
    },
    types: ISS_TYPES,
    models: ORBITAL_MODELS,
    resolveType: () => 'station',
    describeEntity: describeISS,
    labels: { legend: 'International Space Station', selected: 'ISS', path: 'Orbit path' },

    retain: () => tracker.retain(),
    getSnapshot: () => tracker.getSnapshot(),
    getEntity: id => (String(id) === ISS_ID && subjectHasEntity() ? entity : null),
    isTracking: () => subjectHasEntity(),
  };
}
