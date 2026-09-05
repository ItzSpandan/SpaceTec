// aboutData.js
//
// All content below is sourced directly from the existing SpaceTec project:
// real routes (app/*/page.js), real homepage sections (SpaceTecHub.js anchor
// ids), and real fields already present on the data those pages read
// (launches.provider, launches.pad_location, satellite orbit class, etc).
// Nothing here is an invented feature, a fabricated statistic, or a "live"
// claim the underlying page doesn't already back up.

// --- Moving tile stream (Section: continuously moving feature tiles) ------
// href starting with "/#" scrolls to an existing anchor id on the homepage
// (see SpaceTecHub.js: hero, orbital-map, agencies, launchpads, launches).
// href starting with "/x" is an existing standalone route.

export const TILE_ROW_1 = [
  {
    title: 'SATELLITES',
    sub: 'GLOBAL ORBITAL DATA',
    detail: "Track orbital objects on SpaceTec's live orbital map, plotted by real orbital elements.",
    href: '/#orbital-map',
  },
  {
    title: 'ISS TRACKER',
    sub: 'LIVE ORBITAL POSITION',
    detail: 'A dedicated live view of the International Space Station, propagated from current tracking data.',
    href: '/iss-tracker',
  },
  {
    title: 'GLOBAL LAUNCHES',
    sub: 'UPCOMING + HISTORICAL',
    detail: 'Upcoming and past launches worldwide, with provider, status and mission details.',
    href: '/#launches',
  },
  {
    title: 'LAUNCHPADS',
    sub: 'GLOBAL LAUNCH SITE DIRECTORY',
    detail: 'A directory of launch sites and spaceports around the world, plotted on the orbital map.',
    href: '/#launchpads',
  },
  {
    title: 'ROCKETS',
    sub: 'LAUNCH VEHICLE DATABASE',
    detail: 'A database of launch vehicles and their specifications.',
    href: '/rocket-database',
  },
  {
    title: 'SPACE AGENCIES',
    sub: 'GLOBAL AEROSPACE NETWORK',
    detail: 'Space agencies and operators from around the world, gathered into one directory.',
    href: '/#agencies',
  },
];

export const TILE_ROW_2 = [
  {
    title: 'MISSION DATABASE',
    sub: 'MISSIONS & DESTINATIONS',
    detail: 'A searchable record of space missions and the destinations they were sent to.',
    href: '/mission-database',
  },
  {
    title: 'SPACECRAFT',
    sub: 'VEHICLES & SYSTEMS',
    detail: 'A database of spacecraft and the systems that carried them.',
    href: '/spacecraft-database',
  },
  {
    title: 'ASTRONAUT DATABASE',
    sub: 'CREWED SPACEFLIGHT RECORDS',
    detail: 'Records of astronauts and the crewed missions they flew.',
    href: '/astronaut-database',
  },
  {
    title: 'SPACE WEATHER',
    sub: 'SOLAR ENVIRONMENT',
    detail: 'Solar wind, geomagnetic activity and other space weather conditions.',
    href: '/space-weather',
  },
  {
    title: 'SPACE NEWS',
    sub: 'CURRENT SPACE DEVELOPMENTS',
    detail: 'Current developments from across the space industry.',
    href: '/space-news',
  },
  {
    title: 'ASTRONOMY TONIGHT',
    sub: 'THE SKY ABOVE YOU',
    detail: "What's visible in the night sky, based on your location and the date.",
    href: '/astronomy-tonight',
  },
  {
    title: 'CELESTIAL DATABASE',
    sub: 'OBJECTS ACROSS THE UNIVERSE',
    detail: 'A database of celestial objects, from planets to deep-sky targets.',
    href: '/celestial-database',
  },
  {
    title: 'SPACE STATISTICS',
    sub: 'ECOSYSTEM ANALYTICS',
    detail: 'Aggregated statistics drawn from the launch and satellite databases.',
    href: '/space-statistics',
  },
];

// --- Organized feature groups (Section: SpaceTec feature groups) ----------
// Grouping mirrors the categories already used in SpaceTec's own navigation
// (Live Telemetry / Database dropdowns and the hamburger "Shortcuts &
// Features" menu in SpaceTecHub.js).

