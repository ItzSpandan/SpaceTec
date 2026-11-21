/**
 * Supabase access for the Orbital Tracking adapter: reads public.satellites with the same 1,000-row
 * pagination OrbitalGlobe.js uses (select *, ordered by id, .range batches).
 *
 * The Supabase client is passed IN, never imported here, so this module has no environment dependency and
 * can be tested with a fake client. Only the project's anon (browser-safe) client should ever be passed.
 *
 * Duplicate requests are avoided with a per-client in-flight promise and a row cache: every caller shares one
 * download. Cancelling a caller (AbortSignal) rejects only that caller's wait; the shared download finishes and
 * stays cached for the next caller.
 */
export const SUPABASE_BATCH_SIZE = 1000; // same batch size as OrbitalGlobe.js
const SATELLITE_TABLE = 'satellites';

const cache = new WeakMap(); // client -> { rows, promise }

export function makeAbortError() {
  const error = new Error('Satellite load aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error) {
  return Boolean(error) && error.name === 'AbortError';
}

async function downloadAllRows(client, batchSize, onProgress) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from(SATELLITE_TABLE)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (let i = 0; i < data.length; i += 1) rows.push(data[i]);
    if (onProgress) {
      try {
        onProgress(rows.length);
      } catch (e) {
        /* progress listeners must never break the download */
      }
    }

    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

// Resolves with every row of public.satellites. Options: { signal?, onProgress?(rowsSoFar), batchSize?, force? }
// force re-downloads, except while a download is already running: that one is fresh, so the caller joins it.
export function loadSatelliteRows(client, options = {}) {
  const { signal, onProgress, batchSize = SUPABASE_BATCH_SIZE, force = false } = options;
  if (!client || typeof client.from !== 'function') {
    return Promise.reject(new Error('loadSatelliteRows needs a Supabase client'));
  }
  if (signal && signal.aborted) return Promise.reject(makeAbortError());

  let entry = cache.get(client);
  const downloading = Boolean(entry && entry.promise);
  if (!downloading && (force || !entry)) {
    entry = { rows: null, promise: null, listeners: new Set() };
    cache.set(client, entry);
  }
  if (entry.rows && !downloading) return Promise.resolve(entry.rows);

  if (onProgress) entry.listeners.add(onProgress);
  if (!entry.promise) {
    const mine = entry;
    entry.promise = downloadAllRows(client, batchSize, n => mine.listeners.forEach(fn => fn(n)))
      .then(rows => {
        mine.rows = rows;
        mine.promise = null;
        return rows;
      })
      .catch(error => {
        // Failures are not cached: the next caller retries.
        if (cache.get(client) === mine) cache.delete(client);
        throw error;
      });
  }

  const shared = entry.promise;
  const listeners = entry.listeners;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = fn => value => {
      if (settled) return;
      settled = true;
      if (signal) signal.removeEventListener('abort', onAbort);
      if (onProgress) listeners.delete(onProgress);
      fn(value);
    };
    const onAbort = () => finish(reject)(makeAbortError());
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    shared.then(finish(resolve), finish(reject));
  });
}

export function clearSatelliteRowCache(client) {
  if (client) cache.delete(client);
}
