'use client';

import { useEffect, useState } from 'react';

// Small shared hooks for the mobile cinematic sections / search screen.

// True when the user asked the OS to minimise motion. Updates live.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);
  return reduced;
}

// Heuristic for "limited performance" devices: Data Saver, a slow
// connection, or very little memory / CPU. Used to swap background video
// for the still image and to skip heavy effects.
export function useLowPowerMode() {
  const [low, setLow] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const slow = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') || conn.effectiveType === '3g');
    const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
    const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    setLow(Boolean(slow || lowMem || lowCpu));
  }, []);
  return low;
}

// Tracks whether an element is currently (sufficiently) on screen.
// `once` additionally reports `seen`, which flips to true the first time and
// never flips back — that is what the one-time introductions key off.
export function useInView(ref, { threshold = 0.3, rootMargin = '0px' } = {}) {
  const [inView, setInView] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      // very old browsers: behave as if always visible
      setInView(true);
      setSeen(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);
  return { inView, seen };
}

// True while the browser tab is in the foreground.
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const update = () => setVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return visible;
}

// True while a "meaningful" part of the element is on screen: at least
// `minRatio` of the element itself, or (for elements taller than the
// viewport) at least 60% of the viewport height. Used to decide when a
// section's introduction may start / must pause.
export function useMeaningfulVisibility(ref, minRatio = 0.55) {
  const [meaningful, setMeaningful] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const vh = window.innerHeight || 1;
        setMeaningful(
          entry.isIntersecting &&
            (entry.intersectionRatio >= minRatio || entry.intersectionRect.height >= vh * 0.6)
        );
      },
      { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, minRatio]);
  return meaningful;
}
