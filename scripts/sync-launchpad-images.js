// scripts/sync-launchpad-images.js
//
// Populates the EXISTING public.launchpad_images Supabase table with a real
// image URL for as many of SpaceTec's 47 launchpads as can be confidently
// matched against Launch Library 2 / The Space Devs API.
//
// Pipeline:
//   Launch Library 2 (/2.2.0/location/) -> normalized name matching against
//   SpaceTec's 47-launchpad directory -> public.launchpad_images.image_url
//
// IMPORTANT — what "image" means here:
// Launch Library 2 does not expose ground-level photographs of launch pads
// through its public API. Each Location record it returns carries a single
// field called `map_image` — that is the API's own name for it, and it is
// the only per-site image data the API exposes. For some sites it renders
// as a real aerial/satellite photo, for others as a schematic map. This
// script writes exactly that field's value and nothing else — no image is
// ever invented, generated, or substituted from an unrelated source.
//
// Matching is done at the LOCATION level (e.g. "Kennedy Space Center"), not
// the individual PAD level (e.g. "Launch Complex 39A"), because SpaceTec's
// directory is site-level. A location is only matched when the matcher is
// confident (see scoreCandidate below); everything else is left alone —
// its image_url is simply never written, per the "no confident match, no
// image" requirement.
//
// Usage:
//   node scripts/sync-launchpad-images.js
//
// Requires Node 18+ (built-in fetch). Needs @supabase/supabase-js and the
// same NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars the
// other sync scripts in this repo use.

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LL2_BASE = 'https://ll.thespacedevs.com/2.2.0/location/';
const PAGE_LIMIT = 100;
const REQUEST_DELAY_MS = 400; // be polite between paginated requests

