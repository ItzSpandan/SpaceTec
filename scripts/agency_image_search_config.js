// scripts/agency_image_search_config.js
//
// IMAGE-SEARCH-ONLY metadata. This file does NOT duplicate the agency
// database — app/space-agencies/agencyData.js remains the single source of
// truth for the 29 agencies themselves (name, tagline, brief, etc). This
// file only adds the extra hints fetch_agency_hq_images.js needs to find
// and VERIFY the correct headquarters/facility photo for each agency:
//
//   searchName    - the plain name to search Commons with (no ALL-CAPS,
//                    no "THE", matches how a photographer/uploader would
//                    actually have titled a real building photo)
//   officialName  - full official name, used as an extra search query and
//                    as a strong identity-match signal
//   aliases       - other names/building names Commons files might use
//                    (named buildings, campus/center names, etc.) — any of
//                    these counts as a positive identity match too
//   hqLocation    - "City, Country" used for search queries and as a
//                    location-matching signal
//   excludeOrgs   - other organizations this agency is frequently
//                    PHOTOGRAPHED WITH or confused with (partner agencies,
//                    contractors, co-located organizations). If a candidate's
//                    metadata is dominated by one of these names and does
//                    NOT also carry a strong identity signal for the target
//                    agency itself, it is a "Agency X visiting Org Y" photo,
//                    not an HQ photo of Agency X, and must be rejected.
//
// If an agency is missing from this map the script falls back to its
// `name` / `headquarters` (or brief-derived headquarters) fields alone —
// it still works, just with fewer positive signals to verify against.

