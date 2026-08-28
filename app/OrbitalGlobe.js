'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
} from 'satellite.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="globe-loader">
      INITIALIZING 3D ORBITAL ENGINE...
    </div>
  ),
});

const EARTH_RADIUS_KM = 6378.137;
const MAX_DB_ROWS_PER_QUERY = 1000;
const DB_PAGE_LIMIT = 50000;

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

const INITIAL_VIEW = {
  lat: 20,
  lng: 0,
  altitude: 2.35,
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function wrapLongitude(lng) {
  let value = lng;

  while (value > 180) value -= 360;
  while (value < -180) value += 360;

  return value;
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSatrec(row) {
  const line1 = String(row.tle_line1 || '').trim();
  const line2 = String(row.tle_line2 || '').trim();

  if (
    !line1 ||
    !line2 ||
    !line1.startsWith('1 ') ||
    !line2.startsWith('2 ')
  ) {
    return null;
  }

  try {
    const satrec = twoline2satrec(line1, line2);

    return satrec && satrec.error === 0
      ? satrec
      : null;
  } catch {
    return null;
  }
}

function propagateRow(row, when = new Date()) {
  const satrec = row._satrec || buildSatrec(row);

  if (!satrec) return null;

  try {
    const state = propagate(satrec, when);

    if (!state || !state.position) {
      return null;
    }

    const gmst = gstime(when);
    const geo = eciToGeodetic(state.position, gmst);

    const lat = degreesLat(geo.latitude);
    const lng = degreesLong(geo.longitude);
    const altitudeKm = safeNumber(geo.height, 0);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(altitudeKm)
    ) {
      return null;
    }

    const velocity = state.velocity
      ? Math.sqrt(
          safeNumber(state.velocity.x) ** 2 +
          safeNumber(state.velocity.y) ** 2 +
          safeNumber(state.velocity.z) ** 2
        )
      : null;

    return {
      ...row,
      _satrec: satrec,

      lat,
      lng: wrapLongitude(lng),

      altitudeKm: Math.max(0, altitudeKm),

      globeAltitude: clamp(
        Math.max(0, altitudeKm) / EARTH_RADIUS_KM,
        0.008,
        5.8
      ),

      velocityNow: velocity,

      telemetryTime: when.toISOString(),
    };
  } catch {
    return null;
  }
}

function makeOrbitalPath(row, when = new Date()) {
  const satrec = row?._satrec || buildSatrec(row);

  if (!satrec) return [];

  const meanMotion = safeNumber(
    row.mean_motion || satrec.no
  );

  if (!meanMotion || meanMotion <= 0) {
    return [];
  }

  const periodMinutes = clamp(
    1440 / meanMotion,
    20,
    2880
  );

  const sampleCount =
    periodMinutes > 500
      ? 240
      : 180;

  const halfPeriodMs =
    (periodMinutes * 60 * 1000) / 2;

  const stepMs =
    (halfPeriodMs * 2) /
    (sampleCount - 1);

  const paths = [];
  let currentPath = [];

  for (let i = 0; i < sampleCount; i += 1) {
    const date = new Date(
      when.getTime() -
      halfPeriodMs +
      stepMs * i
    );

    const state = propagate(
      satrec,
      date
    );

    if (!state || !state.position) {
      if (currentPath.length > 1) {
        paths.push(currentPath);
      }

      currentPath = [];
      continue;
    }

    try {
      const geo = eciToGeodetic(
        state.position,
        gstime(date)
      );

      const lat = degreesLat(
        geo.latitude
      );

      const lng = wrapLongitude(
        degreesLong(geo.longitude)
      );

      const height = Math.max(
        0,
        safeNumber(geo.height, 0)
      );

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        continue;
      }

      const point = {
        lat,
        lng,
        altitude: clamp(
          height / EARTH_RADIUS_KM + 0.004,
          0.012,
          5.82
        ),
      };

      if (
        currentPath.length > 0 &&
        Math.abs(
          point.lng -
          currentPath[
            currentPath.length - 1
          ].lng
        ) > 180
      ) {
        if (currentPath.length > 1) {
          paths.push(currentPath);
        }

        currentPath = [];
      }

      currentPath.push(point);
    } catch {
      // Ignore an individual bad propagation sample.
    }
  }

  if (currentPath.length > 1) {
    paths.push(currentPath);
  }

  return paths;
}

