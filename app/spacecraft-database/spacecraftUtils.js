// Utility/calculation functions for the Spacecraft Database.
// No React here — just data shaping for SpacecraftDatabase.js.

import { SPACECRAFT } from './spacecraftData';

export function computeStats(spacecraft = SPACECRAFT) {
  const agencies = new Set(spacecraft.map((s) => s.agency));
  const types = new Set(spacecraft.map((s) => s.type));
  const totalMissions = spacecraft.reduce((sum, s) => sum + (s.missions?.length || 0), 0);

  return {
    TOTAL: spacecraft.length,
    ACTIVE: spacecraft.filter((s) => s.status === 'ACTIVE').length,
    RETIRED: spacecraft.filter((s) => s.status === 'RETIRED').length,
    TYPES: types.size,
    AGENCIES: agencies.size,
    MISSIONS: totalMissions,
  };
}

export function searchSpacecraft(spacecraft, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return spacecraft;
  return spacecraft.filter((s) => {
    const haystack = [
      s.name,
      s.manufacturer,
      s.agency,
      s.type,
      s.summary,
      ...(s.launchVehicles || []),
      ...(s.missions || []).map((m) => m.name),
      ...Object.values(s.specs || {}),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterSpacecraft(spacecraft, { agency, type, status } = {}) {
  return spacecraft.filter((s) => {
    if (agency && agency !== 'ALL' && s.agency !== agency) return false;
    if (type && type !== 'ALL' && s.type !== type) return false;
    if (status && status !== 'ALL' && s.status !== status) return false;
    return true;
  });
}

export function sortSpacecraft(spacecraft, sortBy) {
  const sorted = [...spacecraft];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'firstFlight':
      return sorted.sort((a, b) => {
        const da = a.firstFlight || '9999';
        const db = b.firstFlight || '9999';
        return da.localeCompare(db);
      });
    case 'missions':
      return sorted.sort((a, b) => (b.missions?.length || 0) - (a.missions?.length || 0));
    case 'agency':
      return sorted.sort((a, b) => a.agency.localeCompare(b.agency));
    default:
      return sorted;
  }
}

export function uniqueValues(spacecraft, key) {
  return Array.from(new Set(spacecraft.map((s) => s[key]).filter(Boolean))).sort();
}

export function formatDate(dateStr) {
  if (!dateStr) return 'DATA UNAVAILABLE';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function display(value) {
  return value === null || value === undefined || value === '' ? 'DATA UNAVAILABLE' : value;
}

// Builds the PROFILE field list for a spacecraft's detail view, including
// only fields that actually have data. Per the "no fabricated fields" rule,
// a field with no known value is omitted entirely rather than shown as a
// placeholder. Crew capacity is the one exception: 0 is a real, known fact
// (the vehicle is uncrewed) and is worth showing, so it's checked for
// "is a number" rather than truthiness.
export function profileRows(craft) {
  const rows = [];
  if (craft.manufacturer) rows.push({ label: 'MANUFACTURER', value: craft.manufacturer });
  if (craft.agency) rows.push({ label: 'AGENCY', value: craft.agency, link: craft.agencyLinkId ? '/#agencies' : null });
  if (craft.status) rows.push({ label: 'STATUS', value: craft.status });
  if (typeof craft.crewCapacity === 'number') {
    rows.push({ label: 'CREW CAPACITY', value: craft.crewCapacity > 0 ? craft.crewCapacity : 'UNCREWED' });
  }
  if (craft.firstFlight) rows.push({ label: 'FIRST FLIGHT', value: formatDate(craft.firstFlight) });
  if (craft.missions && craft.missions.length > 0) {
    rows.push({ label: 'LOGGED MISSIONS', value: craft.missions.length });
  }
  return rows;
}

// Turns a spacecraft's `specs` object (free-form, only-known-fields) into a
// list of { label, value } rows for display, so the UI doesn't need to know
// which spec keys any given spacecraft happens to have.
const SPEC_LABELS = {
  mass: 'MASS',
  length: 'LENGTH',
  height: 'HEIGHT',
  diameter: 'DIAMETER',
  power: 'POWER',
  habitableVolume: 'HABITABLE VOLUME',
  mirrorDiameter: 'MIRROR DIAMETER',
};

export function specRows(specs) {
  if (!specs) return [];
  return Object.entries(specs)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({ label: SPEC_LABELS[key] || key.toUpperCase(), value }));
}
