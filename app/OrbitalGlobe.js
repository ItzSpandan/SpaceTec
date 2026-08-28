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
      INITIALIZING ORBITAL ENGINE...
    </div>
  )
});

/* ============================================================
   LAUNCH PADS — all pads in the existing SpaceTec list
============================================================ */
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

const EARTH_RADIUS_KM = 6371;
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json';
const LIVE_UPDATE_MS = 2000;
const MAX_ORBIT_POINTS = 360;
const PAGE_SIZE = 50;

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

function makeSatrec(row) {
  try {
    if (typeof satellite.json2satrec === 'function' && row?.omm) {
      return satellite.json2satrec(row.omm);
    }
  } catch {}

  if (typeof row?.tle1 !== 'string' || typeof row?.tle2 !== 'string') return null;
  if (row.tle1.trim().length < 60 || row.tle2.trim().length < 60) return null;

  try {
    return satellite.twoline2satrec(
      row.tle1.trim(),
      row.tle2.trim()
    );
  } catch {
    return null;
  }
}

function propagateSat(sat, date = new Date()) {
  if (!sat?.satrec) return null;

  try {
    const pv = satellite.propagate(
      sat.satrec,
      date
    );

    if (!pv?.position || !pv?.velocity) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geo = satellite.eciToGeodetic(
      pv.position,
      gmst
    );

    const lat = satellite.degreesLat(
      geo.latitude
    );

    const lng = normalizeLng(
      satellite.degreesLong(
        geo.longitude
      )
    );

    const altitudeKm = num(
      geo.height,
      null
    );

    const velocityKmS = Math.sqrt(
      pv.velocity.x * pv.velocity.x +
      pv.velocity.y * pv.velocity.y +
      pv.velocity.z * pv.velocity.z
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

      globeAltitude: Math.max(
        0.002,
        altitudeKm / EARTH_RADIUS_KM
      ),

      telemetryTime:
        date.toISOString(),

      positionEci:
        pv.position,

      velocityEci:
        pv.velocity
    };
  } catch {
    return null;
  }
}

function tleEpochDisplay(satrec) {
  if (
    !satrec ||
    !Number.isFinite(satrec.epochyr) ||
    !Number.isFinite(satrec.epochdays)
  ) {
    return 'N/A';
  }

  const year =
    satrec.epochyr < 57
      ? 2000 + satrec.epochyr
      : 1900 + satrec.epochyr;

  const date = new Date(
    Date.UTC(year, 0, 1)
  );

  date.setUTCDate(
    date.getUTCDate() +
    Math.floor(satrec.epochdays) -
    1
  );

  date.setUTCMilliseconds(
    (satrec.epochdays -
      Math.floor(satrec.epochdays)) *
      86400000
  );

  return date
    .toISOString()
    .replace('T', ' ')
    .replace('.000Z', ' UTC');
}

function orbitalPeriodMinutes(sat) {
  if (
    sat?.satrec?.no > 0
  ) {
    return (
      (2 * Math.PI) /
      sat.satrec.no
    );
  }

  return 90;
}

