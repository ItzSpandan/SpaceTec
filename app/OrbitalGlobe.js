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

/*
|--------------------------------------------------------------------------
| LAUNCH PADS
|--------------------------------------------------------------------------
| Clean white markers are used on the globe.
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isFiniteNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value);

const toNumber = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeLongitude = (lng) => {
  let result = Number(lng);

  if (!Number.isFinite(result)) {
    return 0;
  }

  while (result > 180) result -= 360;
  while (result < -180) result += 360;

  return result;
};

const normalizeLatitude = (lat) => {
  const value = Number(lat);

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-90, Math.min(90, value));
};

const getSatelliteId = (sat) => {
  if (sat?.id !== undefined && sat?.id !== null) {
    return String(sat.id);
  }

  if (sat?.norad_id !== undefined && sat?.norad_id !== null) {
    return String(sat.norad_id);
  }

  return '';
};

const hasTle = (sat) => {
  return (
    typeof sat?.tle_line1 === 'string' &&
    sat.tle_line1.trim().length > 0 &&
    typeof sat?.tle_line2 === 'string' &&
    sat.tle_line2.trim().length > 0
  );
};

const createSatrec = (sat) => {
  if (!hasTle(sat)) {
    return null;
  }

  try {
    return satellite.twoline2satrec(
      sat.tle_line1.trim(),
      sat.tle_line2.trim()
    );
  } catch (error) {
    console.warn(
      'Unable to parse TLE for satellite:',
      sat?.name,
      error
    );

    return null;
  }
};

const getEpochDate = (sat, satrec) => {
  const candidates = [
    sat?.orbital_epoch,
    sat?.epoch,
    satrec?.epochyr && satrec?.epochdays
      ? (() => {
          const year =
            satrec.epochyr < 57
              ? 2000 + satrec.epochyr
              : 1900 + satrec.epochyr;

          const date = new Date(Date.UTC(year, 0, 1));
          date.setUTCDate(
            date.getUTCDate() +
              Math.floor(satrec.epochdays - 1)
          );

          const fraction =
            satrec.epochdays -
            Math.floor(satrec.epochdays);

          date.setUTCMilliseconds(
            fraction * 24 * 60 * 60 * 1000
          );

          return date.toISOString();
        })()
      : null,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const date = new Date(candidate);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| REAL TLE PROPAGATION
|--------------------------------------------------------------------------
*/

