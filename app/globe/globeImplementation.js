/**
 * Which implementation renders an orbital globe. Pure (no React, no three.js, no DOM) and shared by Orbital Tracking and
 * the ISS Tracker, so the ISS page can read the flag without loading any satellite or engine code.
 *   'legacy' (default): the original react-globe.gl component, exactly as before.
 *   'engine': the in-house SpaceTecGlobeEngine.
 * Sources, strongest first: URL ?orbitGlobe=engine|legacy, then the NEXT_PUBLIC_ORBITAL_GLOBE build setting.
 */
export function resolveGlobeImplementation(search, envValue) {
  const norm = v => {
    const s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === 'engine' || s === 'v2' || s === 'new') return 'engine';
    if (s === 'legacy' || s === 'old' || s === 'v1') return 'legacy';
    return null;
  };
  let fromUrl = null;
  try {
    fromUrl = norm(new URLSearchParams(search || '').get('orbitGlobe'));
  } catch (error) {
    fromUrl = null;
  }
  return fromUrl || norm(envValue) || 'legacy';
}
