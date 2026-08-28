'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ReactGlobe = dynamic(
  () => import('react-globe.gl'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          letterSpacing: '1px'
        }}
      >
        INITIALIZING ORBITAL ENGINE...
      </div>
    )
  }
);

/* ============================================================
   LAUNCH PADS
============================================================ */

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
    lat: 34.7420,
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
    lng: -97.1560,
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
    lng: 21.1050,
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
    lng: 110.9510,
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
    lat: 38.8490,
    lng: 111.6080,
    type: 'minor',
    country: 'China'
  },
  {
    id: 18,
    name: 'Tanegashima Space Center',
    agency: 'JAXA',
    lat: 30.4000,
    lng: 130.9700,
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
    lng: 127.5350,
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
    lat: -12.3780,
    lng: 136.8150,
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
    lat: 28.4890,
    lng: 30.4120,
    type: 'minor',
    country: 'Egypt'
  }
];

/* ============================================================
   CONSTANTS
============================================================ */

const EARTH_RADIUS_KM = 6371;
const FETCH_BATCH_SIZE = 1000;
const POSITION_UPDATE_MS = 1000;
const ORBIT_POINTS = 360;

/* ============================================================
   HELPERS
============================================================ */

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeLongitude(value) {
  let lng = Number(value);

  if (!Number.isFinite(lng)) {
    return 0;
  }

  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;

  return lng;
}

function hasValidTLE(row) {
  return (
    typeof row?.tle_line1 === 'string' &&
    row.tle_line1.trim().length >= 60 &&
    typeof row?.tle_line2 === 'string' &&
    row.tle_line2.trim().length >= 60
  );
}

function createSatrec(row) {
  if (!hasValidTLE(row)) {
    return null;
  }

  try {
    return satellite.twoline2satrec(
      row.tle_line1.trim(),
      row.tle_line2.trim()
    );
  } catch {
    return null;
  }
}

/* ============================================================
   REAL SGP4 PROPAGATION
============================================================ */

function propagateSatellite(sat, date = new Date()) {
  if (!sat?.satrec) {
    return null;
  }

  try {
    const result = satellite.propagate(
      sat.satrec,
      date
    );

    if (
      !result ||
      !result.position ||
      !result.velocity
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geodetic =
      satellite.eciToGeodetic(
        result.position,
        gmst
      );

    const lat =
      satellite.degreesLat(
        geodetic.latitude
      );

    const lng =
      normalizeLongitude(
        satellite.degreesLong(
          geodetic.longitude
        )
      );

    const altitudeKm =
      Number(geodetic.height);

    const vx = Number(result.velocity.x);
    const vy = Number(result.velocity.y);
    const vz = Number(result.velocity.z);

    const velocityKmS = Math.sqrt(
      vx * vx +
      vy * vy +
      vz * vz
    );

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(altitudeKm) ||
      !Number.isFinite(velocityKmS)
    ) {
      return null;
    }

    return {
      ...sat,

      /* REAL CURRENT POSITION */
      lat,
      lng,

      /* REAL CURRENT ORBITAL VALUES */
      altitudeKm,
      velocityKmS,

      /*
       * react-globe.gl altitude is measured
       * in Earth-radius units.
       */
      globeAltitude: Math.max(
        0.002,
        altitudeKm / EARTH_RADIUS_KM
      ),

      positionEci: result.position,
      velocityEci: result.velocity,

      telemetryTime:
        date.toISOString()
    };
  } catch {
    return null;
  }
}

/* ============================================================
   DATABASE ROW -> SATELLITE OBJECT
============================================================ */

function formatSatellite(row) {
  const satrec = createSatrec(row);

  const base = {
    ...row,

    id: row.id,

    name:
      row.name ||
      'UNKNOWN OBJECT',

    organization:
      row.organization ||
      'UNKNOWN',

    satrec,

    databaseLat:
      numberOrNull(row.lat),

    databaseLng:
      numberOrNull(row.lng),

    databaseAltitudeKm:
      numberOrNull(row.altitude),

    databaseVelocityKmS:
      numberOrNull(row.velocity),

    trackable:
      Boolean(satrec)
  };

  /*
   * If TLE works, ALWAYS use SGP4.
   * Database lat/lng are not used as live
   * coordinates in this case.
   */
  if (satrec) {
    const propagated =
      propagateSatellite(
        base,
        new Date()
      );

    if (propagated) {
      return propagated;
    }
  }

  /*
   * Non-trackable fallback.
   *
   * This is intentionally marked as a fallback
   * rather than pretending the database values
   * are live.
   */
  const fallbackAltitude =
    numberOrNull(row.altitude);

  const fallbackVelocity =
    numberOrNull(row.velocity);

  return {
    ...base,

    lat:
      numberOrNull(row.lat) ?? 0,

    lng:
      normalizeLongitude(
        numberOrNull(row.lng) ?? 0
      ),

    altitudeKm:
      fallbackAltitude ?? 0,

    velocityKmS:
      fallbackVelocity ?? 0,

    globeAltitude:
      Math.max(
        0.002,
        (fallbackAltitude ?? 0) /
          EARTH_RADIUS_KM
      ),

    telemetryTime:
      row.updated_at || null
  };
}

