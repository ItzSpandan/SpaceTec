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
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        letterSpacing: '1px',
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  ),
});

const EARTH_RADIUS_KM = 6371;
const SUPABASE_BATCH_SIZE = 1000;
const TELEMETRY_INTERVAL_MS = 1000;
const MAX_ORBIT_POINTS = 180;
const DEFAULT_ORBIT_MINUTES = 92;

const globalLaunchPads = [
  { id: 1, name: 'Kennedy Space Center (LC-39A)', agency: 'NASA / SpaceX', lat: 28.5858, lng: -80.6511, type: 'major', country: 'USA' },
  { id: 2, name: 'Cape Canaveral Space Force Station (SLC-40)', agency: 'SpaceX / USSF', lat: 28.5619, lng: -80.5772, type: 'major', country: 'USA' },
  { id: 3, name: 'Vandenberg Space Force Base (SLC-4E)', agency: 'SpaceX / USSF', lat: 34.7420, lng: -120.5724, type: 'major', country: 'USA' },
  { id: 4, name: 'Wallops Flight Facility', agency: 'NASA / Northrop Grumman', lat: 37.9332, lng: -75.4836, type: 'minor', country: 'USA' },
  { id: 5, name: 'Boca Chica Launch Site (Starbase)', agency: 'SpaceX', lat: 25.9973, lng: -97.1560, type: 'major', country: 'USA' },
  { id: 6, name: 'Pacific Spaceport Complex (Alaska)', agency: 'Astra / USSF', lat: 57.4358, lng: -152.3477, type: 'minor', country: 'USA' },
  { id: 7, name: 'Guiana Space Centre (Ariane ELA-4)', agency: 'ESA / Arianespace', lat: 5.2372, lng: -52.7683, type: 'major', country: 'French Guiana' },
  { id: 8, name: 'Esrange Space Center', agency: 'SSC', lat: 67.8894, lng: 21.1050, type: 'minor', country: 'Sweden' },
  { id: 9, name: 'Andøya Spaceport', agency: 'Andøya Space', lat: 69.2933, lng: 16.0167, type: 'minor', country: 'Norway' },
  { id: 10, name: 'Baikonur Cosmodrome', agency: 'Roscosmos', lat: 45.9646, lng: 63.3052, type: 'major', country: 'Kazakhstan' },
  { id: 11, name: 'Plesetsk Cosmodrome', agency: 'Roscosmos', lat: 62.9298, lng: 40.5735, type: 'major', country: 'Russia' },
  { id: 12, name: 'Vostochny Cosmodrome', agency: 'Roscosmos', lat: 51.8841, lng: 128.3339, type: 'major', country: 'Russia' },
  { id: 13, name: 'Satish Dhawan Space Centre (SDSC)', agency: 'ISRO', lat: 13.7199, lng: 80.2304, type: 'major', country: 'India' },
  { id: 14, name: 'Jiuquan Satellite Launch Center', agency: 'CNSA', lat: 40.9575, lng: 100.2917, type: 'major', country: 'China' },
  { id: 15, name: 'Wenchang Space Launch Site', agency: 'CNSA', lat: 19.6145, lng: 110.9510, type: 'major', country: 'China' },
  { id: 16, name: 'Xichang Satellite Launch Center', agency: 'CNSA', lat: 28.2465, lng: 102.0264, type: 'minor', country: 'China' },
  { id: 17, name: 'Taiyuan Satellite Launch Center', agency: 'CNSA', lat: 38.8490, lng: 111.6080, type: 'minor', country: 'China' },
  { id: 18, name: 'Tanegashima Space Center', agency: 'JAXA', lat: 30.4000, lng: 130.9700, type: 'major', country: 'Japan' },
  { id: 19, name: 'Uchinoura Space Center', agency: 'JAXA', lat: 31.2515, lng: 131.0825, type: 'minor', country: 'Japan' },
  { id: 20, name: 'Naro Space Center', agency: 'KARI', lat: 34.4315, lng: 127.5350, type: 'minor', country: 'South Korea' },
  { id: 21, name: 'Mahia Launch Complex 1', agency: 'Rocket Lab', lat: -39.2608, lng: 177.8656, type: 'minor', country: 'New Zealand' },
  { id: 22, name: 'Arnhem Space Centre', agency: 'Equatorial Launch Australia', lat: -12.3780, lng: 136.8150, type: 'minor', country: 'Australia' },
  { id: 23, name: 'Imam Khomeini Spaceport', agency: 'ISA', lat: 35.2344, lng: 53.9211, type: 'minor', country: 'Iran' },
  { id: 24, name: 'Al-Dahik Launch Site', agency: 'NARSS', lat: 28.4890, lng: 30.4120, type: 'minor', country: 'Egypt' },
];

function safeNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeLongitude(value) {
  let longitude = safeNumber(value, 0);

  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;

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
  if (!hasValidTLE(row)) return null;

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

function propagateSatellite(sat, date = new Date()) {
  if (!sat?.satrec) return null;

  try {
    const result = satellite.propagate(
      sat.satrec,
      date
    );

    if (!result?.position || !result?.velocity) {
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
      safeNumber(
        geodetic.height,
        null
      );

    const velocityKmS =
      Math.sqrt(
        result.velocity.x ** 2 +
        result.velocity.y ** 2 +
        result.velocity.z ** 2
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

      globeAltitude:
        Math.max(
          0.01,
          altitudeKm /
            EARTH_RADIUS_KM
        ),

      velocityKmS,
      velocity: velocityKmS,

      positionEci:
        result.position,

      velocityEci:
        result.velocity,

      telemetryTime:
        date.toISOString(),
    };
  } catch (error) {
    return null;
  }
}

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

    trackable:
      Boolean(satrec),
  };

  const propagated =
    propagateSatellite(
      base,
      new Date()
    );

  if (propagated) {
    return propagated;
  }

  const databaseVelocity =
    safeNumber(
      row.velocity,
      null
    );

  const databaseAltitude =
    safeNumber(
      row.altitude,
      400
    );

  return {
    ...base,

    lat:
      safeNumber(
        row.lat,
        0
      ),

    lng:
      normalizeLongitude(
        row.lng
      ),

    altitudeKm:
      databaseAltitude,

    globeAltitude:
      Math.max(
        0.01,
        databaseAltitude /
          EARTH_RADIUS_KM
      ),

    velocityKmS:
      databaseVelocity,

    velocity:
      databaseVelocity,

    telemetryTime:
      row.updated_at ||
      null,
  };
}

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

  if (
    sat?.satrec?.no &&
    sat.satrec.no > 0
  ) {
    return (
      (2 * Math.PI) /
      sat.satrec.no
    );
  }

  return DEFAULT_ORBIT_MINUTES;
}

function generateOrbitPath(
  sat,
  centerDate = new Date()
) {
  if (!sat?.satrec) {
    return [];
  }

  const period =
    Math.max(
      20,
      Math.min(
        1440,
        getOrbitalPeriodMinutes(
          sat
        )
      )
    );

  const sampleCount =
    Math.min(
      MAX_ORBIT_POINTS,
      180
    );

  const stepMinutes =
    period /
    sampleCount;

  const points = [];

  for (
    let i = 0;
    i <= sampleCount;
    i += 1
  ) {
    const offsetMinutes =
      -period / 2 +
      i * stepMinutes;

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
      lat:
        propagated.lat,

      lng:
        propagated.lng,

      altitude:
        Math.max(
          0.01,
          propagated.globeAltitude *
            1.015
        ),
    });
  }

  return points;
}

