'use client';

// Desktop homepage cards: the cinematic sliding carousels for Agencies and
// Launchpads, and the portrait sliding cards shared by Upcoming and Past
// launches. Desktop only (SpaceTecHub renders the Mobile* sections on phones).
//
// Nothing here owns data: agencies come from space-agencies/agencyData.js,
// launchpads from the homepage's major-launchpad list + live weather rows, and
// launches from the existing Supabase `launches` records. Imagery is limited
// to files that already exist (/<id>.mp4.mp4, agency `hqImage`, /pad-<id>.jpg,
// launch `image_url`). If a file is missing the card falls back to plain
// monochrome, never to an invented asset.
//
// Behaviour
//  * Agencies / Launchpads: 3 cards per group, groups = the existing `batch`
//    field (0 / 1). The track slides horizontally between groups on a timer
//    that is paused while a card is selected, while the page is hidden and
//    when the user prefers reduced motion. Prev / next / dots move manually
//    (and clear any selection). Selection is click only: click selects (the
//    card widens, the logo/name moves to the side, video/imagery and details
//    appear), click another card switches, click the selected card collapses.
//  * Launches: 3 portrait cards visible, prev / next slide by one page of 3.
//    Clicking a card calls onSelect(launch) (the existing modal).
//
// All timers live in effects with cleanup. No hover handlers drive layout.

import { useCallback, useEffect, useState } from 'react';
import { hasAgencyLogo } from '../mobile/agencyLogos';
import { usePrefersReducedMotion, usePageVisible } from '../mobile/hooks';

const AUTO_MS = 9000;

