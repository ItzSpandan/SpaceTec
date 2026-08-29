// Self-contained lunar phase calculation.
//
// Uses a known new-moon reference epoch and the mean synodic month length to
// derive the Moon's current age/phase without calling any external API.
// Accurate to within a few hours, which is more than sufficient for a
// "what does the sky look like tonight" style feature.

const SYNODIC_MONTH_DAYS = 29.530588861;
// A known new moon: 2000-01-06 18:14 UTC.
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const DAY_MS = 24 * 60 * 60 * 1000;

function phaseNameForFraction(fraction) {
  // fraction: 0 = new moon, 0.5 = full moon, wraps at 1 = new moon again.
  if (fraction < 0.02 || fraction >= 0.98) return 'New Moon';
  if (fraction < 0.24) return 'Waxing Crescent';
  if (fraction < 0.26) return 'First Quarter';
  if (fraction < 0.49) return 'Waxing Gibbous';
  if (fraction < 0.51) return 'Full Moon';
  if (fraction < 0.74) return 'Waning Gibbous';
  if (fraction < 0.76) return 'Last Quarter';
  return 'Waning Crescent';
}

export function getMoonPhase(date = new Date()) {
  const elapsedDays = (date.getTime() - REFERENCE_NEW_MOON_MS) / DAY_MS;
  const cyclesElapsed = elapsedDays / SYNODIC_MONTH_DAYS;
  const fraction = cyclesElapsed - Math.floor(cyclesElapsed); // 0..1
  const ageDays = fraction * SYNODIC_MONTH_DAYS;

  // Illumination: 0% at new moon, 100% at full moon, following a smooth
  // cosine curve across the synodic cycle.
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;

  // Next new moon: next point where fraction wraps back to 0.
  const daysToNextNew = SYNODIC_MONTH_DAYS - ageDays;
  const nextNewMoon = new Date(date.getTime() + daysToNextNew * DAY_MS);

  // Next full moon: next point where fraction crosses 0.5.
  const daysToNextFull =
    fraction < 0.5
      ? (0.5 - fraction) * SYNODIC_MONTH_DAYS
      : (1.5 - fraction) * SYNODIC_MONTH_DAYS;
  const nextFullMoon = new Date(date.getTime() + daysToNextFull * DAY_MS);

  return {
    phaseName: phaseNameForFraction(fraction),
    illuminationPct: Math.round(illumination * 100),
    ageDays: Math.round(ageDays * 10) / 10,
    fraction: Math.round(fraction * 1000) / 1000,
    nextNewMoon: nextNewMoon.toISOString(),
    nextFullMoon: nextFullMoon.toISOString(),
  };
}