export default function OrbitalGlobe({
  requestedView,
}) {
  const globeRef = useRef(null);

  const satCacheRef = useRef({});

  const lastPropagationRef =
    useRef(0);

  const [
    viewMode,
    setViewMode,
  ] = useState('pads');

  const [
    padFilter,
    setPadFilter,
  ] = useState('all');

  const [
    satFilter,
    setSatFilter,
  ] = useState('stations');

  const [
    selectedPad,
    setSelectedPad,
  ] = useState(
    globalLaunchPads[0]
  );

  const [
    selectedSat,
    setSelectedSat,
  ] = useState(null);

  const [
    hoveredSat,
    setHoveredSat,
  ] = useState(null);

  const [
    satellites,
    setSatellites,
  ] = useState([]);

  const [
    loadingSats,
    setLoadingSats,
  ] = useState(false);

  const [
    loadProgress,
    setLoadProgress,
  ] = useState('');

  const [
    lastTelemetry,
    setLastTelemetry,
  ] = useState(null);

  const [
    wikiData,
    setWikiData,
  ] = useState([]);

  const [
    wikiSearch,
    setWikiSearch,
  ] = useState('');

  const [
    wikiPage,
    setWikiPage,
  ] = useState(0);

  const [
    totalWikiCount,
    setTotalWikiCount,
  ] = useState(0);

  const [
    wikiLoading,
    setWikiLoading,
  ] = useState(false);

  const pageSize = 50;

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  const filteredPads = useMemo(
    () =>
      globalLaunchPads.filter(
        pad =>
          padFilter === 'all' ||
          pad.type === padFilter
      ),
    [padFilter]
  );

  const fetchSatelliteRows =
    useCallback(
      async filter => {
        const cacheKey = filter;

        if (
          satCacheRef.current[cacheKey]
        ) {
          return satCacheRef.current[
            cacheKey
          ];
        }

        setLoadingSats(true);
        setLoadProgress(
          'QUERYING SUPABASE...'
        );

        try {
          const rows = [];

          if (
            filter === 'stations' ||
            filter === 'starlink' ||
            filter === 'weather'
          ) {
            let query = supabase
              .from('satellites')
              .select('*');

            if (filter === 'stations') {
              query = query.ilike(
                'name',
                '%ISS%'
              );
            } else if (
              filter === 'starlink'
            ) {
              query = query.ilike(
                'name',
                '%STARLINK%'
              );
            } else {
              query = query.or(
                'name.ilike.%NOAA%,name.ilike.%GOES%'
              );
            }

            const {
              data,
              error,
            } = await query.limit(
              MAX_DB_ROWS_PER_QUERY
            );

            if (error) {
              throw error;
            }

            rows.push(
              ...(data || [])
            );
          } else {
            for (
              let from = 0;
              from < DB_PAGE_LIMIT;
              from +=
                MAX_DB_ROWS_PER_QUERY
            ) {
              setLoadProgress(
                `LOADING SATELLITES ${rows.length.toLocaleString()}...`
              );

              const {
                data,
                error,
              } = await supabase
                .from('satellites')
                .select('*')
                .order('id', {
                  ascending: true,
                })
                .range(
                  from,
                  from +
                    MAX_DB_ROWS_PER_QUERY -
                    1
                );

              if (error) {
                throw error;
              }

              const batch =
                data || [];

              rows.push(...batch);

              if (
                batch.length <
                MAX_DB_ROWS_PER_QUERY
              ) {
                break;
              }
            }
          }

          const prepared = rows
            .map(row => {
              const satrec =
                buildSatrec(row);

              return satrec
                ? {
                    ...row,
                    _satrec: satrec,
                  }
                : null;
            })
            .filter(Boolean);

          satCacheRef.current[
            cacheKey
          ] = prepared;

          return prepared;
        } catch (error) {
          console.error(
            'Supabase satellite fetch error:',
            error
          );

          return [];
        } finally {
          setLoadingSats(false);
          setLoadProgress('');
        }
      },
      []
    );

  useEffect(() => {
    if (viewMode === 'wiki') {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const rows =
        await fetchSatelliteRows(
          satFilter
        );

      if (cancelled) {
        return;
      }

      const now = new Date();

      const propagated = rows
        .map(row =>
          propagateRow(
            row,
            now
          )
        )
        .filter(Boolean);

      setSatellites(
        propagated
      );

      setLastTelemetry(now);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    satFilter,
    viewMode,
    fetchSatelliteRows,
  ]);

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      satellites.length === 0
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        const nowMs =
          Date.now();

        if (
          nowMs -
            lastPropagationRef.current <
          850
        ) {
          return;
        }

        lastPropagationRef.current =
          nowMs;

        const now =
          new Date(nowMs);

        setSatellites(prev =>
          prev
            .map(row =>
              propagateRow(
                row,
                now
              )
            )
            .filter(Boolean)
        );

        setSelectedSat(
          current => {
            if (!current) {
              return null;
            }

            const fresh =
              propagateRow(
                current,
                now
              );

            return fresh || current;
          }
        );

        setLastTelemetry(now);
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [
    viewMode,
    satellites.length,
  ]);

  useEffect(() => {
    if (
      viewMode !== 'satellites'
    ) {
      return;
    }

    const refreshTimer =
      setInterval(() => {
        satCacheRef.current = {};

        fetchSatelliteRows(
          satFilter
        ).then(rows => {
          const now =
            new Date();

          setSatellites(
            rows
              .map(row =>
                propagateRow(
                  row,
                  now
                )
              )
              .filter(Boolean)
          );
        });
      }, 5 * 60 * 1000);

    return () =>
      clearInterval(
        refreshTimer
      );
  }, [
    viewMode,
    satFilter,
    fetchSatelliteRows,
  ]);

  useEffect(() => {
    if (viewMode !== 'wiki') {
      return;
    }

    let cancelled = false;

    const fetchWiki = async () => {
      setWikiLoading(true);

      try {
        const from =
          wikiPage * pageSize;

        const to =
          from + pageSize - 1;

        let query = supabase
          .from('satellites')
          .select('*', {
            count: 'exact',
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
          error,
        } = await query
          .order('id', {
            ascending: true,
          })
          .range(from, to);

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setWikiData(
            data || []
          );

          setTotalWikiCount(
            count || 0
          );
        }
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
          setWikiLoading(false);
        }
      }
    };

    const debounce =
      setTimeout(
        fetchWiki,
        250
      );

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [
    wikiSearch,
    wikiPage,
    viewMode,
  ]);

  const renderSatellites =
    useMemo(() => {
      const hasFocus =
        Boolean(
          selectedSat ||
          hoveredSat
        );

      return satellites.map(
        sat => {
          const focused =
            selectedSat?.id ===
              sat.id ||
            hoveredSat?.id ===
              sat.id;

          return {
            ...sat,

            displayColor:
              focused
                ? '#ffffff'
                : hasFocus
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(255,255,255,0.92)',

            displayRadius:
              focused
                ? 0.55
                : 0.22,

            displayAltitude:
              sat.globeAltitude,
          };
        }
      );
    }, [
      satellites,
      selectedSat,
      hoveredSat,
    ]);

  const orbitalPaths =
    useMemo(() => {
      if (!selectedSat) {
        return [];
      }

      return makeOrbitalPath(
        selectedSat,
        new Date()
      );
    }, [
      selectedSat?.id,
      selectedSat?.telemetryTime,
      selectedSat?._satrec,
    ]);

  const maxWikiPages =
    Math.max(
      1,
      Math.ceil(
        totalWikiCount /
          pageSize
      )
    );

  const focusSatellite =
    useCallback(sat => {
      if (!sat) {
        return;
      }

      setSelectedSat(sat);

      requestAnimationFrame(
        () => {
          if (
            globeRef.current
          ) {
            globeRef.current.pointOfView(
              {
                lat: safeNumber(
                  sat.lat
                ),
                lng: safeNumber(
                  sat.lng
                ),
                altitude: 1.55,
              },
              900
            );
          }
        }
      );
    }, []);

  const followISS =
    useCallback(() => {
      const iss =
        satellites.find(
          satellite =>
            String(
              satellite.name ||
                ''
            )
              .toUpperCase()
              .includes('ISS')
        ) || null;

      if (iss) {
        focusSatellite(iss);
        return;
      }

      setSatFilter(
        'stations'
      );
    }, [
      satellites,
      focusSatellite,
    ]);

  const resetView =
    useCallback(() => {
      if (globeRef.current) {
        globeRef.current.pointOfView(
          INITIAL_VIEW,
          900
        );
      }
    }, []);

  const selectPad =
    useCallback(pad => {
      setSelectedPad(pad);

      requestAnimationFrame(
        () => {
          if (
            globeRef.current
          ) {
            globeRef.current.pointOfView(
              {
                lat: pad.lat,
                lng: pad.lng,
                altitude: 1.45,
              },
              900
            );
          }
        }
      );
    }, []);
    return (
    <div className="orbital-shell">
      <style>{`
        .orbital-shell {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          color: #fff;
          font-family: monospace;
        }

        .orbital-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }

        .control-label {
          color: #71717a;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-right: 0.25rem;
        }

        .orbital-btn {
          border: 1px solid rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.035);
          color: #d4d4d8;
          padding: 0.48rem 0.72rem;
          font-family: monospace;
          font-size: 0.62rem;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          cursor: pointer;
          transition: 120ms ease;
        }

        .orbital-btn:hover {
          border-color: rgba(255,255,255,0.5);
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        .orbital-btn.active {
          background: #fff;
          border-color: #fff;
          color: #050505;
        }

        .orbital-btn.cyan-active {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.7);
          color: #fff;
        }

        .orbital-stage {
          position: relative;
          width: 100%;
          height: 620px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.12);
          background: #000;
        }

        .starfield {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          background:
            radial-gradient(circle at 8% 15%, rgba(255,255,255,0.95) 0 1px, transparent 1.6px),
            radial-gradient(circle at 22% 72%, rgba(255,255,255,0.8) 0 1px, transparent 1.5px),
            radial-gradient(circle at 37% 31%, rgba(255,255,255,0.9) 0 0.8px, transparent 1.4px),
            radial-gradient(circle at 51% 84%, rgba(255,255,255,0.75) 0 1px, transparent 1.5px),
            radial-gradient(circle at 63% 22%, rgba(255,255,255,0.95) 0 1px, transparent 1.5px),
            radial-gradient(circle at 76% 62%, rgba(255,255,255,0.75) 0 0.8px, transparent 1.4px),
            radial-gradient(circle at 91% 35%, rgba(255,255,255,0.9) 0 1px, transparent 1.5px),
            radial-gradient(circle at 83% 91%, rgba(255,255,255,0.7) 0 0.8px, transparent 1.3px);
          background-size: 280px 280px;
          animation: starsDrift 45s linear infinite;
          opacity: 0.75;
        }

        .starfield::after {
          content: "";
          position: absolute;
          inset: -20%;
          background:
            radial-gradient(
              circle at 50% 50%,
              transparent 0 38%,
              rgba(0,0,0,0.18) 70%,
              rgba(0,0,0,0.72) 100%
            );
        }

        @keyframes starsDrift {
          from {
            transform:
              translate3d(0,0,0)
              scale(1);
          }

          50% {
            transform:
              translate3d(-18px,10px,0)
              scale(1.02);
          }

          to {
            transform:
              translate3d(-36px,20px,0)
              scale(1);
          }
        }

        .globe-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .globe-loader {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: #000;
          font-size: 0.72rem;
          letter-spacing: 1.5px;
        }

        .status-panel {
          position: absolute;
          top: 0.8rem;
          left: 0.8rem;
          z-index: 5;
          background: rgba(0,0,0,0.82);
          border: 1px solid rgba(255,255,255,0.16);
          padding: 0.55rem 0.7rem;
          pointer-events: none;
          max-width: calc(100% - 1.6rem);
        }

        .status-line {
          font-size: 0.58rem;
          color: #a1a1aa;
          letter-spacing: 0.8px;
          line-height: 1.6;
        }

        .status-line strong {
          color: #fff;
        }

        .action-panel {
          position: absolute;
          right: 0.8rem;
          bottom: 0.8rem;
          z-index: 5;
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .action-btn {
          padding: 0.45rem 0.65rem;
          border: 1px solid rgba(255,255,255,0.24);
          background: rgba(0,0,0,0.8);
          color: #fff;
          font-family: monospace;
          font-size: 0.58rem;
          cursor: pointer;
        }

        .action-btn:hover {
          background: #fff;
          color: #000;
        }

        .data-card {
          margin-top: 1rem;
          padding: 1.1rem 1.2rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(5,5,7,0.92);
        }

        .data-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 0.7rem;
        }

        .data-title {
          color: #fff;
          font-size: 0.66rem;
          font-weight: 800;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .data-subtitle {
          color: #71717a;
          font-size: 0.58rem;
          letter-spacing: 0.8px;
        }

        .data-grid {
          display: grid;
          grid-template-columns:
            repeat(
              auto-fit,
              minmax(170px, 1fr)
            );
          gap: 0.9rem;
          margin-top: 0.9rem;
        }

        .data-item {
          min-width: 0;
        }

        .data-key {
          color: #52525b;
          font-size: 0.56rem;
          letter-spacing: 1px;
          margin: 0;
          text-transform: uppercase;
        }

        .data-value {
          color: #e4e4e7;
          font-size: 0.76rem;
          margin: 0.2rem 0 0;
          overflow-wrap: anywhere;
        }

        .data-value.bright {
          color: #fff;
          font-weight: 700;
        }

        .data-value.muted {
          color: #a1a1aa;
        }

        .wiki-card {
          border: 1px solid rgba(255,255,255,0.12);
          background: #050505;
          padding: 1rem;
        }

        .wiki-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 0.8rem;
        }

        .wiki-search {
          width: min(360px, 100%);
          box-sizing: border-box;
          background: #000;
          border: 1px solid rgba(255,255,255,0.18);
          color: #fff;
          outline: none;
          padding: 0.6rem 0.7rem;
          font-family: monospace;
          font-size: 0.68rem;
        }

        .wiki-search:focus {
          border-color: rgba(255,255,255,0.6);
        }

        .wiki-table-wrap {
          max-height: 460px;
          overflow: auto;
          border: 1px solid rgba(255,255,255,0.07);
        }

        .wiki-table {
          width: 100%;
          border-collapse: collapse;
          font-family: monospace;
          font-size: 0.68rem;
          color: #d4d4d8;
        }

        .wiki-table th {
          position: sticky;
          top: 0;
          background: #050505;
          color: #a1a1aa;
          text-align: left;
          padding: 0.65rem;
          border-bottom: 1px solid rgba(255,255,255,0.14);
          white-space: nowrap;
        }

        .wiki-table td {
          padding: 0.65rem;
          border-bottom: 1px solid rgba(255,255,255,0.055);
          vertical-align: top;
        }

        .wiki-table tr:hover td {
          background: rgba(255,255,255,0.035);
        }

        .wiki-id {
          color: #fff;
        }

        .wiki-name {
          color: #fff;
          font-weight: 700;
        }

        .wiki-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          padding-top: 0.8rem;
        }

        .wiki-page-text {
          color: #71717a;
          font-size: 0.58rem;
        }

        .wiki-empty {
          padding: 2rem;
          text-align: center;
          color: #71717a;
        }

        @media (max-width: 700px) {
          .orbital-stage {
            height: 520px;
          }

          .status-panel {
            top: 0.5rem;
            left: 0.5rem;
          }

          .action-panel {
            left: 0.5rem;
            right: 0.5rem;
            bottom: 0.5rem;
          }
        }
      `}</style>

      <div className="orbital-controls">
        <div className="control-group">
          <span className="control-label">
            // DISPLAY
          </span>

          {[
            {
              key: 'pads',
              label: 'Launch Pads',
            },
            {
              key: 'satellites',
              label:
                `Satellites (${satellites.length.toLocaleString()})`,
            },
            {
              key: 'wiki',
              label:
                'Satellite Database',
            },
          ].map(button => (
            <button
              key={button.key}
              className={
                `orbital-btn ${
                  viewMode ===
                  button.key
                    ? 'active'
                    : ''
                }`
              }
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
            >
              {button.label}
            </button>
          ))}
        </div>

        {viewMode === 'pads' && (
          <div className="control-group">
            {[
              'all',
              'major',
              'minor',
            ].map(filter => (
              <button
                key={filter}
                className={
                  `orbital-btn ${
                    padFilter ===
                    filter
                      ? 'cyan-active'
                      : ''
                  }`
                }
                onClick={() =>
                  setPadFilter(
                    filter
                  )
                }
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {viewMode ===
          'satellites' && (
          <div className="control-group">
            {[
              {
                key: 'stations',
                label:
                  'ISS / Stations',
              },
              {
                key: 'starlink',
                label:
                  'Starlink',
              },
              {
                key: 'weather',
                label:
                  'Weather',
              },
              {
                key: 'active',
                label:
                  'All Active',
              },
            ].map(filter => (
              <button
                key={filter.key}
                className={
                  `orbital-btn ${
                    satFilter ===
                    filter.key
                      ? 'cyan-active'
                      : ''
                  }`
                }
                onClick={() => {
                  setSatFilter(
                    filter.key
                  );

                  setSelectedSat(
                    null
                  );
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {viewMode !== 'wiki' ? (
        <div className="orbital-stage">
          <div className="starfield" />

          <div className="globe-layer">
            <ReactGlobe
              ref={globeRef}

              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="rgba(0,0,0,0)"

              showAtmosphere={true}

              atmosphereColor="#ffffff"

              atmosphereAltitude={0.045}

              pointsData={
                viewMode ===
                'pads'
                  ? filteredPads
                  : renderSatellites
              }

              pointLat="lat"

              pointLng="lng"

              pointAltitude={d =>
                viewMode ===
                'pads'
                  ? 0.012
                  : safeNumber(
                      d.displayAltitude,
                      0.01
                    )
              }

              pointColor={d =>
                viewMode ===
                'pads'
                  ? '#ffffff'
                  : d.displayColor
              }

              pointRadius={d =>
                viewMode ===
                'pads'
                  ? (
                      d.id ===
                      selectedPad?.id
                    )
                      ? 0.62
                      : 0.32
                  : safeNumber(
                      d.displayRadius,
                      0.22
                    )
              }

              pointResolution={
                viewMode ===
                'pads'
                  ? 12
                  : 8
              }

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
                'rgba(255,255,255,0.82)'
              }

              pathStroke={1.35}

              pathResolution={2}

              ringsData={
                viewMode ===
                'pads'
                  ? selectedPad
                    ? [selectedPad]
                    : []
                  : selectedSat
                    ? [selectedSat]
                    : []
              }

              ringLat="lat"

              ringLng="lng"

              ringAltitude={
                viewMode ===
                'pads'
                  ? 0.02
                  : d =>
                      d.globeAltitude
              }

              ringColor={() =>
                'rgba(255,255,255,0.9)'
              }

              ringMaxRadius={
                viewMode ===
                'pads'
                  ? 2.2
                  : 2.8
              }

              ringPropagationSpeed={
                1.7
              }

              ringRepeatPeriod={
                1200
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

              onPointClick={
                point => {
                  if (
                    viewMode ===
                    'pads'
                  ) {
                    selectPad(
                      point
                    );
                  } else {
                    focusSatellite(
                      point
                    );
                  }
                }
              }

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

              pointLabel={
                point => {
                  const name =
                    htmlEscape(
                      point.name ||
                        'UNKNOWN OBJECT'
                    );

                  if (
                    viewMode ===
                    'pads'
                  ) {
                    return `
                      <div style="
                        background:#050505;
                        border:1px solid rgba(255,255,255,.35);
                        padding:8px 10px;
                        color:#fff;
                        font-family:monospace;
                        font-size:10px;
                        pointer-events:none;
                      ">
                        <strong>${name}</strong><br/>
                        ${htmlEscape(
                          point.agency ||
                            'Unknown agency'
                        )}<br/>
                        ${safeNumber(
                          point.lat
                        ).toFixed(4)}°,
                        ${safeNumber(
                          point.lng
                        ).toFixed(4)}°
                      </div>
                    `;
                  }

                  return `
                    <div style="
                      background:#050505;
                      border:1px solid rgba(255,255,255,.35);
                      padding:8px 10px;
                      color:#fff;
                      font-family:monospace;
                      font-size:10px;
                      pointer-events:none;
                    ">
                      <strong>${name}</strong><br/>
                      NORAD:
                      ${htmlEscape(
                        point.id
                      )}<br/>
                      LAT:
                      ${safeNumber(
                        point.lat
                      ).toFixed(3)}°<br/>
                      LNG:
                      ${safeNumber(
                        point.lng
                      ).toFixed(3)}°<br/>
                      ALT:
                      ${safeNumber(
                        point.altitudeKm
                      ).toFixed(1)} km
                    </div>
                  `;
                }
              }
            />
          </div>

          {viewMode ===
            'satellites' && (
            <div className="status-panel">
              <div className="status-line">
                MODE:{' '}
                <strong>
                  SGP4 PROPAGATION
                </strong>
              </div>

              <div className="status-line">
                OBJECTS:{' '}
                <strong>
                  {satellites.length.toLocaleString()}
                </strong>
              </div>

              <div className="status-line">
                POSITION:{' '}
                <strong>
                  CALCULATED FROM TLE / CURRENT UTC
                </strong>
              </div>

              {lastTelemetry && (
                <div className="status-line">
                  UPDATE:{' '}
                  <strong>
                    {lastTelemetry.toLocaleTimeString()}
                  </strong>
                </div>
              )}

              {loadingSats &&
                loadProgress && (
                  <div className="status-line">
                    <strong>
                      {loadProgress}
                    </strong>
                  </div>
                )}
            </div>
          )}

          <div className="action-panel">
            {viewMode ===
              'satellites' && (
              <button
                className="action-btn"
                onClick={
                  followISS
                }
              >
                FOLLOW ISS
              </button>
            )}

            <button
              className="action-btn"
              onClick={
                resetView
              }
            >
              RESET VIEW
            </button>

            {selectedSat && (
              <button
                className="action-btn"
                onClick={() => {
                  setSelectedSat(
                    null
                  );

                  setHoveredSat(
                    null
                  );
                }}
              >
                CLEAR SELECTION
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="wiki-card">
          <div className="wiki-toolbar">
            <div>
              <div className="data-title">
                // SATELLITE DATABASE
              </div>

              <div className="data-subtitle">
                {totalWikiCount.toLocaleString()}{' '}
                MATCHES
              </div>
            </div>

            <input
              className="wiki-search"
              value={
                wikiSearch
              }
              placeholder="Search name or NORAD ID..."
              onChange={event => {
                setWikiSearch(
                  event.target
                    .value
                );

                setWikiPage(0);
              }}
            />
          </div>

          <div className="wiki-table-wrap">
            <table className="wiki-table">
              <thead>
                <tr>
                  <th>
                    NORAD ID
                  </th>
                  <th>
                    OBJECT NAME
                  </th>
                  <th>
                    ORGANIZATION
                  </th>
                  <th>
                    ALTITUDE
                  </th>
                  <th>
                    VELOCITY
                  </th>
                  <th>
                    UPDATED
                  </th>
                </tr>
              </thead>

              <tbody>
                {wikiLoading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="wiki-empty"
                    >
                      QUERYING DATABASE...
                    </td>
                  </tr>
                ) : wikiData.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="wiki-empty"
                    >
                      NO MATCHING RECORDS
                    </td>
                  </tr>
                ) : (
                  wikiData.map(
                    item => (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td className="wiki-id">
                          {item.id}
                        </td>

                        <td className="wiki-name">
                          {item.name ||
                            'UNKNOWN'}
                        </td>

                        <td>
                          {item.organization ||
                            'Unknown'}
                        </td>

                        <td>
                          {item.altitude !=
                          null
                            ? `${item.altitude} km`
                            : '—'}
                        </td>

                        <td>
                          {item.velocity !=
                          null
                            ? `${item.velocity} km/s`
                            : '—'}
                        </td>

                        <td>
                          {item.updated_at
                            ? new Date(
                                item.updated_at
                              ).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
          <div className="wiki-footer">
            <span className="wiki-page-text">
              PAGE {wikiPage + 1} OF {maxWikiPages}
            </span>

            <div className="control-group">
              <button
                className="orbital-btn"
                disabled={wikiPage === 0}
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
                  opacity:
                    wikiPage === 0
                      ? 0.35
                      : 1,
                  cursor:
                    wikiPage === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                PREV
              </button>

              <button
                className="orbital-btn"
                disabled={
                  wikiPage + 1 >=
                  maxWikiPages
                }
                onClick={() =>
                  setWikiPage(
                    page =>
                      Math.min(
                        maxWikiPages - 1,
                        page + 1
                      )
                  )
                }
                style={{
                  opacity:
                    wikiPage + 1 >=
                    maxWikiPages
                      ? 0.35
                      : 1,
                  cursor:
                    wikiPage + 1 >=
                    maxWikiPages
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'pads' &&
        selectedPad && (
          <div className="data-card">
            <div className="data-card-header">
              <span className="data-title">
                // LAUNCH FACILITY
              </span>

              <span className="data-subtitle">
                MARKER:{' '}
                {selectedPad.type.toUpperCase()}
              </span>
            </div>

            <div className="data-grid">
              <div className="data-item">
                <p className="data-key">
                  FACILITY
                </p>

                <p className="data-value bright">
                  {selectedPad.name}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  AGENCY
                </p>

                <p className="data-value">
                  {selectedPad.agency}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  COUNTRY
                </p>

                <p className="data-value">
                  {selectedPad.country}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  LATITUDE
                </p>

                <p className="data-value">
                  {selectedPad.lat.toFixed(4)}°
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  LONGITUDE
                </p>

                <p className="data-value">
                  {selectedPad.lng.toFixed(4)}°
                </p>
              </div>
            </div>
          </div>
        )}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <div className="data-card">
            <div className="data-card-header">
              <div>
                <div className="data-title">
                  // SATELLITE ORBITAL INSPECTOR
                </div>

                <div className="data-subtitle">
                  SELECTED OBJECT • ORBIT PATH ACTIVE
                </div>
              </div>

              <button
                className="orbital-btn"
                onClick={() => {
                  setSelectedSat(
                    null
                  );

                  setHoveredSat(
                    null
                  );
                }}
              >
                CLOSE
              </button>
            </div>

            <div className="data-grid">
              <div className="data-item">
                <p className="data-key">
                  OBJECT NAME
                </p>

                <p className="data-value bright">
                  {selectedSat.name ||
                    'UNKNOWN'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  NORAD ID
                </p>

                <p className="data-value bright">
                  {selectedSat.id}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  ORGANIZATION
                </p>

                <p className="data-value">
                  {selectedSat.organization ||
                    'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  LATITUDE
                </p>

                <p className="data-value">
                  {safeNumber(
                    selectedSat.lat
                  ).toFixed(4)}
                  °
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  LONGITUDE
                </p>

                <p className="data-value">
                  {safeNumber(
                    selectedSat.lng
                  ).toFixed(4)}
                  °
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  ALTITUDE
                </p>

                <p className="data-value">
                  {safeNumber(
                    selectedSat.altitudeKm
                  ).toFixed(1)}{' '}
                  km
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  VELOCITY
                </p>

                <p className="data-value">
                  {selectedSat.velocityNow
                    ? `${selectedSat.velocityNow.toFixed(3)} km/s`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  INCLINATION
                </p>

                <p className="data-value">
                  {selectedSat.inclination !=
                  null
                    ? `${safeNumber(
                        selectedSat.inclination
                      ).toFixed(4)}°`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  ECCENTRICITY
                </p>

                <p className="data-value">
                  {selectedSat.eccentricity !=
                  null
                    ? safeNumber(
                        selectedSat.eccentricity
                      ).toFixed(7)
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  RAAN
                </p>

                <p className="data-value">
                  {selectedSat.raan !=
                  null
                    ? `${safeNumber(
                        selectedSat.raan
                      ).toFixed(4)}°`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  ARG. PERIGEE
                </p>

                <p className="data-value">
                  {selectedSat.arg_perigee !=
                  null
                    ? `${safeNumber(
                        selectedSat.arg_perigee
                      ).toFixed(4)}°`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  MEAN MOTION
                </p>

                <p className="data-value">
                  {selectedSat.mean_motion !=
                  null
                    ? `${safeNumber(
                        selectedSat.mean_motion
                      ).toFixed(8)} rev/day`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  MEAN ANOMALY
                </p>

                <p className="data-value">
                  {selectedSat.mean_anomaly !=
                  null
                    ? `${safeNumber(
                        selectedSat.mean_anomaly
                      ).toFixed(4)}°`
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  TLE EPOCH
                </p>

                <p className="data-value muted">
                  {selectedSat.orbital_epoch
                    ? new Date(
                        selectedSat.orbital_epoch
                      ).toLocaleString()
                    : 'N/A'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  TLE SOURCE
                </p>

                <p className="data-value">
                  {selectedSat.orbital_source ||
                    'DATABASE'}
                </p>
              </div>

              <div className="data-item">
                <p className="data-key">
                  POSITION ENGINE
                </p>

                <p className="data-value bright">
                  SGP4 / SATELLITE.JS
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop:
                  '1px solid rgba(255,255,255,0.08)',
                color: '#71717a',
                fontSize: '0.58rem',
                lineHeight: 1.6,
              }}
            >
              The marker position is
              recalculated from the stored
              TLE every second using the
              current UTC time. The orbit
              line is generated from the same
              TLE rather than from a fake
              latitude/longitude animation.
            </div>
          </div>
        )}
    </div>
  );
}
