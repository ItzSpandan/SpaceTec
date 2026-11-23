'use client';
/**
 * LaunchpadGlobeView - the Launchpad Locator view on the in-house SpaceTecGlobeEngine.
 *
 * Rendered by OrbitalGlobeV2 only when the engine implementation is enabled (?orbitGlobe=engine or
 * NEXT_PUBLIC_ORBITAL_GLOBE=engine). It keeps the legacy launch-pad layout: ALL / MAJOR / MINOR filter row, the
 * globe stage, then the FACILITY DATA panel; the first pad is selected by default; tapping a marker selects it and
 * flies the camera there. Like the legacy globe, tapping empty space does NOT deselect: the selected pad, its marker
 * highlight and the FACILITY DATA panel always stay together. The dataset is the hub's own `launchpads` array (unchanged); the engine only ever sees
 * generic entities produced by LaunchpadLocatorAdapter. Styles come from OG_CSS, which OrbitalGlobeV2 renders.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SpaceTecGlobeEngine from './SpaceTecGlobeEngine';
import { createLaunchpadSubject, LAUNCHPAD_FILTERS, DEFAULT_LAUNCHPAD_FILTER } from './globe/adapters/LaunchpadLocatorAdapter';
import { placeTooltip } from './globe/orbitalGlobeV2Logic';

const LABEL = { fontSize: '0.58rem', color: '#71717a', fontFamily: 'monospace' };
const VALUE = { margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#ffffff', fontFamily: 'monospace' };

// The hub builds its launchpad array inline, so its identity changes on every hub render. Key the subject on the
// content (id + position) instead, so unrelated hub re-renders never rebuild the subject or reset the selection.
function useStableRecords(records) {
  const ref = useRef({ sig: null, records });
  const sig = Array.isArray(records) ? records.map(r => `${r && r.id}|${r && r.lat}|${r && (r.lng ?? r.lon)}`).join(';') : '';
  if (ref.current.sig !== sig) ref.current = { sig, records };
  return ref.current.records;
}

export default function LaunchpadGlobeView({ launchpads: launchpadRecords, onUnavailable }) {
  const launchpads = useStableRecords(launchpadRecords);
  const globeRef = useRef(null);
  const stageRef = useRef(null);
  const [padFilter, setPadFilter] = useState(DEFAULT_LAUNCHPAD_FILTER);
  const [explore, setExplore] = useState(false);
  const [hover, setHover] = useState(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  // One subject per dataset. The filter is applied with setFilter (no re-attach).
  const subject = useMemo(() => createLaunchpadSubject(launchpads), [launchpads]);
  const firstPad = useMemo(() => subject.getAll()[0] || null, [subject]);
  const [selectedPad, setSelectedPad] = useState(firstPad); // default selection = first pad, as before; drives marker AND panel
  const selectedRef = useRef(selectedPad);
  selectedRef.current = selectedPad;

  useEffect(() => {
    subject.setFilter(padFilter);
    // A filter that hides the selected pad removes its marker highlight (the pad has no marker then); when the
    // filter shows it again, put the highlight back so marker and panel agree.
    const pad = selectedRef.current;
    if (pad && globeRef.current && subject.getEntities().some(e => e.id === pad.id)) globeRef.current.select(pad.id);
  }, [subject, padFilter]);

  // A new dataset resets the default selection.
  const seenSubject = useRef(subject);
  useEffect(() => {
    if (seenSubject.current === subject) return;
    seenSubject.current = subject;
    setSelectedPad(firstPad);
  }, [subject, firstPad]);

  const onSelect = useCallback(
    entity => {
      setHover(null);
      if (!entity) {
        // The engine deselects when empty globe space is tapped; the legacy globe did not. Put the selection back
        // (silently, no camera move) if the pad is still shown. If a filter hid it, there is no marker to highlight
        // and the panel simply keeps the pad.
        const pad = selectedRef.current;
        if (pad && globeRef.current && subject.getEntities().some(e => e.id === pad.id)) globeRef.current.select(pad.id);
        return;
      }
      setSelectedPad(entity);
      // Same camera move as the legacy globe (fly to the pad). flyTo does not re-select, so there is no loop.
      if (globeRef.current) globeRef.current.flyTo(entity.lat, entity.lng, 2.35);
    },
    [subject]
  );
  const onHover = useCallback((entity, pos) => setHover(entity && pos ? { entity, pos } : null), []);
  const onStatus = useCallback(
    s => {
      if ((s === 'unavailable' || s === 'error') && onUnavailable) onUnavailable();
    },
    [onUnavailable]
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Explore (free camera) ends when the stage scrolls away or Esc is pressed, like the satellite view.
  useEffect(() => {
    if (!explore) return undefined;
    const onKey = e => {
      if (e.key === 'Escape') setExplore(false);
    };
    window.addEventListener('keydown', onKey);
    let io = null;
    if (typeof IntersectionObserver !== 'undefined' && stageRef.current) {
      io = new IntersectionObserver(
        entries => {
          if (entries[0] && entries[0].intersectionRatio < 0.25) setExplore(false);
        },
        { threshold: [0, 0.25, 0.5] }
      );
      io.observe(stageRef.current);
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      if (io) io.disconnect();
    };
  }, [explore]);

  const interactive = explore ? true : 'pick'; // 'pick': page scrolls over the globe, tap + hover still work

  return (
    <div className="og2-padsx">
      <div className="og-toolbar">
        <div className="og-row">
          {LAUNCHPAD_FILTERS.map(filter => (
            <button
              key={filter}
              className="hud-btn"
              onClick={() => setPadFilter(filter)}
              aria-pressed={padFilter === filter}
              style={{
                padding: '0.35rem 0.7rem',
                background: padFilter === filter ? '#27272a' : '#09090b',
                border: '1px solid #27272a',
                color: padFilter === filter ? '#ffffff' : '#71717a',
                fontSize: '0.62rem',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="og-body">
        <div ref={stageRef} className="cosmos-viewport og-stage">
          <div className="og-globe-layer">
            <SpaceTecGlobeEngine
              ref={globeRef}
              subject={subject}
              selectedId={selectedPad ? selectedPad.id : null}
              onSelect={onSelect}
              onHover={onHover}
              onStatusChange={onStatus}
              interactive={interactive}
              adaptiveMarkers
              showControls={false}
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {subject.stats().total === 0 && (
            <div className="og-chip" style={{ top: '0.75rem', left: '0.75rem' }}>
              <small>NO LAUNCH SITES WITH VALID COORDINATES</small>
            </div>
          )}

          {hover && (
            <div className="og2-tip" style={placeTooltip(hover.pos, stageSize)}>
              <b>{hover.entity.name}</b>
              <div style={{ color: '#a1a1aa' }}>{hover.entity.country}</div>
            </div>
          )}

          <div className="og-explore">
            <button className={`og-btn ${explore ? 'on' : ''}`} onClick={() => setExplore(v => !v)} aria-pressed={explore}>
              {explore ? 'Exit Explore ✕' : 'Explore globe'}
            </button>
            <span className="og-hint">
              {explore ? 'Drag to rotate • pinch / wheel to zoom' : 'Page scrolls normally • tap a marker to inspect'}
            </span>
          </div>
        </div>
      </div>

      {selectedPad && (
        <div style={{ padding: '1.25rem', border: '1px solid #27272a', background: '#000000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#ffffff', fontFamily: 'monospace', fontWeight: '700' }}>
              FACILITY DATA
            </span>
            <span style={{ fontSize: '0.60rem', color: '#71717a', fontFamily: 'monospace' }}>● ACTIVE SITE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginTop: '0.8rem' }}>
            <div>
              <p style={{ margin: 0, ...LABEL }}>NAME</p>
              <h3 style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#ffffff', fontFamily: 'monospace' }}>{selectedPad.name}</h3>
            </div>
            <div>
              <p style={{ margin: 0, ...LABEL }}>OPERATOR</p>
              <p style={VALUE}>{selectedPad.agency}</p>
            </div>
            <div>
              <p style={{ margin: 0, ...LABEL }}>COUNTRY</p>
              <p style={VALUE}>{selectedPad.country}</p>
            </div>
            <div>
              <p style={{ margin: 0, ...LABEL }}>COORDINATES</p>
              <p style={VALUE}>
                {Number(selectedPad.lat).toFixed(4)}°, {Number(selectedPad.lng).toFixed(4)}°
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
                }
