import { NextResponse } from 'next/server';
import { supabase } from '../../supabase';
import { MISSIONS } from '../../mission-database/missionData';
import { ASTRONAUTS } from '../../astronaut-database/astronautData';

// Cache the computed statistics for 30 minutes instead of recalculating on
// every request — the underlying data (Supabase tables, upstream rocket API)
// doesn't change fast enough to justify recomputing this on every visit.
export const revalidate = 1800;

const SATELLITE_PAGE_SIZE = 1000;
const SATELLITE_PAGE_CAP = 10; // safety cap: up to 10,000 satellites sampled
const ROCKET_PAGE_CAP = 3; // top 60 rockets by recorded launch count

function tally(items, keyFn) {
  const map = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key === null || key === undefined || key === '') continue;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

function toSortedEntries(map, limit) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return limit ? entries.slice(0, limit) : entries;
}

// --- Satellites (Supabase `satellites` table) --------------------------------

function classifyOrbit(meanMotion) {
  if (meanMotion === null || meanMotion === undefined || Number.isNaN(meanMotion)) return null;
  if (meanMotion >= 0.99 && meanMotion <= 1.01) return 'GEO';
  if (meanMotion > 1.01 && meanMotion < 10) return 'MEO';
  if (meanMotion >= 10) return 'LEO';
  return 'OTHER / HIGHLY ELLIPTICAL';
}

async function getSatelliteStats() {
  const { count: totalCount, error: countError } = await supabase
    .from('satellites')
    .select('*', { count: 'exact', head: true });

  if (countError || totalCount === null) {
    return { available: false, reason: 'Could not reach the satellite tracking database.' };
  }

  // Sample rows (bounded) to compute distribution stats without downloading
  // the entire table on every request.
  let rows = [];
  let sampled = 0;
  for (let page = 0; page < SATELLITE_PAGE_CAP; page += 1) {
    const from = page * SATELLITE_PAGE_SIZE;
    const to = from + SATELLITE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('satellites')
      .select('mean_motion, organization')
      .range(from, to);
    if (error || !data || data.length === 0) break;
    rows = rows.concat(data);
    sampled += data.length;
    if (data.length < SATELLITE_PAGE_SIZE) break;
  }

  const orbitTally = tally(rows, (r) => classifyOrbit(r.mean_motion));
  const operatorTally = tally(rows, (r) => r.organization);

  return {
    available: true,
    total: totalCount,
    sampled,
    isFullSample: sampled >= totalCount,
    byOrbit: toSortedEntries(orbitTally),
    byOperator: toSortedEntries(operatorTally, 10),
  };
}

// --- Launches (Supabase `launches` table) -------------------------------------

function classifyLaunchStatus(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('partial')) return 'PARTIAL FAILURE';
  if (s.includes('fail')) return 'FAILURE';
  if (s.includes('success')) return 'SUCCESS';
  if (s.includes('go') || s.includes('tbd') || s.includes('hold') || s.includes('confirm') || s.includes('flight')) return 'SCHEDULED / IN PROGRESS';
  return 'OTHER';
}

async function getLaunchStats() {
  const { data, error } = await supabase
    .from('launches')
    .select('status, net, provider, pad_location');

  if (error || !data) {
    return { available: false, reason: 'Could not reach the launch database.' };
  }

  const byYear = tally(data, (l) => (l.net ? l.net.slice(0, 4) : null));
  const byProvider = tally(data, (l) => l.provider);
  const byStatus = tally(data, (l) => classifyLaunchStatus(l.status));
  const byPad = tally(data, (l) => l.pad_location);

  const successCount = data.filter((l) => classifyLaunchStatus(l.status) === 'SUCCESS').length;
  const failureCount = data.filter((l) => classifyLaunchStatus(l.status) === 'FAILURE' || classifyLaunchStatus(l.status) === 'PARTIAL FAILURE').length;
  const decidedCount = successCount + failureCount;

  return {
    available: true,
    total: data.length,
    byYear: toSortedEntries(byYear).sort((a, b) => a[0].localeCompare(b[0])),
    byProvider: toSortedEntries(byProvider, 10),
    byStatus: toSortedEntries(byStatus),
    byPad: toSortedEntries(byPad, 10),
    distinctPadCount: Object.keys(byPad).length,
    successRate: decidedCount >= 5 ? successCount / decidedCount : null,
    decidedCount,
  };
}

// --- Rockets (existing /api/rocket-database route, reused not duplicated) ----

