'use client';

import { useEffect } from 'react';

// Forces a real, synchronous browser repaint. Some Chromium/WebKit builds
// "hold" the previous frame on screen while the main thread is busy right
// after a fresh load (fonts, background images, canvas star-fields, and
// framer-motion all initializing at once) — React can have already
// committed the correct DOM (auth resolved, intro finished) while the
// screen keeps showing the old frame until an input event forces the
// browser to flush it. That's the "it's stuck until I click anywhere"
// symptom. This nudges the compositor directly instead of waiting for a
// click: toggling a transform forces a new GPU layer paint, and reading
// offsetHeight forces a synchronous layout pass.
function forceRepaint() {
  if (typeof document === 'undefined' || !document.body) return;
  const { body } = document;
  const prevTransform = body.style.transform;
  body.style.transform = 'translateZ(0)';
  // eslint-disable-next-line no-unused-expressions
  body.offsetHeight; // force synchronous layout
  requestAnimationFrame(() => {
    body.style.transform = prevTransform;
  });
}

export default function PaintUnstick() {
  useEffect(() => {
    // Nudge repeatedly during the critical first few seconds after any
    // page load/navigation, when the main thread is most likely to be busy
    // and a frame could get stuck. Stops on its own — this is not meant to
    // run for the life of the page.
    const nudgeInterval = setInterval(forceRepaint, 400);
    const stopNudging = setTimeout(() => clearInterval(nudgeInterval), 8000);

    // Also nudge whenever the tab becomes visible/focused again — covers
    // background-tab throttling, where rendering can pause entirely until
    // the tab is active.
    const onVisible = () => {
      if (document.visibilityState === 'visible') forceRepaint();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', forceRepaint);
    window.addEventListener('pageshow', forceRepaint);

    return () => {
      clearInterval(nudgeInterval);
      clearTimeout(stopNudging);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', forceRepaint);
      window.removeEventListener('pageshow', forceRepaint);
    };
  }, []);

  return null;
}
