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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').trim();
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0);
  const orderingParam = searchParams.get('ordering') || '-total_launch_count';
  const ordering = ALLOWED_ORDERING.has(orderingParam) ? orderingParam : '-total_launch_count';

  const url = new URL(BASE_URL);
  url.searchParams.set('limit', String(PAGE_SIZE));
  url.searchParams.set('offset', String(page * PAGE_SIZE));
  url.searchParams.set('ordering', ordering);
  if (search) url.searchParams.set('search', search);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Launch Library responded ${res.status}`);
    const data = await res.json();

    return NextResponse.json({
      count: data.count ?? 0,
      results: Array.isArray(data.results) ? data.results.map(normalizeRocket) : [],
    });
  } catch (err) {
    console.error('Rocket database fetch failed:', err);
    return NextResponse.json({ count: 0, results: [], error: true }, { status: 200 });
  }
}
