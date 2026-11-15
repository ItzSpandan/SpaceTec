'use client';

// Phone-only wrappers that map the EXISTING agency / launchpad records onto
// the shared MobileCinematicSection. No data is created here — every field
// shown comes from allAgencies (space-agencies/agencyData.js) and the
// homepage's existing major-launchpad list + live weather rows.

import MobileCinematicSection from './MobileCinematicSection';

// Strip the colourful status emoji ("🟢 Active") so the mobile UI stays
// strictly black-and-white.
const plainStatus = (status) => (status || '').replace(/[^\p{L}\p{N}\s/]/gu, '').trim();

export function MobileAgenciesSection({ agencies, onOpenAgency, onExploreMore }) {
  const items = agencies.map((a) => ({
    key: a.id,
    logoId: a.id,
    title: a.name,
    kicker: a.tagline,
    lead: a.specialty,
    body: a.brief,
    meta: a.logoText ? [a.logoText] : [],
    videoSrc: a.videoUrl,
    posterSrc: a.hqImage,
    onOpen: () => onOpenAgency(a),
  }));

  // Name-card order requested in the brief: NASA, ISRO, ESA, SpaceX, JAXA, CNSA.
  const order = ['nasa', 'isro', 'esa', 'spacex', 'jaxa', 'cnsa'];
  const names = order
    .map((id) => agencies.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => ({ key: a.id, label: a.name }));

  return (
    <MobileCinematicSection
      introKey="agencies"
      introWords={['EXPLORE', 'SPACE', 'AGENCIES']}
      names={names}
      eyebrow="// GLOBAL AEROSPACE ARCHITECTURE"
      heading="EXPLORE SPACE AGENCIES"
      items={items}
      finalCard={{
        eyebrow: 'Full directory',
        title: 'EXPLORE MORE AGENCIES',
        hint: 'Every agency and company, with full profiles',
        onOpen: () => onExploreMore(),
      }}
    />
  );
}

export function MobileLaunchpadsSection({ pads, weatherById, onOpenPad, onExploreMore }) {
  const items = pads.map((p) => {
    const w = weatherById && weatherById[p.id];
    const meta = [plainStatus(p.status), p.country];
    if (w) meta.push(`${w.temperature} · ${w.humidity} · ${w.wind_speed}`);
    return {
      key: p.id,
      logoId: null, // launchpads show their name as plain text, never a logo
      title: p.name,
      kicker: p.tagline,
      lead: `${p.country} // ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}`,
      body: p.history,
      meta: meta.filter(Boolean),
      // Background photo: upload /public/pad-<id>.jpg (e.g. pad-ksc.jpg).
      // Until a file exists the card simply stays plain black glass.
      posterSrc: `/pad-${p.id}.jpg`,
      onOpen: () => onOpenPad(p),
    };
  });

  const names = pads.map((p) => ({ key: p.id, label: p.name }));

  return (
    <MobileCinematicSection
      introKey="launchpads"
      introWords={['EXPLORE', 'LAUNCHPADS']}
      names={names}
      eyebrow="// GLOBAL GROUND INFRASTRUCTURE"
      heading="EXPLORE LAUNCHPADS"
      items={items}
      finalCard={{
        eyebrow: 'Full directory',
        title: 'EXPLORE MORE LAUNCHPADS',
        hint: 'Every launch site worldwide, with live conditions',
        onOpen: () => onExploreMore(),
      }}
    />
  );
}
