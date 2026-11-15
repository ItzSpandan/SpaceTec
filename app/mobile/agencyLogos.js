'use client';

import { useState } from 'react';

// Identity lockup (logo OR name, never both) for the mobile agency cards.
//
// Logos are real brand files placed directly in /public. For each agency in
// LOGO_AGENCIES the card tries /<id>.svg, then /<id>.png. If neither file
// exists (or fails to load) the agency name is shown as plain text instead,
// so nothing breaks while a logo is still missing.
//
// To add a logo later: upload esa.svg (or esa.png), jaxa.svg, cnsa.svg into
// /public. No code change needed.
//
// The name is rendered exactly once: as the image's accessible name when the
// logo is shown, or as visible text when it is not.

const LOGO_AGENCIES = ['nasa', 'isro', 'esa', 'spacex', 'jaxa', 'cnsa'];
const EXTENSIONS = ['svg', 'png'];

export const hasAgencyLogo = (id) => LOGO_AGENCIES.includes(id);

export default function AgencyIdentity({ id, name, nameClassName, logoClassName }) {
  const [extIndex, setExtIndex] = useState(0);

  if (hasAgencyLogo(id) && extIndex < EXTENSIONS.length) {
    return (
      <h3 className={nameClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`${logoClassName || ''} stc-logo-img`}
          src={`/${id}.${EXTENSIONS[extIndex]}`}
          alt={name}
          draggable={false}
          onError={() => setExtIndex((i) => i + 1)}
        />
      </h3>
    );
  }
  return <h3 className={nameClassName}>{name}</h3>;
}
