'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import OrbitalGlobe from './OrbitalGlobe';
import GlobalSearch from './GlobalSearch';
import { supabase } from './supabase';

// --- LAUNCH STATUS HELPERS (shared by the homepage, the explore pages, and the launch modal) ---

// Any status text from the launch API that means the mission has already flown.
const COMPLETED_STATUS_KEYWORDS = ['success', 'failure', 'partial', 'landing', 'in flight', 'launched'];

function isLaunchPast(launch) {
  if (!launch) return false;
  const statusText = (launch.status || '').toLowerCase();
  if (COMPLETED_STATUS_KEYWORDS.some((keyword) => statusText.includes(keyword))) return true;
  if (launch.net && new Date(launch.net).getTime() < Date.now()) return true;
  return false;
}

// Colour-codes a launch's real status text (Launch Successful / Launch Failure / Partial Failure / Go for Launch / etc).
function getLaunchStatusColor(status) {
  if (!status) return '#a1a1aa';
  const s = status.toLowerCase();
  if (s.includes('partial')) return '#eab308';
  if (s.includes('fail')) return '#ef4444';
  if (s.includes('success') || s.includes('landing')) return '#22c55e';
  if (s.includes('flight') || s.includes('progress')) return '#38bdf8';
  return '#a1a1aa';
}

// A friendly "X days ago" style label for past-launch cards.
function formatTimeAgo(dateStr) {
  if (!dateStr) return 'UNKNOWN';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'T+ TODAY';
  if (days === 1) return 'T+ 1 DAY AGO';
  return `T+ ${days} DAYS AGO`;
}

const HERO_ROTATING_PHRASES = ['ORGANIZED.', 'CONNECTED.', 'AT A GLANCE.', 'IN FOCUS.', 'IN MOTION.', 'IN REAL TIME.'];

