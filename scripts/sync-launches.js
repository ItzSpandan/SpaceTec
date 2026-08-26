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

async function upsertLaunches(launches) {
  let synced = 0;
  for (const launch of launches) {
    const launchData = toLaunchRow(launch);
    const { error } = await supabase.from('launches').upsert(launchData);

    if (error) {
      console.error(`Error upserting launch ${launch.name}:`, error.message);
    } else {
      synced++;
    }
  }
  return synced;
}

async function syncUpcomingLaunches() {
  console.log("Fetching all UPCOMING global launches (with pagination)...");

  let url = 'https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=100';
  let totalSynced = 0;

  while (url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) break;

    totalSynced += await upsertLaunches(data.results);

    url = data.next;
    console.log(`Upcoming: synced page chunk... total so far: ${totalSynced}`);

    if (url) await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Finished syncing ${totalSynced} upcoming launches.`);
  return totalSynced;
}

async function syncPreviousLaunches() {
  console.log("Fetching PAST global launches (most recent first)...");

  let url = 'https://lldev.thespacedevs.com/2.2.0/launch/previous/?limit=100&ordering=-net';
  let totalSynced = 0;
  let pagesFetched = 0;

  while (url && pagesFetched < MAX_PREVIOUS_PAGES) {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) break;

    totalSynced += await upsertLaunches(data.results);
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
    const upcomingCount = await syncUpcomingLaunches();
    await sleep(REQUEST_DELAY_MS);
    const pastCount = await syncPreviousLaunches();

    console.log(`Successfully synced ${upcomingCount} upcoming + ${pastCount} past launches to Supabase!`);
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

syncLaunches();
