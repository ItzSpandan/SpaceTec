'use client';

// MobileCinematicSection — the phone-only presentation shared by the
// "Explore Space Agencies" and "Explore Launchpads" homepage sections.
//
//   1. Cinematic introduction (plays ONCE per page visit, started by an
//      IntersectionObserver): a centred word stack fades in/out, then a row
//      of identity panels slides right-to-left, then the section heading is
//      revealed letter by letter, then the carousel fades in.
//   2. A full-width, swipeable, auto-advancing card carousel with a thin
//      progress bar and a final "explore more" card.
//
// It is data-agnostic: callers pass already-existing agency / launchpad
// records mapped into `items`. Only CSS transforms and opacity are animated;
// styles live in app/mobile/mobile-cinematic.css.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AgencyLogo from './agencyLogos';
import { useInView, useLowPowerMode, usePageVisible, usePrefersReducedMotion } from './hooks';

const ADVANCE_MS = 5000;
const WORDS_HOLD_MS = 2600;
const WORDS_FADE_MS = 800;
const SHOWCASE_MS = 7500;
const LETTER_STEP_MS = 45;
const INTERACTION_RESUME_MS = 1500;

// Module-level on purpose: the intro plays once per page visit even if the
// section unmounts/remounts (e.g. a viewport resize across the breakpoint).
const playedIntros = new Set();

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

function Stage({ words, showcase, phase, onSkip, onShowcaseEnd }) {
  const showWords = phase === 'words' || phase === 'wordsOut';
  return (
    <div className="stc-stage" role="presentation" onClick={onSkip}>
      {showWords && (
        <div className={cx('stc-words', phase === 'wordsOut' && 'is-out')} aria-hidden="true">
          {words.map((w, i) => (
            <div className="stc-word" style={{ '--i': i }} key={w}>
              {w}
            </div>
          ))}
        </div>
      )}
      {phase === 'showcase' && (
        <div className="stc-track" style={{ '--n': showcase.length, '--dur': `${SHOWCASE_MS}ms` }} onAnimationEnd={onShowcaseEnd}>
          {showcase.map((s) => (
            <div className="stc-panel" key={s.key}>
              <AgencyLogo id={s.logoId} className="stc-panel-logo" />
              <span className="stc-panel-name">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="stc-skip" onClick={onSkip}>
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
        <AgencyLogo id={item.logoId} className="stc-ident-logo" />
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
  const { inView, seen } = useInView(rootRef, { threshold: 0.25 });

  const [phase, setPhase] = useState(() => (playedIntros.has(introKey) ? 'ready' : 'idle'));
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(0);
  const [interacting, setInteracting] = useState(false);

  const total = items.length + 1; // + final "explore more" card
  const letterCount = heading.replace(/ /g, '').length;
  const headingMs = letterCount * LETTER_STEP_MS + 700;

  useEffect(() => setMounted(true), []);

  // ---- introduction state machine --------------------------------------
  useEffect(() => {
    if (phase !== 'idle' || !seen) return;
    playedIntros.add(introKey);
    setPhase(reduced ? 'ready' : 'words');
  }, [phase, seen, reduced, introKey]);

  useEffect(() => {
    let t;
    if (phase === 'words') t = setTimeout(() => setPhase('wordsOut'), WORDS_HOLD_MS);
    else if (phase === 'wordsOut') t = setTimeout(() => setPhase('showcase'), WORDS_FADE_MS);
    else if (phase === 'showcase') t = setTimeout(() => setPhase('heading'), SHOWCASE_MS + 1500); // safety net
    else if (phase === 'heading') t = setTimeout(() => setPhase('ready'), headingMs);
    return () => clearTimeout(t);
  }, [phase, headingMs]);

  const stageOpen = phase === 'words' || phase === 'wordsOut' || phase === 'showcase';
  const skip = useCallback(() => setPhase((p) => (p === 'words' || p === 'wordsOut' || p === 'showcase' ? 'heading' : p)), []);

  // Full-screen stage: hide the page underneath (so the real starfield shows
  // through) and lock scrolling while it plays.
  useEffect(() => {
    if (!stageOpen) return undefined;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.classList.add('stc-stage-open');
    root.style.overflow = 'hidden';
    return () => {
      root.classList.remove('stc-stage-open');
      root.style.overflow = prevOverflow;
    };
  }, [stageOpen]);

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
    <div className="stc-root" ref={rootRef}>
      <span className="stc-eyebrow">{eyebrow}</span>
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

      {mounted &&
        stageOpen &&
        createPortal(
          <Stage words={introWords} showcase={showcase} phase={phase} onSkip={skip} onShowcaseEnd={() => setPhase('heading')} />,
          document.body
        )}
    </div>
  );
}
