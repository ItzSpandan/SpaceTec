/**
 * ISS tracking core: everything ISS specific that must NOT live in the globe engine.
 *
 *   /api/iss-tle (unchanged)  ->  parseTlePayload  ->  satrec  ->  calculateState (SGP4, 1 s)  ->  snapshot
 *
 * No React, no three.js and no DOM in here, so the ISS page (including its 2D map and next-pass calculator) can use it
 * without loading the globe, and it can be unit tested with injected timers / fetch / clock.
 *
 * One tracker = exactly ONE polling loop (a single timeout that re-arms itself: 2 hours after a good refresh, a short
 * backoff after a failed one) and ONE propagation loop (a 1 s interval). Both run only while somebody holds a
 * `retain()` handle and are cancelled (timers cleared, in-flight request aborted, late responses ignored) when the
 * last handle is released.
 *
 * Status model (the page shows these as the status dot / header text):
 *   ACQUIRING    no orbital elements yet, first download in progress
 *   LIVE         valid elements, last refresh succeeded and is recent
 *   DELAYED      the last refresh failed, or the last good refresh is older than STALE_AFTER_MS, or a propagation step
 *                failed. The last valid state is kept and propagation continues from the last good elements.
 *   UNAVAILABLE  no usable elements (every attempt failed so far) or the elements are too old to propagate
 */
import { propagate, gstime, eciToGeodetic, degreesLat, degreesLong, twoline2satrec } from 'satellite.js';
import { normalizeLongitude } from './orbitalPropagation';

export const ISS_NORAD_ID = 25544;
export const ISS_ID = 'iss-25544';
export const ISS_NAME = 'ISS (ZARYA)';
export const ISS_TLE_ENDPOINT = '/api/iss-tle';

export const TLE_REFRESH_MS = 2 * 60 * 60 * 1000; // unchanged from the existing page
export const PROPAGATE_MS = 1000; // unchanged from the existing page
export const RETRY_BASE_MS = 30 * 1000; // after a failed refresh: 30 s, 60 s, 2 min ... capped
export const RETRY_MAX_MS = 10 * 60 * 1000;
export const STALE_AFTER_MS = 2 * TLE_REFRESH_MS + 5 * 60 * 1000; // two refreshes missed in a row
export const MAX_ELEMENT_AGE_MS = 14 * 24 * 60 * 60 * 1000; // SGP4 on older elements is meaningless
export const FETCH_TIMEOUT_MS = 15 * 1000;

export const ORBIT_MINUTES = 96; // +-48 minutes around "now" (unchanged)
export const SAMPLE_SECONDS = 30; // unchanged

export const ISS_STATUS = Object.freeze({
  ACQUIRING: 'ACQUIRING',
  LIVE: 'LIVE',
  DELAYED: 'DELAYED',
  UNAVAILABLE: 'UNAVAILABLE',
});

// ---------------------------------------------------------------------------
// Pure helpers (moved here from the page unchanged in behaviour)
// ---------------------------------------------------------------------------

/** Geodetic state of a satrec at `date`, or null when SGP4 fails. velocity is km/h (as the page shows it). */
export function calculateState(satrec, date) {
  let pv;
  try {
    pv = propagate(satrec, date);
  } catch (error) {
    return null;
  }
  if (!pv || !pv.position) return null;

  const gmst = gstime(date);
  const geo = eciToGeodetic(pv.position, gmst);
  const lat = degreesLat(geo.latitude);
  const lon = degreesLong(geo.longitude);
  const altitude = geo.height;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(altitude)) return null;

  let velocity = null;
  let velocityKmS = null;
  if (pv.velocity) {
    velocityKmS = Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2);
    velocity = velocityKmS * 3600;
  }
  return { lat, lon, altitude, velocity, velocityKmS, date };
}

/**
 * Ground track for the legacy globe and the 2D map: [lat, lon, altKm] triples, with a [null, null, null] separator
 * wherever the track crosses the antimeridian (a longitude jump above 180 degrees), so no line is drawn across the map.
 * Same output as the original page helper.
 */
export function calculateOrbit(satrec, centerDate) {
  const points = [];
  const start = new Date(centerDate.getTime() - (ORBIT_MINUTES / 2) * 60000);
  for (let i = 0; i <= (ORBIT_MINUTES * 60) / SAMPLE_SECONDS; i++) {
    const date = new Date(start.getTime() + i * SAMPLE_SECONDS * 1000);
    const state = calculateState(satrec, date);
    if (!state) continue;
    const previous = points[points.length - 1];
    if (previous && Math.abs(state.lon - previous[1]) > 180) points.push([null, null, null]);
    points.push([state.lat, state.lon, Math.max(0.1, state.altitude)]);
  }
  return points;
}

/**
 * Trajectory for the in-house globe: { lat, lng, altitudeKm } points, +-48 min at 30 s, centred on `centerMs`.
 * The engine draws it as ONE line on the sphere, where longitude is periodic, so the antimeridian needs no break
 * here (a break would only cut the line). Longitudes are normalised to [-180, 180]; consecutive points are ~230 km apart.
 */
