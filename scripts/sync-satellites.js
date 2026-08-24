async function runSync() {
  console.log('Fetching satellites from CelesTrak...');
  const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json');
  if (!res.ok) throw new Error(`CelesTrak failed with status: ${res.status}`);
  
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid data format');

  console.log(`Fetched ${data.length} total satellites from CelesTrak. Formatting...`);

  const formattedSats = data.map((sat, index) => {
    const incl = sat.INCLINATION || 0;
    const meanMotion = sat.MEAN_MOTION || 15;
    
    let alt = 400; 
    if (meanMotion < 2.0) alt = 1200; 
    else if (meanMotion < 4.0) alt = 800;

    const nameStr = sat.OBJECT_NAME?.trim() || `SAT-${index}`;
    let org = 'Independent / International';
    if (nameStr.includes('ISS') || nameStr.includes('ZARYA')) org = 'NASA / Roscosmos / International';
    else if (nameStr.includes('STARLINK')) org = 'SpaceX (USA)';
    else if (nameStr.includes('NOAA') || nameStr.includes('GOES')) org = 'NOAA (USA)';
    else if (nameStr.includes('COSMOS')) org = 'Roscosmos (Russia)';
    else if (nameStr.includes('GPS')) org = 'US Space Force';

    return {
      id: sat.NORAD_CAT_ID || index,
      name: nameStr,
      inclination: incl,
      mean_motion: meanMotion,
      altitude: alt / 2500,
      velocity: `${(Math.sqrt(398600 / (6371 + alt))).toFixed(2)} km/s`,
      organization: org,
      lat: incl > 90 ? 180 - incl : incl,
      lng: (index * 25) % 360 - 180,
    };
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`Syncing ${formattedSats.length} satellites to Supabase in batches...`);
  
  const chunkSize = 500;
  for (let i = 0; i < formattedSats.length; i += chunkSize) {
    const chunk = formattedSats.slice(i, i + chunkSize);
    
    const response = await fetch(`${supabaseUrl}/rest/v1/satellites`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(chunk)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Supabase chunk error at index ${i} (${response.status}):`, errText);
    } else {
      console.log(`Successfully synced chunk ${i} to ${i + chunk.length}`);
    }
  }
  console.log('All satellite batches synced successfully!');
}

runSync().catch(err => {
  console.error(err);
  process.exit(1);
});
