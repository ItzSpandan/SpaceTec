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
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
 * Maximum number of satellites rendered on the globe.
 *
 * Your database can contain 16,000+ records. Keeping this
 * bounded prevents the WebGL scene from becoming unstable.
 */
const MAX_GLOBE_SATELLITES = 16000;

/*
 * Recalculate live SGP4 positions once per second.
 * The satellites themselves are NOT being moved artificially.
 */
const POSITION_UPDATE_MS = 1000;

/*
 * Maximum number of points used for one orbital revolution.
 */
const MAX_ORBIT_POINTS = 720;

/* ============================================================
   HELPERS
============================================================ */

function safeNumber(value, fallback = null) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function normalizeLongitude(value) {
  let lng = Number(value);

  if (!Number.isFinite(lng)) {
    return 0;
  }

  while (lng > 180) {
    lng -= 360;
  }

  while (lng < -180) {
    lng += 360;
  }

  return lng;
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
   SGP4 POSITION PROPAGATION
============================================================ */

function propagateSatellite(
  sat,
  date = new Date()
) {
  if (!sat?.satrec) {
    return null;
  }

  try {
    const result =
      satellite.propagate(
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

    const gmst =
      satellite.gstime(date);

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

    const velocity =
      result.velocity;

    const velocityKmS =
      Math.sqrt(
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

      positionEci:
        result.position,

      velocityEci:
        result.velocity,

      /*
       * react-globe.gl altitude is measured
       * in multiples of the globe radius.
       *
       * 400 km / 6371 km ≈ 0.063
       */
      globeAltitude:
        Math.max(
          0.002,
          altitudeKm /
            EARTH_RADIUS_KM
        ),

      telemetryTime:
        date.toISOString()
    };
  } catch (error) {
    return null;
  }
}

/* ============================================================
   FORMAT DATABASE ROW
============================================================ */

function formatSatellite(row) {
  const satrec =
    buildSatrec(row);

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
      safeNumber(row.lat),

    databaseLng:
      safeNumber(row.lng),

    databaseAltitude:
      safeNumber(row.altitude),

    databaseVelocity:
      safeNumber(row.velocity),

    trackable:
      Boolean(satrec)
  };

  /*
   * TLE propagation is always preferred.
   *
   * Database coordinates are only fallback
   * coordinates when a valid TLE is unavailable.
   */
  if (satrec) {
    const current =
      propagateSatellite(
        base,
        new Date()
      );

    if (current) {
      return current;
    }
  }

  return {
    ...base,

    lat:
      safeNumber(
        row.lat,
        0
      ),

    lng:
      normalizeLongitude(
        safeNumber(
          row.lng,
          0
        )
      ),

    altitudeKm:
      safeNumber(
        row.altitude,
        0
      ),

    velocityKmS:
      safeNumber(
        row.velocity,
        0
      ),

    globeAltitude:
      Math.max(
        0.002,
        safeNumber(
          row.altitude,
          0
        ) /
          EARTH_RADIUS_KM
      ),

    telemetryTime:
      row.updated_at ||
      null
  };
}

/* ============================================================
   ORBITAL PERIOD
============================================================ */

function getOrbitalPeriodMinutes(
  sat
) {
  /*
   * Supabase mean_motion is normally
   * expressed as revolutions per day.
   *
   * Therefore:
   *
   * 1440 minutes / rev-per-day
   * = minutes per revolution
   */
  const meanMotion =
    safeNumber(
      sat?.mean_motion,
      null
    );

  if (
    meanMotion &&
    meanMotion > 0
  ) {
    return (
      1440 /
      meanMotion
    );
  }

  /*
   * satellite.js satrec.no is radians/minute.
   *
   * 2π / radians-per-minute
   * = minutes per revolution.
   */
  if (
    sat?.satrec?.no &&
    Number.isFinite(
      sat.satrec.no
    ) &&
    sat.satrec.no > 0
  ) {
    const period =
      (2 * Math.PI) /
      sat.satrec.no;

    if (
      Number.isFinite(period) &&
      period > 0
    ) {
      return period;
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
        getOrbitalPeriodMinutes(
          sat
        )
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
          offset *
            60 *
            1000
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
      lat:
        propagated.lat,

      lng:
        propagated.lng,

      altitude:
        Math.max(
          0.003,
          propagated.globeAltitude +
            0.002
        )
    });
  }

  /*
   * Split the path at ±180° longitude.
   *
   * This prevents the orbital line from
   * drawing a giant diagonal across the globe
   * when crossing the International Date Line.
   */
  const paths = [];
  let current = [];

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const point =
      points[i];

    if (
      current.length > 0
    ) {
      const previous =
        current[
          current.length - 1
        ];

      if (
        Math.abs(
          point.lng -
            previous.lng
        ) > 180
      ) {
        if (
          current.length > 1
        ) {
          paths.push(
            current
          );
        }

        current = [];
      }
    }

    current.push(point);
  }

  if (
    current.length > 1
  ) {
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
     EXTERNAL VIEW CONTROL
  ========================================================== */

  useEffect(() => {
    if (
      requestedView?.mode
    ) {
      setViewMode(
        requestedView.mode
      );
    }
  }, [
    requestedView
  ]);

  /* ==========================================================
     FILTERED LAUNCH PADS
  ========================================================== */

  const filteredPads =
    useMemo(() => {
      return globalLaunchPads.filter(
        pad =>
          padFilter === 'all' ||
          pad.type === padFilter
      );
    }, [
      padFilter
    ]);

  /* ==========================================================
     SATELLITE DATABASE FILTER
  ========================================================== */

  const getSatelliteFilter =
    useCallback(
      filter => {
        if (
          filter ===
          'stations'
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
          filter ===
          'starlink'
        ) {
          return query =>
            query.ilike(
              'name',
              '%STARLINK%'
            );
        }

        if (
          filter ===
          'weather'
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
         * There is no active column in
         * the current Supabase schema.
         *
         * "Active" therefore means the
         * record contains both TLE lines.
         */
        if (
          filter ===
          'active'
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

        return query =>
          query;
      },
      []
    );

  /* ==========================================================
     FETCH SATELLITES
  ========================================================== */

  const fetchSatelliteRows =
    useCallback(
      async filter => {
        const rows = [];
        let from = 0;

        const applyFilter =
          getSatelliteFilter(
            filter
          );

        while (
          rows.length <
          MAX_GLOBE_SATELLITES
        ) {
          let query =
            supabase
              .from(
                'satellites'
              )
              .select('*');

          query =
            applyFilter(
              query
            );

          const remaining =
            MAX_GLOBE_SATELLITES -
            rows.length;

          const batchSize =
            Math.min(
              SUPABASE_BATCH_SIZE,
              remaining
            );

          query =
            query
              .order(
                'id',
                {
                  ascending: true
                }
              )
              .range(
                from,
                from +
                  batchSize -
                  1
              );

          const {
            data,
            error
          } =
            await query;

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
      [
        getSatelliteFilter
      ]
    );

  /* ==========================================================
     LOAD GLOBE SATELLITES
  ========================================================== */

  useEffect(() => {
    if (
      viewMode === 'wiki' ||
      viewMode === 'pads'
    ) {
      return undefined;
    }

    let cancelled =
      false;

    async function load() {
      const cached =
        cacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(
          cached
        );
        return;
      }

      setLoadingSats(
        true
      );

      setLoadingMessage(
        'QUERYING SATELLITE DATABASE'
      );

      try {
        const rows =
          await fetchSatelliteRows(
            satFilter
          );

        if (
          cancelled
        ) {
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

        setSelectedSat(
          current => {
            if (!current) {
              return null;
            }

            return formatted.some(
              sat =>
                String(
                  sat.id
                ) ===
                String(
                  current.id
                )
            )
              ? current
              : null;
          }
        );
      } catch (
        error
      ) {
        console.error(
          'Satellite loading error:',
          error
        );

        if (
          !cancelled
        ) {
          setSatellites(
            []
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingSats(
            false
          );

          setLoadingMessage(
            ''
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
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
      satellites.length ===
        0
    ) {
      return undefined;
    }

    let cancelled =
      false;

    function tick(
      timestamp
    ) {
      if (
        cancelled
      ) {
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

        setSelectedSat(
          current => {
            if (
              !current ||
              !current.satrec
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
          tick
        );
    }

    animationRef.current =
      requestAnimationFrame(
        tick
      );

    return () => {
      cancelled =
        true;

      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      animationRef.current =
        null;
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
     CLEAN SATELLITE DISPLAY DATA
  ========================================================== */

  const renderSatellites =
    useMemo(() => {
      return satellites.map(
        sat => {
          const selected =
            String(
              selectedSat?.id
            ) ===
            String(
              sat.id
            );

          const hovered =
            String(
              hoveredSat?.id
            ) ===
            String(
              sat.id
            );

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
                ) ||
                  0.002
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
     WIKI / SATELLITE DATABASE
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !==
      'wiki'
    ) {
      return undefined;
    }

    let cancelled =
      false;

    async function fetchWiki() {
      setLoadingSats(
        true
      );

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
            .from(
              'satellites'
            )
            .select(
              '*',
              {
                count:
                  'exact'
              }
            );

        const search =
          wikiSearch.trim();

        if (
          search
        ) {
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
        } =
          await query
            .order(
              'id',
              {
                ascending:
                  true
              }
            )
            .range(
              from,
              to
            );

        if (
          error
        ) {
          throw error;
        }

        if (
          cancelled
        ) {
          return;
        }

        setWikiData(
          data || []
        );

        setTotalWikiCount(
          count || 0
        );
      } catch (
        error
      ) {
        console.error(
          'Wiki error:',
          error
        );
      } finally {
        if (
          !cancelled
        ) {
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
      cancelled =
        true;

      clearTimeout(
        timer
      );
    };
  }, [
    wikiSearch,
    wikiPage,
    viewMode
  ]);

  /*
   * Reset page when the search text changes.
   */
  useEffect(() => {
    setWikiPage(0);
  }, [
    wikiSearch
  ]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
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

        globeRef.current.pointOfView(
          {
            lat,
            lng,
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
          altitude: 2.35
        },
        700
      );
    }, []);

  const handlePointClick =
    useCallback(
      point => {
        if (
          viewMode ===
          'pads'
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
     ISS FOLLOW
  ========================================================== */

  const followISS =
    useCallback(() => {
      const iss =
        satellites.find(
          sat =>
            /ISS/i.test(
              sat.name ||
                ''
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
        1.6,
        900
      );
    }, [
      satellites,
      moveCameraTo
    ]);

  /* ==========================================================
     PAD DATA FOR GLOBE
  ========================================================== */

  const renderPads =
    useMemo(() => {
      return filteredPads.map(
        pad => ({
          ...pad,

          displayColor:
            selectedPad?.id ===
            pad.id
              ? '#ffffff'
              : pad.type ===
                  'major'
                ? 'rgba(255,255,255,0.82)'
                : 'rgba(255,255,255,0.42)',

          displayRadius:
            selectedPad?.id ===
            pad.id
              ? 0.42
              : pad.type ===
                  'major'
                ? 0.25
                : 0.16,

          displayAltitude:
            selectedPad?.id ===
            pad.id
              ? 0.025
              : 0.018
        })
      );
    }, [
      filteredPads,
      selectedPad
    ]);

  /* ==========================================================
     WIKI ROW SELECT
  ========================================================== */

  const handleWikiSatellite =
    useCallback(
      row => {
        const formatted =
          formatSatellite(
            row
          );

        setViewMode(
          'satellites'
        );

        setSatFilter(
          'active'
        );

        setSelectedSat(
          formatted
        );

        if (
          Number.isFinite(
            Number(
              formatted.lat
            )
          ) &&
          Number.isFinite(
            Number(
              formatted.lng
            )
          )
        ) {
          setTimeout(
            () => {
              moveCameraTo(
                formatted.lat,
                formatted.lng,
                1.8,
                700
              );
            },
            50
          );
        }
      },
      [
        moveCameraTo
      ]
    );

  /* ==========================================================
     SHARED BUTTON STYLE
  ========================================================== */

  const buttonStyle =
    {
      border:
        '1px solid rgba(255,255,255,0.16)',
      background:
        'rgba(255,255,255,0.035)',
      color:
        '#ffffff',
      padding:
        '0.55rem 0.8rem',
      fontSize:
        '0.65rem',
      fontFamily:
        'monospace',
      letterSpacing:
        '0.5px',
      cursor:
        'pointer',
      borderRadius:
        '2px'
    };

  const activeButtonStyle =
    {
      ...buttonStyle,
      background:
        'rgba(255,255,255,0.12)',
      border:
        '1px solid rgba(255,255,255,0.32)'
    };

  /* ==========================================================
     JSX
  ========================================================== */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        color: '#ffffff'
      }}
    >
      {/* ======================================================
          HEADER / VIEW CONTROLS
      ====================================================== */}

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          gap: '1rem',
          flexWrap:
            'wrap',
          padding:
            '0.8rem 0'
        }}
      >
        <div>
          <div
            style={{
              fontFamily:
                'monospace',
              fontSize:
                '0.7rem',
              letterSpacing:
                '2px',
              color:
                '#71717a',
              marginBottom:
                '0.25rem'
            }}
          >
            SPACETECHUB
          </div>

          <h2
            style={{
              margin: 0,
              fontSize:
                '1.35rem',
              fontWeight:
                '700',
              letterSpacing:
                '0.5px',
              color:
                '#ffffff'
            }}
          >
            ORBITAL GLOBE
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap:
              'wrap'
          }}
        >
          <button
            type="button"
            onClick={() =>
              setViewMode(
                'pads'
              )
            }
            style={
              viewMode ===
              'pads'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            LAUNCH PADS
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                'satellites'
              )
            }
            style={
              viewMode ===
              'satellites'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            SATELLITES
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                'wiki'
              )
            }
            style={
              viewMode ===
              'wiki'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            SATELLITE DATABASE
          </button>
        </div>
      </div>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          gap: '0.7rem',
          flexWrap:
            'wrap',
          padding:
            '0.7rem',
          background:
            'rgba(8,8,8,0.88)',
          border:
            '1px solid rgba(255,255,255,0.10)'
        }}
      >
        {viewMode ===
          'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap:
                'wrap'
            }}
          >
            {[
              [
                'all',
                'ALL'
              ],
              [
                'major',
                'MAJOR'
              ],
              [
                'minor',
                'MINOR'
              ]
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPadFilter(
                      value
                    )
                  }
                  style={
                    padFilter ===
                    value
                      ? activeButtonStyle
                      : buttonStyle
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}

        {viewMode ===
          'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap:
                'wrap'
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
                'ALL ACTIVE'
              ]
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedSat(
                      null
                    );
                    setSatFilter(
                      value
                    );
                  }}
                  style={
                    satFilter ===
                    value
                      ? activeButtonStyle
                      : buttonStyle
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}

        {viewMode ===
          'wiki' && (
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap:
                '0.5rem',
              width:
                '100%',
              maxWidth:
                '520px'
            }}
          >
            <input
              value={
                wikiSearch
              }
              onChange={event =>
                setWikiSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="SEARCH NAME OR NORAD ID..."
              style={{
                width:
                  '100%',
                background:
                  'rgba(255,255,255,0.035)',
                border:
                  '1px solid rgba(255,255,255,0.16)',
                color:
                  '#ffffff',
                padding:
                  '0.65rem 0.75rem',
                outline:
                  'none',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.7rem'
              }}
            />
          </div>
        )}

        <div
          style={{
            display:
              'flex',
            gap:
              '0.4rem',
            alignItems:
              'center',
            marginLeft:
              'auto'
          }}
        >
          {viewMode ===
            'satellites' && (
            <button
              type="button"
              onClick={
                followISS
              }
              style={
                buttonStyle
              }
            >
              FOLLOW ISS
            </button>
          )}

          <button
            type="button"
            onClick={
              resetView
            }
            style={
              buttonStyle
            }
          >
            RESET VIEW
          </button>
        </div>
      </div>

      {/* ======================================================
          GLOBE
      ====================================================== */}

      {viewMode !==
        'wiki' && (
        <div
          style={{
            position:
              'relative',
            width:
              '100%',
            height:
              '650px',
            minHeight:
              '500px',
            overflow:
              'hidden',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <ReactGlobe
            ref={
              globeRef
            }

            width={
              typeof window !==
              'undefined'
                ? Math.min(
                    window.innerWidth -
                      32,
                    1400
                  )
                : 1200
            }

            height={650}

            backgroundColor="#000000"

            globeImageUrl="/earth-night.jpg"

            bumpImageUrl="/earth-topology.png"

            showAtmosphere={
              true
            }

            atmosphereColor="#ffffff"

            atmosphereAltitude={
              0.075
            }

            animateIn={
              false
            }

            enablePointerInteraction={
              true
            }

            controlsConfig={{
              enableDamping:
                true,
              dampingFactor:
                0.08,
              rotateSpeed:
                0.45,
              zoomSpeed:
                0.8
            }}

            pointsData={
              viewMode ===
              'pads'
                ? renderPads
                : renderSatellites
            }

            pointLat={
              point =>
                Number(
                  point.lat
                )
            }

            pointLng={
              point =>
                Number(
                  point.lng
                )
            }

            pointAltitude={
              point =>
                Number(
                  point.displayAltitude
                ) ||
                0.002
            }

            pointRadius={
              point =>
                Number(
                  point.displayRadius
                ) ||
                0.1
            }

            pointColor={
              point =>
                point.displayColor ||
                '#ffffff'
            }

            pointResolution={
              8
            }

            pointLabel={
              point =>
                viewMode ===
                'pads'
                  ? `
                    <div style="
                      padding:8px;
                      background:#080808;
                      border:1px solid rgba(255,255,255,.2);
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                    ">
                      <strong>${point.name}</strong><br/>
                      ${point.agency}<br/>
                      ${point.country}
                    </div>
                  `
                  : `
                    <div style="
                      padding:8px;
                      background:#080808;
                      border:1px solid rgba(255,255,255,.2);
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                    ">
                      <strong>${point.name}</strong><br/>
                      NORAD: ${point.id}<br/>
                      ALT: ${
                        Number.isFinite(
                          Number(
                            point.altitudeKm
                          )
                        )
                          ? Number(
                              point.altitudeKm
                            ).toFixed(
                              1
                            )
                          : 'N/A'
                      } km
                    </div>
                  `
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
              path =>
                path
            }

            pathPointLat={
              point =>
                point.lat
            }

            pathPointLng={
              point =>
                point.lng
            }

            pathPointAlt={
              point =>
                point.altitude
            }

            pathColor={() =>
              'rgba(255,255,255,0.55)'
            }

            pathStroke={
              1.25
            }

            pathDashLength={
              0.02
            }

            pathDashGap={
              0.008
            }

            pathDashAnimateTime={
              0
            }
          />

          {/* ==================================================
              GLOBE STATUS
          ================================================== */}

          <div
            style={{
              position:
                'absolute',
              top:
                '1rem',
              left:
                '1rem',
              padding:
                '0.65rem 0.8rem',
              background:
                'rgba(0,0,0,0.78)',
              border:
                '1px solid rgba(255,255,255,0.13)',
              fontFamily:
                'monospace',
              fontSize:
                '0.62rem',
              letterSpacing:
                '0.5px',
              pointerEvents:
                'none'
            }}
          >
            <div
              style={{
                color:
                  '#ffffff'
              }}
            >
              {viewMode ===
              'pads'
                ? 'LAUNCH FACILITIES'
                : 'ORBITAL OBJECTS'}
            </div>

            <div
              style={{
                color:
                  '#71717a',
                marginTop:
                  '0.25rem'
              }}
            >
              {viewMode ===
              'pads'
                ? `${renderPads.length} LOCATIONS`
                : `${satellites.length.toLocaleString()} OBJECTS`}
            </div>
          </div>

          {/* ==================================================
              LOADING OVERLAY
          ================================================== */}

          {loadingSats &&
            viewMode ===
              'satellites' && (
              <div
                style={{
                  position:
                    'absolute',
                  inset: 0,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  pointerEvents:
                    'none'
                }}
              >
                <div
                  style={{
                    padding:
                      '0.9rem 1.1rem',
                    background:
                      'rgba(0,0,0,0.82)',
                    border:
                      '1px solid rgba(255,255,255,0.15)',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace',
                    fontSize:
                      '0.7rem',
                    letterSpacing:
                      '1px'
                  }}
                >
                  {loadingMessage ||
                    'LOADING...'}
                </div>
              </div>
            )}

          {/* ==================================================
              SATELLITE LEGEND
          ================================================== */}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                bottom:
                  '1rem',
                left:
                  '1rem',
                display:
                  'flex',
                flexDirection:
                  'column',
                gap:
                  '0.3rem',
                padding:
                  '0.65rem 0.8rem',
                background:
                  'rgba(0,0,0,0.78)',
                border:
                  '1px solid rgba(255,255,255,0.13)',
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
              <span>
                ● TLE / SGP4 POSITION
              </span>

              <span>
                ○ SELECT OBJECT FOR ORBIT
              </span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          WIKI / SATELLITE DATABASE
      ====================================================== */}

      {viewMode ===
        'wiki' && (
        <div
          style={{
            width:
              '100%',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.10)',
            overflow:
              'hidden'
          }}
        >
          <div
            style={{
              padding:
                '1rem',
              borderBottom:
                '1px solid rgba(255,255,255,0.10)',
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
            <div>
              <div
                style={{
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.6rem',
                  color:
                    '#71717a',
                  letterSpacing:
                    '1.5px'
                }}
              >
                // SATELLITE DATABASE
              </div>

              <div
                style={{
                  marginTop:
                    '0.3rem',
                  fontSize:
                    '0.9rem',
                  color:
                    '#ffffff'
                }}
              >
                {totalWikiCount.toLocaleString()}{' '}
                OBJECTS
              </div>
            </div>

            {loadingSats && (
              <span
                style={{
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.6rem',
                  color:
                    '#71717a'
                }}
              >
                QUERYING...
              </span>
            )}
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
                borderCollapse:
                  'collapse',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.65rem'
              }}
            >
              <thead>
                <tr>
                  {[
                    'NORAD ID',
                    'NAME',
                    'ORGANIZATION',
                    'LAT',
                    'LNG',
                    'ALTITUDE',
                    'VELOCITY',
                    'ACTION'
                  ].map(
                    header => (
                      <th
                        key={
                          header
                        }
                        style={{
                          textAlign:
                            'left',
                          padding:
                            '0.7rem',
                          color:
                            '#71717a',
                          fontWeight:
                            '500',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.10)',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  row => {
                    const formatted =
                      formatSatellite(
                        row
                      );

                    return (
                      <tr
                        key={
                          String(
                            row.id
                          )
                        }
                        style={{
                          borderBottom:
                            '1px solid rgba(255,255,255,0.055)'
                        }}
                      >
                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#ffffff',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {row.id}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#ffffff',
                            minWidth:
                              '240px'
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
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
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
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.lat
                            )
                          )
                            ? Number(
                                formatted.lat
                              ).toFixed(
                                3
                              )
                            : 'N/A'}
                          °
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.lng
                            )
                          )
                            ? Number(
                                formatted.lng
                              ).toFixed(
                                3
                              )
                            : 'N/A'}
                          °
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.altitudeKm
                            )
                          )
                            ? Number(
                                formatted.altitudeKm
                              ).toFixed(
                                1
                              )
                            : 'N/A'}{' '}
                          km
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.velocityKmS
                            )
                          )
                            ? Number(
                                formatted.velocityKmS
                              ).toFixed(
                                2
                              )
                            : 'N/A'}{' '}
                          km/s
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleWikiSatellite(
                                row
                              )
                            }
                            style={{
                              ...buttonStyle,
                              padding:
                                '0.35rem 0.55rem'
                            }}
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}

                {wikiData.length ===
                  0 &&
                  !loadingSats && (
                    <tr>
                      <td
                        colSpan={
                          8
                        }
                        style={{
                          padding:
                            '3rem',
                          textAlign:
                            'center',
                          color:
                            '#52525b',
                          fontFamily:
                            'monospace'
                        }}
                      >
                        NO OBJECTS FOUND
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              PAGINATION
          ================================================== */}

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
              margin:
                '1rem',
              borderTop:
                '1px solid rgba(255,255,255,0.12)',
              paddingTop:
                '0.8rem'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.65rem',
                color:
                  '#71717a',
                fontFamily:
                  'monospace'
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
                  ...buttonStyle,
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage ===
                    0
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#ffffff',
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
                  ...buttonStyle,
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    wikiPage +
                      1 >=
                    maxPages
                      ? '#52525b'
                      : '#ffffff',
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
              borderRadius:
                '2px',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(8,8,8,0.92)'
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
                    '0.65rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
                  fontWeight:
                    '800'
                }}
              >
                // LAUNCH FACILITY
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#ffffff'
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
                  '0.8rem'
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  FACILITY
                </p>

                <h3
                  style={{
                    margin:
                      '0.2rem 0 0',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  COUNTRY / REGION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  EXACT COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {Number(
                    selectedPad.lat
                  ).toFixed(
                    5
                  )}
                  °
                  {' '}
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
              borderRadius:
                '2px',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(8,8,8,0.92)'
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
                    '0.65rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
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
                    '#888888',
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
                  'repeat(auto-fit,minmax(180px,1fr))',
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
                      ) +
                      ' km'
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
                      ) +
                      ' km/s'
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
                      ) +
                      '°'
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
                    <p
                      style={{
                        margin:
                          0,
                        fontSize:
                          '0.6rem',
                        color:
                          '#71717a'
                      }}
                    >
                      {label}
                    </p>

                    <p
                      style={{
                        margin:
                          '0.2rem 0 0',
                        fontSize:
                          label ===
                          'OBJECT NAME'
                            ? '1rem'
                            : '0.85rem',
                        color:
                          '#ffffff',
                        fontFamily:
                          label ===
                            'LATITUDE' ||
                          label ===
                            'LONGITUDE' ||
                          label ===
                            'ALTITUDE' ||
                          label ===
                            'VELOCITY'
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
                    </p>
                  </div>
                )
              )}
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
                flexWrap:
                  'wrap',
                gap:
                  '0.5rem'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.6rem',
                  color:
                    '#ffffff',
                  fontFamily:
                    'monospace'
                }}
              >
                ● POSITION PROPAGATED FROM TLE
              </span>

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
                UPDATES CONTINUOUSLY
              </span>
            </div>
          </div>
        )}
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
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
 * Maximum number of satellites rendered on the globe.
 *
 * Your database can contain 16,000+ records. Keeping this
 * bounded prevents the WebGL scene from becoming unstable.
 */
