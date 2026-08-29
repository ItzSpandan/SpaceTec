// Utility/calculation functions for the Celestial Database.
// No React here — just data shaping for CelestialDatabase.js.

import { CELESTIAL_OBJECTS } from './celestialData';

export function computeStats(objects = CELESTIAL_OBJECTS) {
  const count = (type) => objects.filter((o) => o.type === type).length;
  return {
    TOTAL: objects.length,
    PLANETS: count('PLANETS'),
    MOONS: count('MOONS'),
    ASTEROIDS: count('ASTEROIDS'),
    COMETS: count('COMETS'),
    EXOPLANETS: count('EXOPLANETS'),
  };
}

export function searchObjects(objects, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return objects;
  return objects.filter((o) => {
    const haystack = [
      o.name,
      ...(o.altNames || []),
      o.type,
      o.catalog,
      o.data?.hostStar,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterObjects(objects, { type, domain } = {}) {
  return objects.filter((o) => {
    if (type && type !== 'ALL' && o.type !== type) return false;
    if (domain && domain !== 'ALL' && o.domain !== domain) return false;
    return true;
  });
}

// Per-object-type ordered field list for the detail page. Only fields that
// exist (non-undefined) on the object's `data` are ever rendered — this
// keeps the UI from forcing irrelevant specs (e.g. "Number of moons") onto
// an exoplanet or a nebula.
const FIELD_LABELS = {
  diameterKm: { label: 'DIAMETER', unit: 'KM' },
  massKg: { label: 'MASS', unit: 'KG' },
  gravityMs2: { label: 'SURFACE GRAVITY', unit: 'M/S²' },
  distanceFromSunKm: { label: 'DISTANCE FROM SUN', unit: 'KM' },
  orbitalPeriodDays: { label: 'ORBITAL PERIOD', unit: 'DAYS' },
  rotationPeriodHours: { label: 'ROTATION PERIOD', unit: 'HOURS' },
  avgTemperatureC: { label: 'AVG TEMPERATURE', unit: '°C' },
  moons: { label: 'NUMBER OF MOONS', unit: '' },
  atmosphere: { label: 'ATMOSPHERE', unit: '' },
  discovery: { label: 'DISCOVERY', unit: '' },
  semiMajorAxisAu: { label: 'SEMI-MAJOR AXIS', unit: 'AU' },
  classification: { label: 'CLASSIFICATION', unit: '' },
  perihelionAu: { label: 'PERIHELION', unit: 'AU' },
  aphelionAu: { label: 'APHELION', unit: 'AU' },
  composition: { label: 'COMPOSITION', unit: '' },
  hostStar: { label: 'HOST STAR', unit: '' },
  discoveryYear: { label: 'DISCOVERY YEAR', unit: '' },
  distanceLy: { label: 'DISTANCE', unit: 'LY' },
  radiusEarth: { label: 'RADIUS', unit: '× EARTH' },
  massEarth: { label: 'MASS', unit: '× EARTH' },
  discoveryMethod: { label: 'DISCOVERY METHOD', unit: '' },
  massSolar: { label: 'MASS', unit: '× SOLAR MASSES' },
  type: { label: 'TYPE', unit: '' },
  hostGalaxy: { label: 'HOST GALAXY', unit: '' },
  diameterLy: { label: 'DIAMETER', unit: 'LY' },
  ageYears: { label: 'AGE', unit: 'YEARS' },
};

export function getDetailFields(object) {
  if (!object?.data) return [];
  return Object.entries(object.data)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      const meta = FIELD_LABELS[key] || { label: key.toUpperCase(), unit: '' };
      const display =
        value === null || value === ''
          ? 'DATA UNAVAILABLE'
          : `${value}${meta.unit ? ` ${meta.unit}` : ''}`;
      return { key, label: meta.label, display };
    });
}
