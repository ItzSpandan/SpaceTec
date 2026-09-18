import SpaceTecHub from './SpaceTecHub';
import { supabase } from './supabase';

export default async function Home() {
  const nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';

  // These three were previously awaited one after another, so the total
  // wait before ANYTHING (including the intro) could reach the browser
  // was the SUM of all three requests. They don't depend on each other,
  // so run them concurrently instead — same data, same error handling,
  // same fallbacks, but the page shell ships as soon as the slowest of
  // the three finishes rather than the sum of all three.
  const [apodResult, launchesResult, weatherResult, launchpadImagesResult] = await Promise.allSettled([
    fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`, { next: { revalidate: 3600 } })
      .then((res) => (res.ok ? res.json() : null)),
    supabase.from('launches').select('*').order('net', { ascending: true }),
    supabase.from('weather').select('*'),
    supabase.from('launchpad_images').select('*'),
  ]);

  let apodData = null;
  if (apodResult.status === 'fulfilled') {
    apodData = apodResult.value;
  } else {
    console.error('APOD Fetch Error:', apodResult.reason);
  }

  let upcomingLaunches = [];
  if (launchesResult.status === 'fulfilled') {
    const { data, error } = launchesResult.value;
    if (error) {
      console.error('Supabase Launch Fetch Error:', error);
    } else {
      upcomingLaunches = data || [];
    }
  } else {
    console.error('Database Fetch Error:', launchesResult.reason);
  }

  let padWeather = [];
  if (weatherResult.status === 'fulfilled') {
    const { data, error } = weatherResult.value;
    if (error) {
      console.error('Supabase Weather Fetch Error:', error);
    } else {
      padWeather = data || [];
    }
  } else {
    console.error('Weather Database Fetch Error:', weatherResult.reason);
  }

  let padImages = [];
  if (launchpadImagesResult.status === 'fulfilled') {
    const { data, error } = launchpadImagesResult.value;
    if (error) {
      console.error('Supabase Launchpad Images Fetch Error:', error);
    } else {
      padImages = data || [];
    }
  } else {
    console.error('Launchpad Images Database Fetch Error:', launchpadImagesResult.reason);
  }

  return <SpaceTecHub apodData={apodData} upcomingLaunches={upcomingLaunches} padWeather={padWeather} padImages={padImages} />;
}
