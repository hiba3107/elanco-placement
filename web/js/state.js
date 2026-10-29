// Shared page state: the map filters and the selected city. Both are mirrored
// in the address bar, so a copied link reopens the same view.

function createStore(initialValue) {
  let value = initialValue;
  const listeners = new Set();
  return {
    get: () => value,
    set(nextValue) {
      value = nextValue;
      listeners.forEach((listener) => listener(value));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const EMPTY_FILTERS = Object.freeze({ from: null, to: null, species: [], severity: [] });

function readFiltersFromUrl(params) {
  return {
    from: params.get("from") || null,
    to: params.get("to") || null,
    species: params.getAll("species"),
    severity: params.getAll("severity"),
  };
}

const initialParams = new URLSearchParams(window.location.search);

export const filtersStore = createStore(readFiltersFromUrl(initialParams));
export const selectedCityStore = createStore(initialParams.get("city"));

export function countActiveFilters({ from, to, species, severity }) {
  return [from, to].filter(Boolean).length + species.length + severity.length;
}

function writeUrl() {
  const { from, to, species, severity } = filtersStore.get();
  const params = new URLSearchParams();
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  species.forEach((name) => params.append("species", name));
  severity.forEach((band) => params.append("severity", band));
  const city = selectedCityStore.get();
  if (city) {
    params.set("city", city);
  }
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", url);
}

filtersStore.subscribe(writeUrl);
selectedCityStore.subscribe(writeUrl);

export const SEVERITY_BANDS = Object.freeze(["high", "medium", "low"]);

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