export const HOME_CARDS_CSS = `
  .hc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 1.5rem; margin-bottom: 2rem; }
  .hc-nav { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .hc-status { font-size: 0.65rem; letter-spacing: 2px; color: #a1a1aa; text-transform: uppercase; min-width: 7.5rem; text-align: right; }
  .hc-arrow {
    width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.18); color: #fff;
    font-size: 1rem; cursor: pointer; transition: background 0.25s ease, border-color 0.25s ease, opacity 0.25s ease;
  }
  .hc-arrow:hover:not(:disabled) { background: rgba(255,255,255,0.14); border-color: #fff; }
  .hc-arrow:disabled { opacity: 0.3; cursor: default; }
  .hc-arrow:focus-visible, .hc-dot:focus-visible, .hc-card:focus-visible, .hc-pcard:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  .hc-dots { display: flex; gap: 0.5rem; align-items: center; }
  .hc-dot { width: 22px; height: 3px; border: 0; padding: 0; background: rgba(255,255,255,0.25); cursor: pointer; transition: background 0.3s ease, width 0.3s ease; }
  .hc-dot[aria-current="true"] { background: #fff; width: 34px; }

  .hc-viewport { overflow: hidden; border: 1px solid rgba(255,255,255,0.15); border-radius: 2px; background: #050505; }
  .hc-track { display: flex; width: 100%; transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
  .hc-group { flex: 0 0 100%; min-width: 0; display: flex; height: 480px; }

  .hc-card {
    position: relative; flex: 1 1 0; min-width: 0; height: 100%; overflow: hidden; cursor: pointer; background: #0a0a0a;
    border-right: 1px solid rgba(255,255,255,0.12); box-sizing: border-box; text-align: left; color: #fff;
    transition: flex-grow 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hc-card:last-child { border-right: 0; }
  .hc-card.is-open { flex-grow: 2.3; }
  .hc-card-bg { position: absolute; inset: 0; z-index: 0; background: radial-gradient(circle at 50% 40%, #1b1b1b 0%, #060606 75%); }
  .hc-card-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) brightness(0.62); opacity: 0; transition: opacity 0.8s ease; pointer-events: none; }
  .hc-card.is-open .hc-card-media.is-ready { opacity: 1; }
  .hc-card-idle-img { opacity: 0.22; filter: grayscale(1); transition: opacity 0.6s ease; }
  .hc-card.is-open .hc-card-idle-img { opacity: 0; }
  .hc-card-shade { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.88) 100%); transition: opacity 0.6s ease; }
  .hc-card-ident {
    position: absolute; z-index: 3; left: 50%; top: 50%; width: 80%; max-width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 0.9rem; text-align: center;
    transform: translate(-50%, -50%);
    transition: left 0.7s cubic-bezier(0.16, 1, 0.3, 1), top 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), width 0.7s ease;
  }
  .hc-card.is-open .hc-card-ident { left: 2rem; top: 2rem; width: 46%; align-items: flex-start; text-align: left; transform: translate(0, 0); gap: 0.6rem; }
  .hc-logo { display: block; width: 70%; max-width: 220px; height: 84px; object-fit: contain; filter: brightness(0) invert(1); user-select: none; transition: height 0.7s ease, width 0.7s ease; }
  .hc-card.is-open .hc-logo { height: 44px; width: 60%; object-position: left center; }
  .hc-name { margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; line-height: 1.3; overflow-wrap: anywhere; transition: font-size 0.7s ease; }
  .hc-card.is-open .hc-name { font-size: 0.8rem; letter-spacing: 2.5px; color: #d4d4d8; }
  .hc-kicker-idle { font-size: 0.62rem; letter-spacing: 2.5px; color: #71717a; text-transform: uppercase; font-weight: 700; margin: 0; transition: opacity 0.4s ease; }
  .hc-card.is-open .hc-kicker-idle { opacity: 0; height: 0; overflow: hidden; }
  .hc-card-info {
    position: absolute; z-index: 3; left: 2rem; right: 2rem; bottom: 2rem;
    opacity: 0; transform: translateY(18px); pointer-events: none;
    transition: opacity 0.45s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hc-card.is-open .hc-card-info { opacity: 1; transform: translateY(0); transition-delay: 0.22s; pointer-events: auto; }
  .hc-info-kicker { margin: 0 0 0.7rem 0; font-size: 0.68rem; letter-spacing: 2.5px; text-transform: uppercase; color: #e4e4e7; font-weight: 800; }
  .hc-info-lead { margin: 0 0 0.8rem 0; font-size: 0.85rem; line-height: 1.55; color: #d4d4d8; }
  .hc-info-body { margin: 0; font-size: 0.78rem; line-height: 1.6; color: #a1a1aa; border-left: 1px solid rgba(255,255,255,0.35); padding-left: 0.9rem; max-width: 560px; }
  .hc-info-meta { list-style: none; margin: 0.9rem 0 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 0.5rem; }
  .hc-info-meta li { font-size: 0.62rem; letter-spacing: 1.5px; text-transform: uppercase; color: #e4e4e7; border: 1px solid rgba(255,255,255,0.28); padding: 0.25rem 0.6rem; background: rgba(0,0,0,0.45); font-weight: 700; }
  .hc-index { position: absolute; z-index: 3; top: 2rem; right: 2rem; font-size: 0.62rem; letter-spacing: 3px; color: #71717a; font-weight: 800; }

  .hc-pwin { overflow: hidden; }
  .hc-ptrack { display: flex; gap: 1.5rem; transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
  .hc-pcard {
    position: relative; flex: 0 0 calc((100% - 3rem) / 3); min-width: 0; height: 520px; overflow: hidden; cursor: pointer;
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.14); border-radius: 2px; padding: 0; text-align: left; color: #fff; font-family: inherit;
    transition: border-color 0.35s ease;
  }
  .hc-pcard:hover { border-color: #fff; }
  .hc-pcard-bg { position: absolute; inset: 0; background: linear-gradient(160deg, #1c1c1c 0%, #070707 80%); }
  .hc-pcard-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.05); transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
  .hc-pcard:hover .hc-pcard-img { transform: scale(1.04); }
  .hc-pcard-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 58%, rgba(0,0,0,0.94) 100%); pointer-events: none; }
  .hc-pcard-tag { position: absolute; top: 1.25rem; left: 1.5rem; right: 1.5rem; font-size: 0.6rem; letter-spacing: 2.5px; text-transform: uppercase; color: #d4d4d8; font-weight: 700; text-shadow: 0 1px 6px rgba(0,0,0,0.8); }
  .hc-pcard-body { position: absolute; left: 0; right: 0; bottom: 0; padding: 1.5rem; }
  .hc-pcard-name { margin: 0 0 0.9rem 0; font-size: 1.25rem; font-weight: 900; line-height: 1.3; letter-spacing: 0.6px; text-transform: uppercase; color: #fff; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .hc-pcard-rows { border-top: 1px solid rgba(255,255,255,0.18); padding-top: 0.85rem; display: flex; flex-direction: column; gap: 0.45rem; }
  .hc-pcard-row { display: flex; gap: 0.75rem; align-items: baseline; font-size: 0.74rem; color: #d4d4d8; letter-spacing: 0.3px; min-width: 0; }
  .hc-pcard-row > span:first-child { flex: 0 0 4.2rem; font-size: 0.56rem; letter-spacing: 2px; color: #71717a; font-weight: 800; text-transform: uppercase; }
  .hc-pcard-row > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hc-pcard-elapsed { color: #a1a1aa; }
  .hc-empty { text-align: center; padding: 3rem; color: #71717a; border: 1px dashed rgba(255,255,255,0.15); }

  @media (prefers-reduced-motion: reduce) {
    .hc-track, .hc-ptrack, .hc-card, .hc-card-ident, .hc-logo, .hc-name, .hc-card-info, .hc-card-media, .hc-card-idle-img, .hc-pcard, .hc-pcard-img, .hc-dot { transition: none !important; }
    .hc-pcard:hover .hc-pcard-img { transform: none; }
  }
`;

