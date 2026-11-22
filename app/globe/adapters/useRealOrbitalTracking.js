'use client';

/**
 * Real-data entry point for the Orbital Tracking feature (NOT used by Globe Lab, which keeps its test fleet):
 *
 *   const { subject, status, message, count, error, reload } = useRealOrbitalTracking({ limit: 5000 });
 *   <SpaceTecGlobeEngine subject={subject} />      // subject is null until the data is ready
 *
 * View controls (Step 4A): `filter` (satellite_type based, see ORBITAL_FILTERS) and `limit` can be passed as options
 * and changed later through setFilter / setLimit / resetView. They only re-slice the records that are already
 * downloaded and prepared: changing them never calls Supabase and never re-runs SGP4 preparation.
 * `count` is the number of objects currently shown, `total` the prepared catalogue size and `filterCounts` the
 * number of objects per filter key (for chip labels). `database` is { total, active, inactive } counted over every
 * downloaded row (null until loaded).
 *
 * Data flow: Supabase public.satellites (1,000-row batches) -> prepareOrbitalRecords (OMM/TLE -> satrec, SGP4,
 * chunked so the page stays responsive) -> createRealOrbitalSubject -> generic globe engine.
 * Uses the project's shared anon-key client (app/supabase.js); no service-role key is involved.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as sharedSupabase } from '../../supabase';
import {
  DEFAULT_ORBITAL_FILTER,
  createRealOrbitalSubject,
  isValidOrbitalFilter,
  prepareOrbitalRecords,
  summarizeSatelliteRows,
} from './OrbitalTrackingAdapter';
import { isAbortError, loadSatelliteRows } from './orbitalSatelliteSource';

// A missing or invalid filter option means 'all'.
const initialFilter = f => (f !== undefined && f !== null && isValidOrbitalFilter(f) ? f : DEFAULT_ORBITAL_FILTER);

const IDLE = { status: 'idle', message: '', count: 0, total: 0, filterCounts: null, database: null, error: null, subject: null };

export function useRealOrbitalTracking({ client = sharedSupabase, limit, filter, onSelect, enabled = true } = {}) {
  const [state, setState] = useState(IDLE);
  const [reloadToken, setReloadToken] = useState(0);
  const [view, setView] = useState({ filter: initialFilter(filter), limit });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const viewRef = useRef(view);
  viewRef.current = view;

  // The `limit` / `filter` options stay controlled: when the caller changes them the view follows.
  // (filter is compared by value, so an inline array such as ['navigation', 'cubesat'] does not retrigger.)
  const filterId = JSON.stringify(filter === undefined ? null : filter);
  const optionsRef = useRef({ filterId, limit });
  useEffect(() => {
    const prev = optionsRef.current;
    optionsRef.current = { filterId, limit };
    if (prev.limit !== limit) setView(v => (v.limit === limit ? v : { ...v, limit }));
    if (prev.filterId !== filterId) {
      const next = initialFilter(filter);
      setView(v => (JSON.stringify(v.filter) === JSON.stringify(next) ? v : { ...v, filter: next }));
    }
  }, [filterId, limit]);

  // Download + prepare ONCE per client / reload. Neither `limit` nor `filter` is a dependency here.
  useEffect(() => {
    if (!enabled) {
      setState(IDLE);
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
          onProgress: (done, total) => {
            if (!signal.aborted) setState(prev => ({ ...prev, message: `COMPUTING SGP4 ${done.toLocaleString()} / ${total.toLocaleString()} OBJECTS...` }));
          },
        });
        if (signal.aborted) return;
        const subject = createRealOrbitalSubject(records, {
          filter: viewRef.current.filter,
          limit: viewRef.current.limit,
          onSelect: entity => {
            if (onSelectRef.current) onSelectRef.current(entity);
          },
        });
        const info = subject.getView();
        setState({ status: 'ready', message: '', count: info.visible, total: info.total, filterCounts: subject.getFilterCounts(), database: summarizeSatelliteRows(rows), error: null, subject });
      } catch (error) {
        if (isAbortError(error) || signal.aborted) return; // unmounted or superseded: nothing to report
        console.error('[useRealOrbitalTracking] satellite load failed', error);
        setState({ ...IDLE, status: 'error', message: 'TELEMETRY FEED OFFLINE', error });
      }
    })();

    return () => controller.abort();
  }, [client, enabled, reloadToken]);

  // Apply filter / limit changes to the existing subject (cheap: re-slices prepared records).
  const subjectInUse = state.subject;
  useEffect(() => {
    if (!subjectInUse) return;
    subjectInUse.setFilter(view.filter);
    subjectInUse.setLimit(view.limit);
    const visible = subjectInUse.getView().visible;
    setState(prev => (prev.subject === subjectInUse && prev.count !== visible ? { ...prev, count: visible } : prev));
  }, [subjectInUse, view]);

  const reload = useCallback(() => setReloadToken(n => n + 1), []);
  // Invalid filters are ignored (returns false) so the UI can never put the subject into an undefined state.
  const setFilter = useCallback(next => {
    const key = next === undefined ? DEFAULT_ORBITAL_FILTER : next;
    if (!isValidOrbitalFilter(key)) return false;
    setView(v => (JSON.stringify(v.filter) === JSON.stringify(key) ? v : { ...v, filter: key }));
    return true;
  }, []);
  const setLimit = useCallback(next => setView(v => (v.limit === next ? v : { ...v, limit: next })), []);
  const resetFilters = useCallback(() => setView({ filter: DEFAULT_ORBITAL_FILTER, limit: undefined }), []);

  return { ...state, filter: view.filter, limit: view.limit, setFilter, setLimit, resetFilters, reload };
}