// ---------------------------------------------------------------------------
// THE EXISTING SPACETEC 47-LAUNCHPAD DIRECTORY (id + name + country)
// ---------------------------------------------------------------------------
// This is a READ-ONLY copy of app/SpaceTecHub.js's `allLaunchpads` array,
// trimmed to just the fields this script needs (id, name, country). It is
// used ONLY to drive matching + to fill launchpad_name on write — it is
// NEVER written back to, and the site's own hardcoded directory remains the
// sole source of truth for launchpad metadata, per the project brief.
const SPACETEC_LAUNCHPADS = [
  { id: 'ksc', name: 'KENNEDY SPACE CENTER', country: 'United States' },
  { id: 'cape', name: 'CAPE CANAVERAL SFS', country: 'United States' },
  { id: 'starbase', name: 'STARBASE BOCA CHICA', country: 'United States' },
  { id: 'vandenberg', name: 'VANDENBERG SFB', country: 'United States' },
  { id: 'wallops', name: 'WALLOPS FLIGHT FACILITY', country: 'United States' },
  { id: 'mojave', name: 'MOJAVE AIR AND SPACE PORT', country: 'United States' },
  { id: 'kwajalein', name: 'KWAJALEIN ATOLL', country: 'Marshall Islands' },
  { id: 'kauai', name: 'PACIFIC MISSILE RANGE FACILITY', country: 'United States' },
  { id: 'kourou', name: 'GUIANA SPACE CENTRE', country: 'French Guiana' },
  { id: 'andoya', name: 'ANDOYA SPACEPORT', country: 'Norway' },
  { id: 'esrange', name: 'ESRANGE SPACE CENTER', country: 'Sweden' },
  { id: 'saxa', name: 'SAXA VORD SPACEPORT', country: 'United Kingdom' },
  { id: 'sutherland', name: 'SUTHERLAND SPACEPORT', country: 'United Kingdom' },
  { id: 'cornwall', name: 'SPACEPORT CORNWALL', country: 'United Kingdom' },
  { id: 'baikonur', name: 'BAIKONUR COSMODROME', country: 'Kazakhstan' },
  { id: 'plesetsk', name: 'PLESETSK COSMODROME', country: 'Russia' },
  { id: 'vostochny', name: 'VOSTOCHNY COSMODROME', country: 'Russia' },
  { id: 'kapustin', name: 'KAPUSTIN YAR', country: 'Russia' },
  { id: 'yasny', name: 'YASNY COSMODROME', country: 'Russia' },
  { id: 'jiuquan', name: 'JIUQUAN SATELLITE LAUNCH CENTER', country: 'China' },
  { id: 'xichang', name: 'XICHANG SATELLITE LAUNCH CENTER', country: 'China' },
  { id: 'taiyuan', name: 'TAIYUAN SATELLITE LAUNCH CENTER', country: 'China' },
  { id: 'wenchang', name: 'WENCHANG SPACE LAUNCH SITE', country: 'China' },
  { id: 'korla', name: 'KORLA SPACE LAUNCH SITE', country: 'China' },
  { id: 'tanegashima', name: 'TANEGASHIMA SPACE CENTER', country: 'Japan' },
  { id: 'uchinoura', name: 'UCHINOURA SPACE CENTER', country: 'Japan' },
  { id: 'sriharikota', name: 'SATISH DHAWAN SPACE CENTRE', country: 'India' },
  { id: 'kulasekarapattinam', name: 'KULASEKARAPATTINAM SPACEPORT', country: 'India' },
  { id: 'thumba', name: 'THUMBA EQUATORIAL ROCKET LAUNCHING STATION', country: 'India' },
  { id: 'chandipur', name: 'INTEGRATED TEST RANGE', country: 'India' },
  { id: 'mahia', name: 'ROCKET LAB LAUNCH COMPLEX 1', country: 'New Zealand' },
  { id: 'woomera', name: 'WOOMERA RANGE COMPLEX', country: 'Australia' },
  { id: 'arnhem', name: 'ARNHEM SPACE CENTRE', country: 'Australia' },
  { id: 'alcantara', name: 'ALCANTARA SPACE CENTER', country: 'Brazil' },
  { id: 'barreira', name: 'BARREIRA DO INFERNO LAUNCH CENTER', country: 'Brazil' },
  { id: 'semnan', name: 'SEMNAN SPACE CENTER', country: 'Iran' },
  { id: 'imam', name: 'IMAM KHOMEINI SPACEPORT', country: 'Iran' },
  { id: 'shahrud', name: 'SHAHRUD MISSILE TEST SITE', country: 'Iran' },
  { id: 'tongchangri', name: 'TONGCHANG-RI SOHAE SATELLITE LAUNCHING GROUND', country: 'North Korea' },
  { id: 'musudanri', name: 'MUSUDAN-RI LAUNCH SITE', country: 'North Korea' },
  { id: 'sanmarco', name: 'SAN MARCO EQUATORIAL RANGE', country: 'Kenya' },
  { id: 'palmachim', name: 'PALMACHIM AIRBASE', country: 'Israel' },
  { id: 'white', name: 'WHITE SANDS MISSILE RANGE', country: 'United States' },
  { id: 'poker', name: 'POKER FLAT RESEARCH RANGE', country: 'United States' },
  { id: 'midland', name: 'MIDLAND INTERNATIONAL AIR AND SPACE PORT', country: 'United States' },
  { id: 'kiruna', name: 'KIRUNA ROCKET RANGE', country: 'Sweden' },
  { id: 'nyalesund', name: 'NY-ALESUND ROCKET RANGE', country: 'Norway' },
];

// Extra alias phrases for pads whose SpaceTec name doesn't share enough
// vocabulary with the name LL2 uses for the same physical site (a
// different transliteration, a sub-complex sharing one parent location,
// etc). Every pad's own `id` is also tried automatically as an alias
// (see buildAliasSet) since SpaceTec's ids are themselves short-form site
// names (ksc, cape, starbase, kourou, mahia, ...) — that covers most cases
// on its own. This map only covers the handful that need more than that.
const EXTRA_ALIASES = {
  saxa: ['SAXAVORD', 'SAXA VORD'],
  // 'imam' and 'semnan' are two SpaceTec directory entries for the same
  // physical Iranian complex (identical lat/lon in the SpaceTec data) —
  // LL2 files both under the single location "Semnan Space Center", so
  // both SpaceTec ids should resolve to it.
  imam: ['SEMNAN'],
  semnan: ['IMAM KHOMEINI'],
  // Tongchang-ri / Sohae is also published by LL2 under the alternate
  // English transliteration "Tonghae".
  tongchangri: ['SOHAE', 'TONGHAE'],
};