async function getRocketStats(origin) {
  try {
    let rockets = [];
    let count = 0;
    for (let page = 0; page < ROCKET_PAGE_CAP; page += 1) {
      const url = `${origin}/api/rocket-database?page=${page}&ordering=-total_launch_count`;
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (!res.ok) break;
      const json = await res.json();
      count = json.count || count;
      if (!Array.isArray(json.results) || json.results.length === 0) break;
      rockets = rockets.concat(json.results);
      if (json.results.length < 20) break;
    }

    if (rockets.length === 0) {
      return { available: false, reason: 'Could not reach the rocket database.' };
    }

    const byCountry = tally(rockets, (r) => r.manufacturerCountry);
    const byFamily = tally(rockets, (r) => r.family);
    const byStatus = tally(rockets, (r) => (r.active === true ? 'ACTIVE' : r.active === false ? 'RETIRED' : 'UNKNOWN'));

    const mostUsed = [...rockets]
      .filter((r) => typeof r.totalLaunchCount === 'number')
      .sort((a, b) => b.totalLaunchCount - a.totalLaunchCount)
      .slice(0, 10)
      .map((r) => [r.fullName, r.totalLaunchCount]);

    const successRates = rockets
      .filter((r) => typeof r.totalLaunchCount === 'number' && r.totalLaunchCount >= 5 && typeof r.successfulLaunches === 'number')
      .map((r) => ({ name: r.fullName, rate: r.successfulLaunches / r.totalLaunchCount, launches: r.totalLaunchCount }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 10);

    return {
      available: true,
      totalInCatalog: count,
      sampled: rockets.length,
      byCountry: toSortedEntries(byCountry, 10),
      byFamily: toSortedEntries(byFamily, 10),
      byStatus: toSortedEntries(byStatus),
      mostUsed,
      successRates,
    };
  } catch (err) {
    return { available: false, reason: 'Rocket database request failed.' };
  }
}

// --- Missions (existing static Mission Database dataset, reused) -------------

function getMissionStats() {
  const byYear = tally(MISSIONS, (m) => (m.launchDate ? m.launchDate.slice(0, 4) : null));
  const byAgency = tally(MISSIONS, (m) => m.agency);
  const byDestination = tally(MISSIONS, (m) => m.destination);
  const byType = tally(MISSIONS, (m) => m.type);
  const byStatus = tally(MISSIONS, (m) => m.status);
  const crewedCount = MISSIONS.filter((m) => m.crewed).length;

  return {
    available: true,
    total: MISSIONS.length,
    byYear: toSortedEntries(byYear).sort((a, b) => a[0].localeCompare(b[0])),
    byAgency: toSortedEntries(byAgency, 10),
    byDestination: toSortedEntries(byDestination, 10),
    byType: toSortedEntries(byType),
    byStatus: toSortedEntries(byStatus),
    crewed: crewedCount,
    uncrewed: MISSIONS.length - crewedCount,
    distinctSpacecraft: new Set(MISSIONS.map((m) => m.spacecraft).filter(Boolean)).size,
  };
}

// --- Astronauts (existing static Astronaut Database dataset, reused) --------

function getAstronautStats() {
  const byAgency = tally(ASTRONAUTS, (a) => a.agency);
  const byCountry = tally(ASTRONAUTS, (a) => a.nationality);
  const byStatus = tally(ASTRONAUTS, (a) => a.status);

  const missionCounts = ASTRONAUTS.map((a) => a.missions?.length || 0);
  const totalMissionCredits = missionCounts.reduce((sum, n) => sum + n, 0);
  const avgMissionsPerAstronaut = ASTRONAUTS.length ? totalMissionCredits / ASTRONAUTS.length : null;

  const totalSpacewalks = ASTRONAUTS.reduce((sum, a) => sum + (a.spacewalks?.count || 0), 0);
  const astronautsWithSpacewalks = ASTRONAUTS.filter((a) => (a.spacewalks?.count || 0) > 0).length;

  const missionsPerAstronautDistribution = tally(ASTRONAUTS, (a) => {
    const n = a.missions?.length || 0;
    return n >= 4 ? '4+' : String(n);
  });

  return {
    available: true,
    total: ASTRONAUTS.length,
    byAgency: toSortedEntries(byAgency, 10),
    byCountry: toSortedEntries(byCountry, 10),
    byStatus: toSortedEntries(byStatus),
    avgMissionsPerAstronaut,
    missionsPerAstronautDistribution: toSortedEntries(missionsPerAstronautDistribution).sort((a, b) => a[0].localeCompare(b[0])),
    totalSpacewalks,
    astronautsWithSpacewalks,
  };
}

// --- Cross-database analysis --------------------------------------------------

function getCrossDatabaseStats(launchStats, missionStats, rocketStats) {
  const cross = {};

  if (launchStats.available && launchStats.byPad.length > 0) {
    cross.topLaunchpad = launchStats.byPad[0];
  }
  if (launchStats.available && launchStats.byProvider.length > 0) {
    cross.topLaunchProvider = launchStats.byProvider[0];
  }
  if (missionStats.available && missionStats.byAgency.length > 0) {
    cross.topMissionAgency = missionStats.byAgency[0];
  }
  if (missionStats.available && missionStats.byDestination.length > 0) {
    cross.topMissionDestination = missionStats.byDestination[0];
  }
  if (rocketStats.available && rocketStats.mostUsed.length > 0) {
    cross.topRocket = rocketStats.mostUsed[0];
  }
  if (rocketStats.available && rocketStats.successRates.length > 0) {
    cross.topRocketBySuccessRate = rocketStats.successRates[0];
  }

  return cross;
}

export async function GET(request) {
  const origin = new URL(request.url).origin;

  const [satelliteStats, launchStats, rocketStats] = await Promise.all([
    getSatelliteStats(),
    getLaunchStats(),
    getRocketStats(origin),
  ]);
  const missionStats = getMissionStats();
  const astronautStats = getAstronautStats();
  const crossDatabase = getCrossDatabaseStats(launchStats, missionStats, rocketStats);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    satellites: satelliteStats,
    launches: launchStats,
    rockets: rocketStats,
    missions: missionStats,
    astronauts: astronautStats,
    crossDatabase,
  });
}
