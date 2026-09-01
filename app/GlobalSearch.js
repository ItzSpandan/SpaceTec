'use client';

// GlobalSearch — standalone homepage search component.
//
// Kept entirely separate from SpaceTecHub.js on purpose: it is dropped into
// the existing empty space between the hero and the "LIVE SPACE
// INTELLIGENCE" strip with a single import + one JSX block, and touches
// nothing else on the homepage.
//
// It searches the SpaceTec ecosystem using existing data sources only:
//   - Celestial objects, missions, spacecraft and astronauts are read
//     directly from their existing dataset files (no new database).
//   - Agencies and launchpads are passed in as props from the data
//     SpaceTecHub.js already computes, so nothing is duplicated.
//   - Rockets are searched through the existing /api/rocket-database route
//     (it already supports a `search` query param).
//   - Satellites are searched through the existing Supabase `satellites`
//     table, the same one the Satellite Database already reads from.
//   - Space News is read from the existing /api/space-news route and
//     filtered client-side (that route returns the latest batch of
//     articles and doesn't accept a search param upstream).
//
// Clicking a result opens the matching existing feature. None of the
// underlying database pages currently accept a "jump straight to this
// record" parameter, so — without touching those pages — a click opens
// the right feature/section rather than a specific profile.

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from './supabase';
import { CELESTIAL_OBJECTS } from './celestial-database/celestialData';
import { MISSIONS } from './mission-database/missionData';
import { SPACECRAFT } from './spacecraft-database/spacecraftData';
import { ASTRONAUTS } from './astronaut-database/astronautData';

const ROTATING_TERMS = [
  'satellites',
  'missions',
  'astronauts',
  'rockets',
  'spacecraft',
  'launchpads',
  'agencies',
  'celestial objects',
  'space news',
];

const RESULT_CAP = 5;

function norm(value) {
  return (value || '').toString().toLowerCase();
}

function fieldsMatch(fields, query) {
  const q = norm(query).trim();
  if (!q) return false;
  return fields.some((f) => norm(f).includes(q));
}

