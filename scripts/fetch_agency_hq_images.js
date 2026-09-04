// scripts/fetch_agency_hq_images.js
//
// Build-time script that finds, ranks, and downloads a real HQ/facility
// image for every agency in the Explore More Agencies directory, then wires
// the local file back into the SAME agency data file the UI already reads
// from (app/space-agencies/agencyData.js). There is no browser-side search —
// the website only ever loads the local files this script produces.
//
// Usage:
//   node scripts/fetch_agency_hq_images.js                 (processes every agency)
//   node scripts/fetch_agency_hq_images.js --only=nasa,csa (processes just those ids)
//   node scripts/fetch_agency_hq_images.js --missing-only  (skips agencies that already have an /agency-hq/ image)
//
// Requires Node 18+ (uses the built-in `fetch`). No extra npm packages needed.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENCY_DATA_PATH = path.join(PROJECT_ROOT, 'app', 'space-agencies', 'agencyData.js');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'agency-hq');
const ATTRIBUTION_PATH = path.join(OUTPUT_DIR, 'attribution.json');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'SpaceTecAgencyImageBot/1.0 (build-time script; contact: site-admin@example.com)';
const REQUEST_DELAY_MS = 600; // be polite to the Commons API between agencies
const THUMB_WIDTH = 1600; // downloaded size — enough for a hover card AND a large profile image, not the raw original
const MIN_LONG_EDGE = 700; // reject anything smaller than this on its longest side

// Filenames/titles containing these are essentially never the building we want.
const BLOCK_KEYWORDS = [
  'logo', 'flag', 'emblem', 'seal', 'insignia', 'patch', 'coat of arms', 'crest',
  'portrait', 'astronaut', 'cosmonaut', 'crew photo', 'headshot',
  'rocket', 'launch of', 'liftoff', 'booster', 'capsule', 'spacecraft',
  'map of', 'diagram', 'chart', 'graph', 'icon', 'symbol', 'silhouette',
  'stamp', 'banknote', 'coin', 'medal', 'poster', 'illustration', 'render', 'cgi',
];

// Filenames/titles containing these are a strong positive signal.
const BOOST_KEYWORDS = [
  'headquarters', 'head office', 'head-quarters', 'hq', 'campus', 'building',
  'center', 'centre', 'facility', 'complex', 'tower', 'offices', 'office',
  'space centre', 'space center', 'research centre', 'research center',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim() || null;
}

// A handful of the original six agencies never stored `headquarters` as its
// own field — it's only ever mentioned inside their `brief` prose (e.g.
// "Headquartered in Washington, D.C., ..."). Pull it out rather than treating
// those agencies as having no location to search with.
function extractHeadquartersFromBrief(brief) {
  if (!brief) return null;
  const match = brief.match(/Headquartered (?:in|at) ([^.,]+(?:,\s*[^.,]+)?)/i);
  return match ? match[1].trim() : null;
}

function buildSearchQueries(agency) {
  const name = agency.name;
  const headquarters = agency.headquarters || extractHeadquartersFromBrief(agency.brief);
  const country = headquarters ? headquarters.split(',').pop().trim() : null;

  const queries = [];
  if (headquarters) queries.push(`${name} headquarters ${headquarters}`);
  queries.push(`${name} headquarters building`);
  queries.push(`${name} headquarters`);
  if (country) queries.push(`${name} ${country} headquarters`);
  queries.push(`${name} HQ`);
  queries.push(`${name} facility`);
  queries.push(`${name} official facility`);
  queries.push(`${name} building`);
  return queries;
}

async function commonsSearch(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6', // File: namespace only
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
  });

  const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return [];

  const json = await res.json();
  const pages = json?.query?.pages;
  if (!pages) return [];

  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) return null;
      return {
        title: page.title, // e.g. "File:NASA Headquarters, Washington DC.jpg"
        pageid: page.pageid,
        mime: info.mime,
        width: info.width,
        height: info.height,
        fullUrl: info.url,
        thumbUrl: info.thumburl || info.url,
        thumbWidth: info.thumbwidth || info.width,
        extmetadata: info.extmetadata || {},
      };
    })
    .filter(Boolean);
}

// Scores a single candidate. Higher is better; null means "reject outright".
function scoreCandidate(candidate) {
  if (!candidate.mime || !candidate.mime.startsWith('image/')) return null;
  if (candidate.mime === 'image/svg+xml' || candidate.mime === 'image/gif') return null; // almost always a logo/diagram/flag

  const longEdge = Math.max(candidate.width || 0, candidate.height || 0);
  if (longEdge < MIN_LONG_EDGE) return null;

  const titleLower = candidate.title.toLowerCase();

  if (BLOCK_KEYWORDS.some((kw) => titleLower.includes(kw))) return null;

  let score = 0;
  BOOST_KEYWORDS.forEach((kw) => {
    if (titleLower.includes(kw)) score += 10;
  });

  // Mild preference for photographs over renders/documents, and for
  // reasonably large images without needing the absolute original.
  score += Math.min(longEdge, 4000) / 500;

  return score;
}

async function findBestImageForAgency(agency) {
  const queries = buildSearchQueries(agency);
  const seen = new Map(); // pageid -> candidate, de-duped across queries

  for (const query of queries) {
    let results;
    try {
      results = await commonsSearch(query);
    } catch (err) {
      console.warn(`  ! search failed for "${query}": ${err.message}`);
      continue;
    }
    results.forEach((candidate) => {
      if (!seen.has(candidate.pageid)) seen.set(candidate.pageid, candidate);
    });
    await sleep(150);
  }

  const scored = Array.from(seen.values())
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score - a.score);

  return scored.length ? scored[0].candidate : null;
}

