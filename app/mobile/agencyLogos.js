'use client';

// Monochrome (white) agency identity marks for the mobile "Explore Space
// Agencies" showcase and cards.
//
// The project ships no logo files (only HQ photos), so these are simplified
// single-colour renditions drawn as SVG — each keeps its agency's distinctive
// construction (NASA's circular emblem with chevron and orbit, ESA's
// lowercase mark, SpaceX's slashed X with a trailing arc, etc.) at a
// consistent 2:1 proportion. They use `currentColor`, so the surrounding CSS
// decides the (white) colour. To swap in official artwork, replace the entry
// for that id below — nothing else needs to change.

const wrap = (children) => (props) => (
  <svg
    viewBox="0 0 200 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
);

const wordmark = {
  fontFamily: 'var(--wordmark-font-family, "Orbitron", "Space Grotesk", sans-serif)',
  fontWeight: 700,
  fill: 'currentColor',
  stroke: 'none',
};

const NASA = wrap(
  <>
    <title>NASA</title>
    <circle cx="100" cy="38" r="30" />
    <ellipse cx="100" cy="38" rx="42" ry="11" transform="rotate(-24 100 38)" />
    <path d="M76 55 L100 21 L124 55 L100 46 Z" fill="currentColor" stroke="none" opacity="0.92" />
    <circle cx="80" cy="26" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="121" cy="24" r="1.2" fill="currentColor" stroke="none" />
    <text x="100" y="92" textAnchor="middle" fontSize="22" style={wordmark} textLength="78" lengthAdjust="spacingAndGlyphs">NASA</text>
  </>
);

const ESA = wrap(
  <>
    <title>ESA</title>
    <rect x="46" y="18" width="108" height="64" rx="6" />
    <text x="100" y="63" textAnchor="middle" fontSize="40" style={{ ...wordmark, fontWeight: 600, textTransform: 'lowercase' }} textLength="78" lengthAdjust="spacingAndGlyphs">esa</text>
    <path d="M60 30 H88" />
  </>
);

const ISRO = wrap(
  <>
    <title>ISRO</title>
    <path d="M18 62 C 46 24, 100 20, 182 46" strokeWidth="5" />
    <path d="M18 74 C 56 42, 108 40, 182 62" strokeWidth="3" opacity="0.7" />
    <text x="100" y="92" textAnchor="middle" fontSize="26" style={wordmark} textLength="96" lengthAdjust="spacingAndGlyphs">ISRO</text>
  </>
);

const CNSA = wrap(
  <>
    <title>CNSA</title>
    <circle cx="100" cy="46" r="34" />
    <circle cx="100" cy="46" r="24" opacity="0.6" />
    <path d="M70 56 C 86 22, 118 22, 132 40" strokeWidth="4" />
    <path d="M100 34 l3.6 8 8.6 .9 -6.5 5.7 1.9 8.5 -7.6 -4.5 -7.6 4.5 1.9 -8.5 -6.5 -5.7 8.6 -.9 Z" fill="currentColor" stroke="none" />
    <text x="100" y="95" textAnchor="middle" fontSize="15" letterSpacing="2" style={wordmark} textLength="64" lengthAdjust="spacingAndGlyphs">CNSA</text>
  </>
);

const SPACEX = wrap(
  <>
    <title>SpaceX</title>
    <text x="10" y="58" fontSize="24" style={wordmark} textLength="106" lengthAdjust="spacingAndGlyphs">SPACE</text>
    <path d="M124 36 L160 68 M160 36 L124 68" strokeWidth="6.5" />
    <path d="M118 78 C 152 76, 182 62, 192 30" strokeWidth="2.6" opacity="0.85" />
  </>
);

const JAXA = wrap(
  <>
    <title>JAXA</title>
    <text x="100" y="62" textAnchor="middle" fontSize="34" style={wordmark} textLength="120" lengthAdjust="spacingAndGlyphs">JAXA</text>
    <path d="M24 30 C 70 6, 140 6, 176 30" strokeWidth="4" />
    <circle cx="176" cy="30" r="3.2" fill="currentColor" stroke="none" />
  </>
);

// Generic launch-site mark (a pad + gantry) used by the Launchpad intro.
const PAD = wrap(
  <>
    <title>Launchpad</title>
    <path d="M100 14 c10 8 15 20 15 34 v14 h-30 v-14 c0 -14 5 -26 15 -34 Z" />
    <circle cx="100" cy="38" r="5" />
    <path d="M85 56 l-12 14 M115 56 l12 14" />
    <path d="M62 82 H138" strokeWidth="3.4" />
    <path d="M150 20 V82 M150 28 H172 M150 44 H172 M150 60 H172 M150 76 L172 60" opacity="0.6" />
  </>
);

const LOGOS = { nasa: NASA, esa: ESA, isro: ISRO, cnsa: CNSA, spacex: SPACEX, jaxa: JAXA, pad: PAD };

export default function AgencyLogo({ id, className, style }) {
  const Logo = LOGOS[id] || LOGOS.pad;
  return <Logo className={className} style={style} aria-hidden="true" />;
}