export default function SpaceTecHub({ apodData, upcomingLaunches, padWeather }) {
  const [entered, setEntered] = useState(false);
  const [heroPhraseIndex, setHeroPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroPhraseIndex((prev) => (prev + 1) % HERO_ROTATING_PHRASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const [bgIndex, setBgIndex] = useState(0);
  const [activeAgency, setActiveAgency] = useState(null);
  const [agencyBatchIndex, setAgencyBatchIndex] = useState(0);
  const [expandedLaunch, setExpandedLaunch] = useState(null); 
  const [showAllLaunchesPage, setShowAllLaunchesPage] = useState(false);
  const [isTransitioningExplore, setIsTransitioningExplore] = useState(false);
  const [showAllPastLaunchesPage, setShowAllPastLaunchesPage] = useState(false);
  const [isTransitioningPastLaunches, setIsTransitioningPastLaunches] = useState(false);
  const [showAllAgenciesPage, setShowAllAgenciesPage] = useState(false);
  const [isTransitioningAgencies, setIsTransitioningAgencies] = useState(false);
  const [globeViewMode, setGlobeViewMode] = useState({ mode: 'pads', requestId: 0 });

  // New States for Explore Launchpads Section
  const [activePad, setActivePad] = useState(null);
  const [padBatchIndex, setPadBatchIndex] = useState(0);
  const [showAllLaunchpadsPage, setShowAllLaunchpadsPage] = useState(false);
  const [isTransitioningLaunchpads, setIsTransitioningLaunchpads] = useState(false);
  
  // New States for Satellite Wiki Page View
  const [showSatelliteWikiPage, setShowSatelliteWikiPage] = useState(false);
  const [isTransitioningWiki, setIsTransitioningWiki] = useState(false);
  
  // Dropdown & Menu States
  const [showTelemetryDropdown, setShowTelemetryDropdown] = useState(false);
  const [showDatabaseDropdown, setShowDatabaseDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  // Live Space Intelligence strip (section directly below the hero)
  const [liveSatelliteCount, setLiveSatelliteCount] = useState(null);
  const [issLivePos, setIssLivePos] = useState(null);

  const canvasRef = useRef(null);

  const spaceBackgrounds = [
    apodData?.media_type === 'image' ? apodData.url : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2069'
  ];

  const allAgencies = [
    {
      id: 'nasa',
      batch: 0,
      name: 'NASA',
      tagline: 'EUROPA CLIPPER & ARTEMIS',
      accentColor: '#3b82f6',
      specialty: 'Europa Clipper Mission & Deep Space Planetary Exploration',
      brief: 'Headquartered in Washington, D.C., directing worldwide aeronautics research and manned space exploration.',
      videoUrl: '/nasa.mp4.mp4', 
      hqImage: '/nasa.jpeg',
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
      hqImage: '/spacex.jpeg',
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
      hqImage: '/esa.jpeg',
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
      hqImage: '/jaxa.jpeg',
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
      hqImage: '/isro.jpeg',
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
      hqImage: '/cnsa.jpeg',
      logoText: 'CNSA HQ // BEIJING, CHINA'
    }

  ];

  const agencyDirectory = [
    ...allAgencies,
    { id: 'roscosmos', name: 'ROSCOSMOS', tagline: 'RUSSIAN SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Moscow, Russia', history: 'Established in 1992 as the Russian federal space agency after the Soviet space programme.', majorPrograms: 'Soyuz missions, Progress cargo spacecraft, GLONASS navigation and lunar exploration.', brief: 'Russia’s civil space corporation responsible for national spaceflight programmes.' },
    { id: 'csa', name: 'CANADIAN SPACE AGENCY', tagline: 'CANADARM & EARTH SCIENCE', accentColor: '#f87171', category: 'Government agency', headquarters: 'Saint-Hubert, Quebec, Canada', history: 'Founded in 1989 to coordinate Canada’s civil space activities.', majorPrograms: 'Canadarm and Canadarm2 robotics, RADARSAT Earth observation and lunar science.', brief: 'Canada’s national civil space agency and international mission partner.' },
    { id: 'uksa', name: 'UK SPACE AGENCY', tagline: 'UK SPACE CAPABILITY', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Swindon, United Kingdom', history: 'Formed in 2010 to coordinate the United Kingdom’s civil space programme.', majorPrograms: 'Satellite applications, Earth observation, launch capability and international programmes.', brief: 'The United Kingdom’s civil space agency.' },
    { id: 'dlr', name: 'DLR', tagline: 'GERMAN AEROSPACE RESEARCH', accentColor: '#facc15', category: 'Government research agency', headquarters: 'Cologne, Germany', history: 'Germany’s national aerospace research centre developed from earlier national aerospace research institutions.', majorPrograms: 'Earth observation, space robotics, launch research and human spaceflight support.', brief: 'Germany’s national centre for aeronautics and space research.' },
    { id: 'cnes', name: 'CNES', tagline: 'FRENCH SPACE AGENCY', accentColor: '#38bdf8', category: 'Government agency', headquarters: 'Paris, France', history: 'Created in 1961 to shape and deliver France’s national space policy and programmes.', majorPrograms: 'Ariane cooperation, Earth observation, space science and launch-site operations.', brief: 'France’s government space agency.' },
    { id: 'asi', name: 'ITALIAN SPACE AGENCY', tagline: 'ITALIAN SPACE PROGRAMMES', accentColor: '#22d3ee', category: 'Government agency', headquarters: 'Rome, Italy', history: 'Established in 1988 to coordinate Italy’s civil space activities.', majorPrograms: 'Earth observation, ESA cooperation, scientific satellites and human spaceflight contributions.', brief: 'Italy’s national civil space agency.' },
    { id: 'kari', name: 'KARI', tagline: 'KOREAN AEROSPACE RESEARCH', accentColor: '#a78bfa', category: 'Government research institute', headquarters: 'Daejeon, South Korea', history: 'Founded in 1989 to lead South Korea’s aerospace research and development.', majorPrograms: 'Nuri launch vehicle, KOMPSAT satellites and lunar exploration.', brief: 'South Korea’s national aerospace research institute.' },
    { id: 'uaesa', name: 'UAE SPACE AGENCY', tagline: 'EMIRATES SPACE PROGRAMME', accentColor: '#34d399', category: 'Government agency', headquarters: 'Abu Dhabi, United Arab Emirates', history: 'Established in 2014 to guide the UAE’s national space sector.', majorPrograms: 'Emirates Mars Mission, satellite development and astronaut missions.', brief: 'The UAE body coordinating national space policy and growth.' },
    { id: 'asa', name: 'AUSTRALIAN SPACE AGENCY', tagline: 'AUSTRALIAN SPACE SECTOR', accentColor: '#f97316', category: 'Government agency', headquarters: 'Adelaide, Australia', history: 'Created in 2018 to grow Australia’s civil space capability and industry.', majorPrograms: 'Space regulation, Earth observation applications and international partnerships.', brief: 'Australia’s national civil space agency.' },
    { id: 'conae', name: 'CONAE', tagline: 'ARGENTINE SPACE ACTIVITIES', accentColor: '#60a5fa', category: 'Government agency', headquarters: 'Buenos Aires, Argentina', history: 'Established in 1991 to execute Argentina’s national space activities.', majorPrograms: 'SAOCOM radar satellites, Earth observation and satellite applications.', brief: 'Argentina’s national space activities commission.' },
    { id: 'aeb', name: 'BRAZILIAN SPACE AGENCY', tagline: 'BRAZILIAN SPACE PROGRAMME', accentColor: '#22c55e', category: 'Government agency', headquarters: 'Brasilia, Brazil', history: 'Created in 1994 to coordinate Brazil’s national space programme.', majorPrograms: 'Earth observation, launch systems and Alcantara spaceport development.', brief: 'Brazil’s agency for national space policy and programmes.' },
    { id: 'sansa', name: 'SANSA', tagline: 'SOUTH AFRICAN SPACE AGENCY', accentColor: '#f59e0b', category: 'Government agency', headquarters: 'Pretoria, South Africa', history: 'Established in 2010 to promote and manage South Africa’s space activities.', majorPrograms: 'Space weather, Earth observation and satellite navigation services.', brief: 'South Africa’s national space agency.' },
    { id: 'tua', name: 'TURKISH SPACE AGENCY', tagline: 'TURKISH NATIONAL SPACE PROGRAMME', accentColor: '#ef4444', category: 'Government agency', headquarters: 'Ankara, Turkey', history: 'Established in 2018 to coordinate Turkey’s national space policy.', majorPrograms: 'National space programme, satellite systems and lunar mission planning.', brief: 'Turkey’s national space agency.' },
    { id: 'blue-origin', name: 'BLUE ORIGIN', tagline: 'REUSABLE LAUNCH SYSTEMS', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Kent, Washington, USA', history: 'Founded in 2000 to pursue reusable launch systems and long-term space access.', majorPrograms: 'New Shepard, New Glenn and BE-4 engines.', brief: 'A private aerospace company focused on reusable space transportation.' },
    { id: 'rocket-lab', name: 'ROCKET LAB', tagline: 'SMALL LAUNCH & SPACE SYSTEMS', accentColor: '#a78bfa', category: 'Private company', headquarters: 'Long Beach, California, USA', history: 'Founded in 2006 and developed the Electron small-launch vehicle.', majorPrograms: 'Electron, Neutron, Photon spacecraft and satellite systems.', brief: 'A launch and space-systems company serving commercial and government missions.' },
    { id: 'arianespace', name: 'ARIANESPACE', tagline: 'EUROPEAN LAUNCH SERVICES', accentColor: '#60a5fa', category: 'Private launch services company', headquarters: 'Evry-Courcouronnes, France', history: 'Founded in 1980 to operate Europe’s Ariane launch services commercially.', majorPrograms: 'Ariane 6 and Vega-C launch services.', brief: 'A European provider of launch services.' },
    { id: 'sierra-space', name: 'SIERRA SPACE', tagline: 'COMMERCIAL SPACEPLANE & HABITATS', accentColor: '#f8fafc', category: 'Private company', headquarters: 'Louisville, Colorado, USA', history: 'Formed as an independent commercial space company in 2021.', majorPrograms: 'Dream Chaser spaceplane and commercial space habitats.', brief: 'A commercial space company developing transportation and orbital infrastructure.' },
    { id: 'firefly', name: 'FIREFLY AEROSPACE', tagline: 'RESPONSIVE SPACE SERVICES', accentColor: '#fb7185', category: 'Private company', headquarters: 'Cedar Park, Texas, USA', history: 'Founded in 2017 to develop launch vehicles and lunar delivery services.', majorPrograms: 'Alpha rocket, Blue Ghost lunar lander and space utility vehicles.', brief: 'A private aerospace company focused on launch and lunar missions.' },
    { id: 'planet', name: 'PLANET LABS', tagline: 'DAILY EARTH OBSERVATION', accentColor: '#facc15', category: 'Private company', headquarters: 'San Francisco, California, USA', history: 'Founded in 2010 to build a high-frequency Earth-imaging satellite constellation.', majorPrograms: 'Dove, SuperDove and Pelican Earth-observation satellites.', brief: 'A commercial Earth-observation data company.' },
    { id: 'maxar', name: 'MAXAR SPACE SYSTEMS', tagline: 'SPACECRAFT & EARTH INTELLIGENCE', accentColor: '#38bdf8', category: 'Private company', headquarters: 'Palo Alto, California, USA', history: 'Built from long-standing satellite and spacecraft businesses operating under the Maxar name.', majorPrograms: 'Spacecraft buses, high-resolution Earth imaging and robotic systems.', brief: 'A space-technology company providing spacecraft and Earth-intelligence capabilities.' },
    { id: 'intuitive-machines', name: 'INTUITIVE MACHINES', tagline: 'LUNAR DELIVERY SERVICES', accentColor: '#f97316', category: 'Private company', headquarters: 'Houston, Texas, USA', history: 'Founded in 2013 to develop commercial lunar services.', majorPrograms: 'Nova-C lunar landers, lunar data services and communications infrastructure.', brief: 'A commercial lunar exploration and services company.' },
    { id: 'astroscale', name: 'ASTROSCALE', tagline: 'ORBITAL DEBRIS SERVICES', accentColor: '#2dd4bf', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2013 to develop orbital-sustainability and debris-removal services.', majorPrograms: 'ELSA-d and in-orbit servicing technologies.', brief: 'A private company focused on sustainable operations in Earth orbit.' },
    { id: 'ispace', name: 'ISPACE', tagline: 'COMMERCIAL LUNAR EXPLORATION', accentColor: '#e2e8f0', category: 'Private company', headquarters: 'Tokyo, Japan', history: 'Founded in 2010 to build commercial lunar exploration services.', majorPrograms: 'HAKUTO-R lunar landers and lunar payload delivery.', brief: 'A commercial lunar exploration company.' }
  ];

  // GLOBAL LAUNCHPAD DIRECTORY (46 sites, live-synced weather keyed by id)
  const allLaunchpads = [
    { id: 'ksc', name: 'KENNEDY SPACE CENTER', lat: 28.5729, lon: -80.6490, status: '🟢 Active', batch: 0, isMajor: true, accentColor: '#38bdf8', country: 'United States', tagline: 'ARTEMIS & CREW LAUNCH COMPLEX', established: '1962', operator: 'NASA', history: 'Established by NASA in 1962 on Merritt Island, Florida, Kennedy Space Center launched the Apollo Moon missions, the entire Space Shuttle program, and today hosts Artemis and commercial crew launches from historic Pad 39A and 39B.' },
    { id: 'cape', name: 'CAPE CANAVERAL SFS', lat: 28.4888, lon: -80.5778, status: '🟢 Active', batch: 0, isMajor: true, accentColor: '#60a5fa', country: 'United States', tagline: 'BUSIEST US LAUNCH RANGE', established: '1949', operator: 'US Space Force', history: 'Operated by the US Space Force since the 1950s, Cape Canaveral Space Force Station sits beside Kennedy Space Center and hosts the highest launch cadence in the country, including regular SpaceX Falcon 9 and ULA missions.' },
    { id: 'starbase', name: 'STARBASE BOCA CHICA', lat: 25.9975, lon: -97.1561, status: '🟢 Active', batch: 0, isMajor: true, accentColor: '#ff6600', country: 'United States', tagline: 'STARSHIP DEVELOPMENT & FLIGHT SITE', established: '2019', operator: 'SpaceX', history: 'Built by SpaceX from 2019 on the Texas Gulf coast near Boca Chica, Starbase is the design, build and launch site for the fully reusable Starship and Super Heavy launch system, incorporated as its own city in 2023.' },
    { id: 'vandenberg', name: 'VANDENBERG SFB', lat: 34.7420, lon: -120.5724, status: '🟢 Active', batch: 1, isMajor: true, accentColor: '#a78bfa', country: 'United States', tagline: 'WEST COAST POLAR LAUNCH HUB', established: '1958', operator: 'US Space Force', history: 'A US Space Force base on the California coast active since 1958, Vandenberg specializes in polar and sun-synchronous orbit launches for military, civil and commercial payloads, including frequent SpaceX Falcon 9 missions.' },
    { id: 'wallops', name: 'WALLOPS FLIGHT FACILITY', lat: 37.9402, lon: -75.4664, status: '🟢 Active', accentColor: '#2dd4bf', country: 'United States', tagline: 'NASA SOUNDING ROCKET & ANTARES SITE', established: '1945', operator: 'NASA', history: 'A NASA facility on Virginia’s Eastern Shore operating since 1945, Wallops supports sounding rockets, small orbital launch vehicles and Northrop Grumman Antares/Cygnus cargo missions to the ISS via the adjoining Mid-Atlantic Regional Spaceport.' },
    { id: 'mojave', name: 'MOJAVE AIR AND SPACE PORT', lat: 35.0594, lon: -118.1519, status: '🟢 Active', accentColor: '#f97316', country: 'United States', tagline: 'EXPERIMENTAL AEROSPACE FLIGHT TEST CENTER', established: '1935', operator: 'Mojave Air and Space Port', history: 'A former WWII airfield in the California desert, Mojave became the first FAA-licensed inland spaceport in 2004 and is a hub for experimental aerospace flight testing, including Scaled Composites and Virgin Galactic suborbital vehicles.' },
    { id: 'kwajalein', name: 'KWAJALEIN ATOLL', lat: 9.0470, lon: 167.7430, status: '🟢 Active', accentColor: '#22c55e', country: 'Marshall Islands', tagline: 'EQUATORIAL PACIFIC RANGE', established: '1960', operator: 'US Army / Rocket Lab', history: 'Home to the US Army’s Reagan Test Site, Kwajalein Atoll’s remote equatorial location in the Pacific has made it a missile-defense test range and, since 2006, a commercial orbital launch site used by Rocket Lab and formerly SpaceX’s earliest Falcon 1 flights.' },
    { id: 'kauai', name: 'PACIFIC MISSILE RANGE FACILITY', lat: 22.0586, lon: -159.7850, status: '🟢 Active', accentColor: '#0ea5e9', country: 'United States', tagline: 'HAWAIIAN ROCKET TEST RANGE', established: '1955', operator: 'US Navy', history: 'Operated by the US Navy on Kauai, Hawaii since the 1950s, the Pacific Missile Range Facility supports missile testing, sounding rockets and small orbital launch attempts including Astra’s early Rocket 3 flights.' },
    { id: 'kourou', name: 'GUIANA SPACE CENTRE', lat: 5.2360, lon: -52.7680, status: '🟢 Active', accentColor: '#facc15', country: 'French Guiana', tagline: 'EUROPE\'S SPACEPORT NEAR THE EQUATOR', established: '1968', operator: 'CNES / Arianespace / ESA', history: 'Established by France in 1968 and operated with ESA and Arianespace since the 1970s, the Guiana Space Centre’s near-equatorial location gives an efficient boost to geostationary launches of Ariane, Vega and Soyuz vehicles.' },
    { id: 'andoya', name: 'ANDOYA SPACEPORT', lat: 69.2947, lon: 16.0200, status: '🟢 Active', accentColor: '#38bdf8', country: 'Norway', tagline: 'ARCTIC ORBITAL SPACEPORT', established: '2023', operator: 'Andøya Space', history: 'Built on a long-running Norwegian sounding-rocket range above the Arctic Circle, Andøya Spaceport was inaugurated for orbital small-satellite launches in 2023, targeting polar and sun-synchronous orbits from mainland Europe.' },
    { id: 'esrange', name: 'ESRANGE SPACE CENTER', lat: 67.8930, lon: 21.1040, status: '🟢 Active', accentColor: '#60a5fa', country: 'Sweden', tagline: 'SWEDISH ARCTIC RESEARCH RANGE', established: '1966', operator: 'Swedish Space Corporation', history: 'Operating since 1966 near Kiruna, Sweden, Esrange has long launched sounding rockets and stratospheric balloons for European science, and is being expanded with an orbital launch pad for small satellite rockets.' },
    { id: 'saxa', name: 'SAXA VORD SPACEPORT', lat: 60.7490, lon: -0.7500, status: '🟡 Developing', accentColor: '#eab308', country: 'United Kingdom', tagline: 'SHETLAND ISLANDS VERTICAL LAUNCH SITE', established: '2018', operator: 'SaxaVord Spaceport Ltd', history: 'Built on a former RAF radar station on Unst in Scotland’s Shetland Islands, SaxaVord is being developed as the UK’s first vertical orbital launch spaceport, targeting polar-orbit small satellite missions.' },
    { id: 'sutherland', name: 'SUTHERLAND SPACEPORT', lat: 58.5090, lon: -4.4120, status: '🟡 Developing', accentColor: '#eab308', country: 'United Kingdom', tagline: 'SCOTTISH HIGHLANDS SPACEPORT', established: '2018', operator: 'Orbex / UK Space Agency', history: 'Planned on the A\'Mhoine peninsula in the Scottish Highlands, Sutherland Spaceport was granted UK Space Agency backing in the late 2010s to become a vertical launch site for small satellite rockets.' },
    { id: 'cornwall', name: 'SPACEPORT CORNWALL', lat: 50.4210, lon: -5.0270, status: '🟡 Limited/Inactive', accentColor: '#f59e0b', country: 'United Kingdom', tagline: 'HORIZONTAL AIR-LAUNCH SITE', established: '2022', operator: 'Spaceport Cornwall / Virgin Orbit', history: 'Based at Cornwall Airport Newquay, Spaceport Cornwall hosted the UK’s first orbital launch attempt in January 2023 via Virgin Orbit’s air-launched rocket, which failed to reach orbit; the site has seen limited activity since Virgin Orbit’s closure.' },
    { id: 'baikonur', name: 'BAIKONUR COSMODROME', lat: 45.9646, lon: 63.3052, status: '🟢 Active', batch: 1, isMajor: true, accentColor: '#ef4444', country: 'Kazakhstan', tagline: 'WORLD\'S FIRST & LARGEST SPACEPORT', established: '1955', operator: 'Roscosmos (leased from Kazakhstan)', history: 'Built by the Soviet Union in 1955, Baikonur Cosmodrome launched Sputnik 1 and Yuri Gagarin’s first crewed spaceflight, and remains the primary launch site for Russia’s Soyuz crew and cargo missions to the ISS under lease from Kazakhstan.' },
    { id: 'plesetsk', name: 'PLESETSK COSMODROME', lat: 62.9275, lon: 40.5750, status: '🟢 Active', accentColor: '#dc2626', country: 'Russia', tagline: 'RUSSIA\'S NORTHERN MILITARY SPACEPORT', established: '1957', operator: 'Russian Aerospace Forces', history: 'Established in 1957 in northern Russia, Plesetsk began as a military missile base and became a busy launch site for Soviet and Russian military and reconnaissance satellites, using Soyuz and Angara rockets.' },
    { id: 'vostochny', name: 'VOSTOCHNY COSMODROME', lat: 51.8840, lon: 128.3330, status: '🟢 Active', accentColor: '#f87171', country: 'Russia', tagline: 'RUSSIA\'S NEWEST CIVILIAN SPACEPORT', established: '2012', operator: 'Roscosmos', history: 'Constructed from 2012 in Russia’s Amur Oblast to reduce reliance on leased Baikonur, Vostochny Cosmodrome held its first launch in 2016 and now hosts Soyuz and the newer Angara rocket family.' },
    { id: 'kapustin', name: 'KAPUSTIN YAR', lat: 48.5720, lon: 45.8040, status: '🔴 Inactive for orbital launches', accentColor: '#71717a', country: 'Russia', tagline: 'EARLY SOVIET MISSILE TEST RANGE', established: '1946', operator: 'Russian Ministry of Defence', history: 'Founded in 1946 as the Soviet Union’s first rocket test range, Kapustin Yar conducted early ballistic missile tests and some satellite launches, but has not been used for orbital missions in decades.' },
    { id: 'yasny', name: 'YASNY COSMODROME', lat: 51.2030, lon: 59.8500, status: '🔴 Inactive', accentColor: '#71717a', country: 'Russia', tagline: 'CONVERTED ICBM SILO LAUNCH SITE', established: '2006', operator: 'ISC Kosmotras', history: 'Operated from a converted intercontinental ballistic missile silo at Dombarovsky air base, Yasny hosted commercial Dnepr rocket launches converting decommissioned missiles into satellite launchers until the program ended in the mid-2010s.' },
    { id: 'jiuquan', name: 'JIUQUAN SATELLITE LAUNCH CENTER', lat: 40.9606, lon: 100.2910, status: '🟢 Active', accentColor: '#f43f5e', country: 'China', tagline: 'CHINA\'S OLDEST CREWED SPACEPORT', established: '1958', operator: 'Chinese People\'s Liberation Army / CNSA', history: 'China’s first satellite launch center, established in 1958 in the Gobi Desert, Jiuquan has launched every Chinese crewed Shenzhou mission as well as numerous Long March satellite payloads.' },
    { id: 'xichang', name: 'XICHANG SATELLITE LAUNCH CENTER', lat: 28.2460, lon: 102.0270, status: '🟢 Active', accentColor: '#fb7185', country: 'China', tagline: 'CHINA\'S LUNAR & GEOSTATIONARY HUB', established: '1984', operator: 'CNSA', history: 'Operational since 1984 in Sichuan province, Xichang specializes in geostationary and lunar missions, including China’s Chang’e lunar probes and Beidou navigation satellites.' },
    { id: 'taiyuan', name: 'TAIYUAN SATELLITE LAUNCH CENTER', lat: 38.8490, lon: 111.6080, status: '🟢 Active', accentColor: '#e11d48', country: 'China', tagline: 'CHINA\'S POLAR ORBIT SPACEPORT', established: '1968', operator: 'CNSA', history: 'Active since the 1960s in Shanxi province, Taiyuan primarily launches Chinese meteorological, remote-sensing and polar-orbiting satellites aboard Long March rockets.' },
    { id: 'wenchang', name: 'WENCHANG SPACE LAUNCH SITE', lat: 19.6140, lon: 110.9510, status: '🟢 Active', accentColor: '#fda4af', country: 'China', tagline: 'CHINA\'S COASTAL HEAVY-LIFT SITE', established: '2016', operator: 'CNSA', history: 'Opened in 2016 on Hainan Island, Wenchang is China’s newest and southernmost spaceport, chosen for its coastal location and low latitude to support the heavy-lift Long March 5 and China’s space station and lunar programs.' },
    { id: 'korla', name: 'KORLA SPACE LAUNCH SITE', lat: 41.6100, lon: 88.9700, status: '🟢 Active', accentColor: '#f472b6', country: 'China', tagline: 'CHINESE COMMERCIAL LAUNCH SITE', established: '2020', operator: 'Commercial Chinese launch operators', history: 'A newer site in China’s Xinjiang region, Korla has emerged in the 2020s as a launch location for Chinese commercial small-satellite rockets, supplementing the country’s four main state spaceports.' },
    { id: 'tanegashima', name: 'TANEGASHIMA SPACE CENTER', lat: 30.4042, lon: 130.9702, status: '🟢 Active', accentColor: '#2dd4bf', country: 'Japan', tagline: 'JAPAN\'S PRIMARY SPACEPORT', established: '1969', operator: 'JAXA', history: 'JAXA’s main launch site since the 1960s on an island south of Kyushu, Tanegashima Space Center is renowned for its scenic coastal location and launches Japan’s H-II and H3 rockets.' },
    { id: 'uchinoura', name: 'UCHINOURA SPACE CENTER', lat: 31.2510, lon: 131.0820, status: '🟢 Active', accentColor: '#14b8a6', country: 'Japan', tagline: 'JAPAN\'S SOLID-FUEL & SCIENCE LAUNCH SITE', established: '1962', operator: 'JAXA', history: 'Japan’s original space launch site dating to 1962, Uchinoura now focuses on solid-fuel Epsilon rockets and scientific and asteroid-sampling missions such as Hayabusa.' },
    { id: 'sriharikota', name: 'SATISH DHAWAN SPACE CENTRE', lat: 13.7199, lon: 80.2304, status: '🟢 Active', batch: 1, isMajor: true, accentColor: '#ff9933', country: 'India', tagline: 'ISRO\'S PRIMARY SPACEPORT', established: '1971', operator: 'ISRO', history: 'ISRO’s main launch center since 1971 on Sriharikota Island, renamed for former ISRO chairman Satish Dhawan in 2002, it has launched every major Indian mission including Chandrayaan and Mangalyaan aboard PSLV and GSLV rockets.' },
    { id: 'kulasekarapattinam', name: 'KULASEKARAPATTINAM SPACEPORT', lat: 8.3670, lon: 78.0250, status: '🟡 Developing', accentColor: '#fbbf24', country: 'India', tagline: 'ISRO\'S UPCOMING SECOND SPACEPORT', established: '2024', operator: 'ISRO', history: 'Under construction in Tamil Nadu since the early 2020s, this new ISRO spaceport is designed to handle small-satellite launch vehicles and relieve pressure on Sriharikota.' },
    { id: 'thumba', name: 'THUMBA EQUATORIAL ROCKET LAUNCHING STATION', lat: 8.5360, lon: 76.8700, status: '🟢 Active', accentColor: '#fdba74', country: 'India', tagline: 'INDIA\'S FIRST ROCKET LAUNCH SITE', established: '1963', operator: 'ISRO', history: 'India’s first rocket range, established in 1963 near Thiruvananthapuram under Vikram Sarabhai, TERLS launched India’s earliest sounding rockets and continues supporting atmospheric research launches today.' },
    { id: 'chandipur', name: 'INTEGRATED TEST RANGE', lat: 21.3170, lon: 87.2950, status: '🟢 Active', accentColor: '#fb923c', country: 'India', tagline: 'INDIAN DEFENCE MISSILE TEST RANGE', established: '1989', operator: 'DRDO', history: 'Operated by India’s DRDO on the Odisha coast since the late 1980s, the Integrated Test Range at Chandipur is primarily used for testing Indian missile systems rather than orbital launches.' },
    { id: 'mahia', name: 'ROCKET LAB LAUNCH COMPLEX 1', lat: -39.2562, lon: 177.8647, status: '🟢 Active', accentColor: '#22d3ee', country: 'New Zealand', tagline: 'WORLD\'S FIRST PRIVATE ORBITAL SPACEPORT', established: '2016', operator: 'Rocket Lab', history: 'Opened by Rocket Lab in 2016 on the Māhia Peninsula, this was the world’s first private orbital launch site and has hosted the majority of Rocket Lab’s Electron small-satellite missions.' },
    { id: 'woomera', name: 'WOOMERA RANGE COMPLEX', lat: -31.1600, lon: 136.8050, status: '🟢 Active', accentColor: '#fb7185', country: 'Australia', tagline: 'HISTORIC ANGLO-AUSTRALIAN TEST RANGE', established: '1947', operator: 'Australian Department of Defence', history: 'Established in 1947 as a joint UK-Australian weapons and rocket test range, Woomera hosted early British satellite launches and remains one of the world’s largest land-based test ranges, used today for research and small rocket testing.' },
    { id: 'arnhem', name: 'ARNHEM SPACE CENTRE', lat: -12.3680, lon: 136.8140, status: '🟡 Developing', accentColor: '#fca5a5', country: 'Australia', tagline: 'NORTHERN TERRITORY EQUATORIAL SITE', established: '2022', operator: 'Equatorial Launch Australia', history: 'A commercial spaceport being developed on the Dhupuma Plateau in Australia’s Northern Territory, Arnhem Space Centre hosted small US-built suborbital rocket test launches in 2022 as it works toward orbital operations.' },
    { id: 'alcantara', name: 'ALCANTARA SPACE CENTER', lat: -2.3170, lon: -44.3690, status: '🟢 Active', accentColor: '#22c55e', country: 'Brazil', tagline: 'BRAZIL\'S EQUATORIAL SPACEPORT', established: '1983', operator: 'Brazilian Air Force', history: 'Operated by the Brazilian Air Force since 1983 near the equator, Alcântara offers a natural fuel-efficiency advantage for orbital launches and has recently opened to international commercial rocket operators.' },
    { id: 'barreira', name: 'BARREIRA DO INFERNO LAUNCH CENTER', lat: -5.9100, lon: -35.1630, status: '🟢 Active', accentColor: '#16a34a', country: 'Brazil', tagline: 'BRAZIL\'S FIRST LAUNCH SITE', established: '1965', operator: 'Brazilian Air Force', history: 'Brazil’s original rocket range, opened in 1965 near Natal with French assistance, Barreira do Inferno has long supported sounding rocket launches and continues limited research activity today.' },
    { id: 'semnan', name: 'SEMNAN SPACE CENTER', lat: 35.2340, lon: 53.9210, status: '🟢 Active', accentColor: '#4ade80', country: 'Iran', tagline: 'IRAN\'S PRIMARY SATELLITE LAUNCH SITE', established: '2009', operator: 'Iranian Space Agency', history: 'Iran’s main space launch facility since the 2000s, the Imam Khomeini Space Center at Semnan has launched the country’s Safir and Simorgh rockets carrying domestically built satellites.' },
    { id: 'imam', name: 'IMAM KHOMEINI SPACEPORT', lat: 35.2340, lon: 53.9210, status: '🟢 Active', accentColor: '#86efac', country: 'Iran', tagline: 'IRAN\'S NATIONAL SPACE CENTER', established: '2009', operator: 'Iranian Space Agency', history: 'Sharing the Semnan launch complex, the Imam Khomeini Space Center is Iran’s principal orbital launch facility, operational since the late 2000s for national satellite programs.' },
    { id: 'shahrud', name: 'SHAHRUD MISSILE TEST SITE', lat: 36.4180, lon: 55.0180, status: '🟢 Active', accentColor: '#65a30d', country: 'Iran', tagline: 'IRANIAN MISSILE & ROCKET TEST FACILITY', established: '2012', operator: 'Islamic Revolutionary Guard Corps', history: 'A missile development and test site in northeastern Iran, Shahrud has been used since the 2010s for testing rocket technology associated with Iran’s space and missile programs.' },
    { id: 'tongchangri', name: 'TONGCHANG-RI SOHAE SATELLITE LAUNCHING GROUND', lat: 39.6600, lon: 124.7060, status: '🟢 Active', accentColor: '#facc15', country: 'North Korea', tagline: 'NORTH KOREA\'S MAIN SPACEPORT', established: '2012', operator: 'National Aerospace Development Administration', history: 'Built in the 2000s on North Korea’s west coast, the Sohae Satellite Launching Station at Tongchang-ri is the country’s primary and most modern site for satellite launch attempts.' },
    { id: 'musudanri', name: 'MUSUDAN-RI LAUNCH SITE', lat: 40.8560, lon: 129.6660, status: '🔴 Inactive', accentColor: '#71717a', country: 'North Korea', tagline: 'NORTH KOREA\'S FORMER EAST COAST SITE', established: '1984', operator: 'Korean Committee of Space Technology', history: 'North Korea’s original launch site on its east coast, active from the 1990s through the 2000s for early satellite and missile launch attempts, Musudan-ri was largely superseded by the newer Sohae site.' },
    { id: 'sanmarco', name: 'SAN MARCO EQUATORIAL RANGE', lat: -2.9460, lon: 40.2120, status: '🔴 Inactive', accentColor: '#71717a', country: 'Kenya', tagline: 'ITALIAN OCEAN PLATFORM SPACEPORT', established: '1967', operator: 'Italian Space Agency (ASI)', history: 'An Italian-operated floating launch platform off the Kenyan coast active from 1967, the San Marco range launched Italian and NASA satellites and was the first spaceport to reach orbit outside the US or USSR, before being retired in the 1980s.' },
    { id: 'palmachim', name: 'PALMACHIM AIRBASE', lat: 31.8960, lon: 34.6900, status: '🟢 Active', accentColor: '#38bdf8', country: 'Israel', tagline: 'ISRAEL\'S RETROGRADE-ORBIT SPACEPORT', established: '1988', operator: 'Israeli Air Force / Israel Space Agency', history: 'An Israeli Air Force base on the Mediterranean coast, Palmachim has launched Israel’s Shavit rockets and Ofeq satellites westward against Earth’s rotation since 1988, a necessity dictated by the region’s geography.' },
    { id: 'white', name: 'WHITE SANDS MISSILE RANGE', lat: 32.9900, lon: -106.9750, status: '🟢 Active', accentColor: '#e5e7eb', country: 'United States', tagline: 'HISTORIC US ROCKET TEST RANGE', established: '1945', operator: 'US Army', history: 'The US Army’s primary rocket test range since 1945 in New Mexico, White Sands hosted the first V-2 and early American rocket tests and a Space Shuttle landing, and remains active for missile and rocket testing.' },
    { id: 'poker', name: 'POKER FLAT RESEARCH RANGE', lat: 65.1270, lon: -147.4350, status: '🟢 Active', accentColor: '#93c5fd', country: 'United States', tagline: 'WORLD\'S LARGEST LAND-BASED ROCKET RANGE', established: '1969', operator: 'University of Alaska Fairbanks', history: 'Operated by the University of Alaska Fairbanks since 1969, Poker Flat is the world’s largest land-based rocket range and studies the aurora and upper atmosphere using sounding rockets.' },
    { id: 'midland', name: 'MIDLAND INTERNATIONAL AIR AND SPACE PORT', lat: 31.9425, lon: -102.2019, status: '🟢 Active', accentColor: '#fdba74', country: 'United States', tagline: 'TEXAS HORIZONTAL SPACEPORT', established: '2014', operator: 'Midland International Air and Space Port', history: 'A commercial airport in West Texas licensed by the FAA as a spaceport in 2014, Midland supports horizontal-launch and reusable suborbital vehicle testing including early XCOR Aerospace operations.' },
    { id: 'kiruna', name: 'KIRUNA ROCKET RANGE', lat: 67.8558, lon: 20.2253, status: '🟢 Active', accentColor: '#7dd3fc', country: 'Sweden', tagline: 'ARCTIC SWEDISH LAUNCH RANGE', established: '1966', operator: 'Swedish Space Corporation', history: 'Part of the Esrange complex near Kiruna in Swedish Lapland, this Arctic range has supported European sounding rocket and balloon research since the 1960s.' },
    { id: 'nyalesund', name: 'NY-ALESUND ROCKET RANGE', lat: 78.9230, lon: 11.9230, status: '🟢 Active', accentColor: '#bae6fd', country: 'Norway', tagline: 'WORLD\'S NORTHERNMOST LAUNCH RANGE', established: '1997', operator: 'Norwegian / international research consortium', history: 'Located in the Svalbard archipelago far above the Arctic Circle, Ny-Ålesund is one of the northernmost rocket ranges on Earth, used for scientific sounding rocket launches studying the polar atmosphere and aurora.' }
  ];

  const majorLaunchpads = allLaunchpads.filter(p => p.isMajor);
  const currentBatchLaunchpads = majorLaunchpads.filter(p => p.batch === padBatchIndex);

  const padWeatherById = (padWeather || []).reduce((acc, w) => {
    acc[w.id] = w;
    return acc;
  }, {});

  const getStatusColor = (status) => {
    if (!status) return '#a1a1aa';
    if (status.includes('🟢')) return '#22c55e';
    if (status.includes('🟡')) return '#eab308';
    if (status.includes('🔴')) return '#ef4444';
    return '#a1a1aa';
  };

  // Best-effort match between a free-text launch pad location string (from the
  // external launches feed) and our internal launchpad directory, so real
  // weather telemetry can be attached to a launch.
  const STOPWORDS = new Set(['SPACE', 'CENTER', 'CENTRE', 'LAUNCH', 'LAUNCHING', 'SITE', 'RANGE', 'BASE', 'FACILITY', 'STATION', 'COMPLEX', 'PORT', 'SPACEPORT', 'FIELD', 'GROUND', 'AIRBASE', 'MISSILE', 'TEST', 'SATELLITE', 'COSMODROME', 'AIR', 'AND', 'THE', 'OF', 'INTERNATIONAL', 'FORCE', 'SFB', 'SFS']);

  const findPadForLocation = (locationText) => {
    if (!locationText) return null;
    const locTokens = new Set(locationText.toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 4 && !STOPWORDS.has(w)));
    if (locTokens.size === 0) return null;

    let bestPad = null;
    let bestScore = 0;
    for (const pad of allLaunchpads) {
      const padTokens = pad.name.split(/[^A-Z0-9]+/).filter(w => w.length >= 4 && !STOPWORDS.has(w));
      let score = 0;
      for (const token of padTokens) {
        if (locTokens.has(token)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestPad = pad;
      }
    }
    return bestScore > 0 ? bestPad : null;
  };

  const getWeatherForLaunch = (launch) => {
    const pad = findPadForLocation(launch?.pad_location);
    if (!pad) return null;
    return padWeatherById[pad.id] || null;
  };

  const handleOpenAllLaunchpads = () => {
    setIsTransitioningLaunchpads(true);
    setTimeout(() => {
      setIsTransitioningLaunchpads(false);
      setShowAllLaunchpadsPage(true);
    }, 3500);
  };

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setShowTelemetryDropdown(false);
    setShowDatabaseDropdown(false);
    setShowHamburgerMenu(false);
  };

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(bgTimer);
  }, [spaceBackgrounds.length]);

  // --- LIVE SPACE INTELLIGENCE STRIP DATA (self-contained, doesn't touch anything else) ---

  // Total tracked satellites, for the "LIVE SATELLITES" block.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { count, error } = await supabase
          .from('satellites')
          .select('*', { count: 'exact', head: true });
        if (!error && !cancelled) setLiveSatelliteCount(count || 0);
      } catch (error) {
        console.error('Live satellite count fetch error:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Live ISS lat/lon, for the "ISS LOCATION" block - same TLE feed and
  // propagation approach as the dedicated ISS Tracker page.
  useEffect(() => {
    let cancelled = false;
    let satrec = null;
    let tickTimer = null;

    const tick = async () => {
      if (!satrec || cancelled) return;
      try {
        const { propagate, gstime, eciToGeodetic, degreesLat, degreesLong } = await import('satellite.js');
        const pv = propagate(satrec, new Date());
        if (!pv.position) return;
        const gmst = gstime(new Date());
        const geo = eciToGeodetic(pv.position, gmst);
        if (!cancelled) {
          setIssLivePos({ lat: degreesLat(geo.latitude), lon: degreesLong(geo.longitude) });
        }
      } catch (error) {
        console.error('ISS live position error:', error);
      }
    };

    const acquire = async () => {
      try {
        const res = await fetch('/api/iss-tle', { cache: 'no-store' });
        if (!res.ok) throw new Error('ISS orbital feed unavailable');
        const data = await res.json();
        const { twoline2satrec } = await import('satellite.js');
        satrec = twoline2satrec(data.line1, data.line2);
        tick();
      } catch (error) {
        console.error('ISS TLE fetch error:', error);
      }
    };

    acquire();
    tickTimer = setInterval(tick, 5000);
    const refreshTimer = setInterval(acquire, 2 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(tickTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const batchTimer = setInterval(() => {
      if (!activeAgency) {
        setAgencyBatchIndex((prev) => (prev === 0 ? 1 : 0));
      }
    }, 12000);
    return () => clearInterval(batchTimer);
  }, [activeAgency]);

  useEffect(() => {
    const padBatchTimer = setInterval(() => {
      if (!activePad) {
        setPadBatchIndex((prev) => (prev === 0 ? 1 : 0));
      }
    }, 12000);
    return () => clearInterval(padBatchTimer);
  }, [activePad]);

  useEffect(() => {
    const autoEnterTimer = setTimeout(() => {
      setEntered(true);
    }, 3500); 
    return () => clearTimeout(autoEnterTimer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const currentBatchAgencies = allAgencies.filter(a => a.batch === agencyBatchIndex);

  // Split the single `launches` table feed into two buckets: launches that
  // haven't happened yet, and launches that have already flown (regardless
  // of whether the stored status text has been re-synced yet — a launch
  // whose NET date has already passed is always treated as past here).
  const upcomingLaunchList = (upcomingLaunches || [])
    .filter((launch) => !isLaunchPast(launch))
    .sort((a, b) => new Date(a.net) - new Date(b.net));

  const pastLaunchList = (upcomingLaunches || [])
    .filter((launch) => isLaunchPast(launch))
    .sort((a, b) => new Date(b.net) - new Date(a.net));

  const latestLaunches = upcomingLaunchList.slice(0, 9);
  const remainingLaunches = upcomingLaunchList.slice(9);

  const latestPastLaunches = pastLaunchList.slice(0, 9);
  const remainingPastLaunches = pastLaunchList.slice(9);

  const handleOpenExploreMore = () => {
    setIsTransitioningExplore(true);
    setTimeout(() => {
      setIsTransitioningExplore(false);
      setShowAllLaunchesPage(true);
    }, 3500); 
  };

  const handleOpenPastLaunchesExplore = () => {
    setIsTransitioningPastLaunches(true);
    setTimeout(() => {
      setIsTransitioningPastLaunches(false);
      setShowAllPastLaunchesPage(true);
    }, 3500);
  };


  const handleOpenAllAgencies = () => {
    setIsTransitioningAgencies(true);
    setTimeout(() => {
      setIsTransitioningAgencies(false);
      setShowAllAgenciesPage(true);
    }, 3500);
  };
  const handleOpenSatelliteWiki = () => {
    setIsTransitioningWiki(true);
    setTimeout(() => {
      setIsTransitioningWiki(false);
      setShowSatelliteWikiPage(true);
    }, 3500);
  };

  return (
    <div style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', fontFamily: '"Space Grotesk", -apple-system, sans-serif', position: 'relative', overflowX: 'hidden' }}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&display=swap');

        html {
          scroll-behavior: smooth;
        }

        .space-bg-layer {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-size: cover;
          background-position: center;
          z-index: 0;
          transition: opacity 1.8s ease-in-out;
          filter: brightness(0.4) contrast(1.25);
        }

        .dark-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%),
                      linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%);
          z-index: 1;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(15, 15, 15, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .content-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          box-sizing: border-box;
          width: 100%;
        }

        .nav-link {
          background: none;
          border: none;
          color: #94a3b8;
          font-family: inherit;
          font-size: 0.75rem;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.3s ease;
          padding: 0;
        }

        .nav-link:hover {
          color: #ffffff;
        }

        .brand-link {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .agency-column {
          position: relative;
          height: 480px;
          border-right: 1px solid rgba(255, 255, 255, 0.12);
          overflow: hidden;
          cursor: pointer;
          transition: flex 0.5s cubic-bezier(0.16, 1, 0.3, 1), padding 0.5s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.5rem 2rem;
          box-sizing: border-box;
          background: #0b0b0b;
        }

        .agency-column:last-child {
          border-right: none;
        }

        .agency-video-bg {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          transform: translate(-50%, -50%);
          object-fit: cover;
          pointer-events: none;
          z-index: 1;
          filter: brightness(0.7);
        }

        .agency-content-layer {
          position: relative;
          z-index: 4;
        }

        .agency-text-shield {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 2;
          pointer-events: none;
        }

        .explore-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 2rem;
          width: 100%;
          padding: 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-family: inherit;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 4px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .explore-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: #ffffff;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.15);
        }
      `}</style>

      {/* BACKGROUND SLIDESHOW */}
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={bgUrl}
          className="space-bg-layer"
          style={{
            backgroundImage: `url('${bgUrl}')`,
            opacity: bgIndex === idx ? 1 : 0
          }}
        />
      ))}
      <div className="dark-overlay" />

      {/* STARFIELD CANVAS */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      {/* HEADER */}
      <motion.header 
        initial={{ opacity: 0 }}
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          pointerEvents: entered ? 'auto' : 'none'
        }}
      >
        <div className="content-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px' }}>
            {entered && (
              <button className="brand-link" onClick={() => scrollToSection('hero')}>
                <motion.span
                  layoutId="spacetec-brand"
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
                >
                  SPACETEC
                </motion.span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', position: 'relative' }}>
            
            {/* Live Telemetry Dropdown Menu */}
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-link" 
                onClick={() => {
                  setShowTelemetryDropdown(!showTelemetryDropdown);
                  setShowDatabaseDropdown(false);
                  setShowHamburgerMenu(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Live Telemetry <span>▾</span>
              </button>

              {showTelemetryDropdown && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    left: 0,
                    width: '240px',
                    padding: '0.8rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 200,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <button 
                    onClick={() => {
                      setShowTelemetryDropdown(false);
                      setGlobeViewMode((current) => ({ mode: 'satellites', requestId: current.requestId + 1 }));
                      scrollToSection('orbital-map');
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Live Satellite Tracking
                  </button>
                  <button 
                    onClick={() => {
                      setShowTelemetryDropdown(false);
                      scrollToSection('orbital-map');
                    }} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Launchpad Location
                  </button>
                </div>
              )}
            </div>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button className="nav-link" onClick={() => scrollToSection('agencies')}>
              Agencies
            </button>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            <button className="nav-link" onClick={() => scrollToSection('launchpads')}>
              Launchpads
            </button>
            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
            
           {/* ISS Tracker */}
<button
  className="nav-link"
  onClick={() => {
    window.location.href = '/iss-tracker';
  }}
>
  ISS Tracker
</button>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Database Dropdown Menu */}
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-link" 
                onClick={() => {
                  setShowDatabaseDropdown(!showDatabaseDropdown);
                  setShowTelemetryDropdown(false);
                  setShowHamburgerMenu(false);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                Database <span>▾</span>
              </button>

              {showDatabaseDropdown && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    left: 0,
                    width: '240px',
                    padding: '0.8rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 200,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      handleOpenSatelliteWiki();
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Satellite Database
                  </button>
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      window.location.href = '/rocket-database';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Rocket Database
                  </button>
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      window.location.href = '/celestial-database';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Celestial Database
                  </button>
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      window.location.href = '/mission-database';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Mission Database
                  </button>
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      window.location.href = '/astronaut-database';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Astronaut Database
                  </button>
                  <button 
                    onClick={() => {
                      setShowDatabaseDropdown(false);
                      scrollToSection('launches');
                    }} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Launch Database
                  </button>
                </div>
              )}
            </div>

            <span style={{ width: '1px', height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Hamburger Menu - remaining secondary features */}
            <div style={{ position: 'relative' }}>
              <button 
                className="nav-link" 
                onClick={() => {
                  setShowHamburgerMenu(!showHamburgerMenu);
                  setShowTelemetryDropdown(false);
                  setShowDatabaseDropdown(false);
                }}
                style={{ fontSize: '1.1rem', letterSpacing: '1px' }}
              >
                ☰
              </button>

              {showHamburgerMenu && (
                <div 
                  className="glass-card" 
                  style={{
                    position: 'absolute',
                    top: '2.5rem',
                    right: 0,
                    width: '220px',
                    padding: '0.8rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 200,
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <div 
                    style={{ color: '#fff', padding: '0.6rem 1rem', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '700', cursor: 'default', borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Shortcuts & Features
                  </div>
                  <button 
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      handleOpenAllLaunchpads();
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Launchpad Directory
                  </button>
                  <button 
                    onClick={() => alert('Space Encyclopedia feature coming soon!')} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Space Encyclopedia
                  </button>
                  <button 
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      window.location.href = '/space-weather';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Space Weather
                  </button>
                  <button 
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      window.location.href = '/astronomy-tonight';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Astronomy Tonight
                  </button>
                  <button 
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      window.location.href = '/space-news';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Space News
                  </button>
                  <button 
                    onClick={() => {
                      setShowHamburgerMenu(false);
                      window.location.href = '/space-statistics';
                    }} 
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Space Statistics
                  </button>
                  <button 
                    onClick={() => alert('About SpaceTec feature coming soon!')} 
                    style={{ background: 'none', border: 'none', color: '#d4d4d8', padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.7rem', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: '600' }}
                  >
                    About SpaceTec
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </motion.header>

      {/* INTRO SCREEN (3.5 SECONDS) */}
      <AnimatePresence>
        {!entered && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}
          >
            <div style={{ textAlign: 'center' }}>
              <motion.div
                layoutId="spacetec-brand"
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                initial={{ opacity: 0, scale: 0.9, letterSpacing: '0.12em' }}
                animate={{ opacity: 1, scale: 1, letterSpacing: '0.22em' }}
              >
                <h1 style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff' }}>
                  SPACETEC
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{ fontSize: 'calc(0.7rem + 0.3vw)', letterSpacing: '12px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '500' }}
              >
                UNIFIED COSMIC INTELLIGENCE
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXPLORE MORE TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningExplore && (
          <motion.div
            key="explore-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`trans-bg-${idx}`}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  backgroundImage: `url('${bgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  opacity: bgIndex === idx ? 1 : 0,
                  transition: 'opacity 1.8s ease-in-out',
                  filter: 'brightness(0.4) contrast(1.25)',
                  pointerEvents: 'none'
                }}
              />
            ))}
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                LOADING ARCHIVED MANIFEST...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAST LAUNCHES ARCHIVE TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningPastLaunches && (
          <motion.div key="past-launches-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: '2rem' }}>
            {spaceBackgrounds.map((bgUrl, idx) => <div key={`past-trans-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIndex === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>LOADING GLOBAL LAUNCH ARCHIVE...</motion.p></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AGENCIES DIRECTORY TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningAgencies && (
          <motion.div key="agencies-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: '2rem' }}>
            {spaceBackgrounds.map((bgUrl, idx) => <div key={`agencies-trans-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIndex === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>LOADING GLOBAL AGENCY DIRECTORY...</motion.p></div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* LAUNCHPAD DIRECTORY TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningLaunchpads && (
          <motion.div key="launchpads-transition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000', padding: '2rem' }}>
            {spaceBackgrounds.map((bgUrl, idx) => <div key={`launchpads-trans-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIndex === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>LOADING GLOBAL LAUNCHPAD DIRECTORY...</motion.p></div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* SATELLITE WIKI TRANSITION SCREEN */}
      <AnimatePresence>
        {isTransitioningWiki && (
          <motion.div
            key="wiki-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`wiki-trans-bg-${idx}`}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  backgroundImage: `url('${bgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  opacity: bgIndex === idx ? 1 : 0,
                  transition: 'opacity 1.8s ease-in-out',
                  filter: 'brightness(0.4) contrast(1.25)',
                  pointerEvents: 'none'
                }}
              />
            ))}
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                LOADING SATELLITE DATABASE...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN DASHBOARD */}
      <motion.div 
        animate={{ opacity: entered ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ position: 'relative', zIndex: 3, paddingTop: '8rem', pointerEvents: entered ? 'auto' : 'none' }}
      >
        
        {/* HERO SECTION */}
        <section id="hero" className="content-container" style={{ paddingBottom: '4rem', scrollMarginTop: '8rem' }}>
          <motion.div initial="hidden" animate={entered ? "visible" : "hidden"} variants={staggerContainer} style={{ maxWidth: '850px' }}>
            <motion.p variants={fadeInUp} style={{ fontSize: '0.75rem', letterSpacing: '6px', textTransform: 'uppercase', color: '#a1a1aa', marginBottom: '1.5rem', fontWeight: '600' }}>
              // MULTI-AGENCY DEEP SPACE NETWORK
            </motion.p>
            
            <motion.h2 variants={fadeInUp} style={{ fontSize: 'calc(2.2rem + 3vw)', fontWeight: '900', lineHeight: '1.1', letterSpacing: '1px', margin: '0 0 1.8rem 0', textTransform: 'uppercase', color: '#ffffff' }}>
              THE UNIVERSE,
              <br />
              <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', minWidth: '100%' }}>
                {/* Invisible reference phrase reserves space for the longest rotating phrase so the layout never shifts */}
                <span style={{ visibility: 'hidden' }}>IN REAL TIME.</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={HERO_ROTATING_PHRASES[heroPhraseIndex]}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap', color: '#ffffff' }}
                  >
                    {HERO_ROTATING_PHRASES[heroPhraseIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h2>

            <motion.p variants={fadeInUp} style={{ fontSize: '1.05rem', color: '#d4d4d8', lineHeight: '1.7', maxWidth: '680px', marginBottom: '2.5rem', fontWeight: '400' }}>
              Real-time trajectory tracking, global rocket launch manifests, and deep space observations aggregated directly from global aerospace networks.
            </motion.p>
          </motion.div>
        </section>

        {/* GLOBAL SEARCH */}
        <section id="global-search" className="content-container" style={{ paddingBottom: '5rem' }}>
          <GlobalSearch
            agencies={agencyDirectory}
            launchpads={allLaunchpads}
            onOpenAgencies={handleOpenAllAgencies}
            onOpenLaunchpads={handleOpenAllLaunchpads}
            onOpenSatelliteWiki={handleOpenSatelliteWiki}
          />
        </section>

        {/* LIVE SPACE INTELLIGENCE */}
        <section id="telemetry" className="content-container" style={{ paddingBottom: '5rem', scrollMarginTop: '8rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '1rem' }}>
            // LIVE SPACE INTELLIGENCE
          </span>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="glass-card" 
            style={{ padding: '2rem 2.5rem', borderRadius: '2px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '2rem' }}
          >
            {(() => {
              const nextLaunch = upcomingLaunches?.[0] || null;
              const nextLaunchWeather = nextLaunch ? getWeatherForLaunch(nextLaunch) : null;

              return [
                { label: 'LIVE SATELLITES', val: liveSatelliteCount != null ? `${liveSatelliteCount.toLocaleString()} TRACKED` : 'SYNCING...' },
                { label: 'ACTIVE LAUNCHPADS', val: `${allLaunchpads.length} WORLDWIDE` },
                { label: 'ISS LOCATION', val: issLivePos ? `${issLivePos.lat.toFixed(1)}°, ${issLivePos.lon.toFixed(1)}°` : 'ACQUIRING...' },
                { label: 'SPACE WEATHER', val: nextLaunchWeather?.condition || nextLaunchWeather?.wind_speed || 'SYNCING...' },
                { label: 'UPCOMING LAUNCHES', val: `${upcomingLaunches?.length ?? 0} SCHEDULED` }
              ];
            })().map((stat, idx) => (
              <div key={idx} style={{ overflow: 'hidden', borderLeft: idx === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.12)', paddingLeft: idx === 0 ? 0 : '1.5rem' }}>
                <span style={{ fontSize: '0.65rem', color: '#71717a', letterSpacing: '2px', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: '700', letterSpacing: '1px', color: '#ffffff', textTransform: 'uppercase', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stat.val}
                </span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* FEATURED OBSERVATION */}
        {apodData && (
          <section className="content-container" style={{ paddingBottom: '5rem' }}>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="glass-card" 
              style={{ padding: '3rem', borderRadius: '2px' }}
            >
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // TODAY'S FEATURED DEEP SPACE OBSERVATION
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '1rem 0 1.2rem 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                {apodData.title}
              </h2>
              <p style={{ color: '#a1a1aa', lineHeight: '1.8', maxWidth: '900px', fontSize: '0.95rem', margin: 0, fontWeight: '300' }}>
                {apodData.explanation}
              </p>
            </motion.div>
          </section>
        )}

        {/* AGENCIES SECTION */}
        <section id="agencies" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.0rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // GLOBAL AEROSPACE ARCHITECTURE
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                EXPLORE SPACE AGENCIES ACROSS THE GLOBE
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                {activeAgency ? 'ROTATION PAUSED' : `BATCH ${agencyBatchIndex + 1} / 2`}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={agencyBatchIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="glass-card" 
              style={{ display: 'flex', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {currentBatchAgencies.map((agency, index) => {
                const isHovered = activeAgency === agency.id;
                let flexValue = 1;
                if (activeAgency !== null) {
                  flexValue = isHovered ? 12 : 0;
                }

                return (
                  <div
                    key={agency.id}
                    className="agency-column"
                    style={{ 
                      flex: flexValue, 
                      padding: isHovered ? '3rem 3.5rem' : '2.5rem 2rem'
                    }}
                    onMouseEnter={() => setActiveAgency(agency.id)}
                    onMouseLeave={() => setActiveAgency(null)}
                  >
                    {!isHovered && (
                      <video
                        className="agency-video-bg"
                        src={agency.videoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    )}

                    {isHovered && (
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 1,
                          width: '100%',
                          height: '100%'
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                          <Image
                            src={agency.hqImage}
                            alt={agency.name}
                            fill
                            style={{ objectFit: 'cover', opacity: 0.85 }}
                            unoptimized
                          />
                        </div>
                      </div>
                    )}

                    <div className="agency-text-shield" />

                    <div className="agency-content-layer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: isHovered ? agency.accentColor : '#a1a1aa', fontWeight: '800', transition: 'color 0.3s ease' }}>
                        // 0{agencyBatchIndex * 3 + index + 1}
                      </span>
                      {isHovered && (
                        <motion.span 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#ffffff', background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.8rem', border: `1px solid ${agency.accentColor}`, fontWeight: '700' }}
                        >
                          {agency.logoText}
                        </motion.span>
                      )}
                    </div>

                    <div className="agency-content-layer" style={{ 
                      transform: isHovered ? 'translateY(-14px)' : 'translateY(0px)', 
                      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }}>
                      <h3 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '3px', margin: '0 0 0.5rem 0', color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {agency.name}
                      </h3>
                      
                      <p style={{ fontSize: '0.7rem', letterSpacing: '2px', color: agency.accentColor, textTransform: 'uppercase', margin: '0 0 1rem 0', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {agency.tagline}
                      </p>

                      <p style={{ fontSize: '0.85rem', color: '#d4d4d8', lineHeight: '1.6', margin: 0, opacity: isHovered ? 1 : 0.6, transition: 'opacity 0.3s ease', display: isHovered || activeAgency === null ? 'block' : 'none' }}>
                        {agency.specialty}
                      </p>

                      {isHovered && (
                        <motion.p 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          style={{ fontSize: '0.8rem', color: '#a1a1aa', lineHeight: '1.6', margin: '1rem 0 0 0', maxWidth: '540px', borderLeft: `2px solid ${agency.accentColor}`, paddingLeft: '1rem' }}
                        >
                          {agency.brief}
                        </motion.p>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          <button 
            className="explore-btn"
            onClick={handleOpenAllAgencies}
          >
            <span>Explore More Space Agencies</span>
            <span>→</span>
          </button>
        </section>

        {/* LAUNCHPADS SECTION */}
        <section id="launchpads" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.0rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // GLOBAL GROUND INFRASTRUCTURE
              </span>
              <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                EXPLORE LAUNCHPADS ACROSS THE GLOBE
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                {activePad ? 'ROTATION PAUSED' : `BATCH ${padBatchIndex + 1} / 2`}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div 
              key={padBatchIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5 }}
              className="glass-card" 
              style={{ display: 'flex', borderRadius: '2px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              {currentBatchLaunchpads.map((pad, index) => {
                const isHovered = activePad === pad.id;
                let flexValue = 1;
                if (activePad !== null) {
                  flexValue = isHovered ? 12 : 0;
                }
                const liveWeather = padWeatherById[pad.id];

                return (
                  <div
                    key={pad.id}
                    className="agency-column"
                    style={{ 
                      flex: flexValue, 
                      padding: isHovered ? '3rem 3.5rem' : '2.5rem 2rem',
                      background: `linear-gradient(160deg, ${pad.accentColor}22 0%, #0b0b0b 70%)`
                    }}
                    onMouseEnter={() => setActivePad(pad.id)}
                    onMouseLeave={() => setActivePad(null)}
                  >
                    <div className="agency-text-shield" />

                    <div className="agency-content-layer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: isHovered ? pad.accentColor : '#a1a1aa', fontWeight: '800', transition: 'color 0.3s ease' }}>
                        // 0{padBatchIndex * 3 + index + 1}
                      </span>
                      <span 
                        style={{ fontSize: '0.65rem', letterSpacing: '2px', color: getStatusColor(pad.status), background: 'rgba(0,0,0,0.6)', padding: '0.3rem 0.8rem', border: `1px solid ${getStatusColor(pad.status)}`, fontWeight: '700' }}
                      >
                        {pad.status}
                      </span>
                    </div>

                    <div className="agency-content-layer" style={{ 
                      transform: isHovered ? 'translateY(-14px)' : 'translateY(0px)', 
                      transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }}>
                      <h3 style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '2px', margin: '0 0 0.5rem 0', color: '#ffffff', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pad.name}
                      </h3>
                      
                      <p style={{ fontSize: '0.7rem', letterSpacing: '2px', color: pad.accentColor, textTransform: 'uppercase', margin: '0 0 1rem 0', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pad.tagline}
                      </p>

                      <p style={{ fontSize: '0.85rem', color: '#d4d4d8', lineHeight: '1.6', margin: 0, opacity: isHovered ? 1 : 0.6, transition: 'opacity 0.3s ease', display: isHovered || activePad === null ? 'block' : 'none' }}>
                        {pad.country} // {pad.lat.toFixed(2)}, {pad.lon.toFixed(2)}
                      </p>

                      {isHovered && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          style={{ marginTop: '1rem', maxWidth: '540px', borderLeft: `2px solid ${pad.accentColor}`, paddingLeft: '1rem' }}
                        >
                          <p style={{ fontSize: '0.8rem', color: '#a1a1aa', lineHeight: '1.6', margin: '0 0 0.8rem 0' }}>
                            {pad.history}
                          </p>
                          {liveWeather ? (
                            <p style={{ fontSize: '0.7rem', color: '#e2e8f0', letterSpacing: '1px', margin: 0, fontWeight: '700' }}>
                              🌡 {liveWeather.temperature} &nbsp; 💧 {liveWeather.humidity} &nbsp; 💨 {liveWeather.wind_speed}
                            </p>
                          ) : (
                            <p style={{ fontSize: '0.7rem', color: '#71717a', letterSpacing: '1px', margin: 0, fontWeight: '700', textTransform: 'uppercase' }}>
                              Awaiting live telemetry sync...
                            </p>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>

          <button 
            className="explore-btn"
            onClick={handleOpenAllLaunchpads}
          >
            <span>Explore More Launchpads</span>
            <span>→</span>
          </button>
        </section>

        {/* ORBITAL MAP / LAUNCH PAD TELEMETRY SECTION */}
        <section id="orbital-map" className="content-container" style={{ paddingBottom: '6rem', scrollMarginTop: '8rem' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
              // GLOBAL ORBITAL INTELLIGENCE & LIVE TRACKING
            </span>
            <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
              GLOBAL ORBITAL OPERATIONS CENTER
            </h2>
          </div>

          <div style={{ background: '#000000', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
            <OrbitalGlobe requestedView={globeViewMode} launchpads={allLaunchpads} />
          </div>
        </section>

        {/* UPCOMING LAUNCHES */}
        <section id="launches" className="content-container" style={{ paddingBottom: '8rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // ORBITAL MANIFEST
              </span>
              <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                UPCOMING GLOBAL LAUNCHES
              </h2>
            </div>
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {latestLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                layoutId={`launch-card-${launch.id}`}
                variants={fadeInUp}
                whileHover={{ y: -6, borderColor: '#ffffff' }}
                onClick={() => setExpandedLaunch(launch)}
                className="glass-card" 
                style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                      {launch.provider || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.2rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.80rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                    NET: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    PAD: {launch.pad_location || 'Vandenberg Space Force Base'}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {remainingLaunches.length > 0 && (
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button 
                className="explore-btn" 
                onClick={handleOpenExploreMore}
                style={{ maxWidth: '400px', margin: '0 auto' }}
              >
                <span>Explore More Launches ({remainingLaunches.length} More)</span>
                <span>→</span>
              </button>
            </div>
          )}
        </section>

        {/* PAST LAUNCHES */}
        <section id="past-launches" className="content-container" style={{ paddingBottom: '8rem', scrollMarginTop: '8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                // MISSION ARCHIVE
              </span>
              <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>
                PAST GLOBAL LAUNCHES
              </h2>
            </div>
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {latestPastLaunches.map((launch) => (
              <motion.div 
                key={launch.id} 
                layoutId={`launch-card-${launch.id}`}
                variants={fadeInUp}
                whileHover={{ y: -6, borderColor: '#ffffff' }}
                onClick={() => setExpandedLaunch(launch)}
                className="glass-card" 
                style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                      {launch.provider || 'AGENCY'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: getLaunchStatusColor(launch.status), letterSpacing: '1px', fontWeight: '700', textAlign: 'right' }}>● {(launch.status || 'STATUS UNKNOWN').toUpperCase()}</span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.2rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                    {launch.name}
                  </h3>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.80rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                    LAUNCHED: {new Date(launch.net).toUTCString().slice(0, 16)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#2dd4bf', fontWeight: '700', letterSpacing: '1px' }}>
                    {formatTimeAgo(launch.net)}
                  </p>
                </div>
              </motion.div>
            ))}
            {latestPastLaunches.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#71717a', border: '1px dashed rgba(255,255,255,0.15)' }}>
                No completed launches synced yet. Check back after the next manifest sync.
              </div>
            )}
          </motion.div>

          {remainingPastLaunches.length > 0 && (
            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
              <button 
                className="explore-btn" 
                onClick={handleOpenPastLaunchesExplore}
                style={{ maxWidth: '420px', margin: '0 auto' }}
              >
                <span>Explore More Past Launches ({remainingPastLaunches.length} More)</span>
                <span>→</span>
              </button>
            </div>
          )}
        </section>

      </motion.div>

      {/* EXPLORE MORE LAUNCHES FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllLaunchesPage && (
          <AllLaunchesPage 
            launches={remainingLaunches} 
            mode="upcoming"
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllLaunchesPage(false)}
            onSelectLaunch={(launch) => setExpandedLaunch(launch)}
          />
        )}
      </AnimatePresence>

      {/* EXPLORE MORE PAST LAUNCHES FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllPastLaunchesPage && (
          <AllLaunchesPage 
            launches={remainingPastLaunches} 
            mode="past"
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllPastLaunchesPage(false)}
            onSelectLaunch={(launch) => setExpandedLaunch(launch)}
          />
        )}
      </AnimatePresence>

      {/* SATELLITE WIKI FULL PAGE VIEW */}
      <AnimatePresence>
        {showSatelliteWikiPage && (
          <SatelliteWikiPage 
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowSatelliteWikiPage(false)}
          />
        )}
      </AnimatePresence>
      {/* ALL AGENCIES FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllAgenciesPage && (
          <AllAgenciesPage 
            agencies={agencyDirectory}
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllAgenciesPage(false)}
          />
        )}
      </AnimatePresence>

      {/* ALL LAUNCHPADS FULL PAGE VIEW */}
      <AnimatePresence>
        {showAllLaunchpadsPage && (
          <AllLaunchpadsPage 
            launchpads={allLaunchpads}
            weatherById={padWeatherById}
            getStatusColor={getStatusColor}
            spaceBackgrounds={spaceBackgrounds}
            onClose={() => setShowAllLaunchpadsPage(false)}
          />
        )}
      </AnimatePresence>

      {/* EXPANDED MODAL CONTAINER */}
      <AnimatePresence>
        {expandedLaunch && (
          <LaunchCountdownModal 
            launch={expandedLaunch} 
            weather={getWeatherForLaunch(expandedLaunch)}
            onClose={() => setExpandedLaunch(null)} 
            spaceBackgrounds={spaceBackgrounds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SatelliteWikiPage({ spaceBackgrounds, onClose }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [satellites, setSatellites] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef(null);
  const pageSize = 50;
  const maxPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const fetchSatelliteCatalog = async () => {
      setIsLoading(true);
      try {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        let query = supabase
          .from('satellites')
          .select('*', { count: 'exact' });

        const trimmedSearch = search.trim();
        if (trimmedSearch) {
          query = !isNaN(trimmedSearch)
            ? query.or(`name.ilike.%${trimmedSearch}%,id.eq.${trimmedSearch}`)
            : query.ilike('name', `%${trimmedSearch}%`);
        }

        const { data, count, error } = await query
          .order('id', { ascending: true })
          .range(from, to);
        if (error) throw error;

        setSatellites(data || []);
        setTotalCount(count || 0);
      } catch (error) {
        console.error('Satellite database fetch error:', error);
        setSatellites([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchSatelliteCatalog, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  const handleBackToMainWithTransition = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000000', zIndex: 99998, overflowY: 'auto', padding: '4rem 2rem', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div key={`wiki-page-bg-${idx}`} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />
      ))}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)', zIndex: 1, pointerEvents: 'none' }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}>SPACETEC</motion.span>
          <button onClick={handleBackToMainWithTransition} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>[← BACK TO MAIN]</button>
        </div>

        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>// SATELLITE DATABASE</span>
          <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>GLOBAL SATELLITE DATABASE</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>TOTAL MATCHES: {totalCount.toLocaleString()}</span>
          <input type="text" placeholder="Search by name or NORAD ID..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '0.7rem 1rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', width: 'min(100%, 320px)', outline: 'none' }} />
        </div>

        <div className="glass-card" style={{ overflowX: 'auto', marginBottom: '1rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', color: '#38bdf8', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}><th style={{ padding: '1rem' }}>NORAD ID</th><th style={{ padding: '1rem' }}>Object Name</th><th style={{ padding: '1rem' }}>Organization</th><th style={{ padding: '1rem' }}>Status</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="4" style={{ padding: '2rem 1rem', color: '#38bdf8', textAlign: 'center' }}>QUERYING SATELLITE DATABASE...</td></tr> : satellites.length === 0 ? <tr><td colSpan="4" style={{ padding: '2rem 1rem', color: '#d4d4d8', textAlign: 'center' }}>NO SATELLITES FOUND</td></tr> : satellites.map((satellite) => <tr key={satellite.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#d4d4d8' }}><td style={{ padding: '1.2rem 1rem', color: '#2dd4bf', fontWeight: '700' }}>{satellite.id}</td><td style={{ padding: '1.2rem 1rem', fontWeight: '700', color: '#fff' }}>{satellite.name || 'UNKNOWN'}</td><td style={{ padding: '1.2rem 1rem' }}>{satellite.organization || 'Independent / International'}</td><td style={{ padding: '1.2rem 1rem', color: '#22c55e', fontWeight: '700' }}>ACTIVE</td></tr>)}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '4rem', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#d4d4d8', letterSpacing: '1px' }}>PAGE {page + 1} OF {maxPages}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button disabled={page === 0} onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))} style={{ padding: '0.7rem 1rem', background: page === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: page === 0 ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page === 0 ? 'not-allowed' : 'pointer' }}>PREV PAGE</button>
            <button disabled={page + 1 >= maxPages} onClick={() => setPage((currentPage) => currentPage + 1)} style={{ padding: '0.7rem 1rem', background: page + 1 >= maxPages ? 'rgba(255,255,255,0.02)' : 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: page + 1 >= maxPages ? '#52525b' : '#ffffff', fontSize: '0.7rem', cursor: page + 1 >= maxPages ? 'not-allowed' : 'pointer' }}>NEXT PAGE</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isReturningMain && <motion.div key="returning-main-wiki" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}><div style={{ textAlign: 'center' }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p></div></motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}
function AllAgenciesPage({ agencies, spaceBackgrounds, onClose }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [expandedAgency, setExpandedAgency] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setBgIdx((current) => (current + 1) % spaceBackgrounds.length), 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  const handleBackToMain = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }} style={{ position: 'fixed', inset: 0, zIndex: 99998, overflowY: 'auto', backgroundColor: '#000000', padding: '4rem 2rem', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
      {spaceBackgrounds.map((bgUrl, idx) => <div key={`all-agencies-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}><motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase' }}>SPACETEC</motion.span><button onClick={handleBackToMain} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>[← BACK TO MAIN]</button></div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2rem', marginBottom: '2.5rem' }}><span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>// GLOBAL SPACE AGENCY DIRECTORY</span><h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>EXPLORE SPACE AGENCIES</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {agencies.map((agency, index) => <motion.article key={agency.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} onClick={() => setExpandedAgency(agency)} style={{ cursor: 'pointer', minHeight: '310px', position: 'relative', overflow: 'hidden', border: `1px solid ${agency.accentColor}66`, backgroundColor: 'rgba(0,0,0,0.72)', padding: '2rem', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: agency.hqImage ? "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.92) 100%), url('" + agency.hqImage + "')" : 'linear-gradient(135deg, rgba(2,6,23,0.96), rgba(0,0,0,0.98))', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.72 }} />
            <div style={{ position: 'relative', zIndex: 1 }}><span style={{ color: agency.accentColor, fontSize: '0.65rem', letterSpacing: '2px', fontWeight: '800' }}>// {String(index + 1).padStart(2, '0')}</span><h3 style={{ color: '#fff', margin: '0.7rem 0', fontSize: '1.6rem', letterSpacing: '2px' }}>{agency.name}</h3><p style={{ color: agency.accentColor, margin: '0 0 0.8rem', fontSize: '0.72rem', letterSpacing: '1.4px', fontWeight: '700' }}>{agency.tagline}</p><p style={{ color: '#d4d4d8', margin: 0, lineHeight: '1.6', fontSize: '0.83rem' }}>{agency.brief}</p></div>
          </motion.article>)}
        </div>        <AnimatePresence>
          {expandedAgency && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedAgency(null)} style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.86)' }}><motion.article initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} onClick={(event) => event.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#050505', border: `1px solid ${expandedAgency.accentColor || '#38bdf8'}`, padding: '2rem', boxSizing: 'border-box' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}><div><span style={{ color: expandedAgency.accentColor || '#38bdf8', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '800' }}>// {expandedAgency.category || 'SPACE ORGANIZATION'}</span><h2 style={{ margin: '0.5rem 0 0', color: '#fff', fontSize: '2rem', letterSpacing: '1px' }}>{expandedAgency.name}</h2></div><button onClick={() => setExpandedAgency(null)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 0.7rem', cursor: 'pointer' }}>CLOSE</button></div><div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>01 / HEADQUARTERS</p><p style={{ color: '#fff', margin: '0.4rem 0 0' }}>{expandedAgency.headquarters || expandedAgency.logoText || 'Not listed'}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>02 / HISTORY</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.history || expandedAgency.brief}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>03 / MAJOR PROGRAMMES & CAPABILITIES</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.majorPrograms || expandedAgency.specialty}</p></section><section><p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>04 / OVERVIEW</p><p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedAgency.brief}</p></section></div></motion.article></motion.div>}
        </AnimatePresence>      </div>
      <AnimatePresence>{isReturningMain && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}><div style={{ textAlign: 'center' }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p></div></motion.div>}</AnimatePresence>
    </motion.div>
  );
}
function AllLaunchpadsPage({ launchpads, weatherById, getStatusColor, spaceBackgrounds, onClose }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [isReturningMain, setIsReturningMain] = useState(false);
  const [expandedPad, setExpandedPad] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const timer = setInterval(() => setBgIdx((current) => (current + 1) % spaceBackgrounds.length), 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
    };
  }, []);

  const handleBackToMain = () => {
    setIsReturningMain(true);
    setTimeout(() => onClose(), 3000);
  };

  const statusOptions = ['all', 'Active', 'Developing', 'Limited/Inactive', 'Inactive'];

  const filteredPads = launchpads.filter((pad) => {
    const matchesSearch = search.trim() === '' || pad.name.toLowerCase().includes(search.trim().toLowerCase()) || pad.id.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || pad.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }} style={{ position: 'fixed', inset: 0, zIndex: 99998, overflowY: 'auto', backgroundColor: '#000000', padding: '4rem 2rem', boxSizing: 'border-box', fontFamily: '"Space Grotesk", -apple-system, sans-serif' }}>
      {spaceBackgrounds.map((bgUrl, idx) => <div key={`all-pads-bg-${idx}`} style={{ position: 'fixed', inset: 0, backgroundImage: `url('${bgUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0, opacity: bgIdx === idx ? 1 : 0, transition: 'opacity 1.8s ease-in-out', filter: 'brightness(0.4) contrast(1.25)', pointerEvents: 'none' }} />)}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <motion.span layoutId="spacetec-brand" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase' }}>SPACETEC</motion.span>
          <button onClick={handleBackToMain} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '0.8rem 1.5rem', cursor: 'pointer', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: '700', textTransform: 'uppercase' }}>[← BACK TO MAIN]</button>
        </div>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '2rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>// GLOBAL LAUNCHPAD DIRECTORY</span>
          <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>EXPLORE LAUNCHPADS</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '800' }}>TOTAL SITES: {filteredPads.length} / {launchpads.length}</span>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(56, 189, 248, 0.4)', padding: '0.7rem 1rem', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', width: 'min(100%, 260px)', outline: 'none' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>
              {statusOptions.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {filteredPads.map((pad, index) => (
            <motion.article key={pad.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.04, 0.6) }} onClick={() => setExpandedPad(pad)} whileHover={{ borderColor: 'rgba(255,255,255,0.4)' }} style={{ cursor: 'pointer', minHeight: '220px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)', backgroundColor: '#050505', padding: '2rem', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', transition: 'border-color 0.3s ease' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                  <span style={{ color: '#a1a1aa', fontSize: '0.65rem', letterSpacing: '2px', fontWeight: '800' }}>// {pad.id.toUpperCase()}</span>
                  <span style={{ fontSize: '0.62rem', letterSpacing: '1px', color: getStatusColor(pad.status), border: `1px solid ${getStatusColor(pad.status)}`, padding: '0.25rem 0.6rem', fontWeight: '700' }}>{pad.status}</span>
                </div>
                <h3 style={{ color: '#fff', margin: '0 0 0.6rem', fontSize: '1.25rem', letterSpacing: '1px', lineHeight: '1.3' }}>{pad.name}</h3>
                <p style={{ color: '#a1a1aa', margin: 0, fontSize: '0.75rem', letterSpacing: '1px' }}>{pad.country} // {pad.lat.toFixed(2)}, {pad.lon.toFixed(2)}</p>
              </div>
            </motion.article>
          ))}
          {filteredPads.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#a1a1aa' }}>
              No launchpads found matching the selected filter criteria.
            </div>
          )}
        </div>

        <AnimatePresence>
          {expandedPad && (() => {
            const liveWeather = weatherById?.[expandedPad.id];
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpandedPad(null)} style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.86)' }}>
                <motion.article initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24 }} onClick={(event) => event.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#050505', border: '1px solid rgba(255,255,255,0.25)', padding: '2rem', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem', letterSpacing: '2px', fontWeight: '800' }}>// {expandedPad.id.toUpperCase()} / {expandedPad.country}</span>
                      <h2 style={{ margin: '0.5rem 0 0', color: '#fff', fontSize: '2rem', letterSpacing: '1px' }}>{expandedPad.name}</h2>
                    </div>
                    <button onClick={() => setExpandedPad(null)} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 0.7rem', cursor: 'pointer' }}>CLOSE</button>
                  </div>
                  <div style={{ display: 'grid', gap: '1rem', marginTop: '2rem' }}>
                    <section>
                      <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>01 / COORDINATES</p>
                      <p style={{ color: '#fff', margin: '0.4rem 0 0' }}>LAT {expandedPad.lat.toFixed(4)}, LON {expandedPad.lon.toFixed(4)}</p>
                    </section>
                    <section>
                      <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>02 / OPERATIONAL STATUS</p>
                      <p style={{ color: getStatusColor(expandedPad.status), margin: '0.4rem 0 0', fontWeight: '700' }}>{expandedPad.status}</p>
                    </section>
                    <section>
                      <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>03 / OPERATOR & ESTABLISHED</p>
                      <p style={{ color: '#fff', margin: '0.4rem 0 0' }}>{expandedPad.operator || 'Not listed'} {expandedPad.established ? `// Est. ${expandedPad.established}` : ''}</p>
                    </section>
                    <section>
                      <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>04 / HISTORY</p>
                      <p style={{ color: '#d4d4d8', lineHeight: '1.7', margin: '0.4rem 0 0' }}>{expandedPad.history}</p>
                    </section>
                    <section>
                      <p style={{ color: '#71717a', margin: 0, fontSize: '0.68rem', letterSpacing: '2px' }}>05 / LIVE PAD WEATHER</p>
                      {liveWeather ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
                          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>TEMPERATURE</span>
                            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{liveWeather.temperature}</p>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>HUMIDITY</span>
                            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{liveWeather.humidity}</p>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>WIND SPEED</span>
                            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{liveWeather.wind_speed}</p>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '0.8rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>CONDITION</span>
                            <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{liveWeather.condition}</p>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: '#71717a', margin: '0.4rem 0 0', fontStyle: 'italic' }}>No live telemetry synced for this pad yet.</p>
                      )}
                      {liveWeather?.updated_at && (
                        <p style={{ color: '#52525b', fontSize: '0.65rem', letterSpacing: '1px', margin: '0.8rem 0 0 0' }}>LAST SYNCED: {new Date(liveWeather.updated_at).toUTCString()}</p>
                      )}
                    </section>
                  </div>
                </motion.article>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
      <AnimatePresence>{isReturningMain && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}><div style={{ textAlign: 'center' }}><motion.h1 layoutId="spacetec-brand" style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}>SPACETEC</motion.h1><p style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}>CONNECTING TO MAIN...</p></div></motion.div>}</AnimatePresence>
    </motion.div>
  );
}
function AllLaunchesPage({ launches, spaceBackgrounds, onClose, onSelectLaunch, mode = 'upcoming' }) {
  const isPastMode = mode === 'past';
  const [bgIdx, setBgIdx] = useState(0);
  const [sortBy, setSortBy] = useState(isPastMode ? 'recent' : 'latest');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [isReturningMain, setIsReturningMain] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleBackToMainWithTransition = () => {
    setIsReturningMain(true);
    setTimeout(() => {
      onClose();
    }, 3000); 
  };

  const providers = ['all', ...new Set(launches.map(l => l.provider).filter(Boolean))];

  const filteredLaunches = launches.filter(l => {
    if (selectedProvider === 'all') return true;
    return l.provider === selectedProvider;
  }).sort((a, b) => {
    const dateA = new Date(a.net).getTime();
    const dateB = new Date(b.net).getTime();
    if (sortBy === 'latest') return dateA - dateB;    // upcoming: soonest first
    if (sortBy === 'distant') return dateB - dateA;   // upcoming: farthest out first
    if (sortBy === 'recent') return dateB - dateA;    // past: most recently launched first
    if (sortBy === 'oldest') return dateA - dateB;    // past: oldest launch first
    return 0;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#000000',
        zIndex: 99998,
        overflowY: 'auto',
        padding: '4rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={`all-bg-${idx}`}
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: bgIdx === idx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            filter: 'brightness(0.4) contrast(1.25)',
            pointerEvents: 'none'
          }}
        />
      ))}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 3 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <motion.span 
              layoutId="spacetec-brand"
              style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}
            >
              SPACETEC
            </motion.span>
          </div>

          <button 
            onClick={handleBackToMainWithTransition}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.3)', 
              color: '#fff', 
              padding: '0.8rem 1.5rem', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              letterSpacing: '2px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}
          >
            [← BACK TO MAIN]
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
              {isPastMode ? '// GLOBAL MISSION ARCHIVE' : '// ARCHIVED ORBITAL MANIFEST'}
            </span>
            <h2 style={{ color: '#fff', fontSize: '2rem', margin: 0, textTransform: 'uppercase', fontWeight: '900' }}>
              {isPastMode ? 'EXPLORE MORE PAST LAUNCHES' : 'EXPLORE MORE LAUNCHES'}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Sort by Date</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
              >
                {isPastMode ? (
                  <>
                    <option value="recent">Most Recent First</option>
                    <option value="oldest">Oldest Launch First</option>
                  </>
                ) : (
                  <>
                    <option value="latest">Chronological (Upcoming First)</option>
                    <option value="distant">Distant Future First</option>
                  </>
                )}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Filter Agency</span>
              <select 
                value={selectedProvider} 
                onChange={(e) => setSelectedProvider(e.target.value)}
                style={{ background: '#121212', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.6rem 1rem', fontSize: '0.75rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                {providers.map(p => (
                  <option key={p} value={p}>{p === 'all' ? 'All Agencies' : p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
          {filteredLaunches.map((launch) => (
            <motion.div 
              key={launch.id}
              layoutId={`launch-card-${launch.id}`}
              onClick={() => onSelectLaunch(launch)}
              className="glass-card" 
              style={{ padding: '2rem', borderRadius: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '220px', transition: 'border-color 0.3s ease', cursor: 'pointer' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', padding: '0.3rem 0.6rem', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: '700' }}>
                    {launch.provider || 'AGENCY'}
                  </span>
                  {isPastMode ? (
                    <span style={{ fontSize: '0.65rem', color: getLaunchStatusColor(launch.status), letterSpacing: '1px', fontWeight: '700', textAlign: 'right' }}>● {(launch.status || 'STATUS UNKNOWN').toUpperCase()}</span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#ffffff', letterSpacing: '2px', fontWeight: '700' }}>● SCHEDULED</span>
                  )}
                </div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 1.2rem 0', fontWeight: '700', lineHeight: '1.4', letterSpacing: '1px', textTransform: 'uppercase', color: '#ffffff' }}>
                  {launch.name}
                </h3>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.80rem', color: '#a1a1aa', letterSpacing: '1px' }}>
                  {isPastMode ? 'LAUNCHED' : 'NET'}: {new Date(launch.net).toUTCString().slice(0, 16)}
                </p>
                {isPastMode ? (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#2dd4bf', fontWeight: '700', letterSpacing: '1px' }}>
                    {formatTimeAgo(launch.net)}
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    PAD: {launch.pad_location || 'Vandenberg Space Force Base'}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          {filteredLaunches.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#a1a1aa' }}>
              No launches found matching the selected filter criteria.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isReturningMain && (
          <motion.div
            key="returning-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
              padding: '2rem'
            }}
          >
            {spaceBackgrounds.map((bgUrl, idx) => (
              <div
                key={`ret-bg-${idx}`}
                style={{
                  position: 'fixed',
                  top: 0, left: 0, width: '100vw', height: '100vh',
                  backgroundImage: `url('${bgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  zIndex: 0,
                  opacity: bgIdx === idx ? 1 : 0,
                  transition: 'opacity 1.8s ease-in-out',
                  filter: 'brightness(0.4) contrast(1.25)',
                  pointerEvents: 'none'
                }}
              />
            ))}
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
                zIndex: 1,
                pointerEvents: 'none'
              }}
            />
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 3 }}>
              <motion.h1
                layoutId="spacetec-brand"
                style={{ fontSize: 'calc(3.5rem + 4vw)', fontWeight: '900', margin: 0, textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.22em' }}
              >
                SPACETEC
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ fontSize: '0.8rem', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', marginTop: '1.5rem', fontWeight: '700' }}
              >
                CONNECTING TO MAIN...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LaunchCountdownModal({ launch, weather, onClose, spaceBackgrounds }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [modalBgIdx, setModalBgIdx] = useState(0);
  const modalCanvasRef = useRef(null);
  const launchHasFlown = isLaunchPast(launch);

  useEffect(() => {
    const modalBgTimer = setInterval(() => {
      setModalBgIdx((prev) => (prev + 1) % spaceBackgrounds.length);
    }, 7000);
    return () => clearInterval(modalBgTimer);
  }, [spaceBackgrounds.length]);

  useEffect(() => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.2 + 0.05
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      stars.forEach((star) => {
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = height;
          star.x = Math.random() * width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    if (!launch?.net) return;

    const targetTime = new Date(launch.net).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();

      // Past launches count UP from liftoff (T+); upcoming launches count DOWN to liftoff (T-).
      const difference = launchHasFlown ? (now - targetTime) : (targetTime - now);

      if (!launchHasFlown && difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const absDifference = Math.abs(difference);
      const days = Math.floor(absDifference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((absDifference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((absDifference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: launchHasFlown });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [launch, launchHasFlown]);

  if (!launch) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#000000',
        zIndex: 99999,
        overflowY: 'auto',
        padding: '4rem 2rem',
        boxSizing: 'border-box'
      }}
    >
      {spaceBackgrounds.map((bgUrl, idx) => (
        <div
          key={`modal-bg-${idx}`}
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundImage: `url('${bgUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            opacity: modalBgIdx === idx ? 1 : 0,
            transition: 'opacity 1.8s ease-in-out',
            filter: 'brightness(0.4) contrast(1.25)',
            pointerEvents: 'none'
          }}
        />
      ))}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.95) 100%), linear-gradient(180deg, rgba(0,0,0,0.5) 0%, #000000 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      <canvas ref={modalCanvasRef} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />

      <motion.div 
        layoutId={`launch-card-${launch.id}`}
        style={{ maxWidth: '900px', margin: '0 auto', width: '100%', position: 'relative', zIndex: 3 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.15)', paddingBottom: '2rem', marginBottom: '2.5rem', gap: '2rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '8px', color: '#ffffff', textTransform: 'uppercase', display: 'inline-block' }}>
                SPACETEC
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
              // FULL MISSION TELEMETRY & PAD ENVIRONMENT
            </span>
            <h2 style={{ color: '#fff', fontSize: '1.8rem', margin: '0 0 0.8rem 0', textTransform: 'uppercase', fontWeight: '900', lineHeight: '1.3' }}>
              {launch.name}
            </h2>
            <span style={{ fontSize: '0.7rem', padding: '0.35rem 0.9rem', border: `1px solid ${getLaunchStatusColor(launch.status)}`, color: getLaunchStatusColor(launch.status), fontWeight: '700', letterSpacing: '2px', textTransform: 'uppercase', display: 'inline-block' }}>
              {launch.status || 'STATUS PENDING'}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.08)', 
              border: '1px solid rgba(255,255,255,0.3)', 
              color: '#fff', 
              padding: '0.8rem 1.5rem', 
              cursor: 'pointer', 
              fontSize: '0.75rem',
              letterSpacing: '2px',
              fontWeight: '700',
              textTransform: 'uppercase',
              flexShrink: 0
            }}
          >
            [X CLOSE]
          </button>
        </div>

        <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2rem', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.75rem', color: '#38bdf8', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: '700' }}>
            {launchHasFlown ? 'T+ MISSION ELAPSED TIME (LIVE)' : (timeLeft.isPast ? 'LAUNCH WINDOW OPEN / LIFTED' : 'LIVE T-MINUS COUNTDOWN TIMER')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'DAYS', val: timeLeft.days },
              { label: 'HOURS', val: timeLeft.hours },
              { label: 'MINS', val: timeLeft.minutes },
              { label: 'SECS', val: timeLeft.seconds }
            ].map((t, idx) => (
              <div key={idx} style={{ background: 'rgba(0,0,0,0.8)', padding: '1.5rem 1rem', textAlign: 'center', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>{launchHasFlown ? '+' : ''}{String(t.val).padStart(2, '0')}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', letterSpacing: '2px' }}>{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '2rem', paddingBottom: '3rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
              // LAUNCH PARAMETERS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>PROVIDER / AGENCY:</span>
                <span style={{ color: '#fff', fontWeight: '700', textTransform: 'uppercase' }}>{launch.provider || 'GLOBAL PARTNER'}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>EXACT TIMESTAMP (NET):</span>
                <span style={{ color: '#2dd4bf', fontWeight: '700' }}>{new Date(launch.net).toUTCString()}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>LAUNCH PAD COMPLEX:</span>
                <span style={{ color: '#fff', fontWeight: '700' }}>{launch.pad_location || 'Vandenberg Space Force Base'}</span>
              </div>
            </div>
          </div>

          {!launchHasFlown && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
                // PAD METEOROLOGICAL TELEMETRY {weather ? `(${weather.pad_name})` : ''}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>WIND SPEED</span>
                  <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{weather?.wind_speed || 'SYNCING...'}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>SKY CONDITION</span>
                  <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{weather?.condition || 'SYNCING...'}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>AMBIENT TEMP / HUMIDITY</span>
                  <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{weather?.temperature || '--'} / {weather?.humidity || '--'}</p>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ color: '#71717a', fontSize: '0.6rem', letterSpacing: '1px' }}>GO/NO-GO STATUS</span>
                  <p style={{ color: weather ? '#22c55e' : '#a1a1aa', fontSize: '1.1rem', fontWeight: '700', margin: '0.3rem 0 0 0' }}>{weather ? 'GO FOR LAUNCH' : 'AWAITING TELEMETRY'}</p>
                </div>
              </div>
              {weather?.updated_at && (
                <p style={{ color: '#52525b', fontSize: '0.65rem', letterSpacing: '1px', margin: '1rem 0 0 0' }}>
                  LAST SYNCED: {new Date(weather.updated_at).toUTCString()}
                </p>
              )}
            </div>
          )}

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
              // MISSION BRIEFING
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>MISSION TYPE:</span>
                <span style={{ color: '#fff', fontWeight: '700', textTransform: 'uppercase' }}>{launch.mission_type || 'Not yet catalogued'}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>TARGET ORBIT:</span>
                <span style={{ color: '#2dd4bf', fontWeight: '700' }}>{launch.mission_orbit || 'TBD'}</span>
              </div>
              <div>
                <span style={{ color: '#71717a', fontSize: '0.65rem', letterSpacing: '2px', display: 'block', marginBottom: '0.3rem' }}>OBJECTIVE:</span>
                <p style={{ color: '#d4d4d8', lineHeight: '1.65', margin: '0.4rem 0 0 0', fontSize: '0.85rem' }}>
                  {launch.mission_description || 'Detailed mission objectives for this flight have not yet been synced from the global launch manifest.'}
                </p>
              </div>
            </div>
          </div>

          {launchHasFlown && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 1.5rem 0', fontWeight: '700' }}>
                // FLIGHT OUTCOME
              </h3>
              <p style={{ fontSize: '1.5rem', fontWeight: '900', color: getLaunchStatusColor(launch.status), margin: '0 0 1rem 0', textTransform: 'uppercase' }}>
                {launch.status || 'STATUS UNKNOWN'}
              </p>
              <p style={{ color: '#71717a', fontSize: '0.75rem', lineHeight: '1.6', margin: 0 }}>
                Reflects the most recent result synced from the global launch manifest. If this mission just flew, the final outcome may take a few hours to update.
              </p>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}
