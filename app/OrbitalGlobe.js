'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';
import * as THREE from 'three';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#71717a',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
      }}
    >
      LOADING 3D ENGINE...
    </div>
  ),
});

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

export default function OrbitalGlobe({ requestedView, launchpads }) {
  const globeRef = useRef(null);
  const animationRef = useRef(null);
  const lastTelemetryUpdateRef = useRef(0);
  const satCacheRef = useRef({});

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

  const pageSize = 50;

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

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
        setLoadingMessage(`COMPUTING SGP4 FOR ${matchingRows.length.toLocaleString()} OBJECTS...`);

        const formatted = matchingRows
          .map(formatDatabaseSatellite)
          .filter(
            sat =>
              Number.isFinite(Number(sat.lat)) &&
              Number.isFinite(Number(sat.lng))
          );

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

  // Real-time orbital propagation loop (Updates every second)
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

  const orbitalPaths = viewMode === 'satellites' && selectedSat ? selectedOrbitPath : [];

  const activeSatsToDisplay = useMemo(() => {
    if (satFilter === 'active' && satLimit > 0) {
      return satellites.slice(0, satLimit);
    }
    return satellites;
  }, [satellites, satFilter, satLimit]);

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

  // Single batched WebGL layer for the subtle satellite altitude beams.
  // This is visual-only: it does not affect positions, propagation, filtering, or selection.
  const satelliteBeamLayerData = useMemo(() => {
    if (viewMode !== 'satellites') return [];
    return [{
      satellites: renderSatellites,
      radius: 100,
    }];
  }, [viewMode, renderSatellites]);

  const DOTS_PER_BEAM = 5;

  const beamToVector = (lat, lng, radius) => {
    const latRad = (Number(lat) * Math.PI) / 180;
    const lngRad = (Number(lng) * Math.PI) / 180;
    return [
      radius * Math.cos(latRad) * Math.sin(lngRad),
      radius * Math.sin(latRad),
      radius * Math.cos(latRad) * Math.cos(lngRad),
    ];
  };

  // Evenly-spaced dot positions strictly between the Earth's surface and the
  // satellite marker (endpoints excluded), so the dots never touch the
  // surface or overlap the "●" marker itself — same idea as the LEO beams
  // in the reference sketch (● on top, ⋮ underneath).
  const buildBeamDotPositions = (satellites, radius) => {
    const positions = [];
    (satellites || []).forEach(sat => {
      const lat = Number(sat.lat);
      const lng = Number(sat.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const altitude = Math.max(0.002, Number(sat.displayAltitude) || 0.002);

      for (let i = 1; i <= DOTS_PER_BEAM; i += 1) {
        const t = i / (DOTS_PER_BEAM + 1);
        positions.push(...beamToVector(lat, lng, radius * (1 + altitude * t)));
      }
    });
    return positions;
  };

  // A small soft circular sprite so each dot renders as a clean round point
  // rather than a hard square/pixel — still a single texture shared by every
  // dot in the one batched Points draw call.
  const createDotTexture = () => {
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
    return new THREE.CanvasTexture(canvas);
  };

  const createSatelliteBeamLayer = useCallback(data => {
    const group = new THREE.Group();
    const texture = createDotTexture();
    const material = new THREE.PointsMaterial({
      map: texture,
      color: 0xffffff,
      size: 3,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const geometry = new THREE.BufferGeometry();
    const positions = buildBeamDotPositions(data?.satellites, data?.radius || 100);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const dots = new THREE.Points(geometry, material);
    group.add(dots);
    group.userData.beamGeometry = geometry;
    group.userData.beamMaterial = material;
    group.userData.beamTexture = texture;
    return group;
  }, []);

  const updateSatelliteBeamLayer = useCallback((object, data) => {
    const dots = object?.children?.[0];
    if (!dots) return;

    const positions = buildBeamDotPositions(data?.satellites, data?.radius || 100);

    const oldGeometry = dots.geometry;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    dots.geometry = geometry;
    if (oldGeometry) oldGeometry.dispose();
  }, []);


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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <style>{`
        /* Clean pure cosmos background */
        .cosmos-viewport {
          background-color: #000000;
          background-image: 
            radial-gradient(1px 1px at 80px 120px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 300px 80px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 600px 320px, rgba(255,255,255,0.35), transparent);
          background-size: 700px 400px;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #000000;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 2px;
        }

        .hud-btn {
          transition: background 0.12s, color 0.12s;
        }

        .hud-btn:hover {
          background: #27272a !important;
          color: #ffffff !important;
        }

        /* Vertical range slider */
        .vertical-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 4px;
          height: 110px;
          background: #27272a;
          border-radius: 2px;
          outline: none;
          writing-mode: vertical-lr;
          direction: rtl;
          cursor: pointer;
        }

        .vertical-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 1px;
          cursor: pointer;
        }

        .v-preset-btn {
          width: 100%;
          padding: 3px 0;
          font-size: 0.58rem;
          font-family: monospace;
          background: #09090b;
          border: 1px solid #27272a;
          color: #71717a;
          cursor: pointer;
          border-radius: 1px;
          transition: all 0.12s;
          text-align: center;
        }

        .v-preset-btn.active {
          background: #ffffff;
          border-color: #ffffff;
          color: #000000;
          font-weight: 700;
        }

        .v-preset-btn:hover:not(.active) {
          border-color: #52525b;
          color: #d4d4d8;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { key: 'pads', label: 'LAUNCH PADS' },
            { key: 'satellites', label: `ACTIVE SATELLITES (${renderSatellites.length})` },
          ].map(btn => (
            <button
              key={btn.key}
              className="hud-btn"
              onClick={() => {
                setViewMode(btn.key);
                setSelectedSat(null);
                setHoveredSat(null);
                setSelectedOrbitPath([]);
              }}
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
        </div>

        {viewMode === 'pads' && (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
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
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {[
              { key: 'stations', label: 'SPACE STATIONS' },
              { key: 'starlink', label: 'STARLINK' },
              { key: 'weather', label: 'WEATHER' },
              { key: 'active', label: 'ALL ACTIVE' },
            ].map(filter => (
              <button
                key={filter.key}
                className="hud-btn"
                onClick={() => {
                  setSatFilter(filter.key);
                  setSelectedSat(null);
                  setHoveredSat(null);
                  setSelectedOrbitPath([]);
                }}
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

      {viewMode !== 'wiki' ? (
        <div
          className="cosmos-viewport"
          style={{
            position: 'relative',
            width: '100%',
            height: '580px',
            borderRadius: '1px',
            overflow: 'hidden',
            border: '1px solid #27272a',
          }}
        >
          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <ReactGlobe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              showAtmosphere={true}
              atmosphereColor="#3b82f6"
              atmosphereAltitude={0.12}
              backgroundColor="rgba(0,0,0,0)"
              pointsData={viewMode === 'pads' ? filteredPads : renderSatellites}
              pointLat="lat"
              pointLng="lng"
              pointAltitude={viewMode === 'pads' ? 0.015 : d => d.displayAltitude || 0.02}
              pointColor={d => (viewMode === 'pads' ? '#ffffff' : (d.displayColor || '#ffffff'))}
              pointRadius={viewMode === 'pads' ? 0.65 : d => d.displayRadius || 0.2}
              pointResolution={4}
              pointsTransitionDuration={0}
              customLayerData={satelliteBeamLayerData}
              customThreeObject={createSatelliteBeamLayer}
              customThreeObjectUpdate={updateSatelliteBeamLayer}
              pathsData={viewMode === 'satellites' && selectedSat ? orbitalPaths : []}
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor={() => 'rgba(255,255,255,0.7)'}
              pathStroke={1.0}
              pathDashLength={0.03}
              pathDashGap={0.015}
              pathDashAnimateTime={4000}
              ringsData={
                viewMode === 'satellites' && selectedSat
                  ? [selectedSat]
                  : viewMode === 'pads' && selectedPad
                  ? [selectedPad]
                  : []
              }
              ringColor={() => '#ffffff'}
              ringMaxRadius={2.4}
              ringPropagationSpeed={1.5}
              ringRepeatPeriod={1200}
              onPointClick={d => {
                if (viewMode === 'pads') {
                  setSelectedPad(d);
                  if (globeRef.current) {
                    globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.35 }, 900);
                  }
                } else {
                  setSelectedSat(d);
                  setHoveredSat(null);
                  const path = generateOrbitPath(d, new Date());
                  setSelectedOrbitPath(path.length > 1 ? [{ points: path }] : []);

                  if (globeRef.current) {
                    globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.7 }, 900);
                  }
                }
              }}
              onPointHover={d => {
                if (viewMode === 'satellites') {
                  setHoveredSat(d || null);
                }
              }}
              onGlobeClick={() => {
                if (viewMode === 'satellites') {
                  clearSatelliteSelection();
                }
              }}
              pointLabel={d => {
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
              }}
            />
          </div>

          {/* Minimalist Vertical Black HUD on the Left */}
          {viewMode === 'satellites' && satFilter === 'active' && !selectedSat && (
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
              <div style={{ fontSize: '0.52rem', color: '#71717a', textAlign: 'center', letterSpacing: '0.5px' }}>
                LIMIT
              </div>

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

          {/* Bottom Left Real-Time Indicator */}
          {viewMode === 'satellites' && (
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                bottom: '1rem',
                background: '#000000',
                border: '1px solid #27272a',
                padding: '0.45rem 0.7rem',
                zIndex: 10,
                fontFamily: 'monospace',
              }}
            >
              <div style={{ fontSize: '0.58rem', color: '#ffffff', letterSpacing: '0.5px' }}>
                ● REAL-TIME SGP4 ORBITAL PHYSICS
              </div>
              <div style={{ marginTop: '2px', fontSize: '0.52rem', color: '#71717a' }}>
                1000ms Live Clock • NORAD Coordinate Frame
              </div>
            </div>
          )}

          {loadingSats && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#000000',
                padding: '0.45rem 0.75rem',
                border: '1px solid #27272a',
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: '0.58rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {loadingMessage || 'INITIALIZING FEED...'}
              </span>
            </div>
          )}

          {viewMode === 'satellites' && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: '#000000',
                border: '1px solid #27272a',
                padding: '0.45rem 0.7rem',
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: '0.52rem', color: '#71717a', fontFamily: 'monospace' }}>
                TRACKED OBJECTS
              </div>
              <div style={{ fontFamily: 'monospace', color: '#ffffff', fontSize: '0.82rem', fontWeight: '700' }}>
                {renderSatellites.length.toLocaleString()}
              </div>
            </div>
          )}
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

      {/* Live Selected Satellite Telemetry Card */}
      {viewMode === 'satellites' && selectedSat && (
        <div style={{ padding: '1.25rem', border: '1px solid #27272a', background: '#000000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700' }}>
              REAL-TIME ORBITAL TELEMETRY
            </span>
            <button
              onClick={clearSatelliteSelection}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
              }}
            >
              [CLOSE]
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>OBJECT NAME</p>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedSat.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>NORAD ID</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedSat.id}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>ORGANIZATION</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedSat.organization || 'N/A'}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>LATITUDE (LIVE)</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.lat)) ? Number(selectedSat.lat).toFixed(4) + '°' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>LONGITUDE (LIVE)</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.lng)) ? Number(selectedSat.lng).toFixed(4) + '°' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>ALTITUDE (LIVE)</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {Number.isFinite(Number(selectedSat.altitudeKm)) ? Number(selectedSat.altitudeKm).toFixed(2) + ' km' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>VELOCITY (LIVE)</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }}>
                {Number.isFinite(Number(selectedSat.velocityKmS)) ? Number(selectedSat.velocityKmS).toFixed(3) + ' km/s' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>INCLINATION</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.inclination)) ? Number(selectedSat.inclination).toFixed(3) + '°' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>SOLVER</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.80rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
                {selectedSat.satrec ? 'SGP4 PROPAGATOR' : 'STATIC DATABASE'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>UTC TICK</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'monospace' }}>
                {selectedSat.telemetryTime ? new Date(selectedSat.telemetryTime).toISOString().slice(11, 19) + ' UTC' : 'N/A'}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.6rem',
              borderTop: '1px solid #18181b',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' }}>
              ● PROPAGATING AT 1 SECOND INTERVALS
            </span>
            <span style={{ fontSize: '0.58rem', color: '#52525b', fontFamily: 'monospace' }}>
              CLICK ANYWHERE ON GLOBE TO RESTORE CONSTELLATION
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
