const satellite = require('satellite.js');

async function runSync() {
  console.log('Fetching current satellite orbital data from CelesTrak...');

  const res = await fetch(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json'
  );

  if (!res.ok) {
    throw new Error(`CelesTrak failed with status: ${res.status}`);
  }

  const data = await res.json();

  if (!Array.isArray(data)) {
    throw new Error('Invalid CelesTrak data format');
  }

  console.log(`Fetched ${data.length} satellites from CelesTrak.`);

  const now = new Date();

  const formattedSats = [];

  for (let index = 0; index < data.length; index++) {
    const sat = data[index];

    try {
      const noradId = Number(sat.NORAD_CAT_ID);

      if (!Number.isFinite(noradId)) {
        console.warn(`Skipping satellite ${index}: invalid NORAD ID`);
        continue;
      }

      const nameStr =
        sat.OBJECT_NAME?.trim() || `SAT-${noradId}`;

      // ---------------------------------------------------------
      // ORGANIZATION
      // ---------------------------------------------------------

      let org = 'Independent / International';

      if (
        nameStr.includes('ISS') ||
        nameStr.includes('ZARYA')
      ) {
        org = 'NASA / Roscosmos / International';
      } else if (nameStr.includes('STARLINK')) {
        org = 'SpaceX (USA)';
      } else if (
        nameStr.includes('NOAA') ||
        nameStr.includes('GOES')
      ) {
        org = 'NOAA (USA)';
      } else if (nameStr.includes('COSMOS')) {
        org = 'Roscosmos (Russia)';
      } else if (nameStr.includes('GPS')) {
        org = 'US Space Force';
      }

      // ---------------------------------------------------------
      // REAL ORBITAL ELEMENTS FROM CELESTRAK
      // ---------------------------------------------------------

      const omm = {
        OBJECT_NAME: nameStr,
        OBJECT_ID: sat.OBJECT_ID,
        EPOCH: sat.EPOCH,
        MEAN_MOTION: Number(sat.MEAN_MOTION),
        ECCENTRICITY: Number(sat.ECCENTRICITY),
        INCLINATION: Number(sat.INCLINATION),
        RA_OF_ASC_NODE: Number(sat.RA_OF_ASC_NODE),
        ARG_OF_PERICENTER: Number(sat.ARG_OF_PERICENTER),
        MEAN_ANOMALY: Number(sat.MEAN_ANOMALY),
        EPHEMERIS_TYPE: Number(sat.EPHEMERIS_TYPE || 0),
        CLASSIFICATION_TYPE: sat.CLASSIFICATION_TYPE || 'U',
        NORAD_CAT_ID: noradId,
        ELEMENT_SET_NO: Number(sat.ELEMENT_SET_NO || 0),
        REV_AT_EPOCH: Number(sat.REV_AT_EPOCH || 0),
        BSTAR: Number(sat.BSTAR || 0),
        MEAN_MOTION_DOT: Number(sat.MEAN_MOTION_DOT || 0),
        MEAN_MOTION_DDOT: Number(sat.MEAN_MOTION_DDOT || 0)
      };

      // ---------------------------------------------------------
      // CREATE SGP4 SATELLITE RECORD
      // ---------------------------------------------------------

      const satrec = satellite.json2satrec(omm);

      // ---------------------------------------------------------
      // CALCULATE CURRENT POSITION
      // ---------------------------------------------------------

      const propagated = satellite.propagate(satrec, now);

      const record = {
        id: noradId,
        name: nameStr,
        inclination: Number(sat.INCLINATION || 0),
        mean_motion: Number(sat.MEAN_MOTION || 0),
        organization: org,

        // Store the actual orbital elements
        eccentricity: Number(sat.ECCENTRICITY || 0),
        arg_perigee: Number(sat.ARG_OF_PERICENTER || 0),
        raan: Number(sat.RA_OF_ASC_NODE || 0),
        mean_anomaly: Number(sat.MEAN_ANOMALY || 0),
        mean_motion_dot: Number(sat.MEAN_MOTION_DOT || 0),
        mean_motion_ddot: Number(sat.MEAN_MOTION_DDOT || 0),
        bstar: Number(sat.BSTAR || 0),
        epoch: sat.EPOCH || null,

        orbital_epoch: sat.EPOCH || null,
        orbital_source: 'CelesTrak'
      };

      // ---------------------------------------------------------
      // ONLY UPDATE POSITION IF SGP4 SUCCESSFULLY PROPAGATED
      // ---------------------------------------------------------

      if (
        propagated &&
        propagated.position &&
        propagated.velocity
      ) {
        const positionEci = propagated.position;
        const velocityEci = propagated.velocity;

        const gmst = satellite.gstime(now);

        const geodetic = satellite.eciToGeodetic(
          positionEci,
          gmst
        );

        const latitude =
          satellite.degreesLat(geodetic.latitude);

        const longitude =
          satellite.degreesLong(geodetic.longitude);

        const altitude = geodetic.height;

        const velocity = Math.sqrt(
          velocityEci.x * velocityEci.x +
          velocityEci.y * velocityEci.y +
          velocityEci.z * velocityEci.z
        );

        if (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          Number.isFinite(altitude)
        ) {
          record.lat = Number(latitude.toFixed(6));
          record.lng = Number(longitude.toFixed(6));
          record.altitude = Number(altitude.toFixed(3));
        }

        if (Number.isFinite(velocity)) {
          record.velocity = `${velocity.toFixed(3)} km/s`;
        }
      } else {
        console.warn(
          `SGP4 propagation failed for ${nameStr} (${noradId})`
        );
      }

      formattedSats.push(record);

    } catch (error) {
      console.warn(
        `Failed to process satellite ${index}:`,
        error.message
      );
    }
  }

  console.log(
    `Successfully calculated ${formattedSats.length} satellite records.`
  );

  // ---------------------------------------------------------
  // SUPABASE
  // ---------------------------------------------------------

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  console.log(
    `Syncing ${formattedSats.length} satellites to Supabase...`
  );

  // Keep batches reasonably sized.
  const chunkSize = 500;

  for (
    let i = 0;
    i < formattedSats.length;
    i += chunkSize
  ) {
    const chunk = formattedSats.slice(
      i,
      i + chunkSize
    );

    const response = await fetch(
      `${supabaseUrl}/rest/v1/satellites`,
      {
        method: 'POST',

        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },

        body: JSON.stringify(chunk)
      }
    );

    if (!response.ok) {
      const errText = await response.text();

      console.error(
        `Supabase error at index ${i} (${response.status}):`,
        errText
      );
    } else {
      console.log(
        `Successfully synced ${i} → ${i + chunk.length}`
      );
    }
  }

  console.log(
    'Satellite orbital synchronization completed successfully!'
  );
}

runSync().catch((err) => {
  console.error('Satellite sync failed:', err);
  process.exit(1);
});
