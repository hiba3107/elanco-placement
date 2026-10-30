// Pure helpers for filter values, kept apart from state.js so they can be
// tested without a browser.

export function countActiveFilters({ from, to, species, severity }) {
  return [from, to].filter(Boolean).length + species.length + severity.length;
}

const SEVERITY_BANDS = Object.freeze(["high", "medium", "low"]);

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealDay(day) {
  if (typeof day !== "string" || !DAY_PATTERN.test(day)) {
    return false;
  }
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/**
 * Keeps only filter values that exist, because a shared or hand-edited link
 * could contain anything. Returns the cleaned filters and whether anything
 * had to be dropped, so the page can say so instead of failing silently.
 */
export function sanitiseFilters(filters, speciesNames) {
  const cleaned = {
    from: isRealDay(filters.from) ? filters.from : null,
    to: isRealDay(filters.to) ? filters.to : null,
    species: [...new Set(filters.species.filter((name) => speciesNames.includes(name)))],
    severity: [...new Set(filters.severity.filter((band) => SEVERITY_BANDS.includes(band)))],
  };
  if (cleaned.from && cleaned.to && cleaned.from > cleaned.to) {
    cleaned.to = null;
  }
  const changed = JSON.stringify(cleaned) !== JSON.stringify(filters);
  return { filters: cleaned, changed };
}