function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg'; // image/jpeg and any other photographic fallback
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

// Finds the agency object in agencyData.js by its `id: '<id>'` marker,
// brace-matches to the end of that (flat, non-nested) object literal, and
// either updates or inserts its `hqImage` field. Every other field, and
// every other agency, is left completely untouched.
function setHqImageInSource(source, agencyId, newImagePath) {
  const idMarker = `id: '${agencyId}'`;
  const idIdx = source.indexOf(idMarker);
  if (idIdx === -1) return null;

  const openIdx = source.lastIndexOf('{', idIdx);
  let depth = 0;
  let closeIdx = -1;
  for (let i = openIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) { closeIdx = i; break; }
    }
  }
  if (closeIdx === -1) return null;

  const objectText = source.slice(openIdx, closeIdx + 1);
  const hqImageFieldRegex = /hqImage:\s*'[^']*'/;
  const newObjectText = hqImageFieldRegex.test(objectText)
    ? objectText.replace(hqImageFieldRegex, `hqImage: '${newImagePath}'`)
    : objectText.replace(idMarker, `${idMarker}, hqImage: '${newImagePath}'`);

  return source.slice(0, openIdx) + newObjectText + source.slice(closeIdx + 1);
}

async function loadAgencies() {
  // agencyData.js is an ES module (it's imported by the Next.js client
  // component too) — a plain `require()` can't load it, but Node's dynamic
  // `import()` can, even from this CommonJS script.
  const fileUrl = 'file://' + AGENCY_DATA_PATH;
  const mod = await import(fileUrl);
  return mod.agencyDirectory;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const only = args.find((a) => a.startsWith('--only='));
  return {
    onlyIds: only ? only.replace('--only=', '').split(',').map((s) => s.trim()).filter(Boolean) : null,
    missingOnly: args.includes('--missing-only'),
  };
}

async function main() {
  const { onlyIds, missingOnly } = parseArgs();

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const agencies = await loadAgencies();
  let targets = agencies;
  if (onlyIds) targets = targets.filter((a) => onlyIds.includes(a.id));
  if (missingOnly) targets = targets.filter((a) => !a.hqImage || !a.hqImage.startsWith('/agency-hq/'));

  console.log(`\nProcessing ${targets.length} of ${agencies.length} agencies...\n`);

  const successes = [];
  const manualReview = [];
  const attributionRecords = [];

  let agencySource = fs.readFileSync(AGENCY_DATA_PATH, 'utf8');

  // Carry over attribution for any agency we are NOT re-processing this run
  // (e.g. a --only= partial run), so attribution.json never loses history.
  if (fs.existsSync(ATTRIBUTION_PATH)) {
    const existing = JSON.parse(fs.readFileSync(ATTRIBUTION_PATH, 'utf8'));
    const processedIds = new Set(targets.map((a) => a.id));
    existing.filter((rec) => !processedIds.has(rec.agencyId)).forEach((rec) => attributionRecords.push(rec));
  }

  for (const agency of targets) {
    process.stdout.write(`→ ${agency.name} (${agency.id})... `);
    try {
      const best = await findBestImageForAgency(agency);
      if (!best) {
        console.log('no suitable image found');
        manualReview.push({ id: agency.id, name: agency.name, reason: 'no suitable licensed image found' });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const ext = extensionForMime(best.mime);
      const localFilename = `${agency.id}.${ext}`;
      const destPath = path.join(OUTPUT_DIR, localFilename);
      const publicPath = `/agency-hq/${localFilename}`;

      await downloadImage(best.thumbUrl, destPath);

      const updatedSource = setHqImageInSource(agencySource, agency.id, publicPath);
      if (!updatedSource) {
        console.log('downloaded, but could not locate agency record to update — flagged for manual review');
        manualReview.push({ id: agency.id, name: agency.name, reason: 'image downloaded but agencyData.js record not found' });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }
      agencySource = updatedSource;

      const meta = best.extmetadata;
      attributionRecords.push({
        agencyId: agency.id,
        localFilename,
        sourcePage: `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.title)}`,
        originalImageUrl: best.fullUrl,
        author: stripHtml(meta.Artist?.value),
        license: meta.LicenseShortName?.value || null,
        attribution: stripHtml(meta.Attribution?.value) || stripHtml(meta.Credit?.value),
      });

      console.log(`✓ ${localFilename}`);
      successes.push({ id: agency.id, name: agency.name });
    } catch (err) {
      console.log(`failed (${err.message})`);
      manualReview.push({ id: agency.id, name: agency.name, reason: err.message });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  // Persist both outputs together at the end, so a crash mid-run never
  // leaves agencyData.js and attribution.json out of sync with each other.
  fs.writeFileSync(AGENCY_DATA_PATH, agencySource);
  attributionRecords.sort((a, b) => a.agencyId.localeCompare(b.agencyId));
  fs.writeFileSync(ATTRIBUTION_PATH, JSON.stringify(attributionRecords, null, 2));

  console.log('\n========================================');
  console.log('AGENCY IMAGE UPDATE COMPLETE');
  console.log('========================================\n');
  console.log('SUCCESS:\n');
  successes.forEach((a) => console.log(`✓ ${a.name} — HQ/facility image`));
  console.log('\nMANUAL REVIEW:\n');
  if (manualReview.length === 0) console.log('(none)');
  manualReview.forEach((a) => console.log(`⚠ ${a.name} — ${a.reason}`));
  console.log(`\nTOTAL AGENCIES PROCESSED: ${targets.length}`);
  console.log(`IMAGES UPDATED: ${successes.length}`);
  console.log(`MANUAL REVIEW: ${manualReview.length}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Agency image script failed:', err);
  process.exit(1);
});
