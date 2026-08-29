// Utility/calculation functions for the Astronaut Database.
// No React here — just data shaping for AstronautDatabase.js.

import { ASTRONAUTS } from './astronautData';

export function computeStats(astronauts = ASTRONAUTS) {
  const agencies = new Set(astronauts.map((a) => a.agency));
  const countries = new Set(astronauts.map((a) => a.nationality));
  const spaceflights = astronauts.reduce((sum, a) => sum + (a.missions?.length || 0), 0);

  return {
    TOTAL: astronauts.length,
    ACTIVE: astronauts.filter((a) => a.status === 'ACTIVE').length,
    RETIRED: astronauts.filter((a) => a.status === 'RETIRED').length,
    AGENCIES: agencies.size,
    COUNTRIES: countries.size,
    SPACEFLIGHTS: spaceflights,
  };
}

export function searchAstronauts(astronauts, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return astronauts;
  return astronauts.filter((a) => {
    const haystack = [
      a.name,
      a.agency,
      a.nationality,
      ...(a.spacecraftFlown || []),
      ...(a.missions || []).map((m) => m.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterAstronauts(astronauts, { agency, nationality, status, spacecraft } = {}) {
  return astronauts.filter((a) => {
    if (agency && agency !== 'ALL' && a.agency !== agency) return false;
    if (nationality && nationality !== 'ALL' && a.nationality !== nationality) return false;
    if (status && status !== 'ALL' && a.status !== status) return false;
    if (spacecraft && spacecraft !== 'ALL' && !(a.spacecraftFlown || []).includes(spacecraft)) return false;
    return true;
  });
}

export function sortAstronauts(astronauts, sortBy) {
  const sorted = [...astronauts];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'firstFlight':
      return sorted.sort((a, b) => {
        const da = a.missions?.[0]?.launchDate || '9999';
        const db = b.missions?.[0]?.launchDate || '9999';
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

export function uniqueValues(astronauts, key) {
  return Array.from(new Set(astronauts.map((a) => a[key]).filter(Boolean))).sort();
}

export function uniqueSpacecraft(astronauts) {
  const set = new Set();
  astronauts.forEach((a) => (a.spacecraftFlown || []).forEach((s) => set.add(s)));
  return Array.from(set).sort();
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
