'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  eciToGeodetic,
  gstime,
  propagate,
  ecfToLookAngles,
  degreesLat,
  degreesLong,
} from 'satellite.js';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
  loading: () => (
    <div className="iss-loading">
      <span>INITIALIZING ORBITAL VISUALIZATION...</span>
    </div>
  ),
});

const EARTH_RADIUS_KM = 6378.137;
const MIN_PASS_ELEVATION_DEG = 10;
const SAMPLE_SECONDS = 30;
const ORBIT_MINUTES = 96;

function fmt(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return '--';
  return Number(value).toFixed(digits);
}

function projectToPercent(lat, lon) {
  return {
    x: ((lon + 180) / 360) * 100,
    y: ((90 - lat) / 180) * 100,
  };
}

function latLngLabel(lat, lon) {
  if (lat == null || lon == null) return '--';

  return `${Math.abs(lat).toFixed(2)}° ${
    lat >= 0 ? 'N' : 'S'
  }  /  ${Math.abs(lon).toFixed(2)}° ${
    lon >= 0 ? 'E' : 'W'
  }`;
}

function calculateState(satrec, date) {
  const pv = propagate(satrec, date);

  if (!pv.position) return null;

  const gmst = gstime(date);
  const geo = eciToGeodetic(pv.position, gmst);

  const lat = degreesLat(geo.latitude);
  const lon = degreesLong(geo.longitude);
  const altitude = geo.height;

  let velocity = null;

  if (pv.velocity) {
    velocity =
      Math.sqrt(
        pv.velocity.x ** 2 +
          pv.velocity.y ** 2 +
          pv.velocity.z ** 2
      ) * 3600;
  }

  return {
    lat,
    lon,
    altitude,
    velocity,
    date,
  };
}

function calculateOrbit(satrec, centerDate) {
  const points = [];

  const start = new Date(
    centerDate.getTime() -
      (ORBIT_MINUTES / 2) * 60000
  );

  for (
    let i = 0;
    i <= (ORBIT_MINUTES * 60) / SAMPLE_SECONDS;
    i++
  ) {
    const date = new Date(
      start.getTime() +
        i * SAMPLE_SECONDS * 1000
    );

    const state = calculateState(satrec, date);

    if (!state) continue;

    const previous =
      points[points.length - 1];

    if (
      previous &&
      Math.abs(state.lon - previous[1]) > 180
    ) {
      points.push([null, null, null]);
    }

    points.push([
      state.lat,
      state.lon,
      Math.max(0.1, state.altitude),
    ]);
  }

  return points;
}

function eciToEcf(position, gmst) {
  const cos = Math.cos(gmst);
  const sin = Math.sin(gmst);

  return {
    x: position.x * cos + position.y * sin,
    y: -position.x * sin + position.y * cos,
    z: position.z,
  };
}

function getPass(satrec, lat, lon, now) {
  if (lat == null || lon == null) return null;

  const observerGd = {
    latitude: (lat * Math.PI) / 180,
    longitude: (lon * Math.PI) / 180,
    height: 0,
  };

  const horizonMs = 12 * 60 * 60 * 1000;

  let previous = null;
  let rise = null;

  for (
    let offset = 0;
    offset <= horizonMs;
    offset += 60 * 1000
  ) {
    const date = new Date(
      now.getTime() + offset
    );

    const pv = propagate(satrec, date);

    if (!pv.position) continue;

    const satEcf = eciToEcf(
      pv.position,
      gstime(date)
    );

    const look = ecfToLookAngles(
      observerGd,
      satEcf
    );

    const elevation =
      (look.elevation * 180) / Math.PI;

    if (
      elevation >= MIN_PASS_ELEVATION_DEG &&
      !rise
    ) {
      rise = date;
      previous = {
        date,
        elevation,
      };

      continue;
    }

    if (
      rise &&
      elevation < MIN_PASS_ELEVATION_DEG
    ) {
      return {
        rise,
        peakApprox:
          previous?.date || rise,
        set: date,
        durationMinutes: Math.max(
          1,
          Math.round(
            (date - rise) / 60000
          )
        ),
      };
    }

    if (
      rise &&
      (!previous ||
        elevation > previous.elevation)
    ) {
      previous = {
        date,
        elevation,
      };
    }
  }

  return null;
}

