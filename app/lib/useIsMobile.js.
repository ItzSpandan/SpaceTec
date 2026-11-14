'use client';

import { useState, useEffect } from 'react';

// Single source of truth for the phone breakpoint. Keep in sync with the
// @media (max-width: 767px) block in app/mobile/mobile.css.
export const MOBILE_QUERY = '(max-width: 767px)';

// Returns true only on phone-width viewports. It starts as `false` (so the
// server render and the first client render are always the unchanged
// desktop tree) and flips after mount if the viewport is phone-sized.
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  return isMobile;
}
