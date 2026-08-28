'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
        fontSize: '0.8rem'
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  )
});

const globalLaunchPads = [
  {
    id: 1,
    name: 'Kennedy Space Center (LC-39A)',
    agency: 'NASA / SpaceX',
    lat: 28.6084,
    lng: -80.6043,
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
    lat: 34.6328,
    lng: -120.6107,
    type: 'major',
    country: 'USA'
  },
  {
    id: 4,
    name: 'Wallops Flight Facility',
    agency: 'NASA / Northrop Grumman',
    lat: 37.9402,
    lng: -75.4664,
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
    name: 'Pacific Spaceport Complex Alaska',
    agency: 'Astra / USSF',
    lat: 57.4358,
    lng: -152.3477,
    type: 'minor',
    country: 'USA'
  },
  {
    id: 7,
    name: 'Guiana Space Centre',
    agency: 'ESA / Arianespace',
    lat: 5.2360,
    lng: -52.7680,
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
    lat: 45.9650,
    lng: 63.3050,
    type: 'major',
    country: 'Kazakhstan'
  },
  {
    id: 11,
    name: 'Plesetsk Cosmodrome',
    agency: 'Roscosmos',
    lat: 62.9278,
    lng: 40.5770,
    type: 'major',
    country: 'Russia'
  },
  {
    id: 12,
    name: 'Vostochny Cosmodrome',
    agency: 'Roscosmos',
    lat: 51.8844,
    lng: 128.3330,
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

function safeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getSatellitePosition(satrec, date) {
  try {
    const pv = satellite.propagate(satrec, date);

    if (!pv || !pv.position) return null;

    const gmst = satellite.gstime(date);

    const geodetic = satellite.eciToGeodetic(
      pv.position,
      gmst
    );

    const lat = satellite.degreesLat(geodetic.latitude);
    const lng = satellite.degreesLong(geodetic.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const altitude = Number(geodetic.height);

    let velocity = null;

    if (pv.velocity) {
      const v = pv.velocity;

      velocity = Math.sqrt(
        v.x * v.x +
        v.y * v.y +
        v.z * v.z
      );
    }

    return {
      lat,
      lng,
      altitudeKm: altitude,
      velocity
    };
  } catch {
    return null;
  }
}

function createSatrec(row) {
  if (!row?.tle_line1 || !row?.tle_line2) {
    return null;
  }

  try {
    return satellite.twoline2satrec(
      String(row.tle_line1).trim(),
      String(row.tle_line2).trim()
    );
  } catch {
    return null;
  }
}

function getOrbitPeriodMinutes(row, satrec) {
  const mm =
    safeNumber(row?.mean_motion) ||
    safeNumber(satrec?.no);

  if (!mm) return 90;

  // mean_motion from database is normally revolutions/day.
  if (mm > 0.1 && mm < 20) {
    return 1440 / mm;
  }

  // satellite.js satrec.no is radians/minute.
  if (mm > 0 && mm < 1) {
    return (2 * Math.PI) / mm;
  }

  return 90;
}

function calculateOrbit(row, satrec) {
  if (!satrec) return [];

  const periodMinutes = Math.max(
    20,
    Math.min(
      1440,
      getOrbitPeriodMinutes(row, satrec)
    )
  );

  const points = [];
  const now = new Date();

  const samples = 180;
  const totalMinutes = periodMinutes;

  for (let i = 0; i <= samples; i++) {
    const minutes =
      -totalMinutes / 2 +
      (totalMinutes * i) / samples;

    const time = new Date(
      now.getTime() + minutes * 60 * 1000
    );

    const position = getSatellitePosition(
      satrec,
      time
    );

    if (!position) continue;

    points.push({
      lat: position.lat,
      lng: position.lng,
      altitude:
        Math.max(0.01, position.altitudeKm) /
        6371
    });
  }

  return points;
}

export default function OrbitalGlobe({ requestedView }) {
  const globeRef = useRef(null);

  const satrecCacheRef = useRef({});
  const rawSatelliteCacheRef = useRef({});

  const [viewMode, setViewMode] = useState('pads');

  const [padFilter, setPadFilter] = useState('all');

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

  const [lastUpdate, setLastUpdate] =
    useState(null);

  const [wikiData, setWikiData] = useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const pageSize = 50;

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      p =>
        padFilter === 'all' ||
        p.type === padFilter
    );
  }, [padFilter]);

  async function fetchAllRows() {
    const all = [];

    const batchSize = 1000;

    let start = 0;

    while (true) {
      const { data, error } = await supabase
        .from('satellites')
        .select('*')
        .range(
          start,
          start + batchSize - 1
        );

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        break;
      }

      all.push(...data);

      if (data.length < batchSize) {
        break;
      }

      start += batchSize;

      if (start > 100000) {
        break;
      }
    }

    return all;
  }

  function matchesFilter(row) {
    const name =
      String(row?.name || '').toUpperCase();

    if (satFilter === 'stations') {
      return (
        name.includes('ISS') ||
        name.includes('ZARYA') ||
        name.includes('TIANGONG') ||
        name.includes('CSS')
      );
    }

    if (satFilter === 'starlink') {
      return name.includes('STARLINK');
    }

    if (satFilter === 'weather') {
      return (
        name.includes('NOAA') ||
        name.includes('GOES') ||
        name.includes('METEOSAT') ||
        name.includes('METEOR') ||
        name.includes('JPSS') ||
        name.includes('SUOMI')
      );
    }

    if (satFilter === 'active') {
      return true;
    }

    return true;
  }

  function prepareSatellite(row) {
    const key = String(row.id);

    let satrec =
      satrecCacheRef.current[key];

    if (!satrec) {
      satrec = createSatrec(row);

      if (satrec) {
        satrecCacheRef.current[key] =
          satrec;
      }
    }

    if (!satrec) return null;

    const now = new Date();

    const position =
      getSatellitePosition(
        satrec,
        now
      );

    if (!position) return null;

    const orbitalAltitude =
      Math.max(
        0.015,
        position.altitudeKm / 6371
      );

    return {
      ...row,

      lat: position.lat,
      lng: position.lng,

      altitudeKm:
        position.altitudeKm,

      velocityLive:
        position.velocity,

      altitude:
        orbitalAltitude,

      color: '#ffffff',

      radius: 0.22,

      satrec
    };
  }
    useEffect(() => {
    if (viewMode === 'wiki') return;

    let cancelled = false;

    async function loadSatellites() {
      setLoadingSats(true);

      try {
        let rows =
          rawSatelliteCacheRef.current[
            satFilter
          ];

        if (!rows) {
          const allRows =
            await fetchAllRows();

          rows = allRows.filter(
            matchesFilter
          );

          rawSatelliteCacheRef.current[
            satFilter
          ] = rows;
        }

        if (cancelled) return;

        const prepared = [];

        for (const row of rows) {
          const sat =
            prepareSatellite(row);

          if (sat) {
            prepared.push(sat);
          }
        }

        if (cancelled) return;

        setSatellites(prepared);

        setLastUpdate(
          new Date()
        );
      } catch (error) {
        console.error(
          'Satellite database error:',
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
    }

    loadSatellites();

    return () => {
      cancelled = true;
    };
  }, [satFilter, viewMode]);

  /*
   * REAL LIVE POSITION UPDATE
   *
   * We do NOT artificially increase longitude.
   *
   * Every 2 seconds the TLE is propagated
   * again for the current UTC time.
   */
  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      satellites.length === 0
    ) {
      return;
    }

    const timer = setInterval(() => {
      const now = new Date();

      setSatellites(previous => {
        return previous.map(sat => {
          if (!sat.satrec) {
            return sat;
          }

          const position =
            getSatellitePosition(
              sat.satrec,
              now
            );

          if (!position) {
            return sat;
          }

          return {
            ...sat,

            lat: position.lat,

            lng: position.lng,

            altitudeKm:
              position.altitudeKm,

            velocityLive:
              position.velocity,

            altitude:
              Math.max(
                0.015,
                position.altitudeKm /
                  6371
              )
          };
        });
      });

      setSelectedSat(current => {
        if (!current?.satrec) {
          return current;
        }

        const position =
          getSatellitePosition(
            current.satrec,
            now
          );

        if (!position) {
          return current;
        }

        return {
          ...current,

          lat: position.lat,

          lng: position.lng,

          altitudeKm:
            position.altitudeKm,

          velocityLive:
            position.velocity,

          altitude:
            Math.max(
              0.015,
              position.altitudeKm /
                6371
            )
        };
      });

      setLastUpdate(now);
    }, 2000);

    return () => {
      clearInterval(timer);
    };
  }, [
    viewMode,
    satellites.length
  ]);

  /*
   * WIKI DATABASE
   */
  useEffect(() => {
    if (viewMode !== 'wiki') return;

    let cancelled = false;

    async function fetchWikiCatalog() {
      setLoadingSats(true);

      try {
        const from =
          wikiPage * pageSize;

        const to =
          from + pageSize - 1;

        let query =
          supabase
            .from('satellites')
            .select('*', {
              count: 'exact'
            });

        const search =
          wikiSearch.trim();

        if (search) {
          if (/^\d+$/.test(search)) {
            query = query.or(
              `name.ilike.%${search}%,id.eq.${search}`
            );
          } else {
            query = query.ilike(
              'name',
              `%${search}%`
            );
          }
        }

        const result =
          await query
            .order('id', {
              ascending: true
            })
            .range(from, to);

        if (result.error) {
          throw result.error;
        }

        if (!cancelled) {
          setWikiData(
            result.data || []
          );

          setTotalWikiCount(
            result.count || 0
          );
        }
      } catch (error) {
        console.error(
          'Wiki fetch error:',
          error
        );
      } finally {
        if (!cancelled) {
          setLoadingSats(false);
        }
      }
    }

    const timeout =
      setTimeout(
        fetchWikiCatalog,
        250
      );

    return () =>
      clearTimeout(timeout);
  }, [
    wikiSearch,
    wikiPage,
    viewMode
  ]);

  /*
   * SELECTED SATELLITE ORBIT
   *
   * Calculated from the actual TLE.
   * No fake sine-wave orbit.
   */
  const orbitalPaths = useMemo(() => {
    if (!selectedSat?.satrec) {
      return [];
    }

    const points =
      calculateOrbit(
        selectedSat,
        selectedSat.satrec
      );

    if (points.length < 2) {
      return [];
    }

    return [points];
  }, [
    selectedSat?.id,
    selectedSat?.satrec,
    selectedSat?.lat,
    selectedSat?.lng
  ]);

  /*
   * IMPORTANT:
   * NO DIMMING.
   *
   * Every satellite stays white.
   * Only the selected satellite becomes
   * slightly larger.
   */
  const renderSatellites =
    useMemo(() => {
      return satellites.map(
        sat => ({
          ...sat,

          color: '#ffffff',

          radius:
            selectedSat?.id === sat.id
              ? 0.42
              : hoveredSat?.id === sat.id
              ? 0.32
              : 0.20
        })
      );
    }, [
      satellites,
      selectedSat,
      hoveredSat
    ]);

  const maxPages =
    Math.ceil(
      totalWikiCount / pageSize
    );

  function focusSatellite(sat) {
    setSelectedSat(sat);

    setHoveredSat(null);

    if (globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: sat.lat,
          lng: sat.lng,
          altitude: 1.8
        },
        1000
      );
    }
  }

  function focusPad(pad) {
    setSelectedPad(pad);

    if (globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: pad.lat,
          lng: pad.lng,
          altitude: 1.7
        },
        1000
      );
    }
  }

  function formatNumber(
    value,
    decimals = 2
  ) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return 'N/A';
    }

    return n.toFixed(decimals);
  }

  function formatUpdatedAt() {
    if (!lastUpdate) {
      return 'WAITING';
    }

    return lastUpdate.toLocaleTimeString(
      undefined,
      {
        hour12: false
      }
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto'
      }}
    >
      <style>{`
        @keyframes orbitalPulse {
          0% {
            opacity: 0.35;
            transform: scale(0.8);
          }

          50% {
            opacity: 1;
            transform: scale(1);
          }

          100% {
            opacity: 0.35;
            transform: scale(0.8);
          }
        }

        .orbital-space-bg {
          background:
            radial-gradient(
              circle at 50% 50%,
              rgba(255,255,255,0.025),
              transparent 55%
            ),
            #000000;
        }

        .orbital-button {
          transition:
            background 0.15s ease,
            border-color 0.15s ease,
            transform 0.15s ease;
        }

        .orbital-button:hover {
          transform: translateY(-1px);
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #050505;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background: #333333;
        }
      `}</style>

      {/* TOP CONTROLS */}

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
            gap: '0.5rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: '#888888',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '700'
            }}
          >
            // DISPLAY:
          </span>

          {[
            {
              key: 'pads',
              label: 'Launch Pads'
            },
            {
              key: 'satellites',
              label: `Satellites (${satellites.length})`
            },
            {
              key: 'wiki',
              label: 'Satellite Database'
            }
          ].map(btn => (
            <button
              key={btn.key}
              className="orbital-button"
              onClick={() => {
                setViewMode(btn.key);
                setSelectedSat(null);
                setHoveredSat(null);
              }}
              style={{
                padding:
                  '0.5rem 0.9rem',

                background:
                  viewMode === btn.key
                    ? '#ffffff'
                    : '#080808',

                border:
                  viewMode === btn.key
                    ? '1px solid #ffffff'
                    : '1px solid #333333',

                color:
                  viewMode === btn.key
                    ? '#000000'
                    : '#ffffff',

                fontSize: '0.65rem',

                fontWeight: '700',

                letterSpacing: '1px',

                textTransform:
                  'uppercase',

                cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {viewMode === 'pads' && (
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
                  setPadFilter(filter)
                }
                style={{
                  padding:
                    '0.4rem 0.7rem',

                  background:
                    padFilter === filter
                      ? '#ffffff'
                      : '#050505',

                  border:
                    '1px solid #444444',

                  color:
                    padFilter === filter
                      ? '#000000'
                      : '#ffffff',

                  fontSize: '0.6rem',

                  textTransform:
                    'uppercase',

                  cursor: 'pointer'
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'satellites' && (
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
                key={filter.key}
                className="orbital-button"
                onClick={() =>
                  setSatFilter(
                    filter.key
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.7rem',

                  background:
                    satFilter ===
                    filter.key
                      ? '#ffffff'
                      : '#050505',

                  border:
                    '1px solid #444444',

                  color:
                    satFilter ===
                    filter.key
                      ? '#000000'
                      : '#ffffff',

                  fontSize: '0.6rem',

                  textTransform:
                    'uppercase',

                  cursor: 'pointer'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GLOBE */}

      {viewMode !== 'wiki' ? (
        <div
          className="orbital-space-bg"
          style={{
            position: 'relative',
            width: '100%',
            height: '550px',
            borderRadius: '3px',
            overflow: 'hidden',
            border:
              '1px solid #222222'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              inset: 0
            }}
          >
            <ReactGlobe
              ref={globeRef}

              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="#000000"

              enablePointerInteraction={true}

              pointsData={
                viewMode === 'pads'
                  ? filteredPads
                  : renderSatellites
              }

              pointLat="lat"

              pointLng="lng"

              pointAltitude={
                viewMode === 'pads'
                  ? 0.015
                  : "altitude"
              }

              pointColor={
                () => '#ffffff'
              }

              pointRadius={
                viewMode === 'pads'
                  ? 0.55
                  : d =>
                      d.radius || 0.2
              }

              pointResolution={8}

              pointLabel={d => {
                if (
                  viewMode === 'pads'
                ) {
                  return `
                    <div style="
                      background:#050505;
                      border:1px solid #ffffff;
                      padding:8px 10px;
                      color:#ffffff;
                      font-family:monospace;
                      font-size:11px;
                      pointer-events:none;
                    ">
                      <b>${d.name}</b><br/>
                      ${d.agency}<br/>
                      ${d.country}<br/>
                      ${Number(d.lat).toFixed(4)}°,
                      ${Number(d.lng).toFixed(4)}°
                    </div>
                  `;
                }

                return `
                  <div style="
                    background:#050505;
                    border:1px solid #ffffff;
                    padding:8px 10px;
                    color:#ffffff;
                    font-family:monospace;
                    font-size:11px;
                    pointer-events:none;
                  ">
                    <b>${d.name || 'UNKNOWN'}</b><br/>
                    NORAD: ${d.id}<br/>
                    LAT: ${formatNumber(
                      d.lat,
                      4
                    )}°<br/>
                    LNG: ${formatNumber(
                      d.lng,
                      4
                    )}°<br/>
                    ALT: ${formatNumber(
                      d.altitudeKm,
                      1
                    )} km
                  </div>
                `;
              }}

              /*
               * CLICK FIX
               *
               * The actual clicked object is passed
               * directly into focusSatellite/focusPad.
               */
              onPointClick={d => {
                if (
                  viewMode === 'pads'
                ) {
                  focusPad(d);
                } else {
                  focusSatellite(d);
                }
              }}

              onPointHover={d => {
                if (
                  viewMode ===
                  'satellites'
                ) {
                  setHoveredSat(
                    d || null
                  );
                }
              }}

              onGlobeClick={() => {
                if (
                  viewMode ===
                  'satellites'
                ) {
                  setHoveredSat(null);
                }
              }}

              pathsData={
                viewMode ===
                  'satellites' &&
                selectedSat
                  ? orbitalPaths
                  : []
              }

              pathColor={() => '#ffffff'}

              pathStroke={1.2}

              pathDashLength={0.04}

              pathDashGap={0.02}

              pathDashAnimateTime={12000}

              pathTransitionDuration={0}

              ringsData={
                viewMode === 'pads'
                  ? selectedPad
                    ? [selectedPad]
                    : []
                  : selectedSat
                  ? [selectedSat]
                  : []
              }

              ringLat="lat"

              ringLng="lng"

              ringColor={() => '#ffffff'}

              ringMaxRadius={2.5}

              ringPropagationSpeed={1.2}

              ringRepeatPeriod={1800}
            />
          </div>

          {loadingSats && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background:
                  'rgba(0,0,0,0.9)',
                padding:
                  '0.45rem 0.8rem',
                border:
                  '1px solid #444444',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontSize:
                    '0.62rem',
                  color: '#ffffff',
                  letterSpacing:
                    '1px'
                }}
              >
                LOADING TELEMETRY...
              </span>
            </div>
          )}

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                bottom: '0.8rem',
                left: '0.8rem',
                background:
                  'rgba(0,0,0,0.8)',
                border:
                  '1px solid #222222',
                padding:
                  '0.4rem 0.7rem',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.6rem',
                color: '#ffffff',
                pointerEvents:
                  'none'
              }}
            >
              LIVE TLE PROPAGATION
              {'  '}
              •
              {'  '}
              UPDATE:{' '}
              {formatUpdatedAt()}
            </div>
          )}
        </div>
      ) : null}
      {/* WIKI */}

      {viewMode === 'wiki' && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '3px',
            border:
              '1px solid #222222',
            background: '#000000'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom:
                '1rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.65rem',
                color: '#ffffff',
                letterSpacing:
                  '2px',
                textTransform:
                  'uppercase',
                fontWeight: '800'
              }}
            >
              // SATELLITE DATABASE
              {' '}
              ({totalWikiCount})
            </span>

            <input
              type="text"
              placeholder="Search name or NORAD ID..."
              value={wikiSearch}
              onChange={e => {
                setWikiSearch(
                  e.target.value
                );
                setWikiPage(0);
              }}
              style={{
                background:
                  '#050505',
                border:
                  '1px solid #333333',
                padding:
                  '0.55rem 0.8rem',
                color: '#ffffff',
                fontSize:
                  '0.7rem',
                fontFamily:
                  'monospace',
                width:
                  '320px',
                outline: 'none'
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
                width: '100%',
                borderCollapse:
                  'collapse',
                fontSize:
                  '0.72rem',
                fontFamily:
                  'monospace',
                color:
                  '#cccccc'
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom:
                      '1px solid #333333',
                    textAlign:
                      'left',
                    color:
                      '#ffffff'
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
                    ALTITUDE
                  </th>
                </tr>
              </thead>

              <tbody>
                {wikiData.map(
                  item => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom:
                          '1px solid #111111'
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#ffffff'
                        }}
                      >
                        {item.id}
                      </td>

                      <td
                        style={{
                          padding:
                            '0.6rem',
                          color:
                            '#ffffff',
                          fontWeight:
                            'bold'
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
                        {item.altitude !=
                        null
                          ? `${formatNumber(
                              item.altitude,
                              1
                            )} km`
                          : 'N/A'}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
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
                '1px solid #222222',
              paddingTop:
                '0.8rem'
            }}
          >
            <span
              style={{
                fontSize:
                  '0.62rem',
                color:
                  '#777777'
              }}
            >
              PAGE{' '}
              {wikiPage + 1}
              {' '}
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
                  wikiPage === 0
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
                    wikiPage === 0
                      ? '#050505'
                      : '#ffffff',
                  border:
                    '1px solid #444444',
                  color:
                    wikiPage === 0
                      ? '#555555'
                      : '#000000',
                  fontSize:
                    '0.62rem',
                  cursor:
                    wikiPage === 0
                      ? 'not-allowed'
                      : 'pointer'
                }}
              >
                PREV
              </button>

              <button
                disabled={
                  wikiPage + 1 >=
                  maxPages
                }
                onClick={() =>
                  setWikiPage(
                    p => p + 1
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem',
                  background:
                    wikiPage + 1 >=
                    maxPages
                      ? '#050505'
                      : '#ffffff',
                  border:
                    '1px solid #444444',
                  color:
                    wikiPage + 1 >=
                    maxPages
                      ? '#555555'
                      : '#000000',
                  fontSize:
                    '0.62rem',
                  cursor:
                    wikiPage + 1 >=
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

      {/* LAUNCH PAD INFORMATION */}

      {viewMode === 'pads' &&
        selectedPad && (
          <div
            style={{
              padding:
                '1.25rem',
              borderRadius:
                '3px',
              border:
                '1px solid #222222',
              background:
                '#050505'
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
                    '#ffffff'
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
                  '0.8rem'
              }}
            >
              <InfoBox
                title="FACILITY"
                value={
                  selectedPad.name
                }
              />

              <InfoBox
                title="AGENCY"
                value={
                  selectedPad.agency
                }
              />

              <InfoBox
                title="COUNTRY"
                value={
                  selectedPad.country
                }
              />

              <InfoBox
                title="COORDINATES"
                value={`${selectedPad.lat.toFixed(
                  4
                )}°, ${selectedPad.lng.toFixed(
                  4
                )}°`}
              />
            </div>
          </div>
        )}

      {/* SATELLITE INFORMATION */}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            style={{
              padding:
                '1.25rem',
              borderRadius:
                '3px',
              border:
                '1px solid #222222',
              background:
                '#050505'
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
                // LIVE SATELLITE TELEMETRY
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
                    '1px solid #333333',
                  color:
                    '#ffffff',
                  cursor:
                    'pointer',
                  padding:
                    '0.3rem 0.6rem',
                  fontSize:
                    '0.6rem'
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
                  'repeat(auto-fit,minmax(190px,1fr))',
                gap:
                  '1rem',
                marginTop:
                  '0.8rem'
              }}
            >
              <InfoBox
                title="OBJECT"
                value={
                  selectedSat.name ||
                  'UNKNOWN'
                }
              />

              <InfoBox
                title="NORAD ID"
                value={
                  selectedSat.id
                }
              />

              <InfoBox
                title="LATITUDE"
                value={`${formatNumber(
                  selectedSat.lat,
                  5
                )}°`}
              />

              <InfoBox
                title="LONGITUDE"
                value={`${formatNumber(
                  selectedSat.lng,
                  5
                )}°`}
              />

              <InfoBox
                title="ALTITUDE"
                value={`${formatNumber(
                  selectedSat.altitudeKm,
                  1
                )} km`}
              />

              <InfoBox
                title="VELOCITY"
                value={
                  selectedSat.velocityLive
                    ? `${formatNumber(
                        selectedSat.velocityLive,
                        3
                      )} km/s`
                    : 'N/A'
                }
              />

              <InfoBox
                title="INCLINATION"
                value={
                  selectedSat.inclination !=
                  null
                    ? `${formatNumber(
                        selectedSat.inclination,
                        3
                      )}°`
                    : 'N/A'
                }
              />

              <InfoBox
                title="MEAN MOTION"
                value={
                  selectedSat.mean_motion !=
                  null
                    ? `${formatNumber(
                        selectedSat.mean_motion,
                        5
                      )} rev/day`
                    : 'N/A'
                }
              />

              <InfoBox
                title="ORBITAL SOURCE"
                value={
                  selectedSat.orbital_source ||
                  'TLE'
                }
              />

              <InfoBox
                title="TLE EPOCH"
                value={
                  selectedSat.orbital_epoch ||
                  'N/A'
                }
              />

              <InfoBox
                title="ORGANIZATION"
                value={
                  selectedSat.organization ||
                  'Unknown'
                }
              />

              <InfoBox
                title="LAST DATABASE UPDATE"
                value={
                  selectedSat.updated_at
                    ? new Date(
                        selectedSat.updated_at
                      ).toLocaleString()
                    : 'N/A'
                }
              />
            </div>

            <div
              style={{
                marginTop:
                  '1rem',
                padding:
                  '0.7rem',
                border:
                  '1px solid #222222',
                fontFamily:
                  'monospace',
                fontSize:
                  '0.62rem',
                color:
                  '#aaaaaa'
              }}
            >
              ORBIT: REAL-TIME TLE
              PROPAGATION
              {' • '}
              POSITION RECALCULATED
              EVERY 2 SECONDS
            </div>
          </div>
        )}
    </div>
  );
}

function InfoBox({
  title,
  value
}) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize:
            '0.58rem',
          color:
            '#666666',
          letterSpacing:
            '1px'
        }}
      >
        {title}
      </p>

      <p
        style={{
          margin:
            '0.25rem 0 0',
          fontSize:
            '0.82rem',
          color:
            '#ffffff',
          fontFamily:
            'monospace',
          wordBreak:
            'break-word'
        }}
      >
        {value}
      </p>
    </div>
  );
}
