import { NextResponse } from 'next/server';

// Spaceflight News API (v4) — a free, public aggregator that pulls from
// official agency sources (NASA, ESA, etc.) and reputable space-news
// publications. No API key required. We only read `url` / `image_url`
// from it and always keep the original source name + link intact.
const BASE_URL = 'https://api.spaceflightnewsapi.net/v4/articles/';
const PAGE_SIZE = 30;

// Lightweight keyword -> SpaceTec category mapping. An article can match
// more than one category; we keep the first (most specific) match.
const CATEGORY_RULES = [
  { id: 'LAUNCHES', keywords: ['launch', 'liftoff', 'lift-off', 'blast off', 'blastoff'] },
  { id: 'ROCKETS', keywords: ['rocket', 'booster', 'falcon', 'starship', 'ariane', 'soyuz rocket', 'new glenn'] },
  { id: 'SATELLITES', keywords: ['satellite', 'starlink', 'constellation', 'cubesat'] },
  { id: 'ASTRONOMY', keywords: ['telescope', 'galaxy', 'exoplanet', 'black hole', 'nebula', 'astronomy', 'star system', 'asteroid', 'comet'] },
  { id: 'SPACE WEATHER', keywords: ['solar flare', 'geomagnetic', 'space weather', 'coronal', 'aurora', 'solar storm'] },
  { id: 'AGENCIES', keywords: ['nasa', 'esa', 'roscosmos', 'jaxa', 'isro', 'cnsa', 'space agency'] },
  { id: 'MISSIONS', keywords: ['mission', 'artemis', 'iss', 'space station', 'crew', 'astronaut', 'spacewalk', 'rover'] },
  { id: 'SCIENCE', keywords: ['research', 'study', 'discovery', 'experiment', 'science'] },
  { id: 'INDUSTRY', keywords: ['contract', 'funding', 'valuation', 'ipo', 'acquisition', 'industry', 'commercial', 'startup'] },
];

// Very conservative "breaking" signal: only trips for genuinely major event
// language, and only when the article is fresh. We never invent urgency —
// this just decides whether to surface an already-published, already-real
// story in the prominent slot.
const BREAKING_KEYWORDS = [
  'historic', 'first-ever', 'first ever', 'anomaly', 'explosion', 'exploded',
  'failure', 'failed', 'emergency', 'abort', 'grounded', 'landmark', 'breakthrough',
  'catastrophic', 'loses contact', 'crash', 'successfully lands', 'moon landing',
];
const BREAKING_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

function categorize(title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) return rule.id;
  }
  return 'SCIENCE';
}

function isBreaking(title = '', summary = '', publishedAt) {
  if (!publishedAt) return false;
  const age = Date.now() - new Date(publishedAt).getTime();
  if (Number.isNaN(age) || age > BREAKING_WINDOW_MS || age < 0) return false;
  const text = `${title} ${summary}`.toLowerCase();
  return BREAKING_KEYWORDS.some((kw) => text.includes(kw));
}

// Maps a category / text to an existing SpaceTec internal feature, when one
// genuinely applies. Returns null rather than guessing.
function internalLink(category, title = '', summary = '') {
  const text = `${title} ${summary}`.toLowerCase();
  if (text.includes('iss') || text.includes('space station')) {
    return { label: 'ISS TRACKER', href: '/iss-tracker' };
  }
  if (category === 'ROCKETS') return { label: 'ROCKET DATABASE', href: '/rocket-database' };
  if (category === 'SPACE WEATHER') return { label: 'SPACE WEATHER CENTER', href: '/space-weather' };
  if (category === 'ASTRONOMY') return { label: 'ASTRONOMY TONIGHT', href: '/astronomy-tonight' };
  return null;
}

function normalize(raw) {
  const title = raw.title ?? 'UNTITLED';
  const summary = raw.summary ?? '';
  const category = categorize(title, summary);
  return {
    id: raw.id,
    source: raw.news_site ?? 'UNKNOWN SOURCE',
    headline: title,
    summary,
    publishedAt: raw.published_at ?? null,
    updatedAt: raw.updated_at ?? null,
    category,
    url: raw.url ?? null,
    imageUrl: raw.image_url || null,
    breaking: isBreaking(title, summary, raw.published_at),
    relatedFeature: internalLink(category, title, summary),
  };
}

async function fetchWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 180 },
      headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // upstream didn't return JSON — leave json null, handled by caller
    }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  try {
    const { ok, json } = await fetchWithTimeout(
      `${BASE_URL}?limit=${PAGE_SIZE}&ordering=-published_at`
    );

    if (!ok || !json || !Array.isArray(json.results)) {
      return NextResponse.json(
        { error: 'NEWS DATA TEMPORARILY UNAVAILABLE', articles: [] },
        { status: 502 }
      );
    }

    const articles = json.results.map(normalize).filter((a) => a.url && a.headline);

    return NextResponse.json({
      articles,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Space news fetch failed:', err);
    return NextResponse.json(
      { error: 'NEWS DATA TEMPORARILY UNAVAILABLE', articles: [] },
      { status: 502 }
    );
  }
}
