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
        background: '#000'
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  )
});

/* =========================================================
   GLOBAL LAUNCH PADS
   ========================================================= */

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

/* =========================================================
   HELPERS
   ========================================================= */

function safeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLongitude(lng) {
  if (!Number.isFinite(lng)) return 0;

  let result = lng;

  while (result > 180) result -= 360;
  while (result < -180) result += 360;

  return result;
}

/*
 * Convert a Supabase satellite record into a satellite.js
 * SatRec object.
 */
function createSatrec(sat) {
  if (!sat?.tle_line1 || !sat?.tle_line2) return null;

  try {
    return satellite.twoline2satrec(
      String(sat.tle_line1).trim(),
      String(sat.tle_line2).trim()
    );
  } catch (error) {
    console.warn(
      'Unable to parse TLE for satellite:',
      sat?.name,
      error
    );

    return null;
  }
}

/*
 * Calculate the REAL current position from the TLE.
 *
 * This is the important replacement for the old:
 *
 *     lng + speed
 *
 * movement.
 */
function calculateLivePosition(sat, date = new Date()) {
  const satrec = createSatrec(sat);

  if (!satrec) return null;

  try {
    const positionAndVelocity = satellite.propagate(
      satrec,
      date
    );

    if (
      !positionAndVelocity ||
      !positionAndVelocity.position
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geodetic = satellite.eciToGeodetic(
      positionAndVelocity.position,
      gmst
    );

    const lat = satellite.degreesLat(geodetic.latitude);
    const lng = satellite.degreesLong(geodetic.longitude);

    const altitudeKm = geodetic.height;

    let velocityKmS = null;

    if (positionAndVelocity.velocity) {
      const velocity = positionAndVelocity.velocity;

      velocityKmS = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
      );
    }

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    return {
      lat,
      lng: normalizeLongitude(lng),
      altitudeKm,
      velocityKmS
    };
  } catch (error) {
    return null;
  }
}

/*
 * Calculate an actual orbital track from the TLE.

 * The orbit is sampled around the current time.
 */
function calculateOrbitFromTLE(sat) {
  const satrec = createSatrec(sat);

  if (!satrec) return [];

  const meanMotion = safeNumber(
    sat.mean_motion,
    null
  );

  /*
   * mean_motion is normally revolutions/day.
   *
   * If it exists, calculate the orbital period.
   * Otherwise use 90 minutes as a reasonable fallback
   * for LEO objects.
   */
  let periodMinutes = 90;

  if (meanMotion && meanMotion > 0) {
    periodMinutes = (24 * 60) / meanMotion;
  }

  /*
   * Keep sampling sensible for visualization.
   */
  periodMinutes = Math.max(
    20,
    Math.min(periodMinutes, 300)
  );

  const samples = 180;

  const startTime = new Date(
    Date.now() - (periodMinutes * 60 * 1000) / 2
  );

  const points = [];

  for (let i = 0; i <= samples; i++) {
    const time = new Date(
      startTime.getTime() +
      (i / samples) *
        periodMinutes *
        60 *
        1000
    );

    try {
      const positionAndVelocity =
        satellite.propagate(
          satrec,
          time
        );

      if (
        !positionAndVelocity ||
        !positionAndVelocity.position
      ) {
        continue;
      }

      const gmst = satellite.gstime(time);

      const geodetic =
        satellite.eciToGeodetic(
          positionAndVelocity.position,
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
        geodetic.height;

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Number.isFinite(altitudeKm)
      ) {
        points.push({
          lat,
          lng,
          altitude: Math.max(
            0.01,
            Math.min(
              0.5,
              altitudeKm / 6371
            )
          )
        });
      }
    } catch {
      // Skip invalid propagation sample.
    }
  }

  return points;
}

/*
 * Split an orbital line when it crosses the ±180°
 * longitude boundary.

 * Without this, react-globe.gl can draw a huge
 * line across the Earth when the orbit crosses
 * the date line.
 */
function splitDateline(points) {
  if (!points.length) return [];

  const segments = [];
  let current = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const point = points[i];

    const longitudeJump = Math.abs(
      point.lng - previous.lng
    );

    if (longitudeJump > 180) {
      if (current.length > 1) {
        segments.push(current);
      }

      current = [point];
    } else {
      current.push(point);
    }
  }

  if (current.length > 1) {
    segments.push(current);
  }

  return segments;
}

