import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- NOAA Space Weather Prediction Center public endpoints (no API key required) ---
const SOURCES = {
  kp1m: 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
  kpHistory: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  scales: 'https://services.swpc.noaa.gov/products/noaa-scales.json',
  xray6h: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',
  flares7d: 'https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json',
  plasma2h: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json',
  mag2h: 'https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json',
  protons6h: 'https://services.swpc.noaa.gov/json/goes/primary/integral-protons-6-hour.json',
  solarFlux: 'https://services.swpc.noaa.gov/products/summary/10cm-flux.json',
};

// Fetch with a hard timeout so one slow NOAA feed can't stall the whole page.
async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// GOES long-wavelength (0.1-0.8nm) flux in W/m^2 -> standard A/B/C/M/X class label.
function classifyXray(flux) {
  if (flux == null || flux <= 0) return null;
  if (flux < 1e-7) return `A${(flux / 1e-8).toFixed(1)}`;
  if (flux < 1e-6) return `B${(flux / 1e-7).toFixed(1)}`;
  if (flux < 1e-5) return `C${(flux / 1e-6).toFixed(1)}`;
  if (flux < 1e-4) return `M${(flux / 1e-5).toFixed(1)}`;
  return `X${(flux / 1e-4).toFixed(1)}`;
}

function kpStormLevel(kp) {
  if (kp == null) return null;
  if (kp < 4) return 'QUIET';
  if (kp < 5) return 'UNSETTLED';
  if (kp < 6) return 'MINOR STORM (G1)';
  if (kp < 7) return 'MODERATE STORM (G2)';
  if (kp < 8) return 'STRONG STORM (G3)';
  if (kp < 9) return 'SEVERE STORM (G4)';
  return 'EXTREME STORM (G5)';
}

// Standard public Kp-to-geomagnetic-latitude aurora visibility boundary table.
const AURORA_LATITUDE_BY_KP = [66.5, 64.5, 62.4, 60.4, 58.3, 56.3, 54.2, 52.2, 50.1, 48.1];
function auroraEstimate(kp) {
  if (kp == null) return null;
  const idx = Math.min(9, Math.max(0, Math.round(kp)));
  const latitude = AURORA_LATITUDE_BY_KP[idx];
  let regions;
  if (idx <= 2) regions = 'high-latitude regions only (northern Scandinavia, Alaska, northern Canada)';
  else if (idx <= 4) regions = 'high-latitude and some sub-auroral zones (southern Canada, Scotland, southern Scandinavia)';
  else if (idx <= 6) regions = 'mid-latitudes (northern US, UK, central Europe)';
  else regions = 'unusually low latitudes (southern US, southern Europe)';
  return { kp: idx, latitude, regions };
}

