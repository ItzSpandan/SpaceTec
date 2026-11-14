'use client';

import { useEffect, useState } from 'react';

// Official agency marks for the mobile "Explore Space Agencies" section.
//
// Logos are NOT drawn in code: they are the real brand files in
// /public/agency-logos/<id>.svg (or .png). Any logo with a transparent
// background is turned white with a CSS filter (brightness(0) invert(1)),
// which keeps its original shape and proportions exactly.
//
// If no file exists for an agency yet, the agency name is shown as plain
// text instead — never a re-drawn or approximated logo.
//
// Launchpad cards use the generic launch-site pictogram (`pad`), which is an
// icon, not a brand logo.

const EXTENSIONS = ['svg', 'png'];

const PadGlyph = (props) => (
  <svg viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M100 14c10 8 15 20 15 34v14H85V48c0-14 5-26 15-34Z" />
    <circle cx="100" cy="38" r="5" />
    <path d="M85 56 73 70M115 56l12 14" />
    <path d="M62 82h76" strokeWidth="3.4" />
    <path d="M150 20v62M150 28h22M150 44h22M150 60h22M150 76l22-16" opacity="0.6" />
  </svg>
);

export default function AgencyLogo({ id, name, className, style }) {
  const [extIndex, setExtIndex] = useState(0);
  useEffect(() => setExtIndex(0), [id]);

  if (id === 'pad') return <PadGlyph className={className} style={style} aria-hidden="true" />;

  if (extIndex >= EXTENSIONS.length) {
    // no official asset available for this agency (yet): plain text name
    return (
      <span className={`${className || ''} stc-logo-text`} style={style} aria-hidden="true">
        {name || id}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`${className || ''} stc-logo-img`}
      style={style}
      src={`/agency-logos/${id}.${EXTENSIONS[extIndex]}`}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setExtIndex((i) => i + 1)}
    />
  );
}