const plainStatus = (status) => (status || '').replace(/[^\p{L}\p{N}\s/]/gu, '').trim();
const pad2 = (n) => String(n).padStart(2, '0');

function Controls({ count, index, onPrev, onNext, onGoto, statusText, label }) {
  return (
    <div className="hc-nav" role="group" aria-label={label}>
      <span className="hc-status" aria-live="polite">{statusText}</span>
      <button type="button" className="hc-arrow" onClick={onPrev} aria-label="Previous group" disabled={count < 2}>←</button>
      <div className="hc-dots">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            className="hc-dot"
            aria-label={`Show group ${i + 1} of ${count}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => onGoto(i)}
          />
        ))}
      </div>
      <button type="button" className="hc-arrow" onClick={onNext} aria-label="Next group" disabled={count < 2}>→</button>
    </div>
  );
}

// Shared state for the two cinematic carousels: current group, selected card,
// the auto-slide timer (cleared on every change and on unmount), manual
// navigation. The timer does not run while a card is selected, the tab is
// hidden or reduced motion is requested.
function useCinematicCarousel(groupCount) {
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();
  const paused = selectedId !== null;
  const running = !paused && !reduced && visible && groupCount > 1;

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % groupCount), AUTO_MS);
    return () => clearTimeout(t);
  }, [running, index, groupCount]);

  const goto = useCallback((i) => { setSelectedId(null); setIndex(((i % groupCount) + groupCount) % groupCount); }, [groupCount]);
  const toggle = useCallback((id) => setSelectedId((cur) => (cur === id ? null : id)), []);
  return { index, selectedId, paused, reduced, goto, toggle, prev: () => goto(index - 1), next: () => goto(index + 1) };
}

function CardShell({ open, visibleGroup, onToggle, ariaLabel, children }) {
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); }
  };
  return (
    <div
      className={`hc-card${open ? ' is-open' : ''}`}
      role="button"
      tabIndex={visibleGroup ? 0 : -1}
      aria-pressed={open}
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={onToggle}
      onKeyDown={onKey}
    >
      {children}
    </div>
  );
}

// Agency logo files are the same /public/<id>.svg|png used on mobile; the name
// text is the fallback when there is no logo, and is always shown beneath it.
function Identity({ id, name, kicker }) {
  const [ext, setExt] = useState(0);
  const exts = ['svg', 'png'];
  const showLogo = id && hasAgencyLogo(id) && ext < exts.length;
  return (
    <div className="hc-card-ident">
      {showLogo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hc-logo" src={`/${id}.${exts[ext]}`} alt="" draggable={false} onError={() => setExt((e) => e + 1)} />
      )}
      <h3 className="hc-name">{name}</h3>
      {kicker && <p className="hc-kicker-idle">{kicker}</p>}
    </div>
  );
}

function CardImage({ src, className, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt || ''} loading="lazy" draggable={false} onError={() => setFailed(true)} />;
}

function AgencyCard({ agency, number, open, visibleGroup, onToggle }) {
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => { if (!open) setVideoReady(false); }, [open]);
  return (
    <CardShell open={open} visibleGroup={visibleGroup} onToggle={onToggle} ariaLabel={`${agency.name}${open ? ', collapse details' : ', show details'}`}>
      <div className="hc-card-bg" />
      <CardImage src={agency.hqImage} className="hc-card-media hc-card-idle-img" />
      {open && (
        <video
          className={`hc-card-media${videoReady ? ' is-ready' : ''}`}
          src={agency.videoUrl}
          poster={agency.hqImage}
          autoPlay
          loop
          muted
          playsInline
          onPlaying={() => setVideoReady(true)}
        />
      )}
      <div className="hc-card-shade" />
      <span className="hc-index">{`// ${pad2(number)}`}</span>
      <Identity id={agency.id} name={agency.name} kicker={agency.tagline} />
      <div className="hc-card-info" aria-hidden={!open}>
        <p className="hc-info-kicker">{agency.tagline}</p>
        <p className="hc-info-lead">{agency.specialty}</p>
        <p className="hc-info-body">{agency.brief}</p>
        {agency.logoText && <ul className="hc-info-meta"><li>{agency.logoText}</li></ul>}
      </div>
    </CardShell>
  );
}

function PadCard({ pad, weather, number, open, visibleGroup, onToggle }) {
  const meta = [plainStatus(pad.status), pad.country].filter(Boolean);
  if (pad.established) meta.push(`EST. ${pad.established}`);
  return (
    <CardShell open={open} visibleGroup={visibleGroup} onToggle={onToggle} ariaLabel={`${pad.name}${open ? ', collapse details' : ', show details'}`}>
      <div className="hc-card-bg" />
      {/* Existing pad photo convention: /public/pad-<id>.jpg. No file -> plain monochrome. */}
      <CardImage src={`/pad-${pad.id}.jpg`} className="hc-card-media is-ready hc-pad-img" />
      <div className="hc-card-shade" />
      <span className="hc-index">{`// ${pad2(number)}`}</span>
      <Identity id={null} name={pad.name} kicker={pad.tagline} />
      <div className="hc-card-info" aria-hidden={!open}>
        <p className="hc-info-kicker">{pad.tagline}</p>
        <p className="hc-info-lead">
          {pad.country} // {Number(pad.lat).toFixed(2)}, {Number(pad.lon).toFixed(2)}
          {pad.operator ? ` // ${pad.operator}` : ''}
        </p>
        {pad.history && <p className="hc-info-body">{pad.history}</p>}
        <ul className="hc-info-meta">
          {meta.map((m) => <li key={m}>{m}</li>)}
          {weather ? (
            <li>{`${weather.temperature} · ${weather.humidity} · ${weather.wind_speed}`}</li>
          ) : (
            <li style={{ color: '#71717a' }}>Awaiting live telemetry sync...</li>
          )}
        </ul>
      </div>
    </CardShell>
  );
}

function CinematicCarousel({ eyebrow, heading, groups, renderCard, navLabel, exploreLabel, onExplore }) {
  const count = groups.length;
  const { index, selectedId, paused, goto, toggle, prev, next } = useCinematicCarousel(count);
  let counter = 0;
  return (
    <>
      <div className="hc-head">
        <div>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>{eyebrow}</span>
          <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>{heading}</h2>
        </div>
        <Controls
          count={count}
          index={index}
          onPrev={prev}
          onNext={next}
          onGoto={goto}
          label={navLabel}
          statusText={paused ? 'ROTATION PAUSED' : `GROUP ${index + 1} / ${count}`}
        />
      </div>

      <div className="hc-viewport">
        <div className="hc-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {groups.map((group, gi) => (
            <div className="hc-group" key={gi} aria-hidden={gi !== index}>
              {group.map((item) => {
                counter += 1;
                return renderCard(item, counter, gi === index, selectedId === item.id, () => toggle(item.id));
              })}
            </div>
          ))}
        </div>
      </div>

      <button className="explore-btn" onClick={onExplore}>
        <span>{exploreLabel}</span>
        <span>→</span>
      </button>
    </>
  );
}

