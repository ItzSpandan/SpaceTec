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
        color: '#3b82f6',
        fontFamily: 'monospace',
        fontSize: '0.8rem'
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  )
});

/* -------------------------------------------------------------------------- */
/*                                CONSTANTS                                   */
/* -------------------------------------------------------------------------- */

const EARTH_RADIUS_KM = 6371.0;
const EARTH_RADIUS_GLOBE = 1.0;

const SATELLITE_UPDATE_MS = 1000;
const ORBIT_POINTS = 181;

const SUPABASE_BATCH_SIZE = 1000;

const globalLaunchPads = [
  {
    id: 1,
    name: 'Kennedy Space Center (LC-39A)',
    agency: 'NASA / SpaceX',
    lat: 28.5858,
    lng: -80.6511,
    type: 'major',
    country: 'USA'
  },
  {
    id: 2,
    name: 'Cape Canaveral Space Force Station (SLC-40)',
    agency: 'SpaceX / USSF',
    lat: 28.5619,
    lng: -80.5772,
    type: 'major',
    country: 'USA'
  },
  {
    id: 3,
    name: 'Vandenberg Space Force Base (SLC-4E)',
    agency: 'SpaceX / USSF',
    lat: 34.742,
    lng: -120.5724,
    type: 'major',
    country: 'USA'
  },
  {
    id: 4,
    name: 'Wallops Flight Facility',
    agency: 'NASA / Northrop Grumman',
    lat: 37.9332,
    lng: -75.4836,
    type: 'minor',
    country: 'USA'
  },
  {
    id: 5,
    name: 'Boca Chica Launch Site (Starbase)',
    agency: 'SpaceX',
    lat: 25.9973,
    lng: -97.156,
    type: 'major',
    country: 'USA'
  },
  {
    id: 6,
    name: 'Pacific Spaceport Complex (Alaska)',
    agency: 'Astra / USSF',
    lat: 57.4358,
    lng: -152.3477,
    type: 'minor',
    country: 'USA'
  },
  {
    id: 7,
    name: 'Guiana Space Centre (Ariane ELA-4)',
    agency: 'ESA / Arianespace',
    lat: 5.2372,
    lng: -52.7683,
    type: 'major',
    country: 'French Guiana'
  },
  {
    id: 8,
    name: 'Esrange Space Center',
    agency: 'SSC',
    lat: 67.8894,
    lng: 21.105,
    type: 'minor',
    country: 'Sweden'
  },
  {
    id: 9,
    name: 'Andøya Spaceport',
    agency: 'Andøya Space',
    lat: 69.2933,
    lng: 16.0167,
    type: 'minor',
    country: 'Norway'
  },
  {
    id: 10,
    name: 'Baikonur Cosmodrome',
    agency: 'Roscosmos',
    lat: 45.9646,
    lng: 63.3052,
    type: 'major',
    country: 'Kazakhstan'
  },
  {
    id: 11,
    name: 'Plesetsk Cosmodrome',
    agency: 'Roscosmos',
    lat: 62.9298,
    lng: 40.5735,
    type: 'major',
    country: 'Russia'
  },
  {
    id: 12,
    name: 'Vostochny Cosmodrome',
    agency: 'Roscosmos',
    lat: 51.8841,
    lng: 128.3339,
    type: 'major',
    country: 'Russia'
  },
  {
    id: 13,
    name: 'Satish Dhawan Space Centre (SDSC)',
    agency: 'ISRO',
    lat: 13.7199,
    lng: 80.2304,
    type: 'major',
    country: 'India'
  },
  {
    id: 14,
    name: 'Jiuquan Satellite Launch Center',
    agency: 'CNSA',
    lat: 40.9575,
    lng: 100.2917,
    type: 'major',
    country: 'China'
  },
  {
    id: 15,
    name: 'Wenchang Space Launch Site',
    agency: 'CNSA',
    lat: 19.6145,
    lng: 110.951,
    type: 'major',
    country: 'China'
  },
  {
    id: 16,
    name: 'Xichang Satellite Launch Center',
    agency: 'CNSA',
    lat: 28.2465,
    lng: 102.0264,
    type: 'minor',
    country: 'China'
  },
  {
    id: 17,
    name: 'Taiyuan Satellite Launch Center',
    agency: 'CNSA',
    lat: 38.849,
    lng: 111.608,
    type: 'minor',
    country: 'China'
  },
  {
    id: 18,
    name: 'Tanegashima Space Center',
    agency: 'JAXA',
    lat: 30.4,
    lng: 130.97,
    type: 'major',
    country: 'Japan'
  },
  {
    id: 19,
    name: 'Uchinoura Space Center',
    agency: 'JAXA',
    lat: 31.2515,
    lng: 131.0825,
    type: 'minor',
    country: 'Japan'
  },
  {
    id: 20,
    name: 'Naro Space Center',
    agency: 'KARI',
    lat: 34.4315,
    lng: 127.535,
    type: 'minor',
    country: 'South Korea'
  },
  {
    id: 21,
    name: 'Mahia Launch Complex 1',
    agency: 'Rocket Lab',
    lat: -39.2608,
    lng: 177.8656,
    type: 'minor',
    country: 'New Zealand'
  },
  {
    id: 22,
    name: 'Arnhem Space Centre',
    agency: 'Equatorial Launch Australia',
    lat: -12.378,
    lng: 136.815,
    type: 'minor',
    country: 'Australia'
  },
  {
    id: 23,
    name: 'Imam Khomeini Spaceport',
    agency: 'ISA',
    lat: 35.2344,
    lng: 53.9211,
    type: 'minor',
    country: 'Iran'
  },
  {
    id: 24,
    name: 'Al-Dahik Launch Site',
    agency: 'NARSS',
    lat: 28.489,
    lng: 30.412,
    type: 'minor',
    country: 'Egypt'
  }
];

/* -------------------------------------------------------------------------- */
/*                         SAFE NUMERIC HELPERS                               */
/* -------------------------------------------------------------------------- */

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function numberOrFallback(value, fallback) {
  const n = numberOrNull(value);
  return n === null ? fallback : n;
}