module.exports = {
  nasa: {
    searchName: 'NASA',
    officialName: 'National Aeronautics and Space Administration',
    aliases: ['NASA Headquarters', 'Mary W. Jackson NASA Headquarters', 'Two Independence Square'],
    hqLocation: 'Washington, D.C., USA',
    excludeOrgs: [],
  },
  spacex: {
    searchName: 'SpaceX',
    officialName: 'Space Exploration Technologies Corp',
    aliases: ['SpaceX Headquarters', 'Rocket Road Hawthorne'],
    hqLocation: 'Hawthorne, California, USA',
    excludeOrgs: ['Boeing', 'Blue Origin', 'NASA'],
  },
  esa: {
    searchName: 'ESA',
    officialName: 'European Space Agency',
    aliases: ['ESA Headquarters', 'ESA HQ Paris'],
    hqLocation: 'Paris, France',
    excludeOrgs: ['NASA', 'CNES', 'DLR', 'Airbus', 'Arianespace'],
  },
  jaxa: {
    searchName: 'JAXA',
    officialName: 'Japan Aerospace Exploration Agency',
    aliases: ['JAXA Headquarters', 'Tsukuba Space Center'],
    hqLocation: 'Chofu, Tokyo, Japan',
    excludeOrgs: ['NASA', 'ESA'],
  },
  isro: {
    searchName: 'ISRO',
    officialName: 'Indian Space Research Organisation',
    aliases: ['ISRO Headquarters', 'Antariksh Bhavan'],
    hqLocation: 'Bengaluru, India',
    excludeOrgs: ['NASA', 'ESA'],
  },
  cnsa: {
    searchName: 'CNSA',
    officialName: 'China National Space Administration',
    aliases: ['CNSA Headquarters'],
    hqLocation: 'Beijing, China',
    excludeOrgs: ['NASA', 'ESA', 'JAXA'],
  },
  roscosmos: {
    searchName: 'Roscosmos',
    officialName: 'Roscosmos State Space Corporation',
    aliases: ['Roscosmos Headquarters'],
    hqLocation: 'Moscow, Russia',
    excludeOrgs: ['NASA', 'ESA'],
  },
  csa: {
    searchName: 'Canadian Space Agency',
    officialName: 'Canadian Space Agency',
    aliases: ['CSA Headquarters', 'John H. Chapman Space Centre'],
    hqLocation: 'Saint-Hubert, Quebec, Canada',
    excludeOrgs: ['Canada Revenue Agency', 'NASA'],
  },
  uksa: {
    searchName: 'UK Space Agency',
    officialName: 'United Kingdom Space Agency',
    aliases: ['UK Space Agency Headquarters'],
    hqLocation: 'Swindon, United Kingdom',
    excludeOrgs: ['Airbus', 'ESA', 'NASA'],
  },
  dlr: {
    searchName: 'DLR',
    officialName: 'Deutsches Zentrum fur Luft- und Raumfahrt',
    aliases: ['German Aerospace Center', 'DLR Oberpfaffenhofen', 'DLR Koln-Porz', 'DLR Cologne'],
    hqLocation: 'Cologne, Germany',
    excludeOrgs: ['ESA', 'NASA'],
  },
  cnes: {
    searchName: 'CNES',
    officialName: "Centre National d'Etudes Spatiales",
    aliases: ['CNES Headquarters', 'CNES Paris'],
    hqLocation: 'Paris, France',
    excludeOrgs: ['ESA', 'Arianespace'],
  },
  asi: {
    searchName: 'ASI',
    officialName: 'Agenzia Spaziale Italiana',
    aliases: ['Italian Space Agency Headquarters', 'ASI Headquarters'],
    hqLocation: 'Rome, Italy',
    excludeOrgs: ['ESA'],
  },
  kari: {
    searchName: 'KARI',
    officialName: 'Korea Aerospace Research Institute',
    aliases: ['KARI Headquarters'],
    hqLocation: 'Daejeon, South Korea',
    excludeOrgs: [],
  },
  uaesa: {
    searchName: 'UAE Space Agency',
    officialName: 'United Arab Emirates Space Agency',
    aliases: ['UAE Space Agency Headquarters'],
    hqLocation: 'Abu Dhabi, United Arab Emirates',
    excludeOrgs: ['NASA'],
  },
  asa: {
    searchName: 'Australian Space Agency',
    officialName: 'Australian Space Agency',
    aliases: ['Australian Space Agency Headquarters'],
    hqLocation: 'Adelaide, Australia',
    excludeOrgs: ['NASA'],
  },
  conae: {
    searchName: 'CONAE',
    officialName: 'Comision Nacional de Actividades Espaciales',
    aliases: ['Teofilo Tabanera Space Center'],
    hqLocation: 'Buenos Aires, Argentina',
    excludeOrgs: ['NASA'],
  },
  aeb: {
    searchName: 'AEB',
    officialName: 'Agencia Espacial Brasileira',
    aliases: ['Brazilian Space Agency Headquarters'],
    hqLocation: 'Brasilia, Brazil',
    excludeOrgs: ['NASA'],
  },
  sansa: {
    searchName: 'SANSA',
    officialName: 'South African National Space Agency',
    aliases: ['SANSA Headquarters', 'Hartebeesthoek'],
    hqLocation: 'Pretoria, South Africa',
    excludeOrgs: [],
  },
  tua: {
    searchName: 'Turkish Space Agency',
    officialName: 'Turkiye Uzay Ajansi',
    aliases: ['Turkish Space Agency Headquarters'],
    hqLocation: 'Ankara, Turkey',
    excludeOrgs: [],
  },
  'blue-origin': {
    searchName: 'Blue Origin',
    officialName: 'Blue Origin',
    aliases: ['Blue Origin Headquarters'],
    hqLocation: 'Kent, Washington, USA',
    excludeOrgs: ['NASA', 'SpaceX'],
  },
  'rocket-lab': {
    searchName: 'Rocket Lab',
    officialName: 'Rocket Lab USA',
    aliases: ['Rocket Lab Headquarters'],
    hqLocation: 'Long Beach, California, USA',
    excludeOrgs: [],
  },
  arianespace: {
    searchName: 'Arianespace',
    officialName: 'Arianespace',
    aliases: ['Arianespace Headquarters'],
    hqLocation: 'Evry-Courcouronnes, France',
    excludeOrgs: ['ESA', 'CNES', 'NASA'],
  },
  'sierra-space': {
    searchName: 'Sierra Space',
    officialName: 'Sierra Space Corporation',
    aliases: ['Sierra Space Headquarters'],
    hqLocation: 'Louisville, Colorado, USA',
    excludeOrgs: [],
  },
  firefly: {
    searchName: 'Firefly Aerospace',
    officialName: 'Firefly Aerospace',
    aliases: ['Firefly Aerospace Headquarters'],
    hqLocation: 'Cedar Park, Texas, USA',
    excludeOrgs: [],
  },
  planet: {
    searchName: 'Planet Labs',
    officialName: 'Planet Labs PBC',
    aliases: ['Planet Headquarters'],
    hqLocation: 'San Francisco, California, USA',
    excludeOrgs: ['NASA'],
  },
  maxar: {
    searchName: 'Maxar',
    officialName: 'Maxar Technologies',
    aliases: ['Maxar Space Systems', 'Maxar Headquarters'],
    hqLocation: 'Palo Alto, California, USA',
    excludeOrgs: [],
  },
  'intuitive-machines': {
    searchName: 'Intuitive Machines',
    officialName: 'Intuitive Machines',
    aliases: ['Intuitive Machines Lunar Operations Facility', 'Houston Spaceport'],
    hqLocation: 'Houston, Texas, USA',
    excludeOrgs: [],
  },
  astroscale: {
    searchName: 'Astroscale',
    officialName: 'Astroscale Holdings',
    aliases: ['Astroscale Headquarters'],
    hqLocation: 'Tokyo, Japan',
    excludeOrgs: ['NASA'],
  },
  ispace: {
    searchName: 'ispace',
    officialName: 'ispace inc',
    aliases: ['ispace Headquarters'],
    hqLocation: 'Tokyo, Japan',
    excludeOrgs: [],
  },
};
