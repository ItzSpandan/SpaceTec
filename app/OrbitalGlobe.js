'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';

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
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const globalLaunchPads = [
  {
    id: 1,
    name: 'Kennedy Space Center (LC-39A)',
    agency: 'NASA / SpaceX',
    lat: 28.5858,
    lng: -80.6511,
    type: 'major',
    country: 'USA',
  },
  {
    id: 2,
    name: 'Cape Canaveral Space Force Station (SLC-40)',
    agency: 'SpaceX / USSF',
    lat: 28.5619,
    lng: -80.5772,
    type: 'major',
    country: 'USA',
  },
  {
    id: 3,
    name: 'Vandenberg Space Force Base (SLC-4E)',
    agency: 'SpaceX / USSF',
    lat: 34.7420,
    lng: -120.5724,
    type: 'major',
    country: 'USA',
  },
  {
    id: 4,
    name: 'Wallops Flight Facility',
    agency: 'NASA / Northrop Grumman',
    lat: 37.9332,
    lng: -75.4836,
    type: 'minor',
    country: 'USA',
  },
  {
    id: 5,
    name: 'Boca Chica Launch Site (Starbase)',
    agency: 'SpaceX',
    lat: 25.9973,
    lng: -97.1560,
    type: 'major',
    country: 'USA',
  },
  {
    id: 6,
    name: 'Pacific Spaceport Complex (Alaska)',
    agency: 'Astra / USSF',
    lat: 57.4358,
    lng: -152.3477,
    type: 'minor',
    country: 'USA',
  },
  {
    id: 7,
    name: 'Guiana Space Centre (Ariane ELA-4)',
    agency: 'ESA / Arianespace',
    lat: 5.2372,
    lng: -52.7683,
    type: 'major',
    country: 'French Guiana',
  },
  {
    id: 8,
    name: 'Esrange Space Center',
    agency: 'SSC',
    lat: 67.8894,
    lng: 21.1050,
    type: 'minor',
    country: 'Sweden',
  },
  {
    id: 9,
    name: 'Andøya Spaceport',
    agency: 'Andøya Space',
    lat: 69.2933,
    lng: 16.0167,
    type: 'minor',
    country: 'Norway',
  },
  {
    id: 10,
    name: 'Baikonur Cosmodrome',
    agency: 'Roscosmos',
    lat: 45.9646,
    lng: 63.3052,
    type: 'major',
    country: 'Kazakhstan',
  },
  {
    id: 11,
    name: 'Plesetsk Cosmodrome',
    agency: 'Roscosmos',
    lat: 62.9298,
    lng: 40.5735,
    type: 'major',
    country: 'Russia',
  },
  {
    id: 12,
    name: 'Vostochny Cosmodrome',
    agency: 'Roscosmos',
    lat: 51.8841,
    lng: 128.3339,
    type: 'major',
    country: 'Russia',
  },
  {
    id: 13,
    name: 'Satish Dhawan Space Centre (SDSC)',
    agency: 'ISRO',
    lat: 13.7199,
    lng: 80.2304,
    type: 'major',
    country: 'India',
  },
  {
    id: 14,
    name: 'Jiuquan Satellite Launch Center',
    agency: 'CNSA',
    lat: 40.9575,
    lng: 100.2917,
    type: 'major',
    country: 'China',
  },
  {
    id: 15,
    name: 'Wenchang Space Launch Site',
    agency: 'CNSA',
    lat: 19.6145,
    lng: 110.9510,
    type: 'major',
    country: 'China',
  },
  {
    id: 16,
    name: 'Xichang Satellite Launch Center',
    agency: 'CNSA',
    lat: 28.2465,
    lng: 102.0264,
    type: 'minor',
    country: 'China',
  },
  {
    id: 17,
    name: 'Taiyuan Satellite Launch Center',
    agency: 'CNSA',
    lat: 38.8490,
    lng: 111.6080,
    type: 'minor',
    country: 'China',
  },
  {
    id: 18,
    name: 'Tanegashima Space Center',
    agency: 'JAXA',
    lat: 30.4000,
    lng: 130.9700,
    type: 'major',
    country: 'Japan',
  },
  {
    id: 19,
    name: 'Uchinoura Space Center',
    agency: 'JAXA',
    lat: 31.2515,
    lng: 131.0825,
    type: 'minor',
    country: 'Japan',
  },
  {
    id: 20,
    name: 'Naro Space Center',
    agency: 'KARI',
    lat: 34.4315,
    lng: 127.5350,
    type: 'minor',
    country: 'South Korea',
  },
  {
    id: 21,
    name: 'Mahia Launch Complex 1',
    agency: 'Rocket Lab',
    lat: -39.2608,
    lng: 177.8656,
    type: 'minor',
    country: 'New Zealand',
  },
  {
    id: 22,
    name: 'Arnhem Space Centre',
    agency: 'Equatorial Launch Australia',
    lat: -12.3780,
    lng: 136.8150,
    type: 'minor',
    country: 'Australia',
  },
  {
    id: 23,
    name: 'Imam Khomeini Spaceport',
    agency: 'ISA',
    lat: 35.2344,
    lng: 53.9211,
    type: 'minor',
    country: 'Iran',
  },
  {
    id: 24,
    name: 'Al-Dahik Launch Site',
    agency: 'NARSS',
    lat: 28.4890,
    lng: 30.4120,
    type: 'minor',
    country: 'Egypt',
  },
];