function normalizeLongitude(lng) {
  let value = Number(lng);

  if (!Number.isFinite(value)) return 0;

  while (value > 180) value -= 360;
  while (value < -180) value += 360;

  return value;
}

function clampLatitude(lat) {
  const value = Number(lat);

  if (!Number.isFinite(value)) return 0;

  return Math.max(-90, Math.min(90, value));
}

function kmToGlobeAltitude(altitudeKm) {
  if (!Number.isFinite(altitudeKm)) {
    return 0.03;
  }

  /*
   * react-globe.gl uses Earth radius = 1.
   * Therefore:
   *
   * 400 km above Earth ≈ 400 / 6371 = 0.0628
   *
   * This replaces the old hard-coded 0.18 altitude which was
   * putting low-Earth satellites much too far from Earth.
   */
  return Math.max(0.002, altitudeKm / EARTH_RADIUS_KM);
}

/* -------------------------------------------------------------------------- */
/*                           TLE EXTRACTION                                   */
/* -------------------------------------------------------------------------- */

function cleanTleLine(value) {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/\r/g, '')
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function getTleLines(row) {
  /*
   * The database may have been populated with different column names
   * during the previous database work. This intentionally supports
   * several common names.
   */

  const line1Candidates = [
    row.tle_line1,
    row.tle1,
    row.line1,
    row.tle_1,
    row.tleLine1,
    row.tle_first_line,
    row.orbit_line1,
    row.sat_tle_line1
  ];

  const line2Candidates = [
    row.tle_line2,
    row.tle2,
    row.line2,
    row.tle_2,
    row.tleLine2,
    row.tle_second_line,
    row.orbit_line2,
    row.sat_tle_line2
  ];

  let line1 = null;
  let line2 = null;

  for (const candidate of line1Candidates) {
    const cleaned = cleanTleLine(candidate);

    if (cleaned && cleaned.startsWith('1 ')) {
      line1 = cleaned;
      break;
    }
  }

  for (const candidate of line2Candidates) {
    const cleaned = cleanTleLine(candidate);

    if (cleaned && cleaned.startsWith('2 ')) {
      line2 = cleaned;
      break;
    }
  }

  /*
   * Also support a single column containing:
   *
   * 1 ...
   * 2 ...
   */

  if ((!line1 || !line2) && typeof row.tle === 'string') {
    const lines = row.tle
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    const possible1 = lines.find(line => line.startsWith('1 '));
    const possible2 = lines.find(line => line.startsWith('2 '));

    if (!line1 && possible1) line1 = possible1;
    if (!line2 && possible2) line2 = possible2;
  }

  /*
   * Some datasets use orbital_line1 / orbital_line2 or TLE strings
   * with leading/trailing whitespace. The checks above already handle
   * those cases.
   */

  if (!line1 || !line2) {
    return null;
  }

  return {
    line1,
    line2
  };
}

/* -------------------------------------------------------------------------- */
/*                      SATREC / SGP4 PROPAGATION                             */
/* -------------------------------------------------------------------------- */

function createSatrec(row) {
  const tle = getTleLines(row);

  if (!tle) {
    return null;
  }

  try {
    const satrec = satellite.twoline2satrec(
      tle.line1,
      tle.line2
    );

    if (!satrec) {
      return null;
    }

    return {
      satrec,
      line1: tle.line1,
      line2: tle.line2
    };
  } catch (error) {
    console.warn(
      `Unable to parse TLE for satellite ${row?.id ?? 'unknown'}:`,
      error
    );

    return null;
  }
}

