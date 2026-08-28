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

/* ============================================================
   3D GLOBE
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          background: '#000000',
          fontFamily: 'monospace',
          fontSize: '0.7rem',
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
const POSITION_UPDATE_MS = 1000;
const MAX_ORBIT_POINTS = 360;

/*
 * This controls how many satellite points are allowed
 * into the WebGL scene at once.
 *
 * 16000 is the full database target.
 */
const MAX_GLOBE_SATELLITES = 16000;

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
      'Unable to parse TLE:',
      row?.name || row?.id,
      error
    );

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
    const propagated =
      satellite.propagate(
        sat.satrec,
        date
      );

    if (
      !propagated ||
      !propagated.position
    ) {
      return null;
    }

    const gmst =
      satellite.gstime(date);

    const geodetic =
      satellite.eciToGeodetic(
        propagated.position,
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

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(altitudeKm)
    ) {
      return null;
    }

    let velocityKmS = null;

    if (propagated.velocity) {
      const velocity =
        propagated.velocity;

      velocityKmS = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
      );
    }

    return {
      ...sat,

      lat,
      lng,

      altitudeKm,

      velocityKmS,

      /*
       * react-globe.gl altitude is measured
       * in multiples of Earth radius.
       */
      globeAltitude: Math.max(
        0.002,
        altitudeKm /
          EARTH_RADIUS_KM
      ),

      telemetryTime:
        date.toISOString()
    };
  } catch {
    return null;
  }
}

/* ============================================================
   FORMAT SATELLITE
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
   * IMPORTANT:
   *
   * If a valid TLE exists, the database coordinates
   * are NOT used for live position.
   *
   * Position is calculated from SGP4.
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

  /*
   * Fallback only for records that do not have
   * usable TLE data.
   */
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
        ) / EARTH_RADIUS_KM
      ),

    telemetryTime:
      row.updated_at ||
      null
  };
}

/* ============================================================
   ORBITAL PERIOD
============================================================ */

