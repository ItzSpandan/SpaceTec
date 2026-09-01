'use client';

// Simple in-module cache: the aggregated statistics payload doesn't change
// within a session, and the API route itself is cached server-side, so we
// only need to fetch it once per page load rather than once per filter change.
let cachedPromise = null;

export function fetchSpaceStatistics({ force = false } = {}) {
  if (!force && cachedPromise) return cachedPromise;

  cachedPromise = fetch('/api/space-statistics', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`Space statistics request failed (${res.status})`);
      return res.json();
    })
    .catch((err) => {
      cachedPromise = null; // allow retry on next call if this attempt failed
      throw err;
    });

  return cachedPromise;
}
