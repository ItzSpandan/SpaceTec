const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// The free "lldev" (dev/sandbox) Launch Library 2 API is rate-limited.
// Fetching too many pages too fast can get this script throttled, so we:
//   1. cap how many pages of PAST launches we pull each run (upcoming launches
//      are always fetched in full, since there are far fewer of them), and
//   2. wait briefly between requests.
const MAX_PREVIOUS_PAGES = 5; // 5 pages x 100 = up to 500 most recent past launches
const REQUEST_DELAY_MS = 1200;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Duplicate / stale-record handling ----------------------------------
//
// The Launch Library 2 / SpaceLib "lldev" (dev/sandbox) API can, over time,
// stop returning a launch under the API `id` we previously synced and start
// returning what is really the SAME real-world launch under a NEW `id`
// (e.g. once its schedule is updated). Because our sync only ever upserts
// whatever the API currently returns, the old `id`'s row is never touched
// again — it just sits in Supabase forever as a stale duplicate, and the
// homepage (which sorts by NET) can end up showing that old, outdated
// record alongside or instead of the current one.
//
// We can't rely on the `id` to detect this (that's exactly the field that
// changes), so instead we derive a stable "identity key" from metadata that
// describes the real-world launch itself — its mission name and the agency
// flying it — and use that to recognize when a freshly-synced row and an
// already-stored row describe the same launch under different ids.
function normalizeIdentityPart(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Name + provider together are specific enough to identify one real-world
// launch (mission names aren't reused), while still being loose enough to
// survive a reschedule (which only changes `net`, `status`, etc.) — and
// specific enough that two genuinely different launches with superficially
// similar names (different providers, or a materially different name) will
// never collide onto the same key.
function launchIdentityKey(row) {
  const name = normalizeIdentityPart(row.name);
  const provider = normalizeIdentityPart(row.provider);
  if (!name) return null;
  return `${name}::${provider}`;
}

// Given the batch of launches we just fetched fresh from the API (the
// current, authoritative view of those real-world launches), find any rows
// already sitting in Supabase that share an identity key with one of them
// but have a different `id` — i.e. a stale duplicate left over from before
// that launch's `id` changed — and remove them.
//
// Safety: if the fresh batch itself contains two different ids under the
// same identity key (which would only happen if two genuinely distinct
// launches happened to share an exact name + provider), we skip cleanup for
// that key entirely rather than risk deleting a legitimate launch.
async function cleanupStaleDuplicates(freshRows) {
  const freshByKey = new Map(); // identityKey -> Set of fresh ids
  for (const row of freshRows) {
    const key = launchIdentityKey(row);
    if (!key) continue;
    if (!freshByKey.has(key)) freshByKey.set(key, new Set());
    freshByKey.get(key).add(row.id);
  }

  // Ambiguous keys (>1 distinct fresh id claiming the same identity in this
  // very batch) are not safe to dedupe automatically — leave them alone.
  const safeKeys = new Set(
    [...freshByKey.entries()].filter(([, ids]) => ids.size === 1).map(([key]) => key)
  );
  if (safeKeys.size === 0) return 0;

  const { data: existingRows, error: fetchError } = await supabase
    .from('launches')
    .select('id, name, provider');

  if (fetchError) {
    console.error('Could not fetch existing launches for dedup check:', fetchError.message);
    return 0;
  }

  const staleIds = [];
  for (const existing of existingRows || []) {
    const key = launchIdentityKey(existing);
    if (!key || !safeKeys.has(key)) continue;

    const currentId = [...freshByKey.get(key)][0];
    if (existing.id !== currentId) {
      staleIds.push(existing.id);
    }
  }

  if (staleIds.length === 0) return 0;

  const { error: deleteError } = await supabase.from('launches').delete().in('id', staleIds);
  if (deleteError) {
    console.error('Error deleting stale duplicate launches:', deleteError.message);
    return 0;
  }

  console.log(`Removed ${staleIds.length} stale duplicate launch record(s): ${staleIds.join(', ')}`);
  return staleIds.length;
}

// Turns one launch object from the API into the row shape our `launches`
// table expects. Used for both upcoming and previous (past) launches.
function toLaunchRow(launch) {
  return {
    id: launch.id,
    name: launch.name,
    status: launch.status?.name || 'Scheduled',
    net: launch.net,
    provider: launch.launch_service_provider?.name || 'Unknown Agency',
    pad_location: launch.pad?.location?.name || 'Global Launch Facility',
    mission_description: launch.mission?.description || null,
    mission_type: launch.mission?.type || null,
    mission_orbit: launch.mission?.orbit?.name || null,
    image_url: launch.image || null
  };
}

async function upsertLaunches(launches, freshRowsOut) {
  let synced = 0;
  for (const launch of launches) {
    const launchData = toLaunchRow(launch);
    const { error } = await supabase.from('launches').upsert(launchData);

    if (error) {
      console.error(`Error upserting launch ${launch.name}:`, error.message);
    } else {
      synced++;
      if (freshRowsOut) freshRowsOut.push(launchData);
    }
  }
  return synced;
}

async function syncUpcomingLaunches(freshRowsOut) {
  console.log("Fetching all UPCOMING global launches (with pagination)...");

  let url = 'https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=100';
  let totalSynced = 0;

  while (url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) break;

    totalSynced += await upsertLaunches(data.results, freshRowsOut);

    url = data.next;
    console.log(`Upcoming: synced page chunk... total so far: ${totalSynced}`);

    if (url) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Finished syncing ${totalSynced} upcoming launches.`);
  return totalSynced;
}

async function syncPreviousLaunches(freshRowsOut) {
  console.log("Fetching PAST global launches (most recent first)...");

  let url = 'https://lldev.thespacedevs.com/2.2.0/launch/previous/?limit=100&ordering=-net';
  let totalSynced = 0;
  let pagesFetched = 0;

  while (url && pagesFetched < MAX_PREVIOUS_PAGES) {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) break;

    totalSynced += await upsertLaunches(data.results, freshRowsOut);
    pagesFetched++;

    url = data.next;
    console.log(`Past: synced page ${pagesFetched}/${MAX_PREVIOUS_PAGES}... total so far: ${totalSynced}`);

    if (url && pagesFetched < MAX_PREVIOUS_PAGES) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Finished syncing ${totalSynced} past launches (capped at ${MAX_PREVIOUS_PAGES} pages).`);
  return totalSynced;
}

async function syncLaunches() {
  try {
    const freshRows = [];

    const upcomingCount = await syncUpcomingLaunches(freshRows);
    await sleep(REQUEST_DELAY_MS);
    const pastCount = await syncPreviousLaunches(freshRows);

    // Both fetches represent the CURRENT, authoritative state of these
    // launches as of right now — use them together to catch and remove any
    // stale duplicate left in Supabase under an old `id`.
    const removedCount = await cleanupStaleDuplicates(freshRows);

    console.log(`Successfully synced ${upcomingCount} upcoming + ${pastCount} past launches to Supabase!`);
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} stale duplicate launch record(s).`);
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

syncLaunches();
