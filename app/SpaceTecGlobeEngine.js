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
 * Satellite data contract (props.satellites):
 *   { id, name?, category?: 'leo'|'meo'|'geo'|'station'|'other',
 *     lat (deg), lng (deg), altitudeKm, velocityKmS? }
 * If `satellites` is omitted, an internal generated test fleet is used.
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
const CAT_KEYS = Object.keys(CATEGORIES);

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
        cloudImg.data[o] = 255;
        cloudImg.data[o + 1] = 255;
        cloudImg.data[o + 2] = 255;
        cloudImg.data[o + 3] = c * 215;
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
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform vec3 sunDir;
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  vec3 n = normalize(vN); vec3 s = normalize(sunDir);
  float l = dot(n, s);
  float dayMix = smoothstep(-0.12, 0.18, l);
  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb;
  vec3 col = mix(night * 1.1, day * (0.06 + 0.94 * max(l, 0.0)), dayMix);
  float tw = smoothstep(-0.18, 0.0, l) * (1.0 - smoothstep(0.0, 0.22, l));
  col += vec3(0.5, 0.22, 0.08) * tw * 0.12;
  float ocean = clamp((day.b - day.r * 1.4) * 3.0, 0.0, 1.0);
  vec3 hv = normalize(s + vView);
  col += vec3(0.8, 0.9, 1.0) * pow(max(dot(n, hv), 0.0), 60.0) * ocean * step(0.0, l) * 0.45;
  float fr = pow(1.0 - max(dot(n, vView), 0.0), 3.0);
  col += vec3(0.18, 0.38, 0.8) * fr * (0.25 + 0.75 * dayMix) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

const CLOUD_FRAG = `
uniform sampler2D cloudMap; uniform vec3 sunDir;
varying vec2 vUv; varying vec3 vN; varying vec3 vView;
void main(){
  vec4 c = texture2D(cloudMap, vUv);
  float l = dot(normalize(vN), normalize(sunDir));
  float lit = 0.07 + 0.93 * smoothstep(-0.1, 0.3, l);
  gl_FragColor = vec4(vec3(lit), c.a * 0.85);
}`;

const ATMO_VERT = `
varying vec3 vN; varying vec3 vW;
void main(){
  vN = normalize(normalMatrix * normal);
  vW = normalize(mat3(modelMatrix) * position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMO_FRAG = `
