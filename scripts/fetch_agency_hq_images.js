// scripts/fetch_agency_hq_images.js
//
// Build-time script that finds, VERIFIES, and downloads a real HQ/facility
// image for every agency in the Explore More Agencies directory, then wires
// the local file back into the SAME agency data file the UI already reads
// from (app/space-agencies/agencyData.js). There is no browser-side search —
// the website only ever loads the local files this script produces.
//
// Usage:
//   node scripts/fetch_agency_hq_images.js                 (processes every agency — default)
//   node scripts/fetch_agency_hq_images.js --only=nasa,csa (processes just those ids)
//   node scripts/fetch_agency_hq_images.js --missing-only  (optional maintenance mode: skips
//                                                            agencies that already have a
//                                                            verified /agency-hq/ image)
//
// Requires Node 18+ (uses the built-in `fetch`). No extra npm packages needed.
//
// ---------------------------------------------------------------------------
// WHY THIS VERSION EXISTS
// ---------------------------------------------------------------------------
// The previous version of this script accepted the highest-scoring Commons
// search result as long as its FILENAME contained a word like "headquarters"
// or "building". That is not enough — a file named
// "NASA Langley Research Center Headquarters Building....jpg" contains every
// one of those words and is a real, legitimate photo of a real headquarters
// building, but it is NASA Langley's, and it ended up assigned to ESA.
// Filenames lie by omission (they don't say whose building it is, or say the
// wrong thing was the actual subject) far more often than they lie outright.
//
// This version instead:
//   1. Pulls a much richer metadata bundle per candidate: title, Commons
//      ImageDescription, ObjectName, and Categories (all returned by a single
//      imageinfo|extmetadata call — no extra round trips needed).
//   2. Requires a positive, explicit IDENTITY match (the agency's own name,
//      official name, or a known alias/building name from
//      agency_image_search_config.js) somewhere in that metadata before a
//      candidate is even eligible. A building/HQ keyword alone is no longer
//      sufficient — see REQUIRE_IDENTITY_MATCH below.
//   3. Rejects candidates dominated by a DIFFERENT, confusable organization
//      (NASA, ESA, Airbus, a partner agency, etc.) unless the target
//      agency's own identity is also clearly present — this is what catches
//      "Agency X visiting Org Y" photos, which used to slip through because
//      the target agency's name legitimately appears in the caption.
//   4. Still hard-rejects people/event/ceremony photos and rocket/spacecraft/
//      hardware photos, same as before, but checks that against description
//      and category text too, not just the filename.
//   5. Adds a real confidence system: an absolute minimum score AND a
//      minimum margin over the second-best candidate. If either isn't met,
//      the agency is flagged MANUAL REVIEW instead of getting "the least bad"
//      image. See CONFIDENCE THRESHOLDS below.
//   6. Prints a full per-agency validation report, and never leaves
//      agencyData.js / attribution.json out of sync with each other.

const fs = require('fs');
const path = require('path');
const searchConfig = require('./agency_image_search_config');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const AGENCY_DATA_PATH = path.join(PROJECT_ROOT, 'app', 'space-agencies', 'agencyData.js');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'agency-hq');
const ATTRIBUTION_PATH = path.join(OUTPUT_DIR, 'attribution.json');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'SpaceTecAgencyImageBot/2.0 (build-time script; contact: site-admin@example.com)';
const REQUEST_DELAY_MS = 600; // be polite to the Commons API between agencies
const QUERY_DELAY_MS = 150; // ...and between queries for the same agency
const THUMB_WIDTH = 1600; // downloaded size — enough for a hover card AND a large profile image, not the raw original
const MIN_LONG_EDGE = 700; // reject anything smaller than this on its longest side

