import { NextResponse } from 'next/server';

const BASE_URL = 'https://lldev.thespacedevs.com/2.2.0/config/launcher/';
const PAGE_SIZE = 20;
const ALLOWED_ORDERING = new Set(['-total_launch_count', 'name']);

function normalizeRocket(raw) {
  const image =
    (typeof raw.image === 'string' && raw.image) ||
    raw.image?.image_url ||
    raw.image_url ||
    null;

  return {
    id: raw.id,
    name: raw.name ?? 'UNKNOWN',
    fullName: raw.full_name ?? raw.name ?? 'UNKNOWN',
    family: raw.family ?? null,
    active: typeof raw.active === 'boolean' ? raw.active : null,
    reusable: typeof raw.reusable === 'boolean' ? raw.reusable : null,
    description: raw.description ?? null,
    manufacturer: raw.manufacturer?.name ?? null,
    manufacturerCountry: raw.manufacturer?.country_code ?? null,
    maidenFlight: raw.maiden_flight ?? null,
    length: raw.length ?? null,
    diameter: raw.diameter ?? null,
    launchMass: raw.launch_mass ?? null,
    leoCapacity: raw.leo_capacity ?? null,
    gtoCapacity: raw.gto_capacity ?? null,
    totalLaunchCount: raw.total_launch_count ?? null,
    successfulLaunches: raw.successful_launches ?? null,
    failedLaunches: raw.failed_launches ?? null,
    consecutiveSuccessfulLaunches: raw.consecutive_successful_launches ?? null,
    infoUrl: raw.info_url ?? null,
    wikiUrl: raw.wiki_url ?? null,
    image,
  };
}

// Fetch with a timeout, returning both the parsed body and enough context to
// debug a failure (status + a snippet of the response) instead of a black box.
async function fetchWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SpaceTecRocketDatabase/1.0 (+https://github.com/ItzSpandan/SpaceTec)',
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // upstream didn't return JSON (e.g. an HTML error page) — leave json null
    }
    return { ok: res.ok, status: res.status, json, snippet: text.slice(0, 300) };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').trim();
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
  const orderingParam = searchParams.get('ordering') || '-total_launch_count';
  const ordering = ALLOWED_ORDERING.has(orderingParam) ? orderingParam : '-total_launch_count';

  const buildUrl = (includeOrdering) => {
    const url = new URL(BASE_URL);
    url.searchParams.set('limit', String(PAGE_SIZE));
    url.searchParams.set('offset', String(page * PAGE_SIZE));
    if (includeOrdering) url.searchParams.set('ordering', ordering);
    if (search) url.searchParams.set('search', search);
    return url.toString();
  };

  try {
    // Try with ordering first; if the upstream API rejects that param for any
    // reason, retry once without it rather than failing the whole request.
    let attempt = await fetchWithTimeout(buildUrl(true));
    if (!attempt.ok) {
      console.error('Rocket database: ordered request failed', attempt.status, attempt.snippet);
      attempt = await fetchWithTimeout(buildUrl(false));
    }

    if (!attempt.ok || !attempt.json) {
      console.error('Rocket database: upstream request failed', attempt.status, attempt.snippet);
      return NextResponse.json(
        { count: 0, results: [], error: true, upstreamStatus: attempt.status, upstreamSnippet: attempt.snippet },
        { status: 200 }
      );
    }

    const data = attempt.json;
    return NextResponse.json({
      count: data.count ?? 0,
      results: Array.isArray(data.results) ? data.results.map(normalizeRocket) : [],
    });
  } catch (err) {
    console.error('Rocket database fetch failed:', err);
    return NextResponse.json({ count: 0, results: [], error: true, message: String(err) }, { status: 200 });
  }
}
