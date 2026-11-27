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
//  * Agencies / Launchpads: a circular spotlight of three cards (left, centre,
//    right) over the existing item order. It advances ONE card at a time on a
//    timer (paused while the centre card is expanded, while the pointer/focus is
//    on the stage, when the tab is hidden and under reduced motion). Prev / next
//    / dots move manually.
//  * The centre card runs an automatic identity animation (logo + name glide
//    from the middle to the top-left; for agencies the existing video fades in
//    and plays). Only the centre card ever has a <video>. This does not expand it.
//  * Clicking the centre card toggles its expanded info state (the card widens
//    over its neighbours; video keeps playing). Clicking a side card brings it
//    to the centre. No hover handler changes layout.
//  * Launches: 3 portrait cards visible, prev / next slide by one page of 3.
//    Clicking a card calls onSelect(launch) (the existing modal).
//
// All timers live in effects with cleanup. No hover handlers drive layout.

import { useCallback, useEffect, useState } from 'react';
import { hasAgencyLogo } from '../mobile/agencyLogos';
import { usePrefersReducedMotion, usePageVisible } from '../mobile/hooks';

const AUTO_MS = 10000; // one card per tick: ~1s slide + ~0.9s settle + video time
const SETTLE_MS = 900; // a card must sit in the centre this long before its identity animation starts

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
  .hc-dot { width: 14px; height: 3px; border: 0; padding: 0; background: rgba(255,255,255,0.25); cursor: pointer; transition: background 0.3s ease, width 0.3s ease; }
  .hc-dot[aria-current="true"] { background: #fff; width: 26px; }

  .hc-stage { position: relative; height: 650px; overflow: hidden; background: transparent; }
  .hc-card {
    position: absolute; top: 50%; left: 50%; width: 30%; height: 520px; min-width: 0; overflow: hidden; cursor: pointer;
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.14); border-radius: 2px; box-sizing: border-box; text-align: left; color: #fff;
    transform: translate(-50%, -50%); z-index: 2; opacity: 1;
    transition: left 0.95s cubic-bezier(0.16, 1, 0.3, 1), width 0.85s cubic-bezier(0.16, 1, 0.3, 1), height 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.7s ease, border-color 0.5s ease, box-shadow 0.6s ease;
  }
  .hc-card[data-pos="c"] { left: 50%; width: 35%; height: 600px; z-index: 3; border-color: rgba(255,255,255,0.38); box-shadow: 0 0 60px rgba(0,0,0,0.7); }
  .hc-card[data-pos="l"] { left: 15.5%; }
  .hc-card[data-pos="r"] { left: 84.5%; }
  .hc-card[data-pos="fl"] { left: -17%; opacity: 0; pointer-events: none; }
  .hc-card[data-pos="fr"] { left: 117%; opacity: 0; pointer-events: none; }
  .hc-card[data-pos="c"].is-open { width: 58%; z-index: 5; border-color: rgba(255,255,255,0.6); }
  .hc-card-bg { position: absolute; inset: 0; z-index: 0; background: linear-gradient(160deg, #2b2b2b 0%, #141414 55%, #070707 100%); }
  .hc-card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) brightness(0.5); transition: filter 1s ease, transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); pointer-events: none; z-index: 0; }
  .hc-card[data-pos="c"] .hc-card-img { filter: grayscale(1) brightness(0.62); }
  .hc-card[data-pos="c"].is-settled .hc-card-img { filter: grayscale(1) brightness(0.78); transform: scale(1.03); }
  .hc-card-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) brightness(0.66); opacity: 0; transition: opacity 1s ease; pointer-events: none; z-index: 1; }
  .hc-card-video.is-ready { opacity: 1; }
  .hc-card-shade { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.12) 38%, rgba(0,0,0,0.85) 100%); }
  .hc-card-ident {
    position: absolute; z-index: 3; left: 50%; top: 50%; width: 80%; max-width: 100%;
    display: flex; flex-direction: column; align-items: center; gap: 0.9rem; text-align: center;
    transform: translate(-50%, -50%);
    transition: left 1s cubic-bezier(0.16, 1, 0.3, 1), top 1s cubic-bezier(0.16, 1, 0.3, 1), transform 1s cubic-bezier(0.16, 1, 0.3, 1), width 1s ease;
  }
  .hc-card.is-moved .hc-card-ident { left: 1.75rem; top: 1.75rem; width: 55%; align-items: flex-start; text-align: left; transform: translate(0, 0); gap: 0.6rem; }
  .hc-logo { display: block; width: 70%; max-width: 220px; height: 84px; object-fit: contain; filter: brightness(0) invert(1); user-select: none; transition: height 1s ease, width 1s ease; }
  .hc-card.is-moved .hc-logo { height: 44px; width: 60%; object-position: left center; }
  .hc-name { margin: 0; font-size: 1.15rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; line-height: 1.3; overflow-wrap: anywhere; transition: font-size 1s ease; }
  .hc-card.is-moved .hc-name { font-size: 0.8rem; letter-spacing: 2.5px; color: #e4e4e7; }
  .hc-kicker-idle { font-size: 0.62rem; letter-spacing: 2.5px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; margin: 0; transition: opacity 0.5s ease; }
  .hc-card.is-moved .hc-kicker-idle { opacity: 0; height: 0; overflow: hidden; }
  .hc-card-info {
    position: absolute; z-index: 3; left: 2rem; right: 2rem; bottom: 2rem;
    opacity: 0; transform: translateY(18px); pointer-events: none;
    transition: opacity 0.4s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .hc-card.is-open .hc-card-info { opacity: 1; transform: translateY(0); transition-delay: 0.3s; pointer-events: auto; }
  .hc-info-kicker { margin: 0 0 0.7rem 0; font-size: 0.68rem; letter-spacing: 2.5px; text-transform: uppercase; color: #e4e4e7; font-weight: 800; }
  .hc-info-lead { margin: 0 0 0.8rem 0; font-size: 0.85rem; line-height: 1.55; color: #d4d4d8; }
  .hc-info-body { margin: 0; font-size: 0.78rem; line-height: 1.6; color: #a1a1aa; border-left: 1px solid rgba(255,255,255,0.35); padding-left: 0.9rem; max-width: 560px; }
  .hc-info-meta { list-style: none; margin: 0.9rem 0 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.4rem 0.5rem; }
  .hc-info-meta li { font-size: 0.62rem; letter-spacing: 1.5px; text-transform: uppercase; color: #e4e4e7; border: 1px solid rgba(255,255,255,0.28); padding: 0.25rem 0.6rem; background: rgba(0,0,0,0.45); font-weight: 700; }
  .hc-index { position: absolute; z-index: 3; top: 1.75rem; right: 1.75rem; font-size: 0.62rem; letter-spacing: 3px; color: #a1a1aa; font-weight: 800; }

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
    .hc-ptrack, .hc-card, .hc-card-ident, .hc-logo, .hc-name, .hc-card-info, .hc-card-img, .hc-card-video, .hc-pcard, .hc-pcard-img, .hc-dot { transition: none !important; }
    .hc-pcard:hover .hc-pcard-img { transform: none; }
  }
`;

const plainStatus = (status) => (status || '').replace(/[^\p{L}\p{N}\s/]/gu, '').trim();
const pad2 = (n) => String(n).padStart(2, '0');

function Controls({ count, index, onPrev, onNext, onGoto, statusText, label }) {
  return (
    <div className="hc-nav" role="group" aria-label={label}>
      <span className="hc-status" aria-live="polite">{statusText}</span>
      <button type="button" className="hc-arrow" onClick={onPrev} aria-label="Previous card">←</button>
      <div className="hc-dots">
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" className="hc-dot" aria-label={`Show card ${i + 1} of ${count}`} aria-current={i === index ? 'true' : undefined} onClick={() => onGoto(i)} />
        ))}
      </div>
      <button type="button" className="hc-arrow" onClick={onNext} aria-label="Next card">→</button>
    </div>
  );
}

// Position of item `i` relative to the centre card `active` on a ring of n.
// c = centre, l / r = the two visible side cards, fl / fr = parked off-stage
// (invisible) on the left / right so they can slide in one at a time.
function posOf(i, active, n) {
  let off = (((i - active) % n) + n) % n;
  if (off > n / 2) off -= n;
  if (off === 0) return 'c';
  if (off === 1) return 'r';
  if (off === -1) return 'l';
  return off > 0 ? 'fr' : 'fl';
}

// Circular, one-card-at-a-time spotlight. State: `active` (centre card) and
// `openId` (the centre card whose info panel is expanded). The two are
// independent of the centre card's automatic identity/video animation, which
// lives inside the card and only depends on whether it is the centre card.
function CinematicCarousel({ eyebrow, heading, items, renderCard, navLabel, exploreLabel, onExplore }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [engaged, setEngaged] = useState(false); // pointer over the stage / focus inside it
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();
  const running = openId === null && !engaged && !reduced && visible && n > 1;

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => setActive((a) => (a + 1) % n), AUTO_MS);
    return () => clearTimeout(t);
  }, [running, active, n]);

  const goto = useCallback((i) => { setOpenId(null); setActive(((i % n) + n) % n); }, [n]);
  const onCardClick = (i) => {
    if (i === active) setOpenId((cur) => (cur === items[i].id ? null : items[i].id));
    else goto(i); // a side card becomes the spotlight; it does not auto-expand
  };

  return (
    <>
      <div className="hc-head">
        <div>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '700' }}>{eyebrow}</span>
          <h2 style={{ fontSize: '2rem', textTransform: 'uppercase', margin: '0.5rem 0 0 0', fontWeight: '900', letterSpacing: '2px', color: '#ffffff' }}>{heading}</h2>
        </div>
        <Controls
          count={n}
          index={active}
          onPrev={() => goto(active - 1)}
          onNext={() => goto(active + 1)}
          onGoto={goto}
          label={navLabel}
          statusText={openId !== null || engaged ? 'ROTATION PAUSED' : `${pad2(active + 1)} / ${pad2(n)}`}
        />
      </div>

      <div
        className="hc-stage"
        onMouseEnter={() => setEngaged(true)}
        onMouseLeave={() => setEngaged(false)}
        onFocus={() => setEngaged(true)}
        onBlur={() => setEngaged(false)}
      >
        {items.map((item, i) => {
          const pos = posOf(i, active, n);
          return renderCard(item, i, pos, pos === 'c' && openId === item.id, () => onCardClick(i));
        })}
      </div>

      <button className="explore-btn" onClick={onExplore}>
        <span>{exploreLabel}</span>
        <span>→</span>
      </button>
    </>
  );
}

// One card. `pos` decides everything layout-related (CSS data-pos). The
// automatic identity animation (`settled`) starts SETTLE_MS after the card
// becomes the centre card and is reset when it leaves; it does not touch the
// expanded (`open`) state, and the expanded state does not restart it.
function SpotlightCard({ pos, open, onToggle, ariaLabel, number, image, video, identity, info }) {
  const isCentre = pos === 'c';
  const reduced = usePrefersReducedMotion();
  const [settled, setSettled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!isCentre) { setSettled(false); return undefined; }
    if (reduced) { setSettled(true); return undefined; }
    const t = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(t);
  }, [isCentre, reduced]);

  const showVideo = isCentre && settled && !!video;
  useEffect(() => { if (!showVideo) setVideoReady(false); }, [showVideo]);

  const moved = isCentre && (settled || open);
  const visibleCard = pos === 'c' || pos === 'l' || pos === 'r';
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } };

  return (
    <div
      className={`hc-card${open ? ' is-open' : ''}${isCentre && settled ? ' is-settled' : ''}${moved ? ' is-moved' : ''}`}
      data-pos={pos}
      role="button"
      tabIndex={visibleCard ? 0 : -1}
      aria-hidden={!visibleCard}
      aria-pressed={isCentre ? open : undefined}
      aria-expanded={isCentre ? open : undefined}
      aria-label={ariaLabel}
      onClick={onToggle}
      onKeyDown={onKey}
    >
      <div className="hc-card-bg" />
      <CardImage src={image} className="hc-card-img" />
      {showVideo && (
        <video
          className={`hc-card-video${videoReady ? ' is-ready' : ''}`}
          src={video}
          poster={image}
          autoPlay
          loop
          muted
          playsInline
          onPlaying={() => setVideoReady(true)}
        />
      )}
      <div className="hc-card-shade" />
      <span className="hc-index">{`// ${pad2(number)}`}</span>
      {identity}
      <div className="hc-card-info" aria-hidden={!open}>{info}</div>
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

export function HomeAgencyCarousel({ agencies, onExplore }) {
  return (
    <CinematicCarousel
      eyebrow="// GLOBAL AEROSPACE ARCHITECTURE"
      heading="EXPLORE SPACE AGENCIES ACROSS THE GLOBE"
      navLabel="Agency carousel"
      items={agencies}
      exploreLabel="Explore More Space Agencies"
      onExplore={onExplore}
      renderCard={(agency, i, pos, open, onToggle) => (
        <SpotlightCard
          key={agency.id}
          pos={pos}
          open={open}
          onToggle={onToggle}
          ariaLabel={pos === 'c' ? `${agency.name}${open ? ', collapse details' : ', show details'}` : `${agency.name}, bring to centre`}
          number={i + 1}
          image={agency.hqImage}
          video={agency.videoUrl}
          identity={<Identity id={agency.id} name={agency.name} kicker={agency.tagline} />}
          info={(
            <>
              <p className="hc-info-kicker">{agency.tagline}</p>
              <p className="hc-info-lead">{agency.specialty}</p>
              <p className="hc-info-body">{agency.brief}</p>
              {agency.logoText && <ul className="hc-info-meta"><li>{agency.logoText}</li></ul>}
            </>
          )}
        />
      )}
    />
  );
}

export function HomeLaunchpadCarousel({ pads, weatherById, onExplore }) {
  return (
    <CinematicCarousel
      eyebrow="// GLOBAL GROUND INFRASTRUCTURE"
      heading="EXPLORE LAUNCHPADS ACROSS THE GLOBE"
      navLabel="Launchpad carousel"
      items={pads}
      exploreLabel="Explore More Launchpads"
      onExplore={onExplore}
      renderCard={(pad, i, pos, open, onToggle) => {
        const weather = weatherById && weatherById[pad.id];
        const meta = [plainStatus(pad.status), pad.country].filter(Boolean);
        if (pad.established) meta.push(`EST. ${pad.established}`);
        return (
          <SpotlightCard
            key={pad.id}
            pos={pos}
            open={open}
            onToggle={onToggle}
            ariaLabel={pos === 'c' ? `${pad.name}${open ? ', collapse details' : ', show details'}` : `${pad.name}, bring to centre`}
            number={i + 1}
            image={`/pad-${pad.id}.jpg`} // existing pad photo convention; no file -> plain dark card
            video={null}
            identity={<Identity id={null} name={pad.name} kicker={pad.tagline} />}
            info={(
              <>
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
              </>
            )}
          />
        );
      }}
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
