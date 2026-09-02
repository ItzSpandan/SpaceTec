'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@supabase/supabase-js';
import * as satellite from 'satellite.js';
import * as THREE from 'three';

const ReactGlobe = dynamic(() => import('react-globe.gl'), {
  ssr: false,
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EARTH_RADIUS_KM = 6371;

const GLOBE_SATELLITE_LIMIT = 16000;
const GLOBE_FETCH_CHUNK = 1000;

const LAUNCH_PADS = [
  {
    id: 'Kennedy',
    name: 'Kennedy Space Center LC-39A',
    lat: 28.608389,
    lng: -80.604333,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'CapeCanaveral',
    name: 'Cape Canaveral SLC-40',
    lat: 28.561857,
    lng: -80.577366,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Vandenberg',
    name: 'Vandenberg Space Force Base',
    lat: 34.632093,
    lng: -120.610829,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Wallops',
    name: 'Wallops Flight Facility',
    lat: 37.833,
    lng: -75.488,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Kodiak',
    name: 'Pacific Spaceport Complex Alaska',
    lat: 57.435,
    lng: -152.339,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'SLC6',
    name: 'Space Launch Complex 6',
    lat: 34.581,
    lng: -120.625,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'SDSC',
    name: 'Satish Dhawan Space Centre',
    lat: 13.7199,
    lng: 80.2304,
    active: true,
    type: 'Major',
    country: 'India',
  },
  {
    id: 'Kourou',
    name: 'Guiana Space Centre',
    lat: 5.236,
    lng: -52.768,
    active: true,
    type: 'Major',
    country: 'France',
  },
  {
    id: 'Baikonur',
    name: 'Baikonur Cosmodrome',
    lat: 45.965,
    lng: 63.305,
    active: true,
    type: 'Major',
    country: 'Kazakhstan',
  },
  {
    id: 'Vostochny',
    name: 'Vostochny Cosmodrome',
    lat: 51.884,
    lng: 128.333,
    active: true,
    type: 'Major',
    country: 'Russia',
  },
  {
    id: 'Plesetsk',
    name: 'Plesetsk Cosmodrome',
    lat: 62.927,
    lng: 40.577,
    active: true,
    type: 'Major',
    country: 'Russia',
  },
  {
    id: 'Tanegashima',
    name: 'Tanegashima Space Center',
    lat: 30.4008,
    lng: 130.9697,
    active: true,
    type: 'Major',
    country: 'Japan',
  },
  {
    id: 'Uchinoura',
    name: 'Uchinoura Space Center',
    lat: 31.251,
    lng: 131.083,
    active: true,
    type: 'Major',
    country: 'Japan',
  },
  {
    id: 'Wenchang',
    name: 'Wenchang Spacecraft Launch Site',
    lat: 19.614,
    lng: 110.951,
    active: true,
    type: 'Major',
    country: 'China',
  },
  {
    id: 'Jiuquan',
    name: 'Jiuquan Satellite Launch Center',
    lat: 40.96,
    lng: 100.29,
    active: true,
    type: 'Major',
    country: 'China',
  },
  {
    id: 'Xichang',
    name: 'Xichang Satellite Launch Center',
    lat: 28.246,
    lng: 102.027,
    active: true,
    type: 'Major',
    country: 'China',
  },
  {
    id: 'Mahia',
    name: 'Rocket Lab Launch Complex 1',
    lat: -39.262,
    lng: 177.864,
    active: true,
    type: 'Major',
    country: 'New Zealand',
  },
  {
    id: 'Esrange',
    name: 'Esrange Space Center',
    lat: 67.887,
    lng: 21.082,
    active: true,
    type: 'Major',
    country: 'Sweden',
  },
  {
    id: 'Andoya',
    name: 'Andøya Space',
    lat: 69.294,
    lng: 16.02,
    active: true,
    type: 'Minor',
    country: 'Norway',
  },
  {
    id: 'Palmachim',
    name: 'Palmachim Airbase',
    lat: 31.89,
    lng: 34.69,
    active: true,
    type: 'Minor',
    country: 'Israel',
  },
  {
    id: 'Semnan',
    name: 'Semnan Launch Site',
    lat: 35.234,
    lng: 53.921,
    active: true,
    type: 'Minor',
    country: 'Iran',
  },
  {
    id: 'ImamKhomeini',
    name: 'Imam Khomeini Space Center',
    lat: 35.234,
    lng: 53.921,
    active: true,
    type: 'Minor',
    country: 'Iran',
  },
  {
    id: 'Sriharikota',
    name: 'Sriharikota',
    lat: 13.7199,
    lng: 80.2304,
    active: true,
    type: 'Major',
    country: 'India',
  },
  {
    id: 'SatishDhawan',
    name: 'Satish Dhawan Space Centre (ISRO)',
    lat: 13.7199,
    lng: 80.2304,
    active: true,
    type: 'Major',
    country: 'India',
  },
  {
    id: 'Qingshan',
    name: 'Qingshan Island Launch Site',
    lat: 28.5,
    lng: 113.5,
    active: false,
    type: 'Minor',
    country: 'China',
  },
  {
    id: 'Sohae',
    name: 'Sohae Satellite Launching Station',
    lat: 39.66,
    lng: 124.7,
    active: true,
    type: 'Minor',
    country: 'North Korea',
  },
  {
    id: 'Naro',
    name: 'Naro Space Center',
    lat: 34.431,
    lng: 127.535,
    active: true,
    type: 'Major',
    country: 'South Korea',
  },
  {
    id: 'Hammaguir',
    name: 'Hammaguir Launch Site',
    lat: 30.78,
    lng: -3.06,
    active: false,
    type: 'Minor',
    country: 'Algeria',
  },
  {
    id: 'SanMarco',
    name: 'San Marco Equatorial Range',
    lat: -2.939,
    lng: 40.213,
    active: false,
    type: 'Minor',
    country: 'Kenya',
  },
  {
    id: 'Woomera',
    name: 'Woomera Test Range',
    lat: -31.16,
    lng: 136.81,
    active: true,
    type: 'Minor',
    country: 'Australia',
  },
  {
    id: 'Arnhem',
    name: 'Arnhem Space Centre',
    lat: -12.3,
    lng: 136.8,
    active: true,
    type: 'Major',
    country: 'Australia',
  },
  {
    id: 'Bowen',
    name: 'Bowen Orbital Spaceport',
    lat: -20.01,
    lng: 148.25,
    active: true,
    type: 'Minor',
    country: 'Australia',
  },
  {
    id: 'Hokkaido',
    name: 'Hokkaido Spaceport',
    lat: 42.89,
    lng: 143.25,
    active: true,
    type: 'Major',
    country: 'Japan',
  },
  {
    id: 'Palmachim2',
    name: 'Palmachim Launch Complex',
    lat: 31.9,
    lng: 34.69,
    active: true,
    type: 'Minor',
    country: 'Israel',
  },
  {
    id: 'Alcantara',
    name: 'Alcântara Launch Center',
    lat: -2.373,
    lng: -44.396,
    active: true,
    type: 'Major',
    country: 'Brazil',
  },
  {
    id: 'Barreira',
    name: 'Barreira do Inferno',
    lat: -5.916,
    lng: -35.164,
    active: true,
    type: 'Minor',
    country: 'Brazil',
  },
  {
    id: 'Koonibba',
    name: 'Koonibba Test Range',
    lat: -31.87,
    lng: 133.42,
    active: true,
    type: 'Minor',
    country: 'Australia',
  },
  {
    id: 'Nullarbor',
    name: 'Nullarbor Launch Site',
    lat: -31.5,
    lng: 129.0,
    active: false,
    type: 'Minor',
    country: 'Australia',
  },
  {
    id: 'Mojave',
    name: 'Mojave Air and Space Port',
    lat: 35.059,
    lng: -118.151,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Starbase',
    name: 'Starbase',
    lat: 25.997,
    lng: -97.156,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'VandenbergSLC',
    name: 'Vandenberg SLC-4E',
    lat: 34.632,
    lng: -120.611,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Kwajalein',
    name: 'Ronald Reagan Ballistic Missile Defense Test Site',
    lat: 9.047,
    lng: 167.743,
    active: true,
    type: 'Minor',
    country: 'Marshall Islands',
  },
  {
    id: 'Hainan',
    name: 'Wenchang Commercial Space Launch Site',
    lat: 19.61,
    lng: 110.95,
    active: true,
    type: 'Major',
    country: 'China',
  },
  {
    id: 'Negev',
    name: 'Shavit Launch Complex',
    lat: 31.0,
    lng: 34.8,
    active: true,
    type: 'Minor',
    country: 'Israel',
  },
  {
    id: 'Algeria',
    name: 'Hammaguir',
    lat: 30.78,
    lng: -3.06,
    active: false,
    type: 'Minor',
    country: 'Algeria',
  },
  {
    id: 'Kourou2',
    name: 'ELA-4',
    lat: 5.236,
    lng: -52.768,
    active: true,
    type: 'Major',
    country: 'French Guiana',
  },
  {
    id: 'NewGlenn',
    name: 'Cape Canaveral LC-36',
    lat: 28.472,
    lng: -80.577,
    active: true,
    type: 'Major',
    country: 'USA',
  },
  {
    id: 'Sutherland',
    name: 'Sutherland Spaceport',
    lat: 58.51,
    lng: -4.52,
    active: true,
    type: 'Major',
    country: 'Scotland',
  },
];

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLongitude(lng) {
  let result = Number(lng) || 0;

  while (result > 180) result -= 360;
  while (result < -180) result += 360;

  return result;
}

function getSatelliteType(name = '') {
  const upper = String(name).toUpperCase();

  if (upper.includes('ISS')) return 'ISS';
  if (upper.includes('STARLINK')) return 'STARLINK';

  if (
    upper.includes('NOAA') ||
    upper.includes('GOES') ||
    upper.includes('METEOSAT') ||
    upper.includes('WEATHER')
  ) {
    return 'WEATHER';
  }

  return 'OTHER';
}

function calculateSatellitePosition(sat) {
  if (!sat) return null;

  const lat = safeNumber(sat.latitude, safeNumber(sat.lat, 0));
  const lng = normalizeLongitude(
    safeNumber(sat.longitude, safeNumber(sat.lng, 0))
  );

  const altitudeKm = safeNumber(
    sat.altitudeKm,
    safeNumber(sat.altitude, 400)
  );

  return {
    ...sat,
    lat,
    lng,
    altitudeKm,
  };
}

function getSatelliteColor(sat) {
  const type = getSatelliteType(sat?.name);

  if (type === 'ISS') return '#ffffff';
  if (type === 'STARLINK') return '#ffffff';
  if (type === 'WEATHER') return '#ffffff';

  return '#ffffff';
}

function getSatelliteRadius(sat) {
  const type = getSatelliteType(sat?.name);

  if (type === 'ISS') return 0.32;
  if (type === 'STARLINK') return 0.20;
  if (type === 'WEATHER') return 0.22;

  return 0.20;
}

function getOrbitalPathFromSatrec(sat, points = 180) {
  if (!sat?.tle1 || !sat?.tle2) return [];

  try {
    const satrec = satellite.twoline2satrec(sat.tle1, sat.tle2);

    if (!satrec) return [];

    const epoch = new Date();

    const result = [];

    for (let i = 0; i < points; i++) {
      const minutesOffset = (i / points) * 95;

      const time = new Date(epoch.getTime() + minutesOffset * 60 * 1000);

      const positionAndVelocity = satellite.propagate(satrec, time);

      if (!positionAndVelocity?.position) continue;

      const gmst = satellite.gstime(time);

      const geodetic = satellite.eciToGeodetic(
        positionAndVelocity.position,
        gmst
      );

      const lat = satellite.degreesLat(geodetic.latitude);
      const lng = satellite.degreesLong(geodetic.longitude);
      const altitude = safeNumber(geodetic.height, 0) / EARTH_RADIUS_KM;

      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Number.isFinite(altitude)
      ) {
        result.push({
          lat,
          lng,
          altitude: Math.max(0.002, altitude),
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}

export default function OrbitalGlobe() {
  const globeRef = useRef(null);

  const [viewMode, setViewMode] = useState('pads');
  const [padFilter, setPadFilter] = useState('all');
  const [satFilter, setSatFilter] = useState('stations');

  const [satellites, setSatellites] = useState([]);
  const [selectedSat, setSelectedSat] = useState(null);
  const [hoveredSat, setHoveredSat] = useState(null);

  const [selectedPad, setSelectedPad] = useState(null);

  const [orbitalPaths, setOrbitalPaths] = useState([]);

  const [loading, setLoading] = useState(false);
  const [satelliteCount, setSatelliteCount] = useState(0);

  const [wikiSearch, setWikiSearch] = useState('');
  const [wikiPage, setWikiPage] = useState(1);
  const [wikiRows, setWikiRows] = useState([]);
  const [wikiTotal, setWikiTotal] = useState(0);

  const [globeReady, setGlobeReady] = useState(false);

  const [showLabels, setShowLabels] = useState(true);

  const [cameraTarget, setCameraTarget] = useState(null);

  const filteredPads = useMemo(() => {
    if (padFilter === 'major') {
      return LAUNCH_PADS.filter(p => p.type === 'Major');
    }

    if (padFilter === 'minor') {
      return LAUNCH_PADS.filter(p => p.type === 'Minor');
    }

    return LAUNCH_PADS;
  }, [padFilter]);

  const loadSatellites = useCallback(async () => {
    setLoading(true);

    try {
      let allRows = [];

      for (let offset = 0; offset < GLOBE_SATELLITE_LIMIT; offset += GLOBE_FETCH_CHUNK) {
        const { data, error } = await supabase
          .from('satellites')
          .select('*')
          .range(offset, offset + GLOBE_FETCH_CHUNK - 1);

        if (error) {
          console.error('Satellite fetch error:', error);
          break;
        }

        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);

        if (data.length < GLOBE_FETCH_CHUNK) break;
      }

      const normalized = allRows
        .map(calculateSatellitePosition)
        .filter(Boolean);

      setSatellites(normalized);
      setSatelliteCount(normalized.length);
    } catch (error) {
      console.error('Failed to load satellites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSatellites();
  }, [loadSatellites]);

  const activeSatsToDisplay = useMemo(() => {
    if (!satellites.length) return [];

    if (satFilter === 'stations') {
      return satellites.filter(s => {
        const name = String(s.name || '').toUpperCase();

        return (
          name.includes('ISS') ||
          name.includes('TIANGONG') ||
          name.includes('CSS')
        );
      });
    }

    if (satFilter === 'starlink') {
      return satellites
        .filter(s =>
          String(s.name || '').toUpperCase().includes('STARLINK')
        )
        .slice(0, 1000);
    }

    if (satFilter === 'weather') {
      return satellites.filter(s => {
        const name = String(s.name || '').toUpperCase();

        return (
          name.includes('NOAA') ||
          name.includes('GOES') ||
          name.includes('METEOSAT') ||
          name.includes('WEATHER')
        );
      });
    }

    if (satFilter === 'active') {
      return satellites.slice(0, 1500);
    }

    return satellites;
  }, [satellites, satFilter]);

  const renderSatellites = useMemo(() => {
    if (selectedSat) {
      const activeObj =
        satellites.find(s => String(s.id) === String(selectedSat.id)) ||
        selectedSat;

      return [
        {
          ...activeObj,
          displayColor: '#ffffff',
          displayRadius: 0.55,
          displayAltitude: Math.max(
            0.002,
            (Number(activeObj.altitudeKm) || 400) / EARTH_RADIUS_KM
          ),
        },
      ];
    }

    return activeSatsToDisplay.map(sat => {
      const isHovered =
        hoveredSat && String(hoveredSat.id) === String(sat.id);

      let displayColor = 'rgba(255,255,255,0.85)';
      let displayRadius = 0.20;

      if (hoveredSat) {
        if (isHovered) {
          displayColor = '#ffffff';
          displayRadius = 0.50;
        } else {
          displayColor = 'rgba(255,255,255,0.12)';
          displayRadius = 0.12;
        }
      }

      const altKm =
        Number(sat.altitudeKm) || Number(sat.altitude) || 400;

      return {
        ...sat,
        displayColor,
        displayRadius,
        displayAltitude: Math.max(
          0.002,
          altKm / EARTH_RADIUS_KM
        ),
      };
    });
  }, [activeSatsToDisplay, selectedSat, hoveredSat, satellites]);

  /*
   * Batched Three.js satellite marker + altitude beam.
   *
   * This deliberately uses ONE LineSegments object and ONE InstancedMesh
   * instead of creating a React/DOM object for every satellite.
   */
  const satelliteBeamLayerData = useMemo(() => {
    if (viewMode !== 'satellites') return [];

    return [
      {
        satellites: renderSatellites,
        radius: 100,
      },
    ];
  }, [viewMode, renderSatellites]);

  const createSatelliteBeamLayer = useCallback(layer => {
    const group = new THREE.Group();

    group.name = 'SatelliteBeamLayer';

    const satellitesInLayer = layer?.satellites || [];

    const beamPositions = new Float32Array(
      satellitesInLayer.length * 2 * 3
    );

    const beamGeometry = new THREE.BufferGeometry();

    beamGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(beamPositions, 3)
    );

    const beamMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
      dashSize: 0.75,
      gapSize: 0.9,
      depthWrite: false,
    });

    const beamLines = new THREE.LineSegments(
      beamGeometry,
      beamMaterial
    );

    beamLines.name = 'SatelliteAltitudeBeams';

    group.add(beamLines);

    const markerGeometry = new THREE.SphereGeometry(
      0.72,
      6,
      4
    );

    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    const markerMesh = new THREE.InstancedMesh(
      markerGeometry,
      markerMaterial,
      Math.max(1, satellitesInLayer.length)
    );

    markerMesh.name = 'SatelliteMarkers';

    group.add(markerMesh);

    group.userData.beamLines = beamLines;
    group.userData.beamGeometry = beamGeometry;
    group.userData.markerMesh = markerMesh;
    group.userData.markerGeometry = markerGeometry;
    group.userData.markerMaterial = markerMaterial;

    return group;
  }, []);

  const updateSatelliteBeamLayer = useCallback((object, layer) => {
    if (!object || !layer) return;

    const satellitesInLayer = layer.satellites || [];
    const radius = layer.radius || 100;

    const beamLines = object.userData.beamLines;
    const beamGeometry = object.userData.beamGeometry;
    const markerMesh = object.userData.markerMesh;

    if (!beamLines || !beamGeometry || !markerMesh) return;

    const positionAttribute = beamGeometry.getAttribute('position');

    if (!positionAttribute) return;

    const matrix = new THREE.Matrix4();

    const tempPosition = new THREE.Vector3();

    const up = new THREE.Vector3();

    for (let i = 0; i < satellitesInLayer.length; i++) {
      const sat = satellitesInLayer[i];

      const lat = safeNumber(sat.lat, 0);
      const lng = safeNumber(sat.lng, 0);

      const altitudeRatio = Math.max(
        0.002,
        safeNumber(
          sat.altitudeKm,
          safeNumber(sat.altitude, 400)
        ) / EARTH_RADIUS_KM
      );

      const latRad = THREE.MathUtils.degToRad(lat);
      const lngRad = THREE.MathUtils.degToRad(lng);

      const cosLat = Math.cos(latRad);

      const baseX =
        radius * cosLat * Math.cos(lngRad);

      const baseY =
        radius * Math.sin(latRad);

      const baseZ =
        radius * cosLat * Math.sin(lngRad);

      const topRadius =
        radius * (1 + altitudeRatio);

      const topX =
        topRadius * cosLat * Math.cos(lngRad);

      const topY =
        topRadius * Math.sin(latRad);

      const topZ =
        topRadius * cosLat * Math.sin(lngRad);

      const index = i * 6;

      positionAttribute.array[index] = baseX;
      positionAttribute.array[index + 1] = baseY;
      positionAttribute.array[index + 2] = baseZ;

      positionAttribute.array[index + 3] = topX;
      positionAttribute.array[index + 4] = topY;
      positionAttribute.array[index + 5] = topZ;

      tempPosition.set(topX, topY, topZ);

      up.set(
        topX - baseX,
        topY - baseY,
        topZ - baseZ
      );

      const markerScale = 1.0;

      matrix.compose(
        tempPosition,
        new THREE.Quaternion(),
        new THREE.Vector3(
          markerScale,
          markerScale,
          markerScale
        )
      );

      markerMesh.setMatrixAt(i, matrix);
    }

    positionAttribute.needsUpdate = true;

    beamLines.computeLineDistances();

    markerMesh.count = satellitesInLayer.length;
    markerMesh.instanceMatrix.needsUpdate = true;
  }, []);

  useEffect(() => {
    if (!globeReady || !globeRef.current) return;

    const controls = globeRef.current.controls?.();

    if (!controls) return;

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 120;
    controls.maxDistance = 500;
  }, [globeReady]);

  useEffect(() => {
    if (!selectedSat) {
      setOrbitalPaths([]);
      return;
    }

    const path = getOrbitalPathFromSatrec(selectedSat);

    setOrbitalPaths(
      path.length
        ? [
            {
              id: selectedSat.id,
              points: path,
            },
          ]
        : []
    );
  }, [selectedSat]);

  useEffect(() => {
    if (!cameraTarget || !globeRef.current) return;

    const { lat, lng, altitude } = cameraTarget;

    try {
      globeRef.current.pointOfView(
        {
          lat,
          lng,
          altitude,
        },
        1200
      );
    } catch (error) {
      console.error('Camera movement error:', error);
    }
  }, [cameraTarget]);

  const focusSatellite = useCallback(sat => {
    if (!sat) return;

    setSelectedSat(sat);
    setHoveredSat(null);

    setCameraTarget({
      lat: safeNumber(sat.lat, 0),
      lng: safeNumber(sat.lng, 0),
      altitude: 1.65,
    });
  }, []);

  const focusPad = useCallback(pad => {
    if (!pad) return;

    setSelectedPad(pad);

    setCameraTarget({
      lat: safeNumber(pad.lat, 0),
      lng: safeNumber(pad.lng, 0),
      altitude: 1.8,
    });
  }, []);

  const resetView = useCallback(() => {
    setSelectedSat(null);
    setSelectedPad(null);
    setHoveredSat(null);
    setOrbitalPaths([]);

    setCameraTarget({
      lat: 20,
      lng: 0,
      altitude: 2.35,
    });
  }, []);

  const followISS = useCallback(() => {
    const iss =
      satellites.find(s =>
        String(s.name || '')
          .toUpperCase()
          .includes('ISS')
      );

    if (!iss) return;

    focusSatellite(iss);
  }, [satellites, focusSatellite]);

  const handleSatelliteClick = useCallback(
    sat => {
      focusSatellite(sat);
    },
    [focusSatellite]
  );

  const handleSatelliteHover = useCallback(sat => {
    setHoveredSat(sat || null);
  }, []);

  const handlePadClick = useCallback(
    pad => {
      focusPad(pad);
    },
    [focusPad]
  );

  const handleGlobeReady = useCallback(() => {
    setGlobeReady(true);

    try {
      globeRef.current?.pointOfView({
        lat: 20,
        lng: 0,
        altitude: 2.35,
      });
    } catch {}
  }, []);

  const labelsData = useMemo(() => {
    if (!showLabels) return [];

    if (viewMode === 'pads') {
      return filteredPads;
    }

    if (viewMode === 'satellites' && selectedSat) {
      return [selectedSat];
    }

    return [];
  }, [
    showLabels,
    viewMode,
    filteredPads,
    selectedSat,
  ]);

  const labelText = useCallback(
    d => {
      if (viewMode === 'pads') {
        return d.name || '';
      }

      return d.name || '';
    },
    [viewMode]
  );

  const labelLat = useCallback(d => d.lat, []);
  const labelLng = useCallback(d => d.lng, []);

  const labelAltitude = useCallback(
    d => {
      if (viewMode === 'pads') return 0.025;

      const altKm =
        Number(d.altitudeKm) ||
        Number(d.altitude) ||
        400;

      return Math.max(
        0.01,
        altKm / EARTH_RADIUS_KM + 0.025
      );
    },
    [viewMode]
  );

  const labelColor = useCallback(
    () => 'rgba(255,255,255,0.9)',
    []
  );

  const labelSize = useCallback(() => 1.25, []);

  const labelDotRadius = useCallback(() => 0.32, []);

  const labelResolution = useCallback(() => 2, []);

  const fetchWiki = useCallback(async () => {
    setLoading(true);

    try {
      const pageSize = 50;
      const from = (wikiPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('satellites').select('*', {
        count: 'exact',
      });

      const trimmed = wikiSearch.trim();

      if (trimmed) {
        if (/^\d+$/.test(trimmed)) {
          query = query.or(
            `name.ilike.%${trimmed}%,id.eq.${trimmed}`
          );
        } else {
          query = query.ilike(
            'name',
            `%${trimmed}%`
          );
        }
      }

      const { data, count, error } = await query
        .range(from, to)
        .order('name', {
          ascending: true,
        });

      if (error) {
        console.error('Wiki fetch error:', error);
        return;
      }

      setWikiRows(data || []);
      setWikiTotal(count || 0);
    } catch (error) {
      console.error('Wiki loading error:', error);
    } finally {
      setLoading(false);
    }
  }, [wikiPage, wikiSearch]);

  useEffect(() => {
    if (viewMode !== 'wiki') return;

    fetchWiki();
  }, [viewMode, fetchWiki]);

  const wikiTotalPages = Math.max(
    1,
    Math.ceil(wikiTotal / 50)
  );

  const selectWikiSatellite = useCallback(
    row => {
      setViewMode('satellites');
      focusSatellite(
        calculateSatellitePosition(row)
      );
    },
    [focusSatellite]
  );

  const handleModeChange = useCallback(mode => {
    setViewMode(mode);

    if (mode !== 'satellites') {
      setSelectedSat(null);
      setOrbitalPaths([]);
      setHoveredSat(null);
    }

    if (mode !== 'pads') {
      setSelectedPad(null);
    }
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '700px',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
        color: '#fff',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
        }}
      >
        <ReactGlobe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere={true}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.12}
          backgroundColor="rgba(0,0,0,0)"
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
              : d => d.displayAltitude || 0.02
          }
          pointColor={d =>
            viewMode === 'pads'
              ? '#38bdf8'
              : d.displayColor || '#ffffff'
          }
          pointRadius={
            viewMode === 'pads'
              ? 0.65
              : d => d.displayRadius || 0.2
          }
          pointResolution={4}
          pointsTransitionDuration={0}
          onPointClick={
            viewMode === 'pads'
              ? handlePadClick
              : handleSatelliteClick
          }
          onPointHover={
            viewMode === 'satellites'
              ? handleSatelliteHover
              : undefined
          }
          pathsData={
            viewMode === 'satellites' && selectedSat
              ? orbitalPaths
              : []
          }
          pathPoints="points"
          pathPointLat="lat"
          pathPointLng="lng"
          pathPointAlt="altitude"
          pathColor={() => 'rgba(255,255,255,0.7)'}
          pathStroke={1.0}
          pathDashLength={0.03}
          pathDashGap={0.015}
          pathDashAnimateTime={4000}
          ringsData={
            viewMode === 'satellites' && selectedSat
              ? [selectedSat]
              : viewMode === 'pads' && selectedPad
              ? [selectedPad]
              : []
          }
          ringLat="lat"
          ringLng="lng"
          ringColor={() => 'rgba(255,255,255,0.8)'}
          ringMaxRadius={
            viewMode === 'satellites'
              ? 4
              : 2
          }
          ringPropagationSpeed={1.5}
          ringRepeatPeriod={1000}
          labelsData={labelsData}
          labelLat={labelLat}
          labelLng={labelLng}
          labelAltitude={labelAltitude}
          labelText={labelText}
          labelColor={labelColor}
          labelSize={labelSize}
          labelDotRadius={labelDotRadius}
          labelResolution={labelResolution}
          labelIncludeDot={true}
          customLayerData={satelliteBeamLayerData}
          customThreeObject={createSatelliteBeamLayer}
          customThreeObjectUpdate={
            updateSatelliteBeamLayer
          }
          onGlobeReady={handleGlobeReady}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          right: 18,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: '#fff',
          }}
        >
          ORBITAL GLOBE
        </div>

        <button
          type="button"
          onClick={resetView}
          style={{
            pointerEvents: 'auto',
            background: '#000',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '9px 14px',
            fontSize: 11,
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          RESET VIEW
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 68,
          left: 18,
          zIndex: 10,
          width: 210,
          background: 'rgba(0,0,0,0.88)',
          border: '1px solid rgba(255,255,255,0.16)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom:
              '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <button
            type="button"
            onClick={() =>
              handleModeChange('pads')
            }
            style={{
              background:
                viewMode === 'pads'
                  ? '#fff'
                  : 'transparent',
              color:
                viewMode === 'pads'
                  ? '#000'
                  : '#fff',
              border: 'none',
              padding: '10px 4px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            PADS
          </button>

          <button
            type="button"
            onClick={() =>
              handleModeChange('satellites')
            }
            style={{
              background:
                viewMode === 'satellites'
                  ? '#fff'
                  : 'transparent',
              color:
                viewMode === 'satellites'
                  ? '#000'
                  : '#fff',
              borderLeft:
                '1px solid rgba(255,255,255,0.12)',
              borderRight:
                '1px solid rgba(255,255,255,0.12)',
              borderTop: 'none',
              borderBottom: 'none',
              padding: '10px 4px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            SATS
          </button>

          <button
            type="button"
            onClick={() =>
              handleModeChange('wiki')
            }
            style={{
              background:
                viewMode === 'wiki'
                  ? '#fff'
                  : 'transparent',
              color:
                viewMode === 'wiki'
                  ? '#000'
                  : '#fff',
              border: 'none',
              padding: '10px 4px',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            DB
          </button>
        </div>

        {viewMode === 'pads' && (
          <div
            style={{
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[
              ['all', 'ALL'],
              ['major', 'MAJOR'],
              ['minor', 'MINOR'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setPadFilter(value)
                }
                style={{
                  textAlign: 'left',
                  padding: '7px 8px',
                  border:
                    '1px solid rgba(255,255,255,0.12)',
                  background:
                    padFilter === value
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  color: '#fff',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'satellites' && (
          <div
            style={{
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[
              ['stations', 'STATIONS'],
              ['starlink', 'STARLINK'],
              ['weather', 'WEATHER'],
              ['active', 'ALL ACTIVE'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setSatFilter(value)
                }
                style={{
                  textAlign: 'left',
                  padding: '7px 8px',
                  border:
                    '1px solid rgba(255,255,255,0.12)',
                  background:
                    satFilter === value
                      ? 'rgba(255,255,255,0.12)'
                      : 'transparent',
                  color: '#fff',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}

            <div
              style={{
                marginTop: 4,
                paddingTop: 9,
                borderTop:
                  '1px solid rgba(255,255,255,0.12)',
                fontSize: 9,
                color:
                  'rgba(255,255,255,0.55)',
                lineHeight: 1.5,
              }}
            >
              {loading
                ? 'LOADING SATELLITES...'
                : `${satelliteCount.toLocaleString()} SATELLITES LOADED`}
            </div>

            <button
              type="button"
              onClick={followISS}
              style={{
                marginTop: 4,
                padding: '8px',
                border:
                  '1px solid rgba(255,255,255,0.25)',
                background: '#fff',
                color: '#000',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              FOLLOW ISS
            </button>
          </div>
        )}

        {viewMode === 'wiki' && (
          <div
            style={{
              padding: 10,
            }}
          >
            <input
              value={wikiSearch}
              onChange={e => {
                setWikiSearch(e.target.value);
                setWikiPage(1);
              }}
              placeholder="SEARCH SATELLITES"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#000',
                border:
                  '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '8px',
                outline: 'none',
                fontSize: 10,
              }}
            />

            <div
              style={{
                marginTop: 8,
                maxHeight: 360,
                overflowY: 'auto',
                borderTop:
                  '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {wikiRows.map(row => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() =>
                    selectWikiSatellite(row)
                  }
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 5px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom:
                      '1px solid rgba(255,255,255,0.08)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 10,
                  }}
                >
                  <div>
                    {row.name || 'UNKNOWN'}
                  </div>

                  <div
                    style={{
                      marginTop: 3,
                      color:
                        'rgba(255,255,255,0.45)',
                      fontSize: 8,
                    }}
                  >
                    NORAD {row.id}
                  </div>
                </button>
              ))}

              {!wikiRows.length && (
                <div
                  style={{
                    padding: 12,
                    color:
                      'rgba(255,255,255,0.45)',
                    fontSize: 9,
                  }}
                >
                  NO RESULTS
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
                fontSize: 9,
              }}
            >
              <button
                type="button"
                disabled={wikiPage <= 1}
                onClick={() =>
                  setWikiPage(p =>
                    Math.max(1, p - 1)
                  )
                }
                style={{
                  background: 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage <= 1
                      ? 'rgba(255,255,255,0.25)'
                      : '#fff',
                  padding: '5px 8px',
                  cursor:
                    wikiPage <= 1
                      ? 'default'
                      : 'pointer',
                }}
              >
                PREV
              </button>

              <span
                style={{
                  color:
                    'rgba(255,255,255,0.55)',
                }}
              >
                {wikiPage} / {wikiTotalPages}
              </span>

              <button
                type="button"
                disabled={
                  wikiPage >= wikiTotalPages
                }
                onClick={() =>
                  setWikiPage(p =>
                    Math.min(
                      wikiTotalPages,
                      p + 1
                    )
                  )
                }
                style={{
                  background: 'transparent',
                  border:
                    '1px solid rgba(255,255,255,0.15)',
                  color:
                    wikiPage >= wikiTotalPages
                      ? 'rgba(255,255,255,0.25)'
                      : '#fff',
                  padding: '5px 8px',
                  cursor:
                    wikiPage >= wikiTotalPages
                      ? 'default'
                      : 'pointer',
                }}
              >
                NEXT
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSat && (
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 68,
            zIndex: 10,
            width: 250,
            background: 'rgba(0,0,0,0.9)',
            border:
              '1px solid rgba(255,255,255,0.18)',
            padding: 14,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            {selectedSat.name ||
              'UNKNOWN SATELLITE'}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
              gap: 8,
              fontSize: 9,
              color:
                'rgba(255,255,255,0.65)',
            }}
          >
            <div>
              NORAD
              <br />
              <span
                style={{
                  color: '#fff',
                }}
              >
                {selectedSat.id}
              </span>
            </div>

            <div>
              ALTITUDE
              <br />
              <span
                style={{
                  color: '#fff',
                }}
              >
                {Math.round(
                  Number(
                    selectedSat.altitudeKm
                  ) || 0
                ).toLocaleString()}{' '}
                KM
              </span>
            </div>

            <div>
              LATITUDE
              <br />
              <span
                style={{
                  color: '#fff',
                }}
              >
                {safeNumber(
                  selectedSat.lat
                ).toFixed(2)}
                °
              </span>
            </div>

            <div>
              LONGITUDE
              <br />
              <span
                style={{
                  color: '#fff',
                }}
              >
                {safeNumber(
                  selectedSat.lng
                ).toFixed(2)}
                °
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedSat(null)
            }
            style={{
              width: '100%',
              marginTop: 12,
              padding: '7px',
              background: 'transparent',
              border:
                '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
      )}

      {selectedPad && viewMode === 'pads' && (
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 68,
            zIndex: 10,
            width: 250,
            background: 'rgba(0,0,0,0.9)',
            border:
              '1px solid rgba(255,255,255,0.18)',
            padding: 14,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: 10,
            }}
          >
            {selectedPad.name}
          </div>

          <div
            style={{
              fontSize: 9,
              lineHeight: 1.8,
              color:
                'rgba(255,255,255,0.65)',
            }}
          >
            <div>
              COUNTRY:{' '}
              <span
                style={{
                  color: '#fff',
                }}
              >
                {selectedPad.country}
              </span>
            </div>

            <div>
              TYPE:{' '}
              <span
                style={{
                  color: '#fff',
                }}
              >
                {selectedPad.type}
              </span>
            </div>

            <div>
              STATUS:{' '}
              <span
                style={{
                  color: '#fff',
                }}
              >
                {selectedPad.active
                  ? 'ACTIVE'
                  : 'INACTIVE'}
              </span>
            </div>

            <div>
              COORDINATES:{' '}
              <span
                style={{
                  color: '#fff',
                }}
              >
                {selectedPad.lat.toFixed(3)}
                °, {selectedPad.lng.toFixed(3)}°
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedPad(null)
            }
            style={{
              width: '100%',
              marginTop: 12,
              padding: '7px',
              background: 'transparent',
              border:
                '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: 9,
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          zIndex: 10,
          fontSize: 9,
          color:
            'rgba(255,255,255,0.45)',
          letterSpacing: '0.08em',
          pointerEvents: 'none',
        }}
      >
        {viewMode === 'pads'
          ? `${filteredPads.length} LAUNCH PADS`
          : viewMode === 'satellites'
          ? `${renderSatellites.length.toLocaleString()} SATELLITES DISPLAYED`
          : `${wikiTotal.toLocaleString()} DATABASE RECORDS`}
      </div>

      <button
        type="button"
        onClick={() =>
          setShowLabels(v => !v)
        }
        style={{
          position: 'absolute',
          right: 18,
          bottom: 18,
          zIndex: 10,
          background: '#000',
          border:
            '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '7px 10px',
          fontSize: 9,
          cursor: 'pointer',
        }}
      >
        LABELS {showLabels ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