const MAX_GLOBE_SATELLITES = 16000;

/*
 * Recalculate live SGP4 positions once per second.
 * The satellites themselves are NOT being moved artificially.
 */
const POSITION_UPDATE_MS = 1000;

/*
 * Maximum number of points used for one orbital revolution.
 */
const MAX_ORBIT_POINTS = 720;

/* ============================================================
   HELPERS
============================================================ */

function safeNumber(value, fallback = null) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function normalizeLongitude(value) {
  let lng = Number(value);

  if (!Number.isFinite(lng)) {
    return 0;
  }

  while (lng > 180) {
    lng -= 360;
  }

  while (lng < -180) {
    lng += 360;
  }

  return lng;
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
   SGP4 POSITION PROPAGATION
============================================================ */

function propagateSatellite(
  sat,
  date = new Date()
) {
  if (!sat?.satrec) {
    return null;
  }

  try {
    const result =
      satellite.propagate(
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

    const gmst =
      satellite.gstime(date);

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

    const velocity =
      result.velocity;

    const velocityKmS =
      Math.sqrt(
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

      positionEci:
        result.position,

      velocityEci:
        result.velocity,

      /*
       * react-globe.gl altitude is measured
       * in multiples of the globe radius.
       *
       * 400 km / 6371 km ≈ 0.063
       */
      globeAltitude:
        Math.max(
          0.002,
          altitudeKm /
            EARTH_RADIUS_KM
        ),

      telemetryTime:
        date.toISOString()
    };
  } catch (error) {
    return null;
  }
}

/* ============================================================
   FORMAT DATABASE ROW
============================================================ */

function formatSatellite(row) {
  const satrec =
    buildSatrec(row);

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
      safeNumber(row.lat),

    databaseLng:
      safeNumber(row.lng),

    databaseAltitude:
      safeNumber(row.altitude),

    databaseVelocity:
      safeNumber(row.velocity),

    trackable:
      Boolean(satrec)
  };

  /*
   * TLE propagation is always preferred.
   *
   * Database coordinates are only fallback
   * coordinates when a valid TLE is unavailable.
   */
  if (satrec) {
    const current =
      propagateSatellite(
        base,
        new Date()
      );

    if (current) {
      return current;
    }
  }

  return {
    ...base,

    lat:
      safeNumber(
        row.lat,
        0
      ),

    lng:
      normalizeLongitude(
        safeNumber(
          row.lng,
          0
        )
      ),

    altitudeKm:
      safeNumber(
        row.altitude,
        0
      ),

    velocityKmS:
      safeNumber(
        row.velocity,
        0
      ),

    globeAltitude:
      Math.max(
        0.002,
        safeNumber(
          row.altitude,
          0
        ) /
          EARTH_RADIUS_KM
      ),

    telemetryTime:
      row.updated_at ||
      null
  };
}

/* ============================================================
   ORBITAL PERIOD
============================================================ */

function getOrbitalPeriodMinutes(
  sat
) {
  /*
   * Supabase mean_motion is normally
   * expressed as revolutions per day.
   *
   * Therefore:
   *
   * 1440 minutes / rev-per-day
   * = minutes per revolution
   */
  const meanMotion =
    safeNumber(
      sat?.mean_motion,
      null
    );

  if (
    meanMotion &&
    meanMotion > 0
  ) {
    return (
      1440 /
      meanMotion
    );
  }

  /*
   * satellite.js satrec.no is radians/minute.
   *
   * 2π / radians-per-minute
   * = minutes per revolution.
   */
  if (
    sat?.satrec?.no &&
    Number.isFinite(
      sat.satrec.no
    ) &&
    sat.satrec.no > 0
  ) {
    const period =
      (2 * Math.PI) /
      sat.satrec.no;

    if (
      Number.isFinite(period) &&
      period > 0
    ) {
      return period;
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
        getOrbitalPeriodMinutes(
          sat
        )
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
          offset *
            60 *
            1000
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
      lat:
        propagated.lat,

      lng:
        propagated.lng,

      altitude:
        Math.max(
          0.003,
          propagated.globeAltitude +
            0.002
        )
    });
  }

  /*
   * Split the path at ±180° longitude.
   *
   * This prevents the orbital line from
   * drawing a giant diagonal across the globe
   * when crossing the International Date Line.
   */
  const paths = [];
  let current = [];

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const point =
      points[i];

    if (
      current.length > 0
    ) {
      const previous =
        current[
          current.length - 1
        ];

      if (
        Math.abs(
          point.lng -
            previous.lng
        ) > 180
      ) {
        if (
          current.length > 1
        ) {
          paths.push(
            current
          );
        }

        current = [];
      }
    }

    current.push(point);
  }

  if (
    current.length > 1
  ) {
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
     EXTERNAL VIEW CONTROL
  ========================================================== */

  useEffect(() => {
    if (
      requestedView?.mode
    ) {
      setViewMode(
        requestedView.mode
      );
    }
  }, [
    requestedView
  ]);

  /* ==========================================================
     FILTERED LAUNCH PADS
  ========================================================== */

  const filteredPads =
    useMemo(() => {
      return globalLaunchPads.filter(
        pad =>
          padFilter === 'all' ||
          pad.type === padFilter
      );
    }, [
      padFilter
    ]);

  /* ==========================================================
     SATELLITE DATABASE FILTER
  ========================================================== */

  const getSatelliteFilter =
    useCallback(
      filter => {
        if (
          filter ===
          'stations'
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
          filter ===
          'starlink'
        ) {
          return query =>
            query.ilike(
              'name',
              '%STARLINK%'
            );
        }

        if (
          filter ===
          'weather'
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
         * There is no active column in
         * the current Supabase schema.
         *
         * "Active" therefore means the
         * record contains both TLE lines.
         */
        if (
          filter ===
          'active'
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

        return query =>
          query;
      },
      []
    );

  /* ==========================================================
     FETCH SATELLITES
  ========================================================== */

  const fetchSatelliteRows =
    useCallback(
      async filter => {
        const rows = [];
        let from = 0;

        const applyFilter =
          getSatelliteFilter(
            filter
          );

        while (
          rows.length <
          MAX_GLOBE_SATELLITES
        ) {
          let query =
            supabase
              .from(
                'satellites'
              )
              .select('*');

          query =
            applyFilter(
              query
            );

          const remaining =
            MAX_GLOBE_SATELLITES -
            rows.length;

          const batchSize =
            Math.min(
              SUPABASE_BATCH_SIZE,
              remaining
            );

          query =
            query
              .order(
                'id',
                {
                  ascending: true
                }
              )
              .range(
                from,
                from +
                  batchSize -
                  1
              );

          const {
            data,
            error
          } =
            await query;

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
      [
        getSatelliteFilter
      ]
    );

  /* ==========================================================
     LOAD GLOBE SATELLITES
  ========================================================== */

  useEffect(() => {
    if (
      viewMode === 'wiki' ||
      viewMode === 'pads'
    ) {
      return undefined;
    }

    let cancelled =
      false;

    async function load() {
      const cached =
        cacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(
          cached
        );
        return;
      }

      setLoadingSats(
        true
      );

      setLoadingMessage(
        'QUERYING SATELLITE DATABASE'
      );

      try {
        const rows =
          await fetchSatelliteRows(
            satFilter
          );

        if (
          cancelled
        ) {
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

        setSelectedSat(
          current => {
            if (!current) {
              return null;
            }

            return formatted.some(
              sat =>
                String(
                  sat.id
                ) ===
                String(
                  current.id
                )
            )
              ? current
              : null;
          }
        );
      } catch (
        error
      ) {
        console.error(
          'Satellite loading error:',
          error
        );

        if (
          !cancelled
        ) {
          setSatellites(
            []
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoadingSats(
            false
          );

          setLoadingMessage(
            ''
          );
        }
      }
    }

    load();

    return () => {
      cancelled =
        true;
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
      satellites.length ===
        0
    ) {
      return undefined;
    }

    let cancelled =
      false;

    function tick(
      timestamp
    ) {
      if (
        cancelled
      ) {
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

        setSelectedSat(
          current => {
            if (
              !current ||
              !current.satrec
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
          tick
        );
    }

    animationRef.current =
      requestAnimationFrame(
        tick
      );

    return () => {
      cancelled =
        true;

      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      animationRef.current =
        null;
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
     CLEAN SATELLITE DISPLAY DATA
  ========================================================== */

  const renderSatellites =
    useMemo(() => {
      return satellites.map(
        sat => {
          const selected =
            String(
              selectedSat?.id
            ) ===
            String(
              sat.id
            );

          const hovered =
            String(
              hoveredSat?.id
            ) ===
            String(
              sat.id
            );

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
                ) ||
                  0.002
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
     WIKI / SATELLITE DATABASE
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !==
      'wiki'
    ) {
      return undefined;
    }

    let cancelled =
      false;

    async function fetchWiki() {
      setLoadingSats(
        true
      );

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
            .from(
              'satellites'
            )
            .select(
              '*',
              {
                count:
                  'exact'
              }
            );

        const search =
          wikiSearch.trim();

        if (
          search
        ) {
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
        } =
          await query
            .order(
              'id',
              {
                ascending:
                  true
              }
            )
            .range(
              from,
              to
            );

        if (
          error
        ) {
          throw error;
        }

        if (
          cancelled
        ) {
          return;
        }

        setWikiData(
          data || []
        );

        setTotalWikiCount(
          count || 0
        );
      } catch (
        error
      ) {
        console.error(
          'Wiki error:',
          error
        );
      } finally {
        if (
          !cancelled
        ) {
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
      cancelled =
        true;

      clearTimeout(
        timer
      );
    };
  }, [
    wikiSearch,
    wikiPage,
    viewMode
  ]);

  /*
   * Reset page when the search text changes.
   */
  useEffect(() => {
    setWikiPage(0);
  }, [
    wikiSearch
  ]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
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

        globeRef.current.pointOfView(
          {
            lat,
            lng,
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
          altitude: 2.35
        },
        700
      );
    }, []);

  const handlePointClick =
    useCallback(
      point => {
        if (
          viewMode ===
          'pads'
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
     ISS FOLLOW
  ========================================================== */

  const followISS =
    useCallback(() => {
      const iss =
        satellites.find(
          sat =>
            /ISS/i.test(
              sat.name ||
                ''
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
        1.6,
        900
      );
    }, [
      satellites,
      moveCameraTo
    ]);

  /* ==========================================================
     PAD DATA FOR GLOBE
  ========================================================== */

  const renderPads =
    useMemo(() => {
      return filteredPads.map(
        pad => ({
          ...pad,

          displayColor:
            selectedPad?.id ===
            pad.id
              ? '#ffffff'
              : pad.type ===
                  'major'
                ? 'rgba(255,255,255,0.82)'
                : 'rgba(255,255,255,0.42)',

          displayRadius:
            selectedPad?.id ===
            pad.id
              ? 0.42
              : pad.type ===
                  'major'
                ? 0.25
                : 0.16,

          displayAltitude:
            selectedPad?.id ===
            pad.id
              ? 0.025
              : 0.018
        })
      );
    }, [
      filteredPads,
      selectedPad
    ]);

  /* ==========================================================
     WIKI ROW SELECT
  ========================================================== */

  const handleWikiSatellite =
    useCallback(
      row => {
        const formatted =
          formatSatellite(
            row
          );

        setViewMode(
          'satellites'
        );

        setSatFilter(
          'active'
        );

        setSelectedSat(
          formatted
        );

        if (
          Number.isFinite(
            Number(
              formatted.lat
            )
          ) &&
          Number.isFinite(
            Number(
              formatted.lng
            )
          )
        ) {
          setTimeout(
            () => {
              moveCameraTo(
                formatted.lat,
                formatted.lng,
                1.8,
                700
              );
            },
            50
          );
        }
      },
      [
        moveCameraTo
      ]
    );

  /* ==========================================================
     SHARED BUTTON STYLE
  ========================================================== */

  const buttonStyle =
    {
      border:
        '1px solid rgba(255,255,255,0.16)',
      background:
        'rgba(255,255,255,0.035)',
      color:
        '#ffffff',
      padding:
        '0.55rem 0.8rem',
      fontSize:
        '0.65rem',
      fontFamily:
        'monospace',
      letterSpacing:
        '0.5px',
      cursor:
        'pointer',
      borderRadius:
        '2px'
    };

  const activeButtonStyle =
    {
      ...buttonStyle,
      background:
        'rgba(255,255,255,0.12)',
      border:
        '1px solid rgba(255,255,255,0.32)'
    };

  /* ==========================================================
     JSX
  ========================================================== */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        color: '#ffffff'
      }}
    >
      {/* ======================================================
          HEADER / VIEW CONTROLS
      ====================================================== */}

      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          gap: '1rem',
          flexWrap:
            'wrap',
          padding:
            '0.8rem 0'
        }}
      >
        <div>
          <div
            style={{
              fontFamily:
                'monospace',
              fontSize:
                '0.7rem',
              letterSpacing:
                '2px',
              color:
                '#71717a',
              marginBottom:
                '0.25rem'
            }}
          >
            SPACETECHUB
          </div>

          <h2
            style={{
              margin: 0,
              fontSize:
                '1.35rem',
              fontWeight:
                '700',
              letterSpacing:
                '0.5px',
              color:
                '#ffffff'
            }}
          >
            ORBITAL GLOBE
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap:
              'wrap'
          }}
        >
          <button
            type="button"
            onClick={() =>
              setViewMode(
                'pads'
              )
            }
            style={
              viewMode ===
              'pads'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            LAUNCH PADS
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                'satellites'
              )
            }
            style={
              viewMode ===
              'satellites'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            SATELLITES
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                'wiki'
              )
            }
            style={
              viewMode ===
              'wiki'
                ? activeButtonStyle
                : buttonStyle
            }
          >
            SATELLITE DATABASE
          </button>
        </div>
      </div>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          gap: '0.7rem',
          flexWrap:
            'wrap',
          padding:
            '0.7rem',
          background:
            'rgba(8,8,8,0.88)',
          border:
            '1px solid rgba(255,255,255,0.10)'
        }}
      >
        {viewMode ===
          'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap:
                'wrap'
            }}
          >
            {[
              [
                'all',
                'ALL'
              ],
              [
                'major',
                'MAJOR'
              ],
              [
                'minor',
                'MINOR'
              ]
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPadFilter(
                      value
                    )
                  }
                  style={
                    padFilter ===
                    value
                      ? activeButtonStyle
                      : buttonStyle
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}

        {viewMode ===
          'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              flexWrap:
                'wrap'
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
                'ALL ACTIVE'
              ]
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedSat(
                      null
                    );
                    setSatFilter(
                      value
                    );
                  }}
                  style={
                    satFilter ===
                    value
                      ? activeButtonStyle
                      : buttonStyle
                  }
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}

        {viewMode ===
          'wiki' && (
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap:
                '0.5rem',
              width:
                '100%',
              maxWidth:
                '520px'
            }}
          >
            <input
              value={
                wikiSearch
              }
              onChange={event =>
                setWikiSearch(
                  event
                    .target
                    .value
                )
              }
              placeholder="SEARCH NAME OR NORAD ID..."
              style={{
                width:
                  '100%',
                background:
                  'rgba(255,255,255,0.035)',
                border:
                  '1px solid rgba(255,255,255,0.16)',
                color:
                  '#ffffff',
                padding:
                  '0.65rem 0.75rem',
                outline:
                  'none',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.7rem'
              }}
            />
          </div>
        )}

        <div
          style={{
            display:
              'flex',
            gap:
              '0.4rem',
            alignItems:
              'center',
            marginLeft:
              'auto'
          }}
        >
          {viewMode ===
            'satellites' && (
            <button
              type="button"
              onClick={
                followISS
              }
              style={
                buttonStyle
              }
            >
              FOLLOW ISS
            </button>
          )}

          <button
            type="button"
            onClick={
              resetView
            }
            style={
              buttonStyle
            }
          >
            RESET VIEW
          </button>
        </div>
      </div>

      {/* ======================================================
          GLOBE
      ====================================================== */}

      {viewMode !==
        'wiki' && (
        <div
          style={{
            position:
              'relative',
            width:
              '100%',
            height:
              '650px',
            minHeight:
              '500px',
            overflow:
              'hidden',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.10)'
          }}
        >
          <ReactGlobe
            ref={
              globeRef
            }

            width={
              typeof window !==
              'undefined'
                ? Math.min(
                    window.innerWidth -
                      32,
                    1400
                  )
                : 1200
            }

            height={650}

            backgroundColor="#000000"

            globeImageUrl="/earth-night.jpg"

            bumpImageUrl="/earth-topology.png"

            showAtmosphere={
              true
            }

            atmosphereColor="#ffffff"

            atmosphereAltitude={
              0.075
            }

            animateIn={
              false
            }

            enablePointerInteraction={
              true
            }

            controlsConfig={{
              enableDamping:
                true,
              dampingFactor:
                0.08,
              rotateSpeed:
                0.45,
              zoomSpeed:
                0.8
            }}

            pointsData={
              viewMode ===
              'pads'
                ? renderPads
                : renderSatellites
            }

            pointLat={
              point =>
                Number(
                  point.lat
                )
            }

            pointLng={
              point =>
                Number(
                  point.lng
                )
            }

            pointAltitude={
              point =>
                Number(
                  point.displayAltitude
                ) ||
                0.002
            }

            pointRadius={
              point =>
                Number(
                  point.displayRadius
                ) ||
                0.1
            }

            pointColor={
              point =>
                point.displayColor ||
                '#ffffff'
            }

            pointResolution={
              8
            }

            pointLabel={
              point =>
                viewMode ===
                'pads'
                  ? `
                    <div style="
                      padding:8px;
                      background:#080808;
                      border:1px solid rgba(255,255,255,.2);
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                    ">
                      <strong>${point.name}</strong><br/>
                      ${point.agency}<br/>
                      ${point.country}
                    </div>
                  `
                  : `
                    <div style="
                      padding:8px;
                      background:#080808;
                      border:1px solid rgba(255,255,255,.2);
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                    ">
                      <strong>${point.name}</strong><br/>
                      NORAD: ${point.id}<br/>
                      ALT: ${
                        Number.isFinite(
                          Number(
                            point.altitudeKm
                          )
                        )
                          ? Number(
                              point.altitudeKm
                            ).toFixed(
                              1
                            )
                          : 'N/A'
                      } km
                    </div>
                  `
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
              path =>
                path
            }

            pathPointLat={
              point =>
                point.lat
            }

            pathPointLng={
              point =>
                point.lng
            }

            pathPointAlt={
              point =>
                point.altitude
            }

            pathColor={() =>
              'rgba(255,255,255,0.55)'
            }

            pathStroke={
              1.25
            }

            pathDashLength={
              0.02
            }

            pathDashGap={
              0.008
            }

            pathDashAnimateTime={
              0
            }
          />

          {/* ==================================================
              GLOBE STATUS
          ================================================== */}

          <div
            style={{
              position:
                'absolute',
              top:
                '1rem',
              left:
                '1rem',
              padding:
                '0.65rem 0.8rem',
              background:
                'rgba(0,0,0,0.78)',
              border:
                '1px solid rgba(255,255,255,0.13)',
              fontFamily:
                'monospace',
              fontSize:
                '0.62rem',
              letterSpacing:
                '0.5px',
              pointerEvents:
                'none'
            }}
          >
            <div
              style={{
                color:
                  '#ffffff'
              }}
            >
              {viewMode ===
              'pads'
                ? 'LAUNCH FACILITIES'
                : 'ORBITAL OBJECTS'}
            </div>

            <div
              style={{
                color:
                  '#71717a',
                marginTop:
                  '0.25rem'
              }}
            >
              {viewMode ===
              'pads'
                ? `${renderPads.length} LOCATIONS`
                : `${satellites.length.toLocaleString()} OBJECTS`}
            </div>
          </div>

          {/* ==================================================
              LOADING OVERLAY
          ================================================== */}

          {loadingSats &&
            viewMode ===
              'satellites' && (
              <div
                style={{
                  position:
                    'absolute',
                  inset: 0,
                  display:
                    'flex',
                  alignItems:
                    'center',
                  justifyContent:
                    'center',
                  pointerEvents:
                    'none'
                }}
              >
                <div
                  style={{
                    padding:
                      '0.9rem 1.1rem',
                    background:
                      'rgba(0,0,0,0.82)',
                    border:
                      '1px solid rgba(255,255,255,0.15)',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace',
                    fontSize:
                      '0.7rem',
                    letterSpacing:
                      '1px'
                  }}
                >
                  {loadingMessage ||
                    'LOADING...'}
                </div>
              </div>
            )}

          {/* ==================================================
              SATELLITE LEGEND
          ================================================== */}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                bottom:
                  '1rem',
                left:
                  '1rem',
                display:
                  'flex',
                flexDirection:
                  'column',
                gap:
                  '0.3rem',
                padding:
                  '0.65rem 0.8rem',
                background:
                  'rgba(0,0,0,0.78)',
                border:
                  '1px solid rgba(255,255,255,0.13)',
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
              <span>
                ● TLE / SGP4 POSITION
              </span>

              <span>
                ○ SELECT OBJECT FOR ORBIT
              </span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          WIKI / SATELLITE DATABASE
      ====================================================== */}

      {viewMode ===
        'wiki' && (
        <div
          style={{
            width:
              '100%',
            background:
              '#000000',
            border:
              '1px solid rgba(255,255,255,0.10)',
            overflow:
              'hidden'
          }}
        >
          <div
            style={{
              padding:
                '1rem',
              borderBottom:
                '1px solid rgba(255,255,255,0.10)',
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
            <div>
              <div
                style={{
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.6rem',
                  color:
                    '#71717a',
                  letterSpacing:
                    '1.5px'
                }}
              >
                // SATELLITE DATABASE
              </div>

              <div
                style={{
                  marginTop:
                    '0.3rem',
                  fontSize:
                    '0.9rem',
                  color:
                    '#ffffff'
                }}
              >
                {totalWikiCount.toLocaleString()}{' '}
                OBJECTS
              </div>
            </div>

            {loadingSats && (
              <span
                style={{
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.6rem',
                  color:
                    '#71717a'
                }}
              >
                QUERYING...
              </span>
            )}
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
                borderCollapse:
                  'collapse',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.65rem'
              }}
            >
              <thead>
                <tr>
                  {[
                    'NORAD ID',
                    'NAME',
                    'ORGANIZATION',
                    'LAT',
                    'LNG',
                    'ALTITUDE',
                    'VELOCITY',
                    'ACTION'
                  ].map(
                    header => (
                      <th
                        key={
                          header
                        }
                        style={{
                          textAlign:
                            'left',
                          padding:
                            '0.7rem',
                          color:
                            '#71717a',
                          fontWeight:
                            '500',
                          borderBottom:
                            '1px solid rgba(255,255,255,0.10)',
                          whiteSpace:
                            'nowrap'
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  row => {
                    const formatted =
                      formatSatellite(
                        row
                      );

                    return (
                      <tr
                        key={
                          String(
                            row.id
                          )
                        }
                        style={{
                          borderBottom:
                            '1px solid rgba(255,255,255,0.055)'
                        }}
                      >
                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#ffffff',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {row.id}
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#ffffff',
                            minWidth:
                              '240px'
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
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
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
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.lat
                            )
                          )
                            ? Number(
                                formatted.lat
                              ).toFixed(
                                3
                              )
                            : 'N/A'}
                          °
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.lng
                            )
                          )
                            ? Number(
                                formatted.lng
                              ).toFixed(
                                3
                              )
                            : 'N/A'}
                          °
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.altitudeKm
                            )
                          )
                            ? Number(
                                formatted.altitudeKm
                              ).toFixed(
                                1
                              )
                            : 'N/A'}{' '}
                          km
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem',
                            color:
                              '#a1a1aa',
                            whiteSpace:
                              'nowrap'
                          }}
                        >
                          {Number.isFinite(
                            Number(
                              formatted.velocityKmS
                            )
                          )
                            ? Number(
                                formatted.velocityKmS
                              ).toFixed(
                                2
                              )
                            : 'N/A'}{' '}
                          km/s
                        </td>

                        <td
                          style={{
                            padding:
                              '0.7rem'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleWikiSatellite(
                                row
                              )
                            }
                            style={{
                              ...buttonStyle,
                              padding:
                                '0.35rem 0.55rem'
                            }}
                          >
                            VIEW
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )}

                {wikiData.length ===
                  0 &&
                  !loadingSats && (
                    <tr>
                      <td
                        colSpan={
                          8
                        }
                        style={{
                          padding:
                            '3rem',
                          textAlign:
                            'center',
                          color:
                            '#52525b',
                          fontFamily:
                            'monospace'
                        }}
                      >
                        NO OBJECTS FOUND
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              PAGINATION
          ================================================== */}

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
              margin:
                '1rem',
              borderTop:
                '1px solid rgba(255,255,255,0.12)',
              paddingTop:
                '0.8rem'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.65rem',
                color:
                  '#71717a',
                fontFamily:
                  'monospace'
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
                  ...buttonStyle,
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage ===
                    0
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#ffffff',
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
                  ...buttonStyle,
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.08)',
                  color:
                    wikiPage +
                      1 >=
                    maxPages
                      ? '#52525b'
                      : '#ffffff',
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
              borderRadius:
                '2px',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(8,8,8,0.92)'
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
                    '0.65rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
                  fontWeight:
                    '800'
                }}
              >
                // LAUNCH FACILITY
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#ffffff'
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
                  '0.8rem'
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  FACILITY
                </p>

                <h3
                  style={{
                    margin:
                      '0.2rem 0 0',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  COUNTRY / REGION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
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
                      '0.6rem',
                    color:
                      '#71717a'
                  }}
                >
                  EXACT COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {Number(
                    selectedPad.lat
                  ).toFixed(
                    5
                  )}
                  °
                  {' '}
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
              borderRadius:
                '2px',
              border:
                '1px solid rgba(255,255,255,0.15)',
              background:
                'rgba(8,8,8,0.92)'
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
                    '0.65rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '2px',
                  textTransform:
                    'uppercase',
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
                    '#888888',
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
                  'repeat(auto-fit,minmax(180px,1fr))',
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
                      ) +
                      ' km'
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
                      ) +
                      ' km/s'
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
                      ) +
                      '°'
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
                    <p
                      style={{
                        margin:
                          0,
                        fontSize:
                          '0.6rem',
                        color:
                          '#71717a'
                      }}
                    >
                      {label}
                    </p>

                    <p
                      style={{
                        margin:
                          '0.2rem 0 0',
                        fontSize:
                          label ===
                          'OBJECT NAME'
                            ? '1rem'
                            : '0.85rem',
                        color:
                          '#ffffff',
                        fontFamily:
                          label ===
                            'LATITUDE' ||
                          label ===
                            'LONGITUDE' ||
                          label ===
                            'ALTITUDE' ||
                          label ===
                            'VELOCITY'
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
                    </p>
                  </div>
                )
              )}
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
                flexWrap:
                  'wrap',
                gap:
                  '0.5rem'
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.6rem',
                  color:
                    '#ffffff',
                  fontFamily:
                    'monospace'
                }}
              >
                ● POSITION PROPAGATED FROM TLE
              </span>

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
                UPDATES CONTINUOUSLY
              </span>
            </div>
          </div>
        )}