/* ============================================================
   ORBITAL PERIOD
============================================================ */

function getOrbitalPeriodMinutes(sat) {
  /*
   * satellite.js satrec.no is radians/minute.
   */
  if (
    sat?.satrec?.no &&
    Number.isFinite(sat.satrec.no) &&
    sat.satrec.no > 0
  ) {
    const revPerMinute =
      sat.satrec.no /
      (2 * Math.PI);

    if (
      Number.isFinite(revPerMinute) &&
      revPerMinute > 0
    ) {
      return 1 / revPerMinute;
    }
  }

  /*
   * Database fallback.
   */
  const meanMotion =
    numberOrNull(
      sat?.mean_motion
    );

  if (
    meanMotion &&
    meanMotion > 0
  ) {
    return 1440 / meanMotion;
  }

  return 90;
}

/* ============================================================
   REAL ORBIT PATH
============================================================ */

function generateOrbitPath(
  sat,
  centerDate = new Date()
) {
  if (!sat?.satrec) {
    return [];
  }

  const periodMinutes =
    Math.max(
      20,
      Math.min(
        1440,
        getOrbitalPeriodMinutes(sat)
      )
    );

  const points = [];

  for (
    let i = 0;
    i <= ORBIT_POINTS;
    i++
  ) {
    const fraction =
      i / ORBIT_POINTS;

    const offsetMinutes =
      -periodMinutes / 2 +
      fraction * periodMinutes;

    const sampleDate =
      new Date(
        centerDate.getTime() +
        offsetMinutes *
          60 *
          1000
      );

    const propagated =
      propagateSatellite(
        sat,
        sampleDate
      );

    if (!propagated) {
      continue;
    }

    points.push({
      lat: propagated.lat,
      lng: propagated.lng,

      /*
       * Keep the orbit just above
       * the globe surface / satellite path.
       */
      altitude:
        Math.max(
          0.003,
          propagated.globeAltitude + 0.004
        )
    });
  }

  /*
   * Break the line when it crosses
   * +/-180 longitude.
   */
  const paths = [];
  let current = [];

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const point = points[i];

    if (current.length > 0) {
      const previous =
        current[current.length - 1];

      if (
        Math.abs(
          point.lng -
          previous.lng
        ) > 180
      ) {
        if (current.length > 1) {
          paths.push(current);
        }

        current = [];
      }
    }

    current.push(point);
  }

  if (current.length > 1) {
    paths.push(current);
  }

  return paths;
}

/* ============================================================
   COMPONENT
============================================================ */

