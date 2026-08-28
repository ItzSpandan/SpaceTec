'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'monospace', fontSize: 12 }}>
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  )
});

const EARTH_RADIUS_KM = 6371;
const DB_BATCH = 1000;
const LIVE_UPDATE_MS = 2000;
const ORBIT_STEP_MIN = 2;
const MAX_ORBIT_POINTS = 360;
const PAGE_SIZE = 50;

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
  { id: 24, name: 'Al-Dahik Launch Site', agency: 'NARSS', lat: 28.4890, lng: 30.4120, type: 'minor', country: 'Egypt' }
];

function num(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLng(value) {
  let n = num(value, 0);
  while (n > 180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

function validTle(row) {
  return typeof row?.tle_line1 === 'string' && row.tle_line1.trim().length > 10 &&
    typeof row?.tle_line2 === 'string' && row.tle_line2.trim().length > 10;
}

function makeSatrec(row) {
  if (!validTle(row)) return null;

  try {
    return satellite.twoline2satrec(
      row.tle_line1.trim(),
      row.tle_line2.trim()
    );
  } catch {
    return null;
  }
}

function propagate(row, date = new Date()) {
  if (!row?.satrec) return null;

  try {
    const pv = satellite.propagate(row.satrec, date);

    if (!pv?.position || !pv?.velocity) {
      return null;
    }

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(pv.position, gmst);

    const lat = satellite.degreesLat(geo.latitude);
    const lng = normalizeLng(satellite.degreesLong(geo.longitude));
    const altitudeKm = num(geo.height, null);

    const v = pv.velocity;

    const velocityKmS = Math.sqrt(
      v.x * v.x +
      v.y * v.y +
      v.z * v.z
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
      ...row,
      lat,
      lng,
      altitudeKm,
      altitude: altitudeKm,
      globeAltitude: Math.max(
        0.001,
        altitudeKm / EARTH_RADIUS_KM
      ),
      velocityKmS,
      velocity: velocityKmS,
      telemetryTime: date.toISOString(),
      positionEci: pv.position,
      velocityEci: pv.velocity
    };
  } catch {
    return null;
  }
}

function formatSatellite(row) {
  const satrec = makeSatrec(row);

  const base = {
    ...row,
    id: row.id,
    name: row.name || 'UNKNOWN OBJECT',
    organization: row.organization || 'UNKNOWN',
    satrec,
    trackable: Boolean(satrec)
  };

  if (satrec) {
    const live = propagate(base);

    if (live) {
      return live;
    }
  }

  const altitudeKm = num(row.altitude, 0);

  return {
    ...base,
    lat: num(row.lat, 0),
    lng: normalizeLng(row.lng),
    altitudeKm,
    altitude: altitudeKm,
    globeAltitude: Math.max(
      0.001,
      altitudeKm / EARTH_RADIUS_KM
    ),
    velocityKmS: num(row.velocity, 0),
    velocity: num(row.velocity, 0),
    telemetryTime: row.updated_at || null
  };
}

function orbitalPeriodMinutes(row) {
  const meanMotion = num(row?.mean_motion, null);

  if (meanMotion > 0) {
    return 1440 / meanMotion;
  }

  if (row?.satrec?.no > 0) {
    return (2 * Math.PI) / row.satrec.no;
  }

  return 90;
}

function makeOrbit(row) {
  if (!row?.satrec) {
    return [];
  }

  const period = Math.max(
    20,
    Math.min(1440, orbitalPeriodMinutes(row))
  );

  const step = Math.max(
    ORBIT_STEP_MIN,
    period / MAX_ORBIT_POINTS
  );

  const points = [];

  for (
    let t = -period / 2;
    t <= period / 2;
    t += step
  ) {
    const p = propagate(
      row,
      new Date(Date.now() + t * 60000)
    );

    if (p) {
      points.push({
        lat: p.lat,
        lng: p.lng,
        altitude: Math.max(
          0.003,
          p.globeAltitude * 1.01
        )
      });
    }
  }

  return points;
}
export default function OrbitalGlobe({ requestedView }) {
  const globeRef = useRef(null);
  const cacheRef = useRef({});

  const [viewMode, setViewMode] = useState('pads');
  const [padFilter, setPadFilter] = useState('all');
  const [satFilter, setSatFilter] = useState('stations');

  const [selectedPad, setSelectedPad] = useState(
    globalLaunchPads[0]
  );

  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);

  const [satellites, setSatellites] = useState([]);
  const [loading, setLoading] = useState(false);

  const [wikiData, setWikiData] = useState([]);
  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiPage, setWikiPage] = useState(0);
  const [totalWikiCount, setTotalWikiCount] = useState(0);

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  const filteredPads = useMemo(
    () =>
      globalLaunchPads.filter(
        p =>
          padFilter === 'all' ||
          p.type === padFilter
      ),
    [padFilter]
  );

  const filterQuery = useCallback(
    (query, filter) => {
      if (filter === 'stations') {
        return query.or(
          'name.ilike.%ISS%,name.ilike.%CSS%,name.ilike.%TIANGONG%,name.ilike.%STATION%'
        );
      }

      if (filter === 'starlink') {
        return query.ilike(
          'name',
          '%STARLINK%'
        );
      }

      if (filter === 'weather') {
        return query.or(
          'name.ilike.%NOAA%,name.ilike.%GOES%,name.ilike.%METEOR%,name.ilike.%METOP%,name.ilike.%JPSS%,name.ilike.%EUMETSAT%,name.ilike.%HIMAWARI%'
        );
      }

      if (filter === 'active') {
        return query
          .not('tle_line1', 'is', null)
          .not('tle_line2', 'is', null);
      }

      return query;
    },
    []
  );

  const fetchAll = useCallback(
    async filter => {
      const rows = [];
      let from = 0;

      while (true) {
        let query = supabase
          .from('satellites')
          .select('*')
          .order('id', {
            ascending: true
          })
          .range(
            from,
            from + DB_BATCH - 1
          );

        query = filterQuery(
          query,
          filter
        );

        const {
          data,
          error
        } = await query;

        if (error) {
          throw error;
        }

        if (!data?.length) {
          break;
        }

        rows.push(...data);

        if (
          data.length <
          DB_BATCH
        ) {
          break;
        }

        from += DB_BATCH;
      }

      return rows;
    },
    [filterQuery]
  );

  useEffect(() => {
    if (viewMode === 'wiki') {
      return undefined;
    }

    let cancelled = false;

    async function load() {
      const cached =
        cacheRef.current[satFilter];

      if (cached) {
        setSatellites(cached);
        return;
      }

      setLoading(true);

      try {
        const rows =
          await fetchAll(satFilter);

        if (cancelled) {
          return;
        }

        const prepared = rows
          .map(formatSatellite)
          .filter(Boolean);

        cacheRef.current[satFilter] =
          prepared;

        setSatellites(prepared);

        setSelectedSat(current => {
          if (!current) {
            return null;
          }

          return prepared.some(
            s =>
              String(s.id) ===
              String(current.id)
          )
            ? current
            : null;
        });
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
          setLoading(false);
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
    fetchAll
  ]);

  /*
   * LIVE MOVEMENT
   *
   * IMPORTANT:
   * This does NOT change longitude artificially.
   * It propagates every satellite from its TLE
   * against the current clock.
   *
   * It also does NOT refetch Supabase every few seconds.
   */

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      satellites.length === 0
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      const now = new Date();

      setSatellites(previous =>
        previous.map(
          s =>
            propagate(s, now) || s
        )
      );

      setSelectedSat(current =>
        current
          ? propagate(current, now) ||
            current
          : null
      );
    }, LIVE_UPDATE_MS);

    return () =>
      clearInterval(timer);
  }, [
    viewMode,
    satellites.length
  ]);

  /*
   * DATABASE / WIKI
   */

  useEffect(() => {
    if (viewMode !== 'wiki') {
      return undefined;
    }

    let cancelled = false;

    const timer = setTimeout(
      async () => {
        setLoading(true);

        try {
          const from =
            wikiPage * PAGE_SIZE;

          const to =
            from + PAGE_SIZE - 1;

          let query = supabase
            .from('satellites')
            .select('*', {
              count: 'exact'
            });

          const search =
            wikiSearch.trim();

          if (search) {
            const clean =
              search.replace(
                /[,%()]/g,
                ''
              );

            if (
              /^\d+$/.test(clean)
            ) {
              query = query.or(
                `name.ilike.%${clean}%,id.eq.${clean}`
              );
            } else {
              query = query.ilike(
                'name',
                `%${clean}%`
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
            setLoading(false);
          }
        }
      },
      300
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

  /*
   * REAL ORBIT PATH
   */

  const orbitPath = useMemo(() => {
    if (
      viewMode !== 'satellites' ||
      !selectedSat?.satrec
    ) {
      return [];
    }

    const points =
      makeOrbit(selectedSat);

    return points.length > 1
      ? [{ points }]
      : [];
  }, [
    viewMode,
    selectedSat
  ]);

  const maxPages = Math.max(
    1,
    Math.ceil(
      totalWikiCount /
        PAGE_SIZE
    )
  );

  const focusPoint = useCallback(
    (point, isPad) => {
      if (isPad) {
        setSelectedPad(point);
      } else {
        setSelectedSat(point);
      }

      if (globeRef.current) {
        globeRef.current.pointOfView(
          {
            lat: point.lat,
            lng: point.lng,
            altitude: isPad
              ? 1.35
              : 1.65
          },
          800
        );
      }
    },
    []
  );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem'
      }}
    >
      <style>{`
        @keyframes starDrift {
          from {
            background-position:
              0 0,
              0 0;
          }

          to {
            background-position:
              -700px 350px,
              350px -700px;
          }
        }

        .moving-space-bg {
          position: relative;
          background-color: #02040a;

          background-image:
            radial-gradient(
              1.5px 1.5px at 12% 18%,
              rgba(255,255,255,.9),
              transparent
            ),
            radial-gradient(
              1px 1px at 28% 67%,
              rgba(255,255,255,.65),
              transparent
            ),
            radial-gradient(
              1px 1px at 47% 31%,
              rgba(255,255,255,.8),
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 71% 16%,
              rgba(255,255,255,.75),
              transparent
            ),
            radial-gradient(
              1px 1px at 86% 54%,
              rgba(255,255,255,.55),
              transparent
            ),
            radial-gradient(
              1px 1px at 63% 82%,
              rgba(255,255,255,.7),
              transparent
            ),
            radial-gradient(
              1px 1px at 5% 91%,
              rgba(255,255,255,.55),
              transparent
            ),
            radial-gradient(
              1px 1px at 93% 89%,
              rgba(255,255,255,.7),
              transparent
            );

          background-size:
            520px 520px,
            760px 760px;

          animation:
            starDrift
            70s
            linear
            infinite;

          box-shadow:
            inset
            0
            0
            100px
            rgba(0,0,0,.7);
        }

        .orbital-button {
          transition:
            background .15s ease,
            border-color .15s ease;
        }

        .orbital-button:hover {
          background:
            rgba(255,255,255,.1)
            !important;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background:
            rgba(255,255,255,.22);
          border-radius: 10px;
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '.65rem',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: '#71717a',
              letterSpacing: 2,
              fontWeight: 700
            }}
          >
            // DISPLAY MODE:
          </span>

          {[
            ['pads', 'Launch Pads'],
            [
              'satellites',
              `Satellites (${satellites.length.toLocaleString()})`
            ],
            ['wiki', 'Database']
          ].map(
            ([key, label]) => (
              <button
                key={key}
                className="orbital-button"
                onClick={() => {
                  setViewMode(key);
                  setSelectedSat(null);
                  setHoveredSat(null);
                }}
                style={{
                  padding:
                    '.5rem .85rem',
                  background:
                    viewMode === key
                      ? '#fff'
                      : 'rgba(255,255,255,.04)',
                  color:
                    viewMode === key
                      ? '#020617'
                      : '#fff',
                  border:
                    `1px solid ${
                      viewMode === key
                        ? '#fff'
                        : 'rgba(255,255,255,.18)'
                    }`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform:
                    'uppercase',
                  cursor: 'pointer'
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

        {viewMode === 'pads' && (
          <div
            style={{
              display: 'flex',
              gap: 5
            }}
          >
            {[
              'all',
              'major',
              'minor'
            ].map(f => (
              <button
                key={f}
                className="orbital-button"
                onClick={() =>
                  setPadFilter(f)
                }
                style={{
                  padding:
                    '.38rem .65rem',
                  background:
                    padFilter === f
                      ? 'rgba(255,255,255,.12)'
                      : 'transparent',
                  border:
                    '1px solid rgba(255,255,255,.22)',
                  color: '#fff',
                  fontSize: 9,
                  textTransform:
                    'uppercase',
                  cursor: 'pointer'
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
              gap: 5,
              flexWrap: 'wrap'
            }}
          >
            {[
              [
                'stations',
                'Stations'
              ],
              [
                'starlink',
                'Starlink'
              ],
              [
                'weather',
                'Weather'
              ],
              [
                'active',
                'All Active'
              ]
            ].map(
              ([key, label]) => (
                <button
                  key={key}
                  className="orbital-button"
                  onClick={() => {
                    setSatFilter(
                      key
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
                      '.38rem .65rem',
                    background:
                      satFilter ===
                      key
                        ? 'rgba(255,255,255,.12)'
                        : 'transparent',
                    border:
                      '1px solid rgba(255,255,255,.22)',
                    color: '#fff',
                    fontSize: 9,
                    textTransform:
                      'uppercase',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {viewMode !== 'wiki' ? (
        <div
          className="moving-space-bg"
          style={{
            height: 550,
            width: '100%',
            overflow: 'hidden',
            border:
              '1px solid rgba(255,255,255,.15)',
            position: 'relative'
          }}
        >
          <ReactGlobe
            ref={globeRef}

            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

            backgroundColor="rgba(0,0,0,0)"

            pointsData={
              viewMode === 'pads'
                ? filteredPads
                : selectedSat
                  ? [selectedSat]
                  : satellites
            }

            pointLat="lat"
            pointLng="lng"

            pointAltitude={
              viewMode === 'pads'
                ? 0.015
                : d =>
                    Math.max(
                      0.001,
                      Number(
                        d.globeAltitude
                      ) ||
                        0.001
                    )
            }

            pointColor={d =>
              viewMode === 'pads'
                ? '#fff'
                : hoveredSat &&
                  String(
                    hoveredSat.id
                  ) !==
                    String(d.id) &&
                  !selectedSat
                  ? 'rgba(255,255,255,.14)'
                  : '#fff'
            }

            pointRadius={
              viewMode === 'pads'
                ? 0.65
                : d =>
                    selectedSat
                      ? 0.55
                      : hoveredSat &&
                          String(
                            hoveredSat.id
                          ) ===
                            String(
                              d.id
                            )
                        ? 0.45
                        : 0.24
            }

            pointResolution={8}

            pathsData={
              viewMode ===
              'satellites'
                ? orbitPath
                : []
            }

            pathPoints="points"
            pathPointLat="lat"
            pathPointLng="lng"
            pathPointAlt="altitude"

            pathColor={() =>
              'rgba(255,255,255,.72)'
            }

            pathStroke={1.2}

            pathDashLength={0.025}
            pathDashGap={0.012}
            pathDashAnimateTime={5000}

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

            ringColor={() => '#fff'}
            ringMaxRadius={2.5}
            ringPropagationSpeed={1.5}
            ringRepeatPeriod={1000}

            onPointClick={d =>
              focusPoint(
                d,
                viewMode === 'pads'
              )
            }

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
                setSelectedSat(
                  null
                );
                setHoveredSat(
                  null
                );
              }
            }}

            pointLabel={d =>
              viewMode ===
              'pads'
                ? `
                  <div style="
                    background:rgba(2,6,23,.96);
                    border:1px solid rgba(255,255,255,.45);
                    padding:9px 11px;
                    color:#fff;
                    font-family:monospace;
                    font-size:11px;
                    min-width:170px
                  ">
                    <b>${d.name || 'LAUNCH PAD'}</b><br/>
                    ${d.country || ''}<br/>
                    <span style="color:#888">
                      LAT ${Number(d.lat).toFixed(4)}°<br/>
                      LNG ${Number(d.lng).toFixed(4)}°
                    </span>
                  </div>
                `
                : `
                  <div style="
                    background:rgba(2,6,23,.97);
                    border:1px solid rgba(255,255,255,.5);
                    padding:9px 11px;
                    color:#fff;
                    font-family:monospace;
                    font-size:11px;
                    min-width:185px
                  ">
                    <b>${d.name || 'UNKNOWN SATELLITE'}</b><br/>
                    NORAD: ${d.id ?? 'N/A'}<br/>
                    LAT:
                    ${
                      Number.isFinite(
                        Number(d.lat)
                      )
                        ? Number(
                            d.lat
                          ).toFixed(4) +
                          '°'
                        : 'N/A'
                    }<br/>
                    LNG:
                    ${
                      Number.isFinite(
                        Number(d.lng)
                      )
                        ? Number(
                            d.lng
                          ).toFixed(4) +
                          '°'
                        : 'N/A'
                    }<br/>
                    ALT:
                    ${
                      Number.isFinite(
                        Number(
                          d.altitude
                        )
                      )
                        ? Number(
                            d.altitude
                          ).toFixed(
                            1
                          ) +
                          ' km'
                        : 'N/A'
                    }<br/>
                    VELOCITY:
                    ${
                      Number.isFinite(
                        Number(
                          d.velocity
                        )
                      )
                        ? Number(
                            d.velocity
                          ).toFixed(
                            2
                          ) +
                          ' km/s'
                        : 'N/A'
                    }
                  </div>
                `
            }
          />

          {viewMode ===
            'satellites' && (
            <div
              style={{
                position:
                  'absolute',
                left: 12,
                bottom: 12,
                background:
                  'rgba(2,6,23,.86)',
                border:
                  '1px solid rgba(255,255,255,.18)',
                padding:
                  '.55rem .7rem',
                color: '#fff',
                fontFamily:
                  'monospace',
                zIndex: 5
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: 1
                }}
              >
                ● LIVE TLE / SGP4
              </div>

              <div
                style={{
                  marginTop: 3,
                  color: '#71717a',
                  fontSize: 8
                }}
              >
                {satellites.length.toLocaleString()}
                {' '}
                OBJECTS
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                position:
                  'absolute',
                right: 12,
                top: 12,
                background:
                  'rgba(2,6,23,.9)',
                border:
                  '1px solid rgba(255,255,255,.22)',
                padding:
                  '.45rem .65rem',
                color: '#fff',
                fontFamily:
                  'monospace',
                fontSize: 9,
                zIndex: 5
              }}
            >
              LOADING ORBITAL DATA...
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            background: '#000',
            border:
              '1px solid rgba(255,255,255,.15)',
            padding: '1.2rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom:
                '1rem'
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2
              }}
            >
              // SATELLITE DATABASE —
              {' '}
              {totalWikiCount.toLocaleString()}
              {' '}
              MATCHES
            </span>

            <input
              value={wikiSearch}
              onChange={e => {
                setWikiSearch(
                  e.target.value
                );
                setWikiPage(0);
              }}
              placeholder="Search name or NORAD ID..."
              style={{
                width: 320,
                maxWidth: '100%',
                boxSizing:
                  'border-box',
                background: '#050505',
                border:
                  '1px solid rgba(255,255,255,.22)',
                color: '#fff',
                padding:
                  '.55rem .7rem',
                fontFamily:
                  'monospace',
                fontSize: 10,
                outline: 'none'
              }}
            />
          </div>

          <div
            className="orbital-scroll"
            style={{
              maxHeight: 420,
              overflowY: 'auto'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse:
                  'collapse',
                fontFamily:
                  'monospace',
                fontSize: 10,
                color: '#d4d4d8'
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign:
                      'left',
                    color: '#fff',
                    borderBottom:
                      '1px solid rgba(255,255,255,.2)'
                  }}
                >
                  <th
                    style={{
                      padding: 8
                    }}
                  >
                    NORAD ID
                  </th>

                  <th
                    style={{
                      padding: 8
                    }}
                  >
                    OBJECT NAME
                  </th>

                  <th
                    style={{
                      padding: 8
                    }}
                  >
                    ORGANIZATION
                  </th>

                  <th
                    style={{
                      padding: 8
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
                          '1px solid rgba(255,255,255,.05)'
                      }}
                    >
                      <td
                        style={{
                          padding: 8
                        }}
                      >
                        {item.id}
                      </td>

                      <td
                        style={{
                          padding: 8,
                          color: '#fff',
                          fontWeight: 700
                        }}
                      >
                        {item.name}
                      </td>

                      <td
                        style={{
                          padding: 8
                        }}
                      >
                        {item.organization ||
                          'Unknown'}
                      </td>

                      <td
                        style={{
                          padding: 8
                        }}
                      >
                        TLE DATA
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginTop: 12,
              paddingTop: 10,
              borderTop:
                '1px solid rgba(255,255,255,.12)',
              fontFamily:
                'monospace',
              fontSize: 9
            }}
          >
            <span>
              PAGE {wikiPage + 1}
              {' '}
              OF {maxPages}
            </span>

            <div
              style={{
                display: 'flex',
                gap: 6
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
                    '.4rem .65rem',
                  background:
                    'transparent',
                  color:
                    wikiPage ===
                    0
                      ? '#444'
                      : '#fff',
                  border:
                    '1px solid rgba(255,255,255,.2)'
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
                    p =>
                      Math.min(
                        maxPages -
                          1,
                        p + 1
                      )
                  )
                }
                style={{
                  padding:
                    '.4rem .65rem',
                  background:
                    'transparent',
                  color:
                    wikiPage + 1 >=
                    maxPages
                      ? '#444'
                      : '#fff',
                  border:
                    '1px solid rgba(255,255,255,.2)'
                }}
              >
                NEXT
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
              background:
                'rgba(10,15,25,.9)',
              border:
                '1px solid rgba(255,255,255,.14)',
              padding: '1.1rem'
            }}
          >
            <div
              style={{
                color: '#fff',
                fontFamily:
                  'monospace',
                fontSize: 10,
                letterSpacing: 2
              }}
            >
              // LAUNCH FACILITY
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: '1rem',
                marginTop: 10
              }}
            >
              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  NAME
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedPad.name}
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  AGENCY
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedPad.agency}
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  COUNTRY
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedPad.country}
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  COORDINATES
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedPad.lat.toFixed(4)}
                  °,
                  {' '}
                  {selectedPad.lng.toFixed(4)}
                  °
                </div>
              </div>
            </div>
          </div>
        )}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div
            style={{
              background:
                'rgba(10,15,25,.92)',
              border:
                '1px solid rgba(255,255,255,.16)',
              padding: '1.1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center'
              }}
            >
              <span
                style={{
                  color: '#fff',
                  fontFamily:
                    'monospace',
                  fontSize: 10,
                  letterSpacing: 2
                }}
              >
                // SATELLITE INSPECTOR
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
                  border: 0,
                  color: '#aaa',
                  cursor: 'pointer'
                }}
              >
                [CLOSE]
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(180px,1fr))',
                gap: '1rem',
                marginTop: 10
              }}
            >
              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  OBJECT
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedSat.name}
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  NORAD
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {selectedSat.id}
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  ALTITUDE
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {Number(
                    selectedSat.altitude
                  ).toFixed(1)}
                  {' '}
                  km
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  VELOCITY
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {Number(
                    selectedSat.velocity
                  ).toFixed(2)}
                  {' '}
                  km/s
                </div>
              </div>

              <div>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 9
                  }}
                >
                  POSITION
                </span>

                <div
                  style={{
                    color: '#fff',
                    marginTop: 3
                  }}
                >
                  {Number(
                    selectedSat.lat
                  ).toFixed(4)}
                  °,
                  {' '}
                  {Number(
                    selectedSat.lng
                  ).toFixed(4)}
                  °
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