// --- typing animation: type a word, pause, delete it, pause, next word ---
function useTypingAnimation(active) {
  const [text, setText] = useState('');
  const termIndexRef = useRef(0);

  useEffect(() => {
    if (!active) {
      setText('');
      return undefined;
    }

    let cancelled = false;
    let timer = null;
    let phase = 'typing';
    let charIndex = 0;

    const schedule = (fn, delay) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
    };

    const tick = () => {
      const word = ROTATING_TERMS[termIndexRef.current];

      if (phase === 'typing') {
        charIndex += 1;
        setText(word.slice(0, charIndex));
        if (charIndex >= word.length) {
          phase = 'pauseFull';
          schedule(tick, 1300);
        } else {
          schedule(tick, 70);
        }
        return;
      }

      if (phase === 'pauseFull') {
        phase = 'deleting';
        schedule(tick, 40);
        return;
      }

      if (phase === 'deleting') {
        charIndex -= 1;
        setText(word.slice(0, Math.max(charIndex, 0)));
        if (charIndex <= 0) {
          phase = 'pauseEmpty';
          termIndexRef.current = (termIndexRef.current + 1) % ROTATING_TERMS.length;
          schedule(tick, 350);
        } else {
          schedule(tick, 35);
        }
        return;
      }

      if (phase === 'pauseEmpty') {
        phase = 'typing';
        schedule(tick, 90);
      }
    };

    schedule(tick, 400);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [active]);

  return text;
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch({
  agencies = [],
  launchpads = [],
  onOpenAgencies,
  onOpenLaunchpads,
  onOpenSatelliteWiki,
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);

  const [rockets, setRockets] = useState([]);
  const [rocketsLoading, setRocketsLoading] = useState(false);

  const [satellites, setSatellites] = useState([]);
  const [satellitesLoading, setSatellitesLoading] = useState(false);

  const [newsArticles, setNewsArticles] = useState(null); // null = not fetched yet
  const [newsLoading, setNewsLoading] = useState(false);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const typedPlaceholder = useTypingAnimation(!focused && query.length === 0);

  const trimmed = query.trim();
  const debouncedTrimmed = debouncedQuery.trim();

  // Close on outside click / Escape.
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // --- Local, instant search (existing in-memory datasets) ---
  const localResults = useMemo(() => {
    if (!trimmed) {
      return { celestial: [], missions: [], spacecraft: [], astronauts: [], agencies: [], launchpads: [] };
    }

    const celestial = CELESTIAL_OBJECTS.filter((o) =>
      fieldsMatch([o.name, ...(o.altNames || []), o.domain, o.description], trimmed)
    ).slice(0, RESULT_CAP);

    const missions = MISSIONS.filter((m) =>
      fieldsMatch([m.name, m.agency, m.type, m.destination, m.spacecraft, m.launchVehicle, m.description], trimmed)
    ).slice(0, RESULT_CAP);

    const spacecraft = SPACECRAFT.filter((s) =>
      fieldsMatch([s.name, s.manufacturer, s.agency, s.type, s.summary], trimmed)
    ).slice(0, RESULT_CAP);

    const astronauts = ASTRONAUTS.filter((a) =>
      fieldsMatch(
        [a.name, a.agency, a.nationality, ...(a.spacecraftFlown || []), ...(a.missions || []).map((m) => m.name)],
        trimmed
      )
    ).slice(0, RESULT_CAP);

    const agencyResults = agencies
      .filter((a) => fieldsMatch([a.name, a.tagline, a.specialty, a.brief, a.category], trimmed))
      .slice(0, RESULT_CAP);

    const launchpadResults = launchpads
      .filter((p) => fieldsMatch([p.name, p.country, p.tagline, p.operator], trimmed))
      .slice(0, RESULT_CAP);

    return {
      celestial,
      missions,
      spacecraft,
      astronauts,
      agencies: agencyResults,
      launchpads: launchpadResults,
    };
  }, [trimmed, agencies, launchpads]);

  // --- Remote: rockets (reuses the existing /api/rocket-database route) ---
  useEffect(() => {
    if (debouncedTrimmed.length < 2) {
      setRockets([]);
      return undefined;
    }
    let cancelled = false;
    setRocketsLoading(true);
    fetch(`/api/rocket-database?search=${encodeURIComponent(debouncedTrimmed)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setRockets(Array.isArray(data?.results) ? data.results.slice(0, RESULT_CAP) : []);
      })
      .catch(() => {
        if (!cancelled) setRockets([]);
      })
      .finally(() => {
        if (!cancelled) setRocketsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedTrimmed]);

  // --- Remote: satellites (reuses the existing Supabase `satellites` table) ---
  useEffect(() => {
    if (debouncedTrimmed.length < 2) {
      setSatellites([]);
      return undefined;
    }
    let cancelled = false;
    setSatellitesLoading(true);
    (async () => {
      try {
        let q = supabase.from('satellites').select('id,name').limit(RESULT_CAP);
        q = !isNaN(debouncedTrimmed)
          ? q.or(`name.ilike.%${debouncedTrimmed}%,id.eq.${debouncedTrimmed}`)
          : q.ilike('name', `%${debouncedTrimmed}%`);
        const { data, error } = await q;
        if (!cancelled) setSatellites(!error && data ? data : []);
      } catch {
        if (!cancelled) setSatellites([]);
      } finally {
        if (!cancelled) setSatellitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedTrimmed]);

  // --- Remote: space news (reuses the existing /api/space-news route, fetched once and filtered locally) ---
  useEffect(() => {
    if (debouncedTrimmed.length < 2 || newsArticles !== null || newsLoading) return;
    setNewsLoading(true);
    fetch('/api/space-news')
      .then((res) => res.json())
      .then((data) => setNewsArticles(Array.isArray(data?.articles) ? data.articles : []))
      .catch(() => setNewsArticles([]))
      .finally(() => setNewsLoading(false));
  }, [debouncedTrimmed, newsArticles, newsLoading]);

  const newsResults = useMemo(() => {
    if (!newsArticles || debouncedTrimmed.length < 2) return [];
    return newsArticles
      .filter((a) => fieldsMatch([a.headline, a.summary, a.source, a.category], debouncedTrimmed))
      .slice(0, RESULT_CAP);
  }, [newsArticles, debouncedTrimmed]);

  const isLoadingRemote = rocketsLoading || satellitesLoading || (newsLoading && debouncedTrimmed.length >= 2);

  const totalResults =
    localResults.celestial.length +
    localResults.missions.length +
    localResults.spacecraft.length +
    localResults.astronauts.length +
    localResults.agencies.length +
    localResults.launchpads.length +
    rockets.length +
    satellites.length +
    newsResults.length;

  const goTo = useCallback((href) => {
    window.location.href = href;
  }, []);

  const handleSelect = useCallback(
    (action) => {
      action();
      setOpen(false);
      inputRef.current?.blur();
    },
    []
  );

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const showAnimatedPlaceholder = !focused && query.length === 0;
  const showDropdown = open && trimmed.length > 0;

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <style>{`
        @keyframes gsearch-blink {
          0%, 45% { opacity: 1; }
          50%, 95% { opacity: 0; }
          100% { opacity: 1; }
        }
        .gsearch-field {
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 2px;
          transition: border-color 0.25s ease;
        }
        .gsearch-field:hover {
          border-color: rgba(255, 255, 255, 0.24);
        }
        .gsearch-field.gsearch-focused {
          border-color: rgba(255, 255, 255, 0.4);
        }
        .gsearch-cursor {
          display: inline-block;
          width: 1px;
          margin-left: 2px;
          animation: gsearch-blink 1.1s step-start infinite;
        }
        .gsearch-input::placeholder {
          color: transparent;
        }
        .gsearch-row {
          transition: background-color 0.15s ease;
          cursor: pointer;
        }
        .gsearch-row:hover {
          background-color: rgba(255, 255, 255, 0.05);
        }
        .gsearch-icon-btn {
          background: none;
          border: none;
          padding: 0.4rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .gsearch-dropdown {
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
      `}</style>

      {/* SEARCH FIELD */}
      <div
        className={`gsearch-field${focused ? ' gsearch-focused' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '1.1rem 1.4rem',
          gap: '0.75rem',
          boxSizing: 'border-box',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '0.78rem',
            fontWeight: '700',
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          SEARCH SPACETEC
        </span>

        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          {showAnimatedPlaceholder && (
            <span
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#71717a',
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {typedPlaceholder}
              <span className="gsearch-cursor" style={{ backgroundColor: '#71717a', height: '1em' }} />
            </span>
          )}
          <input
            ref={inputRef}
            className="gsearch-input"
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            placeholder=""
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />
        </div>

        <button
          type="button"
          className="gsearch-icon-btn"
          aria-label="Search"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
            inputRef.current?.focus();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="#d4d4d8" strokeWidth="1.4" />
            <line x1="15.4" y1="15.4" x2="20.5" y2="20.5" stroke="#d4d4d8" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* RESULTS DROPDOWN */}
      <div
        className="gsearch-dropdown"
        style={{
          position: 'absolute',
          top: 'calc(100% + 0.6rem)',
          left: 0,
          right: 0,
          zIndex: 150,
          opacity: showDropdown ? 1 : 0,
          transform: showDropdown ? 'translateY(0)' : 'translateY(-4px)',
          pointerEvents: showDropdown ? 'auto' : 'none',
        }}
      >
        <div
          className="glass-card"
          style={{
            borderRadius: '2px',
            padding: '1.25rem 0',
            maxHeight: '65vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '0 1.5rem 0.9rem 1.5rem',
              color: '#71717a',
              fontSize: '0.68rem',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '600',
            }}
          >
            SEARCH RESULTS FOR: <span style={{ color: '#ffffff' }}>{trimmed}</span>
            {isLoadingRemote && <span style={{ marginLeft: '0.6rem', color: '#52525b' }}>· SEARCHING…</span>}
          </div>

          {totalResults === 0 && !isLoadingRemote ? (
            <div style={{ padding: '0.5rem 1.5rem 0.75rem 1.5rem', color: '#a1a1aa', fontSize: '0.85rem' }}>
              NO RESULTS FOUND
            </div>
          ) : (
            <>
              <ResultGroup label="CELESTIAL OBJECTS">
                {localResults.celestial.map((o) => (
                  <ResultRow
                    key={`celestial-${o.id}`}
                    title={o.name}
                    subtitle={o.domain}
                    onSelect={() => handleSelect(() => goTo('/celestial-database'))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="MISSIONS">
                {localResults.missions.map((m) => (
                  <ResultRow
                    key={`mission-${m.id}`}
                    title={m.name}
                    subtitle={m.agency}
                    onSelect={() => handleSelect(() => goTo('/mission-database'))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="SPACECRAFT">
                {localResults.spacecraft.map((s) => (
                  <ResultRow
                    key={`spacecraft-${s.id}`}
                    title={s.name}
                    subtitle={s.agency}
                    onSelect={() => handleSelect(() => goTo('/spacecraft-database'))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="ASTRONAUTS">
                {localResults.astronauts.map((a) => (
                  <ResultRow
                    key={`astronaut-${a.id}`}
                    title={a.name}
                    subtitle={a.agency}
                    onSelect={() => handleSelect(() => goTo('/astronaut-database'))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="ROCKETS">
                {rockets.map((r) => (
                  <ResultRow
                    key={`rocket-${r.id}`}
                    title={r.name}
                    subtitle={r.manufacturer}
                    onSelect={() => handleSelect(() => goTo('/rocket-database'))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="SATELLITES">
                {satellites.map((s) => (
                  <ResultRow
                    key={`satellite-${s.id}`}
                    title={s.name}
                    subtitle={`NORAD ${s.id}`}
                    onSelect={() => handleSelect(() => onOpenSatelliteWiki && onOpenSatelliteWiki())}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="AGENCIES">
                {localResults.agencies.map((a) => (
                  <ResultRow
                    key={`agency-${a.id}`}
                    title={a.name}
                    subtitle={a.tagline}
                    onSelect={() => handleSelect(() => (onOpenAgencies ? onOpenAgencies() : null))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="LAUNCHPADS">
                {localResults.launchpads.map((p) => (
                  <ResultRow
                    key={`launchpad-${p.id}`}
                    title={p.name}
                    subtitle={p.country}
                    onSelect={() => handleSelect(() => (onOpenLaunchpads ? onOpenLaunchpads() : null))}
                  />
                ))}
              </ResultGroup>

              <ResultGroup label="SPACE NEWS">
                {newsResults.map((n) => (
                  <ResultRow
                    key={`news-${n.id}`}
                    title={n.headline}
                    subtitle={n.source}
                    onSelect={() => handleSelect(() => n.url && window.open(n.url, '_blank', 'noopener,noreferrer'))}
                  />
                ))}
              </ResultGroup>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultGroup({ label, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (items.length === 0) return null;
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '0.6rem', paddingTop: '0.6rem' }}>
      <div
        style={{
          padding: '0 1.5rem 0.4rem 1.5rem',
          color: '#71717a',
          fontSize: '0.65rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontWeight: '700',
        }}
      >
        {label}
      </div>
      {items}
    </div>
  );
}

function ResultRow({ title, subtitle, onSelect }) {
  return (
    <div
      className="gsearch-row"
      onClick={onSelect}
      style={{
        padding: '0.55rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: '500' }}>{title || 'UNTITLED'}</span>
      {subtitle && (
        <span style={{ color: '#71717a', fontSize: '0.72rem', marginTop: '0.1rem' }}>{subtitle}</span>
      )}
    </div>
  );
}
