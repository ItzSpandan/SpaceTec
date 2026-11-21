/**
 * Representative procedural spacecraft models for the Orbital Tracking adapter.
 * Axes of every model: +X along-track, +Y solar-array axis (orbit normal), +Z away from Earth.
 * These are REPRESENTATIVE silhouettes per category, not the real spacecraft.
 *
 * Exposed to the globe engine through the generic `subject.models` provider:
 *   silhouette(type, level) -> THREE.BufferGeometry   (instanced marker, normalised to ~1 unit)
 *   detail(type, ctx)       -> THREE.Object3D | null  (lazy, selected-object model, same scale)
 */
import * as THREE from 'three';
import { bakeParts, UNIT_BOX, UNIT_CYL, UNIT_CONE, UNIT_OCTA, UNIT_CAP, UNIT_SPH } from '../globeShared';

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

// ---------------------------------------------------------------------------
// Provider handed to the globe engine (see `subject.models` in SpaceTecGlobeEngine.js)
// ---------------------------------------------------------------------------
function createDetailMaterials(ctx) {
  const solar = ctx.track(makeSolarTexture(Math.min(8, ctx.maxAnisotropy || 1)));
  const common = { envMap: ctx.envMap || null, side: THREE.DoubleSide };
  const mats = {
    metal: ctx.track(new THREE.MeshStandardMaterial({ ...common, vertexColors: true, metalness: 0.85, roughness: 0.38, envMapIntensity: 1.1 })),
    paint: ctx.track(new THREE.MeshStandardMaterial({ ...common, vertexColors: true, metalness: 0.1, roughness: 0.55, envMapIntensity: 0.6 })),
    panel: ctx.track(
      new THREE.MeshStandardMaterial({ ...common, map: solar, metalness: 0.7, roughness: 0.28, envMapIntensity: 1.2, emissive: 0x08142a })
    ),
  };
  // The engine keeps reflections of these materials in step with the sun.
  Object.values(mats).forEach(m => ctx.registerEnvMaterial(m));
  return mats;
}

export const ORBITAL_MODELS = {
  silhouette(type, level) {
    return bakeKind(type, level);
  },

  // ctx: { envMap, maxAnisotropy, track(obj), registerEnvMaterial(mat), store } (store is per engine instance)
  detail(type, ctx) {
    const mats = ctx.store.orbitalDetailMats || (ctx.store.orbitalDetailMats = createDetailMaterials(ctx));
    const parts = detailParts(type);
    const factor = normFactor(type); // same scale as the instanced silhouette
    const group = new THREE.Group();
    ['metal', 'paint', 'panel'].forEach(m => {
      const ps = parts.filter(p => p.mat === m);
      if (!ps.length) return;
      group.add(new THREE.Mesh(ctx.track(bakeParts(ps, factor, m === 'panel')), mats[m]));
    });
    return group;
  },
};
