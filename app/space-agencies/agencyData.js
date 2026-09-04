// SINGLE SOURCE OF TRUTH for the Explore More Agencies directory & profile.
//
// This is the exact same data that used to live inline inside SpaceTecHub.js
// (as `allAgencies` / `agencyDirectory`) — it has only been moved here so that
// both the UI (SpaceTecHub.js) and the build-time image script
// (scripts/fetch_agency_hq_images.js) read from ONE place. Nothing about the
// data itself, its shape, or its values was changed in the move.
//
// scripts/fetch_agency_hq_images.js updates ONLY the `hqImage` value on each
// agency below (in place). Every other field is left untouched by that script.

export const allAgencies = [
  {
    id: 'nasa',
    batch: 0,
    name: 'NASA',
    tagline: 'EUROPA CLIPPER & ARTEMIS',
    accentColor: '#3b82f6',
    specialty: 'Europa Clipper Mission & Deep Space Planetary Exploration',
    brief: 'Headquartered in Washington, D.C., directing worldwide aeronautics research and manned space exploration.',
    videoUrl: '/nasa.mp4.mp4', 
    hqImage: '/agency-hq/nasa.jpg',
    logoText: 'NASA HQ // KENNEDY SPACE CENTER'
  },
  {
    id: 'spacex',
    batch: 0,
    name: 'SPACEX',
    tagline: 'STARSHIP FLEET',
    accentColor: '#ff6600',
    specialty: 'Starship Super Heavy Launch & Reusable Mars Architecture',
    brief: 'Headquartered at Starbase & Rocket Road, revolutionizing aerospace manufacturing and transport.',
    videoUrl: '/spacex.mp4.mp4',
    hqImage: '/agency-hq/spacex.jpg',
    logoText: 'SPACEX HQ // HAWTHORNE, CA'
  },
  {
    id: 'esa',
    batch: 0,
    name: 'ESA',
    tagline: 'ARIANE 6 & SMILE MISSION',
    accentColor: '#60a5fa',
    specialty: 'Vega-C & European Cosmic Vision Space Probes',
    brief: 'Headquartered in Paris, coordinating the space flight programs of 22 European member states.',
    videoUrl: '/esa.mp4.mp4',
    hqImage: '/agency-hq/esa.jpg',
    logoText: 'ESA HQ // PARIS, FRANCE'
  },
  {
    id: 'jaxa',
    batch: 1,
    name: 'JAXA',
    tagline: 'H3 & ASTEROID SAMPLING',
    accentColor: '#2dd4bf',
    specialty: 'H3 Next-Gen Rocket & Hayabusa Asteroid Sample Return',
    brief: 'Headquartered in Tokyo, unifying Japan’s national aerospace research and orbital development.',
    videoUrl: '/jaxa.mp4.mp4',
    hqImage: '/agency-hq/jaxa.jpg',
    logoText: 'JAXA HQ // TOKYO, JAPAN'
  },
  {
    id: 'isro',
    batch: 1,
    name: 'ISRO',
    tagline: 'GSLV MK III & CHANDRAYAAN',
    accentColor: '#ff9933',
    specialty: 'GSLV Heavy Launcher, Chandrayaan South Pole & Gaganyaan',
    brief: 'Headquartered in Bengaluru, driving breakthrough cost-effective interplanetary and satellite missions.',
    videoUrl: '/isro.mp4.mp4',
    hqImage: '/agency-hq/isro.jpg',
    logoText: 'ISRO HQ // BENGALURU, INDIA'
  },
  {
    id: 'cnsa',
    batch: 1,
    name: 'CNSA',
    tagline: 'CHANG\'E & TIANWEN',
    accentColor: '#f43f5e',
    specialty: 'Chang\'e Lunar Sample Return & Tianwen Mars Rover Missions',
    brief: 'Headquartered in Beijing, managing national space administration and planetary research programs.',
    videoUrl: '/cnsa.mp4.mp4',
    hqImage: '/agency-hq/cnsa.jpg',
    logoText: 'CNSA HQ // BEIJING, CHINA'
  }

];