const EARTH_RADIUS_KM = 6371;
const EARTH_GM = 398600.4418;
const SUPABASE_BATCH_SIZE = 1000;
const SATELLITE_UPDATE_INTERVAL = 1000;
const SATELLITE_POINT_TRANSITION = 0;
const ORBIT_SAMPLE_MINUTES = 2;
const MAX_ORBIT_POINTS = 720;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeLongitude(lng) {
  let value = Number(lng);
  if (!Number.isFinite(value)) return 0;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function safeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function estimateOrbitalVelocity(altitudeKm) {
  const alt = Math.max(150, Number(altitudeKm) || 400);
  const r = EARTH_RADIUS_KM + alt;
  return Math.sqrt(EARTH_GM / r);
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

  const line1 =
    row?.tle_line1 ??
    row?.tle1 ??
    row?.line1 ??
    row?.tleLine1 ??
    row?.tle_1 ??
    row?.line_1 ??
    null;

  const line2 =
    row?.tle_line2 ??
    row?.tle2 ??
    row?.line2 ??
    row?.tleLine2 ??
    row?.tle_2 ??
    row?.line_2 ??
    null;

  return {
    line1: typeof line1 === 'string' ? line1.trim() : null,
    line2: typeof line2 === 'string' ? line2.trim() : null,
  };
}

function hasValidTLE(sat) {
  const { line1, line2 } = getTleLines(sat);
  return Boolean(
    line1 &&
    line2 &&
    line1.length >= 50 &&
    line2.length >= 50
  );
}

function buildSatrec(sat) {
  const { line1, line2 } = getTleLines(sat);
  if (!line1 || !line2) return null;

  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (satrec && satrec.error === 0) {
      return satrec;
    }
    return satrec || null;
  } catch (error) {
    return null;
  }
}

function propagateSatellite(sat, date = new Date()) {
  if (!sat?.satrec) return null;

  try {
    const positionAndVelocity = satellite.propagate(sat.satrec, date);

    if (
      !positionAndVelocity ||
      !positionAndVelocity.position ||
      !positionAndVelocity.velocity
    ) {
      return null;
    }

    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(positionEci, gmst);

    const latitude = satellite.degreesLat(geodetic.latitude);
    const longitude = satellite.degreesLong(geodetic.longitude);
    const altitudeKm = Number(geodetic.height);

    const velocityVector = velocityEci;
    const velocityKmS = Math.sqrt(
      velocityVector.x * velocityVector.x +
      velocityVector.y * velocityVector.y +
      velocityVector.z * velocityVector.z
    );

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(altitudeKm)
    ) {
      return null;
    }

    return {
      ...sat,
      lat: latitude,
      lng: normalizeLongitude(longitude),
      altitudeKm,
      altitude: Math.max(0.001, altitudeKm / EARTH_RADIUS_KM),
      velocityKmS: Number.isFinite(velocityKmS) && velocityKmS > 0 ? velocityKmS : estimateOrbitalVelocity(altitudeKm),
      velocity: Number.isFinite(velocityKmS) && velocityKmS > 0 ? velocityKmS : estimateOrbitalVelocity(altitudeKm),
      positionEci,
      velocityEci,
      telemetryTime: date.toISOString(),
    };
  } catch (error) {
    return null;
  }
}