export default function OrbitalGlobe({
  requestedView
}) {
  const globeRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const lastUpdateRef =
    useRef(0);

  const cacheRef =
    useRef({});

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

  const [loadingMessage, setLoadingMessage] =
    useState('');

  const [wikiData, setWikiData] =
    useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const pageSize = 50;

  /* ==========================================================
     EXTERNAL VIEW
  ========================================================== */

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(
        requestedView.mode
      );
    }
  }, [requestedView]);

  /* ==========================================================
     PAD FILTER
  ========================================================== */

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad =>
        padFilter === 'all' ||
        pad.type === padFilter
    );
  }, [padFilter]);

  /* ==========================================================
     LOAD SATELLITES
  ========================================================== */

  const loadSatelliteRows =
    useCallback(
      async () => {
        const rows = [];
        let from = 0;

        while (true) {
          const to =
            from +
            FETCH_BATCH_SIZE -
            1;

          /*
           * IMPORTANT:
           *
           * We intentionally fetch the database
           * WITHOUT an "active" TLE filter.
           *
           * This avoids the problem where Supabase
           * filtering makes All Active appear empty.
           *
           * We determine trackability locally.
           */
          const {
            data,
            error
          } =
            await supabase
              .from('satellites')
              .select('*')
              .order('id', {
                ascending: true
              })
              .range(
                from,
                to
              );

          if (error) {
            throw error;
          }

          if (
            !data ||
            data.length === 0
          ) {
            break;
          }

          rows.push(...data);

          setLoadingMessage(
            `LOADING ${rows.length.toLocaleString()} OBJECTS`
          );

          if (
            data.length <
            FETCH_BATCH_SIZE
          ) {
            break;
          }

          from +=
            FETCH_BATCH_SIZE;
        }

        return rows;
      },
      []
    );

  /* ==========================================================
     APPLY FILTER LOCALLY
  ========================================================== */

  const filterSatelliteRows =
    useCallback(
      (rows, filter) => {
        if (filter === 'active') {
          /*
           * ALL ACTIVE =
           * every row that has a valid TLE.
           */
          return rows.filter(
            row =>
              hasValidTLE(row)
          );
        }

        if (filter === 'starlink') {
          return rows.filter(
            row =>
              String(
                row.name || ''
              )
                .toUpperCase()
                .includes('STARLINK')
          );
        }

        if (filter === 'weather') {
          return rows.filter(row => {
            const name =
              String(
                row.name || ''
              ).toUpperCase();

            return (
              name.includes('NOAA') ||
              name.includes('GOES') ||
              name.includes('METEOR') ||
              name.includes('METOP') ||
              name.includes('JPSS')
            );
          });
        }

        if (filter === 'stations') {
          return rows.filter(row => {
            const name =
              String(
                row.name || ''
              ).toUpperCase();

            return (
              name.includes('ISS') ||
              name.includes('CSS') ||
              name.includes('TIANGONG') ||
              name.includes('STATION')
            );
          });
        }

        return rows;
      },
      []
    );

  /* ==========================================================
     FETCH + FORMAT CURRENT FILTER
  ========================================================== */

  useEffect(() => {
    if (
      viewMode === 'pads' ||
      viewMode === 'wiki'
    ) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      setSelectedSat(null);
      setHoveredSat(null);

      const cached =
        cacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(cached);
        return;
      }

      setLoadingSats(true);
      setLoadingMessage(
        'QUERYING SATELLITE DATABASE'
      );

      try {
        let allRows;

        /*
         * Fetch database once and keep it
         * so changing filters doesn't repeatedly
         * download everything.
         */
        if (
          cacheRef.current.__raw
        ) {
          allRows =
            cacheRef.current.__raw;
        } else {
          allRows =
            await loadSatelliteRows();

          cacheRef.current.__raw =
            allRows;
        }

        if (cancelled) {
          return;
        }

        const matchingRows =
          filterSatelliteRows(
            allRows,
            satFilter
          );

        setLoadingMessage(
          `PROPAGATING ${matchingRows.length.toLocaleString()} OBJECTS`
        );

        const formatted =
          matchingRows
            .map(formatSatellite)
            .filter(
              sat =>
                Number.isFinite(
                  Number(sat.lat)
                ) &&
                Number.isFinite(
                  Number(sat.lng)
                )
            );

        /*
         * Cache the formatted filter.
         */
        cacheRef.current[
          satFilter
        ] = formatted;

        if (cancelled) {
          return;
        }

        setSatellites(formatted);
      } catch (error) {
        console.error(
          'Satellite loading error:',
          error
        );

        if (!cancelled) {
          setSatellites([]);
          setLoadingMessage(
            'SATELLITE DATABASE ERROR'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(false);

          setTimeout(() => {
            if (!cancelled) {
              setLoadingMessage('');
            }
          }, 500);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    satFilter,
    loadSatelliteRows,
    filterSatelliteRows
  ]);

  /* ==========================================================
     LIVE POSITION UPDATES
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      satellites.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;

    function updatePositions(timestamp) {
      if (cancelled) {
        return;
      }

      if (
        timestamp -
          lastUpdateRef.current >=
        POSITION_UPDATE_MS
      ) {
        lastUpdateRef.current =
          timestamp;

        const now =
          new Date();

        setSatellites(
          previous =>
            previous.map(sat => {
              if (!sat.satrec) {
                return sat;
              }

              return (
                propagateSatellite(
                  sat,
                  now
                ) || sat
              );
            })
        );

        setSelectedSat(
          current => {
            if (
              !current?.satrec
            ) {
              return current;
            }

            return (
              propagateSatellite(
                current,
                now
              ) || current
            );
          }
        );
      }

      animationRef.current =
        requestAnimationFrame(
          updatePositions
        );
    }

    animationRef.current =
      requestAnimationFrame(
        updatePositions
      );

    return () => {
      cancelled = true;

      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }
    };
  }, [
    viewMode,
    satellites.length
  ]);

  /* ==========================================================
     SELECTED ORBIT
  ========================================================== */

  const orbitalPaths = useMemo(() => {
    if (
      viewMode !== 'satellites' ||
      !selectedSat?.satrec
    ) {
      return [];
    }

    return generateOrbitPath(
      selectedSat,
      new Date()
    );
  }, [
    viewMode,
    selectedSat
  ]);

  /* ==========================================================
     DISPLAY SATELLITES
  ========================================================== */

  const renderSatellites =
    useMemo(() => {
      return satellites.map(
        sat => {
          const isSelected =
            String(
              selectedSat?.id
            ) ===
            String(sat.id);

          const isHovered =
            String(
              hoveredSat?.id
            ) ===
            String(sat.id);

          const somethingFocused =
            Boolean(
              selectedSat ||
              hoveredSat
            );

          return {
            ...sat,

            /*
             * Pure white / grey.
             */
            displayColor:
              isSelected
                ? '#ffffff'
                : isHovered
                  ? 'rgba(255,255,255,0.95)'
                  : somethingFocused
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(255,255,255,0.78)',

            /*
             * Keep markers small.
             * Altitude controls distance from
             * Earth, NOT marker size.
             */
            displayRadius:
              isSelected
                ? 0.55
                : isHovered
                  ? 0.42
                  : 0.22,

            displayAltitude:
              Math.max(
                0.002,
                Number(
                  sat.globeAltitude
                ) || 0.002
              )
          };
        }
      );
    }, [
      satellites,
      selectedSat,
      hoveredSat
    ]);

  /* ==========================================================
     WIKI
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !== 'wiki'
    ) {
      return undefined;
    }

    let cancelled = false;

    async function fetchWiki() {
      setLoadingSats(true);

      try {
        const from =
          wikiPage *
          pageSize;

        const to =
          from +
          pageSize -
          1;

        let query =
          supabase
            .from('satellites')
            .select(
              '*',
              {
                count: 'exact'
              }
            );

        const search =
          wikiSearch.trim();

        if (search) {
          if (
            /^\d+$/.test(search)
          ) {
            query =
              query.or(
                `name.ilike.%${search}%,id.eq.${search}`
              );
          } else {
            query =
              query.ilike(
                'name',
                `%${search}%`
              );
          }
        }

        const {
          data,
          count,
          error
        } =
          await query
            .order('id', {
              ascending: true
            })
            .range(
              from,
              to
            );

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        setWikiData(
          data || []
        );

        setTotalWikiCount(
          count || 0
        );
      } catch (error) {
        console.error(
          'Wiki error:',
          error
        );
      } finally {
        if (!cancelled) {
          setLoadingSats(false);
        }
      }
    }

    const timer =
      setTimeout(
        fetchWiki,
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    viewMode,
    wikiSearch,
    wikiPage
  ]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
      pageSize
    );

  /* ==========================================================
     POINT CLICK
  ========================================================== */

  const handlePointClick =
    useCallback(
      point => {
        if (
          viewMode === 'pads'
        ) {
          setSelectedPad(point);

          if (
            globeRef.current
          ) {
            globeRef.current.pointOfView(
              {
                lat: point.lat,
                lng: point.lng,
                altitude: 1.35
              },
              800
            );
          }

          return;
        }

        setSelectedSat(point);
        setHoveredSat(null);

        if (
          globeRef.current
        ) {
          globeRef.current.pointOfView(
            {
              lat: point.lat,
              lng: point.lng,
              altitude: 1.7
            },
            800
          );
        }
      },
      [viewMode]
    );

  /* ==========================================================
     POINT HOVER
  ========================================================== */

  const handlePointHover =
    useCallback(
      point => {
        if (
          viewMode === 'satellites'
        ) {
          setHoveredSat(
            point || null
          );
        }
      },
      [viewMode]
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      <style>{`
        .orbital-button {
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .orbital-button:hover {
          background:
            rgba(255,255,255,0.12) !important;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #050505;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background:
            rgba(255,255,255,0.25);
          border-radius: 10px;
        }

        .orbital-space {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 20% 20%,
              rgba(255,255,255,0.08),
              transparent 22%
            ),
            radial-gradient(
              circle at 80% 75%,
              rgba(255,255,255,0.05),
              transparent 25%
            ),
            #010204;
        }

        .orbital-space::before,
        .orbital-space::after {
          content: "";
          position: absolute;
          inset: -50%;
          pointer-events: none;
        }

        .orbital-space::before {
          opacity: 0.8;
          background-image:
            radial-gradient(
              1px 1px at 5% 10%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 15% 75%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 25% 35%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 38% 85%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 50% 20%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 62% 65%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 75% 30%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 88% 80%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 95% 45%,
              #fff,
              transparent
            );
          background-size:
            420px 420px;
          animation:
            starDrift 80s linear infinite;
        }

        .orbital-space::after {
          opacity: 0.35;
          background-image:
            radial-gradient(
              1.5px 1.5px at 12% 18%,
              #fff,
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 45% 55%,
              #fff,
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 82% 12%,
              #fff,
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 70% 88%,
              #fff,
              transparent
            );
          background-size:
            600px 600px;
          animation:
            starDriftReverse 110s linear infinite;
        }

        @keyframes starDrift {
          from {
            transform:
              translate3d(0,0,0);
          }

          to {
            transform:
              translate3d(180px,90px,0);
          }
        }

        @keyframes starDriftReverse {
          from {
            transform:
              translate3d(0,0,0);
          }

          to {
            transform:
              translate3d(-120px,-70px,0);
          }
        }
      `}</style>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              color: '#71717a',
              fontFamily: 'monospace',
              fontSize: '0.65rem',
              letterSpacing: '1.5px'
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
              label: 'Live Satellites'
            },
            {
              key: 'wiki',
              label: 'Satellite Database'
            }
          ].map(button => (
            <button
              key={button.key}
              className="orbital-button"
              onClick={() => {
                setViewMode(
                  button.key
                );
                setSelectedSat(null);
                setHoveredSat(null);
              }}
              style={{
                padding:
                  '0.5rem 0.85rem',
                background:
                  viewMode ===
                  button.key
                    ? '#fff'
                    : 'rgba(255,255,255,0.04)',
                border:
                  viewMode ===
                  button.key
                    ? '1px solid #fff'
                    : '1px solid rgba(255,255,255,0.18)',
                color:
                  viewMode ===
                  button.key
                    ? '#000'
                    : '#fff',
                fontSize:
                  '0.65rem',
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
              {button.label}
            </button>
          ))}
        </div>

        {/* PAD FILTERS */}

        {viewMode === 'pads' && (
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
            ].map(filter => (
              <button
                key={filter}
                className="orbital-button"
                onClick={() =>
                  setPadFilter(
                    filter
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.75rem',
                  background:
                    padFilter ===
                    filter
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.22)',
                  color: '#fff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer'
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* SATELLITE FILTERS */}

        {viewMode === 'satellites' && (
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
            ].map(filter => (
              <button
                key={filter.key}
                className="orbital-button"
                onClick={() => {
                  setSatFilter(
                    filter.key
                  );
                  setSelectedSat(
                    null
                  );
                  setHoveredSat(
                    null
                  );
                }}
                style={{
                  padding:
                    '0.4rem 0.7rem',
                  background:
                    satFilter ===
                    filter.key
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.22)',
                  color: '#fff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ======================================================
          GLOBE
      ====================================================== */}

      {viewMode !== 'wiki' && (
        <div
          className="orbital-space"
          style={{
            width: '100%',
            height: '550px',
            border:
              '1px solid rgba(255,255,255,0.15)',
            borderRadius:
              '2px'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1
            }}
          >
            <ReactGlobe
              ref={globeRef}

              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="rgba(0,0,0,0)"

              animateIn={true}

              pointsData={
                viewMode === 'pads'
                  ? filteredPads
                  : renderSatellites
              }

              pointLat="lat"

              pointLng="lng"

              pointAltitude={
                viewMode === 'pads'
                  ? 0.012
                  : d =>
                      d.displayAltitude ||
                      0.002
              }

              pointColor={
                d =>
                  viewMode === 'pads'
                    ? '#ffffff'
                    : d.displayColor
              }

              pointRadius={
                viewMode === 'pads'
                  ? 0.65
                  : d =>
                      d.displayRadius
                  }

              pointResolution={8}

              /* REAL ORBIT */
              pathsData={
                viewMode ===
                  'satellites' &&
                selectedSat
                  ? orbitalPaths
                  : []
              }

              pathPoints="points"

              pathPointLat="lat"

              pathPointLng="lng"

              pathPointAlt="altitude"

              pathColor={() =>
                'rgba(255,255,255,0.70)'
              }

              pathStroke={1.2}

              pathDashLength={0.02}

              pathDashGap={0.012}

              pathDashAnimateTime={5000}

              /* SELECTION RING */

              ringsData={
                viewMode ===
                  'satellites' &&
                selectedSat
                  ? [selectedSat]
                  : viewMode ===
                      'pads' &&
                    selectedPad
                    ? [selectedPad]
                    : []
              }

              ringColor={() =>
                '#ffffff'
              }

              ringMaxRadius={2.2}

              ringPropagationSpeed={1.4}

              ringRepeatPeriod={1200}

              /* CLICK */

              onPointClick={
                handlePointClick
              }

              /* HOVER */

              onPointHover={
                handlePointHover
              }

              /*
               * IMPORTANT:
               * Do NOT clear selection when
               * the pointer moves over the globe.
               *
               * This prevents the selection/orbit
               * from constantly disappearing.
               */

              pointLabel={d => {
                if (
                  viewMode ===
                  'pads'
                ) {
                  return `
                    <div style="
                      background:rgba(0,0,0,0.95);
                      border:1px solid rgba(255,255,255,0.45);
                      padding:9px 11px;
                      color:#fff;
                      font-family:monospace;
                      font-size:10px;
                    ">
                      <div style="
                        font-weight:700;
                        margin-bottom:5px;
                      ">
                        ${d.name}
                      </div>

                      <div style="color:#aaa;">
                        ${d.agency}
                      </div>

                      <div style="
                        margin-top:5px;
                        color:#aaa;
                      ">
                        LAT ${Number(d.lat).toFixed(4)}°
                        <br/>
                        LNG ${Number(d.lng).toFixed(4)}°
                      </div>
                    </div>
                  `;
                }

                return `
                  <div style="
                    background:rgba(0,0,0,0.96);
                    border:1px solid rgba(255,255,255,0.45);
                    padding:9px 11px;
                    color:#fff;
                    font-family:monospace;
                    font-size:10px;
                    min-width:180px;
                  ">
                    <div style="
                      font-weight:700;
                      margin-bottom:5px;
                    ">
                      ${d.name || 'UNKNOWN OBJECT'}
                    </div>

                    <div style="color:#999;">
                      NORAD ${d.id ?? 'N/A'}
                    </div>

                    <div style="margin-top:4px;">
                      LAT ${
                        Number.isFinite(
                          Number(d.lat)
                        )
                          ? Number(d.lat).toFixed(4) + '°'
                          : 'N/A'
                      }
                    </div>

                    <div>
                      LNG ${
                        Number.isFinite(
                          Number(d.lng)
                        )
                          ? Number(d.lng).toFixed(4) + '°'
                          : 'N/A'
                      }
                    </div>

                    <div>
                      ALT ${
                        Number.isFinite(
                          Number(d.altitudeKm)
                        )
                          ? Number(d.altitudeKm).toFixed(1) + ' km'
                          : 'N/A'
                      }
                    </div>

                    <div>
                      SPEED ${
                        Number.isFinite(
                          Number(d.velocityKmS)
                        )
                          ? Number(d.velocityKmS).toFixed(2) + ' km/s'
                          : 'N/A'
                      }
                    </div>

                    <div style="
                      margin-top:5px;
                      color:#777;
                    ">
                      SGP4 / TLE
                    </div>
                  </div>
                `;
              }}
            />
          </div>

          {/* LIVE STATUS */}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                left: '1rem',
                bottom: '1rem',
                zIndex: 5,
                background:
                  'rgba(0,0,0,0.82)',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                padding:
                  '0.55rem 0.75rem',
                fontFamily:
                  'monospace',
                pointerEvents:
                  'none'
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize:
                    '0.58rem',
                  letterSpacing:
                    '1px'
                }}
              >
                ● SGP4 LIVE PROPAGATION
              </div>

              <div
                style={{
                  color: '#666',
                  fontSize:
                    '0.5rem',
                  marginTop:
                    '3px'
                }}
              >
                CURRENT TIME → TLE → POSITION
              </div>
            </div>
          )}

          {/* LOADING */}

          {loadingSats && (
            <div
              style={{
                position:
                  'absolute',
                right: '1rem',
                top: '1rem',
                zIndex: 5,
                background:
                  'rgba(0,0,0,0.90)',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                padding:
                  '0.55rem 0.8rem',
                color: '#fff',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.58rem',
                pointerEvents:
                  'none'
              }}
            >
              {loadingMessage ||
                'LOADING ORBITAL DATA...'}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          WIKI
      ====================================================== */}

      {viewMode === 'wiki' && (
        <div
          style={{
            padding:
              '1.5rem',
            border:
              '1px solid rgba(255,255,255,0.15)',
            background:
              '#000'
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
              gap: '1rem',
              flexWrap:
                'wrap',
              marginBottom:
                '1rem'
            }}
          >
            <span
              style={{
                color: '#fff',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.7rem',
                letterSpacing:
                  '2px',
                fontWeight:
                  '800'
              }}
            >
              // SATELLITE DATABASE —{' '}
              {totalWikiCount.toLocaleString()}{' '}
              MATCHES
            </span>

            <input
              type="text"
              value={
                wikiSearch
              }
              onChange={e => {
                setWikiSearch(
                  e.target.value
                );
                setWikiPage(0);
              }}
              placeholder="Search name or NORAD ID..."
              style={{
                width:
                  '320px',
                maxWidth:
                  '100%',
                padding:
                  '0.55rem 0.8rem',
                background:
                  '#050505',
                border:
                  '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                outline:
                  'none',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.7rem'
              }}
            />
          </div>

          <div
            className="orbital-scroll"
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
                fontFamily:
                  'monospace',
                fontSize:
                  '0.7rem',
                color:
                  '#d1d5db'
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign:
                      'left',
                    borderBottom:
                      '1px solid rgba(255,255,255,0.2)',
                    background:
                      '#050505'
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
                    LAT
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    LNG
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem'
                    }}
                  >
                    ALT
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
                          '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#fff'
                        }}
                      >
                        {item.id}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#fff',
                          fontWeight:
                            '700'
                        }}
                      >
                        {item.name}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem'
                        }}
                      >
                        {item.organization ||
                          'Unknown'}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem'
                        }}
                      >
                        {Number.isFinite(
                          Number(
                            item.lat
                          )
                        )
                          ? Number(
                              item.lat
                            ).toFixed(
                              4
                            )
                          : '—'}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem'
                        }}
                      >
                        {Number.isFinite(
                          Number(
                            item.lng
                          )
                        )
                          ? Number(
                              item.lng
                            ).toFixed(
                              4
                            )
                          : '—'}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem'
                        }}
                      >
                        {Number.isFinite(
                          Number(
                            item.altitude
                          )
                        )
                          ? `${Number(
                              item.altitude
                            ).toFixed(
                              1
                            )} km`
                          : '—'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {wikiData.length ===
              0 &&
              !loadingSats && (
                <div
                  style={{
                    padding:
                      '2rem',
                    textAlign:
                      'center',
                    color:
                      '#71717a',
                    fontFamily:
                      'monospace',
                    fontSize:
                      '0.7rem'
                  }}
                >
                  NO RECORDS FOUND
                </div>
              )}
          </div>
          {/* ====================================================
              PAGINATION
          ==================================================== */}

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
              paddingTop:
                '0.8rem',
              borderTop:
                '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <span
              style={{
                color:
                  '#71717a',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.6rem'
              }}
            >
              PAGE{' '}
              {wikiPage + 1}{' '}
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
                className="orbital-button"
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
                      : 'rgba(255,255,255,0.08)',
                  border:
                    '1px solid rgba(255,255,255,0.2)',
                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#fff',
                  fontSize:
                    '0.6rem',
                  cursor:
                    wikiPage ===
                    0
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                PREV
              </button>

              <button
                className="orbital-button"
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
                      : 'rgba(255,255,255,0.08)',
                  border:
                    '1px solid rgba(255,255,255,0.2)',
                  color:
                    wikiPage +
                      1 >=
                    maxPages
                      ? '#52525b'
                      : '#fff',
                  fontSize:
                    '0.6rem',
                  cursor:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          LAUNCH PAD INSPECTOR
      ====================================================== */}

      {viewMode ===
        'pads' &&
        selectedPad && (
          <div
            style={{
              padding:
                '1.5rem',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(5,5,5,0.94)'
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
                gap:
                  '1rem'
              }}
            >
              <span
                style={{
                  color:
                    '#fff',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.65rem',
                  letterSpacing:
                    '2px',
                  fontWeight:
                    '800'
                }}
              >
                // LAUNCH FACILITY
              </span>

              <span
                style={{
                  color:
                    '#fff',
                  fontSize:
                    '0.6rem',
                  fontFamily:
                    'monospace'
                }}
              >
                ● OPERATIONAL
              </span>
            </div>

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(200px,1fr))',
                gap:
                  '1rem',
                marginTop:
                  '1rem'
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,
                    color:
                      '#71717a',
                    fontSize:
                      '0.55rem'
                  }}
                >
                  FACILITY
                </p>

                <h3
                  style={{
                    margin:
                      '0.25rem 0 0',
                    color:
                      '#fff',
                    fontSize:
                      '0.95rem'
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
                    color:
                      '#71717a',
                    fontSize:
                      '0.55rem'
                  }}
                >
                  AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '0.25rem 0 0',
                    color:
                      '#fff',
                    fontSize:
                      '0.85rem'
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
                    color:
                      '#71717a',
                    fontSize:
                      '0.55rem'
                  }}
                >
                  COUNTRY / REGION
                </p>

                <p
                  style={{
                    margin:
                      '0.25rem 0 0',
                    color:
                      '#fff',
                    fontSize:
                      '0.85rem'
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
                    color:
                      '#71717a',
                    fontSize:
                      '0.55rem'
                  }}
                >
                  EXACT COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '0.25rem 0 0',
                    color:
                      '#fff',
                    fontSize:
                      '0.85rem',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {Number(
                    selectedPad.lat
                  ).toFixed(
                    5
                  )}
                  °,{' '}
                  {Number(
                    selectedPad.lng
                  ).toFixed(
                    5
                  )}
                  °
                </p>
              </div>
            </div>
          </div>
        )}

      {/* ======================================================
          SATELLITE INSPECTOR
      ====================================================== */}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            style={{
              padding:
                '1.5rem',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(5,5,5,0.94)'
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
                  color:
                    '#fff',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.65rem',
                  letterSpacing:
                    '2px',
                  fontWeight:
                    '800'
                }}
              >
                // ORBITAL INSPECTOR
              </span>

              <button
                onClick={() =>
                  setSelectedSat(
                    null
                  )
                }
                style={{
                  border:
                    'none',
                  background:
                    'transparent',
                  color:
                    '#777',
                  cursor:
                    'pointer',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.6rem'
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
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap:
                  '1rem',
                marginTop:
                  '1rem'
              }}
            >
              <InspectorField
                label="OBJECT NAME"
                value={
                  selectedSat.name ||
                  'UNKNOWN'
                }
                large
              />

              <InspectorField
                label="NORAD ID"
                value={
                  selectedSat.id ??
                  'N/A'
                }
              />

              <InspectorField
                label="ORGANIZATION"
                value={
                  selectedSat.organization ||
                  'N/A'
                }
              />

              <InspectorField
                label="LATITUDE"
                value={
                  Number.isFinite(
                    Number(
                      selectedSat.lat
                    )
                  )
                    ? `${Number(
                        selectedSat.lat
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'
                }
                mono
              />

              <InspectorField
                label="LONGITUDE"
                value={
                  Number.isFinite(
                    Number(
                      selectedSat.lng
                    )
                  )
                    ? `${Number(
                        selectedSat.lng
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'
                }
                mono
              />

              <InspectorField
                label="ALTITUDE"
                value={
                  Number.isFinite(
                    Number(
                      selectedSat.altitudeKm
                    )
                  )
                    ? `${Number(
                        selectedSat.altitudeKm
                      ).toFixed(
                        1
                      )} km`
                    : 'N/A'
                }
                mono
              />

              <InspectorField
                label="VELOCITY"
                value={
                  Number.isFinite(
                    Number(
                      selectedSat.velocityKmS
                    )
                  )
                    ? `${Number(
                        selectedSat.velocityKmS
                      ).toFixed(
                        2
                      )} km/s`
                    : 'N/A'
                }
                mono
              />

              <InspectorField
                label="INCLINATION"
                value={
                  Number.isFinite(
                    Number(
                      selectedSat.inclination
                    )
                  )
                    ? `${Number(
                        selectedSat.inclination
                      ).toFixed(
                        3
                      )}°`
                    : 'N/A'
                }
                mono
              />

              <InspectorField
                label="ORBIT SOURCE"
                value={
                  selectedSat.orbital_source ||
                  'TLE / SGP4'
                }
              />

              <InspectorField
                label="TLE EPOCH"
                value={
                  selectedSat.tle_epoch ||
                  selectedSat.tleEpochDisplay ||
                  selectedSat.orbital_epoch ||
                  'N/A'
                }
              />
            </div>

            <div
              style={{
                marginTop:
                  '1.2rem',
                paddingTop:
                  '0.8rem',
                borderTop:
                  '1px solid rgba(255,255,255,0.1)',
                display:
                  'flex',
                justifyContent:
                  'space-between',
                gap:
                  '0.5rem',
                flexWrap:
                  'wrap'
              }}
            >
              <span
                style={{
                  color:
                    '#fff',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.58rem'
                }}
              >
                ● POSITION FROM TLE / SGP4
              </span>

              <span
                style={{
                  color:
                    '#555',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.55rem'
                }}
              >
                CURRENT TIME PROPAGATION
              </span>
            </div>
          </div>
        )}
    </div>
  );
}

/* ============================================================
   INSPECTOR FIELD
============================================================ */

function InspectorField({
  label,
  value,
  mono = false,
  large = false
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          color:
            '#71717a',
          fontSize:
            '0.55rem'
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin:
            '0.25rem 0 0',
          color:
            '#fff',
          fontSize:
            large
              ? '0.95rem'
              : '0.82rem',
          fontWeight:
            large
              ? '700'
              : '400',
          fontFamily:
            mono
              ? 'monospace'
              : 'inherit',
          wordBreak:
            'break-word'
        }}
      >
        {value}
      </p>
    </div>
  );
}