// Best-effort ISO 3166-1 alpha-3 codes for the countries in the SpaceTec
// directory, used only as a same/different-country signal against LL2's
// own `country_code` — never as the sole basis for a match.
const COUNTRY_ISO3 = {
  'United States': 'USA',
  'Marshall Islands': 'MHL',
  'French Guiana': 'GUF',
  'Norway': 'NOR',
  'Sweden': 'SWE',
  'United Kingdom': 'GBR',
  'Kazakhstan': 'KAZ',
  'Russia': 'RUS',
  'China': 'CHN',
  'Japan': 'JPN',
  'India': 'IND',
  'New Zealand': 'NZL',
  'Australia': 'AUS',
  'Brazil': 'BRA',
  'Iran': 'IRN',
  'North Korea': 'PRK',
  'Kenya': 'KEN',
  'Israel': 'ISR',
};

// Words too generic to count toward a name match on their own (they show
// up across many unrelated launchpads: "space", "range", "test", etc).
const STOPWORDS = new Set([
  'SPACE', 'CENTER', 'CENTRE', 'LAUNCH', 'LAUNCHING', 'SITE', 'RANGE',
  'BASE', 'FACILITY', 'STATION', 'COMPLEX', 'PORT', 'SPACEPORT', 'FIELD',
  'GROUND', 'AIRBASE', 'MISSILE', 'TEST', 'SATELLITE', 'COSMODROME', 'AIR',
  'AND', 'THE', 'OF', 'INTERNATIONAL', 'FORCE', 'SFB', 'SFS', 'FLIGHT',
  'ROCKET', 'EQUATORIAL',
]);

// Scandinavian characters aren't decomposed by String.normalize('NFD'), so
// they need an explicit mapping before diacritics are stripped generically
// (é, â, ã, etc. ARE handled by NFD + the combining-mark strip below).
const CHAR_MAP = { 'ø': 'o', 'Ø': 'O', 'å': 'a', 'Å': 'A', 'æ': 'ae', 'Æ': 'AE' };