export const FEATURE_GROUPS = [
  {
    name: 'ORBITAL INTELLIGENCE',
    blurb: 'Where things are in orbit, right now and over time.',
    items: [
      { label: 'Live Satellite Tracking', href: '/#orbital-map' },
      { label: 'ISS Tracker', href: '/iss-tracker' },
      { label: 'Satellite Database', href: '/#orbital-map' },
    ],
  },
  {
    name: 'SPACE OPERATIONS',
    blurb: 'What is launching, from where, and on what.',
    items: [
      { label: 'Upcoming & Past Launches', href: '/#launches' },
      { label: 'Launchpad Directory', href: '/#launchpads' },
      { label: 'Rocket Database', href: '/rocket-database' },
    ],
  },
  {
    name: 'SPACE EXPLORATION',
    blurb: 'The missions, spacecraft, people and agencies behind them.',
    items: [
      { label: 'Mission Database', href: '/mission-database' },
      { label: 'Spacecraft Database', href: '/spacecraft-database' },
      { label: 'Space Agencies', href: '/#agencies' },
      { label: 'Astronaut Database', href: '/astronaut-database' },
    ],
  },
  {
    name: 'COSMIC INTELLIGENCE',
    blurb: 'The sky, the sun, and the wider space environment.',
    items: [
      { label: 'Astronomy Tonight', href: '/astronomy-tonight' },
      { label: 'Celestial Database', href: '/celestial-database' },
      { label: 'Space Weather', href: '/space-weather' },
      { label: 'Space News', href: '/space-news' },
      { label: 'Space Statistics', href: '/space-statistics' },
    ],
  },
];

// --- SpaceTec network (Section: connection diagram around a central node) -

export const NETWORK_NODES = [
  'SATELLITES',
  'MISSIONS',
  'LAUNCHES',
  'AGENCIES',
  'ASTRONAUTS',
  'SPACECRAFT',
  'SPACE WEATHER',
  'ASTRONOMY',
];

// --- SpaceTec in motion (Section: small traveling modules) ----------------
// Categories, not fabricated telemetry — e.g. "Starlink" is a real
// classification the satellite tracker already buckets satellites into
// (see classifySatelliteCategory in SpaceTecHub.js), not a live count.

export const MOTION_MODULES = [
  { label: 'ISS', sub: 'ORBITING EARTH' },
  { label: 'STARLINK', sub: 'SATELLITE CONSTELLATION' },
  { label: 'AGENCY', sub: 'SPACE OPERATIONS' },
  { label: 'ROCKET', sub: 'LAUNCH VEHICLE' },
  { label: 'MISSION', sub: 'DESTINATIONS & CREW' },
  { label: 'ASTRONOMY', sub: 'THE SKY TONIGHT' },
];

// --- How the systems connect (Section: relationship chains) ---------------
// Grounded in fields the launches table actually has (provider, pad_location)
// and how satellites are classified/plotted elsewhere in the project —
// not asserted foreign-key relationships that don't exist in the data.

export const CONNECTION_CHAINS = [
  {
    title: 'A LAUNCH, FOLLOWED THROUGH',
    steps: ['LAUNCH', 'PROVIDER', 'LAUNCHPAD', 'MISSION ORBIT'],
  },
  {
    title: 'AN ORBITAL OBJECT, FOLLOWED THROUGH',
    steps: ['SATELLITE', 'ORBIT CLASS', 'ORBITAL MAP', 'SATELLITE DATABASE'],
  },
];

// --- What is SpaceTec (Section: textual explanation) -----------------------

export const WHAT_IS_SPACETEC = `SpaceTec brings satellite tracking, launch operations, mission history and space-environment data into a single interface. It follows objects in orbit including the ISS, keeps a directory of launchpads and the launches scheduled from them, and maintains searchable databases of rockets, missions, spacecraft, astronauts and space agencies. Alongside that, it surfaces the wider space environment through space weather conditions, an astronomy-tonight view of the sky above you, space news and aggregated space statistics.`;
