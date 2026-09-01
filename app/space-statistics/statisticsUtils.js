// Pure helper functions for the Space Statistics page. No fetching, no
// React — just turning the /api/space-statistics payload into chart-ready
// shapes and short, data-driven analysis sentences.

export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'DATA UNAVAILABLE';
  return n.toLocaleString('en-US');
}

export function formatPercent(fraction, digits = 0) {
  if (fraction === null || fraction === undefined || Number.isNaN(fraction)) return 'DATA UNAVAILABLE';
  return `${(fraction * 100).toFixed(digits)}%`;
}

// Converts [[label, value], ...] entry pairs (as returned by the API) into
// the {label, value} shape the chart components expect.
export function entriesToChartData(entries) {
  if (!entries) return [];
  return entries.map(([label, value]) => ({ label, value }));
}

export function shareOfTotal(entries) {
  if (!entries || entries.length === 0) return [];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return [];
  return entries.map(([label, value]) => ({ label, value, share: value / total }));
}

// --- Analysis sentence generators --------------------------------------------
// Every sentence here is derived directly from the numbers passed in. If the
// numbers don't support a claim, we fall back to the standard
// "Insufficient data" message rather than guessing.

export function analyzeTrend(byYearEntries, subject) {
  if (!byYearEntries || byYearEntries.length < 3) {
    return 'Insufficient data for meaningful analysis.';
  }
  const years = byYearEntries.map(([, v]) => v);
  const midpoint = Math.floor(years.length / 2);
  const firstHalfAvg = years.slice(0, midpoint).reduce((s, v) => s + v, 0) / Math.max(1, midpoint);
  const secondHalfAvg = years.slice(midpoint).reduce((s, v) => s + v, 0) / Math.max(1, years.length - midpoint);

  if (secondHalfAvg > firstHalfAvg * 1.15) {
    return `${subject} activity has increased over the period shown (${byYearEntries[0][0]}\u2013${byYearEntries[byYearEntries.length - 1][0]}).`;
  }
  if (secondHalfAvg < firstHalfAvg * 0.85) {
    return `${subject} activity has declined over the period shown (${byYearEntries[0][0]}\u2013${byYearEntries[byYearEntries.length - 1][0]}).`;
  }
  return `${subject} activity has stayed relatively steady over the period shown (${byYearEntries[0][0]}\u2013${byYearEntries[byYearEntries.length - 1][0]}).`;
}

export function analyzeDominantShare(entries, subjectSingular, subjectPlural) {
  const shares = shareOfTotal(entries);
  if (shares.length === 0) return 'Insufficient data for meaningful analysis.';
  const top = shares[0];
  if (top.share >= 0.5) {
    return `${top.label} accounts for a majority of recorded ${subjectPlural} (${formatPercent(top.share)}).`;
  }
  if (top.share >= 0.25) {
    return `${top.label} accounts for a substantial share of recorded ${subjectPlural} (${formatPercent(top.share)}), more than any other ${subjectSingular}.`;
  }
  if (shares.length > 1) {
    return `No single ${subjectSingular} dominates; ${top.label} leads with ${formatPercent(top.share)} of recorded ${subjectPlural}.`;
  }
  return 'Insufficient data for meaningful analysis.';
}

export function analyzeSuccessRate(rate, decidedCount) {
  if (rate === null || rate === undefined || !decidedCount || decidedCount < 5) {
    return 'Insufficient data for a meaningful success-rate calculation.';
  }
  return `${formatPercent(rate)} of the ${formatNumber(decidedCount)} launches with a known outcome were successful.`;
}
