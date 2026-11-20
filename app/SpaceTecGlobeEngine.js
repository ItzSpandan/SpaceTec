'use client';

/**
 * SpaceTecGlobeEngine: an independent, in-house Three.js globe.
 *
 * - Plain Three.js + OrbitControls. No react-globe.gl / three-globe / Cesium.
 * - Satellites are drawn with one THREE.InstancedMesh per category.
 * - The rendering engine (class GlobeEngine) knows nothing about React.
 *   The React component below owns sizing, lifecycle and the UI overlay.
 * - Earth-fixed frame: Earth never rotates in the scene. Satellites arrive
 *   as geodetic lat/lng/altitude, so real propagated data can drop in later.
 *
 * GENERIC SUBJECT INTERFACE (feature-independent, step 1 of the engine/feature separation)
 *
 * The globe itself knows nothing about satellites, launch pads, the ISS, etc. A feature plugs in by
 * supplying a "subject" (prop `subject`, or engine.attachSubject(subject)):
 *
 *   GlobeEntity   { id, lat (deg), lng (deg), altitudeKm?, type?, timestamp? (ms), ...anything }
 *                 Extra fields are opaque to the engine and handed back untouched in callbacks.
 *   GlobePathPoint{ lat (deg), lng (deg), altitudeKm? }
 *   GlobeSubject  {
 *     id?: string,
 *     getEntities(): GlobeEntity[],                      // REQUIRED: the objects to display now
 *     subscribe?(push): unsubscribe,                     // push-style updates: push(entities?)
 *     tickMs?: number, tick?(nowMs): GlobeEntity[]|void, // pull-style updates (returning a list pushes it)
 *     resolveType?(entity): string,                      // rendering type key (see note below)
 *     getPath?(entityId, nowMs): GlobePathPoint[]|null,  // optional path/trajectory for an entity
 *     onSelect?(entity|null),                            // selection callback
 *   }
 *
 * Engine API (generic names): setEntities, setSelectedEntity, getSelectedEntity, focusEntity,
 * setPath, followSelected, attachSubject, detachSubject, plus the existing flyTo / resetView /
 * setAutoRotate / setTicker camera and lifecycle methods.
 *
 * TEMPORARY COMPATIBILITY LAYER: rendering types still map onto the built-in satellite render kinds
 * (KINDS), so an unknown type falls back to the generic marker. Satellite classification, the
 * instanced satellite models, the follow chase camera, the legend, the selection card and the
 * generated test fleet still live in this file and move to an Orbital Tracking adapter in a later step.
 *
 * Legacy satellite data contract (props.satellites, still supported and unchanged):
 *   { id, name?, category?: 'leo'|'meo'|'geo'|'station'|'other',
 *     lat (deg), lng (deg), altitudeKm, velocityKmS? }
 * If neither `subject` nor `satellites` is given, the internal generated test fleet is used.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './SpaceTecGlobeEngine.css';

// ---------------------------------------------------------------------------
// Constants and small helpers
// ---------------------------------------------------------------------------
const EARTH_KM = 6371;
const MU = 398600.4418; // km^3 / s^2
const OMEGA_E = 7.2921159e-5; // rad / s
const DEG = Math.PI / 180;

const CATEGORIES = {
  leo: { label: 'Low orbit', color: '#7fd4ff', size: 0.0042, shape: 'octa' },
  meo: { label: 'Medium orbit', color: '#ffd27a', size: 0.0062, shape: 'box' },
  geo: { label: 'Geostationary', color: '#ff9f80', size: 0.0085, shape: 'tetra' },
  station: { label: 'Stations', color: '#ffffff', size: 0.012, shape: 'ico' },
  other: { label: 'Other', color: '#b9c2d0', size: 0.0042, shape: 'octa' },
};

// Render kinds: one InstancedMesh each. `category` (orbit class) stays in the data API;
// `kind` is an optional hint, otherwise it is derived from category / name (display only).
const KINDS = {
  comms: { label: 'Communications', color: '#ffcf70', size: 0.0105 },
  starlink: { label: 'Broadband constellation', color: '#cfe6ff', size: 0.0075 },
  nav: { label: 'Navigation', color: '#9fe3b0', size: 0.0085 },
  weather: { label: 'Weather & Earth observation', color: '#8fc5ff', size: 0.0085 },
  cubesat: { label: 'CubeSat', color: '#d9a8ff', size: 0.0045 },
  station: { label: 'Space station', color: '#ffffff', size: 0.016 },
  generic: { label: 'Other', color: '#b9c2d0', size: 0.0055 },
};
const KIND_KEYS = Object.keys(KINDS);

// Texture sets per quality tier (files live in /public/globe-lab/earth, see README there).
const TIER_SPECS = {
  low: { day: '2k', night: '2k', normal: '2k', spec: '1k', clouds: '1k' },
  medium: { day: '4k', night: '2k', normal: '4k', spec: '2k', clouds: '2k' },
  ultra: { day: '8k', night: '4k', normal: '4k', spec: '2k', clouds: '4k' },
};
const TIER_ORDER = ['ultra', 'medium', 'low'];
const TIER_MIN_TEXTURE = { ultra: 8192, medium: 4096, low: 0 };

const INITIAL_VIEW = { lat: 18, lng: -35, distance: 3.6 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function mulberry32(seed) {
  let a = seed | 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Earth-fixed mapping that matches THREE.SphereGeometry's UV layout:
// lng 0 -> +X, lng 90E -> -Z, north -> +Y.
function llToVec(latDeg, lngDeg, r, out) {
  const la = latDeg * DEG;
  const lo = lngDeg * DEG;
  const c = Math.cos(la);
  return out.set(r * c * Math.cos(lo), r * Math.sin(la), -r * c * Math.sin(lo));
}

function vecToLL(v) {
  const r = v.length() || 1;
  return { lat: Math.asin(v.y / r) / DEG, lng: Math.atan2(-v.z, v.x) / DEG };
}

function detectLowTier() {
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const mem = navigator.deviceMemory || 4;
  return Boolean(coarse || small || mem <= 2);
}

function sunDirection(date, out) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const doy = (date.getTime() - start) / 864e5;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (doy + 10));
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return llToVec(decl, -(hours - 12) * 15, 1, out);
}

// ---------------------------------------------------------------------------
// Satellite kinds and lightweight category-based models
// Axes of every model: +X along-track, +Y solar-array axis (orbit normal), +Z away from Earth.
// These are REPRESENTATIVE silhouettes per category, not the real spacecraft.
// ---------------------------------------------------------------------------
function resolveKind(sat) {
  if (sat && sat.kind && KINDS[sat.kind]) return sat.kind;
  const name = String((sat && sat.name) || '').toUpperCase();
  if ((sat && sat.category === 'station') || /\b(ISS|ZARYA|TIANGONG|CSS)\b/.test(name)) return 'station';
  if (name.includes('STARLINK')) return 'starlink';
  if (/NAVSTAR|\bGPS\b|GALILEO|GLONASS|BEIDOU|QZS/.test(name)) return 'nav';
  if (/NOAA|GOES|METEOR|METOP|JPSS|HIMAWARI|LANDSAT|SENTINEL|FENGYUN/.test(name)) return 'weather';
  if (/CUBESAT|\bCUBE\b|\bDOVE\b|FLOCK|LEMUR/.test(name)) return 'cubesat';
  if (sat && sat.category === 'geo') return 'comms';
  if (sat && sat.category === 'meo') return 'nav';
  return 'generic';
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
const UNIT_CONE = new THREE.CylinderGeometry(0.5, 0.12, 1, 14);
const UNIT_OCTA = new THREE.OctahedronGeometry(0.5);
// Dish cap: apex on +Y, concave side opens toward -Y (base radius ~0.42).
const UNIT_CAP = new THREE.SphereGeometry(0.5, 28, 10, 0, Math.PI * 2, 0, 1.0);
const UNIT_SPH = new THREE.SphereGeometry(0.5, 16, 12);

const GOLD = '#d9b04a';
const SILVER = '#d5d9e0';
const WHITE = '#f1f3f6';
const GREY = '#8b929c';
const PANEL = '#4a7bc4';
const PANEL_LINE = '#10244d';

// lvl 0 = core silhouette, 1 = antennas/instruments, 2 = fine detail (selected-model only)
const box = (sx, sy, sz, x, y, z, color, lvl = 0) => ({ geo: UNIT_BOX, scale: [sx, sy, sz], pos: [x, y, z], color, lvl });
const cyl = (r, len, axis, x, y, z, color, lvl = 0, cone = false) => ({
  geo: cone ? UNIT_CONE : UNIT_CYL,
  scale: [r * 2, len, r * 2],
  rot: axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0],
  pos: [x, y, z],
  color,
  lvl,
});
function panel(cx, cy, cz, sx, sy, sz, cells = true) {
  const out = [box(sx, sy, sz, cx, cy, cz, PANEL)];
  if (cells) {
    const n = Math.max(3, Math.round(sy / 0.09));
    for (let i = 1; i <= n; i += 1) {
      out.push(box(sx * 1.02, 0.006, sz * 2.4, cx, cy - sy / 2 + (i * sy) / (n + 1), cz, PANEL_LINE, 2));
    }
  }
  return out;
}

function kindParts(kind) {
  switch (kind) {
    case 'comms':
      return [
        box(0.3, 0.3, 0.36, 0, 0, 0, GOLD),
        ...panel(0, 0.44, 0, 0.34, 0.52, 0.02),
        ...panel(0, -0.44, 0, 0.34, 0.52, 0.02),
        cyl(0.13, 0.05, 'z', 0, 0, -0.21, WHITE, 1, true),
        box(0.04, 0.04, 0.18, 0, 0, 0.27, GREY, 1),
        cyl(0.05, 0.05, 'z', 0.1, 0.08, -0.2, GREY, 2),
        box(0.12, 0.12, 0.02, 0, 0, 0.19, SILVER, 2),
      ];
    case 'starlink':
      return [
        box(0.46, 0.26, 0.035, 0, 0, 0, SILVER),
        ...panel(0, 0.69, 0, 0.46, 1.1, 0.012),
        box(0.1, 0.1, 0.03, 0, 0, -0.03, GREY, 1),
        box(0.08, 0.04, 0.02, -0.15, -0.1, 0.03, GREY, 2),
      ];
    case 'nav':
      return [
        box(0.26, 0.26, 0.3, 0, 0, 0, '#cdb779'),
        ...panel(0, 0.38, 0, 0.26, 0.46, 0.015),
        ...panel(0, -0.38, 0, 0.26, 0.46, 0.015),
        box(0.2, 0.2, 0.03, 0, 0, -0.17, WHITE, 1),
        cyl(0.015, 0.14, 'z', 0, 0, 0.22, GREY, 1),
        box(0.08, 0.08, 0.02, 0.1, 0.1, -0.2, GREY, 2),
      ];
    case 'weather':
      return [
        box(0.24, 0.24, 0.5, 0, 0, 0, SILVER),
        ...panel(0, 0.5, 0, 0.3, 0.78, 0.015),
        cyl(0.09, 0.22, 'z', 0, 0, -0.34, GREY, 1),
        box(0.02, 0.02, 0.4, 0.2, 0, 0, GREY, 1),
        cyl(0.05, 0.03, 'z', -0.1, 0, 0.27, WHITE, 2, true),
      ];
    case 'cubesat':
      return [
        box(0.1, 0.1, 0.3, 0, 0, 0, '#c9ccd2'),
        ...panel(0, 0.16, 0, 0.1, 0.2, 0.01),
        ...panel(0, -0.16, 0, 0.1, 0.2, 0.01),
        box(0.02, 0.02, 0.12, 0.04, 0.04, 0.2, GREY, 1),
      ];
    case 'station':
      return [
        box(0.05, 1.1, 0.05, 0, 0, 0, SILVER),
        box(0.5, 0.14, 0.012, 0, 0.58, 0, PANEL),
        box(0.5, 0.14, 0.012, 0, 0.4, 0, PANEL),
        box(0.5, 0.14, 0.012, 0, -0.58, 0, PANEL),
        box(0.5, 0.14, 0.012, 0, -0.4, 0, PANEL),
        cyl(0.05, 0.4, 'x', 0, 0, -0.06, WHITE, 0),
        cyl(0.04, 0.22, 'y', 0, 0, -0.06, WHITE, 1),
        box(0.015, 0.2, 0.2, 0, 0.22, 0.14, '#e8e8e8', 1),
        box(0.015, 0.2, 0.2, 0, -0.22, 0.14, '#e8e8e8', 1),
        cyl(0.03, 0.14, 'z', 0.14, 0, -0.12, WHITE, 2),
        cyl(0.03, 0.14, 'z', -0.14, 0, -0.12, WHITE, 2),
        box(0.03, 0.5, 0.03, 0, 0.8, 0, GREY, 2),
        box(0.03, 0.5, 0.03, 0, -0.8, 0, GREY, 2),
      ];
    default:
      return [{ geo: UNIT_OCTA, scale: [1, 1, 1], pos: [0, 0, 0], color: '#b9c2d0', lvl: 0 }];
  }
}

function bakeParts(parts, factor, withUV = false) {
  const pos = [];
  const nor = [];
  const col = [];
  const uvs = [];
  const m = new THREE.Matrix4();
  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const t = new THREE.Vector3();
  const sc = new THREE.Vector3();
  parts.forEach(p => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    t.set(...(p.pos || [0, 0, 0]));
    sc.set(...(p.scale || [1, 1, 1]));
    e.set(...(p.rot || [0, 0, 0]));
    q.setFromEuler(e);
    m.compose(t, q, sc);
    nm.getNormalMatrix(m);
    c.set(p.color);
    const P = g.getAttribute('position');
    const N = g.getAttribute('normal');
    const U = withUV ? g.getAttribute('uv') : null;
    const ruv = p.uv || [1, 1];
    for (let i = 0; i < P.count; i += 1) {
      v.fromBufferAttribute(P, i).applyMatrix4(m).multiplyScalar(factor);
      pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      nor.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
      if (U) uvs.push(U.getX(i) * ruv[0], U.getY(i) * ruv[1]);
    }
    g.dispose();
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (withUV) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return out;
}

const NORM_CACHE = new Map();
function normFactor(kind) {
  if (NORM_CACHE.has(kind)) return NORM_CACHE.get(kind);
  const g = bakeParts(kindParts(kind).filter(p => p.lvl === 0), 1);
  g.computeBoundingBox();
  const size = g.boundingBox.getSize(new THREE.Vector3());
  g.dispose();
  const f = 1 / Math.max(size.x, size.y, size.z, 1e-6);
  NORM_CACHE.set(kind, f);
  return f;
}

function bakeKind(kind, level) {
  return bakeParts(kindParts(kind).filter(p => p.lvl <= level), normFactor(kind));
}

// ---------------------------------------------------------------------------
// Detailed procedural models (selected satellite only, built lazily and cached).
// Representative designs per category, NOT the real spacecraft. Same axes as above.
// ---------------------------------------------------------------------------
function makeSolarTexture(maxAniso) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 128, 128);
  g.addColorStop(0, '#2a4a96');
  g.addColorStop(0.5, '#1f3d86');
  g.addColorStop(1, '#163071');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#0d1b40'; // clipped cell corners
  [[0, 0, 1, 1], [128, 0, -1, 1], [0, 128, 1, -1], [128, 128, -1, -1]].forEach(([cx, cy, sx, sy]) => {
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + 9 * sx, cy);
    x.lineTo(cx, cy + 9 * sy);
    x.closePath();
    x.fill();
  });
  x.strokeStyle = 'rgba(210,220,240,0.55)'; // bus bars
  x.lineWidth = 1.5;
  [42, 64, 86].forEach(px => {
    x.beginPath();
    x.moveTo(px, 5);
    x.lineTo(px, 123);
    x.stroke();
  });
  x.strokeStyle = '#aebbd6'; // cell border / interconnect gap
  x.lineWidth = 3;
  x.strokeRect(1.5, 1.5, 125, 125);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso || 4;
  if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  else if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
  return t;
}

function makeDetailBuilder() {
  const parts = [];
  const add = (geo, scale, pos, color, mat, rot, uv) => parts.push({ geo, scale, pos, rot, color, mat, uv, lvl: 0 });
  const B = {
    parts,
    box: (sx, sy, sz, x, y, z, color, mat = 'metal') => add(UNIT_BOX, [sx, sy, sz], [x, y, z], color, mat),
    cyl: (r, len, axis, x, y, z, color, mat = 'metal') =>
      add(UNIT_CYL, [r * 2, len, r * 2], [x, y, z], color, mat, axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0]),
    // Cone whose WIDE end points toward +axis (sign = 1) or -axis (sign = -1).
    cone: (rWide, len, axis, sign, x, y, z, color, mat = 'metal') => {
      let rot = [0, 0, 0];
      if (axis === 'z') rot = [sign * (Math.PI / 2), 0, 0];
      else if (axis === 'x') rot = [0, 0, sign * (-Math.PI / 2)];
      else if (sign < 0) rot = [Math.PI, 0, 0];
      return add(UNIT_CONE, [rWide * 2, len, rWide * 2], [x, y, z], color, mat, rot);
    },
    sph: (r, x, y, z, color, mat = 'paint') => add(UNIT_SPH, [r * 2, r * 2, r * 2], [x, y, z], color, mat),
    // Parabolic dish, aperture radius rd, opening toward nadir (-Z).
    dish: (rd, x, y, z, color, mat = 'paint') => {
      const sc = rd / 0.4207;
      return add(UNIT_CAP, [sc, sc * 0.55, sc], [x, y, z], color, mat, [Math.PI / 2, 0, 0]);
    },
    cells: (sx, sy, sz, x, y, z, ru, rv) => add(UNIT_BOX, [sx, sy, sz], [x, y, z], '#ffffff', 'panel', null, [ru, rv]),
    // Folding solar wing: framed, backed, individually-celled segments, hinges and a support mast.
    wing: o => {
      const { axis, from, to, lat = 0, z = 0, w, segs = 3, gap = 0.012, t = 0.012, fr = 0.008, cell = 0.05, boom = true } = o;
      const dir = Math.sign(to - from) || 1;
      const total = Math.abs(to - from);
      const L = (total - gap * (segs - 1)) / segs;
      const P = (along, off, zz) => (axis === 'y' ? [lat + off, along, zz] : [along, lat + off, zz]);
      const D = (a, l, th) => (axis === 'y' ? [l, a, th] : [a, l, th]);
      const cu = Math.max(1, Math.round((w - 2 * fr) / cell));
      const cv = Math.max(1, Math.round((L - 2 * fr) / cell));
      const uv = axis === 'y' ? [cu, cv] : [cv, cu];
      for (let i = 0; i < segs; i += 1) {
        const mid = from + dir * (i * (L + gap) + L / 2);
        add(UNIT_BOX, D(L - 2 * fr, w - 2 * fr, t), P(mid, 0, z), '#ffffff', 'panel', null, uv);
        add(UNIT_BOX, D(L, w, t * 0.6), P(mid, 0, z - t * 0.8), '#cfd3da', 'paint');
        [-1, 1].forEach(sg => {
          add(UNIT_BOX, D(L, fr, t * 1.7), P(mid, sg * (w / 2 - fr / 2), z), '#aab0ba', 'metal');
          add(UNIT_BOX, D(fr, w, t * 1.7), P(mid + sg * (L / 2 - fr / 2), 0, z), '#aab0ba', 'metal');
        });
        if (i > 0) {
          const hingeAt = from + dir * (i * (L + gap) - gap / 2);
          const p = P(hingeAt, 0, z);
          B.cyl(0.008, w * 0.92, axis === 'y' ? 'x' : 'y', p[0], p[1], p[2], '#8f96a2');
        }
      }
      if (boom) {
        const p = P(from + (dir * total) / 2, 0, z - t * 2.6);
        B.cyl(0.006, total, axis, p[0], p[1], p[2], '#8f96a2');
      }
    },
  };
  return B;
}

function detailParts(kind) {
  const B = makeDetailBuilder();
  const SIDES = [-1, 1];
  switch (kind) {
    case 'comms': {
      B.box(0.3, 0.3, 0.36, 0, 0, 0, GOLD);
      B.box(0.31, 0.31, 0.04, 0, 0, 0.12, '#b8922f');
      B.box(0.31, 0.31, 0.02, 0, 0, -0.12, '#b8922f');
      SIDES.forEach(sx => {
        B.box(0.012, 0.26, 0.3, sx * 0.156, 0, 0, '#eef1f5', 'paint'); // radiator
        for (let i = 0; i < 6; i += 1) B.box(0.016, 0.26, 0.005, sx * 0.158, 0, -0.13 + i * 0.052, '#8f98a6');
        B.wing({ axis: 'y', from: sx * 0.17, to: sx * 0.7, w: 0.34, segs: 3 });
        B.cyl(0.01, 0.2, 'x', sx * 0.25, 0, -0.09, '#9aa3b0'); // reflector boom
        B.dish(0.17, sx * 0.4, 0, -0.1, '#eceff3');
        B.cyl(0.004, 0.2, 'z', sx * 0.4, 0, -0.22, '#9aa3b0'); // feed pole
        B.cone(0.025, 0.05, 'z', 1, sx * 0.4, 0, -0.32, '#c9cdd4');
        B.cyl(0.004, 0.2, 'z', sx * 0.1, 0.1, 0.3, '#aab1bc'); // TT&C whips
      });
      B.box(0.22, 0.22, 0.012, 0, 0, -0.186, '#cfd4db', 'paint');
      [-0.07, 0, 0.07].forEach(a => [-0.06, 0.06].forEach(b => B.cone(0.028, 0.07, 'z', -1, a, b, -0.2, '#dfe3e8', 'paint')));
      B.cyl(0.07, 0.04, 'z', 0, 0, 0.205, '#555c66');
      B.cone(0.055, 0.09, 'z', 1, 0, 0, 0.27, '#3a3f47'); // apogee motor nozzle
      B.box(0.05, 0.05, 0.05, 0.08, -0.1, 0.2, '#222831', 'paint');
      B.cyl(0.025, 0.06, 'z', 0.08, -0.1, 0.26, '#111418', 'paint');
      break;
    }
    case 'starlink': {
      B.box(0.46, 0.26, 0.034, 0, 0, 0, '#e4e7ec', 'paint'); // flat chassis
      B.box(0.43, 0.23, 0.008, 0, 0, -0.021, '#2b2f36', 'paint'); // phased-array face (nadir)
      for (let i = 1; i < 6; i += 1) B.box(0.43, 0.003, 0.002, 0, -0.115 + i * 0.0383, -0.026, '#454c57');
      for (let i = 1; i < 9; i += 1) B.box(0.003, 0.23, 0.002, -0.215 + i * 0.0478, 0, -0.026, '#454c57');
      B.cyl(0.012, 0.12, 'y', 0, 0.12, 0, '#9aa3b0'); // array yoke
      B.wing({ axis: 'y', from: 0.14, to: 1.24, w: 0.46, segs: 2, gap: 0.02, cell: 0.055 });
      B.cyl(0.03, 0.02, 'z', -0.12, -0.05, 0.027, '#8c929c'); // thruster
      B.cyl(0.018, 0.012, 'z', -0.12, -0.05, 0.04, '#222831');
      B.box(0.04, 0.04, 0.03, 0.15, -0.08, 0.032, '#222831', 'paint'); // star tracker
      B.cyl(0.014, 0.03, 'z', 0.15, -0.08, 0.05, '#0b0d10', 'paint');
      B.box(0.07, 0.02, 0.012, -0.05, 0, 0.022, '#7a808a');
      break;
    }
    case 'nav': {
      B.box(0.26, 0.26, 0.3, 0, 0, 0, '#cdb779');
      B.box(0.27, 0.27, 0.03, 0, 0, 0.11, '#b99a45');
      B.box(0.27, 0.27, 0.02, 0, 0, -0.1, '#b99a45');
      SIDES.forEach(sx => {
        B.wing({ axis: 'y', from: sx * 0.15, to: sx * 0.6, w: 0.26, segs: 3 });
        B.cyl(0.01, 0.14, 'z', sx * 0.09, 0.09, 0.26, '#aab1bc');
      });
      B.box(0.22, 0.22, 0.02, 0, 0, -0.17, '#f1f3f6', 'paint'); // nadir antenna plate
      for (let i = 0; i < 12; i += 1) B.cone(0.022, 0.05, 'z', -1, ((i % 4) - 1.5) * 0.05, (Math.floor(i / 4) - 1) * 0.06, -0.2, '#d8dce2', 'paint');
      B.box(0.07, 0.07, 0.01, 0, 0, 0.172, '#7f8a99'); // laser retroreflector
      B.box(0.04, 0.04, 0.03, -0.1, 0.1, 0.17, '#222831', 'paint');
      break;
    }
    case 'weather': {
      B.box(0.24, 0.24, 0.5, 0, 0, 0, '#c8ccd4');
      B.box(0.25, 0.25, 0.05, 0, 0, 0.2, '#b99a45');
      B.cyl(0.012, 0.14, 'y', 0, 0.1, -0.05, '#9aa3b0');
      B.wing({ axis: 'y', from: 0.14, to: 0.9, z: -0.05, w: 0.3, segs: 4 });
      B.box(0.18, 0.18, 0.14, 0, 0, -0.32, '#d8dbe1', 'paint'); // instrument module
      B.cyl(0.08, 0.16, 'z', 0, 0, -0.44, '#9aa0aa'); // telescope
      B.cyl(0.06, 0.012, 'z', 0, 0, -0.52, '#10141a', 'paint'); // aperture
      B.cyl(0.008, 0.3, 'x', -0.27, 0, 0.05, '#9aa3b0'); // side boom + antenna
      B.box(0.08, 0.1, 0.08, -0.44, 0, 0.05, '#d8dbe1', 'paint');
      B.dish(0.07, -0.44, 0, -0.01, '#f0f2f5');
      B.box(0.012, 0.22, 0.34, 0.13, 0, -0.02, '#f4f5f7', 'paint'); // radiator
      B.box(0.04, 0.04, 0.04, 0.05, -0.1, 0.27, '#222831', 'paint');
      break;
    }
    case 'cubesat': {
      B.box(0.1, 0.1, 0.3, 0, 0, 0, '#c4c8d0');
      SIDES.forEach(sx => SIDES.forEach(sy => B.box(0.012, 0.012, 0.31, sx * 0.05, sy * 0.05, 0, '#8e949e')));
      SIDES.forEach(sy => B.cells(0.08, 0.004, 0.26, 0, sy * 0.052, 0, 2, 6)); // body-mounted cells
      SIDES.forEach(sy => {
        B.wing({ axis: 'y', from: sy * 0.06, to: sy * 0.3, z: 0.1, w: 0.1, segs: 2, gap: 0.008, t: 0.008, fr: 0.005, cell: 0.04 });
        B.wing({ axis: 'y', from: sy * 0.06, to: sy * 0.3, z: -0.1, w: 0.1, segs: 2, gap: 0.008, t: 0.008, fr: 0.005, cell: 0.04 });
      });
      B.cyl(0.03, 0.03, 'z', 0, 0, -0.16, '#15181d', 'paint'); // camera
      B.cyl(0.02, 0.008, 'z', 0, 0, -0.178, '#0a1830', 'paint');
      B.box(0.07, 0.07, 0.006, 0, 0, 0.153, '#2e7d5b', 'paint'); // patch antenna
      B.box(0.26, 0.004, 0.004, 0, 0.04, 0.17, '#c9cdd4'); // UHF monopole
      break;
    }
    case 'station': {
      for (let i = 0; i < 4; i += 1) B.box(0.008, 1.1, 0.008, i % 2 ? 0.022 : -0.022, 0, i < 2 ? 0.022 : -0.022, '#c8ccd4'); // truss rails
      for (let i = 0; i <= 10; i += 1) {
        const y = -0.5 + i * 0.1;
        B.box(0.044, 0.006, 0.006, 0, y, 0.022, '#aab0ba');
        B.box(0.044, 0.006, 0.006, 0, y, -0.022, '#aab0ba');
        B.box(0.006, 0.006, 0.044, 0.022, y, 0, '#aab0ba');
        B.box(0.006, 0.006, 0.044, -0.022, y, 0, '#aab0ba');
      }
      [-0.58, -0.4, 0.4, 0.58].forEach(y => {
        B.wing({ axis: 'x', from: 0.03, to: 0.28, lat: y, w: 0.14, segs: 4, gap: 0.008, t: 0.01, cell: 0.04 });
        B.wing({ axis: 'x', from: -0.03, to: -0.28, lat: y, w: 0.14, segs: 4, gap: 0.008, t: 0.01, cell: 0.04 });
      });
      [[-0.2, 0.12, 0.045], [-0.06, 0.18, 0.05], [0.06, 0.1, 0.04], [0.18, 0.16, 0.05], [0.3, 0.1, 0.036]].forEach(([x, len, r]) => {
        B.cyl(r, len, 'x', x, 0, -0.07, '#e8eaee', 'paint'); // pressurised modules
        B.cyl(r * 1.1, 0.012, 'x', x + len / 2, 0, -0.07, '#9aa3b0');
      });
      B.cyl(0.03, 0.05, 'y', 0, 0.1, -0.07, '#e0e3e8', 'paint');
      B.sph(0.03, 0, 0, -0.125, '#e8eaee'); // dome-like observation module
      [-1, 1].forEach(sg => [0, 1, 2].forEach(i => B.box(0.01, 0.17, 0.07, 0, sg * 0.22, 0.04 + i * 0.075, '#f4f5f7', 'paint'))); // radiators
      B.cyl(0.007, 0.14, 'x', 0.1, 0, -0.14, '#d0d4da'); // robotic arm
      B.cyl(0.007, 0.12, 'z', 0.17, 0, -0.2, '#d0d4da');
      break;
    }
    default:
      B.sph(0.5, 0, 0, 0, '#b9c2d0');
  }
  return B.parts;
}

function disposeObject(obj) {
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach(mm => {
      Object.keys(mm).forEach(key => {
        const val = mm[key];
        if (val && val.isTexture) val.dispose();
      });
      mm.dispose();
    });
  });
}

// ---------------------------------------------------------------------------
// Procedural fallback textures (used when no local texture assets are given)
// ---------------------------------------------------------------------------
function createNoise(seed) {
  const rnd = mulberry32(seed);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) p[i] = base[i & 255];
  const fade = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const h = (x, y, z) => p[p[p[x & 255] + (y & 255)] + (z & 255)] / 255;
  function noise(x, y, z) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const zf = fade(z - zi);
    return lerp(
      lerp(lerp(h(xi, yi, zi), h(xi + 1, yi, zi), xf), lerp(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      lerp(lerp(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), lerp(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf
    );
  }
  return (x, y, z, oct = 5) => {
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i += 1) {
      sum += amp * noise(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  };
}

function buildProceduralTextures(w, h, withClouds) {
  const fbm = createNoise(1337);
  const mkCanvas = () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const dayC = mkCanvas();
  const nightC = mkCanvas();
  const cloudC = withClouds ? mkCanvas() : null;
  const dayImg = dayC.getContext('2d').createImageData(w, h);
  const nightImg = nightC.getContext('2d').createImageData(w, h);
  const cloudImg = cloudC ? cloudC.getContext('2d').createImageData(w, h) : null;
  const LAND = 0.53;

  for (let y = 0; y < h; y += 1) {
    const lat = (0.5 - (y + 0.5) / h) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    const absLat = Math.abs(lat) / DEG;
    const ice = smoothstep(64, 80, absLat);
    for (let x = 0; x < w; x += 1) {
      const lng = ((x + 0.5) / w - 0.5) * 2 * Math.PI;
      const px = cl * Math.cos(lng);
      const py = sl;
      const pz = -cl * Math.sin(lng);
      const n = fbm(px * 1.6 + 3, py * 1.6, pz * 1.6, 5);
      const o = (y * w + x) * 4;
      let r;
      let g;
      let b;
      let nr = 0.008;
      let ng = 0.014;
      let nb = 0.035;

      if (n < LAND) {
        const d = clamp((LAND - n) / 0.14, 0, 1);
        r = 0.05 - 0.04 * d;
        g = 0.36 - 0.29 * d;
        b = 0.56 - 0.36 * d;
      } else {
        const e = clamp((n - LAND) / 0.12, 0, 1);
        const m = fbm(px * 3 + 9, py * 3, pz * 3, 4);
        const dry = smoothstep(0.42, 0.55, 1 - m);
        r = 0.16 + (0.74 - 0.16) * dry;
        g = 0.36 + (0.64 - 0.36) * dry;
        b = 0.15 + (0.42 - 0.15) * dry;
        const mt = smoothstep(0.55, 1, e);
        r += (0.46 - r) * mt;
        g += (0.42 - g) * mt;
        b += (0.38 - b) * mt;
        if (absLat < 62) {
          const dens = fbm(px * 5 + 40, py * 5, pz * 5, 3);
          const city = fbm(px * 28, py * 28, pz * 28, 2);
          const lit = smoothstep(0.6, 0.78, city) * smoothstep(0.45, 0.6, dens);
          nr += 1.0 * lit;
          ng += 0.72 * lit;
          nb += 0.38 * lit;
        }
      }
      r += (0.94 - r) * ice;
      g += (0.96 - g) * ice;
      b += (0.99 - b) * ice;

      dayImg.data[o] = clamp(r, 0, 1) * 255;
      dayImg.data[o + 1] = clamp(g, 0, 1) * 255;
      dayImg.data[o + 2] = clamp(b, 0, 1) * 255;
      dayImg.data[o + 3] = 255;
      nightImg.data[o] = clamp(nr, 0, 1) * 255;
      nightImg.data[o + 1] = clamp(ng, 0, 1) * 255;
      nightImg.data[o + 2] = clamp(nb, 0, 1) * 255;
      nightImg.data[o + 3] = 255;

      if (cloudImg) {
        const c = smoothstep(0.52, 0.72, fbm(px * 2.6 + 20, py * 2.6, pz * 2.6, 5));
        cloudImg.data[o] = c * 235;
        cloudImg.data[o + 1] = c * 235;
        cloudImg.data[o + 2] = c * 235;
        cloudImg.data[o + 3] = 255;
      }
    }
  }
  dayC.getContext('2d').putImageData(dayImg, 0, 0);
  nightC.getContext('2d').putImageData(nightImg, 0, 0);
  if (cloudC) cloudC.getContext('2d').putImageData(cloudImg, 0, 0);
  return {
    day: new THREE.CanvasTexture(dayC),
    night: new THREE.CanvasTexture(nightC),
    clouds: cloudC ? new THREE.CanvasTexture(cloudC) : null,
    procedural: true,
  };
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => reject(new Error(`Texture failed: ${url}`)));
  });
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------
const SURFACE_VERT = `
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const EARTH_FRAG = `
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D normalMap;
uniform sampler2D specMap; uniform sampler2D cloudMap;
uniform vec3 sunDir; uniform float hasNormal; uniform float hasSpec; uniform float cloudShadow;
uniform float cloudU; uniform float normalStrength;
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  vec3 g = normalize(vN);
  vec3 n = g;
  if (hasNormal > 0.5) {
    // Analytic east/north tangent frame: Earth is fixed, north = +Y, u increases eastward.
    vec3 t = normalize(vec3(g.z, 0.0, -g.x) + vec3(1e-5, 0.0, 0.0));
    vec3 b = cross(g, t);
    vec3 m = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    m.xy *= normalStrength;
    n = normalize(t * m.x + b * m.y + g * m.z);
  }
  vec3 s = normalize(sunDir);
  vec3 v = normalize(vView);
  float lg = dot(g, s);
  float ln = dot(n, s);
  float dayMix = smoothstep(-0.12, 0.18, lg);
  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb;
  float spec = hasSpec > 0.5 ? texture2D(specMap, vUv).r : clamp((day.b - day.r * 1.4) * 3.0, 0.0, 1.0);
  float cs = 0.0;
  if (cloudShadow > 0.5) cs = texture2D(cloudMap, vec2(vUv.x + cloudU, vUv.y)).r;
  float diffuse = max(mix(lg, ln, 0.85), 0.0);
  vec3 lit = day * (0.05 + 0.95 * diffuse) * (1.0 - cs * 0.4);
  vec3 col = mix(night * 1.2 * (1.0 - cs * 0.5), lit, dayMix);
  float tw = smoothstep(-0.18, 0.0, lg) * (1.0 - smoothstep(0.0, 0.22, lg));
  col += vec3(0.5, 0.22, 0.08) * tw * 0.1;
  vec3 hv = normalize(s + v);
  float nh = max(dot(n, hv), 0.0);
  float glint = (pow(nh, 80.0) * 0.55 + pow(nh, 14.0) * 0.07) * spec * step(0.0, lg) * (1.0 - cs);
  col += vec3(1.0, 0.95, 0.85) * glint;
  float fr = pow(1.0 - max(dot(g, v), 0.0), 3.0);
  float dusk = (1.0 - smoothstep(0.0, 0.35, lg)) * smoothstep(-0.25, 0.05, lg);
  vec3 scat = mix(vec3(0.15, 0.35, 0.85), vec3(0.9, 0.45, 0.2), dusk);
  col += scat * fr * (0.15 + 0.85 * dayMix) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const CLOUD_FRAG = `
uniform sampler2D cloudMap; uniform vec3 sunDir; uniform float cloudU;
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  float a = texture2D(cloudMap, vec2(vUv.x + cloudU, vUv.y)).r;
  vec3 n = normalize(vN);
  float l = dot(n, normalize(sunDir));
  float lit = 0.05 + 0.95 * smoothstep(-0.1, 0.3, l);
  float edge = pow(1.0 - max(dot(n, normalize(vView)), 0.0), 2.0);
  vec3 tint = mix(vec3(1.0), vec3(1.0, 0.82, 0.7), (1.0 - smoothstep(0.0, 0.25, l)) * 0.6);
  gl_FragColor = vec4(tint * lit, clamp(a * (0.9 + edge * 0.2), 0.0, 1.0));
}`;

const ATMO_VERT = `
varying vec3 vN; varying vec3 vW;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = normalize(mat3(modelMatrix) * position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMO_FRAG = `
uniform vec3 sunDir; uniform float fade;
varying vec3 vN; varying vec3 vW;
void main(){
  float a = clamp(-dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
  float i = pow(clamp(a / 0.34, 0.0, 1.0), 1.7);
  float sun = 0.3 + 0.7 * smoothstep(-0.35, 0.45, dot(vW, normalize(sunDir)));
  float twl = 1.0 - smoothstep(0.0, 0.22, abs(dot(vW, normalize(sunDir))));
  vec3 base = mix(vec3(0.24, 0.52, 1.0), vec3(1.0, 0.5, 0.25), twl * 0.55);
  gl_FragColor = vec4(base * i * sun * 1.15, i * sun) * fade;
}`;

// ---------------------------------------------------------------------------
// GlobeEngine: pure Three.js, no React
// ---------------------------------------------------------------------------
// <motion-tracker>
// Smooth motion for the SELECTED satellite only. Pure JS (no Three.js) so it can be unit tested.
// Samples arrive at irregular times; we extrapolate along the measured velocity and blend away any
// disagreement when the next sample lands, so there is no steady-state lag behind the true position.
const MOTION_MAX_EXTRAP_S = 2.5; // never extrapolate further than this (stale / missing updates)
const MOTION_ERR_TAU_S = 0.12; // how quickly a correction is blended in
const MOTION_TELEPORT = 0.25; // jumps larger than this (Earth radii) snap instead of blending

function sampleTimeMs(sat, fallbackMs) {
  let t = sat ? Number(sat.timestamp) : NaN;
  if (!Number.isFinite(t) && sat && typeof sat.telemetryTime === 'string') t = Date.parse(sat.telemetryTime);
  if (!Number.isFinite(t) || Math.abs(t - fallbackMs) > 5000) return fallbackMs; // unreliable: use arrival time
  return t;
}

class MotionTracker {
  constructor() {
    this.has = false;
    this.hasVel = false;
    this.t1 = 0;
    this.p1 = [0, 0, 0];
    this.vel = [0, 0, 0];
    this.err = [0, 0, 0];
    this.disp = [0, 0, 0];
    this.bx = [1, 0, 0];
    this.by = [0, 1, 0];
    this.bz = [0, 0, 1];
  }

  reset() {
    this.has = false;
    this.hasVel = false;
  }

  setHint(x, y, z) {
    this.bx[0] = x;
    this.bx[1] = y;
    this.bx[2] = z;
  }

  setVelocity(x, y, z) {
    this.vel[0] = x;
    this.vel[1] = y;
    this.vel[2] = z;
    this.hasVel = true;
  }

  init(x, y, z, ts) {
    this.p1[0] = x;
    this.p1[1] = y;
    this.p1[2] = z;
    this.t1 = ts;
    this.vel[0] = 0;
    this.vel[1] = 0;
    this.vel[2] = 0;
    this.hasVel = false;
    this.err[0] = 0;
    this.err[1] = 0;
    this.err[2] = 0;
    this.disp[0] = x;
    this.disp[1] = y;
    this.disp[2] = z;
    this.has = true;
  }

  // Returns true when the sample was used (duplicates / out-of-order samples are ignored).
  push(x, y, z, ts, nowMs) {
    if (!this.has) {
      this.init(x, y, z, ts);
      return true;
    }
    if (ts <= this.t1 + 1) return false;
    const dt = (ts - this.t1) / 1000;
    const dx = x - this.p1[0];
    const dy = y - this.p1[1];
    const dz = z - this.p1[2];
    if (dt > 30 || Math.hypot(dx, dy, dz) > MOTION_TELEPORT) {
      this.init(x, y, z, ts);
      return true;
    }
    // Where the old curve puts the satellite right now (the last evaluate may be up to one frame old).
    const ageOld = Math.max(0, Math.min(MOTION_MAX_EXTRAP_S, (nowMs - this.t1) / 1000));
    const cx = this.p1[0] + this.vel[0] * ageOld + this.err[0];
    const cy = this.p1[1] + this.vel[1] * ageOld + this.err[1];
    const cz = this.p1[2] + this.vel[2] * ageOld + this.err[2];
    const k = this.hasVel ? 0.7 : 1;
    this.vel[0] += (dx / dt - this.vel[0]) * k;
    this.vel[1] += (dy / dt - this.vel[1]) * k;
    this.vel[2] += (dz / dt - this.vel[2]) * k;
    this.hasVel = true;
    const age = Math.max(0, Math.min(MOTION_MAX_EXTRAP_S, (nowMs - ts) / 1000));
    this.err[0] = cx - (x + this.vel[0] * age);
    this.err[1] = cy - (y + this.vel[1] * age);
    this.err[2] = cz - (z + this.vel[2] * age);
    this.p1[0] = x;
    this.p1[1] = y;
    this.p1[2] = z;
    this.t1 = ts;
    return true;
  }

  evaluate(nowMs, dt) {
    if (!this.has) return false;
    const age = Math.max(0, Math.min(MOTION_MAX_EXTRAP_S, (nowMs - this.t1) / 1000));
    const decay = Math.exp(-dt / MOTION_ERR_TAU_S);
    for (let i = 0; i < 3; i += 1) {
      this.err[i] *= decay;
      this.disp[i] = this.p1[i] + this.vel[i] * age + this.err[i];
    }
    const pl = Math.hypot(this.disp[0], this.disp[1], this.disp[2]) || 1;
    const zx = this.disp[0] / pl;
    const zy = this.disp[1] / pl;
    const zz = this.disp[2] / pl;
    // Heading = tangential part of the velocity; keep the previous heading if the satellite is ~still.
    let vx = this.vel[0];
    let vy = this.vel[1];
    let vz = this.vel[2];
    let dn = vx * zx + vy * zy + vz * zz;
    vx -= dn * zx;
    vy -= dn * zy;
    vz -= dn * zz;
    let vl = Math.hypot(vx, vy, vz);
    if (vl <= 1e-9) {
      vx = this.bx[0];
      vy = this.bx[1];
      vz = this.bx[2];
      dn = vx * zx + vy * zy + vz * zz;
      vx -= dn * zx;
      vy -= dn * zy;
      vz -= dn * zz;
      vl = Math.hypot(vx, vy, vz);
    }
    if (vl <= 1e-6) {
      vx = zz;
      vy = 0;
      vz = -zx;
      vl = Math.hypot(vx, vz);
      if (vl < 1e-6) {
        vx = 1;
        vz = 0;
        vl = 1;
      }
    }
    this.bx[0] = vx / vl;
    this.bx[1] = vy / vl;
    this.bx[2] = vz / vl;
    this.bz[0] = zx;
    this.bz[1] = zy;
    this.bz[2] = zz;
    this.by[0] = zy * this.bx[2] - zz * this.bx[1];
    this.by[1] = zz * this.bx[0] - zx * this.bx[2];
    this.by[2] = zx * this.bx[1] - zy * this.bx[0];
    return true;
  }
}
// </motion-tracker>

function isValidSubject(subject) {
  return Boolean(subject) && typeof subject.getEntities === 'function';
}

class GlobeEngine {
  constructor(container, opts) {
    this.container = container;
    this.cb = opts.callbacks || {};
    this.textureUrls = opts.textureUrls || null;
    this.assetBase = opts.assetBase || '/globe-lab';
    this.tierRequest = opts.textureTier || 'auto';
    this.modelUrls = opts.modelUrls || null;
    this.normalStrength = Number.isFinite(opts.normalScale) ? opts.normalScale : 1;
    this.cloudUniform = { value: 0 };
    this.detail = null;
    this.detailToken = 0;
    this.detailCache = new Map();
    this.assetInfo = null;
    this.lowTier = opts.quality === 'low' || (opts.quality !== 'high' && detectLowTier());
    this.maxDpr = this.lowTier ? 1.5 : 2;
    this.detailEnabled = opts.detailedModels === true || (opts.detailedModels !== false && !this.lowTier);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.targetDpr = this.dpr;
    this.calmClock = 0;
    this.dprDropAt = -1e9;

    this.disposed = false;
    this.raf = 0;
    this.inView = true;
    this.contextLost = false;
    this.ready = false;
    this.last = 0;
    this.following = false;
    this.tween = null;
    this.ticker = null;
    this.tickAcc = 0;
    this.sunClock = 0;
    this.frames = 0;
    this.statClock = 0;
    this.slowClock = 0;
    this.emaDt = 0.016;
    this.disposables = [];
    this.groups = {};
    this.order = [];
    this.slotCat = new Uint8Array(0);
    this.slotIdx = new Uint32Array(0);
    this.idMap = new Map();
    this.selected = null; // { k, idx }
    this.markerScale = 1;
    this.appliedScale = 1;
    this.pointers = new Set();
    this.gesture = null;
    this.lastTap = null;
    this.sun = new THREE.Vector3(1, 0, 0);
    this._v = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._qi = new THREE.Quaternion();
    this._ray = new THREE.Raycaster();
    this._v2 = new THREE.Vector3();
    this._off = new THREE.Vector3();
    this._sel = new THREE.Vector3();
    this._bx = new THREE.Vector3();
    this._by = new THREE.Vector3();
    this._bz = new THREE.Vector3();
    this._m4 = new THREE.Matrix4();
    this._qf = new THREE.Quaternion();
    this._qd = new THREE.Quaternion();
    this._qinv = new THREE.Quaternion();
    this.motion = new MotionTracker();
    this.subject = null; // currently attached GlobeSubject handle (see attachSubject)
    this.typeOf = resolveKind; // entity -> render type key; a subject may override via resolveType
    this.layoutVersion = 0; // bumped when typeOf changes so the slots are rebuilt
    this.slotVersion = 0;
    this.followState = { engage: 0, wantDist: 0, hasPrev: false, prevQ: new THREE.Quaternion() };
    this.envRT = null;
    this.envTex = null;
    this.envSun = null;
    this.detailMats = null;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);

    // Throws when WebGL is unavailable; the React layer shows a fallback.
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.lowTier,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.renderer.setClearColor(0x02040a, 1);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'stge-canvas';
    container.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.02, 300);
    llToVec(INITIAL_VIEW.lat, INITIAL_VIEW.lng, INITIAL_VIEW.distance, this.camera.position);

    this.controls = new OrbitControls(this.camera, this.canvas);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.09,
      minDistance: 1.06,
      maxDistance: 14,
      zoomSpeed: 0.7,
      panSpeed: 0.6,
      screenSpacePanning: true,
      enablePan: true,
      autoRotateSpeed: 0.45,
    });
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.onControlStart = () => {
      // A release/reset glide is allowed to finish; any other tween is cancelled by the user.
      // Following is NOT cancelled by rotate/zoom: the camera orbits the satellite instead.
      if (this.tween && !this.tween.lock) this.tween = null;
    };
    this.controls.addEventListener('start', this.onControlStart);

    this.buildStars();
    this.buildAtmosphere();
    this.buildSatelliteGroups();
    this.buildSelectionRing();

    this.onLost = e => {
      e.preventDefault();
      this.contextLost = true;
      this.stop();
      if (this.cb.onContextLost) this.cb.onContextLost();
    };
    this.onRestored = () => {
      this.contextLost = false;
      if (this.cb.onContextRestored) this.cb.onContextRestored();
    };
    this.onVisibility = () => this.requestRun();
    this.canvas.addEventListener('webglcontextlost', this.onLost);
    this.canvas.addEventListener('webglcontextrestored', this.onRestored);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.refreshSun();
    this.requestRun();
  }

  // ----- scene construction -------------------------------------------------
  track(obj) {
    this.disposables.push(obj);
    return obj;
  }

  buildStars() {
    const n = this.lowTier ? 1500 : 3500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const rnd = mulberry32(7);
    for (let i = 0; i < n; i += 1) {
      const u = rnd() * 2 - 1;
      const a = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = 120 * s * Math.cos(a);
      pos[i * 3 + 1] = 120 * u;
      pos[i * 3 + 2] = 120 * s * Math.sin(a);
      const b = 0.4 + rnd() * 0.6;
      col[i * 3] = b * (0.85 + 0.15 * rnd());
      col[i * 3 + 1] = b * 0.92;
      col[i * 3 + 2] = b;
    }
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = this.track(
      new THREE.PointsMaterial({
        size: 1.4,
        sizeAttenuation: false,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
    );
    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  buildAtmosphere() {
    const geo = this.track(new THREE.SphereGeometry(1.06, 64, 48));
    this.atmoMat = this.track(
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        uniforms: { sunDir: { value: this.sun }, fade: { value: 1 } },
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      })
    );
    this.atmosphere = new THREE.Mesh(geo, this.atmoMat);
    this.atmosphere.visible = false; // shown once the Earth exists
    this.scene.add(this.atmosphere);
  }

  refreshSun() {
    sunDirection(new Date(), this.sun);
    if (this.sunLight) this.sunLight.position.copy(this.sun).multiplyScalar(10);
  }

  buildEarth(tex) {
    this.textures = tex;
    const maps = ['day', 'night', 'normal', 'spec', 'clouds'].filter(n => tex[n]);
    this.assetInfo = { source: tex.procedural ? 'procedural' : 'local', tier: tex.tier || null, maps };
    const aniso = Math.min(this.lowTier ? 4 : 16, this.renderer.capabilities.getMaxAnisotropy());
    const dummyTex = this.track(new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
    dummyTex.needsUpdate = true;
    ['day', 'night', 'normal', 'spec', 'clouds'].forEach(n => {
      const t = tex[n];
      if (!t) return;
      t.anisotropy = aniso;
      if (n === 'clouds') t.wrapS = THREE.RepeatWrapping;
      this.track(t);
      // Upload now (behind the loading overlay) instead of hitching the first frame.
      if (this.renderer.initTexture) this.renderer.initTexture(t);
    });
    const seg = this.lowTier ? 64 : 128;
    const geo = this.track(new THREE.SphereGeometry(1, seg, Math.floor(seg * 0.75)));
    const useCloudShadow = tex.clouds && !this.lowTier ? 1 : 0;
    this.earthUniforms = {
      dayMap: { value: tex.day },
      nightMap: { value: tex.night || dummyTex },
      normalMap: { value: tex.normal || dummyTex },
      specMap: { value: tex.spec || dummyTex },
      cloudMap: { value: tex.clouds || dummyTex },
      sunDir: { value: this.sun },
      hasNormal: { value: tex.normal ? 1 : 0 },
      hasSpec: { value: tex.spec ? 1 : 0 },
      cloudShadow: { value: useCloudShadow },
      cloudU: this.cloudUniform,
      normalStrength: { value: this.normalStrength },
    };
    const mat = this.track(
      new THREE.ShaderMaterial({ vertexShader: SURFACE_VERT, fragmentShader: EARTH_FRAG, uniforms: this.earthUniforms })
    );
    this.earth = new THREE.Mesh(geo, mat);
    this.scene.add(this.earth);

    if (tex.clouds) {
      const cmat = this.track(
        new THREE.ShaderMaterial({
          vertexShader: SURFACE_VERT,
          fragmentShader: CLOUD_FRAG,
          uniforms: { cloudMap: { value: tex.clouds }, sunDir: { value: this.sun }, cloudU: this.cloudUniform },
          transparent: true,
          depthWrite: false,
        })
      );
      this.clouds = new THREE.Mesh(geo, cmat);
      this.clouds.scale.setScalar(1.006);
      this.scene.add(this.clouds);
    }
    this.atmosphere.visible = true;
  }

  setNormalScale(v) {
    this.normalStrength = v;
    if (this.earthUniforms) this.earthUniforms.normalStrength.value = v;
  }

  buildSatelliteGroups() {
    // Background fleet: one shared lit material, one baked geometry per kind, one InstancedMesh per kind.
    const level = this.lowTier ? 0 : 1;
    this.satMaterial = this.track(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1b2433 }));
    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.scene.add(this.ambient, this.sunLight);
    KIND_KEYS.forEach(k => {
      const geometry = this.track(bakeKind(k, level));
      this.groups[k] = {
        k,
        geometry,
        mesh: null,
        cap: 0,
        count: 0,
        pos: new Float32Array(0),
        basis: new Float32Array(0),
        has: new Uint8Array(0),
        sats: [],
      };
    });
  }

  buildSelectionRing() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.stroke();
    const map = this.track(new THREE.CanvasTexture(c));
    const mat = this.track(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    this.ring = new THREE.Sprite(mat);
    this.ring.visible = false;
    this.ring.renderOrder = 5;
    this.scene.add(this.ring);

    this.pathMat = this.track(new THREE.LineBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.6 }));
    this.pathLine = null;

    // Stand-in for the selected satellite when no detailed model is shown: one ordinary mesh,
    // positioned from the interpolated motion (the instanced copy is hidden).
    this.selMarker = new THREE.Mesh(this.track(new THREE.BufferGeometry()), this.satMaterial);
    this.selMarker.matrixAutoUpdate = false;
    this.selMarker.visible = false;
    this.selMarker.frustumCulled = false;
    this.scene.add(this.selMarker);
  }

  // ----- Earth assets -------------------------------------------------------
  pickTier() {
    const req = this.tierRequest;
    if (req && req !== 'auto' && TIER_SPECS[req]) return req;
    return this.lowTier ? 'low' : 'medium';
  }

  async loadEarthAssets() {
    const base = `${this.assetBase.replace(/\/$/, '')}/earth`;
    const explicit = this.textureUrls;
    const maxTex = this.renderer.capabilities.maxTextureSize || 4096;
    const optional = ['night', 'normal', 'spec', 'clouds'];

    const attempt = async (urlOf, tier) => {
      const day = await loadTexture(urlOf('day')); // required; throws if missing
      const rest = await Promise.all(
        optional.map(n => {
          const u = urlOf(n);
          return u ? loadTexture(u).catch(() => null) : Promise.resolve(null);
        })
      );
      return { day, night: rest[0], normal: rest[1], spec: rest[2], clouds: rest[3], tier, procedural: false };
    };

    if (explicit && explicit.day) {
      try {
        return await attempt(n => explicit[n] || null, 'custom');
      } catch (error) {
        console.warn('[SpaceTecGlobeEngine] custom textureUrls failed, trying local tiers', error);
      }
    }
    const req = this.pickTier();
    const chain = TIER_ORDER.slice(TIER_ORDER.indexOf(req)).filter(t => maxTex >= TIER_MIN_TEXTURE[t]);
    for (const tier of chain) {
      const spec = TIER_SPECS[tier];
      try {
        return await attempt(n => `${base}/earth_${n}_${spec[n]}.jpg`, tier);
      } catch (error) {
        console.warn(`[SpaceTecGlobeEngine] Earth ${tier} textures not found in ${base}`);
      }
    }
    return null;
  }

  async init() {
    await new Promise(r => setTimeout(r, 30)); // let the loading state paint first
    let tex = null;
    try {
      tex = await this.loadEarthAssets();
    } catch (error) {
      console.warn('[SpaceTecGlobeEngine] Earth asset loading failed', error);
    }
    if (this.disposed) {
      if (tex) [tex.day, tex.night, tex.normal, tex.spec, tex.clouds].forEach(t => t && t.dispose());
      return;
    }
    if (!tex) {
      const w = this.lowTier ? 512 : 1024;
      tex = buildProceduralTextures(w, w / 2, !this.lowTier);
    }
    if (this.disposed) return;
    this.buildEarth(tex);
    this.ready = true;
    this.requestRun();
  }

  // ----- satellite data ---------------------------------------------------
  setSatellites(list) {
    if (this.disposed) return;
    const src = Array.isArray(list) ? list : [];
    let same = src.length === this.order.length && this.slotVersion === this.layoutVersion;
    for (let i = 0; same && i < src.length; i += 1) {
      const a = src[i];
      const b = this.order[i];
      if (a.id !== b.id || a.category !== b.category || a.kind !== b.kind) same = false;
    }
    if (!same) this.rebuildSlots(src);
    this.order = src;
    this.writePositions();
  }

  rebuildSlots(src) {
    this.slotVersion = this.layoutVersion;
    const counts = {};
    KIND_KEYS.forEach(k => {
      counts[k] = 0;
    });
    const n = src.length;
    this.slotCat = new Uint8Array(n);
    this.slotIdx = new Uint32Array(n);
    this.idMap = new Map();
    const kindIndex = {};
    KIND_KEYS.forEach((k, i) => {
      kindIndex[k] = i;
    });
    for (let i = 0; i < n; i += 1) {
      let k = this.typeOf(src[i]);
      if (!(k in kindIndex)) k = 'generic'; // unknown render types fall back to the generic marker
      this.slotCat[i] = kindIndex[k];
      this.slotIdx[i] = counts[k];
      this.idMap.set(String(src[i].id), { k, idx: counts[k] });
      counts[k] += 1;
    }
    KIND_KEYS.forEach(k => {
      const g = this.groups[k];
      g.count = counts[k];
      g.sats = new Array(counts[k]);
      if (counts[k] > g.cap) {
        if (g.mesh) {
          this.scene.remove(g.mesh);
          if (g.mesh.dispose) g.mesh.dispose();
        }
        g.cap = Math.max(64, Math.ceil(counts[k] * 1.25));
        g.mesh = new THREE.InstancedMesh(g.geometry, this.satMaterial, g.cap);
        g.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        g.mesh.frustumCulled = false; // one huge bounding sphere; per-instance culling is not available
        this.scene.add(g.mesh);
        g.pos = new Float32Array(g.cap * 3);
        g.basis = new Float32Array(g.cap * 9);
        g.has = new Uint8Array(g.cap);
      } else {
        g.has.fill(0); // slots were reassigned: previous positions no longer belong to the same satellite
      }
      if (g.mesh) g.mesh.count = counts[k];
    });
    if (this.selected) {
      const prev = this.selected.id;
      const hit = this.idMap.get(String(prev));
      const kindChanged = hit && hit.k !== this.selected.k;
      this.selected = hit ? { ...hit, id: prev } : null;
      if (!hit) {
        this.ring.visible = false;
        this.hideDetail();
      } else if (kindChanged) {
        this.showDetail(hit.k);
      }
    }
  }

  writePositions() {
    const src = this.order;
    const v = this._v;
    const selK = this.selected ? this.selected.k : null;
    const selIdx = this.selected ? this.selected.idx : -1;
    const scales = {};
    KIND_KEYS.forEach(k => {
      scales[k] = KINDS[k].size * this.markerScale;
    });
    for (let i = 0; i < src.length; i += 1) {
      const sat = src[i];
      const k = KIND_KEYS[this.slotCat[i]];
      const g = this.groups[k];
      const idx = this.slotIdx[i];
      const r = 1 + Math.max(0, Number(sat.altitudeKm) || 0) / EARTH_KM;
      llToVec(Number(sat.lat) || 0, Number(sat.lng) || 0, r, v);
      const p = idx * 3;
      const b = idx * 9;
      const zl = v.length() || 1;
      const zx = v.x / zl;
      const zy = v.y / zl;
      const zz = v.z / zl;

      // Along-track direction from the movement since the previous update (tangential part only).
      let dx = 0;
      let dy = 0;
      let dz = 0;
      let ok = false;
      if (g.has[idx]) {
        dx = v.x - g.pos[p];
        dy = v.y - g.pos[p + 1];
        dz = v.z - g.pos[p + 2];
        const dn = dx * zx + dy * zy + dz * zz;
        dx -= dn * zx;
        dy -= dn * zy;
        dz -= dn * zz;
        const dl = Math.hypot(dx, dy, dz);
        if (dl > 1e-7) {
          dx /= dl;
          dy /= dl;
          dz /= dl;
          ok = true;
        }
      }
      if (!ok && g.has[idx]) {
        // Not moving enough to tell: keep the previous heading, re-orthogonalised to the new radial.
        dx = g.basis[b];
        dy = g.basis[b + 1];
        dz = g.basis[b + 2];
        const dn = dx * zx + dy * zy + dz * zz;
        dx -= dn * zx;
        dy -= dn * zy;
        dz -= dn * zz;
        const dl = Math.hypot(dx, dy, dz);
        if (dl > 1e-6) {
          dx /= dl;
          dy /= dl;
          dz /= dl;
          ok = true;
        }
      }
      if (!ok) {
        // First sample: face east until real motion is seen.
        dx = zz;
        dy = 0;
        dz = -zx;
        const dl = Math.hypot(dx, dz);
        if (dl < 1e-6) {
          dx = 1;
          dz = 0;
        } else {
          dx /= dl;
          dz /= dl;
        }
      }
      const yx = zy * dz - zz * dy;
      const yy = zz * dx - zx * dz;
      const yz = zx * dy - zy * dx;

      g.basis[b] = dx; g.basis[b + 1] = dy; g.basis[b + 2] = dz;
      g.basis[b + 3] = yx; g.basis[b + 4] = yy; g.basis[b + 5] = yz;
      g.basis[b + 6] = zx; g.basis[b + 7] = zy; g.basis[b + 8] = zz;
      g.pos[p] = v.x;
      g.pos[p + 1] = v.y;
      g.pos[p + 2] = v.z;
      g.has[idx] = 1;
      g.sats[idx] = sat;

      const a = g.mesh.instanceMatrix.array;
      const o = idx * 16;
      const s = scales[k];
      a[o] = dx * s; a[o + 1] = dy * s; a[o + 2] = dz * s; a[o + 3] = 0;
      a[o + 4] = yx * s; a[o + 5] = yy * s; a[o + 6] = yz * s; a[o + 7] = 0;
      a[o + 8] = zx * s; a[o + 9] = zy * s; a[o + 10] = zz * s; a[o + 11] = 0;
      a[o + 12] = v.x; a[o + 13] = v.y; a[o + 14] = v.z; a[o + 15] = 1;
      if (idx === selIdx && k === selK) this.pushSelSample(sat, v, g, b);
    }
    this.hideSelectedInstance();
    this.appliedScale = this.markerScale;
    KIND_KEYS.forEach(k => {
      const g = this.groups[k];
      if (g.mesh) g.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  rescaleMarkers() {
    KIND_KEYS.forEach(k => {
      const g = this.groups[k];
      if (!g.mesh) return;
      const s = KINDS[k].size * this.markerScale;
      const a = g.mesh.instanceMatrix.array;
      const bs = g.basis;
      for (let i = 0; i < g.count; i += 1) {
        const o = i * 16;
        const b = i * 9;
        a[o] = bs[b] * s; a[o + 1] = bs[b + 1] * s; a[o + 2] = bs[b + 2] * s;
        a[o + 4] = bs[b + 3] * s; a[o + 5] = bs[b + 4] * s; a[o + 6] = bs[b + 5] * s;
        a[o + 8] = bs[b + 6] * s; a[o + 9] = bs[b + 7] * s; a[o + 10] = bs[b + 8] * s;
      }
      g.mesh.instanceMatrix.needsUpdate = true;
    });
    this.hideSelectedInstance();
    this.appliedScale = this.markerScale;
  }

  // ----- detailed model for the selected satellite (lazy) -----------------
  hideDetail() {
    this.detailToken += 1;
    if (this.detail) {
      this.scene.remove(this.detail);
      this.detail = null;
    }
  }

  showDetail(kind) {
    this.hideDetail();
    if (!this.detailEnabled || kind === 'generic') return;
    const token = this.detailToken;
    this.getDetailModel(kind).then(
      obj => {
        if (this.disposed || token !== this.detailToken || !this.selected) return;
        this.ensureEnv(); // refresh reflections if the sun has moved a lot since they were built
        obj.matrixAutoUpdate = false;
        this.detail = obj;
        this.scene.add(obj);
      },
      error => console.warn('[SpaceTecGlobeEngine] detailed model failed', error)
    );
  }

  // Small space-like reflection environment (dark sky + a sun lobe) so metallic parts do not render black.
  ensureEnv() {
    const stale = this.envSun && this.envSun.angleTo(this.sun) > 0.15;
    if (this.envTex && !stale) return this.envTex;
    try {
      const geo = new THREE.SphereGeometry(10, 24, 16);
      const pos = geo.getAttribute('position');
      const col = new Float32Array(pos.count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 1) {
        v.fromBufferAttribute(pos, i).normalize();
        const sd = Math.max(0, v.dot(this.sun));
        const sunLobe = Math.pow(sd, 24) * 6 + Math.pow(sd, 3) * 0.35;
        const sky = 0.04 + 0.05 * (v.y * 0.5 + 0.5);
        col[i * 3] = sky * 0.7 + sunLobe;
        col[i * 3 + 1] = sky * 0.85 + sunLobe * 0.97;
        col[i * 3 + 2] = sky + sunLobe * 0.9;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
      const envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(geo, mat));
      const pm = new THREE.PMREMGenerator(this.renderer);
      const rt = pm.fromScene(envScene, 0.04);
      pm.dispose();
      geo.dispose();
      mat.dispose();
      const oldTex = this.envTex;
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.envTex = rt.texture;
      this.envSun = this.sun.clone();
      if (this.detailMats) {
        Object.values(this.detailMats).forEach(m => {
          m.envMap = this.envTex;
          m.needsUpdate = true;
        });
      }
      if (oldTex) {
        this.detailCache.forEach(obj =>
          obj.traverse(o => {
            const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
            mats.forEach(mm => {
              if (mm.envMap === oldTex) {
                mm.envMap = this.envTex;
                mm.needsUpdate = true;
              }
            });
          })
        );
      }
    } catch (error) {
      console.warn('[SpaceTecGlobeEngine] reflection map unavailable', error);
    }
    return this.envTex;
  }

  getDetailMaterials() {
    if (this.detailMats) return this.detailMats;
    const env = this.ensureEnv();
    const solar = this.track(makeSolarTexture(Math.min(8, this.renderer.capabilities.getMaxAnisotropy())));
    const common = { envMap: env || null, side: THREE.DoubleSide };
    this.detailMats = {
      metal: this.track(new THREE.MeshStandardMaterial({ ...common, vertexColors: true, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.1 })),
      paint: this.track(new THREE.MeshStandardMaterial({ ...common, vertexColors: true, metalness: 0.1, roughness: 0.55, envMapIntensity: 0.6 })),
      panel: this.track(
        new THREE.MeshStandardMaterial({ ...common, map: solar, metalness: 0.7, roughness: 0.28, envMapIntensity: 1.2, emissive: 0x08142a })
      ),
    };
    return this.detailMats;
  }

  buildProceduralDetail(kind) {
    const mats = this.getDetailMaterials();
    const parts = detailParts(kind);
    const factor = normFactor(kind); // same scale as the instanced silhouette
    const group = new THREE.Group();
    ['metal', 'paint', 'panel'].forEach(m => {
      const ps = parts.filter(p => p.mat === m);
      if (!ps.length) return;
      group.add(new THREE.Mesh(this.track(bakeParts(ps, factor, m === 'panel')), mats[m]));
    });
    return group;
  }

  async getDetailModel(kind) {
    if (this.detailCache.has(kind)) return this.detailCache.get(kind);
    let obj = null;
    const url = this.modelUrls && this.modelUrls[kind];
    if (url) {
      try {
        obj = await this.loadGltf(url);
      } catch (error) {
        console.warn(`[SpaceTecGlobeEngine] ${url} failed, using the built-in model`, error);
      }
    }
    if (!obj) obj = this.buildProceduralDetail(kind);
    if (this.disposed) return obj;
    this.detailCache.set(kind, obj);
    return obj;
  }

  // Optional custom GLB per kind (axes: +X along-track, +Y panel axis, +Z away from Earth).
  async loadGltf(url) {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const gltf = await new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
    const root = gltf.scene;
    const env = this.ensureEnv();
    root.traverse(o => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      mats.forEach(mm => {
        if (env && mm.isMeshStandardMaterial && !mm.envMap) {
          mm.envMap = env;
          mm.needsUpdate = true;
        }
      });
    });
    const bb = new THREE.Box3().setFromObject(root);
    const size = bb.getSize(new THREE.Vector3());
    const centre = bb.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    const holder = new THREE.Group();
    holder.add(root);
    holder.scale.setScalar(1 / (Math.max(size.x, size.y, size.z) || 1));
    const wrap = new THREE.Group();
    wrap.add(holder);
    return wrap;
  }

  // Place the detailed model (or the stand-in marker) on the interpolated position.
  placeSelected(sp, dist) {
    const m = this.motion;
    const target = this.detail || this.selMarker;
    let s;
    if (this.detail) {
      s = Math.max(0.02, dist * 0.028); // exaggerated so the silhouette is readable
      this.selMarker.visible = false;
    } else {
      s = KINDS[this.selected.k].size * this.markerScale * 1.5;
      this.selMarker.visible = true;
    }
    this._bx.set(m.bx[0] * s, m.bx[1] * s, m.bx[2] * s);
    this._by.set(m.by[0] * s, m.by[1] * s, m.by[2] * s);
    this._bz.set(m.bz[0] * s, m.bz[1] * s, m.bz[2] * s);
    target.matrix.makeBasis(this._bx, this._by, this._bz).setPosition(sp);
    target.matrixWorldNeedsUpdate = true;
  }

  pushSelSample(sat, v, g, b) {
    const now = Date.now();
    const m = this.motion;
    const first = !m.has;
    m.push(v.x, v.y, v.z, sampleTimeMs(sat, now), now);
    if (first) {
      m.setHint(g.basis[b], g.basis[b + 1], g.basis[b + 2]);
      const sp = Number(sat && sat.velocityKmS);
      if (Number.isFinite(sp) && sp > 0) {
        const u = sp / EARTH_KM;
        m.setVelocity(g.basis[b] * u, g.basis[b + 1] * u, g.basis[b + 2] * u);
      }
    }
  }

  // The selected satellite is drawn from the interpolated motion, so its instanced copy is made degenerate.
  hideSelectedInstance() {
    if (!this.selected) return;
    const g = this.groups[this.selected.k];
    if (!g.mesh || this.selected.idx >= g.count) return;
    const a = g.mesh.instanceMatrix.array;
    const o = this.selected.idx * 16;
    a[o] = a[o + 1] = a[o + 2] = a[o + 4] = a[o + 5] = a[o + 6] = a[o + 8] = a[o + 9] = a[o + 10] = 0;
    g.mesh.instanceMatrix.needsUpdate = true;
  }

  // ----- generic subject interface (feature-independent) -------------------------
  // Thin, behaviour-preserving wrappers over the existing implementation. New code should call these;
  // the older satellite-named methods remain as the temporary compatibility layer.
  setEntities(list) {
    this.setSatellites(list);
  }

  setSelectedEntity(id, silent) {
    this.setSelected(id, silent);
  }

  getSelectedEntity() {
    return this.getSelectedSat();
  }

  focusEntity(id) {
    this.focusSatellite(id);
  }

  setPath(points) {
    this.setOrbitPath(points);
  }

  followSelected(on) {
    this.setFollow(on);
  }

  notifySelect(entity) {
    if (this.cb.onSelect) this.cb.onSelect(entity);
    const h = this.subject;
    if (h && typeof h.subject.onSelect === 'function') {
      try {
        h.subject.onSelect(entity);
      } catch (error) {
        console.error('[SpaceTecGlobeEngine] subject.onSelect failed', error);
      }
    }
  }

  // Connects a feature's content to the globe. Returns false (and attaches nothing) for an invalid subject.
  attachSubject(subject) {
    this.detachSubject();
    if (this.disposed) return false;
    if (!isValidSubject(subject)) {
      console.error('[SpaceTecGlobeEngine] attachSubject: a subject needs a getEntities() function', subject);
      return false;
    }
    const nextType = typeof subject.resolveType === 'function' ? subject.resolveType : resolveKind;
    if (nextType !== this.typeOf) {
      this.typeOf = nextType;
      this.layoutVersion += 1;
    }
    const handle = { subject, unsubscribe: null, ticking: false };
    this.subject = handle;
    const push = list => {
      if (this.subject !== handle || this.disposed) return; // stale callback from a detached subject
      this.setEntities(Array.isArray(list) ? list : subject.getEntities());
    };
    push();
    if (typeof subject.subscribe === 'function') {
      const off = subject.subscribe(push);
      handle.unsubscribe = typeof off === 'function' ? off : null;
    }
    if (typeof subject.tick === 'function' && subject.tickMs > 0) {
      handle.ticking = true;
      this.setTicker(ms => push(subject.tick(ms)), subject.tickMs);
    }
    return true;
  }

  detachSubject() {
    const h = this.subject;
    if (!h) return;
    this.subject = null;
    if (h.unsubscribe) {
      try {
        h.unsubscribe();
      } catch (error) {
        console.warn('[SpaceTecGlobeEngine] subject unsubscribe failed', error);
      }
    }
    if (h.ticking) this.setTicker(null);
    if (this.typeOf !== resolveKind) {
      this.typeOf = resolveKind;
      this.layoutVersion += 1;
    }
  }

  setTicker(fn, intervalMs) {
    this.ticker = fn ? { fn, interval: intervalMs } : null;
    this.tickAcc = intervalMs || 0; // fire on the next frame
  }

  setSelected(id, silent) {
    if (id === null || id === undefined) {
      const had = Boolean(this.selected);
      if (this.following) this.setFollow(false);
      this.selected = null;
      this.ring.visible = false;
      this.selMarker.visible = false;
      this.motion.reset();
      this.setOrbitPath(null);
      this.hideDetail();
      if (had && this.order.length) this.writePositions(); // restore the hidden instanced marker
      if (!silent) this.notifySelect(null);
      return;
    }
    const hit = this.idMap.get(String(id));
    if (!hit) return;
    const changed = !this.selected || String(this.selected.id) !== String(id);
    this.selected = { ...hit, id };
    this.ring.visible = true;
    if (changed) {
      this.motion.reset();
      this.selMarker.geometry = this.groups[hit.k].geometry;
      if (this.following) {
        this.followState.hasPrev = false;
        this.followState.engage = 1.2;
        this.followState.wantDist = 0;
      }
      if (this.order.length) this.writePositions(); // restores the previous marker, hides this one, seeds motion
      this.showDetail(hit.k);
    }
    if (!silent) this.notifySelect(this.getSelectedSat());
  }

  getSelectedSat() {
    if (!this.selected) return null;
    return this.groups[this.selected.k].sats[this.selected.idx] || null;
  }

  selectedPosition(out) {
    if (!this.selected) return null;
    if (this.motion.has) return out.set(this.motion.disp[0], this.motion.disp[1], this.motion.disp[2]);
    const g = this.groups[this.selected.k];
    const i = this.selected.idx * 3;
    return out.set(g.pos[i], g.pos[i + 1], g.pos[i + 2]);
  }

  // Updates the existing line in place when the point count is unchanged (no per-refresh allocation).
  setOrbitPath(points) {
    if (!points || points.length < 2) {
      if (this.pathLine) {
        this.scene.remove(this.pathLine);
        this.pathLine.geometry.dispose();
        this.pathLine = null;
      }
      return;
    }
    const v = this._v;
    const existing = this.pathLine ? this.pathLine.geometry.getAttribute('position') : null;
    const arr = existing && existing.count === points.length ? existing.array : new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      llToVec(p.lat, p.lng, 1 + Math.max(0, p.altitudeKm || 0) / EARTH_KM, v);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    });
    if (existing && existing.array === arr) {
      existing.needsUpdate = true;
      return;
    }
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.pathLine = new THREE.Line(geo, this.pathMat);
    this.pathLine.frustumCulled = false;
    this.scene.add(this.pathLine);
  }

  // ----- camera ---------------------------------------------------------------
  flyTo(lat, lng, distance, ms = 1100, lock = false) {
    const toDir = llToVec(lat, lng, 1, new THREE.Vector3());
    const fromPos = this.camera.position.clone();
    const fromDist = fromPos.length();
    this.tween = {
      t0: performance.now(),
      ms,
      lock,
      fromDir: fromPos.clone().normalize(),
      toDir,
      fromDist,
      toDist: clamp(distance || fromDist, 1.1, 14),
      fromTarget: this.controls.target.clone(),
    };
  }

  resetView() {
    this.setFollow(false);
    this.flyTo(INITIAL_VIEW.lat, INITIAL_VIEW.lng, INITIAL_VIEW.distance, 1200);
  }

  setFollow(on) {
    const next = Boolean(on) && Boolean(this.selected);
    if (next === this.following) return;
    this.following = next;
    const f = this.followState;
    f.hasPrev = false;
    if (next) {
      this.tween = null;
      f.engage = 1.2;
      const m = this.motion;
      const d = m.has ? this.camera.position.distanceTo(this._sel.set(m.disp[0], m.disp[1], m.disp[2])) : 0;
      f.wantDist = d > 0.5 ? 0.3 : 0; // only zoom in, and only when starting far away
    } else if (!this.disposed) {
      // Hand the camera back to the Earth-centred orbit without a jump: keep direction, glide the target to 0.
      const ll = vecToLL(this.camera.position);
      this.flyTo(ll.lat, ll.lng, Math.max(this.camera.position.length(), 1.45), 900, true);
    }
    if (this.cb.onFollowChange) this.cb.onFollowChange(next);
  }

  // Chase camera: translate with the satellite and rotate the view offset with its orbital frame, so
  // the satellite stays centred with no trailing, while rotate/zoom keep working around it.
  chaseCamera(dt, sel) {
    const m = this.motion;
    const f = this.followState;
    const cam = this.camera;
    const ctl = this.controls;
    this._bx.set(m.bx[0], m.bx[1], m.bx[2]);
    this._by.set(m.by[0], m.by[1], m.by[2]);
    this._bz.set(m.bz[0], m.bz[1], m.bz[2]);
    this._m4.makeBasis(this._bx, this._by, this._bz);
    this._qf.setFromRotationMatrix(this._m4);
    const off = this._off.copy(cam.position).sub(ctl.target);
    if (f.hasPrev) {
      const inv = this._qinv.copy(f.prevQ);
      if (inv.invert) inv.invert();
      else inv.inverse();
      this._qd.copy(this._qf).multiply(inv);
      off.applyQuaternion(this._qd);
    }
    f.prevQ.copy(this._qf);
    f.hasPrev = true;
    if (f.engage > 0) {
      f.engage -= dt;
      const len = off.length();
      if (f.wantDist > 0 && len > f.wantDist) off.setLength(len + (f.wantDist - len) * (1 - Math.exp(-dt * 4.5)));
      ctl.target.lerp(sel, 1 - Math.exp(-dt * 9));
    } else {
      ctl.target.copy(sel);
    }
    cam.position.copy(ctl.target).add(off);
    // Never let the chase view sink into the Earth.
    const r = cam.position.length();
    if (r < 1.03) {
      cam.position.multiplyScalar(1.03 / r);
      ctl.target.copy(sel);
    }
  }

  // Near plane follows the closest thing that matters, so close follow views are neither clipped nor z-fighting.
  updateClip(sel) {
    const cam = this.camera;
    const dEarth = Math.max(cam.position.length() - 1.006, 0.004);
    const dSel = sel ? Math.max(cam.position.distanceTo(sel) - 0.03, 0.004) : Infinity;
    const need = clamp(Math.min(dEarth, dSel) * 0.35, 0.003, 0.5);
    if (need < cam.near || need > cam.near * 1.3) {
      cam.near = need;
      cam.updateProjectionMatrix();
    }
  }

  setDpr(v) {
    this.dpr = v;
    this.renderer.setPixelRatio(v);
    this.resize(this.container.clientWidth, this.container.clientHeight);
  }

  setAutoRotate(on) {
    this.controls.autoRotate = Boolean(on);
  }

  focusSatellite(id) {
    this.setSelected(id, false);
    const p = this.selectedPosition(new THREE.Vector3());
    if (!p) return;
    const ll = vecToLL(p);
    this.flyTo(ll.lat, ll.lng, Math.min(this.camera.position.length(), 2.2), 1000);
  }

  // ----- interaction --------------------------------------------------------
  onPointerDown = e => {
    this.pointers.add(e.pointerId);
    if (this.pointers.size === 1) {
      this.gesture = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false, type: e.pointerType };
    } else if (this.gesture) {
      this.gesture.multi = true;
    }
  };

  onPointerUp = e => {
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (!g || g.multi) {
      if (this.pointers.size === 0) this.gesture = null;
      return;
    }
    this.gesture = null;
    const moved = Math.hypot(e.clientX - g.x, e.clientY - g.y);
    if (moved > 6 || performance.now() - g.t > 450) return;
    const now = performance.now();
    const isDouble =
      this.lastTap && now - this.lastTap.t < 320 && Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 28;
    this.lastTap = isDouble ? null : { t: now, x: e.clientX, y: e.clientY };
    if (isDouble) this.focusPoint(e.clientX, e.clientY);
    else this.tap(e.clientX, e.clientY, g.type === 'touch' ? 24 : 12);
  };

  onPointerCancel = e => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) this.gesture = null;
  };

  tap(clientX, clientY, radius) {
    const hit = this.pickSatellite(clientX, clientY, radius);
    if (hit) {
      const sat = this.groups[hit.k].sats[hit.idx];
      this.setSelected(sat.id, false);
    } else if (this.selected) {
      this.setFollow(false);
      this.setSelected(null, false);
    }
  }

  pickSatellite(clientX, clientY, radius) {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const hw = rect.width / 2;
    const hh = rect.height / 2;
    const cam = this.camera.position;
    this.camera.updateMatrixWorld();
    const v = this._v;
    let best = null;
    let bestD = radius * radius;
    KIND_KEYS.forEach(k => {
      const g = this.groups[k];
      for (let i = 0; i < g.count; i += 1) {
        v.set(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]);
        const x = v.x;
        const y = v.y;
        const z = v.z;
        v.project(this.camera);
        if (v.z > 1 || v.z < -1) continue;
        const dx = (v.x + 1) * hw - px;
        const dy = (1 - v.y) * hh - py;
        const d2 = dx * dx + dy * dy;
        if (d2 >= bestD) continue;
        // Occlusion: does the camera->satellite segment cross the Earth?
        const ddx = x - cam.x;
        const ddy = y - cam.y;
        const ddz = z - cam.z;
        const a = ddx * ddx + ddy * ddy + ddz * ddz;
        const b = 2 * (cam.x * ddx + cam.y * ddy + cam.z * ddz);
        const c = cam.x * cam.x + cam.y * cam.y + cam.z * cam.z - 0.9985;
        const disc = b * b - 4 * a * c;
        if (disc > 0) {
          const t1 = (-b - Math.sqrt(disc)) / (2 * a);
          if (t1 > 0 && t1 < 1) continue;
        }
        bestD = d2;
        best = { k, idx: i };
      }
    });
    return best;
  }

  focusPoint(clientX, clientY) {
    if (!this.earth) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this._ray.setFromCamera(ndc, this.camera);
    const hit = this._ray.intersectObject(this.earth, false)[0];
    if (!hit) return;
    const ll = vecToLL(hit.point);
    this.setFollow(false);
    this.flyTo(ll.lat, ll.lng, Math.min(this.camera.position.length(), 2.0), 1000);
  }

  // ----- loop -------------------------------------------------------------------
  shouldRun() {
    return !this.disposed && !this.contextLost && this.inView && !document.hidden;
  }

  requestRun() {
    if (this.raf || !this.shouldRun()) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  setInView(v) {
    this.inView = v;
    if (v) this.requestRun();
    else this.stop();
  }

  frame = now => {
    this.raf = 0;
    if (!this.shouldRun()) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = clamp((now - this.last) / 1000, 0.001, 0.1);
    this.last = now;
    try {
      this.update(dt, now);
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('[SpaceTecGlobeEngine] render error', error);
      this.stop();
      if (this.cb.onError) this.cb.onError(error);
    }
  };

  update(dt, now) {
    const cam = this.camera;
    const ctl = this.controls;

    if (this.ticker) {
      this.tickAcc += dt * 1000;
      if (this.tickAcc >= this.ticker.interval) {
        this.tickAcc = 0;
        this.ticker.fn(Date.now());
      }
    }

    if (this.selected) this.motion.evaluate(Date.now(), dt);
    const sel =
      this.selected && this.motion.has ? this._sel.set(this.motion.disp[0], this.motion.disp[1], this.motion.disp[2]) : null;

    this.sunClock += dt;
    if (this.sunClock > 30) {
      this.sunClock = 0;
      this.refreshSun();
    }
    this.cloudUniform.value = (this.cloudUniform.value + dt * 0.00003) % 1; // ~0.65 deg of drift per minute

    if (this.tween) {
      const tw = this.tween;
      const p = clamp((now - tw.t0) / tw.ms, 0, 1);
      const e = easeInOut(p);
      this._q.setFromUnitVectors(tw.fromDir, tw.toDir);
      this._qi.identity().slerp(this._q, e);
      const dist = tw.fromDist + (tw.toDist - tw.fromDist) * e;
      cam.position.copy(tw.fromDir).applyQuaternion(this._qi).multiplyScalar(dist);
      ctl.target.copy(tw.fromTarget).multiplyScalar(1 - e);
      if (p >= 1) this.tween = null;
    } else if (this.following && sel) {
      this.chaseCamera(dt, sel);
    }

    // While following (or gliding) the target is off-centre, so the Earth-centred limits are relaxed.
    const wantMin = this.following || this.tween ? 0.02 : 1.06;
    if (ctl.minDistance !== wantMin) ctl.minDistance = wantMin;
    ctl.rotateSpeed = this.following ? 0.5 : clamp((cam.position.distanceTo(ctl.target) - 1) * 0.3, 0.08, 0.65);
    ctl.update();
    if (!this.following && !this.tween) {
      const excess = ctl.target.length() - 2.5;
      if (excess > 0) {
        this._v2.copy(ctl.target).setLength(excess);
        ctl.target.sub(this._v2);
        cam.position.sub(this._v2);
      }
    }
    this.updateClip(sel);
    this.atmoMat.uniforms.fade.value = smoothstep(1.02, 1.09, cam.position.length());

    // Marker size follows zoom so dots stay readable but never swamp the globe.
    this.markerScale = clamp(cam.position.length() / 3.6, 0.35, 1.8);
    if (Math.abs(this.markerScale / this.appliedScale - 1) > 0.06) this.rescaleMarkers();

    if (sel) {
      const camDist = cam.position.distanceTo(sel);
      this.ring.position.copy(sel);
      this.ring.scale.setScalar(camDist * 0.06);
      this.placeSelected(sel, camDist);
    } else {
      this.selMarker.visible = false;
    }

    // Adaptive resolution: step the pixel ratio down when frames run long, and back up after a long calm spell.
    this.emaDt += (dt - this.emaDt) * 0.05;
    this.slowClock += dt;
    this.calmClock = this.emaDt < 0.02 ? this.calmClock + dt : 0;
    if (this.slowClock > 2.5) {
      this.slowClock = 0;
      if (this.emaDt > 0.032 && this.dpr > 1) {
        this.setDpr(Math.max(1, this.dpr - 0.25));
        this.dprDropAt = now;
        this.emaDt = 0.02;
        this.calmClock = 0;
      } else if (this.calmClock > 8 && this.dpr < this.targetDpr && now - this.dprDropAt > 20000) {
        this.setDpr(Math.min(this.targetDpr, this.dpr + 0.25));
        this.calmClock = 0;
      }
    }

    this.frames += 1;
    this.statClock += dt;
    if (this.statClock >= 0.5) {
      const fps = this.frames / this.statClock;
      this.frames = 0;
      this.statClock = 0;
      if (this.cb.onStats) {
        const counts = {};
        KIND_KEYS.forEach(k => {
          counts[k] = this.groups[k].count;
        });
        const s = this.getSelectedSat();
        this.cb.onStats({
          fps: Math.round(fps),
          dpr: this.dpr,
          total: this.order.length,
          counts,
          selected: s ? { ...s } : null,
          lowTier: this.lowTier,
          assets: this.assetInfo,
          detail: Boolean(this.detail),
        });
      }
    }
  }

  resize(w, h) {
    if (this.disposed || w < 1 || h < 1) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // ----- teardown ---------------------------------------------------------------
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.detachSubject();
    this.ticker = null;
    this.hideDetail();
    if (this.envRT) this.envRT.dispose();
    this.detailCache.forEach(disposeObject);
    this.detailCache.clear();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.controls.removeEventListener('start', this.onControlStart);
    this.controls.dispose();
    this.setOrbitPath(null);
    KIND_KEYS.forEach(k => {
      const g = this.groups[k];
      if (g.mesh && g.mesh.dispose) g.mesh.dispose();
    });
    this.disposables.forEach(d => {
      if (d && d.dispose) d.dispose();
    });
    this.disposables = [];
    this.renderer.dispose();
    if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.cb = {};
  }
}

// ---------------------------------------------------------------------------
// Generated test fleet (circular orbits; stands in for real propagated data)
// ---------------------------------------------------------------------------
function generateTestFleet(count, timeScale) {
  const rnd = mulberry32(2024);
  const sats = [];
  const recs = [];
  const byId = new Map();
  const add = (category, name, altKm, incDeg, raanDeg, phaseDeg, kind) => {
    const a = EARTH_KM + altKm;
    const inc = incDeg * DEG;
    const raan = raanDeg * DEG;
    const n = Math.sqrt(MU / (a * a * a));
    const id = `STG-${10000 + sats.length}`;
    const sat = {
      id,
      name,
      category,
      kind,
      lat: 0,
      lng: 0,
      altitudeKm: altKm,
      velocityKmS: Math.sqrt(MU / a),
      inclinationDeg: incDeg,
      periodMin: (2 * Math.PI) / n / 60,
      isTest: true,
      timestamp: 0,
    };
    const rec = { a, n, m0: phaseDeg * DEG, cosI: Math.cos(inc), sinI: Math.sin(inc), cosR: Math.cos(raan), sinR: Math.sin(raan) };
    sats.push(sat);
    recs.push(rec);
    byId.set(id, rec);
  };

  add('station', 'Test station Alpha', 410, 51.6, 40, 10, 'station');
  add('station', 'Test station Beta', 390, 41.5, 200, 120, 'station');
  add('station', 'Test station Gamma', 430, 97.4, 300, 250, 'station');
  const incLeo = [53, 53, 70, 97.6, 98.2, 86.4, 43];
  for (let i = sats.length; i < count; i += 1) {
    const r = rnd();
    const num = 10000 + i;
    if (r < 0.46) {
      add('leo', `Broadband-${num}`, 530 + rnd() * 60, [53, 53, 53, 70, 97.6][Math.floor(rnd() * 5)] + (rnd() - 0.5) * 0.3, rnd() * 360, rnd() * 360, 'starlink');
    } else if (r < 0.58) {
      add('leo', `EO-${num}`, 600 + rnd() * 250, 97.4 + rnd() * 1.4, rnd() * 360, rnd() * 360, 'weather');
    } else if (r < 0.72) {
      add('leo', `Cube-${num}`, 400 + rnd() * 200, 50 + rnd() * 48, rnd() * 360, rnd() * 360, 'cubesat');
    } else if (r < 0.78) {
      add('leo', `LEO-${num}`, 350 + Math.pow(rnd(), 1.5) * 1400, incLeo[Math.floor(rnd() * incLeo.length)] + (rnd() - 0.5) * 0.4, rnd() * 360, rnd() * 360, 'generic');
    } else if (r < 0.88) {
      add('meo', `Nav-${num}`, 19100 + rnd() * 4100, rnd() < 0.5 ? 55 + rnd() : 64.8 + rnd(), rnd() * 360, rnd() * 360, 'nav');
    } else if (r < 0.97) {
      add('geo', `Comms-${num}`, 35786, rnd() * 4, rnd() * 360, rnd() * 360, 'comms');
    } else {
      add('other', `OBJ-${num}`, 600 + rnd() * 900, rnd() * 100, rnd() * 360, rnd() * 360, 'generic');
    }
  }

  const t0 = Date.now();
  const frameAt = ms => {
    const t = ((ms - t0) / 1000) * timeScale;
    return { t, theta: OMEGA_E * t };
  };
  const wrap = d => ((((d + 180) % 360) + 360) % 360) - 180;

  function update(ms) {
    const { t, theta } = frameAt(ms);
    for (let i = 0; i < sats.length; i += 1) {
      const r = recs[i];
      const u = r.m0 + r.n * t;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      const x1 = r.a * cu;
      const y1 = r.a * su * r.cosI;
      const z1 = r.a * su * r.sinI;
      const x = x1 * r.cosR - y1 * r.sinR;
      const y = x1 * r.sinR + y1 * r.cosR;
      const s = sats[i];
      s.lat = Math.asin(z1 / r.a) / DEG;
      s.lng = wrap((Math.atan2(y, x) - theta) / DEG);
      s.timestamp = ms; // sample time, used for interpolation of the selected satellite
    }
  }

  function orbitPath(id, ms) {
    const r = byId.get(id);
    if (!r) return null;
    const { theta } = frameAt(ms);
    const pts = [];
    for (let k = 0; k <= 180; k += 1) {
      const u = (k / 180) * Math.PI * 2;
      const x1 = r.a * Math.cos(u);
      const y1 = r.a * Math.sin(u) * r.cosI;
      const z1 = r.a * Math.sin(u) * r.sinI;
      const x = x1 * r.cosR - y1 * r.sinR;
      const y = x1 * r.sinR + y1 * r.cosR;
      pts.push({ lat: Math.asin(z1 / r.a) / DEG, lng: wrap((Math.atan2(y, x) - theta) / DEG), altitudeKm: r.a - EARTH_KM });
    }
    return pts;
  }

  update(t0);
  return { sats, update, orbitPath };
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------
// TEMPORARY COMPATIBILITY: the generated test fleet expressed through the generic subject interface.
// It moves out of this file together with the other satellite-specific code in a later step.
function createTestFleetSubject(fleet) {
  return {
    id: 'generated-test-fleet',
    getEntities: () => fleet.sats,
    tickMs: 50,
    tick: ms => {
      fleet.update(ms);
      return fleet.sats;
    },
    getPath: (id, ms) => fleet.orbitPath(String(id), ms),
  };
}

const TEST_COUNTS = [500, 1000, 3000, 5000, 10000, 20000];

const SpaceTecGlobeEngine = forwardRef(function SpaceTecGlobeEngine(
  {
    subject: subjectProp,
    satellites,
    selectedId,
    onSelect,
    orbitPath,
    textureUrls,
    assetBase = '/globe-lab',
    textureTier = 'auto',
    modelUrls,
    detailedModels = 'auto',
    normalScale = 1,
    quality = 'auto',
    showControls = true,
    showTestControls = true,
    autoRotate = false,
    testCount = 3000,
    testTimeScale = 60,
    className = '',
    style,
  },
  ref
) {
  const containerRef = useRef(null);
  const [engine, setEngine] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting | nosize | loading | ready | unavailable | lost | error
  const [engineKey, setEngineKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [following, setFollowing] = useState(false);
  const [showOrbit, setShowOrbit] = useState(true);
  const [rotate, setRotate] = useState(autoRotate);
  const [count, setCount] = useState(testCount);
  const [internalSel, setInternalSel] = useState(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const usingTest = !subjectProp && !Array.isArray(satellites);
  const fleet = useMemo(() => (usingTest ? generateTestFleet(count, testTimeScale) : null), [usingTest, count, testTimeScale]);
  const subject = useMemo(() => subjectProp || (fleet ? createTestFleetSubject(fleet) : null), [subjectProp, fleet]);
  const data = subjectProp ? null : usingTest ? fleet.sats : satellites;
  const texKey = JSON.stringify([textureUrls || null, assetBase, textureTier, detailedModels, modelUrls || null]);
  const effectiveSel = selectedId !== undefined ? selectedId : internalSel;

  useEffect(() => setRotate(autoRotate), [autoRotate]);

  // Engine lifecycle: created once a real size exists, disposed on cleanup.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    let eng = null;
    let disposed = false;
    setStatus('waiting');

    const sizeTimer = setTimeout(() => {
      if (!eng && !disposed) setStatus('nosize');
    }, 2500);

    const create = () => {
      try {
        eng = new GlobeEngine(el, {
          quality,
          textureUrls: textureUrls || null,
          assetBase,
          textureTier,
          modelUrls: modelUrls || null,
          detailedModels: detailedModels === 'auto' ? undefined : detailedModels,
          normalScale,
          callbacks: {
            onSelect: sat => {
              setInternalSel(sat ? sat.id : null);
              if (onSelectRef.current) onSelectRef.current(sat);
            },
            onFollowChange: setFollowing,
            onStats: setStats,
            onContextLost: () => setStatus('lost'),
            onContextRestored: () => setEngineKey(k => k + 1),
            onError: () => setStatus('error'),
          },
        });
      } catch (error) {
        console.error('[SpaceTecGlobeEngine] WebGL unavailable', error);
        eng = null;
        setStatus('unavailable');
        return;
      }
      setStatus('loading');
      setEngine(eng);
      eng.init().then(
        () => {
          if (!disposed) setStatus('ready');
        },
        error => {
          console.error('[SpaceTecGlobeEngine] init failed', error);
          if (!disposed) setStatus('error');
        }
      );
    };

    const ro = new ResizeObserver(entries => {
      const rect = entries[0].contentRect;
      if (rect.width < 1 || rect.height < 1) return;
      if (!eng) create();
      else eng.resize(rect.width, rect.height);
    });
    ro.observe(el);

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(entries => {
            if (eng) eng.setInView(entries[0].isIntersecting);
          })
        : null;
    if (io) io.observe(el);

    return () => {
      disposed = true;
      clearTimeout(sizeTimer);
      ro.disconnect();
      if (io) io.disconnect();
      if (eng) eng.dispose();
      setEngine(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineKey, quality, texKey]);

  // Content: a feature subject (or the generated test fleet, itself a subject) or a legacy `satellites` array.
  useEffect(() => {
    if (!engine) return undefined;
    if (subject) {
      engine.attachSubject(subject);
      return () => engine.detachSubject();
    }
    engine.setEntities(data);
    return undefined;
  }, [engine, subject, data]);

  useEffect(() => {
    if (engine) engine.setAutoRotate(rotate);
  }, [engine, rotate]);

  useEffect(() => {
    if (engine) engine.setNormalScale(normalScale);
  }, [engine, normalScale]);

  // Selection from props / internal state.
  useEffect(() => {
    if (!engine) return;
    if (effectiveSel === null || effectiveSel === undefined) {
      if (engine.selected) engine.setSelected(null, true);
    } else if (!engine.selected || String(engine.selected.id) !== String(effectiveSel)) {
      engine.setSelected(effectiveSel, true);
    }
  }, [engine, effectiveSel, data, subject]);

  // Orbit path for the selected satellite.
  useEffect(() => {
    if (!engine) return undefined;
    if (!showOrbit || effectiveSel === null || effectiveSel === undefined) {
      engine.setPath(null);
      return undefined;
    }
    if (Array.isArray(orbitPath)) {
      engine.setPath(orbitPath);
      return undefined;
    }
    if (subject && typeof subject.getPath === 'function') {
      const draw = () => engine.setPath(subject.getPath(String(effectiveSel), Date.now()));
      draw();
      const id = setInterval(draw, 250); // keeps the path under the object as the Earth turns
      return () => clearInterval(id);
    }
    engine.setPath(null);
    return undefined;
  }, [engine, effectiveSel, showOrbit, orbitPath, subject]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => engine && engine.resetView(),
      flyTo: (lat, lng, distance) => engine && engine.flyTo(lat, lng, distance),
      setFollow: on => engine && engine.setFollow(on),
      focusSatellite: id => engine && engine.focusSatellite(id),
      focusEntity: id => engine && engine.focusEntity(id),
      followSelected: on => engine && engine.followSelected(on),
    }),
    [engine]
  );

  const clearSelection = useCallback(() => {
    if (engine) {
      engine.setFollow(false);
      engine.setSelected(null, false);
    }
  }, [engine]);

  const sel = stats && stats.selected;
  const overlay = {
    waiting: 'Preparing the globe...',
    nosize: 'The globe container has no height. Give its parent an explicit height.',
    loading: 'Building Earth...',
    unavailable: 'WebGL is not available in this browser, so the 3D globe cannot be shown.',
    lost: 'The graphics context was lost. Restoring...',
    error: 'The 3D renderer stopped unexpectedly. Reload the page to try again.',
  }[status];

  return (
    <div className={`stge-root ${className}`} style={style} data-status={status}>
      <div ref={containerRef} className="stge-viewport" />

      {overlay && (
        <div className={`stge-overlay ${status === 'loading' || status === 'waiting' ? 'is-soft' : ''}`} role="status">
          <span>{overlay}</span>
        </div>
      )}

      {showControls && engine && status === 'ready' && (
        <>
          <div className="stge-toolbar">
            <button type="button" className="stge-btn" onClick={() => engine.resetView()}>
              Reset view
            </button>
            <button
              type="button"
              className={`stge-btn ${following ? 'is-on' : ''}`}
              aria-pressed={following}
              disabled={!sel}
              onClick={() => engine.setFollow(!following)}
            >
              Follow
            </button>
            <button type="button" className={`stge-btn ${showOrbit ? 'is-on' : ''}`} aria-pressed={showOrbit} onClick={() => setShowOrbit(v => !v)}>
              Orbit path
            </button>
            <button type="button" className={`stge-btn ${rotate ? 'is-on' : ''}`} aria-pressed={rotate} onClick={() => setRotate(v => !v)}>
              Auto-rotate
            </button>
          </div>

          <div className="stge-legend" aria-label="Satellite categories">
            <div className="stge-legend-total">
              {stats ? stats.total.toLocaleString() : 0} objects
              {stats ? <span className="stge-fps"> {stats.fps} fps</span> : null}
            </div>
            {stats && stats.assets ? (
              <div className="stge-assets">
                {stats.assets.source === 'local'
                  ? `Earth: photographic ${stats.assets.tier} (${stats.assets.maps.join(', ')})`
                  : 'Earth: procedural placeholder (add textures to /public/globe-lab/earth)'}
              </div>
            ) : null}
            {KIND_KEYS.map(k => (
              <div key={k} className="stge-legend-row">
                <i style={{ background: KINDS[k].color }} />
                <span>{KINDS[k].label}</span>
                <b>{stats ? (stats.counts[k] || 0).toLocaleString() : 0}</b>
              </div>
            ))}
            {usingTest && showTestControls && (
              <label className="stge-count">
                Test objects
                <select value={count} onChange={e => setCount(Number(e.target.value))}>
                  {TEST_COUNTS.map(c => (
                    <option key={c} value={c}>
                      {c.toLocaleString()}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {sel && (
            <div className="stge-card" role="region" aria-label="Selected satellite">
              <div className="stge-card-head">
                <div>
                  <strong>{sel.name || sel.id}</strong>
                  <span>{sel.id}</span>
                </div>
                <button type="button" className="stge-btn" onClick={clearSelection} aria-label="Clear selection">
                  Close
                </button>
              </div>
              <dl>
                <div><dt>Orbit class</dt><dd>{(CATEGORIES[sel.category] || CATEGORIES.other).label}</dd></div>
                <div><dt>Model</dt><dd>Representative {KINDS[resolveKind(sel)].label.toLowerCase()}</dd></div>
                <div><dt>Altitude</dt><dd>{Number(sel.altitudeKm).toFixed(0)} km</dd></div>
                <div><dt>Latitude</dt><dd>{Number(sel.lat).toFixed(2)}°</dd></div>
                <div><dt>Longitude</dt><dd>{Number(sel.lng).toFixed(2)}°</dd></div>
                {Number.isFinite(Number(sel.velocityKmS)) && <div><dt>Speed</dt><dd>{Number(sel.velocityKmS).toFixed(2)} km/s</dd></div>}
                {sel.isTest && <div><dt>Source</dt><dd>Generated test data</dd></div>}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default SpaceTecGlobeEngine;