const propagateSatellite = (sat, date = new Date()) => {
  if (!sat?.satrec) {
    return null;
  }

  try {
    const propagated = satellite.propagate(
      sat.satrec,
      date
    );

    if (
      !propagated ||
      !propagated.position ||
      !isFiniteNumber(propagated.position.x) ||
      !isFiniteNumber(propagated.position.y) ||
      !isFiniteNumber(propagated.position.z)
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geodetic = satellite.eciToGeodetic(
      propagated.position,
      gmst
    );

    const lat =
      satellite.degreesLat(geodetic.latitude);

    const lng =
      normalizeLongitude(
        satellite.degreesLong(geodetic.longitude)
      );

    const altitude =
      Number.isFinite(geodetic.height)
        ? geodetic.height / 6371
        : 0.05;

    const velocityVector =
      propagated.velocity;

    let velocity = sat.velocity;

    if (
      velocityVector &&
      isFiniteNumber(velocityVector.x) &&
      isFiniteNumber(velocityVector.y) &&
      isFiniteNumber(velocityVector.z)
    ) {
      velocity =
        Math.sqrt(
          velocityVector.x ** 2 +
            velocityVector.y ** 2 +
            velocityVector.z ** 2
        );
    }

    return {
      ...sat,
      lat: normalizeLatitude(lat),
      lng,
      globeAltitude: Math.max(
        0.015,
        Math.min(1.0, altitude)
      ),
      altitudeKm:
        Number.isFinite(geodetic.height)
          ? geodetic.height
          : sat.altitudeKm,
      velocity,
      lastPropagatedAt: date.toISOString(),
    };
  } catch (error) {
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| ORBIT PATH GENERATOR
|--------------------------------------------------------------------------
*/

const generateOrbitPath = (
  sat,
  date = new Date(),
  samples = 180
) => {
  if (!sat?.satrec) {
    return [];
  }

  try {
    const meanMotion =
      Number(sat.satrec.no);

    if (
      !Number.isFinite(meanMotion) ||
      meanMotion <= 0
    ) {
      return [];
    }

    const periodMinutes =
      (2 * Math.PI) / meanMotion;

    const totalMinutes =
      Math.min(
        Math.max(periodMinutes, 20),
        24 * 60
      );

    const points = [];

    for (let i = 0; i <= samples; i += 1) {
      const offsetMinutes =
        (i / samples) * totalMinutes;

      const pointDate = new Date(
        date.getTime() +
          offsetMinutes * 60 * 1000
      );

      const propagated =
        propagateSatellite(
          sat,
          pointDate
        );

      if (!propagated) {
        continue;
      }

      points.push({
        lat: propagated.lat,
        lng: propagated.lng,
        altitude:
          Math.max(
            0.02,
            Math.min(
              0.35,
              propagated.globeAltitude + 0.025
            )
          ),
      });
    }

    return points;
  } catch (error) {
    console.warn(
      'Orbit path generation failed:',
      error
    );

    return [];
  }
};

export default function OrbitalGlobe({
  requestedView,
}) {
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

  const [wikiData, setWikiData] =
    useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const [loadingSats, setLoadingSats] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const satCacheRef =
    useRef({});

  const lastTelemetryUpdateRef =
    useRef(0);

  const selectedSatIdRef =
    useRef(null);

  const pageSize = 50;

  const SATELLITE_UPDATE_INTERVAL = 1000;

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  useEffect(() => {
    selectedSatIdRef.current =
      selectedSat?.id ?? null;
  }, [selectedSat]);

  const filteredPads = useMemo(
    () =>
      globalLaunchPads.filter(
        (pad) =>
          padFilter === 'all' ||
          pad.type === padFilter
      ),
    [padFilter]
  );

  /*
   * Prepare a database record for the globe.
   */
  const formatSatellite = useCallback(
    (sat) => {
      const satrec = createSatrec(sat);

      const base = {
        ...sat,
        satrec,
        name:
          sat.name ||
          `NORAD ${getSatelliteId(sat)}`,
        organization:
          sat.organization || 'Unknown',
        color: '#ffffff',
        radius: 0.38,
        globeAltitude: 0.03,
        altitudeKm: toNumber(
          sat.altitude,
          null
        ),
        velocity: toNumber(
          sat.velocity,
          null
        ),
      };

      const propagated =
        satrec
          ? propagateSatellite(
              base,
              new Date()
            )
          : null;

      if (propagated) {
        return propagated;
      }

      return {
        ...base,
        lat: normalizeLatitude(
          toNumber(sat.lat, 0)
        ),
        lng: normalizeLongitude(
          toNumber(sat.lng, 0)
        ),
      };
    },
    []
  );

  /*
   * Load satellites from Supabase.
   *
   * IMPORTANT:
   * All Active intentionally does NOT use the old
   * 1,500-row cap.
   */
  useEffect(() => {
    if (viewMode === 'wiki') {
      return undefined;
    }

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
          let query =
            supabase
              .from('satellites')
              .select('*');

          if (satFilter === 'stations') {
            query =
              query.ilike(
                'name',
                '%ISS%'
              );
          } else if (
            satFilter === 'starlink'
          ) {
            query =
              query.ilike(
                'name',
                '%STARLINK%'
              );
          } else if (
            satFilter === 'weather'
          ) {
            query =
              query.or(
                'name.ilike.%NOAA%,name.ilike.%GOES%'
              );
          }

          const {
            data,
            error,
          } = await query;

          if (error) {
            throw error;
          }

          if (cancelled) {
            return;
          }

          const formatted =
            (data || [])
              .map(formatSatellite)
              .filter(
                (sat) =>
                  Number.isFinite(
                    sat.lat
                  ) &&
                  Number.isFinite(
                    sat.lng
                  )
              );

          satCacheRef.current[
            cacheKey
          ] = formatted;

          setSatellites(formatted);

          setLastUpdated(
            new Date()
          );
        } catch (error) {
          console.error(
            'Supabase satellite fetch error:',
            error
          );

          if (!cancelled) {
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
    formatSatellite,
  ]);

  /*
   * Wiki / database search.
   */
  useEffect(() => {
    if (viewMode !== 'wiki') {
      return undefined;
    }

    let cancelled = false;

    const fetchWikiCatalog =
      async () => {
        setLoadingSats(true);

        try {
          const from =
            wikiPage * pageSize;

          const to =
            from + pageSize - 1;

          let query =
            supabase
              .from('satellites')
              .select(
                '*',
                {
                  count: 'exact',
                }
              );

          const trimmedSearch =
            wikiSearch.trim();

          if (trimmedSearch) {
            if (
              /^\d+$/.test(
                trimmedSearch
              )
            ) {
              query =
                query.or(
                  `name.ilike.%${trimmedSearch}%,id.eq.${trimmedSearch}`
                );
            } else {
              query =
                query.ilike(
                  'name',
                  `%${trimmedSearch}%`
                );
            }
          }

          const {
            data,
            count,
            error,
          } =
            await query
              .order(
                'id',
                {
                  ascending: true,
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

          if (!cancelled) {
            setWikiData([]);
            setTotalWikiCount(0);
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
    viewMode,
  ]);

  /*
   * Keep a clock for live telemetry display.
   */
  useEffect(() => {
    const timer =
      setInterval(
        () =>
          setCurrentTime(
            new Date()
          ),
        1000
      );

    return () =>
      clearInterval(timer);
  }, []);

  /*
   * REAL-TIME TLE PROPAGATION
   *
   * This does NOT move longitude by a fake amount.
   *
   * Every second the current TLE is propagated to
   * the actual current time.
   */

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      satellites.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;

    function updatePositions(
      timestamp
    ) {
      if (cancelled) return;

      if (
        timestamp -
          lastTelemetryUpdateRef.current >=
        SATELLITE_UPDATE_INTERVAL
      ) {
        lastTelemetryUpdateRef.current =
          timestamp;

        const now =
          new Date();

        setSatellites(
          (previous) =>
            previous.map(
              (sat) => {
                if (!sat.satrec) {
                  return sat;
                }

                const updated =
                  propagateSatellite(
                    sat,
                    now
                  );

                return (
                  updated || sat
                );
              }
            )
        );

        setLastUpdated(
          now
        );
      }

      requestAnimationFrame(
        updatePositions
      );
    }

    const animationFrame =
      requestAnimationFrame(
        updatePositions
      );

    return () => {
      cancelled = true;
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, [
    viewMode,
    satellites.length,
  ]);

  /*
   * Recalculate selected satellite position
   * separately so the inspector stays live.
   */
  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      !selectedSat?.satrec
    ) {
      return undefined;
    }

    const timer =
      setInterval(() => {
        const updated =
          propagateSatellite(
            selectedSat,
            new Date()
          );

        if (updated) {
          setSelectedSat(
            (current) => ({
              ...current,
              ...updated,
            })
          );
        }
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    viewMode,
    selectedSat?.id,
    selectedSat?.satrec,
  ]);

  /*
   * Clean white satellite markers.
   */
  const renderSatellites =
    useMemo(() => {
      return satellites.map(
        (sat) => {
          const isFocused =
            hoveredSat?.id ===
              sat.id ||
            selectedSat?.id ===
              sat.id;

          const isDimmed =
            Boolean(
              hoveredSat ||
                selectedSat
            ) && !isFocused;

          return {
            ...sat,
            color:
              isDimmed
                ? 'rgba(255,255,255,0.16)'
                : '#ffffff',
            radius:
              isFocused
                ? 0.62
                : 0.38,
            displayAltitude:
              Math.max(
                0.015,
                Math.min(
                  0.8,
                  sat.globeAltitude ||
                    0.03
                )
              ),
          };
        }
      );
    }, [
      satellites,
      hoveredSat,
      selectedSat,
    ]);

  /*
   * Actual orbital path from the selected
   * satellite's TLE.
   */
  const orbitalPaths =
    useMemo(() => {
      if (
        viewMode !==
          'satellites' ||
        !selectedSat?.satrec
      ) {
        return [];
      }

      const points =
        generateOrbitPath(
          selectedSat,
          currentTime,
          180
        );

      return points.length > 1
        ? [points]
        : [];
    }, [
      selectedSat,
      currentTime,
      viewMode,
    ]);

  const maxPages =
    Math.max(
      1,
      Math.ceil(
        totalWikiCount /
          pageSize
      )
    );

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
              1px 1px at 20px 30px,
              rgba(255,255,255,0.75),
              rgba(0,0,0,0)
            ),
            radial-gradient(
              1px 1px at 40px 70px,
              rgba(255,255,255,0.5),
              rgba(0,0,0,0)
            ),
            radial-gradient(
              1px 1px at 90px 40px,
              rgba(255,255,255,0.7),
              rgba(0,0,0,0)
            ),
            radial-gradient(
              1px 1px at 160px 120px,
              rgba(255,255,255,0.55),
              rgba(0,0,0,0)
            );

          background-repeat: repeat;
          background-size: 350px 350px;
          animation:
            spaceScroll 35s linear infinite;
        }
      `}</style>

      {/* VIEW / FILTER CONTROLS */}

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
            gap: '0.8rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: '#a1a1aa',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '700',
            }}
          >
            // DISPLAY MODE:
          </span>

          {[
            {
              key: 'pads',
              label: 'Launch Pads',
            },
            {
              key: 'satellites',
              label: `Live Globe Satellites (${satellites.length})`,
            },
            {
              key: 'wiki',
              label: 'Satellite Database',
            },
          ].map((btn) => (
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
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.05)',
                border:
                  `1px solid ${
                    viewMode ===
                    btn.key
                      ? '#ffffff'
                      : 'rgba(255,255,255,0.15)'
                  }`,
                color:
                  viewMode ===
                  btn.key
                    ? '#000000'
                    : '#ffffff',
                fontSize:
                  '0.7rem',
                fontWeight:
                  '700',
                letterSpacing:
                  '1px',
                textTransform:
                  'uppercase',
                cursor:
                  'pointer',
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
              gap: '0.4rem',
            }}
          >
            {[
              'all',
              'major',
              'minor',
            ].map((f) => (
              <button
                key={f}
                onClick={() =>
                  setPadFilter(f)
                }
                style={{
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    padFilter ===
                    f
                      ? '#ffffff'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.45)',
                  color:
                    padFilter ===
                    f
                      ? '#000000'
                      : '#ffffff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer',
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
              flexWrap: 'wrap',
            }}
          >
            {[
              {
                key: 'stations',
                label: 'Stations',
              },
              {
                key: 'starlink',
                label: 'Starlink',
              },
              {
                key: 'weather',
                label: 'Weather',
              },
              {
                key: 'active',
                label: 'All Active',
              },
            ].map((f) => (
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
                      ? '#ffffff'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.45)',
                  color:
                    satFilter ===
                    f.key
                      ? '#000000'
                      : '#ffffff',
                  fontSize:
                    '0.6rem',
                  textTransform:
                    'uppercase',
                  cursor:
                    'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GLOBE */}

      {viewMode !==
      'wiki' ? (
        <div
          className="moving-space-bg"
          style={{
            position:
              'relative',
            width: '100%',
            height: '550px',
            borderRadius: '2px',
            overflow:
              'hidden',
            border:
              '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position:
                'absolute',
              top: 0,
              left: 0,
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
                  ? 0.012
                  : 'displayAltitude'
              }

              pointColor={
                () =>
                  '#ffffff'
              }

              pointRadius={
                viewMode ===
                'pads'
                  ? (
                      d
                    ) =>
                      d.type ===
                      'major'
                        ? 0.75
                        : 0.5
                  : (
                      d
                    ) =>
                      d.radius ||
                      0.38
              }

              pointsMerge={
                true
              }

              pathsData={
                viewMode ===
                'satellites'
                  ? orbitalPaths
                  : []
              }

              pathColor={() =>
                'rgba(255,255,255,0.8)'
              }

              pathDashLength={
                0.035
              }

              pathDashGap={
                0.02
              }

              pathDashAnimateTime={
                3500
              }

              pathStroke={1.2}

              ringsData={
                viewMode ===
                  'satellites' &&
                selectedSat
                  ? [
                      selectedSat,
                    ]
                  : viewMode ===
                      'pads' &&
                    selectedPad
                  ? [
                      selectedPad,
                    ]
                  : []
              }

              ringColor={() =>
                'rgba(255,255,255,0.9)'
              }

              ringMaxRadius={
                viewMode ===
                'pads'
                  ? 2.5
                  : 3.5
              }

              ringPropagationSpeed={
                1.5
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

              onPointClick={(d) => {
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
                          1.35,
                      },
                      1000
                    );
                  }
                } else {
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
                          1.7,
                      },
                      1000
                    );
                  }
                }
              }}

              onPointHover={(d) => {
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

              pointLabel={(d) => `
                <div style="
                  background:rgba(0,0,0,0.94);
                  padding:10px 12px;
                  border:1px solid rgba(255,255,255,0.65);
                  font-family:monospace;
                  font-size:11px;
                  color:#fff;
                  pointer-events:none;
                  max-width:280px;
                ">
                  <b style="
                    color:#fff;
                    font-size:12px;
                  ">
                    ${d.name || 'UNKNOWN'}
                  </b>
                  <br/>
                  ${
                    viewMode ===
                    'pads'
                      ? `
                        Agency:
                        ${d.agency || 'N/A'}
                        <br/>
                        Coordinates:
                        ${Number(d.lat).toFixed(4)}°,
                        ${Number(d.lng).toFixed(4)}°
                      `
                      : `
                        NORAD:
                        ${getSatelliteId(d) || 'N/A'}
                        <br/>
                        Lat:
                        ${Number(d.lat).toFixed(4)}°
                        <br/>
                        Lng:
                        ${Number(d.lng).toFixed(4)}°
                        <br/>
                        Alt:
                        ${
                          Number.isFinite(
                            d.altitudeKm
                          )
                            ? `${d.altitudeKm.toFixed(1)} km`
                            : 'N/A'
                        }
                      `
                  }
                </div>
              `}
            />
          </div>

          {loadingSats && (
            <div
              style={{
                position:
                  'absolute',
                top: '1rem',
                right: '1rem',
                background:
                  'rgba(0,0,0,0.88)',
                padding:
                  '0.4rem 0.8rem',
                border:
                  '1px solid rgba(255,255,255,0.55)',
                zIndex: 10,
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#ffffff',
                  letterSpacing:
                    '1px',
                }}
              >
                QUERYING SUPABASE...
              </span>
            </div>
          )}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                bottom:
                  '0.75rem',
                left:
                  '0.75rem',
                background:
                  'rgba(0,0,0,0.75)',
                padding:
                  '0.35rem 0.65rem',
                border:
                  '1px solid rgba(255,255,255,0.18)',
                zIndex: 5,
                fontFamily:
                  'monospace',
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.58rem',
                  color:
                    '#ffffff',
                }}
              >
                {satellites.length}
                {' '}
                OBJECTS
                {' • '}
                LIVE TLE
                {' • '}
                {currentTime.toISOString()}
              </span>
            </div>
          )}
        </div>
      ) : (
        /* WIKI */
        <div
          style={{
            padding:
              '1.5rem',
            borderRadius:
              '2px',
            border:
              '1px solid rgba(255,255,255,0.18)',
            background:
              '#000000',
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
              gap: '1rem',
            }}
          >
            <span
              style={{
                fontSize:
                  '0.7rem',
                color:
                  '#ffffff',
                letterSpacing:
                  '2px',
                textTransform:
                  'uppercase',
                fontWeight:
                  '800',
              }}
            >
              // SATELLITE DATABASE
              {' '}
              (TOTAL MATCHES:
              {' '}
              {totalWikiCount})
            </span>

            <input
              type="text"
              placeholder="Search by name or NORAD ID across all records..."
              value={
                wikiSearch
              }
              onChange={(e) => {
                setWikiSearch(
                  e.target.value
                );
                setWikiPage(
                  0
                );
              }}
              style={{
                background:
                  'rgba(0,0,0,0.8)',
                border:
                  '1px solid rgba(255,255,255,0.3)',
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
                outline:
                  'none',
              }}
            />
          </div>

          <div
            style={{
              maxHeight:
                '420px',
              overflowY:
                'auto',
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
                  'transparent',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      '1px solid rgba(255,255,255,0.25)',
                    textAlign:
                      'left',
                    color:
                      '#ffffff',
                    background:
                      'rgba(255,255,255,0.03)',
                  }}
                >
                  <th
                    style={{
                      padding:
                        '0.6rem',
                    }}
                  >
                    NORAD ID
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem',
                    }}
                  >
                    OBJECT NAME
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem',
                    }}
                  >
                    ORGANIZATION
                  </th>

                  <th
                    style={{
                      padding:
                        '0.6rem',
                    }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      style={{
                        borderBottom:
                          '1px solid rgba(255,255,255,0.05)',
                        background:
                          'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#ffffff',
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
                            'bold',
                        }}
                      >
                        {item.name}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                        }}
                      >
                        {item.organization ||
                          'Unknown'}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#ffffff',
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
          {/* PAGINATION */}

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
                '1px solid rgba(255,255,255,0.15)',
              paddingTop:
                '0.8rem',
              background:
                'transparent',
            }}
          >
            <span
              style={{
                fontSize:
                  '0.65rem',
                color:
                  '#a1a1aa',
              }}
            >
              PAGE{' '}
              {wikiPage +
                1}{' '}
              OF{' '}
              {maxPages}
            </span>

            <div
              style={{
                display:
                  'flex',
                gap:
                  '0.5rem',
              }}
            >
              <button
                disabled={
                  wikiPage ===
                  0
                }
                onClick={() =>
                  setWikiPage(
                    (p) =>
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
                      : 'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.3)',
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
                      : 'pointer',
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
                    (p) =>
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
                      : 'rgba(255,255,255,0.12)',
                  border:
                    '1px solid rgba(255,255,255,0.3)',
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
                      : 'pointer',
                }}
              >
                NEXT PAGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAUNCH PAD INSPECTOR */}

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
                '1px solid rgba(255,255,255,0.18)',
              background:
                'rgba(10,15,25,0.88)',
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
                    '800',
                }}
              >
                // ACTIVE LAUNCH FACILITY
                {' '}
                TELEMETRY
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#ffffff',
                }}
              >
                STATUS:
                {' '}
                OPERATIONAL
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
                  '0.8rem',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {selectedPad.name}
                </h3>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                    fontWeight:
                      '700',
                  }}
                >
                  {selectedPad.agency}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {selectedPad.country}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {selectedPad.lat.toFixed(
                    4
                  )}
                  °,
                  {' '}
                  {selectedPad.lng.toFixed(
                    4
                  )}
                  °
                </p>
              </div>
            </div>
          </div>
        )}

      {/* SATELLITE INSPECTOR */}

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
                '1px solid rgba(255,255,255,0.18)',
              background:
                'rgba(10,15,25,0.88)',
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
                    '800',
                }}
              >
                // SATELLITE ORBITAL
                {' '}
                INSPECTOR
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
                    '0.7rem',
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
                  '0.8rem',
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {selectedSat.name}
                </h3>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                    fontWeight:
                      '700',
                  }}
                >
                  {selectedSat.organization ||
                    'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                    fontWeight:
                      '700',
                  }}
                >
                  {getSatelliteId(
                    selectedSat
                  ) ||
                    'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  STATUS
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                    fontWeight:
                      '700',
                  }}
                >
                  LIVE
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  LATITUDE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    selectedSat.lat
                  )
                    ? selectedSat.lat.toFixed(
                        4
                      )
                    : 'N/A'}
                  °
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  LONGITUDE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    selectedSat.lng
                  )
                    ? selectedSat.lng.toFixed(
                        4
                      )
                    : 'N/A'}
                  °
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
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

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    selectedSat.velocity
                  )
                    ? `${selectedSat.velocity.toFixed(
                        3
                      )} km/s`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
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
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.inclination
                    )
                  )
                    ? `${Number(
                        selectedSat.inclination
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  MEAN MOTION
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.mean_motion
                    )
                  )
                    ? Number(
                        selectedSat.mean_motion
                      ).toFixed(
                        8
                      )
                    : 'N/A'}
                  {' '}
                  rev/day
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  ECCENTRICITY
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.eccentricity
                    )
                  )
                    ? Number(
                        selectedSat.eccentricity
                      ).toFixed(
                        8
                      )
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  RAAN
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.raan
                    )
                  )
                    ? `${Number(
                        selectedSat.raan
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  ARG. PERIGEE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.9rem',
                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.arg_perigee
                    )
                  )
                    ? `${Number(
                        selectedSat.arg_perigee
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a',
                  }}
                >
                  LAST PROPAGATED
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0 0',
                    fontSize:
                      '0.75rem',
                    color:
                      '#ffffff',
                    fontFamily:
                      'monospace',
                  }}
                >
                  {selectedSat.lastPropagatedAt
                    ? new Date(
                        selectedSat.lastPropagatedAt
                      ).toLocaleTimeString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* ORBIT STATUS */}

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
                  '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.6rem',
                  color:
                    '#ffffff',
                  fontFamily:
                    'monospace',
                }}
              >
                ● TLE / SGP4
                {' '}
                PROPAGATION ACTIVE
              </span>

              <span
                style={{
                  fontSize:
                    '0.6rem',
                  color:
                    '#71717a',
                  fontFamily:
                    'monospace',
                }}
              >
                ORBIT PATH:
                {' '}
                {orbitalPaths.length >
                0
                  ? 'AVAILABLE'
                  : 'UNAVAILABLE'}
              </span>
            </div>
          </div>
        )}

      {/* GLOBAL UPDATE STATUS */}

      {viewMode ===
        'satellites' && (
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
              '0.5rem',
            padding:
              '0.65rem 0.8rem',
            border:
              '1px solid rgba(255,255,255,0.1)',
            background:
              'rgba(0,0,0,0.35)',
          }}
        >
          <span
            style={{
              fontSize:
                '0.6rem',
              color:
                '#ffffff',
              fontFamily:
                'monospace',
            }}
          >
            LIVE SATELLITE TELEMETRY
          </span>

          <span
            style={{
              fontSize:
                '0.6rem',
              color:
                '#71717a',
              fontFamily:
                'monospace',
            }}
          >
            UPDATED:
            {' '}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString()
              : 'WAITING'}
          </span>
        </div>
      )}
    </div>
  );
}