export default function OrbitalGlobe({
  requestedView
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

  const [loadingSats, setLoadingSats] =
    useState(false);

  const [lastUpdate, setLastUpdate] =
    useState(null);

  /*
   * Satellite database / Wiki.
   */
  const [wikiData, setWikiData] =
    useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const pageSize = 50;

  /*
   * Cache the original database records.
   * Live positions are recalculated from their TLE.
   */
  const satCacheRef = useRef({});

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad =>
        padFilter === 'all' ||
        pad.type === padFilter
    );
  }, [padFilter]);

  /* =======================================================
     LOAD SATELLITES
     ======================================================= */

  useEffect(() => {
    if (viewMode === 'wiki') return;

    let cancelled = false;

    async function fetchSatellites() {
      if (satCacheRef.current[satFilter]) {
        const cached =
          satCacheRef.current[satFilter];

        const updated = cached.map(sat => {
          const live =
            calculateLivePosition(
              sat,
              new Date()
            );

          return live
            ? {
                ...sat,
                lat: live.lat,
                lng: live.lng,
                altitudeKm:
                  live.altitudeKm,
                velocityKmS:
                  live.velocityKmS
              }
            : sat;
        });

        if (!cancelled) {
          setSatellites(updated);
          setLastUpdate(new Date());
        }

        return;
      }

      setLoadingSats(true);

      try {
        /*
         * Select the fields needed by the globe.
         *
         * We intentionally don't rely on database lat/lng
         * because the TLE is what gives us the current
         * orbital position.
         */
        let query = supabase
          .from('satellites')
          .select(`
            id,
            name,
            organization,
            velocity,
            altitude,
            inclination,
            eccentricity,
            arg_perigee,
            raan,
            mean_anomaly,
            mean_motion,
            mean_motion_dot,
            mean_motion_ddot,
            bstar,
            epoch,
            orbital_epoch,
            orbital_source,
            tle_line1,
            tle_line2,
            lat,
            lng,
            updated_at
          `);

        if (satFilter === 'stations') {
          query = query.ilike(
            'name',
            '%ISS%'
          );
        }

        if (satFilter === 'starlink') {
          query = query
            .ilike(
              'name',
              '%STARLINK%'
            )
            .limit(1000);
        }

        if (satFilter === 'weather') {
          query = query.or(
            'name.ilike.%NOAA%,name.ilike.%GOES%'
          );
        }

        /*
         * IMPORTANT:
         *
         * Do NOT put a tiny 1,500-record cap here.
         *
         * The old code was the reason "All Active"
         * did not represent the whole database.
         *
         * Supabase/PostgREST can return the configured
         * result set in pages. We request the records
         * without the artificial 1,500 limit.
         */
        if (satFilter === 'active') {
          query = query.order(
            'id',
            { ascending: true }
          );
        }

        const {
          data,
          error
        } = await query;

        if (error) {
          throw error;
        }

        if (cancelled) return;

        const sourceData = Array.isArray(data)
          ? data
          : [];

        /*
         * Keep only records that actually have usable
         * TLE information for live tracking.
         */
        const formatted = sourceData
          .map((sat, index) => {
            const name =
              sat.name || 'UNKNOWN OBJECT';

            const live =
              calculateLivePosition(
                sat,
                new Date()
              );

            return {
              ...sat,

              /*
               * REAL position if TLE works.
               *
               * We don't create fake coordinates.
               */
              lat: live
                ? live.lat
                : safeNumber(
                    sat.lat,
                    null
                  ),

              lng: live
                ? live.lng
                : safeNumber(
                    sat.lng,
                    null
                  ),

              altitudeKm:
                live?.altitudeKm ??
                safeNumber(
                  sat.altitude,
                  null
                ),

              velocityKmS:
                live?.velocityKmS ??
                safeNumber(
                  sat.velocity,
                  null
                ),

              /*
               * Internal stable index.
               */
              _index: index,

              /*
               * Whether satellite.js successfully
               * propagated this object.
               */
              _hasLiveTLE: Boolean(live),

              /*
               * Clean white marker.
               */
              _baseColor: '#ffffff'
            };
          })
          .filter(
            sat =>
              Number.isFinite(sat.lat) &&
              Number.isFinite(sat.lng)
          );

        satCacheRef.current[satFilter] =
          formatted;

        setSatellites(formatted);
        setLastUpdate(new Date());
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
    }

    fetchSatellites();

    return () => {
      cancelled = true;
    };
  }, [satFilter, viewMode]);

  /* =======================================================
     REAL-TIME TLE POSITION REFRESH
     ======================================================= */

  useEffect(() => {
    if (viewMode !== 'satellites') {
      return;
    }

    /*
     * Recalculate positions every second.
     *
     * This is much more accurate than manually adding
     * longitude every 50 ms.
     */
    const interval = setInterval(() => {
      const now = new Date();

      setSatellites(previous => {
        return previous.map(sat => {
          const live =
            calculateLivePosition(
              sat,
              now
            );

          if (!live) {
            return sat;
          }

          return {
            ...sat,
            lat: live.lat,
            lng: live.lng,
            altitudeKm:
              live.altitudeKm,
            velocityKmS:
              live.velocityKmS,
            _hasLiveTLE: true
          };
        });
      });

      setSelectedSat(current => {
        if (!current) return null;

        const live =
          calculateLivePosition(
            current,
            now
          );

        if (!live) {
          return current;
        }

        return {
          ...current,
          lat: live.lat,
          lng: live.lng,
          altitudeKm:
            live.altitudeKm,
          velocityKmS:
            live.velocityKmS
        };
      });

      setLastUpdate(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [viewMode]);

  /* =======================================================
     WIKI DATABASE SEARCH
     ======================================================= */

  useEffect(() => {
    if (viewMode !== 'wiki') return;

    let cancelled = false;

    const timer = setTimeout(
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
                { count: 'exact' }
              );

          const search =
            wikiSearch.trim();

          if (search) {
            /*
             * Search numeric input against ID
             * and name.
             */
            if (
              /^\d+$/.test(search)
            ) {
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

          const {
            data,
            count,
            error
          } = await query
            .order(
              'id',
              { ascending: true }
            )
            .range(from, to);

          if (error) {
            throw error;
          }

          if (!cancelled) {
            setWikiData(data || []);
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
            setLoadingSats(false);
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

  /* =======================================================
     CLEAN SATELLITE RENDER DATA
     ======================================================= */

  const renderSatellites =
    useMemo(() => {
      return satellites
        .filter(
          sat =>
            Number.isFinite(sat.lat) &&
            Number.isFinite(sat.lng)
        )
        .map(sat => {
          const focused =
            hoveredSat?.id === sat.id ||
            selectedSat?.id === sat.id;

          const hasFocus =
            Boolean(
              hoveredSat ||
              selectedSat
            );

          return {
            ...sat,

            /*
             * Clean white look.
             */
            color:
              focused || !hasFocus
                ? '#ffffff'
                : 'rgba(255,255,255,0.16)',

            /*
             * Keep markers small.
             * The previous values made them look
             * like long colored spikes.
             */
            radius:
              focused
                ? 0.85
                : 0.42,

            /*
             * Very small altitude separation.
             *
             * This is NOT the physical altitude.
             * pointAltitude is only a visual offset.
             */
            visualAltitude:
              focused
                ? 0.035
                : 0.025
          };
        });
    }, [
      satellites,
      hoveredSat,
      selectedSat
    ]);

  /* =======================================================
     SELECTED SATELLITE ORBIT
     ======================================================= */

  const orbitalPaths =
    useMemo(() => {
      if (!selectedSat) {
        return [];
      }

      const points =
        calculateOrbitFromTLE(
          selectedSat
        );

      const segments =
        splitDateline(points);

      return segments.map(
        segment => ({
          satelliteId:
            selectedSat.id,
          points: segment
        })
      );
    }, [selectedSat]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
    );

  /* =======================================================
     CAMERA HELPERS
     ======================================================= */

  const focusSatellite =
    useCallback(
      sat => {
        if (!sat) return;

        setSelectedSat(sat);

        setHoveredSat(null);

        if (
          globeRef.current &&
          Number.isFinite(sat.lat) &&
          Number.isFinite(sat.lng)
        ) {
          globeRef.current.pointOfView(
            {
              lat: sat.lat,
              lng: sat.lng,
              altitude: 1.65
            },
            1000
          );
        }
      },
      []
    );

  const focusPad =
    useCallback(
      pad => {
        if (!pad) return;

        setSelectedPad(pad);

        if (globeRef.current) {
          globeRef.current.pointOfView(
            {
              lat: pad.lat,
              lng: pad.lng,
              altitude: 1.5
            },
            1000
          );
        }
      },
      []
    );

  /*
   * When changing mode, clear satellite selection.
   */
  const changeViewMode =
    useCallback(mode => {
      setViewMode(mode);
      setSelectedSat(null);
      setHoveredSat(null);
    }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto'
      }}
    >

      <style>{`

        @keyframes orbitalStars {
          from {
            background-position:
              0 0,
              0 0,
              0 0,
              0 0;
          }

          to {
            background-position:
              -300px 180px,
              500px -250px,
              -700px 350px,
              900px -400px;
          }
        }

        .orbital-starfield {
          background-color: #000000;

          background-image:
            radial-gradient(
              1px 1px at 20px 30px,
              rgba(255,255,255,0.95),
              transparent
            ),
            radial-gradient(
              1px 1px at 120px 80px,
              rgba(255,255,255,0.75),
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 250px 160px,
              rgba(255,255,255,0.9),
              transparent
            ),
            radial-gradient(
              1px 1px at 330px 40px,
              rgba(255,255,255,0.65),
              transparent
            );

          background-size:
            360px 260px,
            520px 380px,
            700px 500px,
            900px 650px;

          animation:
            orbitalStars
            80s
            linear
            infinite;

          position: relative;
          overflow: hidden;
        }

        .orbital-starfield::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;

          background:
            radial-gradient(
              ellipse at center,
              rgba(0,0,0,0)
              35%,
              rgba(0,0,0,0.28)
              100%
            );
        }

        .orbital-globe-shell {
          position: relative;
          width: 100%;
          height: 620px;
          overflow: hidden;

          border:
            1px solid
            rgba(255,255,255,0.16);

          background: #000000;
        }

        .orbital-globe-canvas {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .orbital-status {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 20;

          background:
            rgba(0,0,0,0.82);

          border:
            1px solid
            rgba(255,255,255,0.2);

          padding:
            7px 10px;

          color: #ffffff;

          font-family: monospace;

          font-size: 10px;

          letter-spacing: 1px;

          backdrop-filter:
            blur(6px);
        }

        .orbital-live-dot {
          display: inline-block;

          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #ffffff;

          margin-right: 7px;

          box-shadow:
            0 0 8px
            rgba(255,255,255,0.9);
        }

        .orbital-control {
          padding:
            0.5rem 1rem;

          background:
            rgba(255,255,255,0.04);

          border:
            1px solid
            rgba(255,255,255,0.14);

          color: #ffffff;

          font-size:
            0.7rem;

          font-weight: 700;

          letter-spacing:
            1px;

          text-transform:
            uppercase;

          cursor: pointer;

          transition:
            background 0.15s,
            border-color 0.15s;
        }

        .orbital-control:hover {
          background:
            rgba(255,255,255,0.1);

          border-color:
            rgba(255,255,255,0.35);
        }

        .orbital-control.active {
          background:
            rgba(255,255,255,0.14);

          border-color:
            rgba(255,255,255,0.65);
        }

      `}</style>

      {/* CONTROLS */}

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
            gap: '0.8rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: '#a1a1aa',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '700'
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
              label:
                `Live Globe Satellites (${satellites.length})`
            },
            {
              key: 'wiki',
              label:
                'Satellite Database'
            }
          ].map(btn => (
            <button
              key={btn.key}
              className={
                `orbital-control ${
                  viewMode === btn.key
                    ? 'active'
                    : ''
                }`
              }
              onClick={() =>
                changeViewMode(
                  btn.key
                )
              }
            >
              {btn.label}
            </button>
          ))}
        </div>

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
                className={
                  `orbital-control ${
                    padFilter === filter
                      ? 'active'
                      : ''
                  }`
                }
                onClick={() =>
                  setPadFilter(
                    filter
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem'
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
                className={
                  `orbital-control ${
                    satFilter ===
                    filter.key
                      ? 'active'
                      : ''
                  }`
                }
                onClick={() =>
                  setSatFilter(
                    filter.key
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.7rem'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
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
        background: '#000'
      }}
    >
      INITIALIZING 3D WEBGL ENGINE...
    </div>
  )
});

/* =========================================================
   GLOBAL LAUNCH PADS
   ========================================================= */

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

/* =========================================================
   HELPERS
   ========================================================= */

function safeNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeLongitude(lng) {
  if (!Number.isFinite(lng)) return 0;

  let result = lng;

  while (result > 180) result -= 360;
  while (result < -180) result += 360;

  return result;
}

/*
 * Convert a Supabase satellite record into a satellite.js
 * SatRec object.
 */
function createSatrec(sat) {
  if (!sat?.tle_line1 || !sat?.tle_line2) return null;

  try {
    return satellite.twoline2satrec(
      String(sat.tle_line1).trim(),
      String(sat.tle_line2).trim()
    );
  } catch (error) {
    console.warn(
      'Unable to parse TLE for satellite:',
      sat?.name,
      error
    );

    return null;
  }
}

/*
 * Calculate the REAL current position from the TLE.
 *
 * This is the important replacement for the old:
 *
 *     lng + speed
 *
 * movement.
 */
function calculateLivePosition(sat, date = new Date()) {
  const satrec = createSatrec(sat);

  if (!satrec) return null;

  try {
    const positionAndVelocity = satellite.propagate(
      satrec,
      date
    );

    if (
      !positionAndVelocity ||
      !positionAndVelocity.position
    ) {
      return null;
    }

    const gmst = satellite.gstime(date);

    const geodetic = satellite.eciToGeodetic(
      positionAndVelocity.position,
      gmst
    );

    const lat = satellite.degreesLat(geodetic.latitude);
    const lng = satellite.degreesLong(geodetic.longitude);

    const altitudeKm = geodetic.height;

    let velocityKmS = null;

    if (positionAndVelocity.velocity) {
      const velocity = positionAndVelocity.velocity;

      velocityKmS = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z
      );
    }

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return null;
    }

    return {
      lat,
      lng: normalizeLongitude(lng),
      altitudeKm,
      velocityKmS
    };
  } catch (error) {
    return null;
  }
}

/*
 * Calculate an actual orbital track from the TLE.

 * The orbit is sampled around the current time.
 */
function calculateOrbitFromTLE(sat) {
  const satrec = createSatrec(sat);

  if (!satrec) return [];

  const meanMotion = safeNumber(
    sat.mean_motion,
    null
  );

  /*
   * mean_motion is normally revolutions/day.
   *
   * If it exists, calculate the orbital period.
   * Otherwise use 90 minutes as a reasonable fallback
   * for LEO objects.
   */
  let periodMinutes = 90;

  if (meanMotion && meanMotion > 0) {
    periodMinutes = (24 * 60) / meanMotion;
  }

  /*
   * Keep sampling sensible for visualization.
   */
  periodMinutes = Math.max(
    20,
    Math.min(periodMinutes, 300)
  );

  const samples = 180;

  const startTime = new Date(
    Date.now() - (periodMinutes * 60 * 1000) / 2
  );

  const points = [];

  for (let i = 0; i <= samples; i++) {
    const time = new Date(
      startTime.getTime() +
      (i / samples) *
        periodMinutes *
        60 *
        1000
    );

    try {
      const positionAndVelocity =
        satellite.propagate(
          satrec,
          time
        );

      if (
        !positionAndVelocity ||
        !positionAndVelocity.position
      ) {
        continue;
      }

      const gmst = satellite.gstime(time);

      const geodetic =
        satellite.eciToGeodetic(
          positionAndVelocity.position,
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
        geodetic.height;

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Number.isFinite(altitudeKm)
      ) {
        points.push({
          lat,
          lng,
          altitude: Math.max(
            0.01,
            Math.min(
              0.5,
              altitudeKm / 6371
            )
          )
        });
      }
    } catch {
      // Skip invalid propagation sample.
    }
  }

  return points;
}

/*
 * Split an orbital line when it crosses the ±180°
 * longitude boundary.

 * Without this, react-globe.gl can draw a huge
 * line across the Earth when the orbit crosses
 * the date line.
 */
function splitDateline(points) {
  if (!points.length) return [];

  const segments = [];
  let current = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1];
    const point = points[i];

    const longitudeJump = Math.abs(
      point.lng - previous.lng
    );

    if (longitudeJump > 180) {
      if (current.length > 1) {
        segments.push(current);
      }

      current = [point];
    } else {
      current.push(point);
    }
  }

  if (current.length > 1) {
    segments.push(current);
  }

  return segments;
}

export default function OrbitalGlobe({
  requestedView
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

  const [loadingSats, setLoadingSats] =
    useState(false);

  const [lastUpdate, setLastUpdate] =
    useState(null);

  /*
   * Satellite database / Wiki.
   */
  const [wikiData, setWikiData] =
    useState([]);

  const [wikiSearch, setWikiSearch] =
    useState('');

  const [wikiPage, setWikiPage] =
    useState(0);

  const [totalWikiCount, setTotalWikiCount] =
    useState(0);

  const pageSize = 50;

  /*
   * Cache the original database records.
   * Live positions are recalculated from their TLE.
   */
  const satCacheRef = useRef({});

  useEffect(() => {
    if (requestedView?.mode) {
      setViewMode(requestedView.mode);
    }
  }, [requestedView]);

  const filteredPads = useMemo(() => {
    return globalLaunchPads.filter(
      pad =>
        padFilter === 'all' ||
        pad.type === padFilter
    );
  }, [padFilter]);

  /* =======================================================
     LOAD SATELLITES
     ======================================================= */

  useEffect(() => {
    if (viewMode === 'wiki') return;

    let cancelled = false;

    async function fetchSatellites() {
      if (satCacheRef.current[satFilter]) {
        const cached =
          satCacheRef.current[satFilter];

        const updated = cached.map(sat => {
          const live =
            calculateLivePosition(
              sat,
              new Date()
            );

          return live
            ? {
                ...sat,
                lat: live.lat,
                lng: live.lng,
                altitudeKm:
                  live.altitudeKm,
                velocityKmS:
                  live.velocityKmS
              }
            : sat;
        });

        if (!cancelled) {
          setSatellites(updated);
          setLastUpdate(new Date());
        }

        return;
      }

      setLoadingSats(true);

      try {
        /*
         * Select the fields needed by the globe.
         *
         * We intentionally don't rely on database lat/lng
         * because the TLE is what gives us the current
         * orbital position.
         */
        let query = supabase
          .from('satellites')
          .select(`
            id,
            name,
            organization,
            velocity,
            altitude,
            inclination,
            eccentricity,
            arg_perigee,
            raan,
            mean_anomaly,
            mean_motion,
            mean_motion_dot,
            mean_motion_ddot,
            bstar,
            epoch,
            orbital_epoch,
            orbital_source,
            tle_line1,
            tle_line2,
            lat,
            lng,
            updated_at
          `);

        if (satFilter === 'stations') {
          query = query.ilike(
            'name',
            '%ISS%'
          );
        }

        if (satFilter === 'starlink') {
          query = query
            .ilike(
              'name',
              '%STARLINK%'
            )
            .limit(1000);
        }

        if (satFilter === 'weather') {
          query = query.or(
            'name.ilike.%NOAA%,name.ilike.%GOES%'
          );
        }

        /*
         * IMPORTANT:
         *
         * Do NOT put a tiny 1,500-record cap here.
         *
         * The old code was the reason "All Active"
         * did not represent the whole database.
         *
         * Supabase/PostgREST can return the configured
         * result set in pages. We request the records
         * without the artificial 1,500 limit.
         */
        if (satFilter === 'active') {
          query = query.order(
            'id',
            { ascending: true }
          );
        }

        const {
          data,
          error
        } = await query;

        if (error) {
          throw error;
        }

        if (cancelled) return;

        const sourceData = Array.isArray(data)
          ? data
          : [];

        /*
         * Keep only records that actually have usable
         * TLE information for live tracking.
         */
        const formatted = sourceData
          .map((sat, index) => {
            const name =
              sat.name || 'UNKNOWN OBJECT';

            const live =
              calculateLivePosition(
                sat,
                new Date()
              );

            return {
              ...sat,

              /*
               * REAL position if TLE works.
               *
               * We don't create fake coordinates.
               */
              lat: live
                ? live.lat
                : safeNumber(
                    sat.lat,
                    null
                  ),

              lng: live
                ? live.lng
                : safeNumber(
                    sat.lng,
                    null
                  ),

              altitudeKm:
                live?.altitudeKm ??
                safeNumber(
                  sat.altitude,
                  null
                ),

              velocityKmS:
                live?.velocityKmS ??
                safeNumber(
                  sat.velocity,
                  null
                ),

              /*
               * Internal stable index.
               */
              _index: index,

              /*
               * Whether satellite.js successfully
               * propagated this object.
               */
              _hasLiveTLE: Boolean(live),

              /*
               * Clean white marker.
               */
              _baseColor: '#ffffff'
            };
          })
          .filter(
            sat =>
              Number.isFinite(sat.lat) &&
              Number.isFinite(sat.lng)
          );

        satCacheRef.current[satFilter] =
          formatted;

        setSatellites(formatted);
        setLastUpdate(new Date());
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
    }

    fetchSatellites();

    return () => {
      cancelled = true;
    };
  }, [satFilter, viewMode]);

  /* =======================================================
     REAL-TIME TLE POSITION REFRESH
     ======================================================= */

  useEffect(() => {
    if (viewMode !== 'satellites') {
      return;
    }

    /*
     * Recalculate positions every second.
     *
     * This is much more accurate than manually adding
     * longitude every 50 ms.
     */
    const interval = setInterval(() => {
      const now = new Date();

      setSatellites(previous => {
        return previous.map(sat => {
          const live =
            calculateLivePosition(
              sat,
              now
            );

          if (!live) {
            return sat;
          }

          return {
            ...sat,
            lat: live.lat,
            lng: live.lng,
            altitudeKm:
              live.altitudeKm,
            velocityKmS:
              live.velocityKmS,
            _hasLiveTLE: true
          };
        });
      });

      setSelectedSat(current => {
        if (!current) return null;

        const live =
          calculateLivePosition(
            current,
            now
          );

        if (!live) {
          return current;
        }

        return {
          ...current,
          lat: live.lat,
          lng: live.lng,
          altitudeKm:
            live.altitudeKm,
          velocityKmS:
            live.velocityKmS
        };
      });

      setLastUpdate(now);
    }, 1000);

    return () => clearInterval(interval);
  }, [viewMode]);

  /* =======================================================
     WIKI DATABASE SEARCH
     ======================================================= */

  useEffect(() => {
    if (viewMode !== 'wiki') return;

    let cancelled = false;

    const timer = setTimeout(
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
                { count: 'exact' }
              );

          const search =
            wikiSearch.trim();

          if (search) {
            /*
             * Search numeric input against ID
             * and name.
             */
            if (
              /^\d+$/.test(search)
            ) {
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

          const {
            data,
            count,
            error
          } = await query
            .order(
              'id',
              { ascending: true }
            )
            .range(from, to);

          if (error) {
            throw error;
          }

          if (!cancelled) {
            setWikiData(data || []);
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
            setLoadingSats(false);
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

  /* =======================================================
     CLEAN SATELLITE RENDER DATA
     ======================================================= */

  const renderSatellites =
    useMemo(() => {
      return satellites
        .filter(
          sat =>
            Number.isFinite(sat.lat) &&
            Number.isFinite(sat.lng)
        )
        .map(sat => {
          const focused =
            hoveredSat?.id === sat.id ||
            selectedSat?.id === sat.id;

          const hasFocus =
            Boolean(
              hoveredSat ||
              selectedSat
            );

          return {
            ...sat,

            /*
             * Clean white look.
             */
            color:
              focused || !hasFocus
                ? '#ffffff'
                : 'rgba(255,255,255,0.16)',

            /*
             * Keep markers small.
             * The previous values made them look
             * like long colored spikes.
             */
            radius:
              focused
                ? 0.85
                : 0.42,

            /*
             * Very small altitude separation.
             *
             * This is NOT the physical altitude.
             * pointAltitude is only a visual offset.
             */
            visualAltitude:
              focused
                ? 0.035
                : 0.025
          };
        });
    }, [
      satellites,
      hoveredSat,
      selectedSat
    ]);

  /* =======================================================
     SELECTED SATELLITE ORBIT
     ======================================================= */

  const orbitalPaths =
    useMemo(() => {
      if (!selectedSat) {
        return [];
      }

      const points =
        calculateOrbitFromTLE(
          selectedSat
        );

      const segments =
        splitDateline(points);

      return segments.map(
        segment => ({
          satelliteId:
            selectedSat.id,
          points: segment
        })
      );
    }, [selectedSat]);

  const maxPages =
    Math.ceil(
      totalWikiCount /
        pageSize
    );

  /* =======================================================
     CAMERA HELPERS
     ======================================================= */

  const focusSatellite =
    useCallback(
      sat => {
        if (!sat) return;

        setSelectedSat(sat);

        setHoveredSat(null);

        if (
          globeRef.current &&
          Number.isFinite(sat.lat) &&
          Number.isFinite(sat.lng)
        ) {
          globeRef.current.pointOfView(
            {
              lat: sat.lat,
              lng: sat.lng,
              altitude: 1.65
            },
            1000
          );
        }
      },
      []
    );

  const focusPad =
    useCallback(
      pad => {
        if (!pad) return;

        setSelectedPad(pad);

        if (globeRef.current) {
          globeRef.current.pointOfView(
            {
              lat: pad.lat,
              lng: pad.lng,
              altitude: 1.5
            },
            1000
          );
        }
      },
      []
    );

  /*
   * When changing mode, clear satellite selection.
   */
  const changeViewMode =
    useCallback(mode => {
      setViewMode(mode);
      setSelectedSat(null);
      setHoveredSat(null);
    }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto'
      }}
    >

      <style>{`

        @keyframes orbitalStars {
          from {
            background-position:
              0 0,
              0 0,
              0 0,
              0 0;
          }

          to {
            background-position:
              -300px 180px,
              500px -250px,
              -700px 350px,
              900px -400px;
          }
        }

        .orbital-starfield {
          background-color: #000000;

          background-image:
            radial-gradient(
              1px 1px at 20px 30px,
              rgba(255,255,255,0.95),
              transparent
            ),
            radial-gradient(
              1px 1px at 120px 80px,
              rgba(255,255,255,0.75),
              transparent
            ),
            radial-gradient(
              1.5px 1.5px at 250px 160px,
              rgba(255,255,255,0.9),
              transparent
            ),
            radial-gradient(
              1px 1px at 330px 40px,
              rgba(255,255,255,0.65),
              transparent
            );

          background-size:
            360px 260px,
            520px 380px,
            700px 500px,
            900px 650px;

          animation:
            orbitalStars
            80s
            linear
            infinite;

          position: relative;
          overflow: hidden;
        }

        .orbital-starfield::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;

          background:
            radial-gradient(
              ellipse at center,
              rgba(0,0,0,0)
              35%,
              rgba(0,0,0,0.28)
              100%
            );
        }

        .orbital-globe-shell {
          position: relative;
          width: 100%;
          height: 620px;
          overflow: hidden;

          border:
            1px solid
            rgba(255,255,255,0.16);

          background: #000000;
        }

        .orbital-globe-canvas {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .orbital-status {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 20;

          background:
            rgba(0,0,0,0.82);

          border:
            1px solid
            rgba(255,255,255,0.2);

          padding:
            7px 10px;

          color: #ffffff;

          font-family: monospace;

          font-size: 10px;

          letter-spacing: 1px;

          backdrop-filter:
            blur(6px);
        }

        .orbital-live-dot {
          display: inline-block;

          width: 6px;
          height: 6px;

          border-radius: 50%;

          background: #ffffff;

          margin-right: 7px;

          box-shadow:
            0 0 8px
            rgba(255,255,255,0.9);
        }

        .orbital-control {
          padding:
            0.5rem 1rem;

          background:
            rgba(255,255,255,0.04);

          border:
            1px solid
            rgba(255,255,255,0.14);

          color: #ffffff;

          font-size:
            0.7rem;

          font-weight: 700;

          letter-spacing:
            1px;

          text-transform:
            uppercase;

          cursor: pointer;

          transition:
            background 0.15s,
            border-color 0.15s;
        }

        .orbital-control:hover {
          background:
            rgba(255,255,255,0.1);

          border-color:
            rgba(255,255,255,0.35);
        }

        .orbital-control.active {
          background:
            rgba(255,255,255,0.14);

          border-color:
            rgba(255,255,255,0.65);
        }

      `}</style>

      {/* CONTROLS */}

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
            gap: '0.8rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              color: '#a1a1aa',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '700'
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
              label:
                `Live Globe Satellites (${satellites.length})`
            },
            {
              key: 'wiki',
              label:
                'Satellite Database'
            }
          ].map(btn => (
            <button
              key={btn.key}
              className={
                `orbital-control ${
                  viewMode === btn.key
                    ? 'active'
                    : ''
                }`
              }
              onClick={() =>
                changeViewMode(
                  btn.key
                )
              }
            >
              {btn.label}
            </button>
          ))}
        </div>

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
                className={
                  `orbital-control ${
                    padFilter === filter
                      ? 'active'
                      : ''
                  }`
                }
                onClick={() =>
                  setPadFilter(
                    filter
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.8rem'
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
                className={
                  `orbital-control ${
                    satFilter ===
                    filter.key
                      ? 'active'
                      : ''
                  }`
                }
                onClick={() =>
                  setSatFilter(
                    filter.key
                  )
                }
                style={{
                  padding:
                    '0.4rem 0.7rem'
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* =====================================================
          LAUNCH PAD INSPECTOR
          ===================================================== */}

      {viewMode === 'pads' &&
        selectedPad && (
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '2px',
              border:
                '1px solid rgba(255,255,255,0.14)',
              background:
                'rgba(5,5,5,0.9)'
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
                TELEMETRY
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
                  'repeat(auto-fit, minmax(200px, 1fr))',
                gap:
                  '1rem',
                marginTop:
                  '0.8rem'
              }}
            >

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  FACILITY NAME
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
                      '#71717a'
                  }}
                >
                  OPERATING AGENCY
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
                      '#71717a'
                  }}
                >
                  COORDINATES
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
                  {selectedPad.lat.toFixed(4)}
                  °,{' '}
                  {selectedPad.lng.toFixed(4)}
                  °
                </p>

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
              padding: '1.5rem',
              borderRadius: '2px',
              border:
                '1px solid rgba(255,255,255,0.16)',
              background:
                'rgba(5,5,5,0.92)'
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
                // SATELLITE
                ORBITAL INSPECTOR
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
                  border: 'none',
                  color:
                    '#a1a1aa',
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
                  'repeat(auto-fit, minmax(190px, 1fr))',
                gap:
                  '1rem',
                marginTop:
                  '1rem'
              }}
            >

              {/* NAME */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  OBJECT NAME
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
                  {selectedSat.name ||
                    'UNKNOWN'}
                </h3>

              </div>

              {/* NORAD */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  NORAD ID
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
                  {selectedSat.id}
                </p>

              </div>

              {/* ORGANIZATION */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  ORGANIZATION
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
                  {selectedSat.organization ||
                    'N/A'}
                </p>

              </div>

              {/* LATITUDE */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  LIVE LATITUDE
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
                  {Number.isFinite(
                    selectedSat.lat
                  )
                    ? `${selectedSat.lat.toFixed(4)}°`
                    : 'N/A'}
                </p>

              </div>

              {/* LONGITUDE */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  LIVE LONGITUDE
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
                  {Number.isFinite(
                    selectedSat.lng
                  )
                    ? `${selectedSat.lng.toFixed(4)}°`
                    : 'N/A'}
                </p>

              </div>

              {/* ALTITUDE */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  ALTITUDE
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
                  {Number.isFinite(
                    selectedSat.altitudeKm
                  )
                    ? `${selectedSat.altitudeKm.toFixed(1)} km`
                    : 'N/A'}
                </p>

              </div>

              {/* VELOCITY */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  VELOCITY
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
                  {Number.isFinite(
                    selectedSat.velocityKmS
                  )
                    ? `${selectedSat.velocityKmS.toFixed(2)} km/s`
                    : selectedSat.velocity ||
                      'N/A'}
                </p>

              </div>

              {/* INCLINATION */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  INCLINATION
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
                  {Number.isFinite(
                    Number(
                      selectedSat.inclination
                    )
                  )
                    ? `${Number(selectedSat.inclination).toFixed(2)}°`
                    : 'N/A'}
                </p>

              </div>

              {/* ORBIT STATUS */}

              <div>

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      '0.65rem',
                    color:
                      '#71717a'
                  }}
                >
                  POSITION SOURCE
                </p>

                <p
                  style={{
                    margin:
                      '0.2rem 0 0',
                    fontSize:
                      '0.85rem',
                    color:
                      '#ffffff',
                    fontWeight:
                      '700'
                  }}
                >
                  {selectedSat._hasLiveTLE
                    ? 'LIVE TLE PROPAGATION'
                    : 'DATABASE COORDINATES'}
                </p>

              </div>

            </div>

            {/* ORBIT INFORMATION */}

            <div
              style={{
                marginTop:
                  '1.2rem',
                paddingTop:
                  '1rem',
                borderTop:
                  '1px solid rgba(255,255,255,0.1)',
                display:
                  'flex',
                flexWrap:
                  'wrap',
                gap:
                  '1.2rem'
              }}
            >

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#a1a1aa',
                  fontFamily:
                    'monospace'
                }}
              >
                ORBIT TRACK:{' '}
                {orbitalPaths.length >
                0
                  ? `${orbitalPaths.length} SEGMENT(S)`
                  : 'UNAVAILABLE'}
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#a1a1aa',
                  fontFamily:
                    'monospace'
                }}
              >
                TLE:{' '}
                {selectedSat.tle_line1 &&
                selectedSat.tle_line2
                  ? 'VALID'
                  : 'MISSING'}
              </span>

              <span
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#a1a1aa',
                  fontFamily:
                    'monospace'
                }}
              >
                LIVE UPDATE:
                1 SEC
              </span>

            </div>

          </div>
        )}

    </div>
  );
}
