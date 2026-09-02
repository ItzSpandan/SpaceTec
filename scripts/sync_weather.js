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
  { id: 'wallops', name: 'WALLOPS FLIGHT FACILITY', lat: 37.9402, lon: -75.4664 },
  { id: 'mojave', name: 'MOJAVE AIR AND SPACE PORT', lat: 35.0594, lon: -118.1519 },
  { id: 'kwajalein', name: 'KWAJALEIN ATOLL', lat: 9.0470, lon: 167.7430 },
  { id: 'kauai', name: 'PACIFIC MISSILE RANGE FACILITY', lat: 22.0586, lon: -159.7850 },
  { id: 'kourou', name: 'GUIANA SPACE CENTRE', lat: 5.2360, lon: -52.7680 },
  { id: 'andoya', name: 'ANDOYA SPACEPORT', lat: 69.2947, lon: 16.0200 },
  { id: 'esrange', name: 'ESRANGE SPACE CENTER', lat: 67.8930, lon: 21.1040 },
  { id: 'saxa', name: 'SAXA VORD SPACEPORT', lat: 60.7490, lon: -0.7500 },
  { id: 'sutherland', name: 'SUTHERLAND SPACEPORT', lat: 58.5090, lon: -4.4120 },
  { id: 'cornwall', name: 'SPACEPORT CORNWALL', lat: 50.4210, lon: -5.0270 },
  { id: 'baikonur', name: 'BAIKONUR COSMODROME', lat: 45.9646, lon: 63.3052 },
  { id: 'plesetsk', name: 'PLESETSK COSMODROME', lat: 62.9275, lon: 40.5750 },
  { id: 'vostochny', name: 'VOSTOCHNY COSMODROME', lat: 51.8840, lon: 128.3330 },
  { id: 'kapustin', name: 'KAPUSTIN YAR', lat: 48.5720, lon: 45.8040 },
  { id: 'yasny', name: 'YASNY COSMODROME', lat: 51.2030, lon: 59.8500 },
  { id: 'jiuquan', name: 'JIUQUAN SATELLITE LAUNCH CENTER', lat: 40.9606, lon: 100.2910 },
  { id: 'xichang', name: 'XICHANG SATELLITE LAUNCH CENTER', lat: 28.2460, lon: 102.0270 },
  { id: 'taiyuan', name: 'TAIYUAN SATELLITE LAUNCH CENTER', lat: 38.8490, lon: 111.6080 },
  { id: 'wenchang', name: 'WENCHANG SPACE LAUNCH SITE', lat: 19.6140, lon: 110.9510 },
  { id: 'korla', name: 'KORLA SPACE LAUNCH SITE', lat: 41.6100, lon: 88.9700 },
  { id: 'tanegashima', name: 'TANEGASHIMA SPACE CENTER', lat: 30.4042, lon: 130.9702 },
  { id: 'uchinoura', name: 'UCHINOURA SPACE CENTER', lat: 31.2510, lon: 131.0820 },
  { id: 'sriharikota', name: 'SATISH DHAWAN SPACE CENTRE', lat: 13.7199, lon: 80.2304 },
  { id: 'kulasekarapattinam', name: 'KULASEKARAPATTINAM SPACEPORT', lat: 8.3670, lon: 78.0250 },
  { id: 'thumba', name: 'THUMBA EQUATORIAL ROCKET LAUNCHING STATION', lat: 8.5360, lon: 76.8700 },
  { id: 'chandipur', name: 'INTEGRATED TEST RANGE', lat: 21.3170, lon: 87.2950 },
  { id: 'mahia', name: 'ROCKET LAB LAUNCH COMPLEX 1', lat: -39.2562, lon: 177.8647 },
  { id: 'woomera', name: 'WOOMERA RANGE COMPLEX', lat: -31.1600, lon: 136.8050 },
  { id: 'arnhem', name: 'ARNHEM SPACE CENTRE', lat: -12.3680, lon: 136.8140 },
  { id: 'alcantara', name: 'ALCANTARA SPACE CENTER', lat: -2.3170, lon: -44.3690 },
  { id: 'barreira', name: 'BARREIRA DO INFERNO LAUNCH CENTER', lat: -5.9100, lon: -35.1630 },
  { id: 'semnan', name: 'SEMNAN SPACE CENTER', lat: 35.2340, lon: 53.9210 },
  { id: 'imam', name: 'IMAM KHOMEINI SPACEPORT', lat: 35.2340, lon: 53.9210 },
  { id: 'shahrud', name: 'SHAHRUD MISSILE TEST SITE', lat: 36.4180, lon: 55.0180 },
  { id: 'tongchangri', name: 'TONGCHANG-RI SOHAE SATELLITE LAUNCHING GROUND', lat: 39.6600, lon: 124.7060 },
  { id: 'musudanri', name: 'MUSUDAN-RI LAUNCH SITE', lat: 40.8560, lon: 129.6660 },
  { id: 'sanmarco', name: 'SAN MARCO EQUATORIAL RANGE', lat: -2.9460, lon: 40.2120 },
  { id: 'palmachim', name: 'PALMACHIM AIRBASE', lat: 31.8960, lon: 34.6900 },
  { id: 'white', name: 'WHITE SANDS MISSILE RANGE', lat: 32.9900, lon: -106.9750 },
  { id: 'poker', name: 'POKER FLAT RESEARCH RANGE', lat: 65.1270, lon: -147.4350 },
  { id: 'midland', name: 'MIDLAND INTERNATIONAL AIR AND SPACE PORT', lat: 31.9425, lon: -102.2019 },
  { id: 'kiruna', name: 'KIRUNA ROCKET RANGE', lat: 67.8558, lon: 20.2253 },
  { id: 'nyalesund', name: 'NY-ALESUND ROCKET RANGE', lat: 78.9230, lon: 11.9230 }
];

// Open-Meteo's `weather_code` field follows the WMO weather interpretation
// code table (https://open-meteo.com/en/docs — same codes used by their
// forecast API regardless of location), so this mapping is accurate for
// every launchpad the script queries, not just a subset.
const WEATHER_CODE_CONDITIONS = {
  0: 'Clear / Optimal',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Dense Drizzle',
  56: 'Freezing Drizzle',
  57: 'Freezing Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  66: 'Freezing Rain',
  67: 'Freezing Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm / Hail',
  99: 'Thunderstorm / Heavy Hail',
};

function getWeatherCondition(weatherCode) {
  return WEATHER_CODE_CONDITIONS[weatherCode] || 'Unknown';
}

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
        const condition = getWeatherCondition(data.current.weather_code);

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
