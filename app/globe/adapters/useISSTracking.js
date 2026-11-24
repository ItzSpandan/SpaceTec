'use client';

/**
 * React entry point for the ISS tracker core (issTracking.js). It contains no tracking logic of its own: it creates one
 * tracker with createISSTracker, holds it for the life of the mounted component, and mirrors its snapshots into React
 * state.
 *
 *   const { tracker, satrec, state, status, lastUpdate, tleAgeMs, ...snapshot } = useISSTracking();
 *
 * One call = one tracker = one TLE polling loop + one 1 s propagation loop, started when the component mounts and fully
 * cancelled when it unmounts, whichever view (2D map, legacy globe, engine globe) is showing.
 *
 * Server rendering / static prerendering: render only creates the tracker object and reads its initial snapshot
 * (ACQUIRING, no state). Nothing is fetched, no timer is started and no browser API is touched until the effect runs,
 * which never happens on the server.
 *
 * Strict Mode: effects run mount -> cleanup -> mount. Each run subscribes and retains; each cleanup unsubscribes and
 * releases, so the tracker is stopped and restarted cleanly (the first request is aborted, and exactly one poll timer
 * and one propagation interval remain). The tracker instance itself is stable across both runs.
 */
import { useEffect, useState } from 'react';
import { createISSTracker } from './issTracking';

export function useISSTracking(options) {
  // Lazy initialisers: created once per mounted component, never started during render.
  const [tracker] = useState(() => createISSTracker(options));
  const [snapshot, setSnapshot] = useState(() => tracker.getSnapshot());

  useEffect(() => {
    const unsubscribe = tracker.subscribe(setSnapshot);
    const release = tracker.retain(); // starts the loops (first holder) and emits the first snapshot
    setSnapshot(tracker.getSnapshot()); // pick up anything that changed between render and this effect
    return () => {
      unsubscribe();
      release();
    };
  }, [tracker]);

  return { tracker, ...snapshot };
}
