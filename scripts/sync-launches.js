const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncLaunches() {
  console.log("Fetching global launches...");
  try {
    const response = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=10');
    const data = await response.json();
    
    if (!data.results) return;

    for (const launch of data.results) {
      const launchData = {
        id: launch.id,
        name: launch.name,
        status: launch.status?.name || 'Scheduled',
        net: launch.net,
        provider: launch.launch_service_provider?.name || 'Unknown Agency'
      };

      const { error } = await supabase
        .from('launches')
        .upsert(launchData);

      if (error) console.error("Error upserting launch:", error.message);
    }
    console.log("Successfully synced global launches to Supabase!");
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

syncLaunches();
