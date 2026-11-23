'use client';

/**
 * SpaceTecGlobeEngine: an independent, feature-free Three.js globe.
 *
 * - Plain Three.js + OrbitControls. No react-globe.gl / three-globe / Cesium.
 * - Earth, atmosphere, clouds, lighting, camera, picking, selection, follow camera and path rendering.
 * - Entities are drawn with one THREE.InstancedMesh per render type.
 * - The rendering engine (class GlobeEngine) knows nothing about React.
 *   The React component below owns sizing, lifecycle and the UI overlay.
 * - Earth-fixed frame: Earth never rotates in the scene. Entities arrive as geodetic lat/lng/altitude.
 *
 * The engine does not know what a satellite, launch pad or the ISS is. A feature plugs in through a
 * "subject" (prop `subject`, or engine.attachSubject(subject)), usually built by a feature adapter such as
 * app/globe/adapters/OrbitalTrackingAdapter.js. The engine never imports an adapter.
 *
 *   GlobeEntity    { id, lat (deg), lng (deg), altitudeKm?, type?, timestamp? (ms), velocityKmS?, ...anything }
 *                  Extra fields are opaque to the engine and returned untouched in callbacks.
 *   GlobePathPoint { lat (deg), lng (deg), altitudeKm? }
 *   GlobeSubject   {
 *     id?: string,
 *     getEntities(): GlobeEntity[],                      // REQUIRED: the objects to display now
 *     subscribe?(push): unsubscribe,                     // push-style updates: push(entities?)
 *     tickMs?: number, tick?(nowMs): GlobeEntity[]|void, // pull-style updates (returning a list pushes it)
 *     getPath?(entityId, nowMs): GlobePathPoint[]|null,  // optional path/trajectory for the selected entity
 *     onSelect?(entity|null),                            // selection callback
 *     // rendering configuration (all optional; defaults draw every entity as a plain marker):
 *     types?: { [typeKey]: { label, color, size } },     // render types; one instanced mesh each. A 'generic'
 *                                                        //   type is always present and is the fallback.
 *     resolveType?(entity): typeKey,                     // default: entity.type
 *     models?: {                                         // optional 3D models per type
 *       silhouette(typeKey, level): THREE.BufferGeometry, //   instanced marker (vertex-coloured, ~1 unit)
 *       detail?(typeKey, ctx): THREE.Object3D|null,       //   lazy model of the selected entity
 *     },                                                  //   ctx: { envMap, maxAnisotropy, track, registerEnvMaterial, store }
 *     describeEntity?(entity): { title, subtitle?, rows: [{ label, value }] },   // selection card
 *     labels?: { legend?, selected?, path? },            // UI wording
 *   }
 *
 * Engine API: setEntities, setSelectedEntity, getSelectedEntity, focusEntity, setPath, setFollow,
 * attachSubject, detachSubject, applyTypeSystem, flyTo, resetView, setAutoRotate, setTicker,
 * setInteractive, setIsolateSelected, getHoveredEntity, hasEntity.
 *
 * Interaction (all generic; none of it knows what an entity is):
 *   onHover(entity|null, { x, y })   mouse/pen pointer over an entity (x, y: pixels inside the globe); null when it
 *                                    leaves. Coalesced to one pick per ~60 ms inside the render loop.
 *   interactive (default true)       true  = everything on.
 *                                    'pick' = camera locked (no drag/zoom/pan; touch-action pan-y so the page still
 *                                             scrolls) but tap selection and hover keep working.
 *                                    false = nothing: no camera, no tap selection, no hover; touch-action released.
 *                                    Programmatic control (selectedId, focusEntity, follow, flyTo) always works.
 *   adaptiveMarkers (default false)  scale all markers smoothly with how many entities are shown: larger for small
 *                                    sets (easy to spot), normal around 10k, slightly compact above that. Uses the
 *                                    displayed entity count only; see markerDensityScale().
 *   isolateSelected (default false)  while an entity is selected the other entities are drawn faint (picking is
 *                                    unchanged); the selected entity, its model, ring and path stay fully visible.
 *
 * Selection consistency: if the selected entity is no longer in the list (removed, filtered out, list replaced or
 * emptied) the engine clears the selection, leaves follow mode, hides the model/path and reports onSelect(null) and
 * onFollowChange(false). A hovered entity that disappears is cleared the same way (onHover(null)).
 * Optional GLB models per type can still be passed with the `modelUrls` prop (keyed by type).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './SpaceTecGlobeEngine.css';
import { EARTH_KM, DEG, mulberry32, bakeParts, UNIT_OCTA } from './globe/globeShared';

// ---------------------------------------------------------------------------
// Constants and small helpers
// ---------------------------------------------------------------------------

// Render types. The engine draws one InstancedMesh per type key. A subject supplies its own registry
// (`subject.types`) and models (`subject.models`); these defaults serve entities without a subject.
// Every registry contains FALLBACK_TYPE: entities whose type is unknown are drawn with it.
const FALLBACK_TYPE = 'generic';
const HOVER_INTERVAL_MS = 60; // at most one hover pick per this many ms (picking is O(entities))
const HOVER_RADIUS_PX = 10; // pick radius for hover (taps use 12 / 24)
// Adaptive marker size: log-interpolated between anchors so the size never jumps as the count changes.
const DENSITY_ANCHORS = [[100, 2.3], [500, 1.75], [2500, 1.3], [10000, 1.0], [16000, 0.85]]; // [object count, scale]
export function markerDensityScale(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 1;
  const A = DENSITY_ANCHORS;
  if (n <= A[0][0]) return A[0][1];
  if (n >= A[A.length - 1][0]) return A[A.length - 1][1];
  for (let i = 1; i < A.length; i += 1) {
    if (n <= A[i][0]) {
      const t = (Math.log10(n) - Math.log10(A[i - 1][0])) / (Math.log10(A[i][0]) - Math.log10(A[i - 1][0]));
      return A[i - 1][1] + (A[i][1] - A[i - 1][1]) * t;
    }
  }
  return 1;
}
const ISOLATE_OPACITY = 0.14; // opacity of de-emphasised entities while `isolateSelected` is active
const DEFAULT_TYPES = {
  generic: { label: 'Objects', color: '#b9c2d0', size: 0.0055 },
};
const DEFAULT_MODELS = {
  silhouette: () => bakeParts([{ geo: UNIT_OCTA, scale: [1, 1, 1], pos: [0, 0, 0], color: '#b9c2d0', lvl: 0 }], 1),
};
const defaultResolveType = entity => (entity && entity.type) || FALLBACK_TYPE;
const DEFAULT_TYPE_SYSTEM = { types: DEFAULT_TYPES, models: DEFAULT_MODELS, resolveType: defaultResolveType };

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
uniform sampler2D cloudMap; uniform vec3 sunDir; uniform float cloudU; uniform float cloudContrast;
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  float raw = texture2D(cloudMap, vec2(vUv.x + cloudU, vUv.y)).r;
  // The cloud map is faint (mean ~0.28, max ~0.83). cloudContrast stretches it so dense decks read as cloud and thin
  // wisps stay subtle; 0 = original look (used on the low / mobile tier).
  float a = mix(raw, smoothstep(0.08, 0.72, raw) * 0.94, cloudContrast);
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
// Smooth motion for the SELECTED entity only. Pure JS (no Three.js) so it can be unit tested.
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
    // Where the old curve puts the entity right now (the last evaluate may be up to one frame old).
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
    // Heading = tangential part of the velocity; keep the previous heading if the entity is ~still.
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
    this.selectionLost = false; // set by rebuildSlots when the selected entity left the list
    this.interactive = true; // any user interaction (picking / hover) enabled
    this.interactiveMode = 'full'; // 'full' | 'pick' | 'off'
    this.isolate = opts.isolateSelected === true;
    this.isolated = false; // dimming currently applied (isolate && something selected)
    this.hovered = null; // { id } of the entity under the pointer
    this.hoverReq = null; // latest pointer position waiting for a pick: { x, y }
    this.hoverAt = -1e9;
    this.markerScale = 1;
    this.appliedScale = 1;
    this.adaptive = opts.adaptiveMarkers === true; // size markers by the displayed count
    this.densityScale = 1;
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
    this.typeSystem = null; // { types, models, resolveType } currently applied (see applyTypeSystem)
    this.types = DEFAULT_TYPES; // render-type registry: key -> { label, color, size }
    this.typeKeys = Object.keys(DEFAULT_TYPES);
    this.models = DEFAULT_MODELS;
    this.typeOf = defaultResolveType; // entity -> render type key
    this.modelStore = {}; // per-engine scratch space for the model provider (materials, caches)
    this.envMaterials = []; // materials whose reflection map the engine keeps current
    this.layoutVersion = 0; // bumped when the type system changes so the slots are rebuilt
    this.slotVersion = 0;
    this.followState = { engage: 0, wantDist: 0, hasPrev: false, prevQ: new THREE.Quaternion() };
    this.envRT = null;
    this.envTex = null;
    this.envSun = null;

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
      // Following is NOT cancelled by rotate/zoom: the camera orbits the entity instead.
      if (this.tween && !this.tween.lock) this.tween = null;
    };
    this.controls.addEventListener('start', this.onControlStart);
    this.baseTouchAction = (this.canvas.style && this.canvas.style.touchAction) || 'none'; // as set by OrbitControls

    this.buildStars();
    this.buildAtmosphere();
    this.buildEntityLayer();
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
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.setInteractive(opts.interactive === undefined ? true : opts.interactive, true);

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
          uniforms: { cloudMap: { value: tex.clouds }, sunDir: { value: this.sun }, cloudU: this.cloudUniform, cloudContrast: { value: this.lowTier ? 0 : 1 } },
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

  buildEntityLayer() {
    // Entities share one lit material; one baked geometry and one InstancedMesh per render type
    // (created by applyTypeSystem).
    this.entityMaterial = this.track(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1b2433 }));
    // The selected entity's stand-in has its own material, so dimming the instanced entities (isolateSelected)
    // never dims it.
    this.selMaterial = this.track(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x1b2433 }));
    this.ambient = new THREE.AmbientLight(0xffffff, 1.1);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
    this.scene.add(this.ambient, this.sunLight);
    this.applyTypeSystem(DEFAULT_TYPE_SYSTEM);
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

    // Stand-in for the selected entity when no detailed model is shown: one ordinary mesh,
    // positioned from the interpolated motion (the instanced copy is hidden).
    this.selMarker = new THREE.Mesh(this.track(new THREE.BufferGeometry()), this.selMaterial);
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

  // ----- entity data ------------------------------------------------------
  setEntities(list) {
    if (this.disposed) return;
    const src = Array.isArray(list) ? list : [];
    let same = src.length === this.order.length && this.slotVersion === this.layoutVersion;
    for (let i = 0; same && i < src.length; i += 1) {
      const a = src[i];
      const b = this.order[i];
      if (a.id !== b.id || a.category !== b.category || a.kind !== b.kind || a.type !== b.type) same = false;
    }
    if (!same) this.rebuildSlots(src);
    this.order = src;
    this.writePositions();
    this.settleAfterUpdate();
  }

  // After the list changed: drop a selection / hover whose entity is gone, so nothing keeps a stale reference.
  settleAfterUpdate() {
    if (this.selectionLost) {
      this.selectionLost = false;
      this.dropLostSelection();
    }
    if (this.hovered && !this.idMap.has(this.hovered.id)) this.clearHover();
  }

  // The selected entity left the list: clear selection state, leave follow mode, restore normal display, tell the owner.
  dropLostSelection() {
    if (this.following) this.setFollow(false); // glides back to the Earth-centred orbit and reports onFollowChange(false)
    this.selected = null;
    this.ring.visible = false;
    this.selMarker.visible = false;
    this.motion.reset();
    this.followState.hasPrev = false;
    this.setPath(null);
    this.hideDetail();
    this.applyIsolation();
    this.notifySelect(null);
  }

  rebuildSlots(src) {
    this.slotVersion = this.layoutVersion;
    const counts = {};
    this.typeKeys.forEach(k => {
      counts[k] = 0;
    });
    const n = src.length;
    this.slotCat = new Uint8Array(n);
    this.slotIdx = new Uint32Array(n);
    this.idMap = new Map();
    const kindIndex = {};
    this.typeKeys.forEach((k, i) => {
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
    this.typeKeys.forEach(k => {
      const g = this.groups[k];
      g.count = counts[k];
      g.entities = new Array(counts[k]);
      if (counts[k] > g.cap) {
        if (g.mesh) {
          this.scene.remove(g.mesh);
          if (g.mesh.dispose) g.mesh.dispose();
        }
        g.cap = Math.max(64, Math.ceil(counts[k] * 1.25));
        g.mesh = new THREE.InstancedMesh(g.geometry, this.entityMaterial, g.cap);
        g.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        g.mesh.frustumCulled = false; // one huge bounding sphere; per-instance culling is not available
        this.scene.add(g.mesh);
        g.pos = new Float32Array(g.cap * 3);
        g.basis = new Float32Array(g.cap * 9);
        g.has = new Uint8Array(g.cap);
      } else {
        g.has.fill(0); // slots were reassigned: previous positions no longer belong to the same entity
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
        this.selectionLost = true; // finished by settleAfterUpdate() once the new list is drawn
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
    this.densityScale = this.adaptive ? markerDensityScale(src.length) : 1;
    this.typeKeys.forEach(k => {
      scales[k] = this.types[k].size * this.markerScale * this.densityScale;
    });
    for (let i = 0; i < src.length; i += 1) {
      const sat = src[i];
      const k = this.typeKeys[this.slotCat[i]];
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
      g.entities[idx] = sat;

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
    this.typeKeys.forEach(k => {
      const g = this.groups[k];
      if (g.mesh) g.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  setAdaptiveMarkers(on) {
    const next = on === true;
    if (next === this.adaptive) return;
    this.adaptive = next;
    this.densityScale = next ? markerDensityScale(this.order.length) : 1;
    this.rescaleMarkers();
  }

  rescaleMarkers() {
    this.typeKeys.forEach(k => {
      const g = this.groups[k];
      if (!g.mesh) return;
      const s = this.types[k].size * this.markerScale * this.densityScale;
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

  // ----- detailed model for the selected entity (lazy) -----------------
  hideDetail() {
    this.detailToken += 1;
    if (this.detail) {
      this.scene.remove(this.detail);
      this.detail = null;
    }
  }

  showDetail(kind) {
    this.hideDetail();
    if (!this.detailEnabled || kind === FALLBACK_TYPE) return; // the fallback type never has a detailed model
    const token = this.detailToken;
    this.getDetailModel(kind).then(
      obj => {
        if (!obj || this.disposed || token !== this.detailToken || !this.selected) return;
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
      this.envMaterials.forEach(m => {
        m.envMap = this.envTex;
        m.needsUpdate = true;
      });
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
    if (!obj && this.models.detail) {
      obj = this.models.detail(kind, {
        envMap: this.ensureEnv(),
        maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
        track: o => this.track(o),
        registerEnvMaterial: m => this.envMaterials.push(m),
        store: this.modelStore,
      });
    }
    if (!obj) return null; // this type has no detailed model: the instanced marker stays
    if (this.disposed) return obj;
    this.detailCache.set(kind, obj);
    return obj;
  }

  // Optional custom GLB per render type (axes: +X along-track, +Y panel axis, +Z away from Earth).
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
      s = this.types[this.selected.k].size * this.markerScale * this.densityScale * 1.5;
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

  // The selected entity is drawn from the interpolated motion, so its instanced copy is made degenerate.
  hideSelectedInstance() {
    if (!this.selected) return;
    const g = this.groups[this.selected.k];
    if (!g.mesh || this.selected.idx >= g.count) return;
    const a = g.mesh.instanceMatrix.array;
    const o = this.selected.idx * 16;
    a[o] = a[o + 1] = a[o + 2] = a[o + 4] = a[o + 5] = a[o + 6] = a[o + 8] = a[o + 9] = a[o + 10] = 0;
    g.mesh.instanceMatrix.needsUpdate = true;
  }

  // ----- subject interface (feature-independent) --------------------------------
  // Subscribers and the pull-style ticker both feed `setEntities`; a subject's type registry, models and
  // type resolver are applied through `applyTypeSystem`.
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

  // Swaps the render-type registry, model provider and resolver. Everything built from the previous
  // registry (instanced meshes, detail models) is torn down; the selection is cleared silently.
  applyTypeSystem(ts) {
    const next = {
      types: ts.types && typeof ts.types === 'object' ? ts.types : DEFAULT_TYPES,
      models: ts.models && typeof ts.models.silhouette === 'function' ? ts.models : DEFAULT_MODELS,
      resolveType: typeof ts.resolveType === 'function' ? ts.resolveType : defaultResolveType,
    };
    if (!next.types[FALLBACK_TYPE]) next.types = { ...next.types, [FALLBACK_TYPE]: DEFAULT_TYPES[FALLBACK_TYPE] };
    // Compare what the caller passed (not the normalised copy), so re-attaching the same registry is free.
    const src = this.typeSystem && this.typeSystem.src;
    if (src && src.types === ts.types && src.models === ts.models && src.resolveType === ts.resolveType) return;
    this.clearHover();
    if (this.selected) this.setSelectedEntity(null, false); // also leaves follow mode; owner is told
    this.hideDetail();
    this.detailCache.forEach(disposeObject);
    this.detailCache.clear();
    this.modelStore = {};
    this.envMaterials = [];
    Object.values(this.groups).forEach(g => {
      if (g.mesh) {
        this.scene.remove(g.mesh);
        if (g.mesh.dispose) g.mesh.dispose();
      }
      g.geometry.dispose();
    });
    this.groups = {};

    this.typeSystem = { ...next, src: { types: ts.types, models: ts.models, resolveType: ts.resolveType } };
    this.types = next.types;
    this.typeKeys = Object.keys(next.types);
    this.models = next.models;
    this.typeOf = next.resolveType;
    const level = this.lowTier ? 0 : 1;
    this.typeKeys.forEach(k => {
      this.groups[k] = {
        k,
        geometry: this.track(this.models.silhouette(k, level)),
        mesh: null,
        cap: 0,
        count: 0,
        pos: new Float32Array(0),
        basis: new Float32Array(0),
        has: new Uint8Array(0),
        entities: [],
      };
    });
    this.order = [];
    this.slotCat = new Uint8Array(0);
    this.slotIdx = new Uint32Array(0);
    this.idMap = new Map();
    this.layoutVersion += 1; // slots must be rebuilt against the new registry
    if (this.selMarker) this.selMarker.geometry = this.groups[FALLBACK_TYPE].geometry;
  }

  // Connects a feature's content to the globe. Returns false (and attaches nothing) for an invalid subject.
  attachSubject(subject) {
    this.releaseSubject();
    if (this.disposed) return false;
    if (!isValidSubject(subject)) {
      console.error('[SpaceTecGlobeEngine] attachSubject: a subject needs a getEntities() function', subject);
      return false;
    }
    this.applyTypeSystem(subject);
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

  // Stops the current subject's updates but keeps its types on screen (used when swapping subjects).
  releaseSubject() {
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
  }

  // Releases the subject and returns the engine to its default (feature-free) type system.
  // `keepTypes` skips the reset when another subject is about to be attached.
  detachSubject(keepTypes) {
    this.releaseSubject();
    if (!keepTypes && !this.disposed) this.applyTypeSystem(DEFAULT_TYPE_SYSTEM);
  }

  setTicker(fn, intervalMs) {
    this.ticker = fn ? { fn, interval: intervalMs } : null;
    this.tickAcc = intervalMs || 0; // fire on the next frame
  }

  setSelectedEntity(id, silent) {
    if (id === null || id === undefined) {
      const had = Boolean(this.selected);
      if (this.following) this.setFollow(false);
      this.selected = null;
      this.ring.visible = false;
      this.selMarker.visible = false;
      this.motion.reset();
      this.setPath(null);
      this.hideDetail();
      this.applyIsolation();
      if (had && this.order.length) this.writePositions(); // restore the hidden instanced marker
      if (!silent) this.notifySelect(null);
      return;
    }
    const hit = this.idMap.get(String(id));
    if (!hit) return;
    const changed = !this.selected || String(this.selected.id) !== String(id);
    this.selected = { ...hit, id };
    this.ring.visible = true;
    this.applyIsolation();
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
    if (!silent) this.notifySelect(this.getSelectedEntity());
  }

  hasEntity(id) {
    return id !== null && id !== undefined && this.idMap.has(String(id));
  }

  getSelectedEntity() {
    if (!this.selected) return null;
    return this.groups[this.selected.k].entities[this.selected.idx] || null;
  }

  selectedPosition(out) {
    if (!this.selected) return null;
    if (this.motion.has) return out.set(this.motion.disp[0], this.motion.disp[1], this.motion.disp[2]);
    const g = this.groups[this.selected.k];
    const i = this.selected.idx * 3;
    return out.set(g.pos[i], g.pos[i + 1], g.pos[i + 2]);
  }

  // Updates the existing line in place when the point count is unchanged (no per-refresh allocation).
  setPath(points) {
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

  // Chase camera: translate with the entity and rotate the view offset with its motion frame, so
  // the entity stays centred with no trailing, while rotate/zoom keep working around it.
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

  focusEntity(id) {
    this.setSelectedEntity(id, false);
    const p = this.selectedPosition(new THREE.Vector3());
    if (!p) return;
    const ll = vecToLL(p);
    this.flyTo(ll.lat, ll.lng, Math.min(this.camera.position.length(), 2.2), 1000);
  }

  // ----- interaction --------------------------------------------------------
  onPointerDown = e => {
    if (!this.interactive) return;
    this.hoverReq = null;
    this.clearHover(); // dragging the globe is not hovering
    this.pointers.add(e.pointerId);
    if (this.pointers.size === 1) {
      this.gesture = { x: e.clientX, y: e.clientY, t: performance.now(), multi: false, type: e.pointerType };
    } else if (this.gesture) {
      this.gesture.multi = true;
    }
  };

  onPointerUp = e => {
    if (!this.interactive) return;
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

  // Hover: mouse / pen only (touch has no hover). The position is stored here and picked inside update(), so a
  // fast-moving pointer costs at most one O(entities) pick per HOVER_INTERVAL_MS.
  onPointerMove = e => {
    if (!this.interactive || this.disposed || e.pointerType === 'touch' || this.pointers.size > 0) return;
    this.hoverReq = { x: e.clientX, y: e.clientY };
  };

  onPointerLeave = () => {
    this.hoverReq = null;
    this.clearHover();
  };

  processHover(now) {
    const req = this.hoverReq;
    if (!req) return;
    if (!this.interactive) {
      this.hoverReq = null;
      return;
    }
    if (now - this.hoverAt < HOVER_INTERVAL_MS) return; // keep the request for a later frame
    this.hoverAt = now;
    this.hoverReq = null;
    const hit = this.pickEntity(req.x, req.y, HOVER_RADIUS_PX);
    const entity = hit ? this.groups[hit.k].entities[hit.idx] || null : null;
    this.setHovered(entity, req);
  }

  setHovered(entity, pointer) {
    const id = entity ? String(entity.id) : null;
    if (id === (this.hovered ? this.hovered.id : null)) return;
    this.hovered = entity ? { id } : null;
    if (!this.cb.onHover) return;
    let pos = null;
    if (entity && pointer) {
      const rect = this.canvas.getBoundingClientRect();
      pos = { x: pointer.x - rect.left, y: pointer.y - rect.top };
    }
    try {
      this.cb.onHover(entity, pos);
    } catch (error) {
      console.error('[SpaceTecGlobeEngine] onHover failed', error);
    }
  }

  clearHover() {
    this.hoverReq = null;
    if (this.hovered) this.setHovered(null, null);
  }

  getHoveredEntity() {
    if (!this.hovered) return null;
    const hit = this.idMap.get(this.hovered.id);
    return hit ? this.groups[hit.k].entities[hit.idx] || null : null;
  }

  // Sets the user-interaction level: true / 'full' (camera + picking + hover), 'pick' (camera locked, picking and
  // hover only) or false (none). In 'pick' and false the OrbitControls are disabled; touch-action is 'pan-y' for
  // 'pick' and 'auto' for false so the page scrolls over the globe. Programmatic control (selectedId, focusEntity,
  // follow, flyTo, autoRotate) is unaffected.
  setInteractive(on, quiet) {
    const mode = on === 'pick' ? 'pick' : on ? 'full' : 'off';
    if (mode === this.interactiveMode && !quiet) return;
    this.interactiveMode = mode;
    this.interactive = mode !== 'off';
    this.controls.enabled = mode === 'full';
    if (this.canvas.style) this.canvas.style.touchAction = mode === 'full' ? this.baseTouchAction : mode === 'pick' ? 'pan-y' : 'auto';
    if (mode === 'off') {
      this.pointers.clear();
      this.gesture = null;
      this.lastTap = null;
      this.clearHover();
    }
  }

  // While something is selected, draw every other entity faint (see ISOLATE_OPACITY). Purely visual: the
  // entities stay in the list and stay pickable; clearing the selection restores the normal display.
  setIsolateSelected(on) {
    this.isolate = Boolean(on);
    this.applyIsolation();
  }

  applyIsolation() {
    const dim = this.isolate && Boolean(this.selected);
    if (dim === this.isolated) return;
    this.isolated = dim;
    const m = this.entityMaterial;
    if (!m) return;
    m.transparent = dim;
    m.opacity = dim ? ISOLATE_OPACITY : 1;
    m.depthWrite = !dim;
    m.needsUpdate = true;
  }

  tap(clientX, clientY, radius) {
    const hit = this.pickEntity(clientX, clientY, radius);
    if (hit) {
      const sat = this.groups[hit.k].entities[hit.idx];
      this.setSelectedEntity(sat.id, false);
    } else if (this.selected) {
      this.setFollow(false);
      this.setSelectedEntity(null, false);
    }
  }

  pickEntity(clientX, clientY, radius) {
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
    this.typeKeys.forEach(k => {
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
        // Occlusion: does the camera->entity segment cross the Earth?
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

    if (this.hoverReq) this.processHover(now);

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
        this.typeKeys.forEach(k => {
          counts[k] = this.groups[k].count;
        });
        const s = this.getSelectedEntity();
        this.cb.onStats({
          fps: Math.round(fps),
          dpr: this.dpr,
          total: this.order.length,
          counts,
          types: this.types,
          typeKeys: this.typeKeys,
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
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.hovered = null;
    this.hoverReq = null;
    this.controls.removeEventListener('start', this.onControlStart);
    this.controls.dispose();
    this.setPath(null);
    this.typeKeys.forEach(k => {
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
// React component
// ---------------------------------------------------------------------------
// Selection card content: the subject's own description, or a generic one built from the entity.
function describeSelected(subject, entity) {
  if (subject && typeof subject.describeEntity === 'function') {
    try {
      const d = subject.describeEntity(entity);
      if (d && Array.isArray(d.rows)) return { title: d.title || entity.id, subtitle: d.subtitle || '', rows: d.rows };
    } catch (error) {
      console.warn('[SpaceTecGlobeEngine] subject.describeEntity failed', error);
    }
  }
  const rows = [
    { label: 'Altitude', value: `${Number(entity.altitudeKm || 0).toFixed(0)} km` },
    { label: 'Latitude', value: `${Number(entity.lat).toFixed(2)}°` },
    { label: 'Longitude', value: `${Number(entity.lng).toFixed(2)}°` },
  ];
  return { title: entity.name || String(entity.id), subtitle: String(entity.id), rows };
}

const SpaceTecGlobeEngine = forwardRef(function SpaceTecGlobeEngine(
  {
    subject,
    entities,
    selectedId,
    onSelect,
    onHover,
    onFollowChange,
    onStatusChange,
    interactive = true,
    isolateSelected = false,
    adaptiveMarkers = false,
    path,
    legendExtras,
    textureUrls,
    assetBase = '/globe-lab',
    textureTier = 'auto',
    modelUrls,
    detailedModels = 'auto',
    normalScale = 1,
    quality = 'auto',
    showControls = true,
    autoRotate = false,
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
  const [showPath, setShowPath] = useState(true);
  const [rotate, setRotate] = useState(autoRotate);
  const [internalSel, setInternalSel] = useState(null);

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onFollowRef = useRef(onFollowChange);
  onFollowRef.current = onFollowChange;
  const onStatusRef = useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  const texKey = JSON.stringify([textureUrls || null, assetBase, textureTier, detailedModels, modelUrls || null]);
  const effectiveSel = selectedId !== undefined ? selectedId : internalSel;

  useEffect(() => setRotate(autoRotate), [autoRotate]);

  // Lets the owner react to engine lifecycle changes (waiting | nosize | loading | ready | unavailable | lost | error).
  useEffect(() => {
    if (onStatusRef.current) onStatusRef.current(status);
  }, [status]);

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
          interactive,
          isolateSelected,
          adaptiveMarkers,
          callbacks: {
            onSelect: entity => {
              setInternalSel(entity ? entity.id : null);
              if (onSelectRef.current) onSelectRef.current(entity);
            },
            onHover: (entity, pos) => {
              if (onHoverRef.current) onHoverRef.current(entity, pos);
            },
            onFollowChange: on => {
              setFollowing(on);
              if (onFollowRef.current) onFollowRef.current(on);
            },
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

  // Content: a feature subject (built by an adapter) or a plain `entities` array.
  useEffect(() => {
    if (!engine) return undefined;
    if (subject) {
      engine.attachSubject(subject);
      return () => engine.detachSubject(true); // keeps the types on screen if another subject follows
    }
    engine.detachSubject(); // back to the default type system
    engine.setEntities(Array.isArray(entities) ? entities : []);
    return undefined;
  }, [engine, subject, entities]);

  useEffect(() => {
    if (engine) engine.setAutoRotate(rotate);
  }, [engine, rotate]);

  useEffect(() => {
    if (engine) engine.setNormalScale(normalScale);
  }, [engine, normalScale]);

  useEffect(() => {
    if (engine) engine.setInteractive(interactive);
  }, [engine, interactive]);

  useEffect(() => {
    if (engine) engine.setIsolateSelected(isolateSelected);
  }, [engine, isolateSelected]);
  useEffect(() => {
    if (engine) engine.setAdaptiveMarkers(adaptiveMarkers);
  }, [engine, adaptiveMarkers]);

  // Selection from props / internal state.
  useEffect(() => {
    if (!engine) return;
    if (effectiveSel === null || effectiveSel === undefined) {
      if (engine.selected) engine.setSelectedEntity(null, true);
    } else if (!engine.hasEntity(effectiveSel)) {
      // The requested entity is not in the list (filtered out, removed, not loaded yet): show no selection.
      if (engine.selected) engine.setSelectedEntity(null, true);
    } else if (!engine.selected || String(engine.selected.id) !== String(effectiveSel)) {
      engine.setSelectedEntity(effectiveSel, true);
    }
  }, [engine, effectiveSel, entities, subject]);

  // Path for the selected entity: a static `path` prop, or the subject's getPath().
  useEffect(() => {
    if (!engine) return undefined;
    if (!showPath || effectiveSel === null || effectiveSel === undefined) {
      engine.setPath(null);
      return undefined;
    }
    if (Array.isArray(path)) {
      engine.setPath(path);
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
  }, [engine, effectiveSel, showPath, path, subject]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => engine && engine.resetView(),
      flyTo: (lat, lng, distance) => engine && engine.flyTo(lat, lng, distance),
      setFollow: on => engine && engine.setFollow(on),
      focusEntity: id => engine && engine.focusEntity(id),
      // Programmatic selection without moving the camera or notifying the owner (the engine's own setSelectedEntity).
      select: id => engine && engine.setSelectedEntity(id, true),
    }),
    [engine]
  );

  const clearSelection = useCallback(() => {
    if (engine) {
      engine.setFollow(false);
      engine.setSelectedEntity(null, false);
    }
  }, [engine]);

  const sel = stats && stats.selected;
  const labels = (subject && subject.labels) || {};
  const card = sel ? describeSelected(subject, sel) : null;
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
            <button type="button" className={`stge-btn ${showPath ? 'is-on' : ''}`} aria-pressed={showPath} onClick={() => setShowPath(v => !v)}>
              {labels.path || 'Path'}
            </button>
            <button type="button" className={`stge-btn ${rotate ? 'is-on' : ''}`} aria-pressed={rotate} onClick={() => setRotate(v => !v)}>
              Auto-rotate
            </button>
          </div>

          <div className="stge-legend" aria-label={labels.legend || 'Object types'}>
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
            {stats && stats.types
              ? stats.typeKeys.map(k => (
                  <div key={k} className="stge-legend-row">
                    <i style={{ background: stats.types[k].color }} />
                    <span>{stats.types[k].label}</span>
                    <b>{(stats.counts[k] || 0).toLocaleString()}</b>
                  </div>
                ))
              : null}
            {legendExtras || null}
          </div>

          {card && (
            <div className="stge-card" role="region" aria-label={labels.selected || 'Selected object'}>
              <div className="stge-card-head">
                <div>
                  <strong>{card.title}</strong>
                  <span>{card.subtitle}</span>
                </div>
                <button type="button" className="stge-btn" onClick={clearSelection} aria-label="Clear selection">
                  Close
                </button>
              </div>
              <dl>
                {card.rows.map(r => (
                  <div key={r.label}>
                    <dt>{r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default SpaceTecGlobeEngine;