export function buildTrajectory(satrec, centerMs) {
  const out = [];
  const start = centerMs - (ORBIT_MINUTES / 2) * 60000;
  const n = (ORBIT_MINUTES * 60) / SAMPLE_SECONDS;
  for (let i = 0; i <= n; i += 1) {
    const state = calculateState(satrec, new Date(start + i * SAMPLE_SECONDS * 1000));
    if (!state) continue;
    out.push({ lat: state.lat, lng: normalizeLongitude(state.lon), altitudeKm: Math.max(0.1, state.altitude) });
  }
  return out;
}

/** Splits a [lat, lon, alt] track (with null separators) into polyline segments of { lat, lng, altitude(km) }. */
export function splitTrack(points) {
  const segments = [];
  let current = [];
  (points || []).forEach(p => {
    if (p[0] == null) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      current.push({ lat: p[0], lng: p[1], altitude: p[2] });
    }
  });
  if (current.length > 1) segments.push(current);
  return segments;
}

/** Epoch of a satrec in ms (UTC), or null. */
export function satrecEpochMs(satrec) {
  if (!satrec) return null;
  const yy = Number(satrec.epochyr);
  const days = Number(satrec.epochdays);
  if (!Number.isFinite(yy) || !Number.isFinite(days)) return null;
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  return Date.UTC(year, 0, 1) + (days - 1) * 86400000;
}

/**
 * Validates the /api/iss-tle payload ({ name, line1, line2, noradId, fetchedAt }) and builds the satrec.
 * Throws a descriptive Error for anything unusable. Returns { satrec, name, epochMs, fetchedAtMs }.
 */
export function parseTlePayload(data, nowMs = Date.now()) {
  if (!data || typeof data !== 'object') throw new Error('ISS orbital feed returned no data');
  const { line1, line2 } = data;
  if (typeof line1 !== 'string' || typeof line2 !== 'string' || !line1.startsWith('1 ') || !line2.startsWith('2 ')) {
    throw new Error('ISS orbital feed returned malformed TLE lines');
  }
  const satrec = twoline2satrec(line1, line2);
  if (!satrec || satrec.error) throw new Error('ISS TLE could not be parsed');
  if (Number(satrec.satnum) !== ISS_NORAD_ID) throw new Error('ISS orbital feed returned a different object');
  const epochMs = satrecEpochMs(satrec);
  if (epochMs === null) throw new Error('ISS TLE has no epoch');
  if (!calculateState(satrec, new Date(nowMs))) throw new Error('ISS TLE could not be propagated');
  const fetchedAtMs = data.fetchedAt ? Date.parse(data.fetchedAt) : NaN;
  return {
    satrec,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : ISS_NAME,
    epochMs,
    fetchedAtMs: Number.isFinite(fetchedAtMs) ? fetchedAtMs : null,
  };
}

export function retryDelayMs(failures) {
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, failures - 1));
}

// ---------------------------------------------------------------------------
// The tracker
// ---------------------------------------------------------------------------

/**
 * options (all optional, for tests): fetch, now(), setTimeout, clearTimeout, setInterval, clearInterval,
 * AbortController, endpoint.
 */
