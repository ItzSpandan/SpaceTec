import SpaceTecHub from './SpaceTecHub';

export default async function Home() {
  const nasaApiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
  
  let apodData = null;
  let upcomingLaunches = [];

  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${nasaApiKey}`, { next: { revalidate: 3600 } });
    if (res.ok) apodData = await res.json();
  } catch (error) {
    console.error("APOD Fetch Error:", error);
  }

  try {
    const res = await fetch('https://lldev.thespacedevs.com/2.2.0/launch/upcoming/?limit=6', { next: { revalidate: 1800 } });
    if (res.ok) {
      const data = await res.json();
      upcomingLaunches = data.results || [];
    }
  } catch (error) {
    console.error("Launch Fetch Error:", error);
  }

  return <SpaceTecHub apodData={apodData} upcomingLaunches={upcomingLaunches} />;
}
