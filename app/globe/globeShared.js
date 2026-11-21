/**
 * Generic helpers shared by the globe engine and by feature adapters. Nothing in here knows what a
 * satellite, a launch pad or any other feature is.
 */
import * as THREE from 'three';

export const EARTH_KM = 6371;
export const DEG = Math.PI / 180;

export function mulberry32(seed) {
  let a = seed | 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Unit primitives for building representative models out of simple parts.
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
export const UNIT_CONE = new THREE.CylinderGeometry(0.5, 0.12, 1, 14);
export const UNIT_OCTA = new THREE.OctahedronGeometry(0.5);
// Dish cap: apex on +Y, concave side opens toward -Y (base radius ~0.42).
export const UNIT_CAP = new THREE.SphereGeometry(0.5, 28, 10, 0, Math.PI * 2, 0, 1.0);
export const UNIT_SPH = new THREE.SphereGeometry(0.5, 16, 12);

// Bakes a list of parts ({ geo, scale, pos, rot, color, uv? }) into ONE vertex-coloured BufferGeometry.
export function bakeParts(parts, factor, withUV = false) {
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
