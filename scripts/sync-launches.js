const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncLaunches() {
  console.log("Fetching all global launches (with pagination)...");
  
  // Start with the initial upcoming launches endpoint (using max limit of 100 per page)
  let url = 'https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=100';
  let totalSynced = 0;

  try {
    while (url) {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) break;

      for (const launch of data.results) {
        const launchData = {
          id: launch.id,
          name: launch.name,
          status: launch.status?.name || 'Scheduled',
          net: launch.net,
          provider: launch.launch_service_provider?.name || 'Unknown Agency',
          pad_location: launch.pad?.location?.name || 'Global Launch Facility'
        };

        const { error } = await supabase
          .from('launches')
          .upsert(launchData);

        if (error) {
          console.error(`Error upserting launch ${launch.name}:`, error.message);
        } else {
          totalSynced++;
        }
      }

      // Automatically move to the next page URL provided by the API response
      url = data.next; 
      console.log(`Synced page chunk... Total records processed so far: ${totalSynced}`);
    }

    console.log(`Successfully synced all ${totalSynced} global launches to Supabase!`);
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

syncLaunches();