export function createISSTracker(options = {}) {
  const fetchImpl = options.fetch || (typeof fetch === 'function' ? (...a) => fetch(...a) : null);
  const now = options.now || (() => Date.now());
  const setT = options.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const clearT = options.clearTimeout || (h => clearTimeout(h));
  const setI = options.setInterval || ((fn, ms) => setInterval(fn, ms));
  const clearI = options.clearInterval || (h => clearInterval(h));
  const Abort = options.AbortController || (typeof AbortController !== 'undefined' ? AbortController : null);
  const endpoint = options.endpoint || ISS_TLE_ENDPOINT;

  const listeners = new Set();
  let retained = 0;
  let generation = 0; // bumped on every start/stop: late responses of an older run are ignored
  let pollTimer = null;
  let tickTimer = null;
  let controller = null;
  let fetchTimer = null; // aborts a request that hangs
  let inflight = false;
  let failures = 0; // consecutive failed refreshes
  let satrec = null;
  let name = ISS_NAME;
  let epochMs = null;
  let lastRefreshMs = null; // client time of the last good refresh
  let lastError = null;
  let propagationFailed = false;
  let state = null; // last valid { lat, lon, altitude, velocity, velocityKmS, date }
  let lastUpdate = null;
  let refreshes = 0;
  let requests = 0;
  let snapshot = null;

  const computeStatus = nowMs => {
    if (!satrec) return failures > 0 ? ISS_STATUS.UNAVAILABLE : ISS_STATUS.ACQUIRING;
    if (epochMs !== null && nowMs - epochMs > MAX_ELEMENT_AGE_MS) return ISS_STATUS.UNAVAILABLE;
    if (failures > 0 || propagationFailed) return ISS_STATUS.DELAYED;
    if (lastRefreshMs !== null && nowMs - lastRefreshMs > STALE_AFTER_MS) return ISS_STATUS.DELAYED;
    return ISS_STATUS.LIVE;
  };

  const build = () => {
    const nowMs = now();
    const status = computeStatus(nowMs);
    snapshot = {
      status,
      state: status === ISS_STATUS.UNAVAILABLE ? null : state,
      lastUpdate,
      satrec,
      name,
      tleEpochMs: epochMs,
      tleAgeMs: epochMs === null ? null : Math.max(0, nowMs - epochMs),
      lastRefreshMs,
      error: lastError,
      failures,
      stale: status === ISS_STATUS.DELAYED || status === ISS_STATUS.UNAVAILABLE,
    };
    return snapshot;
  };

  const emit = () => {
    build();
    listeners.forEach(fn => {
      try {
        fn(snapshot);
      } catch (error) {
        console.error('[ISSTracker] listener failed', error);
      }
    });
  };

  const propagateNow = () => {
    if (!satrec) return;
    const nowMs = now();
    if (epochMs !== null && nowMs - epochMs > MAX_ELEMENT_AGE_MS) {
      emit();
      return;
    }
    const next = calculateState(satrec, new Date(nowMs));
    if (!next) {
      propagationFailed = true; // keep the last valid state
    } else {
      propagationFailed = false;
      state = next;
      lastUpdate = new Date(nowMs);
    }
    emit();
  };

  const schedulePoll = delayMs => {
    if (pollTimer !== null) clearT(pollTimer);
    pollTimer = setT(() => {
      pollTimer = null;
      refresh();
    }, Math.max(0, delayMs));
  };

  async function refresh() {
    if (inflight || retained === 0 || !fetchImpl) return;
    const gen = generation;
    inflight = true;
    requests += 1;
    controller = Abort ? new Abort() : null;
    const ctl = controller;
    if (ctl) fetchTimer = setT(() => ctl.abort(), FETCH_TIMEOUT_MS);
    let ok = false;
    try {
      const res = await fetchImpl(endpoint, { cache: 'no-store', signal: ctl ? ctl.signal : undefined });
      if (!res || !res.ok) throw new Error('ISS orbital feed unavailable');
      const data = await res.json();
      if (gen !== generation) return; // stopped (or restarted) while the request was in flight
      const parsed = parseTlePayload(data, now());
      satrec = parsed.satrec;
      name = parsed.name;
      epochMs = parsed.epochMs;
      lastRefreshMs = now();
      lastError = null;
      failures = 0;
      refreshes += 1;
      ok = true;
    } catch (error) {
      if (gen !== generation) return;
      failures += 1;
      lastError = error && error.message ? error.message : 'ISS orbital feed unavailable';
    } finally {
      if (gen === generation) {
        if (fetchTimer !== null) clearT(fetchTimer);
        fetchTimer = null;
        inflight = false;
        controller = null;
      }
    }
    if (gen !== generation) return;
    if (ok) propagateNow(); // first state immediately, not a second later
    else emit();
    if (retained > 0) schedulePoll(ok ? TLE_REFRESH_MS : retryDelayMs(failures));
  }

  const start = () => {
    generation += 1;
    inflight = false;
    // Elements still fresh from an earlier run (e.g. the page toggled away and back): do not hit the network again.
    const age = lastRefreshMs === null ? null : now() - lastRefreshMs;
    if (satrec && failures === 0 && age !== null && age < TLE_REFRESH_MS) schedulePoll(TLE_REFRESH_MS - age);
    else refresh();
    tickTimer = setI(propagateNow, PROPAGATE_MS);
    if (satrec) propagateNow();
    else emit();
  };

  const stop = () => {
    generation += 1; // invalidates any in-flight response
    if (pollTimer !== null) clearT(pollTimer);
    if (tickTimer !== null) clearI(tickTimer);
    if (fetchTimer !== null) clearT(fetchTimer);
    fetchTimer = null;
    pollTimer = null;
    tickTimer = null;
    if (controller) {
      try {
        controller.abort();
      } catch (error) {
        /* ignore */
      }
    }
    controller = null;
    inflight = false;
  };

  build();

  return {
    /** Starts the loops (first holder) and returns a release function (idempotent). The last release stops them. */
    retain() {
      retained += 1;
      if (retained === 1) start();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        retained -= 1;
        if (retained === 0) stop();
      };
    },
    getSnapshot: () => snapshot,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Trajectory (engine format) around nowMs from the last valid elements, or null. */
    getTrajectory(nowMs = now()) {
      if (!satrec || (snapshot && snapshot.status === ISS_STATUS.UNAVAILABLE)) return null;
      const points = buildTrajectory(satrec, nowMs);
      return points.length > 1 ? points : null;
    },
    /** Diagnostics for tests / debugging. */
    getStats: () => ({ retained, requests, refreshes, failures, polling: pollTimer !== null || inflight, ticking: tickTimer !== null }),
  };
}
