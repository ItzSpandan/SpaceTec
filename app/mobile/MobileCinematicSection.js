'use client';

// MobileCinematicSection — the phone-only presentation shared by the
// "Explore Space Agencies" and "Explore Launchpad" homepage sections.
//
//   1. In-section cinematic introduction (plays ONCE per page visit):
//        EXPLORE (letter by letter) -> fades out -> title word(s) fade in ->
//        fade out -> identity panels slide right-to-left -> heading reveal
//        -> carousel.
//      It lives INSIDE the section (absolutely positioned over the section's
//      own box). It never covers the header or other sections, never hides
//      the page and never locks scrolling.
//   2. A full-width, swipeable, auto-advancing card carousel with a thin
//      progress bar and a final "explore more" card.
//
// Trigger / coordination (root cause of the earlier overlapping intros):
//   * An intro only starts after its section has been meaningfully visible
//     (>= 55% of it, or >= 60% of the viewport) for DWELL_MS, so scrolling
//     past a section on the way somewhere else never starts it.
//   * While a nav-initiated scroll (`st:navigate` event) is heading to a
//     different section, intros of the sections passed on the way are held.
//   * A module-level coordinator guarantees a single active intro: claiming
//     it cancels (finishes) any other running intro first.
//   * Every timer is owned by a phase effect with cleanup, so no stale
//     callback can restart a previous intro.

import { useCallback, useEffect, useRef, useState } from 'react';
import AgencyLogo from './agencyLogos';
import { useInView, useLowPowerMode, usePageVisible, usePrefersReducedMotion, useMeaningfulVisibility } from './hooks';

const ADVANCE_MS = 5000;
const DWELL_MS = 450;
const LEAD_MS = 1700; // EXPLORE letters + hold
const FADE_MS = 650;
const TITLE_STEP_MS = 700;
const TITLE_HOLD_MS = 1500;
const SHOWCASE_MS = 6500;
const AWAY_FINISH_MS = 1200; // user left the section mid-intro -> finish it quietly
const LETTER_STEP_MS = 45;
const INTERACTION_RESUME_MS = 1500;

// Module-level on purpose: the intro plays once per page visit even if the
// section unmounts/remounts (e.g. a viewport resize across the breakpoint).
const playedIntros = new Set();

// ---- single-active-intro coordinator + navigation awareness -------------
const coordinator = { active: null, navTarget: null, navTimer: null };
const claimIntro = (key, cancel) => {
  if (coordinator.active && coordinator.active.key !== key) coordinator.active.cancel();
  coordinator.active = { key, cancel };
};
const releaseIntro = (key) => {
  if (coordinator.active && coordinator.active.key === key) coordinator.active = null;
};
if (typeof window !== 'undefined' && !window.__stNavListener) {
  window.__stNavListener = true;
  window.addEventListener('st:navigate', (e) => {
    coordinator.navTarget = e.detail;
    clearTimeout(coordinator.navTimer);
    coordinator.navTimer = setTimeout(() => {
      coordinator.navTarget = null;
    }, 1800);
  });
}

const cx = (...parts) => parts.filter(Boolean).join(' ');

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function HeadingLetters({ text, active }) {
  let index = 0;
  return (
    <h2 className={cx('stc-heading', active && 'is-on')} aria-label={text}>
      {text.split(' ').map((word, wi) => (
        <span className="stc-hw" aria-hidden="true" key={`${word}-${wi}`}>
          {word.split('').map((ch) => {
            const i = index++;
            return (
              <span className="stc-letter" key={i} style={{ '--li': i }}>
                {ch}
              </span>
            );
          })}
          {' '}
        </span>
      ))}
    </h2>
  );
}

