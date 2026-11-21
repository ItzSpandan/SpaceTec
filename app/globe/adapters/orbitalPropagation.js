/**
 * SGP4 / OMM / TLE processing for the Orbital Tracking adapter.
 *
 * EXTRACTED UNCHANGED from app/OrbitalGlobe.js (getTleLines, buildOmmFromRow, buildSatrec, hasValidTLE,
 * getOrbitalPeriodMinutes, generateOrbitPath, formatDatabaseSatellite, normalizeLongitude and helpers). The only
 * structural change: the body of propagateSatellite now lives in computeSatelliteState so the live updater can
 * reuse the same maths without allocating a new object per satellite per second.
 * OrbitalGlobe.js itself is not modified and keeps its own copy until the production page switches over.
 *
 * Pure module: no React, no Supabase, no Three.js.
 */
import * as satellite from 'satellite.js';

const EARTH_GM = 398600.4418;
export const EARTH_RADIUS_KM = 6371;
const ORBIT_SAMPLE_MINUTES = 2;
const MAX_ORBIT_POINTS = 720;

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function normalizeLongitude(lng) {
  let val = Number(lng);
  if (!Number.isFinite(val)) return 0;
  while (val > 180) val -= 360;
  while (val < -180) val += 360;
  return val;
}

export function safeNumber(val, fallback = null) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function estimateOrbitalVelocity(altKm) {
  const alt = Math.max(150, Number(altKm) || 400);
  return Math.sqrt(EARTH_GM / (EARTH_RADIUS_KM + alt));
}

export function getTleLines(row) {
  if (!row) return { line1: null, line2: null };

  const rawTle = row.tle ?? row.raw_tle ?? row.tle_data ?? row.tle_raw ?? null;
  if (typeof rawTle === 'string') {
    const lines = rawTle.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const l1 = lines.find(l => l.startsWith('1 '));
    const l2 = lines.find(l => l.startsWith('2 '));
    if (l1 && l2) return { line1: l1, line2: l2 };
    if (lines.length === 2) return { line1: lines[0], line2: lines[1] };
    if (lines.length >= 3) return { line1: lines[1], line2: lines[2] };
  }

  const line1 = row?.tle_line1 ?? row?.tle1 ?? row?.line1 ?? row?.tleLine1 ?? row?.tle_1 ?? null;
  const line2 = row?.tle_line2 ?? row?.tle2 ?? row?.line2 ?? row?.tleLine2 ?? row?.tle_2 ?? null;

  return {
    line1: typeof line1 === 'string' ? line1.trim() : null,
    line2: typeof line2 === 'string' ? line2.trim() : null,
  };
}

// Rebuild an OMM object from either the stored `omm` blob or the
// flat columns sync-satellites.js writes (eccentricity, mean_motion, etc).
export function buildOmmFromRow(row) {
  if (row?.omm && typeof row.omm === 'object') return row.omm;

  const hasCore =
    row?.mean_motion != null &&
    row?.eccentricity != null &&
    row?.inclination != null &&
    row?.raan != null && // Number(null) is 0: a missing element would silently give a wrong orbit
    row?.arg_perigee != null &&
    row?.mean_anomaly != null &&
    row?.epoch;

  if (!hasCore) return null;

  return {
    OBJECT_NAME: row.name,
    OBJECT_ID: row.object_id,
    EPOCH: row.epoch,
    MEAN_MOTION: Number(row.mean_motion),
    ECCENTRICITY: Number(row.eccentricity),
    INCLINATION: Number(row.inclination),
    RA_OF_ASC_NODE: Number(row.raan),
    ARG_OF_PERICENTER: Number(row.arg_perigee),
    MEAN_ANOMALY: Number(row.mean_anomaly),
    EPHEMERIS_TYPE: Number(row.ephemeris_type ?? 0),
    CLASSIFICATION_TYPE: row.classification_type || 'U',
    NORAD_CAT_ID: Number(row.id ?? row.norad_id),
    ELEMENT_SET_NO: Number(row.element_set_no ?? 999),
    REV_AT_EPOCH: Number(row.rev_at_epoch ?? 0),
    BSTAR: Number(row.bstar ?? 0),
    MEAN_MOTION_DOT: Number(row.mean_motion_dot ?? 0),
    MEAN_MOTION_DDOT: Number(row.mean_motion_ddot ?? 0),
  };
}

