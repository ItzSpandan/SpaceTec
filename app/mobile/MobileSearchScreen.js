'use client';

// Phone-only dedicated search screen, opened from the header search icon.
//
// It wraps the EXISTING GlobalSearch component (variant="screen") so the
// search logic, data sources and result destinations are unchanged — this
// file only supplies the screen chrome and the discovery content that shows
// while the field is empty.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GlobalSearch from '../GlobalSearch';
import { MISSIONS } from '../mission-database/missionData';
import { CELESTIAL_OBJECTS } from '../celestial-database/celestialData';

// Popular searches: each term is known to return results in the existing
// datasets.
const POPULAR = ['Apollo', 'Mars', 'Moon', 'Artemis', 'Hubble', 'Jupiter', 'ISS', 'NASA'];

const closeIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export default function MobileSearchScreen({
  agencies,
  launchpads,
  onOpenAgencies,
  onOpenLaunchpads,
  onOpenSatelliteWiki,
  onClose,
}) {
  const router = useRouter();

  // Hide the homepage underneath (the real starfield stays visible), lock
  // page scroll, and close on Escape.
  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.classList.add('st-search-open');
    root.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      root.classList.remove('st-search-open');
      root.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const go = (href) => () => {
    onClose();
    router.push(href);
  };

  const categories = [
    { label: 'Satellites', run: () => onOpenSatelliteWiki && onOpenSatelliteWiki() },
    { label: 'Missions', run: go('/mission-database') },
    { label: 'Rockets', run: go('/rocket-database') },
    { label: 'Spacecraft', run: go('/spacecraft-database') },
    { label: 'Astronauts', run: go('/astronaut-database') },
    { label: 'Celestial', run: go('/celestial-database') },
    { label: 'Agencies', run: () => onOpenAgencies && onOpenAgencies() },
    { label: 'Launchpads', run: () => onOpenLaunchpads && onOpenLaunchpads() },
    { label: 'Space Weather', run: go('/space-weather') },
    { label: 'Space News', run: go('/space-news') },
  ];

  // Recommendations are real records from the existing datasets.
  const recommendedMission = MISSIONS.find((m) => m.id === 'apollo-11') || MISSIONS[0];
  const recommendedObject = CELESTIAL_OBJECTS.find((o) => o.id === 'mars') || CELESTIAL_OBJECTS[0];
  const recommendations = [
    recommendedMission && {
      key: `m-${recommendedMission.id}`,
      title: recommendedMission.name,
      sub: `Mission · ${recommendedMission.agency}`,
      run: go(`/mission-database?id=${encodeURIComponent(recommendedMission.id)}`),
    },
    recommendedObject && {
      key: `c-${recommendedObject.id}`,
      title: recommendedObject.name,
      sub: `Celestial · ${recommendedObject.domain}`,
      run: go(`/celestial-database?id=${encodeURIComponent(recommendedObject.id)}`),
    },
    agencies[0] && {
      key: `a-${agencies[0].id}`,
      title: agencies[0].name,
      sub: `Agency · ${agencies[0].tagline}`,
      run: () => onOpenAgencies && onOpenAgencies(agencies[0]),
    },
  ].filter(Boolean);

  const discovery = ({ setQuery }) => (
    <div className="st-search-discovery">
      <section>
        <h3 className="st-search-label">Recommended</h3>
        <ul className="st-search-reco">
          {recommendations.map((r) => (
            <li key={r.key}>
              <button type="button" onClick={r.run}>
                <span className="st-reco-title">{r.title}</span>
                <span className="st-reco-sub">{r.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="st-search-label">Browse categories</h3>
        <div className="st-search-chips">
          {categories.map((c) => (
            <button type="button" key={c.label} className="st-chip" onClick={c.run}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="st-search-label">Popular searches</h3>
        <div className="st-search-chips">
          {POPULAR.map((term) => (
            <button type="button" key={term} className="st-chip st-chip--ghost" onClick={() => setQuery(term)}>
              {term}
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="st-search-screen" role="dialog" aria-modal="true" aria-label="Search SpaceTec">
      <div className="st-search-top">
        <span className="spacetec-wordmark st-search-logo">SPACETEC</span>
        <button type="button" className="st-search-close" aria-label="Close search" onClick={onClose}>
          {closeIcon}
        </button>
      </div>
      <GlobalSearch
        variant="screen"
        agencies={agencies}
        launchpads={launchpads}
        onOpenAgencies={onOpenAgencies}
        onOpenLaunchpads={onOpenLaunchpads}
        onOpenSatelliteWiki={onOpenSatelliteWiki}
        onAfterSelect={onClose}
        discovery={discovery}
      />
    </div>
  );
}