const byBatch = (items) => {
  const batches = [...new Set(items.map((i) => i.batch ?? 0))].sort((a, b) => a - b);
  return batches.map((b) => items.filter((i) => (i.batch ?? 0) === b)).filter((g) => g.length);
};

export function HomeAgencyCarousel({ agencies, onExplore }) {
  const groups = byBatch(agencies);
  return (
    <CinematicCarousel
      eyebrow="// GLOBAL AEROSPACE ARCHITECTURE"
      heading="EXPLORE SPACE AGENCIES ACROSS THE GLOBE"
      navLabel="Agency groups"
      groups={groups}
      exploreLabel="Explore More Space Agencies"
      onExplore={onExplore}
      renderCard={(agency, n, visibleGroup, open, onToggle) => (
        <AgencyCard key={agency.id} agency={agency} number={n} open={open} visibleGroup={visibleGroup} onToggle={onToggle} />
      )}
    />
  );
}

export function HomeLaunchpadCarousel({ pads, weatherById, onExplore }) {
  const groups = byBatch(pads);
  return (
    <CinematicCarousel
      eyebrow="// GLOBAL GROUND INFRASTRUCTURE"
      heading="EXPLORE LAUNCHPADS ACROSS THE GLOBE"
      navLabel="Launchpad groups"
      groups={groups}
      exploreLabel="Explore More Launchpads"
      onExplore={onExplore}
      renderCard={(pad, n, visibleGroup, open, onToggle) => (
        <PadCard key={pad.id} pad={pad} weather={weatherById && weatherById[pad.id]} number={n} open={open} visibleGroup={visibleGroup} onToggle={onToggle} />
      )}
    />
  );
}