export function buildSatrec(sat) {
  // Prefer legacy TLE line strings if some rows still have them.
  const { line1, line2 } = getTleLines(sat);
  if (line1 && line2) {
    try {
      const satrec = satellite.twoline2satrec(line1, line2);
      return satrec && satrec.error === 0 ? satrec : (satrec || null);
    } catch (error) {
      return null;
    }
  }

  // Otherwise reconstruct from OMM (what sync-satellites.js now writes).
  const omm = buildOmmFromRow(sat);
  if (!omm) return null;

  try {
    const satrec = satellite.json2satrec(omm);
    return satrec && satrec.error === 0 ? satrec : (satrec || null);
  } catch (error) {
    return null;
  }
}

export function hasValidTLE(sat) {
  return Boolean(buildSatrec(sat));
}

// True NORAD SGP4 propagation: shared core. Returns the rounded geodetic state, or null when the
// propagation fails or produces a non-finite result. Used by propagateSatellite (legacy shape) and by
// the live updater, so the maths exists exactly once.
export function computeSatelliteState(satrec, date) {
  if (!satrec) return null;

  try {
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position || !posVel.velocity) return null;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(posVel.position, gmst);

    const lat = satellite.degreesLat(geodetic.latitude);
    const lng = satellite.degreesLong(geodetic.longitude);
    const altitudeKm = Number(geodetic.height);

    const velVector = posVel.velocity;
    const velocityKmS = Math.sqrt(
      velVector.x * velVector.x +
      velVector.y * velVector.y +
      velVector.z * velVector.z
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(altitudeKm)) {
      return null;
    }

    return {
      lat: Number(lat.toFixed(5)),
      lng: Number(normalizeLongitude(lng).toFixed(5)),
      altitudeKm: Number(altitudeKm.toFixed(2)),
      velocityKmS: Number(velocityKmS.toFixed(3)),
    };
  } catch (error) {
    return null;
  }
}

export function propagateSatellite(sat, date = new Date()) {
  if (!sat?.satrec) return null;

  const state = computeSatelliteState(sat.satrec, date);
  if (!state) return null;

  return {
    ...sat,
    lat: state.lat,
    lng: state.lng,
    altitudeKm: state.altitudeKm,
    altitude: Math.max(0.001, state.altitudeKm / EARTH_RADIUS_KM),
    velocityKmS: state.velocityKmS,
    velocity: state.velocityKmS,
    telemetryTime: date.toISOString(),
  };
}

export function getOrbitalPeriodMinutes(sat) {
  const meanMotion = safeNumber(sat?.mean_motion, null);
  if (meanMotion && meanMotion > 0) return 1440 / meanMotion;

  if (sat?.satrec?.no) {
    const rpm = sat.satrec.no / (2 * Math.PI);
    if (Number.isFinite(rpm) && rpm > 0) return 1 / rpm;
  }

  return 92;
}