export const agencyDirectory = [
  ...allAgencies,
  { id: 'roscosmos', hqImage: '/agency-hq/roscosmos.jpg', name: 'ROSCOSMOS', tagline: 'RUSSIAN SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Moscow, Russia', history: 'Established in 1992 as the Russian federal space agency after the Soviet space programme.', majorPrograms: 'Soyuz missions, Progress cargo spacecraft, GLONASS navigation and lunar exploration.', brief: 'Russia’s civil space corporation responsible for national spaceflight programmes.' },
  { id: 'csa', hqImage: '/agency-hq/csa.jpg', name: 'CANADIAN SPACE AGENCY', tagline: 'CANADARM & EARTH SCIENCE', accentColor: '#f87171', category: 'Government agency', headquarters: 'Saint-Hubert, Quebec, Canada', history: 'Founded in 1989 to coordinate Canada’s civil space activities.', majorPrograms: 'Canadarm and Canadarm2 robotics, RADARSAT Earth observation and lunar science.', brief: 'Canada’s national civil space agency and international mission partner.' },
  { id: 'uksa', hqImage: '/agency-hq/uksa.jpg', name: 'UK SPACE AGENCY', tagline: 'UK SPACE CAPABILITY', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Swindon, United Kingdom', history: 'Formed in 2010 to coordinate the United Kingdom’s civil space programme.', majorPrograms: 'Satellite applications, Earth observation, launch capability and international programmes.', brief: 'The United Kingdom’s civil space agency.' },
  { id: 'dlr', hqImage: '/agency-hq/dlr.jpg', name: 'DLR', tagline: 'GERMAN AEROSPACE RESEARCH', accentColor: '#facc15', category: 'Government research agency', headquarters: 'Cologne, Germany', history: 'Germany’s national aerospace research centre developed from earlier national aerospace research institutions.', majorPrograms: 'Earth observation, space robotics, launch research and human spaceflight support.', brief: 'Germany’s national centre for aeronautics and space research.' },
  { id: 'cnes', hqImage: '/agency-hq/cnes.jpg', name: 'CNES', tagline: 'FRENCH SPACE AGENCY', accentColor: '#38bdf8', category: 'Government agency', headquarters: 'Paris, France', history: 'Created in 1961 to shape and deliver France’s national space policy and programmes.', majorPrograms: 'Ariane cooperation, Earth observation, space science and launch-site operations.', brief: 'France’s government space agency.' },
  { id: 'asi', hqImage: '/agency-hq/asi.jpg', name: 'ITALIAN SPACE AGENCY', tagline: 'ITALIAN SPACE PROGRAMMES', accentColor: '#22d3ee', category: 'Government agency', headquarters: 'Rome, Italy', history: 'Established in 1988 to coordinate Italy’s civil space activities.', majorPrograms: 'Earth observation, ESA cooperation, scientific satellites and human spaceflight contributions.', brief: 'Italy’s national civil space agency.' },
  { id: 'kari', hqImage: '/agency-hq/kari.jpg', name: 'KARI', tagline: 'KOREAN AEROSPACE RESEARCH', accentColor: '#a78bfa', category: 'Government research institute', headquarters: 'Daejeon, South Korea', history: 'Founded in 1989 to lead South Korea’s aerospace research and development.', majorPrograms: 'Nuri launch vehicle, KOMPSAT satellites and lunar exploration.', brief: 'South Korea’s national aerospace research institute.' },
  { id: 'uaesa', hqImage: '/agency-hq/uaesa.jpg', name: 'UAE SPACE AGENCY', tagline: 'EMIRATES SPACE PROGRAMME', accentColor: '#34d399', category: 'Government agency', headquarters: 'Abu Dhabi, United Arab Emirates', history: 'Established in 2014 to guide the UAE’s national space sector.', majorPrograms: 'Emirates Mars Mission, satellite development and astronaut missions.', brief: 'The UAE body coordinating national space policy and growth.' },
  { id: 'asa', hqImage: '/agency-hq/asa.jpg', name: 'AUSTRALIAN SPACE AGENCY', tagline: 'AUSTRALIAN SPACE SECTOR', accentColor: '#f97316', category: 'Government agency', headquarters: 'Adelaide, Australia', history: 'Created in 2018 to grow Australia’s civil space capability and industry.', majorPrograms: 'Space regulation, Earth observation applications and international partnerships.', brief: 'Australia’s national civil space agency.' },
  { id: 'conae', hqImage: '/agency-hq/conae.jpg', name: 'CONAE', tagline: 'ARGENTINE SPACE ACTIVITIES', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Buenos Aires, Argentina', history: 'Established in 1991 to execute Argentina’s national space activities.', majorPrograms: 'SAOCOM radar satellites, Earth observation and satellite applications.', brief: 'Argentina’s national space activities commission.' },
  { id: 'aeb', hqImage: '/agency-hq/aeb.jpg', name: 'BRAZILIAN SPACE AGENCY', tagline: 'BRAZILIAN SPACE PROGRAMME', accentColor: '#22c55e', category: 'Government agency', headquarters: 'Brasilia, Brazil', history: 'Created in 1994 to coordinate Brazil’s national space programme.', majorPrograms: 'Earth observation, launch systems and Alcantara spaceport development.', brief: 'Brazil’s agency for national space policy and programmes.' },
  { id: 'sansa', hqImage: '/agency-hq/sansa.jpg', name: 'SANSA', tagline: 'SOUTH AFRICAN SPACE AGENCY', accentColor: '#f59e0b', category: 'Government agency', headquarters: 'Pretoria, South Africa', history: 'Established in 2010 to promote and manage South Africa’s space activities.', majorPrograms: 'Space weather, Earth observation and satellite navigation services.', brief: 'South Africa’s national space agency.' },
  { id: 'tua', hqImage: '/agency-hq/tua.jpg', name: 'TURKISH SPACE AGENCY', tagline: 'TURKISH NATIONAL SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Ankara, Turkey', history: 'Established in 2018 to coordinate Turkey’s national space policy.', majorPrograms: 'National space programme, satellite systems and lunar mission planning.', brief: 'Turkey’s national space agency.' },
  { id: 'blue-origin', hqImage: '/agency-hq/blue-origin.jpg', name: 'BLUE ORIGIN', tagline: 'REUSABLE LAUNCH SYSTEMS', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Kent, Washington, USA', history: 'Founded in 2000 to pursue reusable launch systems and long-term space access.', majorPrograms: 'New Shepard, New Glenn and BE-4 engines.', brief: 'A private aerospace company focused on reusable space transportation.' },
  { id: 'rocket-lab', hqImage: '/agency-hq/rocket-lab.jpg', name: 'ROCKET LAB', tagline: 'SMALL LAUNCH & SPACE SYSTEMS', accentColor: '#a78bfa', category: 'Private company', headquarters: 'Long Beach, California, USA', history: 'Founded in 2006 and developed the Electron small-launch vehicle.', majorPrograms: 'Electron, Neutron, Photon spacecraft and satellite systems.', brief: 'A launch and space-systems company serving commercial and government missions.' },
  { id: 'arianespace', hqImage: '/agency-hq/arianespace.jpg', name: 'ARIANESPACE', tagline: 'EUROPEAN LAUNCH SERVICES', accentColor: '#60a5fa', category: 'Private launch services company', headquarters: 'Evry-Courcouronnes, France', history: 'Founded in 1980 to operate Europe’s Ariane launch services commercially.', majorPrograms: 'Ariane 6 and Vega-C launch services.', brief: 'A European provider of launch services.' },
  { id: 'sierra-space', hqImage: '/agency-hq/sierra-space.jpg', name: 'SIERRA SPACE', tagline: 'COMMERCIAL SPACEPLANE & HABITATS', accentColor: '#f8fafc', category: 'Private company', headquarters: 'Louisville, Colorado, USA', history: 'Formed as an independent commercial space company in 2021.', majorPrograms: 'Dream Chaser spaceplane and commercial space habitats.', brief: 'A commercial space company developing transportation and orbital infrastructure.' },
  { id: 'firefly', hqImage: '/agency-hq/firefly.jpg', name: 'FIREFLY AEROSPACE', tagline: 'RESPONSIVE SPACE SERVICES', accentColor: '#fb7185', category: 'Private company', headquarters: 'Cedar Park, Texas, USA', history: 'Founded in 2017 to develop launch vehicles and lunar delivery services.', majorPrograms: 'Alpha rocket, Blue Ghost lunar lander and space utility vehicles.', brief: 'A private aerospace company focused on launch and lunar missions.' },
  { id: 'planet', hqImage: '/agency-hq/planet.jpg', name: 'PLANET LABS', tagline: 'DAILY EARTH OBSERVATION', accentColor: '#facc15', category: 'Private company', headquarters: 'San Francisco, California, USA', history: 'Founded in 2010 to build a high-frequency Earth-imaging satellite constellation.', majorPrograms: 'Dove, SuperDove and Pelican Earth-observation satellites.', brief: 'A commercial Earth-observation data company.' },
  { id: 'maxar', hqImage: '/agency-hq/maxar.jpg', name: 'MAXAR SPACE SYSTEMS', tagline: 'SPACECRAFT & EARTH INTELLIGENCE', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Palo Alto, California, USA', history: 'Built from long-standing satellite and spacecraft businesses operating under the Maxar name.', majorPrograms: 'Spacecraft buses, high-resolution Earth imaging and robotic systems.', brief: 'A space-technology company providing spacecraft and Earth-intelligence capabilities.' },
  { id: 'intuitive-machines', hqImage: '/agency-hq/intuitive-machines.jpg', name: 'INTUITIVE MACHINES', tagline: 'LUNAR DELIVERY SERVICES', accentColor: '#f97316', category: 'Private company', headquarters: 'Houston, Texas, USA', history: 'Founded in 2013 to develop commercial lunar services.', majorPrograms: 'Nova-C lunar landers, lunar data services and communications infrastructure.', brief: 'A commercial lunar exploration and services company.' },
  { id: 'astroscale', hqImage: '/agency-hq/astroscale.jpg', name: 'ASTROSCALE', tagline: 'ORBITAL DEBRIS SERVICES', accentColor: '#2dd4bf', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2013 to develop orbital-sustainability and debris-removal services.', majorPrograms: 'ELSA-d and in-orbit servicing technologies.', brief: 'A private company focused on sustainable operations in Earth orbit.' },
  { id: 'ispace', name: 'ISPACE', tagline: 'COMMERCIAL LUNAR EXPLORATION', accentColor: '#e2e8f0', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2010 to build commercial lunar exploration services.', majorPrograms: 'HAKUTO-R lunar landers and lunar payload delivery.', brief: 'A commercial lunar exploration company.' }
];
