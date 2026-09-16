// Resolves the `?agency=<id>` query param that agency-profile "VIEW X
// DATABASE" links pass along (see space-agencies/AgencyDirectory.js) into
// whichever exact value a specific database's own `agency` filter already
// recognizes. Never invents a relationship: if nothing in that database's
// own option list matches, it returns null and the database falls back to
// its normal, unfiltered view exactly as before.

import { agencyDirectory } from '../space-agencies/agencyData';

// A few agencies show up under a different name in some databases' existing
// data than in the SpaceTec agency directory (e.g. the astronaut database
// credits ESA as "European Space Agency" rather than "ESA"). This is purely
// descriptive — the agency's own other/official name, not new data.
const AGENCY_NAME_VARIANTS = {
  esa: ['European Space Agency'],
  uksa: ['UK Space Agency'],
  uaesa: ['UAE Space Agency'],
};

// Returns the human-readable name a rocket/mission/etc. database is most
// likely to know an agency by, for use as free-text search input. Falls
// back to the raw id if the agency isn't in the existing directory.
export function agencyDisplayName(agencyId) {
  if (!agencyId) return null;
  const entry = agencyDirectory.find((a) => a.id === agencyId);
  return entry?.name || agencyId;
}

// Matches `agencyId` against a database's own list of exact filter option
// strings (e.g. the unique `agency` values already used to populate that
// database's dropdown). Returns one of those exact option strings, or null.
export function resolveAgencyFilterValue(agencyId, options) {
  if (!agencyId || !Array.isArray(options) || options.length === 0) return null;

  const entry = agencyDirectory.find((a) => a.id === agencyId);
  const candidates = [agencyId, entry?.name, ...(AGENCY_NAME_VARIANTS[agencyId] || [])]
    .filter(Boolean)
    .map((c) => c.toLowerCase());

  const exact = options.find((option) => candidates.includes(option.toLowerCase()));
  if (exact) return exact;

  // Otherwise, look for the agency as its own component of a joint
  // attribution (e.g. "NASA / ESA"), rather than a raw substring match that
  // could falsely match an unrelated option.
  const tokenMatch = options.find((option) =>
    option
      .split('/')
      .map((part) => part.trim().toLowerCase())
      .some((part) => candidates.includes(part))
  );
  return tokenMatch || null;
}