// Downsample an array to at most `max` points, always keeping the last point.
function downsample(arr, max) {
  if (!Array.isArray(arr) || arr.length <= max) return arr;
  const step = Math.ceil(arr.length / max);
  const out = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  const last = arr[arr.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

// noaa-planetary-k-index.json is array-of-arrays with a header row.
function parseKpHistory(raw) {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const rows = raw.slice(1);
  const series = rows
    .map((row) => ({ time: row[0], value: toNumber(row[1]) }))
    .filter((point) => point.value != null);
  return series.length ? downsample(series, 60) : null;
}

function parseSolarWindTable(raw, valueIndex) {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const rows = raw.slice(1);
  const series = rows
    .map((row) => ({ time: row[0], value: toNumber(row[valueIndex]) }))
    .filter((point) => point.value != null);
  return series.length ? downsample(series, 60) : null;
}

function parseXraySeries(raw) {
  if (!Array.isArray(raw)) return null;
  const longWave = raw.filter((entry) => entry && entry.energy === '0.1-0.8nm');
  const series = longWave
    .map((entry) => ({ time: entry.time_tag, value: toNumber(entry.flux) }))
    .filter((point) => point.value != null);
  return series.length ? downsample(series, 60) : null;
}

export async function GET() {
  const [kp1m, kpHistoryRaw, scales, xray6h, flares7d, plasma2h, mag2h, protons6h, solarFlux] =
    await Promise.all([
      fetchJson(SOURCES.kp1m),
      fetchJson(SOURCES.kpHistory),
      fetchJson(SOURCES.scales),
      fetchJson(SOURCES.xray6h),
      fetchJson(SOURCES.flares7d),
      fetchJson(SOURCES.plasma2h),
      fetchJson(SOURCES.mag2h),
      fetchJson(SOURCES.protons6h),
      fetchJson(SOURCES.solarFlux),
    ]);

  // --- Geomagnetic (Kp) ---
  let currentKp = null;
  if (Array.isArray(kp1m) && kp1m.length) {
    const last = kp1m[kp1m.length - 1];
    currentKp = toNumber(last?.kp_index ?? last?.estimated_kp ?? last?.kp);
  }
  const kpHistory = parseKpHistory(kpHistoryRaw);
  if (currentKp == null && kpHistory?.length) {
    currentKp = kpHistory[kpHistory.length - 1].value;
  }

  // --- NOAA scales (G / S / R), "0" key is today ---
  let scaleToday = null;
  if (scales && typeof scales === 'object' && scales['0']) {
    const day = scales['0'];
    scaleToday = {
      geomagnetic: day.G ? { scale: day.G.Scale ?? null, text: day.G.Text ?? null } : null,
      radioBlackout: day.R ? { scale: day.R.Scale ?? null, text: day.R.Text ?? null } : null,
      radiationStorm: day.S ? { scale: day.S.Scale ?? null, text: day.S.Text ?? null } : null,
    };
  }

  // --- X-ray flux ---
  const xraySeries = parseXraySeries(xray6h);
  const currentXrayFlux = xraySeries?.length ? xraySeries[xraySeries.length - 1].value : null;
  const currentXrayClass = classifyXray(currentXrayFlux);

  // --- Recent solar flares ---
  let recentFlares = null;
  if (Array.isArray(flares7d) && flares7d.length) {
    recentFlares = flares7d
      .filter((f) => f && (f.max_class || f.maxClass))
      .slice(-8)
      .reverse()
      .map((f) => ({
        beginTime: f.begin_time ?? null,
        maxTime: f.max_time ?? null,
        endTime: f.end_time ?? null,
        maxClass: f.max_class ?? f.maxClass ?? null,
      }));
    if (!recentFlares.length) recentFlares = null;
  }

  // --- Solar wind plasma (speed / density / temperature) ---
  const speedSeries = parseSolarWindTable(plasma2h, 2);
  const densitySeries = parseSolarWindTable(plasma2h, 1);
  const currentSpeed = speedSeries?.length ? speedSeries[speedSeries.length - 1].value : null;
  const currentDensity = densitySeries?.length ? densitySeries[densitySeries.length - 1].value : null;
  let currentTemperature = null;
  if (Array.isArray(plasma2h) && plasma2h.length > 1) {
    const lastRow = plasma2h[plasma2h.length - 1];
    currentTemperature = toNumber(lastRow?.[3]);
  }

  // --- Interplanetary magnetic field ---
  let currentBt = null;
  let currentBz = null;
  if (Array.isArray(mag2h) && mag2h.length > 1) {
    const lastRow = mag2h[mag2h.length - 1];
    currentBz = toNumber(lastRow?.[3]);
    currentBt = toNumber(lastRow?.[6]);
  }

  // --- Energetic protons (space environment / radiation) ---
  let currentProtonFlux = null;
  if (Array.isArray(protons6h) && protons6h.length) {
    const tenMev = [...protons6h].reverse().find((p) => p && p.energy === '>=10 MeV');
    currentProtonFlux = tenMev ? toNumber(tenMev.flux) : null;
  }

  // --- 10.7cm solar radio flux ---
  let currentSolarFlux = null;
  if (solarFlux && typeof solarFlux === 'object') {
    currentSolarFlux = toNumber(solarFlux.Flux ?? solarFlux.flux);
  }

  // --- Overall status ---
  let overallStatus = 'UNAVAILABLE';
  const stormLevel = kpStormLevel(currentKp);
  const scaleActive =
    scaleToday &&
    [scaleToday.geomagnetic, scaleToday.radioBlackout, scaleToday.radiationStorm].some(
      (s) => s && toNumber(s.scale) > 0
    );
  if (scaleActive) {
    overallStatus = 'ACTIVE CONDITIONS';
  } else if (stormLevel) {
    overallStatus = stormLevel === 'QUIET' ? 'QUIET' : stormLevel;
  }

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    overallStatus,
    geomagnetic: {
      currentKp,
      stormLevel,
      history: kpHistory,
      scale: scaleToday?.geomagnetic ?? null,
    },
    solarWind: {
      speed: currentSpeed,
      density: currentDensity,
      temperature: currentTemperature,
      bt: currentBt,
      bz: currentBz,
      speedHistory: speedSeries,
    },
    xray: {
      flux: currentXrayFlux,
      class: currentXrayClass,
      history: xraySeries,
      radioBlackoutScale: scaleToday?.radioBlackout ?? null,
    },
    solarActivity: {
      recentFlares,
      solarFluxIndex: currentSolarFlux,
    },
    aurora: auroraEstimate(currentKp),
    environment: {
      protonFlux: currentProtonFlux,
      radiationStormScale: scaleToday?.radiationStorm ?? null,
    },
    sources: [
      { name: 'NOAA SWPC Planetary K-index', url: SOURCES.kpHistory },
      { name: 'NOAA SWPC NOAA Scales', url: SOURCES.scales },
      { name: 'NOAA SWPC GOES X-ray Flux', url: SOURCES.xray6h },
      { name: 'NOAA SWPC GOES X-ray Flares', url: SOURCES.flares7d },
      { name: 'NOAA SWPC DSCOVR Solar Wind Plasma', url: SOURCES.plasma2h },
      { name: 'NOAA SWPC DSCOVR Solar Wind Magnetic Field', url: SOURCES.mag2h },
      { name: 'NOAA SWPC GOES Energetic Protons', url: SOURCES.protons6h },
      { name: 'NOAA SWPC 10.7cm Solar Radio Flux', url: SOURCES.solarFlux },
    ],
  });
}
