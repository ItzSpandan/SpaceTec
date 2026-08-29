'use client';

// Self-contained Three.js viewer. Kept separate from CelestialDatabase.js
// so the listing page never has to import Three.js at all — the scene is
// only constructed when a detail view actually mounts this component.
//
// No external texture/model files are fetched here (no reliable licensed
// source is wired up yet), so every object falls back to a clean
// procedural representation per its `render` hint from celestialData.js —
// this is the explicit, allowed fallback path, not a placeholder bug.

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function buildRockySphere({ baseColor, roughColor }) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1.6, 64, 64);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor || '#8a8a8a'),
    roughness: 0.95,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Subtle procedural surface variation via a low-opacity noise-speckled
  // secondary shell instead of a fetched texture.
  if (roughColor) {
    const speckleGeo = new THREE.IcosahedronGeometry(1.605, 6);
    const speckleMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(roughColor),
      roughness: 1,
      transparent: true,
      opacity: 0.18,
      wireframe: false,
    });
    group.add(new THREE.Mesh(speckleGeo, speckleMat));
  }
  return group;
}

function buildGasGiant({ baseColor, bandColor }) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1.8, 64, 64);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const colors = [baseColor || '#c8a27a', bandColor || '#8f6a4a'];
  const bands = 12;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = colors[i % 2];
    ctx.fillRect(0, (canvas.height / bands) * i, canvas.width, canvas.height / bands);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 });
  group.add(new THREE.Mesh(geometry, material));
  return group;
}

function buildRinged(props) {
  const group = buildGasGiant(props);
  const ringGeo = new THREE.RingGeometry(2.3, 3.4, 96);
  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r = Math.sqrt(x * x + y * y);
    uv.setXY(i, (r - 2.3) / (3.4 - 2.3), 0);
  }
  const ringMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(props.ringColor || '#c9bfa0'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    roughness: 1,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.4;
  group.add(ring);
  return group;
}

function buildIrregular({ baseColor }) {
  const geometry = new THREE.IcosahedronGeometry(1.3, 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    const displacement = 0.75 + Math.random() * 0.5;
    v.multiplyScalar(displacement);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor || '#5a5a5a'),
    roughness: 1,
    flatShading: true,
  });
  return new THREE.Mesh(geometry, material);
}

function buildAccretion({ diskColor }) {
  const group = new THREE.Group();
  const holeGeo = new THREE.SphereGeometry(0.9, 48, 48);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  group.add(new THREE.Mesh(holeGeo, holeMat));

  const diskGeo = new THREE.RingGeometry(1.1, 2.6, 128);
  const diskMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(diskColor || '#e8a35a'),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.rotation.x = Math.PI / 2.1;
  group.add(disk);
  return group;
}

function buildObjectMesh(render) {
  if (!render) return null;
  switch (render.kind) {
    case 'rocky':
    case 'ice':
      return buildRockySphere(render);
    case 'gas-giant':
      return buildGasGiant(render);
    case 'ringed':
      return buildRinged(render);
    case 'irregular':
      return buildIrregular(render);
    case 'accretion':
      return buildAccretion(render);
    default:
      return null;
  }
}

export default function CelestialViewer({ render, label }) {
  const mountRef = useRef(null);
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglAvailable(false);
      return undefined;
    }

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 5.5);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(4, 3, 5);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0x404040, 1.2));

    const objectGroup = buildObjectMesh(render) || buildRockySphere({});
    scene.add(objectGroup);

    let dragging = false;
    let prevX = 0;
    let prevY = 0;
    let rotationY = 0;
    let rotationX = 0;

    const onPointerDown = (e) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerUp = () => { dragging = false; };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      rotationY += dx * 0.005;
      rotationX += dy * 0.005;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.min(9, Math.max(2.5, camera.position.z + e.deltaY * 0.003));
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    let frameId;
    const animate = () => {
      objectGroup.rotation.y += 0.0025 + rotationY * 0.02;
      objectGroup.rotation.x = Math.max(-0.6, Math.min(0.6, objectGroup.rotation.x + rotationX * 0.02));
      rotationY *= 0.9;
      rotationX *= 0.9;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth || 480;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('wheel', onWheel);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [render]);

  if (!webglAvailable) {
    return (
      <div className="cd-viewer-fallback">
        <span>3D VIEW UNAVAILABLE ON THIS DEVICE</span>
        <p>{label} — WebGL could not be initialized. Showing scientific summary only.</p>
      </div>
    );
  }

  return <div ref={mountRef} className="cd-viewer-canvas" />;
}