export default function ISSTrackerPage() {
  const globeRef = useRef(null);

  const [satrec, setSatrec] = useState(null);
  const [state, setState] = useState(null);
  const [orbit, setOrbit] = useState([]);
  const [status, setStatus] =
    useState('ACQUIRING');

  const [lastUpdate, setLastUpdate] =
    useState(null);

  const [follow, setFollow] =
    useState(false);

  const [showOrbit, setShowOrbit] =
    useState(true);

  const [view, setView] = useState('3d');

  const [globeReady, setGlobeReady] =
    useState(false);

  const [observer, setObserver] =
    useState(null);

  const [nextPass, setNextPass] =
    useState(null);

  const [passLoading, setPassLoading] =
    useState(false);

  const acquire = useCallback(async () => {
    try {
      setStatus('ACQUIRING');

      const res = await fetch(
        '/api/iss-tle',
        {
          cache: 'no-store',
        }
      );

      if (!res.ok) {
        throw new Error(
          'ISS orbital feed unavailable'
        );
      }

      const data = await res.json();

      const {
        twoline2satrec,
      } = await import(
        'satellite.js'
      );

      const nextSatrec =
        twoline2satrec(
          data.line1,
          data.line2
        );

      setSatrec(nextSatrec);
      setStatus('LIVE');
    } catch (error) {
      console.error(error);
      setStatus('DELAYED');
    }
  }, []);

  useEffect(() => {
    acquire();

    const refresh = setInterval(
      acquire,
      2 * 60 * 60 * 1000
    );

    return () =>
      clearInterval(refresh);
  }, [acquire]);

  useEffect(() => {
    if (!satrec) return;

    setOrbit(
      calculateOrbit(
        satrec,
        new Date()
      )
    );
  }, [satrec]);

  useEffect(() => {
    if (!satrec) return;

    const update = () => {
      const now = new Date();

      const next =
        calculateState(
          satrec,
          now
        );

      if (!next) {
        setStatus('DELAYED');
        return;
      }

      setState(next);
      setLastUpdate(now);
      setStatus('LIVE');
    };

    update();

    const timer = setInterval(
      update,
      1000
    );

    return () =>
      clearInterval(timer);
  }, [satrec]);

  /*
   * Safely move the camera. Guards against
   * calling into react-globe.gl before its
   * internal scene/controls exist yet -
   * previously an uncaught error here (e.g.
   * globe.controls() briefly undefined) could
   * abort the click handler before setFollow(true)
   * ever ran, which is why FOLLOW ISS looked dead.
   */
  const moveCamera = useCallback(
    (lat, lng, altitude, duration = 1000) => {
      const globe = globeRef.current;

      if (
        !globe ||
        lat == null ||
        lng == null
      ) {
        return;
      }

      try {
        const controls =
          globe.controls?.();

        if (controls) {
          controls.autoRotate = false;
        }

        globe.pointOfView(
          {
            lat: Number(lat),
            lng: Number(lng),
            altitude,
          },
          duration
        );
      } catch (error) {
        // Scene not fully ready yet - retry
        // on the next frame instead of failing
        // silently.
        requestAnimationFrame(() =>
          moveCamera(
            lat,
            lng,
            altitude,
            duration
          )
        );
      }
    },
    []
  );

  /*
   * FOLLOW CAMERA
   *
   * The camera is updated every time the
   * live ISS coordinates change, and also
   * immediately when FOLLOW is switched on
   * (since `follow` itself is a dependency).
   * The ISS telemetry changes every second,
   * so FOLLOW ISS continuously keeps the
   * camera centered on the ISS.
   */
  useEffect(() => {
    if (!follow || !state || view !== '3d') {
      return;
    }

    moveCamera(
      state.lat,
      state.lon,
      0.75,
      700
    );
  }, [follow, state, view, moveCamera]);

  useEffect(() => {
    if (view !== '3d') {
      setFollow(false);
    }
  }, [view]);

  useEffect(() => {
    if (
      !satrec ||
      !observer
    ) {
      return;
    }

    setPassLoading(true);

    const timer = setTimeout(() => {
      setNextPass(
        getPass(
          satrec,
          observer.lat,
          observer.lon,
          new Date()
        )
      );

      setPassLoading(false);
    }, 50);

    return () =>
      clearTimeout(timer);
  }, [
    satrec,
    observer,
  ]);

  const requestLocation = () => {
    if (!navigator.geolocation)
      return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setObserver({
          lat:
            position.coords.latitude,
          lon:
            position.coords.longitude,
        });
      },
      () => {
        setObserver(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
      }
    );
  };

  /*
   * Return to the original globe view.
   */
  const resetView = () => {
    setFollow(false);

    if (!globeRef.current) {
      return;
    }

    moveCamera(15, 70, 2.3, 1200);
  };

  const orbitSegments = useMemo(() => {
    const segments = [];
    let current = [];

    orbit.forEach((p) => {
      if (p[0] == null) {
        if (current.length > 1) {
          segments.push(current);
        }

        current = [];
      } else {
        current.push({
          lat: p[0],
          lng: p[1],
          altitude: Math.max(
            0.01,
            p[2] / EARTH_RADIUS_KM
          ),
        });
      }
    });

    if (current.length > 1) {
      segments.push(current);
    }

    return segments;
  }, [orbit]);

  const pathData = useMemo(() => {
    return orbitSegments.map(
      (segment, index) => ({
        id: index,
        points: segment,
      })
    );
  }, [orbitSegments]);

  const map2DTracks = useMemo(() => {
    return orbitSegments.map(
      (segment) =>
        segment
          .map((p) =>
            projectToPercent(p.lat, p.lng)
          )
          .map((p) => `${p.x},${p.y}`)
          .join(' ')
    );
  }, [orbitSegments]);

  const issMapPos = useMemo(() => {
    if (!state) return null;
    return projectToPercent(
      state.lat,
      state.lon
    );
  }, [state]);

  const formatTime = (date) =>
    date
      ? date.toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }
        )
      : '--:--:--';

  const formatPassTime = (date) =>
    date
      ? date.toLocaleTimeString(
          [],
          {
            hour: '2-digit',
            minute: '2-digit',
          }
        )
      : '--:--';

  return (
    <main className="iss-page">
      <div className="iss-stars" />

      <header className="iss-header">
        <button
          type="button"
          className="iss-brand"
          onClick={() => {
            window.location.href =
              '/';
          }}
        >
          SPACETEC
          <span>//</span>
          ISS
        </button>

        <div className="iss-header-status">
          <span
            className={`status-dot ${status.toLowerCase()}`}
          />

          {status === 'LIVE'
            ? 'LIVE ORBITAL TELEMETRY'
            : status === 'ACQUIRING'
            ? 'ACQUIRING ORBITAL DATA'
            : 'DATA DELAYED'}
        </div>

        <button
          type="button"
          className="iss-back"
          onClick={() => {
            window.location.href =
              '/';
          }}
        >
          ← SPACE TEC
        </button>
      </header>

      <section className="iss-layout">
        <div className="iss-visual">
          <div className="visual-label top-left">
            <span>
              ORBITAL VISUALIZATION
            </span>

            <b>
              NORAD 25544
            </b>
          </div>

          <button
            type="button"
            className="view-toggle"
            onClick={() =>
              setView((v) =>
                v === '3d' ? '2d' : '3d'
              )
            }
          >
            SWITCH TO {view === '3d' ? '2D' : '3D'}
          </button>

          {view === '3d' && (
          <div className="globe-shell">
            <ReactGlobe
              ref={globeRef}
              width={
                typeof window !==
                'undefined'
                  ? window.innerWidth
                  : 900
              }
              height={
                typeof window !==
                'undefined'
                  ? Math.max(
                      500,
                      window.innerHeight -
                        110
                    )
                  : 700
              }
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
              showAtmosphere
              atmosphereColor="#3b82f6"
              atmosphereAltitude={0.13}
              pointsData={
                state
                  ? [state]
                  : []
              }
              pointLat="lat"
              pointLng="lon"
              pointAltitude={() =>
                0.045
              }
              pointRadius={() =>
                0.55
              }
              pointColor={() =>
                '#ff3b30'
              }
              pointResolution={16}
              pointLabel={() =>
                '<b>ISS // NORAD 25544</b>'
              }
              ringsData={
                state
                  ? [state]
                  : []
              }
              ringLat="lat"
              ringLng="lon"
              ringAltitude={0.045}
              ringColor={() => (t) =>
                `rgba(255, 59, 48, ${1 - t})`
              }
              ringMaxRadius={4.5}
              ringPropagationSpeed={2.5}
              ringRepeatPeriod={900}
              pathsData={
                showOrbit
                  ? pathData
                  : []
              }
              pathPoints="points"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt="altitude"
              pathColor={() =>
                '#3b82f6'
              }
              pathStroke={1.2}
              pathDashLength={0.015}
              pathDashGap={0.008}
              pathDashAnimateTime={2600}
              onGlobeReady={() => {
                setGlobeReady(true);
                moveCamera(15, 70, 2.3, 0);
              }}
            />
          </div>
          )}

          {view === '2d' && (
            <div className="map-2d">
              <svg
                className="map-2d-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {showOrbit &&
                  map2DTracks.map(
                    (points, i) => (
                      <polyline
                        key={i}
                        points={points}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="0.3"
                        strokeDasharray="0.8,0.6"
                        vectorEffect="non-scaling-stroke"
                      />
                    )
                  )}

                {issMapPos && (
                  <>
                    <circle
                      className="map-iss-pulse"
                      cx={issMapPos.x}
                      cy={issMapPos.y}
                      r="1.4"
                    />
                    <circle
                      cx={issMapPos.x}
                      cy={issMapPos.y}
                      r="0.9"
                      fill="#ff3b30"
                      stroke="#fff"
                      strokeWidth="0.15"
                    />
                  </>
                )}
              </svg>

              {issMapPos && (
                <div
                  className="map-iss-label"
                  style={{
                    left: `${issMapPos.x}%`,
                    top: `${issMapPos.y}%`,
                  }}
                >
                  ISS
                </div>
              )}
            </div>
          )}

          <div className="visual-label bottom-left">
            <span>
              GROUND TRACK
            </span>

            <b>
              {state
                ? latLngLabel(
                    state.lat,
                    state.lon
                  )
                : 'CALCULATING...'}
            </b>
          </div>
        </div>

        <aside className="iss-panel">
          <div className="panel-kicker">
            // INTERNATIONAL SPACE
            STATION
          </div>

          <h1>ISS</h1>

          <div className="live-badge">
            <span
              className={`status-dot ${status.toLowerCase()}`}
            />

            {status === 'LIVE'
              ? 'LIVE'
              : status}
          </div>

          <div className="telemetry-grid">
            <div>
              <span>
                ALTITUDE
              </span>

              <strong>
                {state
                  ? `${fmt(
                      state.altitude,
                      1
                    )} KM`
                  : '--'}
              </strong>
            </div>

            <div>
              <span>
                VELOCITY
              </span>

              <strong>
                {state
                  ? `${fmt(
                      state.velocity,
                      0
                    )} KM/H`
                  : '--'}
              </strong>
            </div>

            <div>
              <span>
                LATITUDE
              </span>

              <strong>
                {state
                  ? `${fmt(
                      state.lat,
                      3
                    )}°`
                  : '--'}
              </strong>
            </div>

            <div>
              <span>
                LONGITUDE
              </span>

              <strong>
                {state
                  ? `${fmt(
                      state.lon,
                      3
                    )}°`
                  : '--'}
              </strong>
            </div>
          </div>

          <div className="panel-block">
            <span className="block-label">
              CURRENT SUBPOINT
            </span>

            <div className="big-readout">
              {state
                ? latLngLabel(
                    state.lat,
                    state.lon
                  )
                : 'ACQUIRING...'}
            </div>
          </div>

          <div className="panel-block">
            <span className="block-label">
              ORBITAL STATUS
            </span>

            <div className="status-line">
              <i />
              {status === 'LIVE'
                ? 'NOMINAL / TRACKING'
                : 'TELEMETRY UNAVAILABLE'}
            </div>

            <small>
              Last update:{' '}
              {formatTime(
                lastUpdate
              )}
            </small>
          </div>

          <div className="controls">
            <button
              type="button"
              className={
                showOrbit
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setShowOrbit(
                  (v) => !v
                )
              }
            >
              ORBIT
            </button>

            <button
              type="button"
              disabled={
                view !== '3d' ||
                !state ||
                !globeReady
              }
              className={
                follow
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setFollow((was) => !was);
              }}
            >
              FOLLOW ISS
            </button>

            <button
              type="button"
              disabled={
                view !== '3d' || !globeReady
              }
              onClick={resetView}
            >
              RESET VIEW
            </button>
          </div>
          <div className="panel-block pass-block">
            <span className="block-label">
              NEXT VISIBLE PASS
            </span>

            {!observer ? (
              <>
                <p>
                  Use your location to calculate
                  the next approximate ISS pass
                  above a 10° elevation mask.
                </p>

                <button
                  type="button"
                  className="location-button"
                  onClick={requestLocation}
                >
                  USE MY LOCATION
                </button>
              </>
            ) : passLoading ? (
              <div className="pass-value">
                CALCULATING PASS...
              </div>
            ) : nextPass ? (
              <div className="pass-grid">
                <div>
                  <span>START</span>
                  <b>
                    {formatPassTime(
                      nextPass.rise
                    )}
                  </b>
                </div>

                <div>
                  <span>PEAK*</span>
                  <b>
                    {formatPassTime(
                      nextPass.peakApprox
                    )}
                  </b>
                </div>

                <div>
                  <span>END</span>
                  <b>
                    {formatPassTime(
                      nextPass.set
                    )}
                  </b>
                </div>

                <div>
                  <span>DURATION</span>
                  <b>
                    {nextPass.durationMinutes} MIN
                  </b>
                </div>
              </div>
            ) : (
              <p>
                No pass above 10° found in the
                next 12 hours.
              </p>
            )}

            <small>
              *Peak is an approximate pass maximum
              from the 1-minute search step.
            </small>
          </div>

          <div className="tle-box">
            <span>
              TRACKING OBJECT
            </span>

            <strong>
              ISS (ZARYA)
            </strong>

            <small>
              NORAD 25544 · TLE REFRESHED EVERY 2 HOURS
            </small>
          </div>
        </aside>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #000000;
          color: #fff;
          overflow: hidden;
        }

        body {
          font-family:
            'Space Grotesk',
            sans-serif;
        }

        .iss-page {
          height: 100vh;
          width: 100%;
          background: #000000;
          overflow: hidden;
        }

        .iss-stars {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.3;
          z-index: 0;

          background-image:
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.8) 0 1px,
              transparent 1.2px
            ),
            radial-gradient(
              circle,
              rgba(255, 255, 255, 0.5) 0 1px,
              transparent 1.2px
            );

          background-size:
            97px 97px,
            157px 157px;

          background-position:
            10px 20px,
            50px 70px;
        }

        /* TRUE BLACK HEADER */
        .iss-header {
          height: 68px;
          padding: 0 30px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          position: relative;
          z-index: 10;

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08);

          background: #000000;
        }

        .iss-brand,
        .iss-back {
          border: 0;
          background: transparent;
          cursor: pointer;
        }

        .iss-brand {
          color: #fff;

          font:
            800 1.25rem/1
            'Space Grotesk',
            sans-serif;

          letter-spacing: 3px;
        }

        .iss-brand span {
          color: #64748b;
          margin: 0 8px;
        }

        .iss-back {
          color: #64748b;

          font:
            600 0.62rem/1
            monospace;

          letter-spacing: 1.5px;
        }

        .iss-back:hover {
          color: #fff;
        }

        .iss-header-status {
          color: #64748b;

          font:
            600 0.58rem/1
            monospace;

          letter-spacing: 2px;
        }

        .status-dot {
          display: inline-block;

          width: 7px;
          height: 7px;

          border-radius: 50%;
          margin-right: 7px;

          background: #64748b;
        }

        .status-dot.live {
          background: #22c55e;
          box-shadow:
            0 0 8px
            rgba(34, 197, 94, 0.7);
        }

        .status-dot.delayed {
          background: #eab308;
          box-shadow:
            0 0 8px
            rgba(234, 179, 8, 0.6);
        }

        .status-dot.acquiring {
          background: #3b82f6;
          box-shadow:
            0 0 8px
            rgba(59, 130, 246, 0.6);
        }

        .iss-layout {
          height:
            calc(100vh - 68px);

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            360px;

          position: relative;
          z-index: 2;
        }

        .iss-visual {
          position: relative;
          height:
            calc(100vh - 68px);

          min-height: 0;
          overflow: hidden;

          background: #000000;
        }

        .globe-shell {
          position: absolute;
          inset: 0;
        }

        .globe-shell > div {
          width: 100% !important;
          height: 100% !important;
        }

        .visual-label {
          position: absolute;
          z-index: 5;

          display: flex;
          flex-direction: column;
          gap: 5px;

          pointer-events: none;

          color: #64748b;

          font:
            600 0.58rem/1.4
            monospace;

          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .visual-label b {
          color: #cbd5e1;
          font-weight: 600;
        }

        .top-left {
          top: 24px;
          left: 32px;
        }

        .bottom-left {
          bottom: 25px;
          left: 32px;
        }

        .view-toggle {
          position: absolute;
          top: 24px;
          right: 32px;
          z-index: 6;

          min-height: 36px;
          padding: 0 14px;

          border: 1px solid
            rgba(255, 255, 255, 0.16);

          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);

          color: #e2e8f0;
          cursor: pointer;

          font: 700 0.6rem/1 monospace;
          letter-spacing: 1.5px;

          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .view-toggle:hover {
          border-color:
            rgba(59, 130, 246, 0.65);
          background: rgba(0, 0, 0, 0.85);
        }

        .map-2d {
          position: absolute;
          inset: 0;

          background-color: #000;
          background-image: url('https://unpkg.com/three-globe/example/img/earth-night.jpg');
          background-size: 100% 100%;
          background-position: center;
        }

        .map-2d-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .map-iss-pulse {
          fill: rgba(255, 59, 48, 0.35);
          animation: map-pulse 1.8s ease-out
            infinite;
          transform-origin: center;
        }

        @keyframes map-pulse {
          0% {
            r: 0.9;
            opacity: 0.9;
          }
          100% {
            r: 3.2;
            opacity: 0;
          }
        }

        .map-iss-label {
          position: absolute;
          transform: translate(8px, -18px);

          color: #ff6b61;

          font: 700 0.6rem/1 monospace;
          letter-spacing: 1px;

          pointer-events: none;

          text-shadow:
            0 0 4px #000,
            0 0 4px #000;
        }

        .controls button:disabled,
        .location-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .controls button:disabled:hover {
          border-color:
            rgba(255, 255, 255, 0.11);
          background: #000000;
        }

        /* TRUE BLACK SIDEBAR */
        .iss-panel {
          height:
            calc(100vh - 68px);

          min-height: 0;

          overflow-y: auto;
          overflow-x: hidden;

          position: relative;
          z-index: 10;

          border-left:
            1px solid
            rgba(255, 255, 255, 0.08);

          background: #000000;

          padding: 34px 28px 45px;

          scrollbar-width: thin;
          scrollbar-color:
            #1e293b
            transparent;
        }

        .iss-panel::-webkit-scrollbar {
          width: 5px;
        }

        .iss-panel::-webkit-scrollbar-track {
          background: transparent;
        }

        .iss-panel::-webkit-scrollbar-thumb {
          background: #1e293b;
        }

        .panel-kicker,
        .block-label {
          color: #64748b;

          font:
            700 0.58rem/1.4
            monospace;

          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .iss-panel h1 {
          margin: 8px 0 8px;

          color: #f8fafc;

          font:
            800 3.35rem/0.9
            'Space Grotesk',
            sans-serif;

          letter-spacing: -2px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;

          border:
            1px solid
            rgba(34, 197, 94, 0.22);

          color: #86efac;

          padding: 6px 9px;

          background: transparent;

          font:
            700 0.55rem/1
            monospace;

          letter-spacing: 2px;
        }

        .telemetry-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;

          margin-top: 30px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.08);

          border-left:
            1px solid
            rgba(255, 255, 255, 0.08);
        }

        /* TRUE BLACK TELEMETRY CARDS */
        .telemetry-grid > div {
          min-width: 0;

          padding: 16px 13px;

          border-right:
            1px solid
            rgba(255, 255, 255, 0.08);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08);

          background: #000000;
        }

        .telemetry-grid span {
          display: block;

          color: #64748b;

          font:
            600 0.55rem/1
            monospace;

          letter-spacing: 1.5px;
        }

        .telemetry-grid strong {
          display: block;

          margin-top: 8px;

          color: #dbe4ef;

          font:
            700 0.86rem/1.2
            monospace;
        }

        .panel-block {
          margin-top: 25px;
          padding-top: 20px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.08);
        }

        .big-readout {
          margin-top: 10px;

          color: #f1f5f9;

          font:
            700 0.8rem/1.3
            monospace;

          letter-spacing: 0.8px;
        }

        .status-line {
          margin-top: 11px;

          color: #cbd5e1;

          font:
            600 0.66rem/1.3
            monospace;

          letter-spacing: 1px;
        }

        .status-line i {
          display: inline-block;

          width: 6px;
          height: 6px;

          margin-right: 8px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 8px #22c55e;
        }

        .panel-block small,
        .tle-box small {
          display: block;

          margin-top: 9px;

          color: #475569;

          font:
            0.55rem/1.5
            monospace;
        }

        .controls {
          display: grid;

          grid-template-columns:
            1fr 1fr 1fr;

          gap: 7px;

          margin-top: 25px;
        }

        .controls button,
        .location-button {
          min-height: 43px;

          border:
            1px solid
            rgba(255, 255, 255, 0.11);

          background: #000000;

          color: #94a3b8;

          cursor: pointer;

          font:
            700 0.52rem/1
            monospace;

          letter-spacing: 1px;

          transition:
            border-color 160ms ease,
            color 160ms ease,
            background 160ms ease;
        }

        .controls button:hover,
        .location-button:hover {
          color: #e2e8f0;

          border-color:
            rgba(255, 255, 255, 0.22);

          background: #080808;
        }

        .controls button.active {
          color: #e2e8f0;

          border-color:
            rgba(59, 130, 246, 0.65);

          background: #050505;

          box-shadow:
            inset 0 0 12px
            rgba(59, 130, 246, 0.05);
        }

        .pass-block p {
          margin: 10px 0 13px;

          color: #64748b;

          font:
            0.62rem/1.6
            monospace;
        }

        .location-button {
          width: 100%;
        }

        .pass-grid {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 8px;

          margin-top: 12px;
        }

        .pass-grid div {
          padding: 11px;

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          background: #000000;
        }

        .pass-grid span {
          display: block;

          color: #475569;

          font:
            0.5rem/1
            monospace;

          letter-spacing: 1px;
        }

        .pass-grid b {
          display: block;

          margin-top: 6px;

          color: #cbd5e1;

          font:
            700 0.67rem/1
            monospace;
        }

        .pass-value {
          margin-top: 12px;

          color: #94a3b8;

          font:
            700 0.62rem/1
            monospace;
        }

        /* TRUE BLACK TLE CARD */
        .tle-box {
          margin-top: 25px;
          padding: 15px;

          border:
            1px solid
            rgba(255, 255, 255, 0.07);

          background: #000000;
        }

        .tle-box span {
          display: block;

          color: #475569;

          font:
            0.52rem/1
            monospace;

          letter-spacing: 2px;
        }

        .tle-box strong {
          display: block;

          margin-top: 7px;

          color: #cbd5e1;

          font:
            700 0.72rem/1
            monospace;
        }

        .iss-loading {
          width: 100%;
          height: 100%;

          display: grid;
          place-items: center;

          background: #000000;

          color: #64748b;

          font:
            0.62rem
            monospace;

          letter-spacing: 2px;
        }

        @media (max-width: 900px) {
          html,
          body {
            overflow: auto;
          }

          .iss-page {
            min-height: 100vh;
            height: auto;
            overflow: visible;
          }

          .iss-layout {
            height: auto;

            grid-template-columns: 1fr;
          }

          .iss-visual {
            height: 58vh;
            min-height: 480px;
          }

          .iss-panel {
            height: auto;
            max-height: none;

            overflow: visible;

            border-left: 0;

            border-top:
              1px solid
              rgba(255, 255, 255, 0.08);
          }
        }

        @media (max-width: 560px) {
          .iss-header {
            height: 62px;
            padding: 0 16px;
          }

          .iss-layout {
            min-height:
              calc(100vh - 62px);
          }

          .iss-header-status {
            display: none;
          }

          .iss-brand {
            font-size: 1rem;
            letter-spacing: 2px;
          }

          .iss-back {
            font-size: 0.55rem;
          }

          .iss-visual {
            min-height: 430px;
            height: 52vh;
          }

          .iss-panel {
            padding:
              26px 18px 40px;
          }

          .iss-panel h1 {
            font-size: 2.9rem;
          }

          .controls {
            grid-template-columns: 1fr;
          }

          .visual-label {
            left: 18px;
          }

          .top-left {
            top: 18px;
          }

          .bottom-left {
            bottom: 18px;
          }

          .view-toggle {
            top: 18px;
            right: 18px;
            padding: 0 10px;
            min-height: 30px;
            font-size: 0.52rem;
          }
        }
      `}</style>
    </main>
  );
}