// ---------------------------------------------------------------------------
// CONFIDENCE THRESHOLDS (documented, explicit, tunable in one place)
// ---------------------------------------------------------------------------
// A candidate is only ever auto-accepted if BOTH hold:
//   score            >= MIN_ACCEPT_SCORE
//   score - runnerUp >= MIN_MARGIN   (an absolute gap over the 2nd place candidate)
// Below either bar, the agency is reported as MANUAL REVIEW rather than
// forced into the website with an uncertain image. This is intentional:
// correct image > no image > wrong image, never wrong image > empty card.
const MIN_ACCEPT_SCORE = 70;
const MIN_MARGIN = 18;

// ---------------------------------------------------------------------------
// KEYWORD LISTS
// ---------------------------------------------------------------------------
// These are matched against the COMBINED metadata text (title + Commons
// ImageDescription + ObjectName + Categories), not just the filename, so a
// caption or category can trigger a rejection even if the filename itself
// looks innocuous.

const BLOCK_KEYWORDS_HARD = [
  // logos / branding / heraldry / non-photographic artwork
  'logo', 'flag of', 'emblem', 'seal of', 'insignia', 'patch', 'coat of arms', 'crest',
  'badge', 'plaque', 'monument', 'statue', 'bust of', 'trophy', 'medal', 'certificate',
  'map of', 'diagram', 'chart', 'graph', 'icon', 'symbol', 'silhouette',
  'stamp', 'banknote', 'coin', 'poster', 'illustration', 'render', 'cgi', 'artist\u2019s concept',
  'artist concept', 'painting', 'engraving', 'drawing', 'sketch', 'cartoon', 'caricature',
];

const PEOPLE_EVENT_KEYWORDS = [
  'portrait', 'astronaut', 'cosmonaut', 'crew photo', 'headshot', 'group photo',
  'official photo', 'delegation', 'delegates', 'meeting', 'meets', 'meeting with',
  'visit', 'visits', 'visiting', 'tour of', 'sign', 'signing', 'signed', 'signature',
  'mou', 'memorandum', 'agreement', 'cooperation', 'ceremony', 'handshake',
  'press conference', 'conference', 'summit', 'forum', 'symposium', 'briefing',
  'interview', 'testimony', 'hearing', 'cabinet', 'parliament', 'congress',
  'minister', 'secretary', 'ambassador', 'president', 'chairman', 'chairwoman',
  'director general', 'administrator', 'award', 'gala', 'dinner', 'reception',
  'bilateral', 'state visit', 'welcomes', 'welcoming', 'announcement', 'collaborate',
  'collaboration', 'event',
];

const HARDWARE_KEYWORDS = [
  'rocket', 'launch of', 'liftoff', 'lift off', 'booster', 'capsule', 'spacecraft',
  'satellite', 'rover', 'probe', 'mission patch', 'lander', 'orbiter', 'lunar module',
  'starship', 'dream chaser', 'crew dragon', 'space station', 'iss expedition',
];

// Strong positive signal that the candidate is a photo of a building/site.
const BUILDING_KEYWORDS = [
  'headquarters', 'head office', 'head-quarters', ' hq', 'campus', 'building',
  'center', 'centre', 'facility', 'complex', 'tower', 'offices', 'office',
  'space centre', 'space center', 'research centre', 'research center',
  'aerial view', 'exterior', 'facade', 'entrance', 'skyline', 'campus view',
  'administrative building', 'corporate headquarters',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html) {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim() || null;
}

function normalize(text) {
  return (text || '').toLowerCase();
}

function countHits(text, keywords) {
  return keywords.filter((kw) => text.includes(kw)).length;
}

// A handful of the original six agencies never stored `headquarters` as its
// own field — it's only ever mentioned inside their `brief` prose (e.g.
// "Headquartered in Washington, D.C., ..."). Pull it out rather than treating
// those agencies as having no location to search with. This is now only a
// FALLBACK — agency_image_search_config.js is checked first.
function extractHeadquartersFromBrief(brief) {
  if (!brief) return null;
  const match = brief.match(/Headquartered (?:in|at) ([^.,]+(?:,\s*[^.,]+)?)/i);
  return match ? match[1].trim() : null;
}

