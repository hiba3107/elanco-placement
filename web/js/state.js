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
