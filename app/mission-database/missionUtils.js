// Utility/calculation functions for the Mission Database.
// No React here — just data shaping for MissionDatabase.js.

import { MISSIONS } from './missionData';

export function computeStats(missions = MISSIONS) {
  const agencies = new Set(missions.map((m) => m.agency));
  const destinations = new Set(missions.map((m) => m.destination).filter(Boolean));

  return {
    TOTAL: missions.length,
    ACTIVE: missions.filter((m) => m.status === 'ACTIVE' || m.status === 'EXTENDED').length,
    COMPLETED: missions.filter((m) => m.status === 'COMPLETED').length,
    UPCOMING: missions.filter((m) => m.status === 'UPCOMING' || m.status === 'PLANNED').length,
    CREWED: missions.filter((m) => m.crewed).length,
    UNCREWED: missions.filter((m) => !m.crewed).length,
    AGENCIES: agencies.size,
    DESTINATIONS: destinations.size,
  };
}

export function searchMissions(missions, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return missions;
  return missions.filter((m) => {
    const haystack = [
      m.name,
      m.agency,
      m.country,
      m.destination,
      m.type,
      m.launchVehicle,
      m.spacecraft,
      m.launchSite,
      m.status,
      m.description,
      m.objective,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterMissions(missions, { agency, country, type, destination, status, year, crewed } = {}) {
  return missions.filter((m) => {
    if (agency && agency !== 'ALL' && m.agency !== agency) return false;
    if (country && country !== 'ALL' && m.country !== country) return false;
    if (type && type !== 'ALL' && m.type !== type) return false;
    if (destination && destination !== 'ALL' && m.destination !== destination) return false;
    if (status && status !== 'ALL' && m.status !== status) return false;
    if (crewed && crewed !== 'ALL') {
      const wantsCrewed = crewed === 'CREWED';
      if (Boolean(m.crewed) !== wantsCrewed) return false;
    }
    if (year && year !== 'ALL') {
      const launchYear = m.launchDate ? m.launchDate.slice(0, 4) : null;
      if (launchYear !== year) return false;
    }
    return true;
  });
}

export function sortMissions(missions, sortBy) {
  const sorted = [...missions];
  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'launchDate':
      return sorted.sort((a, b) => (a.launchDate || '9999').localeCompare(b.launchDate || '9999'));
    case 'launchDateDesc':
      return sorted.sort((a, b) => (b.launchDate || '0000').localeCompare(a.launchDate || '0000'));
    case 'agency':
      return sorted.sort((a, b) => a.agency.localeCompare(b.agency));
    case 'status':
      return sorted.sort((a, b) => a.status.localeCompare(b.status));
    case 'destination':
      return sorted.sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
    default:
      return sorted;
  }
}

export function uniqueValues(missions, key) {
  return Array.from(new Set(missions.map((m) => m[key]).filter(Boolean))).sort();
}

export function uniqueYears(missions) {
  return Array.from(
    new Set(missions.map((m) => (m.launchDate ? m.launchDate.slice(0, 4) : null)).filter(Boolean))
  ).sort((a, b) => b.localeCompare(a));
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
