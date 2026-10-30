import { api, filterParams, isAbortError } from "../api.js";
import { markSelectedCity, renderCityList } from "../cities/cityList.js";
import { h } from "../dom.js";
import { plural } from "../format.js";
import { EMPTY_FILTERS, filtersStore, selectedCityStore } from "../state.js";
import {
  createLatestRequest,
  emptyState,
  errorState,
  loadingState,
  setRefreshing,
} from "../ui/status.js";
import { createCityMap, isMapLibraryLoaded } from "./cityMap.js";

const mapElement = document.getElementById("map");
const mapStatus = document.getElementById("map-status");
const listView = document.getElementById("city-list-view");
const summary = document.getElementById("filter-summary");

function resetFilters() {
  filtersStore.set({ ...EMPTY_FILTERS });
}

function showMapOverlay(content) {
  mapStatus.replaceChildren(...(content ? [content] : []));
  mapStatus.hidden = !content;
}

function showMapLibraryMissing() {
  mapElement.replaceChildren(
    errorState({
      title: "The map couldn't load",
      error: {
        message:
          "Its map library did not download, so the map can't be drawn. The city list has the same information.",
      },
    }),
  );
}

function showTileNotice() {
  mapElement.append(
    h(
      "p",
      {
        class:
          "absolute right-2 top-2 z-[900] rounded-md bg-surface/95 px-3 py-1.5 text-xs text-ink-soft shadow",
        role: "status",
      },
      "The background map couldn't load. The markers still work.",
    ),
  );
}

function noMatchesState() {
  return emptyState({
    title: "No sightings match these filters",
    message: "Try a wider date range, or fewer species or severity levels.",
    action: { label: "Reset filters", onClick: resetFilters },
  });
}

function failureState(error, retry) {
  if (error.code === "VALIDATION_FAILED") {
    return emptyState({
      title: "These filters can't be used",
      message: error.details[0]?.message ?? error.message,
      action: { label: "Reset filters", onClick: resetFilters },
    });
  }
  return errorState({ title: "Couldn't load the sightings", error, onRetry: retry });
}

/**
 * The map and the city list, loaded from /api/insights/locations for the
 * current filters. Each load cancels the one before it, and while a reload
 * is in flight the previous markers stay visible but dimmed.
 */
export function createMapView(meta, { onData }) {
  const runLatest = createLatestRequest();
  const selectCity = (city) => selectedCityStore.set(city);
  const map = isMapLibraryLoaded()
    ? createCityMap(mapElement, {
        cities: meta.locations,
        onSelect: selectCity,
        onTileError: showTileNotice,
      })
    : null;
  if (!map) {
    showMapLibraryMissing();
  }
  let latest = null;

  function setBusy(busy) {
    setRefreshing(mapElement, busy);
    setRefreshing(listView, busy);
  }

  function render() {
    const { locations, totals } = latest;
    const selectedCity = selectedCityStore.get();
    map?.render(locations);
    map?.setSelected(selectedCity);
    if (locations.length === 0) {
      summary.textContent = "No sightings match these filters";
      showMapOverlay(noMatchesState());
      listView.replaceChildren(noMatchesState());
    } else {
      summary.textContent = `Showing ${plural(totals.locations, "city", "cities")} and ${plural(totals.sightings, "sighting")}`;
      showMapOverlay(null);
      renderCityList(listView, { locations, selectedCity, onSelect: selectCity });
    }
  }

  async function load() {
    if (latest === null) {
      showMapOverlay(loadingState("Loading sightings…"));
      listView.replaceChildren(loadingState("Loading cities…"));
    } else {
      setBusy(true);
    }
    try {
      latest = await runLatest((signal) =>
        api.locations(filterParams(filtersStore.get()), { signal }),
      );
      setBusy(false);
      render();
      onData();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      setBusy(false);
      latest = null;
      summary.textContent = "";
      showMapOverlay(failureState(error, load));
      listView.replaceChildren(failureState(error, load));
    }
  }

  selectedCityStore.subscribe((city) => {
    map?.setSelected(city);
    markSelectedCity(listView, city);
  });

  return {
    load,
    findLocation: (city) =>
      latest?.locations.find((location) => location.location === city) ?? null,
    focusCity: (city) => map?.focusCity(city),
  };
}