function normalize(str) {
  if (!str) return '';
  let s = str.split('').map((ch) => CHAR_MAP[ch] || ch).join('');
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip remaining diacritics
  return s.toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function significantTokens(normalizedStr) {
  return new Set(
    normalizedStr.split(' ').filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function buildAliasSet(pad) {
  const aliases = new Set([pad.id.toUpperCase(), ...(EXTRA_ALIASES[pad.id] || [])]);
  return Array.from(aliases).map(normalize);
}

// Confidence thresholds — deliberately conservative: an unmatched pad just
// keeps its image_url unchanged/null, which is always the safe outcome.
const MIN_ACCEPT_SCORE = 0.6;
const MIN_MARGIN = 0.12;

// Scores one LL2 location against one SpaceTec pad. Returns a plain number;
// higher is better. Not normalized to a fixed max — only used to rank
// candidates and to compare against MIN_ACCEPT_SCORE / MIN_MARGIN.
function scoreCandidate(pad, padAliases, padTokens, location) {
  const locNorm = normalize(location.name || '');
  const locTokens = significantTokens(locNorm);

  let score = 0;

  // Alias hit: one of the pad's alias phrases appears verbatim in the
  // location name (or vice versa for short alias phrases like ids).
  const aliasHit = padAliases.some((alias) => alias && (locNorm.includes(alias) || alias.includes(locNorm)));
  if (aliasHit) score = Math.max(score, 1.0);

  // Token overlap: fraction of the PAD's significant words that also
  // appear in the LL2 location name. Recall-oriented on purpose — LL2
  // location names often drop generic suffixes SpaceTec keeps (and vice
  // versa), so we score how much of the pad's distinguishing vocabulary
  // shows up, not an exact set match.
  if (padTokens.size > 0) {
    let hits = 0;
    for (const t of padTokens) if (locTokens.has(t)) hits += 1;
    const overlap = hits / padTokens.size;
    score = Math.max(score, overlap);
  }

  // Country cross-check: same country nudges confidence up; a KNOWN
  // mismatch pulls it down hard. This is what keeps e.g. "Rocket Lab
  // Launch Complex 1" (Mahia, NZ) from matching a same-named LL2 pad
  // that happens to sit at a different Rocket Lab site in another country.
  const padIso3 = COUNTRY_ISO3[pad.country];
  if (padIso3 && location.country_code) {
    if (location.country_code === padIso3) score += 0.15;
    else score -= 0.6;
  }

  return score;
}

async function fetchAllLocations() {
  const locations = [];
  let url = `${LL2_BASE}?limit=${PAGE_LIMIT}`;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'SpaceTecLaunchpadImageBot/1.0 (build-time script)' } });
    if (!res.ok) throw new Error(`Launch Library 2 request failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    for (const loc of data.results || []) {
      locations.push({
        id: loc.id,
        name: loc.name,
        country_code: loc.country_code || null,
        map_image: loc.map_image || null,
      });
    }
    url = data.next || null;
    if (url) await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }
  return locations;
}

// Manual check-then-write instead of a Supabase `.upsert(..., { onConflict })`
// call: the existing public.launchpad_images table's constraints aren't
// something this script controls or can assume, so it looks up any existing
// row for this launchpad_id itself and either updates that row or inserts a
// new one. This is what keeps repeat runs from ever creating duplicate rows.
async function writeImageForPad(pad, imageUrl) {
  const { data: existing, error: selectError } = await supabase
    .from('launchpad_images')
    .select('id')
    .eq('launchpad_id', pad.id)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError };
  }

  const nowIso = new Date().toISOString();

  if (existing) {
    const { error: updateError } = await supabase
      .from('launchpad_images')
      .update({ launchpad_name: pad.name, image_url: imageUrl, updated_at: nowIso })
      .eq('id', existing.id);
    return { ok: !updateError, error: updateError };
  }

  const { error: insertError } = await supabase
    .from('launchpad_images')
    .insert({
      launchpad_id: pad.id,
      launchpad_name: pad.name,
      image_url: imageUrl,
      created_at: nowIso,
      updated_at: nowIso,
    });
  return { ok: !insertError, error: insertError };
}

async function syncLaunchpadImages() {
  console.log('Starting launchpad image synchronization...');
  console.log(`SpaceTec launchpads to check: ${SPACETEC_LAUNCHPADS.length}`);

  let locations;
  try {
    locations = await fetchAllLocations();
  } catch (err) {
    console.error('Failed to fetch Launch Library 2 locations:', err.message || err);
    process.exit(1);
  }
  console.log(`API launchpads retrieved: ${locations.length}`);

  let imagesFound = 0;
  let imagesUpdated = 0;
  const noMatch = [];

  for (const pad of SPACETEC_LAUNCHPADS) {
    const padNorm = normalize(pad.name);
    const padTokens = significantTokens(padNorm);
    const padAliases = buildAliasSet(pad);

    let best = null;
    let bestScore = -Infinity;
    let secondScore = -Infinity;

    for (const location of locations) {
      const score = scoreCandidate(pad, padAliases, padTokens, location);
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        best = location;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }

    const margin = bestScore - (secondScore === -Infinity ? 0 : secondScore);
    const confidentMatch = best && bestScore >= MIN_ACCEPT_SCORE && margin >= MIN_MARGIN;

    if (!confidentMatch) {
      noMatch.push(pad.name);
      continue;
    }

    if (!best.map_image) {
      // Confident site match, but LL2 has no image for it — leave
      // image_url unchanged/null rather than writing an empty value.
      noMatch.push(`${pad.name} (matched "${best.name}" but no image available)`);
      continue;
    }

    imagesFound += 1;
    const result = await writeImageForPad(pad, best.map_image);
    if (result.ok) {
      imagesUpdated += 1;
      console.log(`Matched: ${pad.name}  ->  "${best.name}" (score ${bestScore.toFixed(2)})`);
    } else {
      console.error(`Failed to write image for ${pad.name}:`, result.error?.message || result.error);
    }
  }

  console.log('');
  console.log('=== Launchpad Image Sync Summary ===');
  console.log(`SpaceTec launchpads checked: ${SPACETEC_LAUNCHPADS.length}`);
  console.log(`API launchpads retrieved: ${locations.length}`);
  console.log(`Images found: ${imagesFound}`);
  console.log(`Images updated: ${imagesUpdated}`);
  console.log(`No confident match: ${noMatch.length}`);
  if (noMatch.length > 0) {
    console.log('Launchpads with no confident match or no available image:');
    for (const name of noMatch) console.log(`  - ${name}`);
  }
  console.log('Launchpad image synchronization completed.');
}

syncLaunchpadImages();