// Merges agencyData.js with the image-search-only config file into one
// convenient object per agency. Never mutates or duplicates agency facts —
// this is purely for building/verifying search queries.
function resolveSearchProfile(agency) {
  const cfg = searchConfig[agency.id] || {};
  const hqLocation = cfg.hqLocation || agency.headquarters || extractHeadquartersFromBrief(agency.brief) || null;
  const identityNames = [
    cfg.searchName || agency.name,
    cfg.officialName,
    ...(cfg.aliases || []),
  ].filter(Boolean);
  return {
    id: agency.id,
    displayName: agency.name,
    searchName: cfg.searchName || agency.name,
    identityNames, // any of these appearing = a positive identity match
    hqLocation,
    city: hqLocation ? hqLocation.split(',')[0].trim() : null,
    excludeOrgs: cfg.excludeOrgs || [],
  };
}

function buildSearchQueries(profile) {
  const { searchName, hqLocation, city, identityNames } = profile;
  const queries = new Set();

  if (hqLocation) queries.add(`${searchName} headquarters ${hqLocation}`);
  queries.add(`${searchName} headquarters building`);
  queries.add(`${searchName} headquarters`);
  queries.add(`${searchName} head office`);
  if (city) queries.add(`${searchName} ${city} building`);
  if (city) queries.add(`${searchName} ${city} headquarters`);
  queries.add(`${searchName} campus`);
  queries.add(`${searchName} building`);

  // Also search under any known official name / alias — a building is often
  // uploaded under the formal name rather than the everyday acronym.
  identityNames.forEach((n) => {
    if (n && n !== searchName) {
      queries.add(`${n} headquarters`);
      queries.add(`${n} building`);
    }
  });

  return Array.from(queries);
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
      const meta = info.extmetadata || {};
      return {
        title: page.title, // e.g. "File:NASA Headquarters, Washington DC.jpg"
        pageid: page.pageid,
        mime: info.mime,
        width: info.width,
        height: info.height,
        fullUrl: info.url,
        thumbUrl: info.thumburl || info.url,
        thumbWidth: info.thumbwidth || info.width,
        extmetadata: meta,
        // Pre-computed combined text used for ALL keyword/identity matching.
        // This is the key fix: description + categories + object name are
        // searched, not just the filename.
        combinedText: normalize([
          page.title,
          stripHtml(meta.ImageDescription?.value),
          stripHtml(meta.ObjectName?.value),
          stripHtml(meta.Categories?.value),
        ].filter(Boolean).join(' \u2022 ')),
      };
    })
    .filter(Boolean);
}

