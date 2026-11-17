'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useIsMobile from '../lib/useIsMobile';

// Which homepage section lights up which tab. Sections mapped to `null`
// clear the highlight (the Orbital map has no tab of its own).
const SECTION_TO_TAB = {
  hero: 'home',
  'global-search': 'home',
  telemetry: 'home',
  agencies: 'agencies',
  launchpads: 'launchpad',
  'orbital-map': null,
  launches: 'launches',
  'past-launches': 'launches',
};

// Left-to-right order of the bar. `tracking` opens a popup instead of
// navigating directly.
const TAB_ORDER = ['agencies', 'launchpad', 'home', 'tracking', 'launches'];

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
const IconLaunches = () => (
  <svg {...iconProps}><path d="M12 2c3 2.5 4.5 6 4.5 9.5V16h-9v-4.5C7.5 8 9 4.5 12 2Z" /><circle cx="12" cy="9.5" r="1.6" /><path d="M7.5 13 4.5 16v3l3-1.5" /><path d="M16.5 13l3 3v3l-3-1.5" /><path d="M10 19.5c.5 1.2 1 1.9 2 2.5 1-.6 1.5-1.3 2-2.5" /></svg>
);
const IconAgencies = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3Z" /></svg>
);
const IconLaunchpad = () => (
  <svg {...iconProps}><path d="M12 3c2.2 2 3.2 4.6 3.2 7.4V14H8.8v-3.6C8.8 7.6 9.8 5 12 3Z" /><path d="M5 21h14" /><path d="M8 21v-3M16 21v-3" /><path d="M6 14l2.8-.2M18 14l-2.8-.2" /></svg>
);
const IconTracking = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="8" strokeDasharray="2 3" /></svg>
);
const IconSatellite = () => (
  <svg {...iconProps}><rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)" /><path d="M4 8l4 4M16 12l4 4M5 3l4 4M15 17l4 4" /><path d="M3.5 19.5c2.2.3 4-.4 5.5-2" /></svg>
);
const IconUpcoming = () => (
  <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const IconPast = () => (
  <svg {...iconProps}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l2.5 1.5" /></svg>
);
const IconIss = () => (
  <svg {...iconProps}><path d="M12 7v10M3 9h6v6H3zM15 9h6v6h-6z" /><circle cx="12" cy="12" r="2" /></svg>
);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Phone-only floating glass bottom navigation. Renders nothing unless the
// viewport is <= 767px, and its CSS (app/mobile/mobile.css) is additionally
// hidden outside the mobile media query, so desktop never sees or runs it.
export default function MobileBottomNav({
  onAgencies,
  onLaunchpad,
  onSatelliteTracker,
  onIssTracker,
  onLaunches,
  onUpcomingLaunches,
  onPastLaunches,
  onHome,
}) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('home');
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [launchesOpen, setLaunchesOpen] = useState(false);
  // which launch list is in view, so the submenu can mark it
  const [launchesSection, setLaunchesSection] = useState('upcoming');
  const trackingBtnRef = useRef(null);
  const launchesBtnRef = useRef(null);
  const navRef = useRef(null);
  const btnRefs = useRef({});
  // Measured geometry of the highlighted tab (px, relative to the bar), so the
  // oval is centred on the real button at every screen width / font metric.
  const [indicator, setIndicator] = useState({ x: 0, w: 0, ready: false });

  useEffect(() => {
    if (!isMobile || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id in SECTION_TO_TAB) {
            setActiveTab(SECTION_TO_TAB[entry.target.id]);
            if (entry.target.id === 'launches') setLaunchesSection('upcoming');
            if (entry.target.id === 'past-launches') setLaunchesSection('past');
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

  // Escape closes whichever popup (Tracking / Launches) is open.
  useEffect(() => {
    if (!trackingOpen && !launchesOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const ref = trackingOpen ? trackingBtnRef : launchesBtnRef;
        setTrackingOpen(false);
        setLaunchesOpen(false);
        ref.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [trackingOpen, launchesOpen]);

  const measure = useCallback((tabId) => {
    const el = btnRefs.current[tabId];
    if (!el || !navRef.current) return;
    const INSET = 2; // equal breathing room on both sides of the selected item
    setIndicator((prev) => {
      // sub-pixel accurate: compare real rects (offsetLeft/offsetWidth are rounded)
      // and subtract the bar's border, since the indicator is positioned inside it
      const nav = navRef.current;
      const nr = nav.getBoundingClientRect();
      const br = el.getBoundingClientRect();
      const x = br.left - (nr.left + nav.clientLeft) + INSET;
      const w = Math.max(br.width - INSET * 2, 0);
      return Math.abs(prev.x - x) < 0.05 && Math.abs(prev.w - w) < 0.05 && prev.ready ? prev : { x, w, ready: true };
    });
  }, []);

  const highlightedTab = trackingOpen ? 'tracking' : launchesOpen ? 'launches' : activeTab;
  useLayoutEffect(() => {
    if (!isMobile || !highlightedTab) return undefined;
    measure(highlightedTab);
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure(highlightedTab));
    ro.observe(nav);
    return () => ro.disconnect();
  }, [isMobile, highlightedTab, measure]);

  if (!isMobile) return null;

  const behavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
  const goHome = () => {
    if (onHome) onHome();
    else window.scrollTo({ top: 0, behavior: behavior() });
  };

  const choose = (fn) => () => {
    setTrackingOpen(false);
    setLaunchesOpen(false);
    if (fn) fn();
  };

  const tabs = {
    agencies: { label: 'Agencies', Icon: IconAgencies, onClick: choose(onAgencies) },
    launchpad: { label: 'Launchpad', Icon: IconLaunchpad, onClick: choose(onLaunchpad) },
    home: { label: 'Home', Icon: IconHome, onClick: choose(goHome) },
    tracking: { label: 'Tracking', Icon: IconTracking, onClick: () => { setLaunchesOpen(false); setTrackingOpen((o) => !o); } },
    launches: { label: 'Launches', Icon: IconLaunches, onClick: () => { setTrackingOpen(false); setLaunchesOpen((o) => !o); } },
  };

  // The highlight follows the open Tracking popup, otherwise the section in view.
  const highlighted = trackingOpen ? 'tracking' : launchesOpen ? 'launches' : activeTab;
  const highlightIndex = TAB_ORDER.indexOf(highlighted);

  return (
    <>
      {(trackingOpen || launchesOpen) && (
        <button
          type="button"
          className="st-nav-scrim"
          aria-label={trackingOpen ? 'Close tracking menu' : 'Close launches menu'}
          tabIndex={-1}
          onClick={() => { setTrackingOpen(false); setLaunchesOpen(false); }}
        />
      )}
      <nav className="st-bottom-nav" aria-label="Primary" ref={navRef}>
        {trackingOpen && (
          <div className="st-track-pop" role="menu" aria-label="Tracking">
            <button type="button" role="menuitem" onClick={choose(onSatelliteTracker)}>
              <IconSatellite />
              <span>Satellite Tracker</span>
            </button>
            <button type="button" role="menuitem" onClick={choose(onIssTracker)}>
              <IconIss />
              <span>ISS Tracker</span>
            </button>
          </div>
        )}

        {launchesOpen && (
          <div className="st-track-pop" role="menu" aria-label="Launches">
            <button
              type="button"
              role="menuitem"
              data-current={launchesSection === 'upcoming' && activeTab === 'launches' ? 'true' : undefined}
              onClick={choose(onUpcomingLaunches || onLaunches)}
            >
              <IconUpcoming />
              <span>Upcoming</span>
            </button>
            <button
              type="button"
              role="menuitem"
              data-current={launchesSection === 'past' && activeTab === 'launches' ? 'true' : undefined}
              onClick={choose(onPastLaunches || onLaunches)}
            >
              <IconPast />
              <span>Past</span>
            </button>
          </div>
        )}

        <span
          className="st-nav-indicator"
          aria-hidden="true"
          style={{
            width: indicator.w,
            transform: `translateX(${indicator.x}px)`,
            opacity: highlightIndex === -1 || !indicator.ready ? 0 : 1,
            // first measurement: place it without sliding in from the corner
            transitionProperty: indicator.ready ? undefined : 'none',
          }}
        />
        {TAB_ORDER.map((id) => {
          const { label, Icon, onClick } = tabs[id];
          const isActive = highlighted === id;
          return (
            <button
              key={id}
              type="button"
              ref={(el) => {
                btnRefs.current[id] = el;
                if (id === 'tracking') trackingBtnRef.current = el;
                if (id === 'launches') launchesBtnRef.current = el;
              }}
              onClick={onClick}
              aria-current={isActive && id !== 'tracking' && !(id === 'launches' && launchesOpen) ? 'page' : undefined}
              aria-expanded={id === 'tracking' ? trackingOpen : id === 'launches' ? launchesOpen : undefined}
              aria-haspopup={id === 'tracking' || id === 'launches' ? 'menu' : undefined}
              data-active={isActive ? 'true' : undefined}
            >
              <Icon />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
            }
