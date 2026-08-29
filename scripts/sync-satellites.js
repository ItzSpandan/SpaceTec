const satellite = require('satellite.js');

async function runSync() {
  console.log('Fetching current satellite orbital data from CelesTrak...');

  const res = await fetch(
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json',
    {
      headers: {
        // CelesTrak's usage policy asks automated clients to identify themselves.
        'User-Agent': 'spacetec.vercel.app orbital sync (contact: <your-email-or-repo-url>)'
      }
    }
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

      const nameStr = sat.OBJECT_NAME?.trim() || `SAT-${noradId}`;

      // ---------------------------------------------------------
      // ORGANIZATION
      // ---------------------------------------------------------

      let org = 'Independent / International';

      if (nameStr.includes('ISS') || nameStr.includes('ZARYA')) {
        org = 'NASA / Roscosmos / International';
      } else if (nameStr.includes('STARLINK')) {
        org = 'SpaceX (USA)';
      } else if (nameStr.includes('NOAA') || nameStr.includes('GOES')) {
        org = 'NOAA (USA)';
      } else if (nameStr.includes('COSMOS')) {
        org = 'Roscosmos (Russia)';
      } else if (nameStr.includes('GPS')) {
        org = 'US Space Force';
      }

      // ---------------------------------------------------------
      // REAL ORBITAL ELEMENTS FROM CELESTRAK (full OMM)
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
      // BUILD THE DB RECORD
      //
      // IMPORTANT: we store the full OMM (as `omm`) PLUS the flat
      // columns, so the frontend can rebuild `satrec` itself with
      // satellite.json2satrec(row.omm) and re-propagate live,
      // instead of only ever showing this sync's snapshot position.
      // ---------------------------------------------------------

      const record = {
        id: noradId,
        name: nameStr,
        organization: org,

        // Flat columns (handy for querying/filtering in Supabase)
        inclination: omm.INCLINATION,
        mean_motion: omm.MEAN_MOTION,
        eccentricity: omm.ECCENTRICITY,
        arg_perigee: omm.ARG_OF_PERICENTER,
        raan: omm.RA_OF_ASC_NODE,
        mean_anomaly: omm.MEAN_ANOMALY,
        mean_motion_dot: omm.MEAN_MOTION_DOT,
        mean_motion_ddot: omm.MEAN_MOTION_DDOT,
        bstar: omm.BSTAR,
        epoch: omm.EPOCH,
        object_id: omm.OBJECT_ID,
        ephemeris_type: omm.EPHEMERIS_TYPE,
        classification_type: omm.CLASSIFICATION_TYPE,
        element_set_no: omm.ELEMENT_SET_NO,
        rev_at_epoch: omm.REV_AT_EPOCH,

        // Full OMM blob — the reliable round-trip source for the frontend
        omm: omm,

        orbital_epoch: omm.EPOCH,
        orbital_source: 'CelesTrak',
        synced_at: now.toISOString()
      };

      // ---------------------------------------------------------
      // CALCULATE POSITION/VELOCITY AT SYNC TIME
      // (this is just a snapshot for display before the frontend's
      // own live propagation kicks in — not the source of truth)
      // ---------------------------------------------------------

      if (satrec && satrec.error === 0) {
        const propagated = satellite.propagate(satrec, now);

        if (propagated && propagated.position && propagated.velocity) {
          const positionEci = propagated.position;
          const velocityEci = propagated.velocity;
          const gmst = satellite.gstime(now);
          const geodetic = satellite.eciToGeodetic(positionEci, gmst);

          const latitude = satellite.degreesLat(geodetic.latitude);
          const longitude = satellite.degreesLong(geodetic.longitude);
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

          // FIX: store as a plain number, not "7.812 km/s".
          // A string with units made Number(row.velocity) return NaN
          // on the frontend, silently discarding the real velocity.
          if (Number.isFinite(velocity)) {
            record.velocity = Number(velocity.toFixed(3));
          }
        }
      } else {
        console.warn(`SGP4 propagation failed for ${nameStr} (${noradId})`);
      }

      formattedSats.push(record);
    } catch (error) {
      console.warn(`Failed to process satellite ${index}:`, error.message);
    }
  }

  console.log(`Successfully calculated ${formattedSats.length} satellite records.`);

  // ---------------------------------------------------------
  // SUPABASE
  // ---------------------------------------------------------

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  console.log(`Syncing ${formattedSats.length} satellites to Supabase...`);

  // Keep batches small enough to stay well under Supabase/PostgREST's
  // default request body size limit, especially now that each row
  // carries the extra `omm` JSON blob.
  const chunkSize = 200;
  const maxRetries = 3;

  for (let i = 0; i < formattedSats.length; i += chunkSize) {
    const chunk = formattedSats.slice(i, i + chunkSize);

    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;

      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/satellites`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify(chunk)
        });

        if (response.ok) {
          success = true;
          console.log(`Successfully synced ${i} -> ${i + chunk.length}`);
        } else {
          const errText = await response.text();
          console.error(
            `Supabase error at index ${i} (attempt ${attempt}, status ${response.status}):`,
            errText
          );
          // Back off a little before retrying, in case it's a transient/rate issue.
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      } catch (err) {
        console.error(`Network error at index ${i} (attempt ${attempt}):`, err.message);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }

    if (!success) {
      console.error(`Giving up on chunk ${i} -> ${i + chunk.length} after ${maxRetries} attempts.`);
    }
  }

  console.log('Satellite orbital synchronization completed successfully!');
}

runSync().catch((err) => {
  console.error('Satellite sync failed:', err);
  process.exit(1);
});
