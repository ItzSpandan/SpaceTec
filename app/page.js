import SpaceTecHub from './SpaceTecHub';
import { supabase } from './supabase';

export default async function Home() {
  const nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  
  let apodData = null;
  let upcomingLaunches = [];
  let padWeather = [];

  // Fetch NASA APOD data
  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`, { next: { revalidate: 3600 } });
    if (res.ok) apodData = await res.json();
  } catch (error) {
    console.error("APOD Fetch Error:", error);
  }

  // Fetch real global launches from Supabase, sorted by upcoming launch time
  try {
    const { data, error } = await supabase
      .from('launches')
      .select('*')
      .order('net', { ascending: true });
      
    if (error) {
      console.error("Supabase Launch Fetch Error:", error);
    } else {
      upcomingLaunches = data || [];
    }
  } catch (error) {
    console.error("Database Fetch Error:", error);
  }

  // Fetch live launchpad weather telemetry from Supabase
  try {
    const { data, error } = await supabase
      .from('weather')
      .select('*');

    if (error) {
      console.error("Supabase Weather Fetch Error:", error);
    } else {
      padWeather = data || [];
    }
  } catch (error) {
    console.error("Weather Database Fetch Error:", error);
  }

  return <SpaceTecHub apodData={apodData} upcomingLaunches={upcomingLaunches} padWeather={padWeather} />;
}