uniform vec3 sunDir;
varying vec3 vN; varying vec3 vW;
void main(){
  float a = clamp(-dot(normalize(vN), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
  float i = pow(clamp(a / 0.34, 0.0, 1.0), 1.7);
  float sun = 0.3 + 0.7 * smoothstep(-0.35, 0.45, dot(vW, normalize(sunDir)));
  gl_FragColor = vec4(vec3(0.24, 0.52, 1.0) * i * sun * 1.15, i * sun);
}`;

// ---------------------------------------------------------------------------
// GlobeEngine: pure Three.js, no React
// ---------------------------------------------------------------------------
class GlobeEngine {
  constructor(container, opts) {
    this.container = container;
    this.cb = opts.callbacks || {};
    this.textureUrls = opts.textureUrls || null;
    this.lowTier = opts.quality === 'low' || (opts.quality !== 'high' && detectLowTier());
    this.maxDpr = this.lowTier ? 1.5 : 2;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);

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
      this.tween = null;
      if (this.following) this.setFollow(false);
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

    sunDirection(new Date(), this.sun);
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
        uniforms: { sunDir: { value: this.sun } },
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

  buildEarth(tex) {
    this.textures = tex;
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    [tex.day, tex.night, tex.clouds].forEach(t => {
      if (!t) return;
      t.anisotropy = aniso;
      this.track(t);
    });
    const seg = this.lowTier ? 64 : 128;
    const geo = this.track(new THREE.SphereGeometry(1, seg, Math.floor(seg * 0.75)));
    const mat = this.track(
      new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERT,
        fragmentShader: EARTH_FRAG,
        uniforms: {
          dayMap: { value: tex.day },
          nightMap: { value: tex.night },
          sunDir: { value: this.sun },
        },
      })
    );
    this.earth = new THREE.Mesh(geo, mat);
    this.scene.add(this.earth);

    if (tex.clouds) {
      const cmat = this.track(
        new THREE.ShaderMaterial({
          vertexShader: SURFACE_VERT,
          fragmentShader: CLOUD_FRAG,
          uniforms: { cloudMap: { value: tex.clouds }, sunDir: { value: this.sun } },
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

  buildSatelliteGroups() {
    const shapes = {
      octa: () => new THREE.OctahedronGeometry(1),
      box: () => new THREE.BoxGeometry(1.3, 1.3, 1.3),
      tetra: () => new THREE.TetrahedronGeometry(1.3),
      ico: () => new THREE.IcosahedronGeometry(1, 0),
    };
    CAT_KEYS.forEach(k => {
      const cfg = CATEGORIES[k];
      const geometry = this.track(shapes[cfg.shape]());
      const material = this.track(new THREE.MeshBasicMaterial({ color: cfg.color }));
      this.groups[k] = { k, geometry, material, mesh: null, cap: 0, count: 0, pos: new Float32Array(0), sats: [] };
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
  }

  async init() {
    await new Promise(r => setTimeout(r, 30)); // let the loading state paint first
    let tex = null;
    const urls = this.textureUrls;
    if (urls && urls.day) {
      try {
        const [day, night, clouds] = await Promise.all([
          loadTexture(urls.day),
          urls.night ? loadTexture(urls.night) : Promise.resolve(null),
          urls.clouds && !this.lowTier ? loadTexture(urls.clouds) : Promise.resolve(null),
        ]);
        if (!night) {
          const c = document.createElement('canvas');
          c.width = 2;
          c.height = 2;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#02040a';
          ctx.fillRect(0, 0, 2, 2);
          tex = { day, night: new THREE.CanvasTexture(c), clouds };
        } else {
          tex = { day, night, clouds };
        }
      } catch (error) {
        console.warn('[SpaceTecGlobeEngine] local textures failed, using procedural Earth', error);
      }
    }
    if (this.disposed) return;
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
    let same = src.length === this.order.length;
    for (let i = 0; same && i < src.length; i += 1) {
      const a = src[i];
      const b = this.order[i];
      if (a.id !== b.id || a.category !== b.category) same = false;
    }
    if (!same) this.rebuildSlots(src);
    this.order = src;
    this.writePositions();
  }

  rebuildSlots(src) {
    const counts = {};
    CAT_KEYS.forEach(k => {
      counts[k] = 0;
    });
    const n = src.length;
    this.slotCat = new Uint8Array(n);
    this.slotIdx = new Uint32Array(n);
    this.idMap = new Map();
    const catIndex = {};
    CAT_KEYS.forEach((k, i) => {
      catIndex[k] = i;
    });
    for (let i = 0; i < n; i += 1) {
      const k = CATEGORIES[src[i].category] ? src[i].category : 'other';
      this.slotCat[i] = catIndex[k];
      this.slotIdx[i] = counts[k];
      this.idMap.set(String(src[i].id), { k, idx: counts[k] });
      counts[k] += 1;
    }
    CAT_KEYS.forEach(k => {
      const g = this.groups[k];
      g.count = counts[k];
      g.sats = new Array(counts[k]);
      if (counts[k] > g.cap) {
        if (g.mesh) {
          this.scene.remove(g.mesh);
          if (g.mesh.dispose) g.mesh.dispose();
        }
        g.cap = Math.max(64, Math.ceil(counts[k] * 1.25));
        g.mesh = new THREE.InstancedMesh(g.geometry, g.material, g.cap);
        g.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        g.mesh.frustumCulled = false;
        this.scene.add(g.mesh);
        g.pos = new Float32Array(g.cap * 3);
      }
      if (g.mesh) g.mesh.count = counts[k];
    });
    // Keep the selection if the same id still exists.
    if (this.selected) {
      const prev = this.selected.id;
      const hit = this.idMap.get(String(prev));
      this.selected = hit ? { ...hit, id: prev } : null;
      if (!hit) this.ring.visible = false;
    }
  }

  writePositions() {
    const src = this.order;
    const v = this._v;
    const scales = {};
    CAT_KEYS.forEach(k => {
      scales[k] = CATEGORIES[k].size * this.markerScale;
    });
    for (let i = 0; i < src.length; i += 1) {
      const sat = src[i];
      const k = CAT_KEYS[this.slotCat[i]];
      const g = this.groups[k];
      const idx = this.slotIdx[i];
      const r = 1 + Math.max(0, Number(sat.altitudeKm) || 0) / EARTH_KM;
      llToVec(Number(sat.lat) || 0, Number(sat.lng) || 0, r, v);
      g.sats[idx] = sat;
      g.pos[idx * 3] = v.x;
      g.pos[idx * 3 + 1] = v.y;
      g.pos[idx * 3 + 2] = v.z;
      const a = g.mesh.instanceMatrix.array;
      const o = idx * 16;
      const s = scales[k];
      a[o] = s; a[o + 1] = 0; a[o + 2] = 0; a[o + 3] = 0;
      a[o + 4] = 0; a[o + 5] = s; a[o + 6] = 0; a[o + 7] = 0;
      a[o + 8] = 0; a[o + 9] = 0; a[o + 10] = s; a[o + 11] = 0;
      a[o + 12] = v.x; a[o + 13] = v.y; a[o + 14] = v.z; a[o + 15] = 1;
    }
    this.appliedScale = this.markerScale;
    CAT_KEYS.forEach(k => {
      const g = this.groups[k];
      if (g.mesh) g.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  rescaleMarkers() {
    CAT_KEYS.forEach(k => {
      const g = this.groups[k];
      if (!g.mesh) return;
      const s = CATEGORIES[k].size * this.markerScale;
      const a = g.mesh.instanceMatrix.array;
      for (let i = 0; i < g.count; i += 1) {
        const o = i * 16;
        a[o] = s;
        a[o + 5] = s;
        a[o + 10] = s;
      }
      g.mesh.instanceMatrix.needsUpdate = true;
    });
    this.appliedScale = this.markerScale;
  }

  setTicker(fn, intervalMs) {
    this.ticker = fn ? { fn, interval: intervalMs } : null;
    this.tickAcc = intervalMs || 0; // fire on the next frame
  }

  setSelected(id, silent) {
    if (id === null || id === undefined) {
      this.selected = null;
      this.ring.visible = false;
      this.setOrbitPath(null);
      if (!silent && this.cb.onSelect) this.cb.onSelect(null);
      return;
    }
    const hit = this.idMap.get(String(id));
    if (!hit) return;
    this.selected = { ...hit, id };
    this.ring.visible = true;
    if (!silent && this.cb.onSelect) this.cb.onSelect(this.getSelectedSat());
  }

  getSelectedSat() {
    if (!this.selected) return null;
    return this.groups[this.selected.k].sats[this.selected.idx] || null;
  }

  selectedPosition(out) {
    if (!this.selected) return null;
    const g = this.groups[this.selected.k];
    const i = this.selected.idx * 3;
    return out.set(g.pos[i], g.pos[i + 1], g.pos[i + 2]);
  }

  setOrbitPath(points) {
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
      this.pathLine.geometry.dispose();
      this.pathLine = null;
    }
    if (!points || points.length < 2) return;
    const arr = new Float32Array(points.length * 3);
    const v = this._v;
    points.forEach((p, i) => {
      llToVec(p.lat, p.lng, 1 + Math.max(0, p.altitudeKm || 0) / EARTH_KM, v);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.pathLine = new THREE.Line(geo, this.pathMat);
    this.pathLine.frustumCulled = false;
    this.scene.add(this.pathLine);
  }

  // ----- camera ---------------------------------------------------------------
  flyTo(lat, lng, distance, ms = 1100) {
    const toDir = llToVec(lat, lng, 1, new THREE.Vector3());
    const fromPos = this.camera.position.clone();
    const fromDist = fromPos.length();
    this.tween = {
      t0: performance.now(),
      ms,
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
    if (next) this.tween = null;
    if (this.cb.onFollowChange) this.cb.onFollowChange(next);
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
    CAT_KEYS.forEach(k => {
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

    this.sunClock += dt;
    if (this.sunClock > 30) {
      this.sunClock = 0;
      sunDirection(new Date(), this.sun);
    }
    if (this.clouds) this.clouds.rotation.y += dt * 0.0025;

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
    } else if (this.following && this.selected) {
      const sp = this.selectedPosition(this._v);
      if (sp) {
        ctl.target.multiplyScalar(0.9);
        const dist = cam.position.length();
        const cur = cam.position.clone().divideScalar(dist);
        this._q.setFromUnitVectors(cur, sp.clone().normalize());
        this._qi.identity().slerp(this._q, 1 - Math.exp(-dt * 3.5));
        cam.position.applyQuaternion(this._qi);
      }
    }

    const dist = cam.position.distanceTo(ctl.target);
    ctl.rotateSpeed = clamp((dist - 1) * 0.3, 0.08, 0.65);
    ctl.update();
    const excess = ctl.target.length() - 2.5;
    if (excess > 0) {
      const shift = ctl.target.clone().setLength(excess);
      ctl.target.sub(shift);
      cam.position.sub(shift);
    }

    // Marker size follows zoom so dots stay readable but never swamp the globe.
    this.markerScale = clamp(cam.position.length() / 3.6, 0.35, 1.8);
    if (Math.abs(this.markerScale / this.appliedScale - 1) > 0.06) this.rescaleMarkers();

    if (this.selected) {
      const sp = this.selectedPosition(this._v);
      if (sp) {
        this.ring.position.copy(sp);
        this.ring.scale.setScalar(cam.position.distanceTo(sp) * 0.045);
      }
    }

    // Adaptive resolution: drop pixel ratio if the device cannot keep up.
    this.emaDt += (dt - this.emaDt) * 0.05;
    this.slowClock += dt;
    if (this.slowClock > 2.5) {
      this.slowClock = 0;
      if (this.emaDt > 0.032 && this.dpr > 1) {
        this.dpr = Math.max(1, this.dpr - 0.25);
        this.renderer.setPixelRatio(this.dpr);
        this.resize(this.container.clientWidth, this.container.clientHeight);
        this.emaDt = 0.02;
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
        CAT_KEYS.forEach(k => {
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
    this.ticker = null;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.controls.removeEventListener('start', this.onControlStart);
    this.controls.dispose();
    this.setOrbitPath(null);
    CAT_KEYS.forEach(k => {
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
  const add = (category, name, altKm, incDeg, raanDeg, phaseDeg) => {
    const a = EARTH_KM + altKm;
    const inc = incDeg * DEG;
    const raan = raanDeg * DEG;
    const n = Math.sqrt(MU / (a * a * a));
    const id = `STG-${10000 + sats.length}`;
    const sat = {
      id,
      name,
      category,
      lat: 0,
      lng: 0,
      altitudeKm: altKm,
      velocityKmS: Math.sqrt(MU / a),
      inclinationDeg: incDeg,
      periodMin: (2 * Math.PI) / n / 60,
      isTest: true,
    };
    const rec = { a, n, m0: phaseDeg * DEG, cosI: Math.cos(inc), sinI: Math.sin(inc), cosR: Math.cos(raan), sinR: Math.sin(raan) };
    sats.push(sat);
    recs.push(rec);
    byId.set(id, rec);
  };

  add('station', 'Test Station Alpha', 410, 51.6, 40, 10);
  add('station', 'Test Station Beta', 390, 41.5, 200, 120);
  add('station', 'Test Station Gamma', 430, 97.4, 300, 250);
  const incLeo = [53, 53, 70, 97.6, 98.2, 86.4, 43];
  for (let i = sats.length; i < count; i += 1) {
    const r = rnd();
    const num = 10000 + i;
    if (r < 0.8) {
      add('leo', `LEO-${num}`, 350 + Math.pow(rnd(), 1.5) * 1400, incLeo[Math.floor(rnd() * incLeo.length)] + (rnd() - 0.5) * 0.4, rnd() * 360, rnd() * 360);
    } else if (r < 0.92) {
      add('meo', `MEO-${num}`, 19100 + rnd() * 4100, rnd() < 0.5 ? 55 + rnd() : 64.8 + rnd(), rnd() * 360, rnd() * 360);
    } else if (r < 0.98) {
      add('geo', `GEO-${num}`, 35786, rnd() * 4, rnd() * 360, rnd() * 360);
    } else {
      add('other', `OBJ-${num}`, 600 + rnd() * 900, rnd() * 100, rnd() * 360, rnd() * 360);
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
const TEST_COUNTS = [500, 1000, 3000, 5000, 10000, 20000];

const SpaceTecGlobeEngine = forwardRef(function SpaceTecGlobeEngine(
  {
    satellites,
    selectedId,
    onSelect,
    orbitPath,
    textureUrls,
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

  const usingTest = !Array.isArray(satellites);
  const fleet = useMemo(() => (usingTest ? generateTestFleet(count, testTimeScale) : null), [usingTest, count, testTimeScale]);
  const data = usingTest ? fleet.sats : satellites;
  const texKey = JSON.stringify(textureUrls || null);
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

  // Satellite data (external prop) or the generated fleet's ticker.
  useEffect(() => {
    if (!engine) return undefined;
    engine.setSatellites(data);
    if (usingTest) {
      engine.setTicker(ms => {
        fleet.update(ms);
        engine.setSatellites(fleet.sats);
      }, 50);
      return () => engine.setTicker(null);
    }
    return undefined;
  }, [engine, data, usingTest, fleet]);

  useEffect(() => {
    if (engine) engine.setAutoRotate(rotate);
  }, [engine, rotate]);

  // Selection from props / internal state.
  useEffect(() => {
    if (!engine) return;
    if (effectiveSel === null || effectiveSel === undefined) {
      if (engine.selected) engine.setSelected(null, true);
    } else if (!engine.selected || String(engine.selected.id) !== String(effectiveSel)) {
      engine.setSelected(effectiveSel, true);
    }
  }, [engine, effectiveSel, data]);

  // Orbit path for the selected satellite.
  useEffect(() => {
    if (!engine) return undefined;
    if (!showOrbit || effectiveSel === null || effectiveSel === undefined) {
      engine.setOrbitPath(null);
      return undefined;
    }
    if (Array.isArray(orbitPath)) {
      engine.setOrbitPath(orbitPath);
      return undefined;
    }
    if (usingTest) {
      const draw = () => engine.setOrbitPath(fleet.orbitPath(String(effectiveSel), Date.now()));
      draw();
      const id = setInterval(draw, 1000);
      return () => clearInterval(id);
    }
    engine.setOrbitPath(null);
    return undefined;
  }, [engine, effectiveSel, showOrbit, orbitPath, usingTest, fleet]);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => engine && engine.resetView(),
      flyTo: (lat, lng, distance) => engine && engine.flyTo(lat, lng, distance),
      setFollow: on => engine && engine.setFollow(on),
      focusSatellite: id => engine && engine.focusSatellite(id),
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
            {CAT_KEYS.map(k => (
              <div key={k} className="stge-legend-row">
                <i style={{ background: CATEGORIES[k].color }} />
                <span>{CATEGORIES[k].label}</span>
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
                <div><dt>Category</dt><dd>{(CATEGORIES[sel.category] || CATEGORIES.other).label}</dd></div>
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