function generateOrbit(
  sat,
  center = new Date()
) {
  if (!sat?.satrec) {
    return [];
  }

  const period = Math.max(
    20,
    Math.min(
      1440,
      orbitalPeriodMinutes(sat)
    )
  );

  const points = [];

  for (
    let i = 0;
    i <= MAX_ORBIT_POINTS;
    i += 1
  ) {
    const minutes =
      -period / 2 +
      (i / MAX_ORBIT_POINTS) *
        period;

    const p = propagateSat(
      sat,
      new Date(
        center.getTime() +
        minutes * 60000
      )
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

function filterActiveTles(
  rows,
  filter
) {
  if (filter === 'starlink') {
    return rows.filter(
      r =>
        r.name
          .toUpperCase()
          .includes('STARLINK')
    );
  }

  if (filter === 'weather') {
    return rows.filter(
      r =>
        /NOAA|GOES|METEOR|METOP|JPSS|EUMETSAT|HIMAWARI/
          .test(r.name)
    );
  }

  if (filter === 'stations') {
    return rows.filter(
      r =>
        /ISS|ZARYA|CSS|TIANGONG|STATION/
          .test(r.name)
    );
  }

  return rows;
}

function toLiveObject(row) {
  const satrec =
    makeSatrec(row);

  if (!satrec) {
    return null;
  }

  return propagateSat({
    id: row.id,

    name: row.name,

    organization:
      row.organization ||
      row.country ||
      'UNKNOWN',

    country:
      row.country ||
      '—',

    tle1:
      row.tle1,

    tle2:
      row.tle2,

    satrec,

    trackable: true,

    orbital_source:
      'CelesTrak / SGP4',

    tle_epoch:
      tleEpochDisplay(satrec)
  });
}
export default function OrbitalGlobe({
  requestedView
}) {
  const globeRef =
    useRef(null);

  const liveRowsRef =
    useRef(null);

  const liveSatellitesRef =
    useRef([]);

  const selectedIdRef =
    useRef(null);

  const hoveredIdRef =
    useRef(null);

  const updateTimerRef =
    useRef(null);

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

  const [satelliteCount, setSatelliteCount] =
    useState(0);

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

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(
        requestedView.mode
      );
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

  const clearSatelliteFocus =
    useCallback(() => {
      selectedIdRef.current = null;
      hoveredIdRef.current = null;

      setSelectedSat(null);
      setHoveredSat(null);
    }, []);

  /* ============================================================
     LOAD LIVE CATALOG ONCE
  ============================================================ */

  useEffect(() => {
    if (
      viewMode !==
      'satellites'
    ) {
      return undefined;
    }

    let cancelled = false;

    async function loadTles() {
      if (liveRowsRef.current) {
        applyFilter(
          liveRowsRef.current,
          satFilter
        );

        return;
      }

      setLoadingSats(true);

      setLoadingMessage(
        'FETCHING LIVE CELESTRAK TLE CATALOG...'
      );

      try {
        const response =
          await fetch(
            CELESTRAK_URL,
            {
              cache: 'no-store'
            }
          );

        if (!response.ok) {
          throw new Error(
            `CelesTrak HTTP ${response.status}`
          );
        }

        const json =
          await response.json();

        if (!Array.isArray(json)) {
          throw new Error(
            'Unexpected CelesTrak response'
          );
        }

        const rows =
          json
            .map(item => ({
              id: num(
                item.NORAD_CAT_ID,
                null
              ),

              name:
                String(
                  item.OBJECT_NAME ||
                  'UNKNOWN OBJECT'
                ).trim(),

              country:
                item.COUNTRY_CODE ||
                '—',

              omm: item,

              tle1:
                item.TLE_LINE1 ||
                null,

              tle2:
                item.TLE_LINE2 ||
                null
            }))
            .filter(
              r => r.id !== null
            );

        if (cancelled) {
          return;
        }

        liveRowsRef.current =
          rows;

        applyFilter(
          rows,
          satFilter
        );
      } catch (error) {
        console.error(
          'CelesTrak live catalog error:',
          error
        );

        if (!cancelled) {
          setSatelliteCount(0);

          setLoadingMessage(
            'LIVE TLE DATA UNAVAILABLE'
          );

          liveSatellitesRef.current =
            [];

          if (globeRef.current) {
            globeRef.current.pointsData(
              []
            );
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingSats(false);
        }
      }
    }

    function applyFilter(
      rows,
      filter
    ) {
      const matches =
        filterActiveTles(
          rows,
          filter
        );

      setLoadingMessage(
        `PROPAGATING ${matches.length.toLocaleString()} LIVE OBJECTS...`
      );

      /*
       * IMPORTANT:
       * Create the objects only when
       * the filter changes.
       *
       * Position updates below do NOT
       * rebuild this array in React.
       */

      const prepared =
        matches
          .map(toLiveObject)
          .filter(Boolean);

      liveSatellitesRef.current =
        prepared;

      setSatelliteCount(
        prepared.length
      );

      clearSatelliteFocus();

      if (globeRef.current) {
        globeRef.current.pointsData(
          prepared
        );
      }

      setTimeout(() => {
        if (!cancelled) {
          setLoadingMessage('');
        }
      }, 700);
    }

    loadTles();

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    satFilter,
    clearSatelliteFocus
  ]);

  /* ============================================================
     LIVE MOVEMENT

     NO setSatellites(previous => previous.map(...))

     This is the important performance fix.
  ============================================================ */

  useEffect(() => {
    if (
      viewMode !== 'satellites' ||
      !liveSatellitesRef.current.length
    ) {
      return undefined;
    }

    const tick = () => {
      const now =
        new Date();

      const list =
        liveSatellitesRef.current;

      for (
        let i = 0;
        i < list.length;
        i += 1
      ) {
        const updated =
          propagateSat(
            list[i],
            now
          );

        if (updated) {
          list[i].lat =
            updated.lat;

          list[i].lng =
            updated.lng;

          list[i].altitudeKm =
            updated.altitudeKm;

          list[i].velocityKmS =
            updated.velocityKmS;

          list[i].globeAltitude =
            updated.globeAltitude;

          list[i].telemetryTime =
            updated.telemetryTime;

          list[i].positionEci =
            updated.positionEci;

          list[i].velocityEci =
            updated.velocityEci;
        }
      }

      /*
       * Update ThreeGlobe directly.
       * React does NOT re-render 10k+ satellites.
       */

      if (globeRef.current) {
        globeRef.current.pointsData(
          list
        );
      }

      /*
       * Only the selected satellite's
       * inspector needs React state.
       */

      const selectedId =
        selectedIdRef.current;

      if (selectedId !== null) {
        const current =
          list.find(
            s =>
              String(s.id) ===
              String(selectedId)
          );

        if (current) {
          setSelectedSat({
            ...current
          });
        }
      }

      updateTimerRef.current =
        setTimeout(
          tick,
          LIVE_UPDATE_MS
        );
    };

    updateTimerRef.current =
      setTimeout(
        tick,
        LIVE_UPDATE_MS
      );

    return () => {
      if (
        updateTimerRef.current
      ) {
        clearTimeout(
          updateTimerRef.current
        );
      }
    };
  }, [
    viewMode,
    satelliteCount
  ]);

  /* ============================================================
     SELECTED ORBIT
  ============================================================ */

  const orbitalPaths =
    useMemo(() => {
      if (
        viewMode !==
          'satellites' ||
        !selectedSat?.satrec
      ) {
        return [];
      }

      return generateOrbit(
        selectedSat,
        new Date()
      );
    }, [
      viewMode,
      selectedSat
    ]);

  /* ============================================================
     WIKI / DATABASE
  ============================================================ */

  useEffect(() => {
    if (
      viewMode !== 'wiki'
    ) {
      return undefined;
    }

    let cancelled = false;

    const timer =
      setTimeout(
        async () => {
          setLoadingSats(true);

          try {
            const from =
              wikiPage *
              PAGE_SIZE;

            const to =
              from +
              PAGE_SIZE -
              1;

            let query =
              supabase
                .from('satellites')
                .select(
                  '*',
                  {
                    count:
                      'exact'
                  }
                );

            const search =
              wikiSearch
                .trim()
                .replace(
                  /[,%()]/g,
                  ''
                );

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
              setTotalWikiCount(
                0
              );
            }
          } finally {
            if (!cancelled) {
              setLoadingSats(
                false
              );
            }
          }
        },
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
        PAGE_SIZE
    );

  /* ============================================================
     CLICK SATELLITE / PAD
  ============================================================ */

  const handlePointClick =
    useCallback(
      point => {
        if (
          !globeRef.current
        ) {
          return;
        }

        if (
          viewMode === 'pads'
        ) {
          setSelectedPad(
            point
          );

          globeRef.current.pointOfView(
            {
              lat: point.lat,
              lng: point.lng,
              altitude: 1.35
            },
            800
          );

          return;
        }

        /*
         * SELECTED SATELLITE
         *
         * Everyone else disappears.
         */

        selectedIdRef.current =
          point.id;

        hoveredIdRef.current =
          null;

        setHoveredSat(null);

        setSelectedSat({
          ...point
        });

        globeRef.current.pointOfView(
          {
            lat: point.lat,
            lng: point.lng,
            altitude: 1.65
          },
          800
        );
      },
      [viewMode]
    );

  /* ============================================================
     HOVER
  ============================================================ */

  const handlePointHover =
    useCallback(
      point => {
        if (
          viewMode !==
          'satellites'
        ) {
          return;
        }

        const id =
          point?.id ?? null;

        hoveredIdRef.current =
          id;

        setHoveredSat(
          point || null
        );
      },
      [viewMode]
    );

  /* ============================================================
     EMPTY GLOBE CLICK = DESELECT
  ============================================================ */

  const handleGlobeClick =
    useCallback(() => {
      if (
        viewMode ===
        'satellites'
      ) {
        clearSatelliteFocus();
      }
    }, [
      viewMode,
      clearSatelliteFocus
    ]);

  /* ============================================================
     SATELLITE COLORS

     Selected = only selected remains
     Hovered = hovered bright, others dim
  ============================================================ */

  const pointColor =
    useCallback(
      d => {
        if (
          viewMode === 'pads'
        ) {
          return '#ffffff';
        }

        const selected =
          selectedIdRef.current !==
            null &&
          String(d.id) ===
            String(
              selectedIdRef.current
            );

        const hovered =
          hoveredIdRef.current !==
            null &&
          String(d.id) ===
            String(
              hoveredIdRef.current
            );

        if (selected) {
          return '#ffffff';
        }

        if (hovered) {
          return 'rgba(255,255,255,0.98)';
        }

        if (
          selectedIdRef.current !==
          null
        ) {
          return 'rgba(255,255,255,0)';
        }

        if (
          hoveredIdRef.current !==
          null
        ) {
          return 'rgba(255,255,255,0.12)';
        }

        return 'rgba(255,255,255,0.78)';
      },
      [
        viewMode,
        selectedSat,
        hoveredSat
      ]
    );

  const pointRadius =
    useCallback(
      d => {
        if (
          viewMode === 'pads'
        ) {
          return 0.65;
        }

        if (
          selectedIdRef.current !==
            null &&
          String(d.id) ===
            String(
              selectedIdRef.current
            )
        ) {
          return 0.50;
        }

        if (
          hoveredIdRef.current !==
            null &&
          String(d.id) ===
            String(
              hoveredIdRef.current
            )
        ) {
          return 0.38;
        }

        return 0.20;
      },
      [
        viewMode,
        selectedSat,
        hoveredSat
      ]
    );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}
    >
      <style>{`
        .orbital-button {
          transition:
            background .15s ease,
            border-color .15s ease;
        }

        .orbital-button:hover {
          background:
            rgba(255,255,255,.12) !important;
        }

        .orbital-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .orbital-scroll::-webkit-scrollbar-track {
          background: #050505;
        }

        .orbital-scroll::-webkit-scrollbar-thumb {
          background:
            rgba(255,255,255,.25);
          border-radius: 10px;
        }

        .orbital-space {
          position: relative;
          overflow: hidden;
          background: #010204;
        }

        .orbital-space::before,
        .orbital-space::after {
          content: '';
          position: absolute;
          inset: -50%;
          pointer-events: none;
        }

        .orbital-space::before {
          opacity: .78;

          background-image:
            radial-gradient(
              1px 1px at 4% 12%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 12% 70%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 22% 32%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 34% 86%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 48% 18%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 61% 64%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 75% 28%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 89% 78%,
              #fff,
              transparent
            ),
            radial-gradient(
              1px 1px at 96% 44%,
              #fff,
              transparent
            );

          background-size:
            420px 420px;

          animation:
            starDrift 90s linear infinite;
        }

        .orbital-space::after {
          opacity: .32;

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
            starDriftReverse 125s linear infinite;
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
            gap: '.65rem',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              color: '#71717a',
              fontFamily: 'monospace',
              fontSize: '.65rem',
              letterSpacing: '1.5px'
            }}
          >
            // DISPLAY MODE:
          </span>

          {[
            ['pads', 'Launch Pads'],
            ['satellites', 'Live Satellites'],
            ['wiki', 'Satellite Database']
          ].map(
            ([key, label]) => (
              <button
                key={key}
                className="orbital-button"
                onClick={() => {
                  setViewMode(key);
                  clearSatelliteFocus();
                }}
                style={{
                  padding:
                    '.5rem .85rem',

                  background:
                    viewMode === key
                      ? '#fff'
                      : 'rgba(255,255,255,.04)',

                  border:
                    viewMode === key
                      ? '1px solid #fff'
                      : '1px solid rgba(255,255,255,.18)',

                  color:
                    viewMode === key
                      ? '#000'
                      : '#fff',

                  fontSize:
                    '.65rem',

                  fontWeight:
                    700,

                  letterSpacing:
                    '1px',

                  textTransform:
                    'uppercase',

                  cursor:
                    'pointer'
                }}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* PAD FILTERS */}

        {viewMode === 'pads' && (
          <div
            style={{
              display: 'flex',
              gap: '.4rem'
            }}
          >
            {[
              'all',
              'major',
              'minor'
            ].map(
              filter => (
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
                      '.4rem .75rem',

                    background:
                      padFilter === filter
                        ? 'rgba(255,255,255,.12)'
                        : 'transparent',

                    border:
                      '1px solid rgba(255,255,255,.22)',

                    color:
                      '#fff',

                    fontSize:
                      '.6rem',

                    textTransform:
                      'uppercase',

                    cursor:
                      'pointer'
                  }}
                >
                  {filter}
                </button>
              )
            )}
          </div>
        )}

        {/* SATELLITE FILTERS */}

        {viewMode === 'satellites' && (
          <div
            style={{
              display: 'flex',
              gap: '.4rem',
              flexWrap: 'wrap'
            }}
          >
            {[
              ['stations', 'Stations'],
              ['starlink', 'Starlink'],
              ['weather', 'Weather'],
              ['active', 'All Active']
            ].map(
              ([key, label]) => (
                <button
                  key={key}
                  className="orbital-button"
                  onClick={() => {
                    setSatFilter(
                      key
                    );

                    clearSatelliteFocus();
                  }}
                  style={{
                    padding:
                      '.4rem .7rem',

                    background:
                      satFilter === key
                        ? 'rgba(255,255,255,.12)'
                        : 'transparent',

                    border:
                      '1px solid rgba(255,255,255,.22)',

                    color:
                      '#fff',

                    fontSize:
                      '.6rem',

                    textTransform:
                      'uppercase',

                    cursor:
                      'pointer'
                  }}
                >
                  {label}
                </button>
              )
            )}
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
            height: 550,
            border:
              '1px solid rgba(255,255,255,.15)',
            borderRadius: 2
          }}
        >
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

              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"

              backgroundColor="rgba(0,0,0,0)"

              animateIn={false}

              pointsData={
                viewMode === 'pads'
                  ? filteredPads
                  : liveSatellitesRef.current
              }

              pointLat="lat"

              pointLng="lng"

              pointAltitude={
                viewMode === 'pads'
                  ? 0.012
                  : d =>
                      d.globeAltitude ||
                      0.002
              }

              pointColor={
                pointColor
              }

              pointRadius={
                pointRadius
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
                'rgba(255,255,255,.70)'
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
                '#fff'
              }

              ringMaxRadius={2.2}

              ringPropagationSpeed={1.4}

              ringRepeatPeriod={1200}

              onPointClick={
                handlePointClick
              }

              onPointHover={
                handlePointHover
              }

              onGlobeClick={
                handleGlobeClick
              }

              pointLabel={d =>
                viewMode === 'pads'
                  ? `
                <div style="background:rgba(0,0,0,.96);border:1px solid rgba(255,255,255,.45);padding:9px 11px;color:#fff;font-family:monospace;font-size:10px">
                  <div style="font-weight:700;margin-bottom:5px">${d.name}</div>
                  <div style="color:#aaa">${d.agency}</div>
                  <div style="margin-top:5px;color:#aaa">
                    LAT ${Number(d.lat).toFixed(4)}°
                    <br/>
                    LNG ${Number(d.lng).toFixed(4)}°
                  </div>
                </div>`
                  : `
                <div style="background:rgba(0,0,0,.97);border:1px solid rgba(255,255,255,.45);padding:9px 11px;color:#fff;font-family:monospace;font-size:10px;min-width:180px">
                  <div style="font-weight:700;margin-bottom:5px">
                    ${d.name || 'UNKNOWN OBJECT'}
                  </div>

                  <div style="color:#999">
                    NORAD ${d.id ?? 'N/A'}
                  </div>

                  <div style="margin-top:4px">
                    LAT ${Number(d.lat).toFixed(4)}°
                  </div>

                  <div>
                    LNG ${Number(d.lng).toFixed(4)}°
                  </div>

                  <div>
                    ALT ${Number(d.altitudeKm).toFixed(1)} km
                  </div>

                  <div>
                    SPEED ${Number(d.velocityKmS).toFixed(2)} km/s
                  </div>

                  <div style="margin-top:5px;color:#777">
                    LIVE CELESTRAK / SGP4
                  </div>
                </div>`
            }
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
                  'rgba(0,0,0,.82)',

                border:
                  '1px solid rgba(255,255,255,.18)',

                padding:
                  '.55rem .75rem',

                fontFamily:
                  'monospace',

                pointerEvents:
                  'none'
              }}
            >
              <div
                style={{
                  color:
                    '#fff',

                  fontSize:
                    '.58rem',

                  letterSpacing:
                    '1px'
                }}
              >
                ● SGP4 LIVE PROPAGATION
              </div>

              <div
                style={{
                  color:
                    '#777',

                  fontSize:
                    '.5rem',

                  marginTop:
                    3
                }}
              >
                {satelliteCount.toLocaleString()}
                {' '}
                ACTIVE OBJECTS
                {' · '}
                CURRENT TIME → TLE → POSITION
              </div>
            </div>
          )}

          {/* LOADING */}

          {loadingSats &&
            viewMode ===
              'satellites' && (
            <div
              style={{
                position:
                  'absolute',

                right:
                  '1rem',

                top:
                  '1rem',

                zIndex:
                  5,

                background:
                  'rgba(0,0,0,.90)',

                border:
                  '1px solid rgba(255,255,255,.18)',

                padding:
                  '.55rem .8rem',

                color:
                  '#fff',

                fontFamily:
                  'monospace',

                fontSize:
                  '.58rem',

                pointerEvents:
                  'none'
              }}
            >
              {loadingMessage ||
                'LOADING LIVE ORBITAL DATA...'}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          WIKI / DATABASE
      ====================================================== */}

      {viewMode === 'wiki' && (
        <div
          style={{
            padding:
              '1.5rem',

            border:
              '1px solid rgba(255,255,255,.15)',

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

              gap:
                '1rem',

              flexWrap:
                'wrap',

              marginBottom:
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
                  '.7rem',

                letterSpacing:
                  '2px',

                fontWeight:
                  800
              }}
            >
              // SATELLITE DATABASE —
              {' '}
              {totalWikiCount.toLocaleString()}
              {' '}
              MATCHES
            </span>

            <input
              value={
                wikiSearch
              }

              onChange={e => {
                setWikiSearch(
                  e.target.value
                );

                setWikiPage(
                  0
                );
              }}

              placeholder="Search name or NORAD ID..."

              style={{
                width:
                  320,

                maxWidth:
                  '100%',

                padding:
                  '.55rem .8rem',

                background:
                  '#050505',

                border:
                  '1px solid rgba(255,255,255,.2)',

                color:
                  '#fff',

                outline:
                  'none',

                fontFamily:
                  'monospace',

                fontSize:
                  '.7rem'
              }}
            />
          </div>

          <div
            className="orbital-scroll"
            style={{
              maxHeight:
                420,

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
                  '.7rem',

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
                      '1px solid rgba(255,255,255,.2)',

                    background:
                      '#050505'
                  }}
                >
                  {[
                    'NORAD ID',
                    'OBJECT NAME',
                    'ORGANIZATION',
                    'LAT',
                    'LNG',
                    'ALT'
                  ].map(
                    h => (
                      <th
                        key={h}
                        style={{
                          padding:
                            '.6rem'
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
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
                          '1px solid rgba(255,255,255,.06)'
                      }}
                    >
                      <td
                        style={{
                          padding:
                            '.6rem',
                          color:
                            '#fff'
                        }}
                      >
                        {item.id}
                      </td>

                      <td
                        style={{
                          padding:
                            '.6rem',
                          color:
                            '#fff',
                          fontWeight:
                            700
                        }}
                      >
                        {item.name}
                      </td>

                      <td
                        style={{
                          padding:
                            '.6rem'
                        }}
                      >
                        {item.organization ||
                          'Unknown'}
                      </td>

                      <td
                        style={{
                          padding:
                            '.6rem'
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
                            '.6rem'
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
                            '.6rem'
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
                      '.7rem'
                  }}
                >
                  NO RECORDS FOUND
                </div>
              )}
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

              paddingTop:
                '.8rem',

              borderTop:
                '1px solid rgba(255,255,255,.12)'
            }}
          >
            <span
              style={{
                color:
                  '#71717a',

                fontFamily:
                  'monospace',

                fontSize:
                  '.6rem'
              }}
            >
              PAGE
              {' '}
              {wikiPage + 1}
              {' '}
              OF
              {' '}
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
                  '.5rem'
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
                      : '#fff',

                  fontSize:
                    '.6rem',

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
                  wikiPage + 1 >=
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
                      : '#fff',

                  fontSize:
                    '.6rem',

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

      {/* ======================================================
          LAUNCH PAD INSPECTOR
      ====================================================== */}

      {viewMode ===
        'pads' &&
        selectedPad && (
          <Inspector
            title="// LAUNCH FACILITY"
            onClose={null}
          >
            <InspectorField
              label="FACILITY"
              value={
                selectedPad.name
              }
              large
            />

            <InspectorField
              label="AGENCY"
              value={
                selectedPad.agency
              }
            />

            <InspectorField
              label="COUNTRY / REGION"
              value={
                selectedPad.country
              }
            />

            <InspectorField
              label="EXACT COORDINATES"
              value={`${Number(
                selectedPad.lat
              ).toFixed(
                5
              )}°, ${Number(
                selectedPad.lng
              ).toFixed(
                5
              )}°`}
              mono
            />
          </Inspector>
        )}

      {/* ======================================================
          SATELLITE INSPECTOR
      ====================================================== */}

      {viewMode ===
        'satellites' &&
        selectedSat && (
          <Inspector
            title="// ORBITAL INSPECTOR"
            onClose={
              clearSatelliteFocus
            }
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
                selectedSat.country ||
                'N/A'
              }
            />

            <InspectorField
              label="LATITUDE"
              value={`${Number(
                selectedSat.lat
              ).toFixed(
                4
              )}°`}
              mono
            />

            <InspectorField
              label="LONGITUDE"
              value={`${Number(
                selectedSat.lng
              ).toFixed(
                4
              )}°`}
              mono
            />

            <InspectorField
              label="ALTITUDE"
              value={`${Number(
                selectedSat.altitudeKm
              ).toFixed(
                1
              )} km`}
              mono
            />

            <InspectorField
              label="VELOCITY"
              value={`${Number(
                selectedSat.velocityKmS
              ).toFixed(
                2
              )} km/s`}
              mono
            />

            <InspectorField
              label="INCLINATION"
              value={
                Number.isFinite(
                  Number(
                    selectedSat
                      .satrec
                      ?.inclo
                  )
                )
                  ? `${(
                      Number(
                        selectedSat
                          .satrec
                          .inclo
                      ) *
                      180 /
                      Math.PI
                    ).toFixed(
                      3
                    )}°`
                  : 'N/A'
              }
              mono
            />

            <InspectorField
              label="ORBIT SOURCE"
              value="CelesTrak / SGP4"
            />

            <InspectorField
              label="TLE EPOCH"
              value={
                selectedSat.tle_epoch ||
                tleEpochDisplay(
                  selectedSat.satrec
                )
              }
            />
          </Inspector>
        )}
    </div>
  );
}

function Inspector({
  title,
  onClose,
  children
}) {
  return (
    <div
      style={{
        padding:
          '1.5rem',

        border:
          '1px solid rgba(255,255,255,.15)',

        background:
          'rgba(5,5,5,.94)'
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
              '.65rem',

            letterSpacing:
              '2px',

            fontWeight:
              800
          }}
        >
          {title}
        </span>

        {onClose && (
          <button
            onClick={
              onClose
            }

            style={{
              border:
                0,

              background:
                'transparent',

              color:
                '#777',

              cursor:
                'pointer',

              fontFamily:
                'monospace',

              fontSize:
                '.6rem'
            }}
          >
            [CLOSE]
          </button>
        )}
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
        {children}
      </div>

      <div
        style={{
          marginTop:
            '1.2rem',

          paddingTop:
            '.8rem',

          borderTop:
            '1px solid rgba(255,255,255,.1)',

          color:
            '#777',

          fontFamily:
            'monospace',

          fontSize:
            '.55rem'
        }}
      >
        ● CURRENT TIME PROPAGATION
      </div>
    </div>
  );
}

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
          margin:
            0,

          color:
            '#71717a',

          fontSize:
            '.55rem'
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin:
            '.25rem 0 0',

          color:
            '#fff',

          fontSize:
            large
              ? '.95rem'
              : '.82rem',

          fontWeight:
            large
              ? 700
              : 400,

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