function getOrbitalPeriodMinutes(sat) {
  const meanMotion = safeNumber(sat?.mean_motion, null);
  if (meanMotion && meanMotion > 0) {
    return 1440 / meanMotion;
  }

  if (sat?.satrec?.no) {
    const revolutionsPerMinute = sat.satrec.no / (2 * Math.PI);
    if (Number.isFinite(revolutionsPerMinute) && revolutionsPerMinute > 0) {
      return 1 / revolutionsPerMinute;
    }
  }

  return 92;
}

function generateOrbitPath(sat, centerDate = new Date()) {
  if (!sat?.satrec) return [];

  const periodMinutes = clamp(getOrbitalPeriodMinutes(sat), 20, 1440);
  const halfPeriod = periodMinutes / 2;
  const stepMinutes = Math.max(ORBIT_SAMPLE_MINUTES, periodMinutes / MAX_ORBIT_POINTS);

  const points = [];
  for (let offset = -halfPeriod; offset <= halfPeriod; offset += stepMinutes) {
    const sampleDate = new Date(centerDate.getTime() + offset * 60 * 1000);
    const propagated = propagateSatellite(sat, sampleDate);
    if (!propagated) continue;

    points.push({
      lat: propagated.lat,
      lng: propagated.lng,
      altitude: Math.max(0.003, propagated.altitude * 1.01),
    });
  }

  return points;
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
    if (current) {
      return current;
    }
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

export default function OrbitalGlobe({ requestedView }) {
  const globeRef = useRef(null);
  const animationRef = useRef(null);
  const lastTelemetryUpdateRef = useRef(0);
  const satCacheRef = useRef({});

  const [viewMode, setViewMode] = useState('pads');
  const [padFilter, setPadFilter] = useState('all');
  const [satFilter, setSatFilter] = useState('stations');
  const [satLimit, setSatLimit] = useState(1000); // Default 1K, max 16K+
  const [selectedPad, setSelectedPad] = useState(globalLaunchPads[0]);
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

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad => padFilter === 'all' || pad.type === padFilter
    );
  }, [padFilter]);

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

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      rows.push(...data);
      setLoadingMessage(`LOADED ${rows.length.toLocaleString()} OBJECTS...`);

      if (data.length < SUPABASE_BATCH_SIZE) {
        break;
      }

      from += SUPABASE_BATCH_SIZE;
    }

    return rows;
  }, []);

  useEffect(() => {
    if (viewMode === 'wiki' || viewMode === 'pads') {
      return;
    }

    let cancelled = false;

    async function loadSatellites() {
      setSelectedSat(null);
      setHoveredSat(null);
      setSelectedOrbitPath([]);
      setLoadingSats(true);
      setLoadingMessage('QUERYING SATELLITE DATABASE...');

      try {
        let rows = satCacheRef.current.__raw;
        if (!rows) {
          rows = await fetchAllSatelliteRows();
          satCacheRef.current.__raw = rows;
        }

        if (cancelled) return;

        const matchingRows = filterSatelliteRows(rows, satFilter);
        setLoadingMessage(`PROPAGATING ${matchingRows.length.toLocaleString()} OBJECTS...`);

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
        console.error('Supabase satellite fetch error:', error);
        if (!cancelled) {
          setSatellites([]);
          setLoadingMessage('SATELLITE DATABASE ERROR');
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

  // Real-time telemetry propagation loop
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [viewMode, satellites.length]);

  const clearSatelliteSelection = useCallback(() => {
    setSelectedSat(null);
    setHoveredSat(null);
    setSelectedOrbitPath([]);
  }, []);

  const orbitalPaths = viewMode === 'satellites' && selectedSat ? selectedOrbitPath : [];

  // Density limited list of satellites for rendering
  const activeSatsToDisplay = useMemo(() => {
    if (satFilter === 'active' && satLimit > 0) {
      return satellites.slice(0, satLimit);
    }
    return satellites;
  }, [satellites, satFilter, satLimit]);

  // Dim on Hover & Hide Others on Click
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
        console.error('Wiki fetch error:', error);
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
        /* Realistic Deep Space Starfield & Atmosphere */
        .realistic-starfield {
          background-color: #000000;
          background-image: 
            radial-gradient(1.5px 1.5px at 40px 60px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 120px 180px, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 200px 90px, rgba(255,255,255,0.95), transparent),
            radial-gradient(1px 1px at 280px 240px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1.5px 1.5px at 360px 140px, rgba(200,220,255,0.85), transparent),
            radial-gradient(1px 1px at 450px 300px, rgba(255,255,255,0.65), transparent),
            radial-gradient(2px 2px at 520px 50px, rgba(255,240,200,0.8), transparent),
            radial-gradient(1px 1px at 600px 220px, rgba(255,255,255,0.7), transparent),
            radial-gradient(1.5px 1.5px at 700px 110px, rgba(255,255,255,0.9), transparent);
          background-size: 800px 400px;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #020617;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.25);
          border-radius: 10px;
        }

        .orbital-button {
          transition: all 0.15s ease;
        }

        .orbital-button:hover {
          background: rgba(255,255,255,0.12) !important;
        }

        .density-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          outline: none;
        }

        .density-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #38bdf8;
          cursor: pointer;
          border: 1px solid #ffffff;
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
        }

        .density-preset-btn {
          padding: 2px 6px;
          font-size: 0.55rem;
          font-family: monospace;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #a1a1aa;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s;
        }

        .density-preset-btn.active, .density-preset-btn:hover {
          background: #38bdf8;
          border-color: #38bdf8;
          color: #000000;
          font-weight: bold;
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
        <div
          style={{
            display: 'flex',
            gap: '0.7rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { key: 'pads', label: 'Launch Pads' },
            { key: 'satellites', label: `Live Satellites (${renderSatellites.length})` },
            { key: 'wiki', label: 'Satellite Database' },
          ].map(btn => (
            <button
              key={btn.key}
              className="orbital-button"
              onClick={() => {
                setViewMode(btn.key);
                setSelectedSat(null);
                setHoveredSat(null);
                setSelectedOrbitPath([]);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: viewMode === btn.key ? '#ffffff' : 'rgba(255,255,255,0.04)',
                border: viewMode === btn.key ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.18)',
                color: viewMode === btn.key ? '#020617' : '#ffffff',
                fontSize: '0.7rem',
                fontWeight: '700',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode === 'pads' && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['all', 'major', 'minor'].map(filter => (
              <button
                key={filter}
                className="orbital-button"
                onClick={() => setPadFilter(filter)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: padFilter === filter ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
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
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { key: 'stations', label: 'Stations' },
              { key: 'starlink', label: 'Starlink' },
              { key: 'weather', label: 'Weather' },
              { key: 'active', label: 'All Active' },
            ].map(filter => (
              <button
                key={filter.key}
                className="orbital-button"
                onClick={() => {
                  setSatFilter(filter.key);
                  setSelectedSat(null);
                  setHoveredSat(null);
                  setSelectedOrbitPath([]);
                }}
                style={{
                  padding: '0.4rem 0.7rem',
                  background: satFilter === filter.key ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.22)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
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
          className="realistic-starfield"
          style={{
            position: 'relative',
            width: '100%',
            height: '580px',
            borderRadius: '2px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.95)',
          }}
        >
          <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <ReactGlobe
              ref={globeRef}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              showAtmosphere={true}
              atmosphereColor="#38bdf8"
              atmosphereAltitude={0.15}
              backgroundColor="rgba(0,0,0,0)"
              pointsData={viewMode === 'pads' ? filteredPads : renderSatellites}
              pointLat="lat"
              pointLng="lng"
              pointAltitude={viewMode === 'pads' ? 0.015 : d => d.displayAltitude || 0.02}
              pointColor={d => (viewMode === 'pads' ? '#38bdf8' : (d.displayColor || '#ffffff'))}
              pointRadius={viewMode === 'pads' ? 0.65 : d => d.displayRadius || 0.2}
              pointResolution={4}
              pointsTransitionDuration={SATELLITE_POINT_TRANSITION}
              pathsData={viewMode === 'satellites' && selectedSat ? orbitalPaths : []}
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor={() => 'rgba(255,255,255,0.75)'}
              pathStroke={1.2}
              pathDashLength={0.025}
              pathDashGap={0.012}
              pathDashAnimateTime={5000}
              ringsData={
                viewMode === 'satellites' && selectedSat
                  ? [selectedSat]
                  : viewMode === 'pads' && selectedPad
                  ? [selectedPad]
                  : []
              }
              ringColor={() => '#ffffff'}
              ringMaxRadius={2.5}
              ringPropagationSpeed={1.5}
              ringRepeatPeriod={1000}
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
                      background:rgba(2,6,23,0.96);
                      border:1px solid rgba(255,255,255,0.5);
                      padding:10px 12px;
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                      min-width:180px;
                    ">
                      <div style="font-weight:700;font-size:12px;margin-bottom:5px;">
                        ${d.name || 'LAUNCH PAD'}
                      </div>
                      <div>${d.country || ''}</div>
                      <div style="margin-top:4px;color:#aaa;">
                        LAT ${Number(d.lat).toFixed(4)}°<br/>LNG ${Number(d.lng).toFixed(4)}°
                      </div>
                    </div>
                  `;
                }

                const altVal = Number.isFinite(Number(d.altitudeKm))
                  ? Number(d.altitudeKm).toFixed(1) + ' km'
                  : 'N/A';

                const velVal = Number.isFinite(Number(d.velocityKmS))
                  ? Number(d.velocityKmS).toFixed(2) + ' km/s'
                  : 'N/A';

                return `
                  <div style="
                    background:rgba(2,6,23,0.97);
                    border:1px solid rgba(255,255,255,0.55);
                    padding:10px 12px;
                    color:#fff;
                    font-family:monospace;
                    font-size:11px;
                    min-width:190px;
                  ">
                    <div style="font-weight:700;font-size:12px;margin-bottom:6px;">
                      ${d.name || 'UNKNOWN SATELLITE'}
                    </div>
                    <div style="color:#aaa;">NORAD: ${d.id ?? 'N/A'}</div>
                    <div style="margin-top:4px;">
                      LAT: ${Number.isFinite(Number(d.lat)) ? Number(d.lat).toFixed(4) + '°' : 'N/A'}
                    </div>
                    <div>
                      LNG: ${Number.isFinite(Number(d.lng)) ? Number(d.lng).toFixed(4) + '°' : 'N/A'}
                    </div>
                    <div style="color:#38bdf8;">
                      ALT: ${altVal}
                    </div>
                    <div style="color:#4ade80;">
                      VELOCITY: ${velVal}
                    </div>
                    <div style="margin-top:5px;color:#888;">
                      LIVE TLE PROPAGATION
                    </div>
                  </div>
                `;
              }}
            />
          </div>

          {/* Density Limit Controller Sidebar (Visible in All Active & Satellites view) */}
          {viewMode === 'satellites' && satFilter === 'active' && !selectedSat && (
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                top: '5rem',
                background: 'rgba(2,6,23,0.90)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                zIndex: 15,
                fontFamily: 'monospace',
                width: '185px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#a1a1aa', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  VISIBLE SATS
                </span>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>
                  {satLimit >= 16000 ? '16K+ (MAX)' : `${satLimit.toLocaleString()}`}
                </span>
              </div>

              <input
                type="range"
                min="500"
                max="16000"
                step="500"
                value={satLimit}
                onChange={e => setSatLimit(Number(e.target.value))}
                className="density-slider"
                style={{ width: '100%', marginBottom: '0.6rem' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {[500, 1000, 2500, 5000, 10000, 16000].map(val => (
                  <button
                    key={val}
                    onClick={() => setSatLimit(val)}
                    className={`density-preset-btn ${satLimit === val ? 'active' : ''}`}
                  >
                    {val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '6px', fontSize: '0.5rem', color: '#71717a', textAlign: 'center' }}>
                DATABASE: {satellites.length.toLocaleString()} LOADED
              </div>
            </div>
          )}

          {viewMode === 'satellites' && (
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                bottom: '1rem',
                background: 'rgba(2,6,23,0.88)',
                border: '1px solid rgba(255,255,255,0.18)',
                padding: '0.55rem 0.8rem',
                zIndex: 10,
                fontFamily: 'monospace',
              }}
            >
              <div style={{ fontSize: '0.6rem', color: '#ffffff', letterSpacing: '1px' }}>
                ● LIVE ORBITAL PROPAGATION
              </div>
              <div style={{ marginTop: '3px', fontSize: '0.55rem', color: '#71717a' }}>
                REALTIME SGP4 (1s Continuous Update)
              </div>
            </div>
          )}

          {loadingSats && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(2,6,23,0.92)',
                padding: '0.5rem 0.8rem',
                border: '1px solid rgba(255,255,255,0.25)',
                zIndex: 10,
              }}
            >
              <span style={{ fontSize: '0.6rem', color: '#ffffff', letterSpacing: '1px' }}>
                {loadingMessage || 'LOADING ORBITAL DATA...'}
              </span>
            </div>
          )}

          {viewMode === 'satellites' && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: 'rgba(2,6,23,0.88)',
                border: '1px solid rgba(255,255,255,0.18)',
                padding: '0.5rem 0.75rem',
                zIndex: 10,
              }}
            >
              <div style={{ fontSize: '0.55rem', color: '#71717a', letterSpacing: '1px' }}>
                ACTIVE ON GLOBE
              </div>
              <div style={{ fontFamily: 'monospace', color: '#ffffff', fontSize: '0.9rem', fontWeight: '700' }}>
                {renderSatellites.length.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.15)',
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
            <span
              style={{
                fontSize: '0.7rem',
                color: '#ffffff',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontWeight: '800',
              }}
            >
              CATALOG SEARCH
            </span>

            <input
              type="text"
              placeholder="Search name or NORAD ID..."
              value={wikiSearch}
              onChange={e => {
                setWikiSearch(e.target.value);
                setWikiPage(0);
              }}
              style={{
                background: '#050505',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '0.55rem 1rem',
                color: '#fff',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                width: '320px',
                outline: 'none',
              }}
            />
          </div>

          <div className="orbital-scroll" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                color: '#d1d5db',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    textAlign: 'left',
                    color: '#ffffff',
                    background: '#050505',
                  }}
                >
                  <th style={{ padding: '0.6rem' }}>NORAD ID</th>
                  <th style={{ padding: '0.6rem' }}>OBJECT NAME</th>
                  <th style={{ padding: '0.6rem' }}>ORGANIZATION</th>
                  <th style={{ padding: '0.6rem' }}>LAT</th>
                  <th style={{ padding: '0.6rem' }}>LNG</th>
                  <th style={{ padding: '0.6rem' }}>ALT</th>
                </tr>
              </thead>
              <tbody>
                {wikiData.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '0.6rem', color: '#ffffff' }}>{item.id}</td>
                    <td style={{ padding: '0.6rem', color: '#ffffff', fontWeight: 'bold' }}>{item.name}</td>
                    <td style={{ padding: '0.6rem' }}>{item.organization || 'Unknown'}</td>
                    <td style={{ padding: '0.6rem' }}>
                      {Number.isFinite(Number(item.lat)) ? Number(item.lat).toFixed(4) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {Number.isFinite(Number(item.lng)) ? Number(item.lng).toFixed(4) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem' }}>
                      {Number.isFinite(Number(item.altitude))
                        ? `${Number(item.altitude).toFixed(1)} km`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {wikiData.length === 0 && !loadingSats && (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#71717a',
                  fontFamily: 'monospace',
                  fontSize: '0.7rem',
                }}
              >
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
              borderTop: '1px solid rgba(255,255,255,0.12)',
              paddingTop: '0.8rem',
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#71717a', fontFamily: 'monospace' }}>
              PAGE {wikiPage + 1} OF {Math.max(1, maxPages)}
            </span>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="orbital-button"
                disabled={wikiPage === 0}
                onClick={() => setWikiPage(p => Math.max(0, p - 1))}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: wikiPage === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: wikiPage === 0 ? '#52525b' : '#ffffff',
                  fontSize: '0.65rem',
                  cursor: wikiPage === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                PREV
              </button>

              <button
                className="orbital-button"
                disabled={wikiPage + 1 >= maxPages}
                onClick={() => setWikiPage(p => p + 1)}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: wikiPage + 1 >= maxPages ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: wikiPage + 1 >= maxPages ? '#52525b' : '#ffffff',
                  fontSize: '0.65rem',
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
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(10,15,25,0.88)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              FACILITY TELEMETRY
            </span>
            <span style={{ fontSize: '0.65rem', color: '#ffffff' }}>● OPERATIONAL</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: '1rem',
              marginTop: '0.8rem',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>FACILITY</p>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: '#ffffff' }}>{selectedPad.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>AGENCY</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontWeight: '700' }}>{selectedPad.agency}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>COUNTRY / REGION</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff' }}>{selectedPad.country}</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>EXACT COORDINATES</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number(selectedPad.lat).toFixed(5)}°, {Number(selectedPad.lng).toFixed(5)}°
              </p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'satellites' && selectedSat && (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(10,15,25,0.88)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>
              TARGET ORBITAL TELEMETRY
            </span>
            <button
              onClick={clearSatelliteSelection}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a1a1aa',
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
            >
              [CLOSE]
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>OBJECT NAME</p>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '1rem', color: '#ffffff' }}>{selectedSat.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>NORAD ID</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700' }}>
                {selectedSat.id}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>ORGANIZATION</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontWeight: '700' }}>
                {selectedSat.organization || 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>LATITUDE</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.lat)) ? Number(selectedSat.lat).toFixed(4) + '°' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>LONGITUDE</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.lng)) ? Number(selectedSat.lng).toFixed(4) + '°' : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#38bdf8' }}>ALTITUDE</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: '700' }}>
                {Number.isFinite(Number(selectedSat.altitudeKm))
                  ? Number(selectedSat.altitudeKm).toFixed(1) + ' km'
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#4ade80' }}>VELOCITY</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#4ade80', fontFamily: 'monospace', fontWeight: '700' }}>
                {Number.isFinite(Number(selectedSat.velocityKmS))
                  ? Number(selectedSat.velocityKmS).toFixed(2) + ' km/s'
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>INCLINATION</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {Number.isFinite(Number(selectedSat.inclination))
                  ? Number(selectedSat.inclination).toFixed(3) + '°'
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>ORBIT SOURCE</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {selectedSat.satrec ? 'LIVE SGP4' : (selectedSat.orbital_source || 'DATABASE')}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.6rem', color: '#71717a' }}>TELEMETRY TIME</p>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#ffffff', fontFamily: 'monospace' }}>
                {selectedSat.telemetryTime ? new Date(selectedSat.telemetryTime).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.2rem',
              paddingTop: '0.8rem',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '0.6rem', color: '#38bdf8', fontFamily: 'monospace' }}>
              ● REAL-TIME CONTINUOUS PROPAGATION
            </span>
            <span style={{ fontSize: '0.6rem', color: '#71717a', fontFamily: 'monospace' }}>
              CLICK ANYWHERE ON GLOBE TO RESTORE CONSTELLATION
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
