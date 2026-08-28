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

/* ============================================================
   SUPABASE
============================================================ */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;

/* ============================================================
   GLOBE
============================================================ */

const ReactGlobe = dynamic(
  () => import('react-globe.gl'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          color: '#ffffff',
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

const SUPABASE_BATCH_SIZE = 1000;

/*
 * Keep the globe responsive.
 * The database can contain 16k+ objects, but drawing all
 * 16k simultaneously can cause WebGL flickering on browsers.
 */
const GLOBE_LIMITS = {
  stations: 1000,
  starlink: 1000,
  weather: 1000,
  active: 1500
};

const POSITION_UPDATE_MS = 1000;

const MAX_ORBIT_POINTS = 360;

/* ============================================================
   HELPERS
============================================================ */

function safeNumber(value, fallback = null) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeLongitude(value) {
  let longitude = Number(value);

  if (!Number.isFinite(longitude)) {
    return 0;
  }

  while (longitude > 180) {
    longitude -= 360;
  }

  while (longitude < -180) {
    longitude += 360;
  }

  return longitude;
}

function hasValidTLE(row) {
  return (
    typeof row?.tle_line1 === 'string' &&
    row.tle_line1.trim().length > 10 &&
    typeof row?.tle_line2 === 'string' &&
    row.tle_line2.trim().length > 10
  );
}

function buildSatrec(row) {
  if (!hasValidTLE(row)) {
    return null;
  }

  try {
    return satellite.twoline2satrec(
      row.tle_line1.trim(),
      row.tle_line2.trim()
    );
  } catch (error) {
    console.warn(
      'Invalid TLE:',
      row?.name || row?.id,
      error
    );

    return null;
  }
}

/* ============================================================
   SGP4 PROPAGATION
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

    const lat = satellite.degreesLat(
      geodetic.latitude
    );

    const lng = normalizeLongitude(
      satellite.degreesLong(
        geodetic.longitude
      )
    );

    const altitudeKm =
      Number(geodetic.height);

    const velocity = result.velocity;

    const velocityKmS = Math.sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y +
      velocity.z * velocity.z
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
      lat,
      lng,
      altitudeKm,
      velocityKmS,
      positionEci: result.position,
      velocityEci: result.velocity,

      globeAltitude: Math.max(
        0.002,
        altitudeKm / EARTH_RADIUS_KM
      ),

      telemetryTime:
        date.toISOString()
    };
  } catch (error) {
    console.warn(
      'Propagation failed:',
      sat?.name || sat?.id,
      error
    );

    return null;
  }
}

/* ============================================================
   DATABASE ROW -> SATELLITE OBJECT
============================================================ */

function formatSatellite(row) {
  const satrec = buildSatrec(row);

  const base = {
    ...row,

    id: row?.id,

    name:
      row?.name ||
      'UNKNOWN OBJECT',

    organization:
      row?.organization ||
      'UNKNOWN',

    satrec,

    databaseLat:
      safeNumber(row?.lat),

    databaseLng:
      safeNumber(row?.lng),

    databaseAltitude:
      safeNumber(row?.altitude),

    databaseVelocity:
      safeNumber(row?.velocity),

    trackable:
      Boolean(satrec)
  };

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
   * IMPORTANT:
   * Database coordinates are only a fallback.
   * They are NOT treated as live coordinates.
   */
  return {
    ...base,

    lat:
      safeNumber(
        row?.lat,
        0
      ),

    lng:
      normalizeLongitude(
        safeNumber(
          row?.lng,
          0
        )
      ),

    altitudeKm:
      safeNumber(
        row?.altitude,
        0
      ),

    velocityKmS:
      safeNumber(
        row?.velocity,
        0
      ),

    globeAltitude:
      Math.max(
        0.002,
        safeNumber(
          row?.altitude,
          0
        ) / EARTH_RADIUS_KM
      ),

    telemetryTime:
      row?.updated_at || null
  };
}

/* ============================================================
   ORBITAL PERIOD
============================================================ */

function getOrbitalPeriodMinutes(sat) {
  const meanMotion =
    safeNumber(
      sat?.mean_motion,
      null
    );

  if (
    meanMotion &&
    meanMotion > 0
  ) {
    return 1440 / meanMotion;
  }

  if (sat?.satrec?.no) {
    const revolutionsPerMinute =
      sat.satrec.no * 60 /
      (2 * Math.PI);

    if (
      Number.isFinite(
        revolutionsPerMinute
      ) &&
      revolutionsPerMinute > 0
    ) {
      return (
        1 /
        revolutionsPerMinute
      );
    }
  }

  return 90;
}

/* ============================================================
   ORBIT PATH GENERATION
============================================================ */

function generateOrbitPaths(
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

  const stepMinutes =
    Math.max(
      0.5,
      periodMinutes /
        MAX_ORBIT_POINTS
    );

  const points = [];

  for (
    let offset =
      -periodMinutes / 2;
    offset <=
      periodMinutes / 2;
    offset += stepMinutes
  ) {
    const date =
      new Date(
        centerDate.getTime() +
        offset * 60 * 1000
      );

    const propagated =
      propagateSatellite(
        sat,
        date
      );

    if (!propagated) {
      continue;
    }

    points.push({
      lat: propagated.lat,
      lng: propagated.lng,

      altitude:
        Math.max(
          0.003,
          propagated.globeAltitude +
            0.002
        )
    });
  }

  /*
   * Split the path at the international date line.
   * This prevents a fake giant line from appearing
   * between +179° and -179°.
   */
  const paths = [];

  let currentPath = [];

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const point =
      points[index];

    if (currentPath.length > 0) {
      const previous =
        currentPath[
          currentPath.length - 1
        ];

      if (
        Math.abs(
          point.lng -
          previous.lng
        ) > 180
      ) {
        if (
          currentPath.length > 1
        ) {
          paths.push(
            currentPath
          );
        }

        currentPath = [];
      }
    }

    currentPath.push(point);
  }

  if (
    currentPath.length > 1
  ) {
    paths.push(currentPath);
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

  const selectedSatRef =
    useRef(null);

  const [viewMode, setViewMode] =
    useState('pads');

  const [padFilter, setPadFilter] =
    useState('all');

  const [satFilter, setSatFilter] =
    useState('stations');

  const [selectedPad, setSelectedPad] =
    useState(
      globalLaunchPads[0]
    );

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
     KEEP SELECTED SAT REF UPDATED
  ========================================================== */

  useEffect(() => {
    selectedSatRef.current =
      selectedSat;
  }, [selectedSat]);

  /* ==========================================================
     EXTERNAL VIEW REQUEST
  ========================================================== */

  useEffect(() => {
    if (
      requestedView?.mode
    ) {
      setViewMode(
        requestedView.mode
      );
    }
  }, [requestedView]);

  /* ==========================================================
     PAD FILTER
  ========================================================== */

  const filteredPads =
    useMemo(() => {
      return globalLaunchPads.filter(
        pad =>
          padFilter === 'all' ||
          pad.type === padFilter
      );
    }, [padFilter]);

  /* ==========================================================
     SATELLITE FILTER
  ========================================================== */

  const getSatelliteFilter =
    useCallback(
      filter => {
        if (
          filter === 'stations'
        ) {
          return query =>
            query.or(
              [
                'name.ilike.%ISS%',
                'name.ilike.%CSS%',
                'name.ilike.%TIANGONG%',
                'name.ilike.%STATION%'
              ].join(',')
            );
        }

        if (
          filter === 'starlink'
        ) {
          return query =>
            query.ilike(
              'name',
              '%STARLINK%'
            );
        }

        if (
          filter === 'weather'
        ) {
          return query =>
            query.or(
              [
                'name.ilike.%NOAA%',
                'name.ilike.%GOES%',
                'name.ilike.%METEOR%',
                'name.ilike.%METOP%',
                'name.ilike.%JPSS%'
              ].join(',')
            );
        }

        /*
         * There is no active column in the schema.
         * Active = both TLE lines are present.
         */
        if (
          filter === 'active'
        ) {
          return query =>
            query
              .not(
                'tle_line1',
                'is',
                null
              )
              .not(
                'tle_line2',
                'is',
                null
              );
        }

        return query => query;
      },
      []
    );

  /* ==========================================================
     FETCH SATELLITES
  ========================================================== */

  const fetchSatelliteRows =
    useCallback(
      async filter => {
        if (!supabase) {
          throw new Error(
            'Supabase environment variables are missing.'
          );
        }

        const rows = [];

        let from = 0;

        const limit =
          GLOBE_LIMITS[
            filter
          ] || 1000;

        const applyFilter =
          getSatelliteFilter(
            filter
          );

        while (
          rows.length < limit
        ) {
          const remaining =
            limit -
            rows.length;

          const batchSize =
            Math.min(
              SUPABASE_BATCH_SIZE,
              remaining
            );

          let query =
            supabase
              .from('satellites')
              .select('*');

          query =
            applyFilter(query);

          query =
            query
              .order('id', {
                ascending: true
              })
              .range(
                from,
                from +
                  batchSize -
                  1
              );

          const {
            data,
            error
          } = await query;

          if (error) {
            throw error;
          }

          if (
            !data ||
            data.length === 0
          ) {
            break;
          }

          rows.push(
            ...data
          );

          setLoadingMessage(
            `LOADING ${rows.length.toLocaleString()} OBJECTS`
          );

          if (
            data.length <
            batchSize
          ) {
            break;
          }

          from +=
            batchSize;
        }

        return rows;
      },
      [getSatelliteFilter]
    );

  /* ==========================================================
     LOAD GLOBE SATELLITES
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !==
      'satellites'
    ) {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      const cached =
        cacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(
          cached
        );

        setLoadingSats(
          false
        );

        return;
      }

      setLoadingSats(true);

      setLoadingMessage(
        'QUERYING SATELLITE DATABASE'
      );

      try {
        const rows =
          await fetchSatelliteRows(
            satFilter
          );

        if (cancelled) {
          return;
        }

        const formatted =
          rows
            .map(
              formatSatellite
            )
            .filter(
              sat =>
                Number.isFinite(
                  Number(
                    sat.lat
                  )
                ) &&
                Number.isFinite(
                  Number(
                    sat.lng
                  )
                )
            );

        cacheRef.current[
          satFilter
        ] = formatted;

        setSatellites(
          formatted
        );
      } catch (error) {
        console.error(
          'Satellite loading error:',
          error
        );

        if (!cancelled) {
          setSatellites(
            []
          );

          setLoadingMessage(
            'SATELLITE DATABASE ERROR'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(
            false
          );
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    satFilter,
    viewMode,
    fetchSatelliteRows
  ]);

  /* ==========================================================
     LIVE SGP4 POSITION UPDATES
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !==
      'satellites' ||
      satellites.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;

    function tick(timestamp) {
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
            previous.map(
              sat => {
                if (
                  !sat.satrec
                ) {
                  return sat;
                }

                return (
                  propagateSatellite(
                    sat,
                    now
                  ) || sat
                );
              }
            )
        );

        const currentSelected =
          selectedSatRef.current;

        if (
          currentSelected?.satrec
        ) {
          const updated =
            propagateSatellite(
              currentSelected,
              now
            );

          if (updated) {
            setSelectedSat(
              updated
            );
          }
        }
      }

      animationRef.current =
        requestAnimationFrame(
          tick
        );
    }

    animationRef.current =
      requestAnimationFrame(
        tick
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

  const orbitalPaths =
    useMemo(() => {
      if (
        viewMode !==
        'satellites' ||
        !selectedSat?.satrec
      ) {
        return [];
      }

      return generateOrbitPaths(
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

  const displaySatellites =
    useMemo(() => {
      const list =
        [...satellites];

      /*
       * Allows a satellite clicked from the Wiki
       * to remain visible even if it isn't in the
       * current globe filter.
       */
      if (
        selectedSat &&
        !list.some(
          sat =>
            String(sat.id) ===
            String(
              selectedSat.id
            )
        )
      ) {
        list.push(
          selectedSat
        );
      }

      return list;
    }, [
      satellites,
      selectedSat
    ]);

  const renderSatellites =
    useMemo(() => {
      return displaySatellites.map(
        sat => {
          const selected =
            String(
              selectedSat?.id
            ) ===
            String(sat.id);

          const hovered =
            String(
              hoveredSat?.id
            ) ===
            String(sat.id);

          return {
            ...sat,

            displayColor:
              selected
                ? '#ffffff'
                : hovered
                  ? 'rgba(255,255,255,0.80)'
                  : 'rgba(255,255,255,0.38)',

            displayRadius:
              selected
                ? 0.30
                : hovered
                  ? 0.20
                  : 0.105,

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
      displaySatellites,
      selectedSat,
      hoveredSat
    ]);

  /* ==========================================================
     WIKI DATABASE
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !== 'wiki'
    ) {
      return undefined;
    }

    if (!supabase) {
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
            /^\d+$/.test(
              search
            )
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
        } = await query
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

        if (!cancelled) {
          setWikiData([]);
          setTotalWikiCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(
            false
          );
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
    wikiSearch,
    wikiPage,
    viewMode
  ]);

  const maxPages =
    Math.max(
      1,
      Math.ceil(
        totalWikiCount /
          pageSize
      )
    );

  /* ==========================================================
     CAMERA HELPERS
  ========================================================== */

  const moveCameraTo =
    useCallback(
      (
        lat,
        lng,
        altitude = 1.8,
        duration = 700
      ) => {
        if (
          !globeRef.current
        ) {
          return;
        }

        if (
          !Number.isFinite(
            Number(lat)
          ) ||
          !Number.isFinite(
            Number(lng)
          )
        ) {
          return;
        }

        globeRef.current.pointOfView(
          {
            lat: Number(lat),
            lng: Number(lng),
            altitude
          },
          duration
        );
      },
      []
    );

  const resetView =
    useCallback(() => {
      if (
        !globeRef.current
      ) {
        return;
      }

      globeRef.current.pointOfView(
        {
          lat: 20,
          lng: 0,
          altitude: 2.4
        },
        800
      );
    }, []);

  const followISS =
    useCallback(() => {
      const iss =
        displaySatellites.find(
          sat =>
            /ISS/i.test(
              sat?.name || ''
            )
        );

      if (!iss) {
        return;
      }

      setSelectedSat(
        iss
      );

      moveCameraTo(
        iss.lat,
        iss.lng,
        1.8,
        700
      );
    }, [
      displaySatellites,
      moveCameraTo
    ]);

  /* ==========================================================
     POINT CLICK
  ========================================================== */

  const handlePointClick =
    useCallback(
      point => {
        if (
          viewMode === 'pads'
        ) {
          setSelectedPad(
            point
          );

          moveCameraTo(
            point.lat,
            point.lng,
            1.4,
            700
          );

          return;
        }

        setSelectedSat(
          point
        );

        moveCameraTo(
          point.lat,
          point.lng,
          1.8,
          700
        );
      },
      [
        viewMode,
        moveCameraTo
      ]
    );

  /* ==========================================================
     WIKI ROW CLICK
  ========================================================== */

  const handleWikiSelect =
    useCallback(
      row => {
        const formatted =
          formatSatellite(
            row
          );

        setSelectedSat(
          formatted
        );

        setViewMode(
          'satellites'
        );

        setTimeout(() => {
          moveCameraTo(
            formatted.lat,
            formatted.lng,
            1.8,
            700
          );
        }, 100);
      },
      [moveCameraTo]
    );

  /* ==========================================================
     SATELLITE FILTER BUTTON
  ========================================================== */

  const changeSatFilter =
    useCallback(
      filter => {
        setSatFilter(
          filter
        );

        setSelectedSat(
          null
        );
      },
      []
    );

  /* ==========================================================
     VIEW MODE BUTTON
  ========================================================== */

  const changeViewMode =
    useCallback(
      mode => {
        setViewMode(
          mode
        );

        if (
          mode !==
          'satellites'
        ) {
          setSelectedSat(
            null
          );
        }

        if (
          mode !== 'pads'
        ) {
          setSelectedPad(
            null
          );
        }

        if (
          mode === 'pads'
        ) {
          setSelectedPad(
            globalLaunchPads[0]
          );
        }
      },
      []
    );

  /* ==========================================================
     JSX CONTINUES IN PART 2
     
     DO NOT CLOSE THE COMPONENT HERE.
     ========================================================== */
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1rem',
        boxSizing: 'border-box',
        color: '#ffffff',
        background: '#000000',
        fontFamily:
          'Arial, Helvetica, sans-serif'
      }}
    >
      {/* =====================================================
          TOP CONTROL BAR
      ===================================================== */}

      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.75rem',
          boxSizing: 'border-box',
          background: '#080808',
          border:
            '1px solid rgba(255,255,255,0.12)',
          borderRadius: '2px'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap'
          }}
        >
          {[
            ['pads', 'LAUNCH PADS'],
            ['satellites', 'SATELLITES'],
            ['wiki', 'DATABASE']
          ].map(
            ([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  changeViewMode(
                    mode
                  )
                }
                className="orbital-button"
                style={{
                  padding:
                    '0.55rem 0.85rem',
                  background:
                    viewMode === mode
                      ? '#181818'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.18)',
                  color:
                    viewMode === mode
                      ? '#ffffff'
                      : '#777777',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  letterSpacing:
                    '1px',
                  fontWeight:
                    viewMode === mode
                      ? '700'
                      : '400'
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

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
              [
                'stations',
                'STATIONS'
              ],
              [
                'starlink',
                'STARLINK'
              ],
              [
                'weather',
                'WEATHER'
              ],
              [
                'active',
                'ACTIVE'
              ]
            ].map(
              ([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    changeSatFilter(
                      filter
                    )
                  }
                  style={{
                    padding:
                      '0.45rem 0.7rem',
                    background:
                      satFilter ===
                      filter
                        ? '#202020'
                        : 'transparent',
                    border:
                      '1px solid rgba(255,255,255,0.12)',
                    color:
                      satFilter ===
                      filter
                        ? '#ffffff'
                        : '#666666',
                    cursor:
                      'pointer',
                    fontSize:
                      '0.58rem',
                    letterSpacing:
                      '0.8px'
                  }}
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          LAUNCH PAD FILTERS
      ===================================================== */}

      {viewMode ===
        'pads' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '0.75rem',
            padding: '0.7rem',
            background: '#080808',
            border:
              '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap: 'wrap'
            }}
          >
            {[
              ['all', 'ALL'],
              ['major', 'MAJOR'],
              ['minor', 'MINOR']
            ].map(
              ([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setPadFilter(
                      filter
                    )
                  }
                  style={{
                    padding:
                      '0.45rem 0.7rem',
                    background:
                      padFilter ===
                      filter
                        ? '#202020'
                        : 'transparent',
                    border:
                      '1px solid rgba(255,255,255,0.12)',
                    color:
                      padFilter ===
                      filter
                        ? '#ffffff'
                        : '#666666',
                    cursor:
                      'pointer',
                    fontSize:
                      '0.58rem'
                  }}
                >
                  {label}
                </button>
              )
            )}
          </div>

          <span
            style={{
              fontFamily:
                'monospace',
              fontSize:
                '0.58rem',
              color:
                '#666666'
            }}
          >
            {filteredPads.length}{' '}
            FACILITIES
          </span>
        </div>
      )}

      {/* =====================================================
          WIKI SEARCH
      ===================================================== */}

      {viewMode ===
        'wiki' && (
        <div
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            gap: '0.5rem'
          }}
        >
          <input
            type="text"
            value={wikiSearch}
            onChange={event => {
              setWikiSearch(
                event.target.value
              );
              setWikiPage(0);
            }}
            placeholder="SEARCH BY NAME OR NORAD ID..."
            style={{
              flex: 1,
              minWidth: 0,
              padding:
                '0.75rem 0.8rem',
              background:
                '#080808',
              border:
                '1px solid rgba(255,255,255,0.15)',
              color:
                '#ffffff',
              outline:
                'none',
              fontFamily:
                'monospace',
              fontSize:
                '0.7rem',
              boxSizing:
                'border-box'
            }}
          />
        </div>
      )}

      {/* =====================================================
          GLOBE
      ===================================================== */}

      {viewMode !==
        'wiki' && (
        <div
          style={{
            position:
              'relative',
            width: '100%',
            height:
              'min(75vh, 760px)',
            minHeight:
              '520px',
            marginTop:
              '0.75rem',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.10)',
            overflow:
              'hidden'
          }}
        >
          <ReactGlobe
            ref={globeRef}

            width={undefined}
            height={undefined}

            backgroundColor="#000000"

            globeImageUrl="/earth-night.jpg"
            bumpImageUrl="/earth-topology.png"

            showAtmosphere={true}
            atmosphereColor="#555555"
            atmosphereAltitude={0.08}

            enablePointerInteraction={
              true
            }

            animateIn={false}

            pointsData={
              viewMode ===
              'pads'
                ? filteredPads
                : renderSatellites
            }

            pointLat={
              'lat'
            }

            pointLng={
              'lng'
            }

            pointAltitude={
              point =>
                viewMode ===
                'pads'
                  ? 0.01
                  : point.displayAltitude
            }

            pointRadius={
              point =>
                viewMode ===
                'pads'
                  ? 0.32
                  : point.displayRadius
            }

            pointColor={
              point =>
                viewMode ===
                'pads'
                  ? '#ffffff'
                  : point.displayColor
            }

            pointResolution={6}

            pointsMerge={
              viewMode ===
              'satellites'
            }

            onPointClick={
              handlePointClick
            }

            onPointHover={
              point =>
                setHoveredSat(
                  viewMode ===
                    'satellites'
                    ? point
                    : null
                )
            }

            pathsData={
              viewMode ===
              'satellites'
                ? orbitalPaths
                : []
            }

            pathPoints={
              'points'
            }

            pathPointLat={
              'lat'
            }

            pathPointLng={
              'lng'
            }

            pathPointAlt={
              'altitude'
            }

            pathColor={() =>
              'rgba(255,255,255,0.42)'
            }

            pathStroke={1.0}

            pathTransitionDuration={
              0
            }

            pathDashLength={1}
            pathDashGap={0}
            pathDashAnimateTime={0}

            htmlElementsData={[]}

            controlsOptions={{
              enableDamping: true,
              dampingFactor: 0.08,
              rotateSpeed: 0.35,
              zoomSpeed: 0.7
            }}
          />

          {/* =================================================
              GLOBE STATUS
          ================================================= */}

          <div
            style={{
              position:
                'absolute',
              left:
                '0.75rem',
              top:
                '0.75rem',
              padding:
                '0.55rem 0.7rem',
              background:
                'rgba(0,0,0,0.78)',
              border:
                '1px solid rgba(255,255,255,0.12)',
              fontFamily:
                'monospace',
              fontSize:
                '0.58rem',
              color:
                '#aaaaaa',
              pointerEvents:
                'none'
            }}
          >
            {viewMode ===
            'pads'
              ? `LAUNCH FACILITIES • ${filteredPads.length}`
              : `TRACKING • ${renderSatellites.length.toLocaleString()} OBJECTS`}
          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loadingSats && (
            <div
              style={{
                position:
                  'absolute',
                left:
                  '50%',
                top:
                  '50%',
                transform:
                  'translate(-50%,-50%)',
                padding:
                  '0.8rem 1rem',
                background:
                  'rgba(0,0,0,0.9)',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.65rem',
                color:
                  '#ffffff',
                pointerEvents:
                  'none',
                whiteSpace:
                  'nowrap'
              }}
            >
              {loadingMessage ||
                'LOADING...'}
            </div>
          )}

          {/* =================================================
              GLOBE CONTROLS
          ================================================= */}

          <div
            style={{
              position:
                'absolute',
              right:
                '0.75rem',
              bottom:
                '0.75rem',
              display:
                'flex',
              gap:
                '0.4rem',
              flexWrap:
                'wrap'
            }}
          >
            {viewMode ===
              'satellites' && (
              <button
                type="button"
                onClick={
                  followISS
                }
                style={{
                  padding:
                    '0.55rem 0.75rem',
                  background:
                    'rgba(0,0,0,0.88)',
                  border:
                    '1px solid rgba(255,255,255,0.18)',
                  color:
                    '#ffffff',
                  cursor:
                    'pointer',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.58rem'
                }}
              >
                FOLLOW ISS
              </button>
            )}

            <button
              type="button"
              onClick={
                resetView
              }
              style={{
                padding:
                  '0.55rem 0.75rem',
                background:
                  'rgba(0,0,0,0.88)',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                color:
                  '#ffffff',
                cursor:
                  'pointer',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.58rem'
              }}
            >
              RESET VIEW
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          WIKI DATABASE TABLE
      ===================================================== */}

      {viewMode ===
        'wiki' && (
        <div
          style={{
            marginTop:
              '0.75rem',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.12)',
            overflow:
              'hidden'
          }}
        >
          <div
            style={{
              padding:
                '0.75rem 0.9rem',
              borderBottom:
                '1px solid rgba(255,255,255,0.10)',
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap:
                '0.75rem',
              flexWrap:
                'wrap'
            }}
          >
            <span
              style={{
                fontFamily:
                  'monospace',
                fontSize:
                  '0.65rem',
                letterSpacing:
                  '1px',
                color:
                  '#ffffff'
              }}
            >
              // SATELLITE DATABASE
            </span>

            <span
              style={{
                fontFamily:
                  'monospace',
                fontSize:
                  '0.58rem',
                color:
                  '#666666'
              }}
            >
              {totalWikiCount.toLocaleString()}{' '}
              RECORDS
            </span>
          </div>

          <div
            style={{
              width:
                '100%',
              overflowX:
                'auto'
            }}
          >
            <table
              style={{
                width:
                  '100%',
                minWidth:
                  '850px',
                borderCollapse:
                  'collapse',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.65rem'
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      '#0a0a0a'
                  }}
                >
                  {[
                    'NORAD ID',
                    'OBJECT',
                    'ORGANIZATION',
                    'LAT',
                    'LNG',
                    'ALTITUDE',
                    'TLE'
                  ].map(
                    heading => (
                      <th
                        key={
                          heading
                        }
                        style={{
                          textAlign:
                            'left',
                          padding:
                            '0.7rem',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.10)',
                          color:
                            '#777777',
                          fontWeight:
                            '600',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {
                          heading
                        }
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  row => {
                    const hasTLE =
                      hasValidTLE(
                        row
                      );

                    return (
                      <tr
                        key={
                          String(
                            row.id
                          )
                        }
                        onClick={() =>
                          handleWikiSelect(
                            row
                          )
                        }
                        style={{
                          cursor:
                            'pointer',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.06)'
                        }}
                        onMouseEnter={event => {
                          event.currentTarget.style.background =
                            '#0c0c0c';
                        }}
                        onMouseLeave={event => {
                          event.currentTarget.style.background =
                            'transparent';
                        }}
                      >
                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#aaaaaa'
                          }}
                        >
                          {row.id ??
                            '—'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#ffffff',
                            fontWeight:
                              '700'
                          }}
                        >
                          {row.name ||
                            'UNKNOWN'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#aaaaaa'
                          }}
                        >
                          {row.organization ||
                            'UNKNOWN'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#aaaaaa'
                          }}
                        >
                          {safeNumber(
                            row.lat
                          ) !==
                          null
                            ? Number(
                                row.lat
                              ).toFixed(
                                3
                              ) +
                              '°'
                            : '—'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#aaaaaa'
                          }}
                        >
                          {safeNumber(
                            row.lng
                          ) !==
                          null
                            ? Number(
                                row.lng
                              ).toFixed(
                                3
                              ) +
                              '°'
                            : '—'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#aaaaaa'
                          }}
                        >
                          {safeNumber(
                            row.altitude
                          ) !==
                          null
                            ? Number(
                                row.altitude
                              ).toFixed(
                                1
                              ) +
                              ' km'
                            : '—'}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              hasTLE
                                ? '#ffffff'
                                : '#555555'
                          }}
                        >
                          {hasTLE
                            ? 'AVAILABLE'
                            : 'NONE'}
                        </td>
                      </tr>
                    );
                  }
                )}

                {wikiData.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding:
                          '2rem',
                        textAlign:
                          'center',
                        color:
                          '#555555'
                      }}
                    >
                      {loadingSats
                        ? 'QUERYING DATABASE...'
                        : 'NO OBJECTS FOUND'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
          ================================================= */}

          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap:
                '0.75rem',
              flexWrap:
                'wrap',
              padding:
                '0.8rem',
              borderTop:
                '1px solid rgba(255,255,255,0.10)'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.6rem',
                color:
                  '#666666',
                fontFamily:
                  'monospace'
              }}
            >
              PAGE{' '}
              {wikiPage + 1}{' '}
              OF{' '}
              {maxPages}
            </span>

            <div
              style={{
                display:
                  'flex',
                gap:
                  '0.4rem'
              }}
            >
              <button
                type="button"
                disabled={
                  wikiPage ===
                  0
                }
                onClick={() =>
                  setWikiPage(
                    page =>
                      Math.max(
                        0,
                        page -
                          1
                      )
                  )
                }
                style={{
                  padding:
                    '0.45rem 0.75rem',
                  background:
                    wikiPage ===
                    0
                      ? '#080808'
                      : '#181818',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage ===
                    0
                      ? '#444444'
                      : '#ffffff',
                  cursor:
                    wikiPage ===
                    0
                      ? 'not-allowed'
                      : 'pointer',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.58rem'
                }}
              >
                PREV
              </button>

              <button
                type="button"
                disabled={
                  wikiPage + 1 >=
                  maxPages
                }
                onClick={() =>
                  setWikiPage(
                    page =>
                      Math.min(
                        maxPages -
                          1,
                        page +
                          1
                      )
                  )
                }
                style={{
                  padding:
                    '0.45rem 0.75rem',
                  background:
                    wikiPage + 1 >=
                    maxPages
                      ? '#080808'
                      : '#181818',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage + 1 >=
                    maxPages
                      ? '#444444'
                      : '#ffffff',
                  cursor:
                    wikiPage + 1 >=
                    maxPages
                      ? 'not-allowed'
                      : 'pointer',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.58rem'
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          LAUNCH PAD INSPECTOR
      ===================================================== */}

      {viewMode ===
        'pads' &&
        selectedPad && (
          <div
            style={{
              marginTop:
                '0.75rem',
              padding:
                '1.25rem',
              background:
                '#080808',
              border:
                '1px solid rgba(255,255,255,0.14)'
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
                  '1rem',
                flexWrap:
                  'wrap'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.62rem',
                  color:
                    '#ffffff',
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
                  fontSize:
                    '0.6rem',
                  color:
                    '#aaaaaa',
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
                  'repeat(auto-fit,minmax(190px,1fr))',
                gap:
                  '1rem',
                marginTop:
                  '1rem'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize:
                      '0.55rem',
                    color:
                      '#555555'
                  }}
                >
                  FACILITY
                </div>

                <div
                  style={{
                    marginTop:
                      '0.25rem',
                    color:
                      '#ffffff',
                    fontSize:
                      '0.95rem',
                    fontWeight:
                      '700'
                  }}
                >
                  {selectedPad.name}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.55rem',
                    color:
                      '#555555'
                  }}
                >
                  AGENCY
                </div>

                <div
                  style={{
                    marginTop:
                      '0.25rem',
                    color:
                      '#ffffff',
                    fontSize:
                      '0.82rem'
                  }}
                >
                  {selectedPad.agency}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.55rem',
                    color:
                      '#555555'
                  }}
                >
                  COUNTRY / REGION
                </div>

                <div
                  style={{
                    marginTop:
                      '0.25rem',
                    color:
                      '#ffffff',
                    fontSize:
                      '0.82rem'
                  }}
                >
                  {selectedPad.country}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize:
                      '0.55rem',
                    color:
                      '#555555'
                  }}
                >
                  EXACT COORDINATES
                </div>

                <div
                  style={{
                    marginTop:
                      '0.25rem',
                    color:
                      '#ffffff',
                    fontSize:
                      '0.78rem',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {Number(
                    selectedPad.lat
                  ).toFixed(
                    5
                  )}
                  °{' '}
                  {Number(
                    selectedPad.lng
                  ).toFixed(
                    5
                  )}
                  °
                </div>
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          SATELLITE INSPECTOR
      ===================================================== */}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            style={{
              marginTop:
                '0.75rem',
              padding:
                '1.25rem',
              background:
                '#080808',
              border:
                '1px solid rgba(255,255,255,0.14)'
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
                  fontSize:
                    '0.62rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '2px',
                  fontWeight:
                    '800'
                }}
              >
                // ORBITAL INSPECTOR
              </span>

              <button
                type="button"
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
                    '#666666',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.58rem',
                  fontFamily:
                    'monospace'
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
                  'repeat(auto-fit,minmax(170px,1fr))',
                gap:
                  '1rem',
                marginTop:
                  '1rem'
              }}
            >
              {[
                [
                  'OBJECT NAME',
                  selectedSat.name ||
                    'UNKNOWN'
                ],
                [
                  'NORAD ID',
                  selectedSat.id ??
                    'N/A'
                ],
                [
                  'ORGANIZATION',
                  selectedSat.organization ||
                    'N/A'
                ],
                [
                  'LATITUDE',
                  Number.isFinite(
                    Number(
                      selectedSat.lat
                    )
                  )
                    ? Number(
                        selectedSat.lat
                      ).toFixed(
                        4
                      ) + '°'
                    : 'N/A'
                ],
                [
                  'LONGITUDE',
                  Number.isFinite(
                    Number(
                      selectedSat.lng
                    )
                  )
                    ? Number(
                        selectedSat.lng
                      ).toFixed(
                        4
                      ) + '°'
                    : 'N/A'
                ],
                [
                  'ALTITUDE',
                  Number.isFinite(
                    Number(
                      selectedSat.altitudeKm
                    )
                  )
                    ? Number(
                        selectedSat.altitudeKm
                      ).toFixed(
                        1
                      ) + ' km'
                    : 'N/A'
                ],
                [
                  'VELOCITY',
                  Number.isFinite(
                    Number(
                      selectedSat.velocityKmS
                    )
                  )
                    ? Number(
                        selectedSat.velocityKmS
                      ).toFixed(
                        2
                      ) + ' km/s'
                    : 'N/A'
                ],
                [
                  'INCLINATION',
                  Number.isFinite(
                    Number(
                      selectedSat.inclination
                    )
                  )
                    ? Number(
                        selectedSat.inclination
                      ).toFixed(
                        3
                      ) + '°'
                    : 'N/A'
                ],
                [
                  'ORBIT SOURCE',
                  selectedSat.orbital_source ||
                    'TLE'
                ],
                [
                  'TLE EPOCH',
                  selectedSat.orbital_epoch ||
                    'N/A'
                ]
              ].map(
                ([label, value]) => (
                  <div
                    key={
                      label
                    }
                  >
                    <div
                      style={{
                        margin: 0,
                        fontSize:
                          '0.55rem',
                        color:
                          '#555555'
                      }}
                    >
                      {label}
                    </div>

                    <div
                      style={{
                        marginTop:
                          '0.25rem',
                        fontSize:
                          label ===
                          'OBJECT NAME'
                            ? '0.95rem'
                            : '0.78rem',
                        color:
                          '#ffffff',
                        fontFamily:
                          [
                            'LATITUDE',
                            'LONGITUDE',
                            'ALTITUDE',
                            'VELOCITY',
                            'NORAD ID'
                          ].includes(
                            label
                          )
                            ? 'monospace'
                            : 'inherit',
                        fontWeight:
                          label ===
                          'OBJECT NAME'
                            ? '700'
                            : '400',
                        wordBreak:
                          'break-word'
                      }}
                    >
                      {value}
                    </div>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop:
                  '1.1rem',
                paddingTop:
                  '0.75rem',
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
                display:
                  'flex',
                justifyContent:
                  'space-between',
                gap:
                  '0.75rem',
                flexWrap:
                  'wrap'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.55rem',
                  color:
                    '#aaaaaa',
                  fontFamily:
                    'monospace'
                }}
              >
                {selectedSat.satrec
                  ? '● POSITION PROPAGATED FROM TLE / SGP4'
                  : '● DATABASE POSITION — TLE UNAVAILABLE'}
              </span>

              <span
                style={{
                  fontSize:
                    '0.55rem',
                  color:
                    '#555555',
                  fontFamily:
                    'monospace'
                }}
              >
                {selectedSat.satrec
                  ? 'LIVE POSITION UPDATES'
                  : 'STATIC FALLBACK'}
              </span>
            </div>
          </div>
        )}

      {/* =====================================================
          FOOTER STATUS
      ===================================================== */}

      <div
        style={{
          marginTop:
            '0.7rem',
          display:
            'flex',
          justifyContent:
            'space-between',
          gap:
            '0.75rem',
          flexWrap:
            'wrap',
          color:
            '#444444',
          fontFamily:
            'monospace',
          fontSize:
            '0.52rem'
        }}
      >
        <span>
          ORBITAL ENGINE • SGP4
        </span>

        <span>
          {viewMode ===
          'satellites'
            ? `FILTER: ${satFilter.toUpperCase()}`
            : viewMode ===
                'pads'
              ? `PAD FILTER: ${padFilter.toUpperCase()}`
              : 'DATABASE MODE'}
        </span>
      </div>
    </div>
  );
}