// ---- Upcoming / Past: portrait cards ---------------------------------------

function PortraitCard({ launch, isPast, onSelect, formatSchedule, formatElapsed, tabbable }) {
  const [imgOk, setImgOk] = useState(true);
  const pad = launch.pad_location || 'Vandenberg Space Force Base'; // same fallback the existing tiles use
  return (
    <button type="button" className="hc-pcard" onClick={() => onSelect(launch)} tabIndex={tabbable ? 0 : -1} aria-hidden={!tabbable}>
      <div className="hc-pcard-bg" />
      {launch.image_url && imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="hc-pcard-img" src={launch.image_url} alt="" loading="lazy" draggable={false} onError={() => setImgOk(false)} />
      )}
      <div className="hc-pcard-shade" />
      <div className="hc-pcard-tag">{`// ${isPast ? 'COMPLETED' : 'SCHEDULED'}`}</div>
      <div className="hc-pcard-body">
        <h3 className="hc-pcard-name">{launch.name}</h3>
        <div className="hc-pcard-rows">
          <div className="hc-pcard-row">
            <span>{isPast ? 'LAUNCHED' : 'NET'}</span>
            <span>
              {formatSchedule(launch)}
              {isPast && <span className="hc-pcard-elapsed">{` (${formatElapsed(launch)})`}</span>}
            </span>
          </div>
          {launch.provider && <div className="hc-pcard-row"><span>PROVIDER</span><span>{launch.provider}</span></div>}
          <div className="hc-pcard-row"><span>PAD</span><span>{pad}</span></div>
          {(isPast || launch.status) && (
            <div className="hc-pcard-row"><span>STATUS</span><span style={{ fontWeight: 700, letterSpacing: '1px' }}>{(launch.status || 'STATUS UNKNOWN').toUpperCase()}</span></div>
          )}
        </div>
      </div>
    </button>
  );
}

export function HomeLaunchCarousel({ launches, isPast, eyebrow, heading, onSelect, formatSchedule, formatElapsed, emptyText, navLabel }) {
  const VISIBLE = 3;
  const n = launches.length;
  const pages = Math.max(1, Math.ceil(n / VISIBLE));
  const [page, setPage] = useState(0);
  const safePage = Math.min(page, pages - 1);
  // The last page is clamped so it still shows 3 cards when n isn't a multiple of 3.
  const offsetCards = Math.max(0, Math.min(safePage * VISIBLE, n - VISIBLE));
  const goto = (p) => setPage(Math.max(0, Math.min(pages - 1, p)));
  return (
    <>
      <div className="hc-head" style={{ marginBottom: '2.5rem' }}>
        <div>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>{eyebrow}</span>
          <h2 style={{ fontSize: '1.8rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>{heading}</h2>
        </div>
        {pages > 1 && (
          <div className="hc-nav" role="group" aria-label={navLabel}>
            <span className="hc-status" aria-live="polite">{`PAGE ${safePage + 1} / ${pages}`}</span>
            <button type="button" className="hc-arrow" onClick={() => goto(safePage - 1)} disabled={safePage === 0} aria-label="Previous launches">←</button>
            <div className="hc-dots">
              {Array.from({ length: pages }, (_, i) => (
                <button key={i} type="button" className="hc-dot" aria-label={`Show page ${i + 1} of ${pages}`} aria-current={i === safePage ? 'true' : undefined} onClick={() => goto(i)} />
              ))}
            </div>
            <button type="button" className="hc-arrow" onClick={() => goto(safePage + 1)} disabled={safePage >= pages - 1} aria-label="Next launches">→</button>
          </div>
        )}
      </div>

      {n === 0 ? (
        emptyText ? <div className="hc-empty">{emptyText}</div> : null
      ) : (
        <div className="hc-pwin">
          <div className="hc-ptrack" style={{ transform: `translateX(calc(${offsetCards} * (100% + 1.5rem) / -3))` }}>
            {launches.map((launch, i) => (
              <PortraitCard
                key={launch.id}
                launch={launch}
                isPast={isPast}
                onSelect={onSelect}
                formatSchedule={formatSchedule}
                formatElapsed={formatElapsed}
                tabbable={i >= offsetCards && i < offsetCards + VISIBLE}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
                                                                                                    }