export function generateOrbitPath(sat, centerDate = new Date()) {
  if (!sat?.satrec) return [];

  const periodMinutes = clamp(getOrbitalPeriodMinutes(sat), 20, 1440);
  const halfPeriod = periodMinutes / 2;
  const stepMinutes = Math.max(ORBIT_SAMPLE_MINUTES, periodMinutes / MAX_ORBIT_POINTS);
  const stepSeconds = stepMinutes * 60;

  const raw = [];
  for (let offset = -halfPeriod; offset <= halfPeriod; offset += stepMinutes) {
    const sampleDate = new Date(centerDate.getTime() + offset * 60 * 1000);
    const propagated = propagateSatellite(sat, sampleDate);
    if (!propagated) continue;
    raw.push(propagated);
  }

  if (raw.length === 0) return [];

  // Approximate 3D position (km) for each sample, used only to sanity-check
  // consecutive points — not to alter any actual propagated data.
  const toKmVector = p => {
    const latRad = (p.lat * Math.PI) / 180;
    const lngRad = (p.lng * Math.PI) / 180;
    const r = EARTH_RADIUS_KM + (Number(p.altitudeKm) || 0);
    return [
      r * Math.cos(latRad) * Math.cos(lngRad),
      r * Math.cos(latRad) * Math.sin(lngRad),
      r * Math.sin(latRad),
    ];
  };

  // Occasional bad SGP4/SDP4 samples (rare numerical edge cases, mostly on
  // long-period/high-altitude orbits) can land far from their neighbors and
  // otherwise draw as one wild line jumping across the whole path. A real
  // satellite can't move further between two samples than its own reported
  // speed allows (generous margin for curvature), so drop any sample that
  // implies an implausible jump from the last good one.
  const kept = [raw[0]];
  for (let i = 1; i < raw.length; i += 1) {
    const prev = kept[kept.length - 1];
    const curr = raw[i];
    const [px, py, pz] = toKmVector(prev);
    const [cx, cy, cz] = toKmVector(curr);
    const jumpKm = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2 + (cz - pz) ** 2);
    const maxPlausibleKm = Math.max(500, (Number(curr.velocityKmS) || 8) * stepSeconds * 4);
    if (jumpKm > maxPlausibleKm) continue;
    kept.push(curr);
  }

  // A ground track this tight (e.g. geostationary/near-geostationary orbits,
  // whose ground track is genuinely almost a single point) doesn't read as a
  // meaningful path on screen — skip drawing it rather than show a confusing
  // tangle of dashes collapsed onto the satellite marker.
  if (kept.length > 2) {
    let sumCos = 0;
    let sumSin = 0;
    let minLat = Infinity;
    let maxLat = -Infinity;
    kept.forEach(p => {
      const lngRad = (p.lng * Math.PI) / 180;
      sumCos += Math.cos(lngRad);
      sumSin += Math.sin(lngRad);
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    });
    const resultant = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / kept.length;
    const latSpread = maxLat - minLat;
    if (resultant > 0.9995 && latSpread < 1.5) {
      return [];
    }
  }

  return kept.map(p => ({
    lat: p.lat,
    lng: p.lng,
    altitude: Math.max(0.003, p.altitude * 1.01),
  }));
}

export function formatDatabaseSatellite(row) {
  const { line1, line2 } = getTleLines(row);
  const satrec = buildSatrec(row);

  const rawAlt = safeNumber(row.altitude, 500);
  const rawVel = safeNumber(row.velocity, null);
  const altKm = rawAlt > 0 ? rawAlt : 500;
  const fallbackVel = rawVel && rawVel > 0 ? rawVel : estimateOrbitalVelocity(altKm);

  const base = {
    ...row,
    tle_line1: line1,
    tle_line2: line2,
    id: row.id ?? row.norad_id,
    name: row.name || 'UNKNOWN OBJECT',
    organization: row.organization || 'UNKNOWN',
    satrec,
    databaseLat: safeNumber(row.lat, null),
    databaseLng: safeNumber(row.lng, null),
    databaseAltitude: altKm,
    databaseVelocity: fallbackVel,
    altitudeKm: altKm,
    velocityKmS: fallbackVel,
    velocity: fallbackVel,
    trackable: Boolean(satrec),
  };

  if (satrec) {
    const current = propagateSatellite(base, new Date());
    if (current) return current;
  }

  return {
    ...base,
    lat: safeNumber(row.lat, 0),
    lng: normalizeLongitude(safeNumber(row.lng, 0)),
    altitudeKm: altKm,
    altitude: Math.max(0.001, altKm / EARTH_RADIUS_KM),
    velocityKmS: fallbackVel,
    velocity: fallbackVel,
    telemetryTime: row.updated_at || null,
  };
    }
