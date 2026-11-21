'use client';

/**
 * Real-data entry point for the Orbital Tracking feature (NOT used by Globe Lab, which keeps its test fleet):
 *
 *   const { subject, status, message, count, error, reload } = useRealOrbitalTracking({ limit: 5000 });
 *   <SpaceTecGlobeEngine subject={subject} />      // subject is null until the data is ready
 *
 * Data flow: Supabase public.satellites (1,000-row batches) -> prepareOrbitalRecords (OMM/TLE -> satrec, SGP4,
 * chunked so the page stays responsive) -> createRealOrbitalSubject -> generic globe engine.
 * Uses the project's shared anon-key client (app/supabase.js); no service-role key is involved.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as sharedSupabase } from '../../supabase';
import { createRealOrbitalSubject, prepareOrbitalRecords } from './OrbitalTrackingAdapter';
import { isAbortError, loadSatelliteRows } from './orbitalSatelliteSource';

export function useRealOrbitalTracking({ client = sharedSupabase, limit, onSelect, enabled = true } = {}) {
  const [state, setState] = useState({ status: 'idle', message: '', count: 0, error: null, subject: null });
  const [reloadToken, setReloadToken] = useState(0);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', message: '', count: 0, error: null, subject: null });
      return undefined;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const force = reloadToken > 0;
    setState(prev => ({ ...prev, status: 'loading', message: 'CONNECTING TO NORAD ORBITAL DATABASE...', error: null }));

    (async () => {
      try {
        const rows = await loadSatelliteRows(client, {
          signal,
          force: force && reloadToken > 0,
          onProgress: n => {
            if (!signal.aborted) setState(prev => ({ ...prev, message: `ACQUIRING ${n.toLocaleString()} ORBITAL BODIES...` }));
          },
        });
        const records = await prepareOrbitalRecords(rows, {
          signal,
          limit,
          onProgress: (done, total) => {
            if (!signal.aborted) setState(prev => ({ ...prev, message: `COMPUTING SGP4 ${done.toLocaleString()} / ${total.toLocaleString()} OBJECTS...` }));
          },
        });
        if (signal.aborted) return;
        const subject = createRealOrbitalSubject(records, {
          onSelect: entity => {
            if (onSelectRef.current) onSelectRef.current(entity);
          },
        });
        setState({ status: 'ready', message: '', count: records.length, error: null, subject });
      } catch (error) {
        if (isAbortError(error) || signal.aborted) return; // unmounted or superseded: nothing to report
        console.error('[useRealOrbitalTracking] satellite load failed', error);
        setState({ status: 'error', message: 'TELEMETRY FEED OFFLINE', count: 0, error, subject: null });
      }
    })();

    return () => controller.abort();
  }, [client, limit, enabled, reloadToken]);

  const reload = useCallback(() => setReloadToken(n => n + 1), []);
  return { ...state, reload };
}
