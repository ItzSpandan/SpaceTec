export const metadata = {
  title: 'SpaceTec - Global Space Intelligence Hub',
  description: 'Explore satellites, launches, missions, spacecraft, rockets, astronauts, space agencies, astronomy, space weather, and space news in one unified platform.',
};

import Providers from './components/Providers';
import { Orbitron, Space_Grotesk } from 'next/font/google';

// Self-hosted via next/font instead of a <link> to fonts.googleapis.com.
// This removes the extra render-blocking network round trip AND — more
// importantly for the intro bug — next/font computes matched fallback-font
// metrics (ascent/descent/size-adjust) at build time, so the fallback font
// occupies the exact same box as the real font before it's ready. There is
// no font-swap-driven reflow for Framer Motion's layoutId projection to
// mismeasure. Weights match what was previously requested from Google Fonts.
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
  variable: '--font-orbitron',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/*
          Canonical SpaceTec brand wordmark tokens.
          Every "SPACETEC" wordmark across the app (header, intros, page
          transitions, loading screens, etc.) reads these CSS variables so
          the typography treatment stays identical everywhere. Letter
          spacing is in `em` units so it scales proportionally with
          whatever font-size a given wordmark instance uses.
        */}
        <style>{`
          :root {
            --wordmark-font-family: var(--font-orbitron), 'Space Grotesk', -apple-system, sans-serif;
            --wordmark-font-weight: 600;
            --wordmark-letter-spacing: 0.22em;
            --wordmark-color: #ffffff;
          }
          .spacetec-wordmark {
            font-family: var(--wordmark-font-family);
            font-weight: var(--wordmark-font-weight);
            text-transform: uppercase;
            letter-spacing: var(--wordmark-letter-spacing);
            color: var(--wordmark-color);
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#000000', fontFamily: 'var(--font-space-grotesk), -apple-system, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
