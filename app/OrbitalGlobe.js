'use client';
import { Component, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';
import * as THREE from 'three';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------------------------------------------------------------------------
// RENDER LAYER ONLY. Nothing below this header touches the SGP4 / TLE engine
// (everything from `globalLaunchPads` to `normalizeExternalPad` is unchanged).
//
// react-globe.gl is loaded with a plain dynamic import() instead of
// next/dynamic so that `ref` reaches the real globe (next/dynamic's wrapper is
// not guaranteed to forward refs, which silently disabled pointOfView, controls
// and renderer access).
// ---------------------------------------------------------------------------
let globeModulePromise = null;

function useReactGlobe() {
  const [GlobeComponent, setGlobeComponent] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!globeModulePromise) globeModulePromise = import('react-globe.gl');
    globeModulePromise
      .then(mod => {
        if (alive) setGlobeComponent(() => mod.default || mod);
      })
      .catch(error => {
        console.error('[OrbitalGlobe] failed to load react-globe.gl', error);
        globeModulePromise = null;
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { GlobeComponent, failed };
}

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

// react-globe.gl sizes its canvas to the WINDOW unless width/height are given,
// so the globe must be told the real size of its container.
function useElementSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      setSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

// Optional diagnostics: add ?orbitDebug=nobeams,nopaths,norings,nopoints,sats:200
// to the URL to switch individual render layers off / cap the rendered marker
// count. Display-only: never alters propagation or data.
function readDiagFlags() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = new URLSearchParams(window.location.search).get('orbitDebug');
    if (!raw) return {};
    const flags = {};
    raw.split(',').forEach(part => {
      const [key, value] = part.split(':');
      if (key) flags[key.trim()] = value === undefined ? true : value.trim();
    });
    return flags;
  } catch (error) {
    return {};
  }
}

class GlobeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[OrbitalGlobe] globe render error', error);
    if (this.props.onError) this.props.onError(error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="og-globe-fallback">
          <span>3D ENGINE ERROR</span>
          <button className="og-btn" onClick={this.props.onRetry}>RETRY</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Altitude "beam" dots: one batched THREE.Points object -----------------
// Same visual and same maths as before (dots strictly between the surface and
// the marker). Positions are written IN PLACE into one buffer; the object is
// created once, not rebuilt every second, and a failure here can never take
// the Earth down with it.
const BEAM_DOTS_PER_SAT = 5;
const GLOBE_RADIUS_UNITS = 100; // three-globe's fixed globe radius
const BEAM_LAYER_DATA = [{ id: 'satellite-beams' }];
const NO_LAYER_DATA = [];
const NO_PATHS = [];
const NO_RINGS = [];
let sharedDotTexture = null;

function getDotTexture() {
  if (sharedDotTexture) return sharedDotTexture;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  sharedDotTexture = new THREE.CanvasTexture(canvas);
  return sharedDotTexture;
}

function createBeamObject() {
  const group = new THREE.Group();
  const material = new THREE.PointsMaterial({
    map: getDotTexture(),
    color: 0xffffff,
    size: 3,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const points = new THREE.Points(new THREE.BufferGeometry(), material);
  points.frustumCulled = false;
  group.add(points);
  return group;
}

function writeBeamPositions(group, sats) {
  const points = group?.children?.[0];
  if (!points) return;

  const list = sats || [];
  const needed = list.length * BEAM_DOTS_PER_SAT * 3;
  let attr = points.geometry.getAttribute('position');

  if (!attr || attr.array.length < needed) {
    const capacity = Math.ceil((Math.max(needed, 3000) * 1.25) / 3) * 3;
    const oldGeometry = points.geometry;
    const geometry = new THREE.BufferGeometry();
    attr = new THREE.BufferAttribute(new Float32Array(capacity), 3);
    attr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', attr);
    points.geometry = geometry;
    oldGeometry.dispose();
  }

  const arr = attr.array;
  let i = 0;
  for (let s = 0; s < list.length; s += 1) {
    const sat = list[s];
    const lat = Number(sat.lat);
    const lng = Number(sat.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const altitude = Math.max(0.002, Number(sat.displayAltitude) || 0.002);
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);
    const sinLng = Math.sin(lngRad);
    const cosLng = Math.cos(lngRad);
    for (let k = 1; k <= BEAM_DOTS_PER_SAT; k += 1) {
      const r = GLOBE_RADIUS_UNITS * (1 + altitude * (k / (BEAM_DOTS_PER_SAT + 1)));
      arr[i++] = r * cosLat * sinLng;
      arr[i++] = r * sinLat;
      arr[i++] = r * cosLat * cosLng;
    }
  }
  attr.needsUpdate = true;
  points.geometry.setDrawRange(0, i / 3);
}

function disposeBeamObject(group) {
  try {
    const points = group?.children?.[0];
    if (!points) return;
    points.geometry?.dispose();
    points.material?.dispose(); // the shared dot texture is intentionally kept
  } catch (error) {
    /* nothing to clean */
  }
}

// --- Display-only telemetry helpers (no propagation, nothing invented) -----
const WGS72_EARTH_RADIUS_KM = 6378.135;

function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getSatelliteTelemetry(sat) {
  const satrec = sat?.satrec;
  const meanMotion = numOrNull(sat?.mean_motion);

  let periodMin = null;
  if (meanMotion && meanMotion > 0) periodMin = 1440 / meanMotion;
  else if (satrec && numOrNull(satrec.no) && satrec.no > 0) periodMin = (2 * Math.PI) / satrec.no;

  let inclination = numOrNull(sat?.inclination);
  if (inclination === null && satrec && numOrNull(satrec.inclo) !== null) {
    inclination = (satrec.inclo * 180) / Math.PI;
  }

  let eccentricity = numOrNull(sat?.eccentricity);
  if (eccentricity === null && satrec) eccentricity = numOrNull(satrec.ecco);

  let apogeeKm = null;
  let perigeeKm = null;
  if (satrec) {
    const alta = numOrNull(satrec.alta);
    const altp = numOrNull(satrec.altp);
    if (alta !== null) apogeeKm = alta * WGS72_EARTH_RADIUS_KM;
    if (altp !== null) perigeeKm = altp * WGS72_EARTH_RADIUS_KM;
  }

  return {
    periodMin,
    inclination,
    eccentricity,
    apogeeKm,
    perigeeKm,
    epoch: typeof sat?.epoch === 'string' ? sat.epoch.replace('T', ' ').slice(0, 19) + ' UTC' : null,
  };
}

function fmt(value, digits, suffix = '') {
  const n = numOrNull(value);
  return n === null ? 'N/A' : `${n.toFixed(digits)}${suffix}`;
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


const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral SFS (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg SFB (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / NG', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Starbase (Boca Chica)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Pacific Spaceport Complex', agency: 'Astra / USSF', lat: 57.4358, lng: -152.3477, type: 'minor', country: 'USA' },
  { id: 7, name: 'Guiana Space Centre', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 8, name: 'Esrange Space Center', agency: 'SSC', lat: 67.8894, lng: 21.1050, type: 'minor', country: 'Sweden' },
  { id: 9, name: 'Andøya Spaceport', agency: 'Andøya Space', lat: 69.2933, lng: 16.0167, type: 'minor', country: 'Norway' },
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 11, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 12, name: 'Vostochny Cosmodrome', agency: 'Roscosmos', lat: 51.8841, lng: 128.3339, type: 'major', country: 'Russia' },
  { id: 13, name: 'Satish Dhawan Space Centre', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 15, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 16, name: 'Xichang Launch Center', agency: 'CNSA', lat: 28.2465, lng: 102.0264, type: 'minor', country: 'China' },
  { id: 17, name: 'Taiyuan Launch Center', agency: 'CNSA', lat: 38.8490, lng: 111.6080, type: 'minor', country: 'China' },
  { id: 18, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 19, name: 'Uchinoura Space Center', agency: 'JAXA', lat: 31.2515, lng: 131.0825, type: 'minor', country: 'Japan' },
  { id: 20, name: 'Naro Space Center', agency: 'KARI', lat: 34.4315, lng: 127.5350, type: 'minor', country: 'South Korea' },
  { id: 21, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 22, name: 'Arnhem Space Centre', agency: 'ELA', lat: -12.3780, lng: 136.8150, type: 'minor', country: 'Australia' },
  { id: 23, name: 'Imam Khomeini Spaceport', agency: 'ISA', lat: 35.2344, lng: 53.9211, type: 'minor', country: 'Iran' },
  { id: 24, name: 'Al-Dahik Launch Site', agency: 'NARSS', lat: 28.4890, lng: 30.4120, type: 'minor', country: 'Egypt' },
];

const EARTH_RADIUS_KM = 6371;
const EARTH_GM = 398600.4418;
const SUPABASE_BATCH_SIZE = 1000;
const SATELLITE_UPDATE_INTERVAL = 1000;
const ORBIT_SAMPLE_MINUTES = 2;
const MAX_ORBIT_POINTS = 720;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function normalizeLongitude(lng) {
  let val = Number(lng);
  if (!Number.isFinite(val)) return 0;
  while (val > 180) val -= 360;
  while (val < -180) val += 360;
  return val;
}

function safeNumber(val, fallback = null) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function estimateOrbitalVelocity(altKm) {
  const alt = Math.max(150, Number(altKm) || 400);
  return Math.sqrt(EARTH_GM / (EARTH_RADIUS_KM + alt));
}

function getTleLines(row) {
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
function buildOmmFromRow(row) {
  if (row?.omm && typeof row.omm === 'object') return row.omm;

  const hasCore =
    row?.mean_motion != null &&
    row?.eccentricity != null &&
    row?.inclination != null &&
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

function buildSatrec(sat) {
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

function hasValidTLE(sat) {
  return Boolean(buildSatrec(sat));
}

// True NORAD SGP4 Propagation
function propagateSatellite(sat, date = new Date()) {
  if (!sat?.satrec) return null;

  try {
    const posVel = satellite.propagate(sat.satrec, date);
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
      ...sat,
      lat: Number(lat.toFixed(5)),
      lng: Number(normalizeLongitude(lng).toFixed(5)),
      altitudeKm: Number(altitudeKm.toFixed(2)),
      altitude: Math.max(0.001, altitudeKm / EARTH_RADIUS_KM),
      velocityKmS: Number(velocityKmS.toFixed(3)),
      velocity: Number(velocityKmS.toFixed(3)),
      telemetryTime: date.toISOString(),
    };
  } catch (error) {
    return null;
  }
}

function getOrbitalPeriodMinutes(sat) {
  const meanMotion = safeNumber(sat?.mean_motion, null);
  if (meanMotion && meanMotion > 0) return 1440 / meanMotion;

  if (sat?.satrec?.no) {
    const rpm = sat.satrec.no / (2 * Math.PI);
    if (Number.isFinite(rpm) && rpm > 0) return 1 / rpm;
  }

  return 92;
}

function generateOrbitPath(sat, centerDate = new Date()) {
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

function formatDatabaseSatellite(row) {
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

// Normalizes a launchpad record from the real launchpad database (the same
// list used on the Launchpads page) into the shape this component already
// renders (lat/lng, type: 'major'|'minor', agency). Visual-only mapping —
// doesn't change or recompute any of the underlying data.
function normalizeExternalPad(p) {
  return {
    id: p.id,
    name: p.name,
    agency: p.operator || p.agency || '',
    lat: Number(p.lat),
    lng: Number(p.lng ?? p.lon),
    type: p.type || (p.isMajor ? 'major' : 'minor'),
    country: p.country || '',
  };
}

const OG_CSS = `
/* ===== Orbital Globe – all rules scoped to .og-* or the original component classes ===== */
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
`;

function InfoRow({ label, value, span }) {
  return (
    <div className={span ? 'og-span' : undefined}>
      <p className="og-k">{label}</p>
      <p className="og-v">{value}</p>
    </div>
  );
}

function SatelliteInfo({ sat, onClose, footer }) {
  const t = getSatelliteTelemetry(sat);
  const orbit =
    t.apogeeKm !== null && t.perigeeKm !== null
      ? `${t.perigeeKm.toFixed(0)} × ${t.apogeeKm.toFixed(0)} km`
      : 'N/A';
  return (
    <>
      <div className="og-info-head">
        <span className="og-info-title">REAL-TIME ORBITAL TELEMETRY</span>
        <button className="og-btn" onClick={onClose} aria-label="Close satellite information">
          Close ✕
        </button>
      </div>
      <div className="og-info-grid">
        <InfoRow span label="Object name" value={sat.name || 'N/A'} />
        <InfoRow label="NORAD ID" value={sat.id ?? 'N/A'} />
        <InfoRow label="Organization" value={sat.organization || 'N/A'} />
        <InfoRow label="Altitude (live)" value={fmt(sat.altitudeKm, 2, ' km')} />
        <InfoRow label="Velocity (live)" value={fmt(sat.velocityKmS, 3, ' km/s')} />
        <InfoRow label="Latitude (live)" value={fmt(sat.lat, 4, '°')} />
        <InfoRow label="Longitude (live)" value={fmt(sat.lng, 4, '°')} />
        <InfoRow label="Inclination" value={fmt(t.inclination, 3, '°')} />
        <InfoRow label="Orbital period" value={fmt(t.periodMin, 2, ' min')} />
        <InfoRow label="Eccentricity" value={fmt(t.eccentricity, 6)} />
        <InfoRow label="Perigee × apogee" value={orbit} />
        {t.epoch && <InfoRow span label="Element epoch" value={t.epoch} />}
        <InfoRow label="Solver" value={sat.satrec ? 'SGP4 PROPAGATOR' : 'STATIC DATABASE'} />
        <InfoRow
          label="UTC tick"
          value={sat.telemetryTime ? new Date(sat.telemetryTime).toISOString().slice(11, 19) + ' UTC' : 'N/A'}
        />
      </div>
      {footer && <div className="og-foot">{footer}</div>}
    </>
  );
}

export default function OrbitalGlobe({ requestedView, launchpads }) {
  const globeRef = useRef(null);
  const stageRef = useRef(null);
  const animationRef = useRef(null);
  const lastTelemetryUpdateRef = useRef(0);
  const satCacheRef = useRef({});
  const beamGroupRef = useRef(null);
  const beamSatsRef = useRef([]);
  const exploreRef = useRef(false);
  const contextCanvasRef = useRef(null);
  const exitButtonRef = useRef(null);

  const [viewMode, setViewMode] = useState('pads');
  const [padFilter, setPadFilter] = useState('all');
  const [satFilter, setSatFilter] = useState('stations');
  const [satLimit, setSatLimit] = useState(1000);
  const [selectedPad, setSelectedPad] = useState(() => (
    Array.isArray(launchpads) && launchpads.length > 0
      ? normalizeExternalPad(launchpads[0])
      : globalLaunchPads[0]
  ));
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);
  const [satellites, setSatellites] = useState([]);
  const [loadingSats, setLoadingSats] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedOrbitPath, setSelectedOrbitPath] = useState([]);

  const [wikiData, setWikiData] = useState([]);
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiPage, setWikiPage] = useState(0);
  const [totalWikiCount, setTotalWikiCount] = useState(0);

  // render-layer / UI state (none of this feeds the orbital engine)
  const [consoleRequested, setConsoleRequested] = useState(false);
  const [explore, setExplore] = useState(false);
  const [showBeams, setShowBeams] = useState(true);
  const [showOrbit, setShowOrbit] = useState(true);
  const [globeKey, setGlobeKey] = useState(0);
  const [safeMode, setSafeMode] = useState(false);
  const [diag, setDiag] = useState({});

  const pageSize = 50;

  const { GlobeComponent, failed: engineFailed } = useReactGlobe();
  const canFullscreen = useMediaQuery('(min-width: 900px)');
  const fullscreen = viewMode === 'satellites' && consoleRequested && canFullscreen;
  const stageSize = useElementSize(stageRef);

  useEffect(() => {
    const flags = readDiagFlags();
    if (Object.keys(flags).length) {
      console.info('[OrbitalGlobe] diagnostic flags active:', flags);
      setDiag(flags);
    }
  }, []);

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
      setConsoleRequested(requestedView.mode === 'satellites');
    }
  }, [requestedView]);

  // Padding for the page: lock page scroll while the console is open and put the
  // scroll position back exactly on exit. Esc leaves the console / Explore mode.
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

  // Explore mode: the console is an interactive surface (on by default); the
  // embedded globe is NOT, so wheel / touch scrolls the page normally.
  useEffect(() => {
    setExplore(fullscreen);
  }, [fullscreen]);

  useEffect(() => {
    if (fullscreen || !explore || typeof IntersectionObserver === 'undefined' || !stageRef.current) {
      return undefined;
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries[0] && entries[0].intersectionRatio < 0.25) setExplore(false);
      },
      { threshold: [0, 0.25, 0.5] }
    );
    io.observe(stageRef.current);
    return () => io.disconnect();
  }, [explore, fullscreen]);

  const syncControls = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return false;
    try {
      const controls = globe.controls && globe.controls();
      const canvas = globe.renderer && globe.renderer().domElement;
      if (controls) controls.enabled = exploreRef.current;
      // OrbitControls forces touch-action:none; allow vertical page scroll unless exploring.
      if (canvas) canvas.style.touchAction = exploreRef.current ? 'none' : 'pan-y';
      return Boolean(controls);
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    exploreRef.current = explore;
    syncControls();
  }, [explore, syncControls, GlobeComponent, globeKey, stageSize.w, stageSize.h]);

  const onContextLost = useCallback(event => {
    if (event && event.preventDefault) event.preventDefault();
    console.warn('[OrbitalGlobe] WebGL context lost – remounting globe in safe render mode');
    setSafeMode(true);
    setTimeout(() => setGlobeKey(k => k + 1), 250);
  }, []);

  const handleGlobeReady = useCallback(() => {
    syncControls();
    try {
      const canvas = globeRef.current?.renderer?.().domElement;
      if (canvas && contextCanvasRef.current !== canvas) {
        if (contextCanvasRef.current) {
          contextCanvasRef.current.removeEventListener('webglcontextlost', onContextLost);
        }
        canvas.addEventListener('webglcontextlost', onContextLost);
        contextCanvasRef.current = canvas;
      }
      if (Object.keys(diag).length) {
        const r = globeRef.current.renderer();
        console.info('[OrbitalGlobe] globe ready', {
          canvas: [canvas?.width, canvas?.height],
          contextLost: r.getContext().isContextLost(),
          renderInfo: r.info && { geometries: r.info.memory.geometries, textures: r.info.memory.textures, calls: r.info.render.calls },
        });
      }
    } catch (error) {
      console.warn('[OrbitalGlobe] ready hook', error);
    }
  }, [syncControls, onContextLost, diag]);

  useEffect(() => () => {
    if (contextCanvasRef.current) {
      contextCanvasRef.current.removeEventListener('webglcontextlost', onContextLost);
    }
  }, [onContextLost]);

  // Use every pad from the real launchpad database when it's passed in;
  // fall back to the built-in list only if no launchpads prop is provided.
  const padSource = useMemo(() => {
    if (Array.isArray(launchpads) && launchpads.length > 0) {
      return launchpads
        .map(normalizeExternalPad)
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
    return globalLaunchPads;
  }, [launchpads]);

  const filteredPads = useMemo(() => {
    return padSource.filter(
      pad => padFilter === 'all' || pad.type === padFilter
    );
  }, [padFilter, padSource]);

  const filterSatelliteRows = useCallback((rows, filter) => {
    const upperName = row => String(row?.name || '').toUpperCase();

    if (filter === 'active' || filter === 'all') {
      return rows.filter(row => {
        const status = String(row?.status || row?.operational_status || '').toLowerCase();
        if (status.includes('decay') || status.includes('dead') || status.includes('inactive')) {
          return false;
        }
        return hasValidTLE(row) || (row.lat != null && row.lng != null);
      });
    }

    if (filter === 'starlink') {
      return rows.filter(row => upperName(row).includes('STARLINK'));
    }

    if (filter === 'weather') {
      return rows.filter(row => {
        const name = upperName(row);
        return (
          name.includes('NOAA') ||
          name.includes('GOES') ||
          name.includes('METEOR') ||
          name.includes('METOP') ||
          name.includes('JPSS') ||
          name.includes('EUMETSAT') ||
          name.includes('HIMAWARI')
        );
      });
    }

    if (filter === 'stations') {
      return rows.filter(row => {
        const name = upperName(row);
        return (
          name.includes('ISS') ||
          name.includes('CSS') ||
          name.includes('TIANGONG') ||
          name.includes('STATION') ||
          name.includes('ZARYA')
        );
      });
    }

    return rows;
  }, []);

  const fetchAllSatelliteRows = useCallback(async () => {
    const rows = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('satellites')
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + SUPABASE_BATCH_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      rows.push(...data);
      setLoadingMessage(`ACQUIRING ${rows.length.toLocaleString()} ORBITAL BODIES...`);

      if (data.length < SUPABASE_BATCH_SIZE) break;
      from += SUPABASE_BATCH_SIZE;
    }

    return rows;
  }, []);

  useEffect(() => {
    if (viewMode === 'wiki' || viewMode === 'pads') return;

    let cancelled = false;

    async function loadSatellites() {
      setSelectedSat(null);
      setHoveredSat(null);
      setSelectedOrbitPath([]);
      setLoadingSats(true);
      setLoadingMessage('CONNECTING TO NORAD ORBITAL DATABASE...');

      try {
        let rows = satCacheRef.current.__raw;
        if (!rows) {
          rows = await fetchAllSatelliteRows();
          satCacheRef.current.__raw = rows;
        }

        if (cancelled) return;

        const matchingRows = filterSatelliteRows(rows, satFilter);

        // Same formatDatabaseSatellite (SGP4) call per row, in the same order,
        // but in chunks that yield to the browser so the Earth keeps rendering
        // and the page stays responsive while thousands of objects are computed.
        const CHUNK = 500;
        const formatted = [];
        for (let i = 0; i < matchingRows.length; i += CHUNK) {
          const end = Math.min(i + CHUNK, matchingRows.length);
          for (let j = i; j < end; j += 1) {
            const sat = formatDatabaseSatellite(matchingRows[j]);
            if (Number.isFinite(Number(sat.lat)) && Number.isFinite(Number(sat.lng))) {
              formatted.push(sat);
            }
          }
          setLoadingMessage(`COMPUTING SGP4 ${end.toLocaleString()} / ${matchingRows.length.toLocaleString()} OBJECTS...`);
          if (matchingRows.length > CHUNK) {
            await new Promise(resolve => setTimeout(resolve, 0));
            if (cancelled) return;
          }
        }

        if (cancelled) return;
        setSatellites(formatted);
      } catch (error) {
        console.error('Database fetch error:', error);
        if (!cancelled) {
          setSatellites([]);
          setLoadingMessage('TELEMETRY FEED OFFLINE');
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(false);
          setLoadingMessage('');
        }
      }
    }

    loadSatellites();

    return () => {
      cancelled = true;
    };
  }, [satFilter, viewMode, fetchAllSatelliteRows, filterSatelliteRows]);

  // Real-time orbital propagation loop (Updates every second) – unchanged
  useEffect(() => {
    if (viewMode !== 'satellites' || satellites.length === 0) {
      return undefined;
    }

    let cancelled = false;
    lastTelemetryUpdateRef.current = 0;

    function updatePositions(timestamp) {
      if (cancelled) return;

      if (timestamp - lastTelemetryUpdateRef.current >= SATELLITE_UPDATE_INTERVAL) {
        lastTelemetryUpdateRef.current = timestamp;
        const now = new Date();

        setSatellites(previous =>
          previous.map(sat => {
            if (!sat.satrec) return sat;
            const updated = propagateSatellite(sat, now);
            return updated || sat;
          })
        );

        setSelectedSat(current => {
          if (!current || !current.satrec) return current;
          const updated = propagateSatellite(current, now);
          return updated || current;
        });
      }

      animationRef.current = requestAnimationFrame(updatePositions);
    }

    animationRef.current = requestAnimationFrame(updatePositions);

    return () => {
      cancelled = true;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [viewMode, satellites.length]);

  const clearSatelliteSelection = useCallback(() => {
    setSelectedSat(null);
    setHoveredSat(null);
    setSelectedOrbitPath([]);
  }, []);

  const orbitalPaths = viewMode === 'satellites' && selectedSat && showOrbit && !diag.nopaths
    ? selectedOrbitPath
    : NO_PATHS;

  const activeSatsToDisplay = useMemo(() => {
    let list = satellites;
    if (satFilter === 'active' && satLimit > 0) list = list.slice(0, satLimit);
    if (diag.nosat) return [];
    const cap = Number(diag.sats);
    if (Number.isFinite(cap) && cap >= 0) list = list.slice(0, cap);
    return list;
  }, [satellites, satFilter, satLimit, diag]);

  // Hover dimming + click isolation
  const renderSatellites = useMemo(() => {
    if (selectedSat) {
      const activeObj =
        satellites.find(s => String(s.id) === String(selectedSat.id)) || selectedSat;

      return [
        {
          ...activeObj,
          displayColor: '#ffffff',
          displayRadius: 0.55,
          displayAltitude: Math.max(
            0.002,
            (Number(activeObj.altitudeKm) || 400) / EARTH_RADIUS_KM
          ),
        },
      ];
    }

    return activeSatsToDisplay.map(sat => {
      const isHovered = hoveredSat && String(hoveredSat.id) === String(sat.id);

      let displayColor = 'rgba(255,255,255,0.85)';
      let displayRadius = 0.20;

      if (hoveredSat) {
        if (isHovered) {
          displayColor = '#ffffff';
          displayRadius = 0.50;
        } else {
          displayColor = 'rgba(255,255,255,0.12)';
          displayRadius = 0.12;
        }
      }

      const altKm = Number(sat.altitudeKm) || Number(sat.altitude) || 400;

      return {
        ...sat,
        displayColor,
        displayRadius,
        displayAltitude: Math.max(0.002, altKm / EARTH_RADIUS_KM),
      };
    });
  }, [activeSatsToDisplay, selectedSat, hoveredSat, satellites]);

  // --- beam layer wiring (visual only) -------------------------------------
  const beamsActive = viewMode === 'satellites' && showBeams && !safeMode && !diag.nobeams;

  const createBeamLayer = useCallback(() => {
    try {
      const group = createBeamObject();
      writeBeamPositions(group, beamSatsRef.current);
      beamGroupRef.current = group;
      return group;
    } catch (error) {
      console.error('[OrbitalGlobe] beam layer failed – continuing without beams', error);
      return new THREE.Group();
    }
  }, []);

  // Positions are pushed into the existing buffer; three-globe only creates the object.
  const noopBeamUpdate = useCallback(() => {}, []);

  useEffect(() => {
    beamSatsRef.current = viewMode === 'satellites' ? renderSatellites : [];
    if (beamGroupRef.current) {
      try {
        writeBeamPositions(beamGroupRef.current, beamSatsRef.current);
      } catch (error) {
        console.error('[OrbitalGlobe] beam update failed', error);
      }
    }
  }, [renderSatellites, viewMode]);

  useEffect(() => {
    if (!beamsActive && beamGroupRef.current) {
      disposeBeamObject(beamGroupRef.current);
      beamGroupRef.current = null;
    }
  }, [beamsActive]);

  useEffect(() => () => disposeBeamObject(beamGroupRef.current), []);

  const selectSatellite = useCallback(d => {
    setSelectedSat(d);
    setHoveredSat(null);
    const path = generateOrbitPath(d, new Date());
    setSelectedOrbitPath(path.length > 1 ? [{ points: path }] : []);

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.7 }, 900);
    }
  }, []);

  const handlePointClick = useCallback(d => {
    if (viewMode === 'pads') {
      setSelectedPad(d);
      if (globeRef.current) {
        globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.35 }, 900);
      }
    } else {
      selectSatellite(d);
    }
  }, [viewMode, selectSatellite]);

  const handlePointHover = useCallback(d => {
    if (viewMode === 'satellites') setHoveredSat(d || null);
  }, [viewMode]);

  const handleGlobeClick = useCallback(() => {
    if (viewMode === 'satellites') clearSatelliteSelection();
  }, [viewMode, clearSatelliteSelection]);

  const pointAltitude = useCallback(
    d => (viewMode === 'pads' ? 0.015 : d.displayAltitude || 0.02),
    [viewMode]
  );
  const pointColor = useCallback(
    d => (viewMode === 'pads' ? '#ffffff' : (d.displayColor || '#ffffff')),
    [viewMode]
  );
  const pointRadius = useCallback(
    d => (viewMode === 'pads' ? 0.65 : d.displayRadius || 0.2),
    [viewMode]
  );
  const ringColor = useCallback(() => '#ffffff', []);
  const pathColor = useCallback(() => 'rgba(255,255,255,0.7)', []);

  const ringsData = useMemo(() => {
    if (diag.norings) return NO_RINGS;
    if (viewMode === 'satellites' && selectedSat) return [selectedSat];
    if (viewMode === 'pads' && selectedPad) return [selectedPad];
    return NO_RINGS;
  }, [viewMode, selectedSat, selectedPad, diag]);

  const pointsData = useMemo(() => {
    if (viewMode === 'pads') return filteredPads;
    return diag.nopoints ? NO_RINGS : renderSatellites;
  }, [viewMode, filteredPads, renderSatellites, diag]);

  const pointLabel = useCallback(d => {
    if (viewMode === 'pads') {
      return `
        <div style="
          background:#000000;
          border:1px solid #3f3f46;
          padding:8px 10px;
          color:#fff;
          font-family:monospace;
          font-size:11px;
          min-width:170px;
        ">
          <div style="font-weight:700;margin-bottom:4px;">
            ${d.name || 'LAUNCH PAD'}
          </div>
          <div style="color:#a1a1aa;">${d.country || ''}</div>
          <div style="margin-top:4px;color:#71717a;">
            LAT ${Number(d.lat).toFixed(4)}°<br/>LNG ${Number(d.lng).toFixed(4)}°
          </div>
        </div>
      `;
    }

    return `
      <div style="
        background:#000000;
        border:1px solid #3f3f46;
        padding:8px 10px;
        color:#ffffff;
        font-family:monospace;
        font-size:11px;
        min-width:180px;
      ">
        <div style="font-weight:700;margin-bottom:4px;">
          ${d.name || 'UNKNOWN OBJECT'}
        </div>
        <div style="color:#71717a;">NORAD: ${d.id ?? 'N/A'}</div>
        <div style="margin-top:4px;">
          LAT: ${Number.isFinite(Number(d.lat)) ? Number(d.lat).toFixed(4) + '°' : 'N/A'}
        </div>
        <div>
          LNG: ${Number.isFinite(Number(d.lng)) ? Number(d.lng).toFixed(4) + '°' : 'N/A'}
        </div>
        <div>
          ALT: ${Number.isFinite(Number(d.altitudeKm)) ? Number(d.altitudeKm).toFixed(1) + ' km' : 'N/A'}
        </div>
        <div>
          VEL: ${Number.isFinite(Number(d.velocityKmS)) ? Number(d.velocityKmS).toFixed(2) + ' km/s' : 'N/A'}
        </div>
      </div>
    `;
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== 'wiki') return;

    let cancelled = false;

    async function fetchWikiCatalog() {
      setLoadingSats(true);
      try {
        const from = wikiPage * pageSize;
        const to = from + pageSize - 1;

        let query = supabase.from('satellites').select('*', { count: 'exact' });
        const trimmed = wikiSearch.trim();

        if (trimmed) {
          if (/^\d+$/.test(trimmed)) {
            query = query.or(`name.ilike.%${trimmed}%,id.eq.${trimmed}`);
          } else {
            query = query.ilike('name', `%${trimmed}%`);
          }
        }

        const { data, count, error } = await query
          .order('id', { ascending: true })
          .range(from, to);

        if (error) throw error;
        if (cancelled) return;

        setWikiData(data || []);
        setTotalWikiCount(count || 0);
      } catch (error) {
        console.error('Wiki error:', error);
      } finally {
        if (!cancelled) setLoadingSats(false);
      }
    }

    const timer = setTimeout(fetchWikiCatalog, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wikiSearch, wikiPage, viewMode]);

  const maxPages = Math.ceil(totalWikiCount / pageSize);

  const switchMode = key => {
    setViewMode(key);
    setConsoleRequested(key === 'satellites');
    setSelectedSat(null);
    setHoveredSat(null);
    setSelectedOrbitPath([]);
  };

  const pickFilter = key => {
    setSatFilter(key);
    setSelectedSat(null);
    setHoveredSat(null);
    setSelectedOrbitPath([]);
  };

  const SAT_FILTERS = [
    { key: 'stations', label: 'SPACE STATIONS' },
    { key: 'starlink', label: 'STARLINK' },
    { key: 'weather', label: 'WEATHER' },
    { key: 'active', label: 'ALL ACTIVE' },
  ];

  const trackedCount = renderSatellites.length;

  // --- the globe itself: ALWAYS mounted, independent of satellite loading ----
  const retryGlobe = () => {
    setSafeMode(true);
    setGlobeKey(k => k + 1);
  };

  let globeElement;
  if (engineFailed) {
    globeElement = (
      <div className="og-globe-fallback">
        <span>COULD NOT LOAD 3D ENGINE</span>
        <button className="og-btn" onClick={() => window.location.reload()}>RELOAD</button>
      </div>
    );
  } else if (!GlobeComponent || stageSize.w < 1 || stageSize.h < 1) {
    globeElement = <div className="og-globe-fallback">LOADING 3D ENGINE...</div>;
  } else {
    globeElement = (
      <GlobeErrorBoundary
        resetKey={globeKey}
        onError={() => setSafeMode(true)}
        onRetry={retryGlobe}
      >
        <GlobeComponent
          key={globeKey}
          ref={globeRef}
          width={stageSize.w}
          height={stageSize.h}
          onGlobeReady={handleGlobeReady}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere={true}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={fullscreen ? 0.16 : 0.12}
          backgroundColor="rgba(0,0,0,0)"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={pointAltitude}
          pointColor={pointColor}
          pointRadius={pointRadius}
          pointResolution={4}
          pointsTransitionDuration={0}
          customLayerData={beamsActive ? BEAM_LAYER_DATA : NO_LAYER_DATA}
          customThreeObject={createBeamLayer}
          customThreeObjectUpdate={noopBeamUpdate}
          pathsData={orbitalPaths}
          pathPoints="points"
          pathPointLat="lat"
          pathPointLng="lng"
          pathPointAlt="altitude"
          pathColor={pathColor}
          pathStroke={1.0}
          pathDashLength={0.03}
          pathDashGap={0.015}
          pathDashAnimateTime={4000}
          ringsData={ringsData}
          ringColor={ringColor}
          ringMaxRadius={2.4}
          ringPropagationSpeed={1.5}
          ringRepeatPeriod={1200}
          onPointClick={handlePointClick}
          onPointHover={handlePointHover}
          onGlobeClick={handleGlobeClick}
          pointLabel={pointLabel}
        />
      </GlobeErrorBoundary>
    );
  }

  const stage = (
    <div ref={stageRef} className="cosmos-viewport og-stage">
      <div className="og-globe-layer">{globeElement}</div>

      {/* Minimalist vertical LIMIT HUD (embedded view, ALL ACTIVE only) – unchanged */}
      {!fullscreen && viewMode === 'satellites' && satFilter === 'active' && !selectedSat && (
        <div
          style={{
            position: 'absolute',
            left: '1rem',
            top: '4.5rem',
            background: '#000000',
            border: '1px solid #27272a',
            padding: '0.75rem 0.55rem',
            zIndex: 15,
            fontFamily: 'monospace',
            width: '68px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <div style={{ fontSize: '0.52rem', color: '#71717a', textAlign: 'center', letterSpacing: '0.5px' }}>LIMIT</div>
          <div style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 'bold' }}>
            {satLimit >= 16000 ? '16K' : satLimit >= 1000 ? `${satLimit / 1000}K` : satLimit}
          </div>
          <input
            type="range"
            min="500"
            max="16000"
            step="500"
            value={satLimit}
            onChange={e => setSatLimit(Number(e.target.value))}
            className="vertical-slider"
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
            {[16000, 10000, 5000, 2500, 1000, 500].map(val => (
              <button
                key={val}
                onClick={() => setSatLimit(val)}
                className={`v-preset-btn ${satLimit === val ? 'active' : ''}`}
              >
                {val >= 1000 ? `${val / 1000}K` : val}
              </button>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'satellites' && (
        <div className="og-chip" style={{ left: '0.75rem', bottom: '0.75rem', zIndex: 10 }}>
          <b style={{ fontSize: '0.58rem', letterSpacing: '0.5px' }}>● REAL-TIME SGP4 ORBITAL PHYSICS</b>
          <small>1000ms Live Clock • NORAD Coordinate Frame</small>
        </div>
      )}

      {loadingSats && (
        <div className="og-chip og-loading">
          {loadingMessage || 'INITIALIZING FEED...'}
        </div>
      )}

      {viewMode === 'satellites' && (
        <div className="og-chip" style={{ top: '0.75rem', left: '0.75rem' }}>
          <small>TRACKED OBJECTS</small>
          <b>{trackedCount.toLocaleString()}</b>
        </div>
      )}

      {safeMode && (
        <div className="og-chip" style={{ bottom: '0.75rem', right: '0.75rem', fontSize: '0.54rem', color: '#a1a1aa' }}>
          SAFE RENDER MODE
        </div>
      )}

      {/* Explore mode – embedded view */}
      {!fullscreen && (
        <div className="og-explore">
          <button
            className={`og-btn ${explore ? 'on' : ''}`}
            onClick={() => setExplore(v => !v)}
            aria-pressed={explore}
          >
            {explore ? 'Exit Explore ✕' : 'Explore globe'}
          </button>
          <span className="og-hint">
            {explore ? 'Drag to rotate • pinch / wheel to zoom' : 'Page scrolls normally • tap a marker to inspect'}
          </span>
        </div>
      )}

      {/* Selected-satellite card kept INSIDE the globe viewport (embedded / mobile) */}
      {!fullscreen && viewMode === 'satellites' && selectedSat && (
        <div className="og-sheet" role="region" aria-label="Selected satellite">
          <SatelliteInfo
            sat={selectedSat}
            onClose={clearSatelliteSelection}
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
          className="og-range"
          type="range"
          min="500"
          max="16000"
          step="500"
          value={satLimit}
          disabled={satFilter !== 'active'}
          onChange={e => setSatLimit(Number(e.target.value))}
          aria-label="Satellite count"
        />
        <div className="og-presets">
          {[500, 1000, 2500, 5000, 10000, 16000].map(val => (
            <button
              key={val}
              className={`og-btn ${satLimit === val ? 'on' : ''}`}
              disabled={satFilter !== 'active'}
              onClick={() => setSatLimit(val)}
            >
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
            <button
              key={f.key}
              className={`og-btn ${satFilter === f.key ? 'on' : ''}`}
              onClick={() => pickFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="og-sec">
        <div className="og-sec-h"><span>ORBIT VISUALISATION</span></div>
        <div className="og-grid2">
          <button className={`og-btn ${showBeams ? 'on' : ''}`} aria-pressed={showBeams} onClick={() => setShowBeams(v => !v)}>
            Altitude beams
          </button>
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
      {selectedSat ? (
        <SatelliteInfo
          sat={selectedSat}
          onClose={clearSatelliteSelection}
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
          <div className="og-row" style={{ gap: '0.5rem' }}>
            {[
              { key: 'pads', label: 'LAUNCH PADS' },
              { key: 'satellites', label: `ACTIVE SATELLITES (${renderSatellites.length})` },
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

          {viewMode === 'pads' && (
            <div className="og-row">
              {['all', 'major', 'minor'].map(filter => (
                <button
                  key={filter}
                  className="hud-btn"
                  onClick={() => setPadFilter(filter)}
                  style={{
                    padding: '0.35rem 0.7rem',
                    background: padFilter === filter ? '#27272a' : '#09090b',
                    border: '1px solid #27272a',
                    color: padFilter === filter ? '#ffffff' : '#71717a',
                    fontSize: '0.62rem',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          {viewMode === 'satellites' && (
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
                    fontSize: '0.62rem',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode !== 'wiki' ? (
        <div className="og-body">
          {fullscreen ? leftPanel : null}
          {stage}
          {fullscreen ? rightPanel : null}
        </div>
      ) : (
        <div
          style={{
            padding: '1.25rem',
            border: '1px solid #27272a',
            background: '#000000',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <span style={{ fontSize: '0.68rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700' }}>
              NORAD OBJECT CATALOG
            </span>

            <input
              type="text"
              placeholder="Filter by name or NORAD ID..."
              value={wikiSearch}
              onChange={e => {
                setWikiSearch(e.target.value);
                setWikiPage(0);
              }}
              style={{
                background: '#09090b',
                border: '1px solid #27272a',
                padding: '0.45rem 0.8rem',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                width: '300px',
                maxWidth: '100%',
                outline: 'none',
              }}
            />
          </div>

          <div className="orbital-scroll" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.70rem',
                fontFamily: 'monospace',
                color: '#a1a1aa',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left', color: '#ffffff', background: '#09090b' }}>
                  <th style={{ padding: '0.5rem' }}>NORAD ID</th>
                  <th style={{ padding: '0.5rem' }}>NAME</th>
                  <th style={{ padding: '0.5rem' }}>ORGANIZATION</th>
                  <th style={{ padding: '0.5rem' }}>LAT</th>
                  <th style={{ padding: '0.5rem' }}>LNG</th>
                  <th style={{ padding: '0.5rem' }}>ALT</th>
                </tr>
              </thead>
              <tbody>
                {wikiData.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #18181b' }}>
                    <td style={{ padding: '0.5rem', color: '#ffffff' }}>{item.id}</td>
                    <td style={{ padding: '0.5rem', color: '#ffffff', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '0.5rem' }}>{item.organization || 'Unknown'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {Number.isFinite(Number(item.lat)) ? Number(item.lat).toFixed(4) : '—'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {Number.isFinite(Number(item.lng)) ? Number(item.lng).toFixed(4) : '—'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {Number.isFinite(Number(item.altitude)) ? `${Number(item.altitude).toFixed(1)} km` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {wikiData.length === 0 && !loadingSats && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#52525b', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                NO RECORDS FOUND
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              borderTop: '1px solid #27272a',
              paddingTop: '0.8rem',
            }}
          >
            <span style={{ fontSize: '0.62rem', color: '#71717a', fontFamily: 'monospace' }}>
              PAGE {wikiPage + 1} OF {Math.max(1, maxPages)}
            </span>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                className="hud-btn"
                disabled={wikiPage === 0}
                onClick={() => setWikiPage(p => Math.max(0, p - 1))}
                style={{
                  padding: '0.35rem 0.7rem',
                  background: '#09090b',
                  border: '1px solid #27272a',
                  color: wikiPage === 0 ? '#3f3f46' : '#ffffff',
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  cursor: wikiPage === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                PREV
              </button>

              <button
                className="hud-btn"
                disabled={wikiPage + 1 >= maxPages}
                onClick={() => setWikiPage(p => p + 1)}
                style={{
                  padding: '0.35rem 0.7rem',
                  background: '#09090b',
                  border: '1px solid #27272a',
                  color: wikiPage + 1 >= maxPages ? '#3f3f46' : '#ffffff',
                  fontSize: '0.62rem',
                  fontFamily: 'monospace',
                  cursor: wikiPage + 1 >= maxPages ? 'not-allowed' : 'pointer',
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'pads' && selectedPad && (
        <div style={{ padding: '1.25rem', border: '1px solid #27272a', background: '#000000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700' }}>
              FACILITY DATA
            </span>
            <span style={{ fontSize: '0.60rem', color: '#71717a', fontFamily: 'monospace' }}>● ACTIVE SITE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>NAME</p>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedPad.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>OPERATOR</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedPad.agency}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>COUNTRY</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedPad.country}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>COORDINATES</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number(selectedPad.lat).toFixed(4)}°, {Number(selectedPad.lng).toFixed(4)}°
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
    }
