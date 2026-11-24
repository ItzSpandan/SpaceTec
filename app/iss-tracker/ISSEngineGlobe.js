'use client';
/**
 * ISSEngineGlobe - the ISS Tracker's 3D view on the in-house SpaceTecGlobeEngine.
 *
 * Rendered by the ISS page only when the engine implementation is enabled (?orbitGlobe=engine or
 * NEXT_PUBLIC_ORBITAL_GLOBE=engine) and only in 3D view, so the 2D map never mounts WebGL. It owns no data loop: the
 * page's single tracker feeds the subject. The ISS is selected automatically (which also draws its +-48 min trajectory);
 * tapping empty space does not deselect it. Follow and Reset are driven by the page's existing buttons through props.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import SpaceTecGlobeEngine from '../SpaceTecGlobeEngine';
import { ISS_ID, createISSTrackerSubject } from '../globe/adapters/ISSTrackerAdapter';

// The existing reset view (react-globe.gl: lat 15, lng 70, altitude 2.3 = camera 3.3 Earth radii from the centre).
export const ISS_RESET_VIEW = { lat: 15, lng: 70, distance: 3.3 };
// Focus distance when the ISS marker is tapped (same close-up the Launchpad view uses).
const FOCUS_DISTANCE = 2.35;
const NO_PATH = [];

const ISSEngineGlobe = forwardRef(function ISSEngineGlobe(
  { tracker, follow, showOrbit, onReadyChange, onFollowChange, onUnavailable },
  ref
) {
  const globeRef = useRef(null);
  const subject = useMemo(() => createISSTrackerSubject(tracker), [tracker]);
  const readyRef = useRef(false);
  const followRef = useRef(follow);
  followRef.current = follow;
  const didInitialView = useRef(false);

  const applyFollow = useCallback(() => {
    if (globeRef.current && readyRef.current) globeRef.current.setFollow(followRef.current && subject.isTracking());
  }, [subject]);

  const resetView = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.setFollow(false);
    g.flyTo(ISS_RESET_VIEW.lat, ISS_RESET_VIEW.lng, ISS_RESET_VIEW.distance);
  }, []);
  useImperativeHandle(ref, () => ({ reset: resetView }), [resetView]);

  // Follow on/off from the page (and re-applied when the globe becomes ready or the ISS appears).
  useEffect(() => {
    applyFollow();
  }, [follow, applyFollow]);
  // The ISS enters the list after the globe is up (ACQUIRING / UNAVAILABLE -> data): select it then (the engine only
  // re-evaluates `selectedId` when its own props change, not when the subject pushes a new list), and let a pending
  // follow request take effect. Deferred one microtask so the engine has received this same push first.
  const trackingRef = useRef(false);
  useEffect(() => {
    let alive = true;
    const off = subject.subscribe(() => {
      const now = subject.isTracking();
      const appeared = now && !trackingRef.current;
      trackingRef.current = now;
      if (!appeared) return;
      Promise.resolve().then(() => {
        if (!alive || !globeRef.current) return;
        globeRef.current.select(ISS_ID);
        applyFollow();
      });
    });
    return () => {
      alive = false;
      off();
    };
  }, [subject, applyFollow]);

  const onSelect = useCallback(
    entity => {
      if (!entity) {
        // The engine deselects when empty space is tapped; the ISS page has exactly one object, so keep it selected
        // (silently, no camera move) while it exists.
        if (globeRef.current && subject.isTracking()) globeRef.current.select(ISS_ID);
        return;
      }
      // Tapping the ISS focuses it, unless follow already keeps the camera on it. flyTo does not re-select: no loop.
      if (!followRef.current && globeRef.current) globeRef.current.flyTo(entity.lat, entity.lng, FOCUS_DISTANCE);
    },
    [subject]
  );

  const onStatus = useCallback(
    status => {
      const ready = status === 'ready';
      readyRef.current = ready;
      if (onReadyChange) onReadyChange(ready);
      if (ready) {
        if (!didInitialView.current) {
          didInitialView.current = true;
          if (globeRef.current) globeRef.current.flyTo(ISS_RESET_VIEW.lat, ISS_RESET_VIEW.lng, ISS_RESET_VIEW.distance);
        }
        applyFollow();
      }
      if ((status === 'unavailable' || status === 'error') && onUnavailable) onUnavailable();
    },
    [applyFollow, onReadyChange, onUnavailable]
  );

  // Not ready any more once this view goes away (2D switch, fallback, unmount).
  useEffect(
    () => () => {
      readyRef.current = false;
      if (onReadyChange) onReadyChange(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <SpaceTecGlobeEngine
      ref={globeRef}
      subject={subject}
      selectedId={ISS_ID}
      path={showOrbit ? undefined : NO_PATH}
      onSelect={onSelect}
      onFollowChange={onFollowChange}
      onStatusChange={onStatus}
      interactive
      adaptiveMarkers
      showControls={false}
      autoRotate={false}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

export default ISSEngineGlobe;