// Scores a single candidate against one agency's search profile.
// Returns { score, reasons: [] } or null if the candidate is disqualified
// outright. `reasons` is kept for the validation report / debugging.
function scoreCandidate(candidate, profile) {
  const reasons = [];

  if (!candidate.mime || !candidate.mime.startsWith('image/')) return null;
  if (candidate.mime === 'image/svg+xml' || candidate.mime === 'image/gif') return null; // logo/diagram/flag territory

  const longEdge = Math.max(candidate.width || 0, candidate.height || 0);
  if (longEdge < MIN_LONG_EDGE) return null;

  const text = candidate.combinedText;

  // --- Hard rejects: never acceptable regardless of everything else -------
  if (countHits(text, BLOCK_KEYWORDS_HARD) > 0) return null;
  if (countHits(text, HARDWARE_KEYWORDS) > 0) return null;

  const peopleEventHits = countHits(text, PEOPLE_EVENT_KEYWORDS);
  // A single incidental word (e.g. "office" catches "office building" fine,
  // but something like "signing" or "ceremony" appearing at all means the
  // photo's subject is very likely people/an event, not the building itself)
  if (peopleEventHits > 0) return null;

  // --- Required: explicit identity match -----------------------------------
  // A building/HQ keyword is no longer sufficient on its own. The candidate
  // must actually name THIS agency (or a known alias/building name for it)
  // somewhere in its title/description/categories.
  const identityHit = profile.identityNames.some((name) => text.includes(normalize(name)));
  if (!identityHit) return null;
  reasons.push('identity match found');

  // --- Negative association: a DIFFERENT, confusable org dominates --------
  // e.g. searching for UK Space Agency and finding "Airbus facility.jpg" —
  // Airbus is present, the agency's own name might appear in a caption
  // ("UK Space Agency officials visit Airbus"), but the building itself
  // belongs to Airbus. Because we already required an identity hit above,
  // this rule specifically catches the "photo whose TITLE is about the other
  // org" shape, which is the strongest signal of true ownership.
  const titleText = normalize(candidate.title);
  const otherOrgOwnsTitle = profile.excludeOrgs.some((org) => titleText.includes(normalize(org)));
  const titleHasOwnIdentity = profile.identityNames.some((name) => titleText.includes(normalize(name)));
  if (otherOrgOwnsTitle && !titleHasOwnIdentity) return null;
  if (otherOrgOwnsTitle) reasons.push('caution: another organization also present in metadata');

  // --- Required: building/facility signal ----------------------------------
  const buildingHits = countHits(text, BUILDING_KEYWORDS);
  if (buildingHits === 0) return null;
  reasons.push(`${buildingHits} building/facility keyword(s)`);

  // --- Scoring --------------------------------------------------------------
  let score = 0;

  // Identity strength: matching in the TITLE is much stronger evidence than
  // only matching somewhere in a long description/category list.
  score += titleHasOwnIdentity ? 40 : 20;

  // "headquarters" / "head office" specifically (not just any building word)
  if (text.includes('headquarters') || text.includes('head office') || text.includes('head-quarters')) {
    score += 20;
    reasons.push('explicit "headquarters" match');
  }

  score += Math.min(buildingHits, 4) * 6;

  // Location match, when we know the agency's HQ city.
  if (profile.city && text.includes(normalize(profile.city))) {
    score += 12;
    reasons.push(`location match: ${profile.city}`);
  }

  // Small penalty if another org is mentioned anywhere at all (even when it
  // didn't own the title) — keeps genuinely ambiguous candidates below the
  // confidence bar rather than tied with a cleaner match.
  const otherOrgMentioned = profile.excludeOrgs.some((org) => text.includes(normalize(org)));
  if (otherOrgMentioned) score -= 10;

  // Mild resolution bonus, applied last and never enough by itself to
  // rescue a candidate that didn't already qualify above.
  score += Math.min(longEdge, 4000) / 500;

  return { score: Math.round(score * 10) / 10, reasons };
}