export default function OrbitalGlobe({
  requestedView
}) {
  const globeRef =
    useRef(null);

  const cacheRef =
    useRef({});

  const animationRef =
    useRef(null);

  const lastUpdateRef =
    useRef(0);

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

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(
        requestedView.mode
      );

      setSelectedSat(null);
      setHoveredSat(null);
    }
  }, [requestedView]);

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad =>
        padFilter === 'all' ||
        pad.type === padFilter
    );
  }, [padFilter]);

  const applySatelliteFilter =
    useCallback(
      (query, filter) => {
        if (
          filter === 'stations'
        ) {
          return query.or(
            'name.ilike.%ISS%,name.ilike.%CSS%,name.ilike.%TIANGONG%,name.ilike.%STATION%'
          );
        }

        if (
          filter === 'starlink'
        ) {
          return query.ilike(
            'name',
            '%STARLINK%'
          );
        }

        if (
          filter === 'weather'
        ) {
          return query.or(
            'name.ilike.%NOAA%,name.ilike.%GOES%,name.ilike.%METEOR%,name.ilike.%METOP%,name.ilike.%JPSS%'
          );
        }

        if (
          filter === 'active'
        ) {
          return query
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

        return query;
      },
      []
    );

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
        cacheRef.current[
          satFilter
        ];

      if (cached) {
        setSatellites(
          cached
        );

        setSelectedSat(null);
        setHoveredSat(null);

        return;
      }

      setLoadingSats(true);

      setLoadingMessage(
        'LOADING ORBITAL DATABASE...'
      );

      try {
        const rows = [];

        let from = 0;

        while (true) {
          let query =
            supabase
              .from(
                'satellites'
              )
              .select('*')
              .order(
                'id',
                {
                  ascending:
                    true,
                }
              )
              .range(
                from,
                from +
                  SUPABASE_BATCH_SIZE -
                  1
              );

          query =
            applySatelliteFilter(
              query,
              satFilter
            );

          const {
            data,
            error,
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

          if (
            data.length <
            SUPABASE_BATCH_SIZE
          ) {
            break;
          }

          from +=
            SUPABASE_BATCH_SIZE;
        }

        const formatted =
          rows.map(
            formatSatellite
          );

        if (cancelled) {
          return;
        }

        cacheRef.current[
          satFilter
        ] = formatted;

        setSatellites(
          formatted
        );

        setSelectedSat(null);
        setHoveredSat(null);
      } catch (error) {
        console.error(
          'Satellite database error:',
          error
        );

        if (!cancelled) {
          setSatellites([]);

          setSelectedSat(null);
          setHoveredSat(null);

          setLoadingMessage(
            'ORBITAL DATABASE ERROR'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(false);
        }
      }
    }

    loadSatellites();

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    satFilter,
    applySatelliteFilter,
  ]);

  useEffect(() => {
    if (
      viewMode !==
        'satellites' ||
      satellites.length === 0
    ) {
      return undefined;
    }

    let cancelled = false;

    const update = timestamp => {
      if (cancelled) {
        return;
      }

      if (
        timestamp -
          lastUpdateRef.current >=
        TELEMETRY_INTERVAL_MS
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
          previous => {
            if (
              !previous?.satrec
            ) {
              return previous;
            }

            return (
              propagateSatellite(
                previous,
                now
              ) || previous
            );
          }
        );
      }

      animationRef.current =
        requestAnimationFrame(
          update
        );
    };

    animationRef.current =
      requestAnimationFrame(
        update
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
    satellites.length,
  ]);

  useEffect(() => {
    if (
      viewMode !== 'wiki'
    ) {
      return undefined;
    }

    let cancelled = false;

    async function loadWiki() {
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
                count:
                  'exact',
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
          error,
        } = await query
          .order(
            'id',
            {
              ascending:
                true,
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
          'Wiki database error:',
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
        loadWiki,
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    wikiSearch,
    wikiPage,
    viewMode,
  ]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
    );

  const displayedSatellites =
    useMemo(() => {
      if (selectedSat) {
        const selected =
          satellites.find(
            sat =>
              String(
                sat.id
              ) ===
              String(
                selectedSat.id
              )
          );

        return selected
          ? [
              {
                ...selected,

                displayColor:
                  '#ffffff',

                displayRadius:
                  0.48,
              },
            ]
          : [];
      }

      return satellites.map(
        sat => {
          const isHovered =
            String(
              hoveredSat?.id
            ) ===
            String(
              sat.id
            );

          return {
            ...sat,

            displayColor:
              isHovered
                ? '#ffffff'
                : 'rgba(255,255,255,0.72)',

            displayRadius:
              isHovered
                ? 0.42
                : 0.20,
          };
        }
      );
    }, [
      satellites,
      selectedSat,
      hoveredSat,
    ]);

  const selectedOrbit =
    useMemo(() => {
      if (
        viewMode !==
          'satellites' ||
        !selectedSat?.satrec
      ) {
        return [];
      }

      const path =
        generateOrbitPath(
          selectedSat,
          new Date()
        );

      return path.length > 1
        ? [path]
        : [];
    }, [
      viewMode,
      selectedSat,
      selectedSat?.lat,
      selectedSat?.lng,
    ]);

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
                  1.35,
              },
              900
            );
          }

          return;
        }

        setHoveredSat(
          null
        );

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
                1.65,
            },
            900
          );
        }
      },
      [viewMode]
    );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <style>{`
        @keyframes spaceDrift {
          from {
            background-position:
              0 0,
              0 0,
              0 0;
          }

          to {
            background-position:
              -500px 250px,
              350px -180px,
              -180px 420px;
          }
        }

        .realistic-space-bg {
          background-color: #01030a;

          background-image:
            radial-gradient(
              circle at 14% 22%,
              rgba(255,255,255,.95) 0 1px,
              transparent 1.5px
            ),
            radial-gradient(
              circle at 72% 34%,
              rgba(255,255,255,.75) 0 1px,
              transparent 1.5px
            ),
            radial-gradient(
              circle at 36% 76%,
              rgba(255,255,255,.8) 0 1px,
              transparent 1.5px
            );

          background-size:
            260px 220px,
            390px 310px,
            520px 420px;

          animation:
            spaceDrift 90s linear infinite;
        }

        .orbital-button {
          transition:
            background .15s ease,
            border-color .15s ease;
        }

        .orbital-button:hover {
          background:
            rgba(255,255,255,.10) !important;

          border-color:
            rgba(255,255,255,.42) !important;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #020202;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background:
            rgba(255,255,255,.22);
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
            gap: '.7rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '.7rem',
              color: '#a1a1aa',
              letterSpacing: '2px',
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
              label: 'Satellites',
            },
            {
              key: 'wiki',
              label: 'Database',
            },
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
                  '.5rem 1rem',

                background:
                  viewMode ===
                  button.key
                    ? '#ffffff'
                    : 'rgba(255,255,255,.04)',

                border:
                  `1px solid ${
                    viewMode ===
                    button.key
                      ? '#ffffff'
                      : 'rgba(255,255,255,.18)'
                  }`,

                color:
                  viewMode ===
                  button.key
                    ? '#020617'
                    : '#ffffff',

                fontSize:
                  '.7rem',

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
              {button.label}
            </button>
          ))}
        </div>

        {viewMode ===
          'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '.4rem',
            }}
          >
            {[
              'all',
              'major',
              'minor',
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
                    '.4rem .8rem',

                  background:
                    padFilter ===
                    filter
                      ? 'rgba(255,255,255,.12)'
                      : 'transparent',

                  border:
                    '1px solid rgba(255,255,255,.22)',

                  color:
                    '#ffffff',

                  fontSize:
                    '.6rem',

                  textTransform:
                    'uppercase',

                  cursor:
                    'pointer',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {viewMode ===
          'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '.4rem',
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
                    '.4rem .7rem',

                  background:
                    satFilter ===
                    filter.key
                      ? 'rgba(255,255,255,.12)'
                      : 'transparent',

                  border:
                    '1px solid rgba(255,255,255,.22)',

                  color:
                    '#ffffff',

                  fontSize:
                    '.6rem',

                  textTransform:
                    'uppercase',

                  cursor:
                    'pointer',
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode !==
      'wiki' ? (
        <div
          className="realistic-space-bg"
          style={{
            position:
              'relative',

            width:
              '100%',

            height:
              '550px',

            overflow:
              'hidden',

            border:
              '1px solid rgba(255,255,255,.14)',

            backgroundColor:
              '#01030a',
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
                : displayedSatellites
            }

            pointLat="lat"

            pointLng="lng"

            pointAltitude={
              viewMode ===
              'pads'
                ? 0.015
                : 'globeAltitude'
            }

            pointColor={
              viewMode ===
              'pads'
                ? '#ffffff'
                : 'displayColor'
            }

            pointRadius={
              viewMode ===
              'pads'
                ? 0.55
                : 'displayRadius'
            }

            pointResolution={8}

            pathsData={
              viewMode ===
              'satellites'
                ? selectedOrbit
                : []
            }

            pathPoints="points"

            pathPointLat="lat"

            pathPointLng="lng"

            pathPointAlt="altitude"

            pathColor={() =>
              'rgba(255,255,255,.72)'
            }

            pathStroke={1.15}

            pathDashLength={
              0.025
            }

            pathDashGap={
              0.012
            }

            pathDashAnimateTime={
              5000
            }

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
              '#ffffff'
            }

            ringMaxRadius={2.0}

            ringPropagationSpeed={
              1.2
            }

            ringRepeatPeriod={
              1200
            }

            onPointClick={
              handlePointClick
            }

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

            onPointHover={point => {
              if (
                viewMode !==
                'satellites'
              ) {
                return;
              }

              setHoveredSat(
                previous => {
                  const previousId =
                    previous?.id ==
                    null
                      ? null
                      : String(
                          previous.id
                        );

                  const nextId =
                    point?.id ==
                    null
                      ? null
                      : String(
                          point.id
                        );

                  if (
                    previousId ===
                    nextId
                  ) {
                    return previous;
                  }

                  return (
                    point ||
                    null
                  );
                }
              );
            }}

            pointLabel={point => {
              if (
                viewMode ===
                'pads'
              ) {
                return `
                  <div
                    style="
                      background:rgba(2,6,23,.96);
                      border:1px solid rgba(255,255,255,.45);
                      padding:9px 11px;
                      color:#fff;
                      font-family:monospace;
                      font-size:11px;
                    "
                  >
                    <b>
                      ${
                        point.name ||
                        'LAUNCH PAD'
                      }
                    </b>
                    <br/>

                    ${
                      point.agency ||
                      ''
                    }

                    <br/>

                    LAT ${
                      Number(
                        point.lat
                      ).toFixed(4)
                    }°

                    · LNG ${
                      Number(
                        point.lng
                      ).toFixed(4)
                    }°
                  </div>
                `;
              }

              const velocity =
                safeNumber(
                  point.velocityKmS,
                  safeNumber(
                    point.velocity,
                    null
                  )
                );

              const altitude =
                safeNumber(
                  point.altitudeKm,
                  null
                );

              return `
                <div
                  style="
                    background:rgba(2,6,23,.97);
                    border:1px solid rgba(255,255,255,.55);
                    padding:10px 12px;
                    color:#fff;
                    font-family:monospace;
                    font-size:11px;
                    min-width:190px;
                  "
                >
                  <b
                    style="
                      font-size:12px;
                    "
                  >
                    ${
                      point.name ||
                      'UNKNOWN SATELLITE'
                    }
                  </b>

                  <br/>

                  NORAD:
                  ${
                    point.id ??
                    'N/A'
                  }

                  <br/>

                  LAT:
                  ${
                    Number.isFinite(
                      Number(
                        point.lat
                      )
                    )
                      ? Number(
                          point.lat
                        ).toFixed(
                          4
                        ) + '°'
                      : 'N/A'
                  }

                  <br/>

                  LNG:
                  ${
                    Number.isFinite(
                      Number(
                        point.lng
                      )
                    )
                      ? Number(
                          point.lng
                        ).toFixed(
                          4
                        ) + '°'
                      : 'N/A'
                  }

                  <br/>

                  ALT:
                  ${
                    Number.isFinite(
                      altitude
                    )
                      ? altitude.toFixed(
                          1
                        ) + ' km'
                      : 'N/A'
                  }

                  <br/>

                  VELOCITY:
                  ${
                    Number.isFinite(
                      velocity
                    )
                      ? velocity.toFixed(
                          2
                        ) + ' km/s'
                      : 'N/A'
                  }
                </div>
              `;
            }}
          />

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',

                left:
                  '1rem',

                bottom:
                  '1rem',

                background:
                  'rgba(2,6,23,.88)',

                border:
                  '1px solid rgba(255,255,255,.18)',

                padding:
                  '.55rem .8rem',

                zIndex:
                  5,

                fontFamily:
                  'monospace',
              }}
            >
              <div
                style={{
                  fontSize:
                    '.6rem',

                  color:
                    '#ffffff',

                  letterSpacing:
                    '1px',
                }}
              >
                ● LIVE TLE
                PROPAGATION
              </div>

              <div
                style={{
                  marginTop:
                    '3px',

                  fontSize:
                    '.55rem',

                  color:
                    '#71717a',
                }}
              >
                SGP4 →
                CURRENT LAT /
                LNG / ALT /
                VELOCITY
              </div>
            </div>
          )}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',

                top:
                  '1rem',

                left:
                  '1rem',

                background:
                  'rgba(2,6,23,.88)',

                border:
                  '1px solid rgba(255,255,255,.18)',

                padding:
                  '.5rem .75rem',

                zIndex:
                  5,
              }}
            >
              <div
                style={{
                  fontSize:
                    '.55rem',

                  color:
                    '#71717a',

                  letterSpacing:
                    '1px',
                }}
              >
                OBJECTS
              </div>

              <div
                style={{
                  fontFamily:
                    'monospace',

                  color:
                    '#ffffff',

                  fontSize:
                    '.9rem',

                  fontWeight:
                    '700',
                }}
              >
                {satellites.length.toLocaleString()}
              </div>
            </div>
          )}

          {loadingSats &&
            viewMode ===
              'satellites' && (
              <div
                style={{
                  position:
                    'absolute',

                  top:
                    '1rem',

                  right:
                    '1rem',

                  background:
                    'rgba(2,6,23,.94)',

                  border:
                    '1px solid rgba(255,255,255,.2)',

                  padding:
                    '.5rem .8rem',

                  zIndex:
                    6,

                  color:
                    '#ffffff',

                  fontFamily:
                    'monospace',

                  fontSize:
                    '.6rem',

                  letterSpacing:
                    '1px',
                }}
              >
                {loadingMessage ||
                  'LOADING ORBITAL DATABASE...'}
              </div>
            )}
        </div>
      ) : (
        <div
          style={{
            padding:
              '1.5rem',

            border:
              '1px solid rgba(255,255,255,.15)',

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

              gap:
                '1rem',

              flexWrap:
                'wrap',

              marginBottom:
                '1rem',
            }}
          >
            <span
              style={{
                fontSize:
                  '.7rem',

                color:
                  '#ffffff',

                letterSpacing:
                  '2px',

                fontWeight:
                  '800',
              }}
            >
              // SATELLITE
              DATABASE —
              {totalWikiCount.toLocaleString()}
              MATCHES
            </span>

            <input
              type="text"

              placeholder="Search name or NORAD ID..."

              value={
                wikiSearch
              }

              onChange={
                event => {
                  setWikiSearch(
                    event.target
                      .value
                  );

                  setWikiPage(
                    0
                  );
                }
              }

              style={{
                background:
                  '#050505',

                border:
                  '1px solid rgba(255,255,255,.2)',

                padding:
                  '.55rem 1rem',

                color:
                  '#ffffff',

                fontSize:
                  '.75rem',

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
            className="orbital-scroll"
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
                  '.72rem',

                fontFamily:
                  'monospace',

                color:
                  '#d1d5db',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      '1px solid rgba(255,255,255,.2)',

                    textAlign:
                      'left',

                    color:
                      '#ffffff',

                    background:
                      '#050505',
                  }}
                >
                  <th
                    style={{
                      padding:
                        '.6rem',
                    }}
                  >
                    NORAD ID
                  </th>

                  <th
                    style={{
                      padding:
                        '.6rem',
                    }}
                  >
                    OBJECT NAME
                  </th>

                  <th
                    style={{
                      padding:
                        '.6rem',
                    }}
                  >
                    ORGANIZATION
                  </th>

                  <th
                    style={{
                      padding:
                        '.6rem',
                    }}
                  >
                    LAT
                  </th>

                  <th
                    style={{
                      padding:
                        '.6rem',
                    }}
                  >
                    LNG
                  </th>

                  <th
                    style={{
                      padding:
                        '.6rem',
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
                          '1px solid rgba(255,255,255,.06)',
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '.6rem',

                          color:
                            '#ffffff',
                        }}
                      >
                        {
                          item.id
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '.6rem',

                          color:
                            '#ffffff',

                          fontWeight:
                            '700',
                        }}
                      >
                        {
                          item.name
                        }
                      </td>

                      <td
                        style={{
                          padding:
                            '.6rem',
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
                            '.6rem',
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
                            '.6rem',
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
                            '.6rem',
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
                      '.7rem',
                  }}
                >
                  NO RECORDS
                  FOUND
                </div>
              )}
          </div>

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
                '1px solid rgba(255,255,255,.12)',

              paddingTop:
                '.8rem',
            }}
          >
            <span
              style={{
                fontSize:
                  '.65rem',

                color:
                  '#a1a1aa',
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
                  '.5rem',
              }}
            >
              <button
                disabled={
                  wikiPage ===
                  0
                }

                onClick={() =>
                  setWikiPage(
                    page =>
                      Math.max(
                        0,
                        page - 1
                      )
                  )
                }

                style={{
                  padding:
                    '.4rem .8rem',

                  background:
                    wikiPage ===
                    0
                      ? 'rgba(255,255,255,.02)'
                      : 'rgba(255,255,255,.08)',

                  border:
                    '1px solid rgba(255,255,255,.2)',

                  color:
                    wikiPage ===
                    0
                      ? '#52525b'
                      : '#ffffff',

                  fontSize:
                    '.65rem',

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
                  wikiPage + 1 >=
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
                    '.4rem .8rem',

                  background:
                    wikiPage + 1 >=
                    maxPages
                      ? 'rgba(255,255,255,.02)'
                      : 'rgba(255,255,255,.08)',

                  border:
                    '1px solid rgba(255,255,255,.2)',

                  color:
                    wikiPage + 1 >=
                    maxPages
                      ? '#52525b'
                      : '#ffffff',

                  fontSize:
                    '.65rem',

                  cursor:
                    wikiPage + 1 >=
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

      {viewMode ===
        'pads' &&
        selectedPad && (
          <div
            style={{
              padding:
                '1.5rem',

              border:
                '1px solid rgba(255,255,255,.15)',

              background:
                'rgba(10,15,25,.88)',
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
                    '.65rem',

                  color:
                    '#ffffff',

                  letterSpacing:
                    '2px',

                  fontWeight:
                    '800',
                }}
              >
                // LAUNCH
                FACILITY
                TELEMETRY
              </span>

              <span
                style={{
                  fontSize:
                    '.65rem',

                  color:
                    '#a1a1aa',
                }}
              >
                STATUS:
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
                  '.8rem',
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  FACILITY
                </p>

                <h3
                  style={{
                    margin:
                      '.2rem 0 0',

                    fontSize:
                      '1rem',

                    color:
                      '#ffffff',
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
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  AGENCY
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
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
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  COUNTRY
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
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
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  COORDINATES
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {
                    selectedPad.lat.toFixed(
                      4
                    )
                  }
                  °,{' '}
                  {
                    selectedPad.lng.toFixed(
                      4
                    )
                  }
                  °
                </p>
              </div>
            </div>
          </div>
        )}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            style={{
              padding:
                '1.5rem',

              border:
                '1px solid rgba(255,255,255,.15)',

              background:
                'rgba(10,15,25,.88)',
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
                    '.65rem',

                  color:
                    '#ffffff',

                  letterSpacing:
                    '2px',

                  fontWeight:
                    '800',
                }}
              >
                // ORBITAL
                INSPECTOR
              </span>

              <button
                onClick={() => {
                  setSelectedSat(
                    null
                  );

                  setHoveredSat(
                    null
                  );
                }}
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
                    '.7rem',
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
                  '.9rem',
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  OBJECT NAME
                </p>

                <h3
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',

                    fontSize:
                      '1rem',
                  }}
                >
                  {
                    selectedSat.name
                  }
                </h3>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  NORAD ID
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {
                    selectedSat.id
                  }
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  LATITUDE
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.lat
                    )
                  )
                    ? `${Number(
                        selectedSat.lat
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  LONGITUDE
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.lng
                    )
                  )
                    ? `${Number(
                        selectedSat.lng
                      ).toFixed(
                        4
                      )}°`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  ALTITUDE
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.altitudeKm
                    )
                  )
                    ? `${Number(
                        selectedSat.altitudeKm
                      ).toFixed(
                        1
                      )} km`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  VELOCITY
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',

                    fontWeight:
                      '700',
                  }}
                >
                  {Number.isFinite(
                    Number(
                      selectedSat.velocityKmS
                    )
                  ) &&
                  Number(
                    selectedSat.velocityKmS
                  ) > 0
                    ? `${Number(
                        selectedSat.velocityKmS
                      ).toFixed(
                        2
                      )} km/s`
                    : 'N/A'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  ORBIT SOURCE
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',
                  }}
                >
                  {selectedSat.trackable
                    ? 'CelesTrak TLE / SGP4'
                    : 'DATABASE FALLBACK'}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin:
                      0,

                    fontSize:
                      '.6rem',

                    color:
                      '#71717a',
                  }}
                >
                  TELEMETRY TIME
                </p>

                <p
                  style={{
                    margin:
                      '.2rem 0 0',

                    color:
                      '#ffffff',

                    fontSize:
                      '.75rem',
                  }}
                >
                  {selectedSat.telemetryTime
                    ? new Date(
                        selectedSat.telemetryTime
                      ).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
