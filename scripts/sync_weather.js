const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const launchpads = [
  { id: 'ksc', name: 'KENNEDY SPACE CENTER', lat: 28.5729, lon: -80.6490 },
  { id: 'cape', name: 'CAPE CANAVERAL SFS', lat: 28.4888, lon: -80.5778 },
  { id: 'starbase', name: 'STARBASE BOCA CHICA', lat: 25.9975, lon: -97.1561 },
  { id: 'vandenberg', name: 'VANDENBERG SFB', lat: 34.7420, lon: -120.5724 },
  { id: 'kourou', name: 'GUIANA SPACE CENTRE', lat: 5.2360, lon: -52.7680 },
  { id: 'baikonur', name: 'BAIKONUR COSMODROME', lat: 45.9646, lon: 63.3052 },
  { id: 'tanegashima', name: 'TANEGASHIMA SPACE CENTER', lat: 30.4042, lon: 130.9702 },
  { id: 'sriharikota', name: 'SATISH DHAWAN SPACE CENTRE', lat: 13.7199, lon: 80.2304 },
  { id: 'mahia', name: 'ROCKET LAB LAUNCH COMPLEX 1', lat: -39.2562, lon: 177.8647 }
];

async function syncWeather() {
  console.log('Starting launchpad weather synchronization...');

  for (const pad of launchpads) {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${pad.lat}&longitude=${pad.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
      );
      const data = await response.json();

      if (data && data.current) {
        const temp = `${Math.round(data.current.temperature_2m)}°C`;
        const humidity = `${data.current.relative_humidity_2m}%`;
        const wind = `${data.current.wind_speed_10m} km/h`;
        const condition = 'Clear / Optimal';

        const weatherPayload = {
          id: pad.id,
          pad_name: pad.name,
          temperature: temp,
          wind_speed: wind,
          condition: condition,
          humidity: humidity,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('weather')
          .upsert(weatherPayload, { onConflict: 'id' });

        if (error) {
          console.error(`Error saving weather for ${pad.name}:`, error.message);
        } else {
          console.log(`Successfully synced weather for: ${pad.name}`);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch weather for ${pad.name}:`, err);
    }
  }

  console.log('Weather synchronization completed.');
}

syncWeather();