function getOrbitalPeriodMinutes(sat) {
  /*
   * Database mean_motion is normally
   * revolutions per day.
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
    return 1440 / meanMotion;
  }

  /*
   * satellite.js satrec.no is radians/minute.
   *
   * Therefore:
   *
   * period = 2π / no
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
   REAL ORBIT PATH
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
    periodMinutes /
    MAX_ORBIT_POINTS;

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
          0.004,
          propagated.globeAltitude +
            0.003
        )
    });
  }

  /*
   * Split the path at the ±180°
   * international date line.
   */
  const paths = [];

  let currentPath = [];

  for (
    let i = 0;
    i < points.length;
    i++
  ) {
    const point =
      points[i];

    if (
      currentPath.length > 0
    ) {
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

    currentPath.push(
      point
    );
  }

  if (
    currentPath.length > 1
  ) {
    paths.push(
      currentPath
    );
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

  const satelliteCacheRef =
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
    if (requestedView?.mode) {
      setViewMode(
        requestedView.mode
      );
    }
  }, [requestedView]);

  /* ==========================================================
     PAD FILTER
  ========================================================== */

  const filteredPads = useMemo(
    () => {
      return globalLaunchPads.filter(
        pad =>
          padFilter === 'all' ||
          pad.type === padFilter
      );
    },
    [padFilter]
  );

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

        if (
          filter === 'active'
        ) {
          /*
           * No "active" column is assumed.
           *
           * Active means usable TLE data exists.
           */
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
        const rows = [];

        let from = 0;

        const applyFilter =
          getSatelliteFilter(
            filter
          );

        while (
          from <
          MAX_GLOBE_SATELLITES
        ) {
          let query =
            supabase
              .from('satellites')
              .select('*');

          query =
            applyFilter(query);

          const batchEnd =
            Math.min(
              from +
                SUPABASE_BATCH_SIZE -
                1,
              MAX_GLOBE_SATELLITES -
                1
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
                batchEnd
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

          /*
           * DO NOT update a visible
           * "1000 / 2000 / 3000..."
           * loading counter.
           *
           * The globe simply shows a
           * single loading state.
           */

          if (
            data.length <
            SUPABASE_BATCH_SIZE
          ) {
            break;
          }

          from +=
            SUPABASE_BATCH_SIZE;
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

    async function loadSatellites() {
      const cached =
        satelliteCacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(
          cached
        );

        return;
      }

      setLoadingSats(true);

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

        satelliteCacheRef.current[
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
          setSatellites([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(
            false
          );
        }
      }
    }

    loadSatellites();

    return () => {
      cancelled = true;
    };
  }, [
    satFilter,
    viewMode,
    fetchSatelliteRows
  ]);

  /* ==========================================================
     LIVE SGP4 UPDATES
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

    function updatePositions(
      timestamp
    ) {
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
     RENDER SATELLITES
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

          return {
            ...sat,

            displayColor:
              isSelected
                ? '#ffffff'
                : isHovered
                  ? 'rgba(255,255,255,0.85)'
                  : 'rgba(255,255,255,0.55)',

            displayRadius:
              isSelected
                ? 0.85
                : isHovered
                  ? 0.65
                  : 0.32,

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
     WIKI DATABASE
  ========================================================== */

  useEffect(() => {
    if (
      viewMode !== 'wiki'
    ) {
      return undefined;
    }

    let cancelled = false;

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
          .order(
            'id',
            {
              ascending: true
            }
          )
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
          'Wiki fetch error:',
          error
        );
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

  /* ==========================================================
     PAGINATION
  ========================================================== */

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
          setSelectedPad(
            point
          );

          if (
            globeRef.current
          ) {
            globeRef.current.pointOfView(
              {
                lat:
                  point.lat,
                lng:
                  point.lng,
                altitude:
                  1.45
              },
              700
            );
          }

          return;
        }

        setSelectedSat(
          point
        );

        if (
          globeRef.current
        ) {
          globeRef.current.pointOfView(
            {
              lat:
                point.lat,
              lng:
                point.lng,
              altitude:
                1.7
            },
            700
          );
        }
      },
      [viewMode]
    );

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
        gap: '1rem'
      }}
    >
      <style>
        {`
          .orbital-button {
            transition:
              background 0.15s ease,
              border-color 0.15s ease;
          }

          .orbital-button:hover:not(:disabled) {
            background: rgba(255,255,255,0.10) !important;
            border-color: rgba(255,255,255,0.35) !important;
          }

          .orbital-search::placeholder {
            color: #52525b;
          }

          .orbital-scrollbar::-webkit-scrollbar {
            width: 6px;
          }

          .orbital-scrollbar::-webkit-scrollbar-track {
            background: #050505;
          }

          .orbital-scrollbar::-webkit-scrollbar-thumb {
            background: #27272a;
            border-radius: 4px;
          }

          .orbital-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #3f3f46;
          }

          @keyframes orbitalStars {
            from {
              transform: translate3d(0,0,0);
            }

            to {
              transform: translate3d(-120px,60px,0);
            }
          }

          .orbital-starfield {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
            background:
              radial-gradient(
                ellipse at 50% 50%,
                rgba(20,25,35,0.12) 0%,
                rgba(0,0,0,0.96) 70%
              ),
              #000000;
          }

          .orbital-starfield::before {
            content: '';
            position: absolute;
            inset: -100px;
            background-image:
              radial-gradient(circle at 4% 12%, rgba(255,255,255,0.75) 0 0.7px, transparent 1px),
              radial-gradient(circle at 11% 68%, rgba(255,255,255,0.50) 0 0.6px, transparent 1px),
              radial-gradient(circle at 18% 31%, rgba(190,205,225,0.55) 0 0.7px, transparent 1px),
              radial-gradient(circle at 26% 83%, rgba(255,255,255,0.65) 0 0.8px, transparent 1px),
              radial-gradient(circle at 33% 18%, rgba(255,255,255,0.48) 0 0.6px, transparent 1px),
              radial-gradient(circle at 41% 57%, rgba(215,225,240,0.55) 0 0.7px, transparent 1px),
              radial-gradient(circle at 49% 9%, rgba(255,255,255,0.70) 0 0.7px, transparent 1px),
              radial-gradient(circle at 56% 76%, rgba(255,255,255,0.48) 0 0.6px, transparent 1px),
              radial-gradient(circle at 64% 37%, rgba(195,210,230,0.60) 0 0.7px, transparent 1px),
              radial-gradient(circle at 71% 91%, rgba(255,255,255,0.55) 0 0.7px, transparent 1px),
              radial-gradient(circle at 79% 22%, rgba(255,255,255,0.72) 0 0.8px, transparent 1px),
              radial-gradient(circle at 87% 61%, rgba(210,220,235,0.50) 0 0.6px, transparent 1px),
              radial-gradient(circle at 95% 14%, rgba(255,255,255,0.62) 0 0.7px, transparent 1px);
            background-size: 280px 280px;
            opacity: 0.85;
            animation: orbitalStars 70s linear infinite;
          }

          .orbital-starfield::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(
                ellipse at 20% 30%,
                rgba(70,80,105,0.035),
                transparent 35%
              ),
              radial-gradient(
                ellipse at 75% 65%,
                rgba(90,95,115,0.025),
                transparent 40%
              );
          }

          .orbital-globe-frame {
            position: relative;
            width: 100%;
            height: 560px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.12);
            background: #000000;
          }
        `}
      </style>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent:
            'space-between'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: '#71717a',
              letterSpacing: '2px',
              textTransform:
                'uppercase',
              fontWeight: '700'
            }}
          >
            // DISPLAY MODE
          </span>

          {[
            {
              key: 'pads',
              label: 'Launch Pads'
            },
            {
              key: 'satellites',
              label: 'Satellites'
            },
            {
              key: 'wiki',
              label: 'Database'
            }
          ].map(button => (
            <button
              key={button.key}
              className="orbital-button"
              onClick={() => {
                setViewMode(
                  button.key
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
                  '0.5rem 0.9rem',
                background:
                  viewMode ===
                  button.key
                    ? 'rgba(255,255,255,0.13)'
                    : 'rgba(255,255,255,0.03)',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                color: '#ffffff',
                fontSize:
                  '0.65rem',
                fontWeight: '700',
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

        {/* ====================================================
            PAD FILTERS
        ==================================================== */}

        {viewMode ===
          'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '0.35rem'
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
                    '0.4rem 0.7rem',
                  background:
                    padFilter ===
                    filter
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.16)',
                  color: '#ffffff',
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

        {/* ====================================================
            SATELLITE FILTERS
        ==================================================== */}

        {viewMode ===
          'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '0.35rem',
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
                key={
                  filter.key
                }
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
                    '1px solid rgba(255,255,255,0.16)',
                  color: '#ffffff',
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

      {viewMode !==
        'wiki' && (
        <div
          className="orbital-globe-frame"
        >
          <div
            className="orbital-starfield"
          />

          <div
            style={{
              position:
                'absolute',
              inset: 0,
              zIndex: 1
            }}
          >
            <ReactGlobe
              ref={globeRef}

              /*
               * Keep the Earth image exactly
               * where the working version had it.
               */
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="rgba(0,0,0,0)"

              animateIn={false}

              enablePointerInteraction={
                true
              }

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
                  ? 0.012
                  : d =>
                      d.displayAltitude ||
                      d.globeAltitude ||
                      0.002
              }

              pointColor={() =>
                '#ffffff'
              }

              pointRadius={
                viewMode ===
                'pads'
                  ? 0.65
                  : d =>
                      d.displayRadius ||
                      0.32
              }

              pointResolution={6}

              /*
               * REAL ORBIT PATH
               */
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
                'rgba(255,255,255,0.62)'
              }

              pathStroke={1.1}

              pathDashLength={
                0.025
              }

              pathDashGap={
                0.012
              }

              pathDashAnimateTime={
                4500
              }

              /*
               * Selection ring
               */
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
                'rgba(255,255,255,0.75)'
              }

              ringMaxRadius={2.2}

              ringPropagationSpeed={
                1.2
              }

              ringRepeatPeriod={
                1200
              }

              /*
               * Click handling
               */
              onPointClick={
                handlePointClick
              }

              /*
               * Hover handling
               */
              onPointHover={
                point => {
                  if (
                    viewMode ===
                    'satellites'
                  ) {
                    setHoveredSat(
                      point ||
                        null
                    );
                  }
                }
              }

              /*
               * Empty globe click.
               */
              onGlobeClick={() => {
                if (
                  viewMode ===
                  'satellites'
                ) {
                  setSelectedSat(
                    null
                  );

                  setHoveredSat(
                    null
                  );
                }
              }}

              /*
               * Clean labels.
               */
              pointLabel={
                point => {
                  if (
                    viewMode ===
                    'pads'
                  ) {
                    return `
                      <div style="
                        background: rgba(0,0,0,0.92);
                        border: 1px solid rgba(255,255,255,0.25);
                        padding: 8px 10px;
                        font-family: monospace;
                        font-size: 10px;
                        color: #ffffff;
                        pointer-events: none;
                      ">
                        <strong>${point.name}</strong><br/>
                        ${point.agency || ''}
                      </div>
                    `;
                  }

                  return `
                    <div style="
                      background: rgba(0,0,0,0.92);
                      border: 1px solid rgba(255,255,255,0.25);
                      padding: 8px 10px;
                      font-family: monospace;
                      font-size: 10px;
                      color: #ffffff;
                      pointer-events: none;
                    ">
                      <strong>${point.name || 'UNKNOWN OBJECT'}</strong><br/>
                      NORAD: ${point.id ?? 'N/A'}<br/>
                      ALT: ${
                        Number.isFinite(
                          Number(
                            point.altitudeKm
                          )
                        )
                          ? Number(
                              point.altitudeKm
                            ).toFixed(1)
                          : 'N/A'
                      } km
                    </div>
                  `;
                }
              }
            />
          </div>

          {/* ==================================================
              LOADING INDICATOR
          ================================================== */}

          {loadingSats &&
            viewMode ===
              'satellites' && (
              <div
                style={{
                  position:
                    'absolute',
                  top: '0.8rem',
                  right: '0.8rem',
                  zIndex: 5,
                  padding:
                    '0.45rem 0.7rem',
                  background:
                    'rgba(0,0,0,0.82)',
                  border:
                    '1px solid rgba(255,255,255,0.18)',
                  color:
                    '#d4d4d8',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.58rem',
                  letterSpacing:
                    '1px'
                }}
              >
                LOADING ORBITAL DATA...
              </div>
            )}

          {/* ==================================================
              SATELLITE COUNT
          ================================================== */}

          {viewMode ===
            'satellites' &&
            !loadingSats && (
              <div
                style={{
                  position:
                    'absolute',
                  bottom: '0.8rem',
                  left: '0.8rem',
                  zIndex: 5,
                  padding:
                    '0.35rem 0.55rem',
                  background:
                    'rgba(0,0,0,0.72)',
                  border:
                    '1px solid rgba(255,255,255,0.10)',
                  color:
                    '#a1a1aa',
                  fontFamily:
                    'monospace',
                  fontSize:
                    '0.55rem',
                  letterSpacing:
                    '0.8px'
                }}
              >
                {satellites.length.toLocaleString()}{' '}
                OBJECTS TRACKED
              </div>
            )}
        </div>
      )}

      {/* ======================================================
          DATABASE / WIKI
      ====================================================== */}

      {viewMode ===
        'wiki' && (
        <div
          style={{
            padding:
              '1.2rem',
            border:
              '1px solid rgba(255,255,255,0.12)',
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
              flexWrap:
                'wrap',
              gap: '0.8rem',
              marginBottom:
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
              // SATELLITE DATABASE
              {' '}
              ({totalWikiCount.toLocaleString()})
            </span>

            <input
              className="orbital-search"
              type="text"
              placeholder="Search name or NORAD ID..."
              value={
                wikiSearch
              }
              onChange={event => {
                setWikiSearch(
                  event
                    .target
                    .value
                );

                setWikiPage(
                  0
                );
              }}
              style={{
                width:
                  '320px',
                maxWidth:
                  '100%',
                padding:
                  '0.55rem 0.75rem',
                background:
                  '#050505',
                border:
                  '1px solid rgba(255,255,255,0.15)',
                color:
                  '#ffffff',
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
            className="orbital-scrollbar"
            style={{
              maxHeight:
                '430px',
              overflowY:
                'auto',
              border:
                '1px solid rgba(255,255,255,0.06)'
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
                  '#d4d4d8'
              }}
            >
              <thead>
                <tr
                  style={{
                    position:
                      'sticky',
                    top: 0,
                    background:
                      '#050505',
                    borderBottom:
                      '1px solid rgba(255,255,255,0.14)',
                    color:
                      '#a1a1aa',
                    textAlign:
                      'left'
                  }}
                >
                  <th
                    style={{
                      padding:
                        '0.65rem'
                    }}
                  >
                    NORAD ID
                  </th>

                  <th
                    style={{
                      padding:
                        '0.65rem'
                    }}
                  >
                    OBJECT NAME
                  </th>

                  <th
                    style={{
                      padding:
                        '0.65rem'
                    }}
                  >
                    ORGANIZATION
                  </th>

                  <th
                    style={{
                      padding:
                        '0.65rem'
                    }}
                  >
                    TLE
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
                          '1px solid rgba(255,255,255,0.05)'
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '0.65rem',
                          color:
                            '#ffffff'
                        }}
                      >
                        {
                          item.id
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.65rem',
                          color:
                            '#ffffff',
                          fontWeight:
                            '700'
                        }}
                      >
                        {
                          item.name ||
                          'UNKNOWN'
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.65rem',
                          color:
                            '#a1a1aa'
                        }}
                      >
                        {
                          item.organization ||
                          'UNKNOWN'
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '0.65rem',
                          color:
                            hasValidTLE(
                              item
                            )
                              ? '#ffffff'
                              : '#52525b'
                        }}
                      >
                        {hasValidTLE(
                          item
                        )
                          ? 'AVAILABLE'
                          : 'MISSING'}
                      </td>
                    </tr>
                  )
                )}

                {!loadingSats &&
                  wikiData.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding:
                            '2rem',
                          textAlign:
                            'center',
                          color:
                            '#52525b'
                        }}
                      >
                        NO MATCHING OBJECTS
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
              paddingTop:
                '0.8rem',
              borderTop:
                '1px solid rgba(255,255,255,0.10)'
            }}
          >
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
                  '0.4rem'
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
                    '0.4rem 0.7rem',
                  background:
                    wikiPage ===
                    0
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.07)',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#ffffff',
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
                    page =>
                      page + 1
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.7rem',
                  background:
                    wikiPage +
                      1 >=
                    maxPages
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.07)',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage +
                      1 >=
                    maxPages
                      ? '#52525b'
                      : '#ffffff',
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
                '1.2rem',
              border:
                '1px solid rgba(255,255,255,0.12)',
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
                  fontSize:
                    '0.6rem',
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
                    '#a1a1aa'
                }}
              >
                OPERATIONAL
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
                  '0.9rem'
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      '0.55rem',
                    color:
                      '#52525b'
                  }}
                >
                  FACILITY
                </p>

                <h3
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
                      '0.55rem',
                    color:
                      '#52525b'
                  }}
                >
                  AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.8rem',
                    color:
                      '#ffffff'
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
                      '0.55rem',
                    color:
                      '#52525b'
                  }}
                >
                  COUNTRY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.8rem',
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
                      '0.55rem',
                    color:
                      '#52525b'
                  }}
                >
                  COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.8rem',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace'
                  }}
                >
                  {Number(
                    selectedPad.lat
                  ).toFixed(
                    4
                  )}
                  °,{' '}
                  {Number(
                    selectedPad.lng
                  ).toFixed(
                    4
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
                '1.2rem',
              border:
                '1px solid rgba(255,255,255,0.12)',
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
                  fontSize:
                    '0.6rem',
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
                className="orbital-button"
                onClick={() =>
                  setSelectedSat(
                    null
                  )
                }
                style={{
                  background:
                    'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.12)',
                  color:
                    '#a1a1aa',
                  padding:
                    '0.3rem 0.5rem',
                  cursor:
                    'pointer',
                  fontSize:
                    '0.55rem'
                }}
              >
                CLOSE
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
                  '0.9rem'
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
                    ? `${Number(
                        selectedSat.lat
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'
                ],
                [
                  'LONGITUDE',
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
                ],
                [
                  'ALTITUDE',
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
                ],
                [
                  'VELOCITY',
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
                ],
                [
                  'INCLINATION',
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
                ],
                [
                  'ORBIT SOURCE',
                  selectedSat.satrec
                    ? 'SGP4 / TLE'
                    : 'DATABASE FALLBACK'
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
                          '0.55rem',
                        color:
                          '#52525b'
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
                            ? '0.9rem'
                            : '0.75rem',
                        color:
                          '#ffffff',
                        fontWeight:
                          label ===
                          'OBJECT NAME'
                            ? '700'
                            : '400',
                        fontFamily:
                          [
                            'LATITUDE',
                            'LONGITUDE',
                            'ALTITUDE',
                            'VELOCITY'
                          ].includes(
                            label
                          )
                            ? 'monospace'
                            : 'inherit'
                      }}
                    >
                      {
                        value
                      }
                    </p>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop:
                  '1rem',
                paddingTop:
                  '0.7rem',
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
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
                    '0.55rem',
                  color:
                    '#ffffff',
                  fontFamily:
                    'monospace'
                }}
              >
                ● SGP4 POSITION PROPAGATION
              </span>

              <span
                style={{
                  fontSize:
                    '0.55rem',
                  color:
                    '#52525b',
                  fontFamily:
                    'monospace'
                }}
              >
                LIVE POSITION UPDATE
              </span>
            </div>
          </div>
        )}
    </div>
  );
}