function propagateSatellite(row, date = new Date()) {
  /*
   * A row can contain a cached position but the TLE is the authoritative
   * orbital source when present.
   */

  const orbital = row.__satrec;

  if (!orbital?.satrec) {
    return null;
  }

  try {
    const positionAndVelocity = satellite.propagate(
      orbital.satrec,
      date
    );

    if (!positionAndVelocity) {
      return null;
    }

    const positionEci = positionAndVelocity.position;

    if (
      !positionEci ||
      !Number.isFinite(positionEci.x) ||
      !Number.isFinite(positionEci.y) ||
      !Number.isFinite(positionEci.z)
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geodetic = satellite.eciToGeodetic(
      positionEci,
      gmst
    );

    if (!geodetic) {
      return null;
    }

    const longitudeDeg =
      satellite.degreesLong(geodetic.longitude);

    const latitudeDeg =
      satellite.degreesLat(geodetic.latitude);

    const altitudeKm = Number(geodetic.height);

    let velocityKmS = null;

    const velocityEci = positionAndVelocity.velocity;

    if (
      velocityEci &&
      Number.isFinite(velocityEci.x) &&
      Number.isFinite(velocityEci.y) &&
      Number.isFinite(velocityEci.z)
    ) {
      velocityKmS = Math.sqrt(
        velocityEci.x ** 2 +
        velocityEci.y ** 2 +
        velocityEci.z ** 2
      );
    }

    if (
      !Number.isFinite(latitudeDeg) ||
      !Number.isFinite(longitudeDeg) ||
      !Number.isFinite(altitudeKm)
    ) {
      return null;
    }

    return {
      lat: clampLatitude(latitudeDeg),
      lng: normalizeLongitude(longitudeDeg),
      altitudeKm,
      altitude: kmToGlobeAltitude(altitudeKm),
      velocityKmS
    };
  } catch (error) {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                     FALLBACK DATABASE POSITION                             */
/* -------------------------------------------------------------------------- */

function getFallbackPosition(row) {
  const lat = numberOrNull(row.lat);
  const lng = numberOrNull(row.lng);

  if (lat === null || lng === null) {
    return {
      lat: 0,
      lng: 0,
      altitudeKm: numberOrFallback(row.altitude_km, 400),
      altitude: kmToGlobeAltitude(
        numberOrFallback(row.altitude_km, 400)
      ),
      velocityKmS: numberOrNull(row.velocity)
    };
  }

  /*
   * Your previous database may have altitude stored either as:
   *
   * altitude
   * altitude_km
   *
   * If altitude is suspiciously small/large we still use a sane fallback.
   */

  let altitudeKm = numberOrNull(row.altitude_km);

  if (altitudeKm === null) {
    altitudeKm = numberOrNull(row.altitude);
  }

  if (altitudeKm === null) {
    altitudeKm = 400;
  }

  /*
   * If a previous globe snapshot stored altitude as a globe ratio,
   * convert it back approximately.
   */
  if (altitudeKm > 0 && altitudeKm < 1) {
    altitudeKm *= EARTH_RADIUS_KM;
  }

  return {
    lat: clampLatitude(lat),
    lng: normalizeLongitude(lng),
    altitudeKm,
    altitude: kmToGlobeAltitude(altitudeKm),
    velocityKmS: numberOrNull(row.velocity)
  };
}

/* -------------------------------------------------------------------------- */
/*                         SATELLITE FORMATTER                                */
/* -------------------------------------------------------------------------- */

function formatSatellite(row) {
  const name = row.name || 'UNKNOWN SATELLITE';

  const parsed = createSatrec(row);

  const base = {
    ...row,

    id: row.id,
    name,

    /*
     * Preserve the original database data so the inspector can still
     * display fields added during the database work.
     */

    organization:
      row.organization ||
      row.agency ||
      row.owner ||
      row.operator ||
      'N/A',

    tleLine1:
      parsed?.line1 ||
      getTleLines(row)?.line1 ||
      null,

    tleLine2:
      parsed?.line2 ||
      getTleLines(row)?.line2 ||
      null,

    __satrec: parsed,

    hasRealOrbit: Boolean(parsed),

    /*
     * Color grouping.
     */

    color: name.toUpperCase().includes('ISS')
      ? '#22c55e'
      : name.toUpperCase().includes('STARLINK')
        ? '#38bdf8'
        : name.toUpperCase().includes('NOAA') ||
          name.toUpperCase().includes('GOES')
          ? '#f59e0b'
          : '#3b82f6'
  };

  const propagated = parsed
    ? propagateSatellite(base, new Date())
    : null;

  const position =
    propagated ||
    getFallbackPosition(row);

  return {
    ...base,

    lat: position.lat,
    lng: position.lng,

    altitudeKm: position.altitudeKm,
    altitude: position.altitude,

    velocityKmS:
      position.velocityKmS ??
      numberOrNull(row.velocity),

    /*
     * Keep velocity in a human-readable form for the existing UI.
     */
    velocity:
      position.velocityKmS !== null &&
      Number.isFinite(position.velocityKmS)
        ? `${position.velocityKmS.toFixed(2)} km/s`
        : row.velocity
          ? String(row.velocity)
          : 'N/A',

    inclination:
      numberOrNull(row.inclination) ??
      numberOrNull(row.inclination_deg) ??
      null,

    epoch:
      row.epoch ||
      row.tle_epoch ||
      row.tleEpoch ||
      null
  };
}

/* -------------------------------------------------------------------------- */
/*                      LIVE POSITION UPDATE                                  */
/* -------------------------------------------------------------------------- */

function updateSatellitePosition(sat, date) {
  if (!sat.__satrec?.satrec) {
    return sat;
  }

  const propagated = propagateSatellite(sat, date);

  if (!propagated) {
    return sat;
  }

  return {
    ...sat,

    lat: propagated.lat,
    lng: propagated.lng,

    altitudeKm: propagated.altitudeKm,
    altitude: propagated.altitude,

    velocityKmS: propagated.velocityKmS,

    velocity:
      propagated.velocityKmS !== null
        ? `${propagated.velocityKmS.toFixed(2)} km/s`
        : sat.velocity
  };
}

/* -------------------------------------------------------------------------- */
/*                     REAL ORBIT PATH GENERATOR                              */
/* -------------------------------------------------------------------------- */

function generateOrbitPath(sat) {
  if (!sat?.__satrec?.satrec) {
    return [];
  }

  const now = new Date();

  /*
   * Estimate orbital period from the SGP4 satrec when possible.
   * satrec.no is radians/minute.
   *
   * 2π / mean motion gives minutes/orbit.
   */

  let periodMinutes = 90;

  if (
    Number.isFinite(sat.__satrec.satrec.no) &&
    sat.__satrec.satrec.no > 0
  ) {
    periodMinutes =
      (2 * Math.PI) /
      sat.__satrec.satrec.no;
  }

  /*
   * Keep pathological values from creating a gigantic orbit.
   */

  periodMinutes = Math.max(
    20,
    Math.min(24 * 60, periodMinutes)
  );

  const points = [];

  /*
   * One complete orbit centred around "now".
   */

  const halfPeriodMs =
    (periodMinutes * 60 * 1000) / 2;

  for (let i = 0; i < ORBIT_POINTS; i++) {
    const ratio = i / (ORBIT_POINTS - 1);

    const timeOffset =
      -halfPeriodMs +
      ratio * halfPeriodMs * 2;

    const date = new Date(
      now.getTime() + timeOffset
    );

    const position = propagateSatellite(
      sat,
      date
    );

    if (!position) continue;

    points.push({
      lat: position.lat,
      lng: position.lng,
      altitude: position.altitude
    });
  }

  return points.length > 1 ? [points] : [];
}

/* -------------------------------------------------------------------------- */
/*                              COMPONENT                                     */
/* -------------------------------------------------------------------------- */

export default function OrbitalGlobe({ requestedView }) {
  const globeRef = useRef(null);

  const [viewMode, setViewMode] =
    useState('pads');

  const [padFilter, setPadFilter] =
    useState('all');

  const [satFilter, setSatFilter] =
    useState('stations');

  const [selectedPad, setSelectedPad] =
    useState(globalLaunchPads[0]);

  const [selectedSat, setSelectedSat] =
    useState(null);

  const [hoveredSat, setHoveredSat] =
    useState(null);

  const [satellites, setSatellites] =
    useState([]);

  const [loadingSats, setLoadingSats] =
    useState(false);

  const [orbitLoading, setOrbitLoading] =
    useState(false);

  const [wikiData, setWikiData] =
    useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const pageSize = 50;

  const satCacheRef =
    useRef({});

  const animationFrameRef =
    useRef(null);

  const lastUpdateRef =
    useRef(0);

  const selectedSatIdRef =
    useRef(null);

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  useEffect(() => {
    selectedSatIdRef.current =
      selectedSat?.id ?? null;
  }, [selectedSat]);

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad =>
        padFilter === 'all' ||
        pad.type === padFilter
    );
  }, [padFilter]);

  /* ---------------------------------------------------------------------- */
  /*                   FETCH SATELLITES FROM SUPABASE                       */
  /* ---------------------------------------------------------------------- */

  const fetchSatelliteRows = useCallback(
    async filter => {
      const allRows = [];

      let from = 0;

      let keepGoing = true;

      while (keepGoing) {
        let query = supabase
          .from('satellites')
          .select('*')
          .range(
            from,
            from + SUPABASE_BATCH_SIZE - 1
          );

        if (filter === 'stations') {
          query = query.ilike(
            'name',
            '%ISS%'
          );
        }

        if (filter === 'starlink') {
          query = query.ilike(
            'name',
            '%STARLINK%'
          );
        }

        if (filter === 'weather') {
          query = query.or(
            'name.ilike.%NOAA%,name.ilike.%GOES%'
          );
        }

        /*
         * "active" deliberately has no 1,500-record cap.
         *
         * Supabase/PostgREST will return batches and we continue until
         * the database has no more records.
         */

        const {
          data,
          error
        } = await query;

        if (error) {
          throw error;
        }

        const batch = data || [];

        allRows.push(...batch);

        if (
          batch.length < SUPABASE_BATCH_SIZE
        ) {
          keepGoing = false;
        } else {
          from += SUPABASE_BATCH_SIZE;
        }

        /*
         * Safety guard.
         *
         * This prevents an accidental infinite loop if a malformed
         * backend response ever repeats the same page.
         */

        if (from > 1000000) {
          keepGoing = false;
        }
      }

      return allRows;
    },
    []
  );

  useEffect(() => {
    if (viewMode === 'wiki') return;

    let cancelled = false;

    const fetchSupabaseSatellites =
      async () => {
        const cacheKey = satFilter;

        if (satCacheRef.current[cacheKey]) {
          setSatellites(
            satCacheRef.current[cacheKey]
          );
          return;
        }

        setLoadingSats(true);

        try {
          const rows =
            await fetchSatelliteRows(
              satFilter
            );

          if (cancelled) return;

          const formattedSats =
            rows.map(formatSatellite);

          satCacheRef.current[cacheKey] =
            formattedSats;

          setSatellites(formattedSats);
        } catch (error) {
          if (!cancelled) {
            console.error(
              'Supabase satellite fetch error:',
              error
            );

            setSatellites([]);
          }
        } finally {
          if (!cancelled) {
            setLoadingSats(false);
          }
        }
      };

    fetchSupabaseSatellites();

    return () => {
      cancelled = true;
    };
  }, [
    satFilter,
    viewMode,
    fetchSatelliteRows
  ]);

  /* ---------------------------------------------------------------------- */
  /*                         WIKI DATABASE                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (viewMode !== 'wiki') return;

    let cancelled = false;

    const fetchWikiCatalog =
      async () => {
        setLoadingSats(true);

        try {
          const from =
            wikiPage * pageSize;

          const to =
            from + pageSize - 1;

          let query = supabase
            .from('satellites')
            .select('*', {
              count: 'exact'
            });

          const trimmedSearch =
            wikiSearch.trim();

          if (trimmedSearch !== '') {
            /*
             * Numeric searches check both:
             * - name
             * - numeric database id
             */

            if (
              /^\d+$/.test(
                trimmedSearch
              )
            ) {
              query = query.or(
                `name.ilike.%${trimmedSearch}%,id.eq.${trimmedSearch}`
              );
            } else {
              query = query.ilike(
                'name',
                `%${trimmedSearch}%`
              );
            }
          }

          const {
            data,
            count,
            error
          } = await query
            .order('id', {
              ascending: true
            })
            .range(from, to);

          if (error) {
            throw error;
          }

          if (cancelled) return;

          setWikiData(data || []);
          setTotalWikiCount(
            count || 0
          );
        } catch (error) {
          if (!cancelled) {
            console.error(
              'Wiki fetch error:',
              error
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingSats(false);
          }
        }
      };

    const timer =
      setTimeout(
        fetchWikiCatalog,
        300
      );

    return () =>
      clearTimeout(timer);
  }, [
    wikiSearch,
    wikiPage,
    viewMode
  ]);

  /* ---------------------------------------------------------------------- */
  /*                    REAL-TIME SGP4 ANIMATION                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (viewMode !== 'satellites') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current = null;
      }

      return undefined;
    }

    const animate = timestamp => {
      if (
        timestamp -
          lastUpdateRef.current >=
        SATELLITE_UPDATE_MS
      ) {
        lastUpdateRef.current =
          timestamp;

        const now = new Date();

        setSatellites(previous => {
          if (!previous.length) {
            return previous;
          }

          let changed = false;

          const updated =
            previous.map(sat => {
              const next =
                updateSatellitePosition(
                  sat,
                  now
                );

              if (
                next.lat !== sat.lat ||
                next.lng !== sat.lng ||
                next.altitude !==
                  sat.altitude
              ) {
                changed = true;
              }

              return next;
            });

          return changed
            ? updated
            : previous;
        });

        /*
         * Keep the selected satellite synced to its freshly propagated
         * object. We do this by ID rather than keeping a stale object.
         */

        const selectedId =
          selectedSatIdRef.current;

        if (selectedId !== null) {
          setSelectedSat(current => {
            if (!current) {
              return current;
            }

            const refreshed =
              satellitesRefLookup(
                selectedId,
                now
              );

            return refreshed || current;
          });
        }
      }

      animationFrameRef.current =
        requestAnimationFrame(
          animate
        );
    };

    animationFrameRef.current =
      requestAnimationFrame(
        animate
      );

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }
    };
  }, [viewMode]);

  /*
   * This helper intentionally does not mutate state.
   * The selected satellite is also updated from the current satellites
   * state in the separate effect below.
   */

  const satellitesRefLookup = (
    selectedId,
    date
  ) => {
    const current =
      satCacheRef.current[
        satFilter
      ];

    if (!current) {
      return null;
    }

    const sat =
      current.find(
        item =>
          item.id === selectedId
      );

    if (!sat) {
      return null;
    }

    return updateSatellitePosition(
      sat,
      date
    );
  };

  /* ---------------------------------------------------------------------- */
  /*                  KEEP SELECTED SATELLITE LIVE                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      !selectedSat
    ) {
      return undefined;
    }

    const timer =
      setInterval(() => {
        setSatellites(current => {
          const match =
            current.find(
              sat =>
                sat.id ===
                selectedSat.id
            );

          if (!match) {
            return current;
          }

          setSelectedSat(
            updateSatellitePosition(
              match,
              new Date()
            )
          );

          return current;
        });
      }, SATELLITE_UPDATE_MS);

    return () =>
      clearInterval(timer);
  }, [
    viewMode,
    selectedSat?.id
  ]);

  /* ---------------------------------------------------------------------- */
  /*                        RENDER SATELLITES                               */
  /* ---------------------------------------------------------------------- */

  const renderSatellites =
    useMemo(() => {
      return satellites.map(sat => {
        const isFocused =
          hoveredSat?.id === sat.id ||
          selectedSat?.id === sat.id;

        const isDimmed =
          Boolean(
            hoveredSat || selectedSat
          ) && !isFocused;

        return {
          ...sat,

          displayColor:
            isDimmed
              ? 'rgba(59, 130, 246, 0.16)'
              : sat.color,

          radius:
            isFocused
              ? 1.35
              : 0.55
        };
      });
    }, [
      satellites,
      hoveredSat,
      selectedSat
    ]);

  /* ---------------------------------------------------------------------- */
  /*                         SELECTED ORBIT                                 */
  /* ---------------------------------------------------------------------- */

  const orbitalPaths =
    useMemo(() => {
      if (!selectedSat) {
        return [];
      }

      if (!selectedSat.__satrec) {
        return [];
      }

      setTimeout(() => {
        setOrbitLoading(false);
      }, 0);

      return generateOrbitPath(
        selectedSat
      );
    }, [selectedSat]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
    );

  /* ---------------------------------------------------------------------- */
  /*                            RENDER                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto'
      }}
    >
      <style>{`
        @keyframes spaceScroll {
          0% {
            background-position: 0 0;
          }

          100% {
            background-position: -1000px 500px;
          }
        }

        .moving-space-bg {
          background-color: #020617;

          background-image:
            radial-gradient(
              2px 2px at 20px 30px,
              #ffffff,
              rgba(0,0,0,0)
            ),
            radial-gradient(
              2px 2px at 40px 70px,
              #38bdf8,
              rgba(0,0,0,0)
            ),
            radial-gradient(
              1px 1px at 90px 40px,
              #ffffff,
              rgba(0,0,0,0)
            ),
            radial-gradient(
              2px 2px at 160px 120px,
              #93c5fd,
              rgba(0,0,0,0)
            );

          background-repeat: repeat;
          background-size: 350px 350px;

          animation:
            spaceScroll 25s linear infinite;
        }

        .orbital-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .orbital-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
        }

        .orbital-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(56,189,248,0.35);
        }
      `}</style>

      {/* ---------------------------------------------------------------- */}
      {/* VIEW CONTROLLERS                                                 */}
      {/* ---------------------------------------------------------------- */}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.8rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: '#a1a1aa',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '700'
            }}
          >
            // DISPLAY MODE:
          </span>

          {[
            {
              key: 'pads',
              label: 'Launch Pads'
            },
            {
              key: 'satellites',
              label: `Live Globe Satellites (${satellites.length})`
            },
            {
              key: 'wiki',
              label: 'Satellite Database'
            }
          ].map(btn => (
            <button
              key={btn.key}
              onClick={() => {
                setViewMode(
                  btn.key
                );

                setSelectedSat(
                  null
                );
              }}
              style={{
                padding:
                  '0.5rem 1rem',
                background:
                  viewMode ===
                  btn.key
                    ? '#3b82f6'
                    : 'rgba(255,255,255,0.05)',
                border:
                  `1px solid ${
                    viewMode ===
                    btn.key
                      ? '#3b82f6'
                      : 'rgba(255,255,255,0.15)'
                  }`,
                color: '#ffffff',
                fontSize:
                  '0.7rem',
                fontWeight:
                  '700',
                letterSpacing:
                  '1px',
                textTransform:
                  'uppercase',
                cursor:
                  'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode ===
          'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem'
            }}
          >
            {[
              'all',
              'major',
              'minor'
            ].map(f => (
              <button
                key={f}
                onClick={() =>
                  setPadFilter(
                    f
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    padFilter ===
                    f
                      ? 'rgba(59, 130, 246, 0.4)'
                      : 'transparent',
                  border:
                    '1px solid rgba(59, 130, 246, 0.4)',
                  color:
                    '#ffffff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {viewMode ===
          'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap'
            }}
          >
            {[
              {
                key: 'stations',
                label: 'Stations'
              },
              {
                key: 'starlink',
                label: 'Starlink'
              },
              {
                key: 'weather',
                label: 'Weather'
              },
              {
                key: 'active',
                label: 'All Active'
              }
            ].map(f => (
              <button
                key={f.key}
                onClick={() =>
                  setSatFilter(
                    f.key
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.7rem',
                  background:
                    satFilter ===
                    f.key
                      ? 'rgba(56, 189, 248, 0.25)'
                      : 'transparent',
                  border:
                    '1px solid rgba(56, 189, 248, 0.4)',
                  color:
                    '#ffffff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* GLOBE                                                            */}
      {/* ---------------------------------------------------------------- */}

      {viewMode !==
      'wiki' ? (
        <div
          className="moving-space-bg"
          style={{
            position:
              'relative',
            width: '100%',
            height: '550px',
            borderRadius:
              '2px',
            overflow:
              'hidden',
            border:
              '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position:
                'absolute',
              top: 0,
              left: 0
            }}
          >
            <ReactGlobe
              ref={globeRef}

              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="rgba(0,0,0,0)"

              pointsData={
                viewMode ===
                'pads'
                  ? filteredPads
                  : renderSatellites
              }

              pointLat="lat"

              pointLng="lng"

              pointAltitude={
                viewMode ===
                'pads'
                  ? 0.02
                  : "altitude"
              }

              pointColor={d =>
                viewMode ===
                'pads'
                  ? d.type ===
                    'major'
                    ? '#3b82f6'
                    : '#2dd4bf'
                  : d.displayColor ||
                    d.color ||
                    '#3b82f6'
              }

              pointRadius={
                viewMode ===
                'pads'
                  ? 1.5
                  : d =>
                      d.radius ||
                      0.55
              }

              pointResolution={8}

              pointsMerge={false}

              pathsData={
                viewMode ===
                'satellites'
                  ? orbitalPaths
                  : []
              }

              pathPointLat="lat"

              pathPointLng="lng"

              pathPointAlt="altitude"

              pathColor={() =>
                '#38bdf8'
              }

              pathDashLength={
                0.15
              }

              pathDashGap={
                0.06
              }

              pathDashAnimateTime={
                2200
              }

              pathStroke={1.8}

              pathTransitionDuration={
                0
              }

              ringsData={
                viewMode ===
                  'satellites' &&
                selectedSat
                  ? [
                      selectedSat
                    ]
                  : viewMode ===
                      'pads' &&
                    selectedPad
                    ? [
                        selectedPad
                      ]
                    : []
              }

              ringColor={() =>
                '#38bdf8'
              }

              ringMaxRadius={5}

              ringPropagationSpeed={
                2.5
              }

              ringRepeatPeriod={
                900
              }

              onGlobeClick={() => {
                if (
                  viewMode ===
                  'satellites'
                ) {
                  setSelectedSat(
                    null
                  );
                }
              }}

              onPointClick={d => {
                if (
                  viewMode ===
                  'pads'
                ) {
                  setSelectedPad(
                    d
                  );

                  if (
                    globeRef.current
                  ) {
                    globeRef.current.pointOfView(
                      {
                        lat: d.lat,
                        lng: d.lng,
                        altitude:
                          1.5
                      },
                      1000
                    );
                  }

                  return;
                }

                setOrbitLoading(
                  true
                );

                setSelectedSat(
                  d
                );

                if (
                  globeRef.current
                ) {
                  globeRef.current.pointOfView(
                    {
                      lat: d.lat,
                      lng: d.lng,
                      altitude:
                        Math.max(
                          0.5,
                          Math.min(
                            2.0,
                            0.7 +
                              d.altitude
                          )
                        )
                    },
                    1000
                  );
                }
              }}

              onPointHover={d => {
                if (
                  viewMode ===
                  'satellites'
                ) {
                  setHoveredSat(
                    d ||
                      null
                  );
                }
              }}

              pointLabel={d => {
                const safeName =
                  String(
                    d.name ||
                      'UNKNOWN'
                  ).replace(
                    /</g,
                    '&lt;'
                  );

                if (
                  viewMode ===
                  'pads'
                ) {
                  return `
                    <div
                      style="
                        background:rgba(3,7,18,0.96);
                        padding:10px 14px;
                        border:1px solid #38bdf8;
                        font-family:monospace;
                        font-size:11px;
                        color:#fff;
                        pointer-events:none;
                      "
                    >
                      <b
                        style="
                          color:#38bdf8;
                          font-size:12px;
                        "
                      >
                        ${safeName}
                      </b>
                      <br/>
                      Agency: ${d.agency}
                      <br/>
                      Coordinates:
                      ${Number(
                        d.lat
                      ).toFixed(4)},
                      ${Number(
                        d.lng
                      ).toFixed(4)}
                    </div>
                  `;
                }

                return `
                  <div
                    style="
                      background:rgba(3,7,18,0.97);
                      padding:10px 14px;
                      border:1px solid #38bdf8;
                      font-family:monospace;
                      font-size:11px;
                      color:#fff;
                      pointer-events:none;
                      min-width:210px;
                    "
                  >
                    <b
                      style="
                        color:#38bdf8;
                        font-size:12px;
                      "
                    >
                      ${safeName}
                    </b>

                    <br/>

                    NORAD:
                    ${d.id ?? 'N/A'}

                    <br/>

                    Position:
                    ${Number(
                      d.lat
                    ).toFixed(2)}°,
                    ${Number(
                      d.lng
                    ).toFixed(2)}°

                    <br/>

                    Altitude:
                    ${
                      Number.isFinite(
                        d.altitudeKm
                      )
                        ? `${d.altitudeKm.toFixed(0)} km`
                        : 'N/A'
                    }

                    <br/>

                    Velocity:
                    ${
                      d.velocity ||
                      'N/A'
                    }

                    <br/>

                    Orbit:
                    ${
                      d.hasRealOrbit
                        ? 'SGP4 / TLE'
                        : 'DATABASE FALLBACK'
                    }
                  </div>
                `;
              }}
            />
          </div>

          {loadingSats && (
            <div
              style={{
                position:
                  'absolute',
                top:
                  '1rem',
                right:
                  '1rem',
                background:
                  'rgba(0,0,0,0.88)',
                padding:
                  '0.5rem 0.8rem',
                border:
                  '1px solid #38bdf8',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#38bdf8',
                  letterSpacing:
                    '1px'
                }}
              >
                QUERYING SATELLITE DATABASE...
              </span>
            </div>
          )}

          {viewMode ===
            'satellites' &&
            !loadingSats &&
            satellites.length >
              0 && (
              <div
                style={{
                  position:
                    'absolute',
                  bottom:
                    '0.8rem',
                  left:
                    '0.8rem',
                  background:
                    'rgba(0,0,0,0.72)',
                  border:
                    '1px solid rgba(56,189,248,0.25)',
                  padding:
                    '0.45rem 0.65rem',
                  zIndex: 5,
                  pointerEvents:
                    'none'
                }}
              >
                <div
                  style={{
                    fontSize:
                      '0.6rem',
                    color:
                      '#38bdf8',
                    letterSpacing:
                      '1px',
                    fontFamily:
                      'monospace'
                  }}
                >
                  TRACKING:{' '}
                  {satellites.length.toLocaleString()}
                </div>

                <div
                  style={{
                    fontSize:
                      '0.55rem',
                    color:
                      '#71717a',
                    marginTop:
                      '2px',
                    fontFamily:
                      'monospace'
                  }}
                >
                  SGP4 ORBITAL PROPAGATION ACTIVE
                </div>
              </div>
            )}
        </div>
      ) : (
        /* -------------------------------------------------------------- */
        /* SATELLITE DATABASE                                             */
        /* -------------------------------------------------------------- */

        <div
          style={{
            padding:
              '1.5rem',
            borderRadius:
              '2px',
            border:
              '1px solid rgba(56, 189, 248, 0.3)',
            background:
              '#000000'
          }}
        >
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              marginBottom:
                '1rem',
              flexWrap:
                'wrap',
              gap:
                '1rem'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.7rem',
                color:
                  '#38bdf8',
                letterSpacing:
                  '2px',
                textTransform:
                  'uppercase',
                fontWeight:
                  '800'
              }}
            >
              // SATELLITE DATABASE
              {' '}
              (TOTAL MATCHES:{' '}
              {totalWikiCount}
              )
            </span>

            <input
              type="text"
              placeholder="Search by name or NORAD ID across all records..."
              value={
                wikiSearch
              }
              onChange={e => {
                setWikiSearch(
                  e.target
                    .value
                );

                setWikiPage(
                  0
                );
              }}
              style={{
                background:
                  'rgba(0,0,0,0.8)',
                border:
                  '1px solid rgba(56, 189, 248, 0.4)',
                padding:
                  '0.5rem 1rem',
                color:
                  '#fff',
                fontSize:
                  '0.75rem',
                fontFamily:
                  'monospace',
                width:
                  '320px',
                maxWidth:
                  '100%',
                outline:
                  'none'
              }}
            />
          </div>

          <div
            className="orbital-scrollbar"
            style={{
              maxHeight:
                '420px',
              overflowY:
                'auto'
            }}
          >
            <table
              style={{
                width:
                  '100%',
                borderCollapse:
                  'collapse',
                fontSize:
                  '0.75rem',
                fontFamily:
                  'monospace',
                color:
                  '#d1d5db',
                background:
                  'transparent'
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      '1px solid rgba(56, 189, 248, 0.3)',
                    textAlign:
                      'left',
                    color:
                      '#38bdf8',
                    background:
                      'rgba(0,0,0,0.4)'
                  }}
                >
                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    NORAD ID
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    OBJECT NAME
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    ORGANIZATION
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  item => (
                    <tr
                      key={
                        item.id
                      }
                      style={{
                        borderBottom:
                          '1px solid rgba(255,255,255,0.05)',
                        background:
                          'transparent'
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#2dd4bf'
                        }}
                      >
                        {
                          item.id
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#fff',
                          fontWeight:
                            'bold'
                        }}
                      >
                        {
                          item.name
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem'
                        }}
                      >
                        {
                          item.organization ||
                          'Unknown'
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#38bdf8'
                        }}
                      >
                        ACTIVE
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* PAGINATION                                                   */}
          {/* ------------------------------------------------------------ */}

          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              marginTop:
                '1rem',
              borderTop:
                '1px solid rgba(56, 189, 248, 0.2)',
              paddingTop:
                '0.8rem',
              background:
                'transparent'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.65rem',
                color:
                  '#a1a1aa'
              }}
            >
              PAGE{' '}
              {wikiPage +
                1}{' '}
              OF{' '}
              {Math.max(
                1,
                maxPages
              )}
            </span>

            <div
              style={{
                display:
                  'flex',
                gap:
                  '0.5rem'
              }}
            >
              <button
                disabled={
                  wikiPage ===
                  0
                }
                onClick={() =>
                  setWikiPage(
                    p =>
                      Math.max(
                        0,
                        p - 1
                      )
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage ===
                    0
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(56, 189, 248, 0.2)',
                  border:
                    '1px solid rgba(56, 189, 248, 0.4)',
                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#ffffff',
                  fontSize:
                    '0.65rem',
                  cursor:
                    wikiPage ===
                    0
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                PREV PAGE
              </button>

              <button
                disabled={
                  wikiPage +
                    1 >=
                  maxPages
                }
                onClick={() =>
                  setWikiPage(
                    p =>
                      p + 1
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(56, 189, 248, 0.2)',
                  border:
                    '1px solid rgba(56, 189, 248, 0.4)',
                  color:
                    wikiPage +
                      1 >=
                    maxPages
                      ? '#52525b'
                      : '#ffffff',
                  fontSize:
                    '0.65rem',
                  cursor:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                NEXT PAGE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---------------------------------------------------------------- */}
      {/* LAUNCH PAD INSPECTOR                                             */}
      {/* ---------------------------------------------------------------- */}

      {viewMode ===
        'pads' &&
        selectedPad && (
          <div
            className="glass-card"
            style={{
              padding:
                '1.5rem',
              borderRadius:
                '2px',
              border:
                '1px solid rgba(59, 130, 246, 0.3)',
              background:
                'rgba(10, 15, 25, 0.85)'
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#3b82f6',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
                  fontWeight:
                    '800'
                }}
              >
                // ACTIVE LAUNCH FACILITY TELEMETRY
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#2dd4bf'
                }}
              >
                STATUS: OPERATIONAL
              </span>
            </div>

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(200px, 1fr))',
                gap:
                  '1rem',
                marginTop:
                  '0.8rem'
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  FACILITY NAME
                </p>

                <h3
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '1rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {
                    selectedPad.name
                  }
                </h3>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  OPERATING AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#3b82f6',
                    fontWeight:
                      '700'
                  }}
                >
                  {
                    selectedPad.agency
                  }
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  COUNTRY / REGION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {
                    selectedPad.country
                  }
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#2dd4bf'
                  }}
                >
                  {selectedPad.lat.toFixed(
                    4
                  )}
                  °,{' '}
                  {selectedPad.lng.toFixed(
                    4
                  )}
                  °
                </p>
              </div>
            </div>
          </div>
        )}

      {/* ---------------------------------------------------------------- */}
      {/* SELECTED SATELLITE INSPECTOR                                     */}
      {/* ---------------------------------------------------------------- */}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            className="glass-card"
            style={{
              padding:
                '1.5rem',
              borderRadius:
                '2px',
              border:
                '1px solid rgba(56, 189, 248, 0.3)',
              background:
                'rgba(10, 15, 25, 0.85)'
            }}
          >
            <div
              style={{
                display:
                  'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#38bdf8',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
                  fontWeight:
                    '800'
                }}
              >
                // SATELLITE ORBITAL INSPECTOR & TELEMETRY
              </span>

              <button
                onClick={() =>
                  setSelectedSat(
                    null
                  )
                }
                style={{
                  background:
                    'transparent',
                  border:
                    'none',
                  color:
                    '#a1a1aa',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.7rem'
                }}
              >
                [CLOSE]
              </button>
            </div>

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(200px, 1fr))',
                gap:
                  '1rem',
                marginTop:
                  '0.8rem'
              }}
            >
              {/* ------------------------------------------------------ */}
              {/* OBJECT NAME                                              */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  OBJECT NAME
                </p>

                <h3
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '1rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {
                    selectedSat.name
                  }
                </h3>
              </div>

              {/* ------------------------------------------------------ */}
              {/* ORGANIZATION                                             */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  ORGANIZATION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#38bdf8',
                    fontWeight:
                      '700'
                  }}
                >
                  {
                    selectedSat.organization ||
                    'N/A'
                  }
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* NORAD ID                                                 */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  NORAD ID
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#2dd4bf',
                    fontWeight:
                      '700'
                  }}
                >
                  {
                    selectedSat.id
                  }
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* STATUS                                                   */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  POSITION SOURCE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.85rem',
                    color:
                      selectedSat.hasRealOrbit
                        ? '#2dd4bf'
                        : '#f59e0b',
                    fontWeight:
                      '700'
                  }}
                >
                  {selectedSat.hasRealOrbit
                    ? 'REAL-TIME SGP4 / TLE'
                    : 'DATABASE POSITION FALLBACK'}
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* LATITUDE                                                 */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  CURRENT LATITUDE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {Number(
                    selectedSat.lat
                  ).toFixed(
                    4
                  )}
                  °
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* LONGITUDE                                                */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  CURRENT LONGITUDE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {Number(
                    selectedSat.lng
                  ).toFixed(
                    4
                  )}
                  °
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* ALTITUDE                                                 */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  ALTITUDE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {Number.isFinite(
                    selectedSat.altitudeKm
                  )
                    ? `${selectedSat.altitudeKm.toFixed(
                        1
                      )} km`
                    : 'N/A'}
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* VELOCITY                                                */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  VELOCITY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {
                    selectedSat.velocity ||
                    'N/A'
                  }
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* INCLINATION                                             */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  INCLINATION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff'
                  }}
                >
                  {Number.isFinite(
                    selectedSat.inclination
                  )
                    ? `${Number(
                        selectedSat.inclination
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              {/* ------------------------------------------------------ */}
              {/* EPOCH                                                    */}
              {/* ------------------------------------------------------ */}

              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  TLE EPOCH
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.85rem',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace',
                    wordBreak:
                      'break-word'
                  }}
                >
                  {
                    selectedSat.epoch ||
                    'N/A'
                  }
                </p>
              </div>
            </div>

            {/* -------------------------------------------------------- */}
            {/* ORBIT STATUS BAR                                          */}
            {/* -------------------------------------------------------- */}

            <div
              style={{
                marginTop:
                  '1.2rem',
                padding:
                  '0.75rem',
                border:
                  '1px solid rgba(56,189,248,0.18)',
                background:
                  'rgba(0,0,0,0.25)',
                display:
                  'flex',
                flexWrap:
                  'wrap',
                gap:
                  '1rem',
                alignItems:
                  'center',
                justifyContent:
                  'space-between'
              }}
            >
              <div>
                <span
                  style={{
                    fontSize:
                      '0.6rem',
                    color:
                      '#71717a',
                    letterSpacing:
                      '1px'
                  }}
                >
                  TRACKING ENGINE
                </span>

                <div
                  style={{
                    marginTop:
                      '3px',
                    fontSize:
                      '0.7rem',
                    color:
                      '#38bdf8',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {selectedSat.hasRealOrbit
                    ? 'SGP4 → ECI → ECEF → GEODETIC'
                    : 'SUPABASE STORED POSITION'}
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize:
                      '0.6rem',
                    color:
                      '#71717a',
                    letterSpacing:
                      '1px'
                  }}
                >
                  ORBIT PATH
                </span>

                <div
                  style={{
                    marginTop:
                      '3px',
                    fontSize:
                      '0.7rem',
                    color:
                      selectedSat.hasRealOrbit
                        ? '#2dd4bf'
                        : '#f59e0b',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {selectedSat.hasRealOrbit
                    ? 'REAL PROPAGATED ORBIT'
                    : 'UNAVAILABLE WITHOUT TLE'}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ---------------------------------------------------------------- */}
      {/* MOBILE FRIENDLY FOOTER STATUS                                   */}
      {/* ---------------------------------------------------------------- */}

      {viewMode ===
        'satellites' &&
        !loadingSats && (
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              flexWrap:
                'wrap',
              gap:
                '0.75rem',
              padding:
                '0.65rem 0.8rem',
              border:
                '1px solid rgba(56,189,248,0.12)',
              background:
                'rgba(2,6,23,0.55)',
              fontFamily:
                'monospace'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.6rem',
                color:
                  '#71717a'
              }}
            >
              DATASET:{' '}
              <span
                style={{
                  color:
                    '#38bdf8'
                }}
              >
                {satFilter.toUpperCase()}
              </span>
            </span>

            <span
              style={{
                fontSize:
                  '0.6rem',
                color:
                  '#71717a'
              }}
            >
              OBJECTS:{' '}
              <span
                style={{
                  color:
                    '#2dd4bf'
                }}
              >
                {satellites.length.toLocaleString()}
              </span>
            </span>

            <span
              style={{
                fontSize:
                  '0.6rem',
                color:
                  '#71717a'
              }}
            >
              ENGINE:{' '}
              <span
                style={{
                  color:
                    '#38bdf8'
                }}
              >
                SGP4
              </span>
            </span>
          </div>
        )}
    </div>
  );
}