async function findBestImageForAgency(profile) {
  const queries = buildSearchQueries(profile);
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
    await sleep(QUERY_DELAY_MS);
  }

  const scored = Array.from(seen.values())
    .map((candidate) => {
      const result = scoreCandidate(candidate, profile);
      return result ? { candidate, score: result.score, reasons: result.reasons } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return {
    totalCandidatesSeen: seen.size,
    totalQualified: scored.length,
    winner: scored[0] || null,
    runnerUp: scored[1] || null,
  };
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
  // NOTE: the DEFAULT run (no flags) intentionally processes every agency,
  // including ones that already have an /agency-hq/ image — existing images
  // are not trusted just because they exist (see section 17/35 of the spec).
  // --missing-only remains available as an explicit opt-in maintenance mode.
  if (missingOnly) targets = targets.filter((a) => !a.hqImage || !a.hqImage.startsWith('/agency-hq/'));

  console.log(`\nProcessing ${targets.length} of ${agencies.length} agencies...`);
  console.log(`(confidence thresholds: score >= ${MIN_ACCEPT_SCORE}, margin over runner-up >= ${MIN_MARGIN})\n`);

  const successes = [];
  const manualReview = [];
  const attributionRecords = [];
  const reportLines = [];

  let agencySource = fs.readFileSync(AGENCY_DATA_PATH, 'utf8');

  // Carry over attribution for any agency we are NOT re-processing this run
  // (e.g. a --only= partial run), so attribution.json never loses history.
  if (fs.existsSync(ATTRIBUTION_PATH)) {
    const existing = JSON.parse(fs.readFileSync(ATTRIBUTION_PATH, 'utf8'));
    const processedIds = new Set(targets.map((a) => a.id));
    existing.filter((rec) => !processedIds.has(rec.agencyId)).forEach((rec) => attributionRecords.push(rec));
  }

  for (const agency of targets) {
    const profile = resolveSearchProfile(agency);
    process.stdout.write(`\u2192 ${agency.name} (${agency.id})... `);

    reportLines.push('');
    reportLines.push(agency.name);

    try {
      const { totalCandidatesSeen, totalQualified, winner, runnerUp } = await findBestImageForAgency(profile);

      if (!winner) {
        console.log('no qualified candidate \u2014 MANUAL REVIEW');
        reportLines.push('\u26a0 MANUAL REVIEW');
        reportLines.push(`reason: no candidate passed identity + building verification (${totalCandidatesSeen} results scanned, 0 qualified)`);
        manualReview.push({ id: agency.id, name: agency.name, reason: `no verified headquarters/facility image found (${totalCandidatesSeen} candidates scanned)` });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const margin = winner.score - (runnerUp ? runnerUp.score : 0);
      const confident = winner.score >= MIN_ACCEPT_SCORE && margin >= MIN_MARGIN;

      if (!confident) {
        console.log(`low confidence (score ${winner.score}, margin ${margin.toFixed(1)}) \u2014 MANUAL REVIEW`);
        reportLines.push('\u26a0 MANUAL REVIEW');
        reportLines.push(`confidence: LOW (score ${winner.score} / margin ${margin.toFixed(1)} \u2014 below threshold)`);
        reportLines.push(`best candidate: ${winner.candidate.title}`);
        manualReview.push({
          id: agency.id,
          name: agency.name,
          reason: `best candidate scored ${winner.score} with margin ${margin.toFixed(1)} over runner-up (below confidence threshold: needs >=${MIN_ACCEPT_SCORE} score and >=${MIN_MARGIN} margin)`,
        });
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const best = winner.candidate;
      const ext = extensionForMime(best.mime);
      const localFilename = `${agency.id}.${ext}`;
      const destPath = path.join(OUTPUT_DIR, localFilename);
      const publicPath = `/agency-hq/${localFilename}`;

      await downloadImage(best.thumbUrl, destPath);

      const updatedSource = setHqImageInSource(agencySource, agency.id, publicPath);
      if (!updatedSource) {
        console.log('downloaded, but could not locate agency record to update \u2014 flagged for manual review');
        reportLines.push('\u26a0 MANUAL REVIEW');
        reportLines.push('reason: image downloaded but agencyData.js record not found');
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

      console.log(`\u2713 ${localFilename} (score ${winner.score}, margin ${margin.toFixed(1)})`);
      reportLines.push('\u2713 accepted');
      reportLines.push('confidence: HIGH');
      reportLines.push(`image: ${localFilename}`);
      reportLines.push(`reason: ${winner.reasons.join('; ')} (score ${winner.score}, margin ${margin.toFixed(1)} over runner-up, ${totalQualified} qualified of ${totalCandidatesSeen} scanned)`);
      successes.push({ id: agency.id, name: agency.name, filename: localFilename, score: winner.score });
    } catch (err) {
      console.log(`failed (${err.message})`);
      reportLines.push('\u26a0 MANUAL REVIEW');
      reportLines.push(`reason: ${err.message}`);
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
  console.log('AGENCY HQ IMAGE VALIDATION');
  console.log('========================================');
  reportLines.forEach((line) => console.log(line));
  console.log('\n========================================');
  console.log(`TOTAL AGENCIES: ${targets.length}`);
  console.log(`ACCEPTED: ${successes.length}`);
  console.log(`MANUAL REVIEW: ${manualReview.length}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Agency image script failed:', err);
  process.exit(1);
});
