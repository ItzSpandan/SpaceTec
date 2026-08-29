import { NextResponse } from 'next/server';
import { getMoonPhase } from '../../lib/moonPhase';

export const dynamic = 'force-dynamic';

// Fallback used until the browser supplies real coordinates (or if the
// person declines location access) — Cape Canaveral, a fitting default for
// a space-tech site.
const DEFAULT_LAT = 28.5721;
const DEFAULT_LNG = -80.648;

function iso(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchSunTimes(lat, lng, dateParam) {
  const url = new URL('https://api.sunrise-sunset.org/json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));
  url.searchParams.set('formatted', '0');
  url.searchParams.set('date', dateParam);

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.status !== 'OK') {
    throw new Error(`sunrise-sunset.org returned ${json.status || res.status}`);
  }

  const r = json.results;
  return {
    sunrise: iso(r.sunrise),
    sunset: iso(r.sunset),
    solarNoon: iso(r.solar_noon),
    dayLengthSeconds: r.day_length ?? null,
    civilTwilightBegin: iso(r.civil_twilight_begin),
    civilTwilightEnd: iso(r.civil_twilight_end),
    nauticalTwilightBegin: iso(r.nautical_twilight_begin),
    nauticalTwilightEnd: iso(r.nautical_twilight_end),
    astronomicalTwilightBegin: iso(r.astronomical_twilight_begin),
    astronomicalTwilightEnd: iso(r.astronomical_twilight_end),
  };
}

// The true "astronomy tonight" dark-sky window spans from when full darkness
// falls this evening (today's astronomical dusk) until first light breaks
// tomorrow morning (tomorrow's astronomical dawn). If it's currently the
// pre-dawn tail end of last night's window, use today's dawn as the end
// instead.
function computeDarkSkyWindow(today, tomorrow, now) {
  if (!today?.astronomicalTwilightBegin) return null;

  const todayDawn = new Date(today.astronomicalTwilightBegin);
  if (now < todayDawn) {
    return { start: null, end: today.astronomicalTwilightBegin, inProgress: true };
  }

  if (!today.astronomicalTwilightEnd || !tomorrow?.astronomicalTwilightBegin) return null;

  const dusk = new Date(today.astronomicalTwilightEnd);
  return {
    start: today.astronomicalTwilightEnd,
    end: tomorrow.astronomicalTwilightBegin,
    inProgress: now >= dusk,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat'));
  const lng = parseFloat(searchParams.get('lng'));

  const useLat = Number.isFinite(lat) ? lat : DEFAULT_LAT;
  const useLng = Number.isFinite(lng) ? lng : DEFAULT_LNG;
  const isDefaultLocation = !Number.isFinite(lat) || !Number.isFinite(lng);
  const now = new Date();

  const moon = getMoonPhase(now);

  try {
    const [today, tomorrow] = await Promise.all([
      fetchSunTimes(useLat, useLng, 'today'),
      fetchSunTimes(useLat, useLng, 'tomorrow'),
    ]);

    const darkSkyWindow = computeDarkSkyWindow(today, tomorrow, now);

    return NextResponse.json({
      location: { lat: useLat, lng: useLng, isDefaultLocation },
      sun: today,
      darkSkyWindow,
      moon,
      fetchedAt: now.toISOString(),
      sources: [{ name: 'sunrise-sunset.org', url: 'https://sunrise-sunset.org/api' }],
    });
  } catch (error) {
    // Even if the upstream sun-times feed fails, moon phase is computed
    // locally, so we can still return a partial, useful response.
    return NextResponse.json(
      {
        location: { lat: useLat, lng: useLng, isDefaultLocation },
        sun: null,
        darkSkyWindow: null,
        moon,
        fetchedAt: now.toISOString(),
        error: true,
        message: error.message || 'Unable to acquire sun-times data',
        sources: [],
      },
      { status: 200 }
    );
  }
}
