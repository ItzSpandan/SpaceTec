'use client';

import { useEffect, useState } from 'react';
import useIsMobile from '../lib/useIsMobile';

// Which homepage section lights up which tab. Sections mapped to `null`
// clear the highlight (e.g. Launchpads / Orbital map have no tab).
const SECTION_TO_TAB = {
  hero: 'home',
  'global-search': 'home',
  telemetry: 'home',
  agencies: 'agencies',
  launchpads: null,
  'orbital-map': null,
  launches: 'launches',
  'past-launches': 'launches',
};

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const IconHome = () => (
  <svg {...iconProps}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
);
const IconLaunch = () => (
  <svg {...iconProps}><path d="M12 2c3 2.5 4.5 6 4.5 9.5V16h-9v-4.5C7.5 8 9 4.5 12 2Z" /><circle cx="12" cy="9.5" r="1.6" /><path d="M7.5 13 4.5 16v3l3-1.5" /><path d="M16.5 13l3 3v3l-3-1.5" /><path d="M10 19.5c.5 1.2 1 1.9 2 2.5 1-.6 1.5-1.3 2-2.5" /></svg>
);
const IconAgencies = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" /></svg>
);
const IconTracker = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="8" strokeDasharray="2 3" /></svg>
);
const IconMore = () => (
  <svg {...iconProps}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Phone-only bottom navigation. Renders nothing unless the viewport is
// <= 767px, and its CSS (app/mobile/mobile.css) is additionally hidden
// outside the mobile media query, so desktop never sees or runs it.
export default function MobileBottomNav({ onAgencies, onTracker, onMore, moreOpen }) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (!isMobile || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id in SECTION_TO_TAB) {
            setActiveTab(SECTION_TO_TAB[entry.target.id]);
          }
        });
      },
      // a thin band around the middle of the screen decides "current section"
      { rootMargin: '-45% 0px -50% 0px' }
    );
    Object.keys(SECTION_TO_TAB).forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isMobile]);

  if (!isMobile) return null;

  const behavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');

  const goHome = () => {
    window.scrollTo({ top: 0, behavior: behavior() });
  };
  const goLaunches = () => {
    const el = document.getElementById('launches');
    if (el) el.scrollIntoView({ behavior: behavior(), block: 'start' });
  };

  const tabs = [
    { id: 'home', label: 'Home', Icon: IconHome, onClick: goHome },
    { id: 'launches', label: 'Launches', Icon: IconLaunch, onClick: goLaunches },
    { id: 'agencies', label: 'Agencies', Icon: IconAgencies, onClick: onAgencies },
    { id: 'tracker', label: 'Tracker', Icon: IconTracker, onClick: onTracker },
  ];

  return (
    <nav className="st-bottom-nav" aria-label="Primary">
      {tabs.map(({ id, label, Icon, onClick }) => (
        <button
          key={id}
          type="button"
          onClick={onClick}
          aria-current={!moreOpen && activeTab === id ? 'page' : undefined}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
      <button type="button" onClick={onMore} aria-expanded={!!moreOpen} aria-haspopup="dialog">
        <IconMore />
        <span>More</span>
      </button>
    </nav>
  );
}
