'use client';

// Identity lockup (logo OR name, never both) for the mobile "Explore Space
// Agencies" / "Explore Launchpads" cards.
//
// Logos are NOT drawn in code: they are the real brand files in
// /public/agency-logos/. Only agencies listed in AGENCY_LOGO_FILES have an
// authentic asset; every other agency (and every launchpad) is shown as its
// name in plain text. A logo is turned white with a CSS filter, which keeps
// its original shape and proportions exactly.
//
// The name is rendered exactly once: as the image's accessible name when the
// logo is shown, or as visible text when it is not.

const AGENCY_LOGO_FILES = {
  nasa: 'svg',
  isro: 'svg',
  spacex: 'svg',
};

export const hasAgencyLogo = (id) => Boolean(id && AGENCY_LOGO_FILES[id]);

export default function AgencyIdentity({ id, name, nameClassName, logoClassName }) {
  if (hasAgencyLogo(id)) {
    return (
      <h3 className={nameClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`${logoClassName || ''} stc-logo-img`}
          src={`/${id}.${AGENCY_LOGO_FILES[id]}`}
          alt={name}
          draggable={false}
        />
      </h3>
    );
  }
  return <h3 className={nameClassName}>{name}</h3>;
}