function Stage({ lead, titleWords, showcase, phase, paused, onSkip, onShowcaseEnd }) {
  const showLead = phase === 'lead' || phase === 'leadOut';
  const showTitle = phase === 'title' || phase === 'titleOut';
  return (
    <div className={cx('stc-stage', paused && 'is-paused')} role="presentation" onClick={onSkip}>
      {showLead && (
        <div className={cx('stc-words', phase === 'leadOut' && 'is-out')} aria-hidden="true">
          {/* only EXPLORE is revealed letter by letter */}
          <div className="stc-word stc-word--lead">
            {lead.split('').map((ch, i) => (
              <span className="stc-lead-letter" style={{ '--i': i }} key={i}>
                {ch}
              </span>
            ))}
          </div>
        </div>
      )}
      {showTitle && (
        <div className={cx('stc-words', phase === 'titleOut' && 'is-out')} aria-hidden="true">
          {titleWords.map((w, i) => (
            <div className="stc-word stc-word--title" style={{ '--i': i }} key={w}>
              {w}
            </div>
          ))}
        </div>
      )}
      {phase === 'showcase' && (
        <div
          className="stc-track"
          style={{ '--n': showcase.length, '--dur': `${SHOWCASE_MS}ms` }}
          onAnimationEnd={(e) => e.target === e.currentTarget && onShowcaseEnd()}
        >
          {showcase.map((s) => (
            <div className="stc-panel" key={s.key}>
              <AgencyLogo id={s.logoId} name={s.label} className="stc-panel-logo" />
              <span className="stc-panel-name">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="stc-skip"
        onClick={(e) => {
          e.stopPropagation();
          onSkip();
        }}
      >
        Skip
      </button>
    </div>
  );
}

function Card({ item, isActive, runVideo, stillOnly, reduced }) {
  const [revealed, setRevealed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);

  // Per-card sequence: identity centred -> moves to corner -> video + info.
  useEffect(() => {
    if (!isActive) {
      setRevealed(false);
      setVideoReady(false);
      return undefined;
    }
    const t = setTimeout(() => setRevealed(true), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [isActive, reduced]);

  // Only the active card ever mounts a <video>; additionally pause it
  // whenever the section is off screen or the tab is hidden.
  const mountVideo = isActive && !stillOnly && !!item.videoSrc;
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (runVideo) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [runVideo, mountVideo]);

  const open = () => item.onOpen && item.onOpen();
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  };

  return (
    <article
      className={cx('stc-card', isActive && 'is-active', revealed && 'is-revealed')}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={`${item.title}. Open detailed information`}
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <div className={cx('stc-media', revealed && 'is-on')} aria-hidden="true">
        {/* still frame: the fallback for reduced-motion / limited devices
            and the backdrop while the video buffers */}
        {isActive && item.posterSrc && (
          <div className="stc-still" style={{ backgroundImage: `url(${item.posterSrc})` }} />
        )}
        {mountVideo && (
          <video
            ref={videoRef}
            className={cx('stc-video', videoReady && 'is-ready')}
            src={item.videoSrc}
            muted
            loop
            playsInline
            preload="metadata"
            poster={item.posterSrc}
            onPlaying={() => setVideoReady(true)}
          />
        )}
      </div>
      <div className="stc-shade" aria-hidden="true" />

      <div className="stc-ident">
        <AgencyLogo id={item.logoId} name={item.title} className="stc-ident-logo" />
        <h3 className="stc-ident-name">{item.title}</h3>
      </div>

      <div className="stc-info">
        {item.kicker && <p className="stc-kicker">{item.kicker}</p>}
        {item.lead && <p className="stc-lead">{item.lead}</p>}
        {item.body && <p className="stc-body">{item.body}</p>}
        {item.meta && item.meta.length > 0 && (
          <ul className="stc-meta">
            {item.meta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <div className="stc-tap">
          <span>Tap for more info</span>
          <ArrowIcon />
        </div>
      </div>
    </article>
  );
}

function FinalCard({ finalCard, isActive }) {
  const open = () => finalCard.onOpen && finalCard.onOpen();
  return (
    <article
      className={cx('stc-card stc-card--final', isActive && 'is-active')}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={finalCard.title}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="stc-final">
        <span className="stc-final-eyebrow">{finalCard.eyebrow}</span>
        <h3 className="stc-final-title">{finalCard.title}</h3>
        <p className="stc-final-hint">{finalCard.hint}</p>
        <span className="stc-final-cta" aria-hidden="true">
          <ArrowIcon />
        </span>
      </div>
    </article>
  );
}

export default function MobileCinematicSection({
  introKey,
  sectionId,
  introLead = 'EXPLORE',
  introWords,
  showcase,
  eyebrow,
  heading,
  items,
  finalCard,
}) {
  const rootRef = useRef(null);
  const scrollerRef = useRef(null);
  const programmaticRef = useRef(false);
  const releaseTimerRef = useRef(null);
  const interactTimerRef = useRef(null);
  const rafRef = useRef(0);

  const reduced = usePrefersReducedMotion();
  const lowPower = useLowPowerMode();
  const pageVisible = usePageVisible();
  const { inView } = useInView(rootRef, { threshold: 0.25 });
  const meaningful = useMeaningfulVisibility(rootRef);

  const [phase, setPhase] = useState(() => (playedIntros.has(introKey) ? 'ready' : 'idle'));
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);

  const total = items.length + 1; // + final "explore more" card
  const letterCount = heading.replace(/ /g, '').length;
  const headingMs = letterCount * LETTER_STEP_MS + 700;
  const titleMs = 900 + (introWords.length - 1) * TITLE_STEP_MS + TITLE_HOLD_MS;

  const stageOpen = ['lead', 'leadOut', 'title', 'titleOut', 'showcase'].includes(phase);

  // ---- 1. start: only after meaningful, sustained visibility -------------
  useEffect(() => {
    if (phase !== 'idle') return undefined;
    if (reduced) {
      playedIntros.add(introKey);
      setPhase('ready');
      return undefined;
    }
    if (!meaningful || !pageVisible) return undefined;
    let t;
    const attempt = () => {
      // a nav-initiated scroll toward ANOTHER section is still in flight:
      // we are only being scrolled past, so keep waiting.
      if (coordinator.navTarget && coordinator.navTarget !== sectionId) {
        t = setTimeout(attempt, 300);
        return;
      }
      playedIntros.add(introKey);
      claimIntro(introKey, () => setPhase('ready'));
      setPhase('lead');
    };
    t = setTimeout(attempt, DWELL_MS);
    return () => clearTimeout(t);
  }, [phase, meaningful, pageVisible, reduced, introKey, sectionId]);

  // ---- 2. phase timers (each phase owns its timer; cleanup cancels it) ----
  useEffect(() => {
    if (!stageOpen && phase !== 'heading') return undefined;
    if (stageOpen && !meaningful) return undefined; // paused while off screen
    let t;
    if (phase === 'lead') t = setTimeout(() => setPhase('leadOut'), LEAD_MS);
    else if (phase === 'leadOut') t = setTimeout(() => setPhase('title'), FADE_MS);
    else if (phase === 'title') t = setTimeout(() => setPhase('titleOut'), titleMs);
    else if (phase === 'titleOut') t = setTimeout(() => setPhase('showcase'), FADE_MS);
    else if (phase === 'showcase') t = setTimeout(() => setPhase('heading'), SHOWCASE_MS + 1500); // safety net
    else if (phase === 'heading') t = setTimeout(() => setPhase('ready'), headingMs);
    return () => clearTimeout(t);
  }, [phase, stageOpen, meaningful, titleMs, headingMs]);

  // ---- 3. user left the section mid-intro: finish quietly, never resume ----
  useEffect(() => {
    if (!stageOpen || meaningful) return undefined;
    const t = setTimeout(() => setPhase('ready'), AWAY_FINISH_MS);
    return () => clearTimeout(t);
  }, [stageOpen, meaningful]);

  // ---- 4. release the global claim whenever this intro is over / unmounted --
  useEffect(() => {
    if (phase === 'ready') releaseIntro(introKey);
  }, [phase, introKey]);
  useEffect(() => () => releaseIntro(introKey), [introKey]);

  const skip = useCallback(
    () => setPhase((p) => (['lead', 'leadOut', 'title', 'titleOut', 'showcase'].includes(p) ? 'heading' : p)),
    []
  );
  const endShowcase = useCallback(() => setPhase((p) => (p === 'showcase' ? 'heading' : p)), []);

  const headingOn = phase === 'heading' || phase === 'ready';
  const carouselOn = phase === 'ready';

  // ---- carousel ----------------------------------------------------------
  const goTo = useCallback(
    (index, instant) => {
      const el = scrollerRef.current;
      if (!el) return;
      programmaticRef.current = true;
      setActive(index);
      el.scrollTo({ left: index * el.clientWidth, behavior: instant || reduced ? 'auto' : 'smooth' });
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = setTimeout(() => {
        programmaticRef.current = false;
      }, instant || reduced ? 80 : 750);
    },
    [reduced]
  );

  const markInteraction = useCallback(() => {
    setInteracting(true);
    clearTimeout(interactTimerRef.current);
    interactTimerRef.current = setTimeout(() => setInteracting(false), INTERACTION_RESUME_MS);
  }, []);

  const onScroll = useCallback(() => {
    if (programmaticRef.current) return;
    markInteraction();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
      const idx = Math.max(0, Math.min(total - 1, Math.round(el.scrollLeft / el.clientWidth)));
      setActive((cur) => (cur === idx ? cur : idx));
    });
  }, [markInteraction, total]);

  // keep the current card aligned if the viewport is resized / rotated
  useEffect(() => {
    const onResize = () => {
      const el = scrollerRef.current;
      if (el) el.scrollLeft = active * el.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  useEffect(
    () => () => {
      clearTimeout(releaseTimerRef.current);
      clearTimeout(interactTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const autoplay = carouselOn && inView && pageVisible && !reduced;
  const paused = !autoplay || interacting;

  const advance = () => {
    const next = (active + 1) % total;
    goTo(next, next === 0);
  };

  const stillOnly = lowPower || reduced;
  const runVideo = carouselOn && inView && pageVisible;

  return (
    <div className="stc-root" ref={rootRef} data-intro-phase={phase}>
      <span className={cx('stc-eyebrow', headingOn && 'is-on')}>{eyebrow}</span>
      <HeadingLetters text={heading} active={headingOn} />

      <div className={cx('stc-carousel-wrap', carouselOn && 'is-on')}>
        <div
          className="stc-carousel"
          ref={scrollerRef}
          onScroll={onScroll}
          onPointerDown={markInteraction}
          role="region"
          aria-roledescription="carousel"
          aria-label={heading}
        >
          {items.map((item, i) => (
            <div className="stc-slide" key={item.key} aria-hidden={active !== i}>
              <Card
                item={item}
                isActive={carouselOn && active === i}
                runVideo={runVideo && active === i}
                stillOnly={stillOnly}
                reduced={reduced}
              />
            </div>
          ))}
          <div className="stc-slide" aria-hidden={active !== items.length}>
            <FinalCard finalCard={finalCard} isActive={carouselOn && active === items.length} />
          </div>
        </div>

        <div className="stc-progress" role="progressbar" aria-label="Carousel progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={active + 1}>
          <span className="stc-progress-base" style={{ transform: `scaleX(${active / total})` }} />
          <span className="stc-progress-seg" style={{ left: `${(active / total) * 100}%`, width: `${100 / total}%` }}>
            <i
              key={active}
              className={cx(autoplay && 'is-running')}
              style={{ animationDuration: `${ADVANCE_MS}ms`, animationPlayState: paused ? 'paused' : 'running' }}
              onAnimationEnd={advance}
            />
          </span>
        </div>
      </div>

      {stageOpen && (
        <Stage
          lead={introLead}
          titleWords={introWords}
          showcase={showcase}
          phase={phase}
          paused={!meaningful}
          onSkip={skip}
          onShowcaseEnd={endShowcase}
        />
      )}
    </div>
  );
}
