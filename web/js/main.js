import { api } from "./api.js";
import { applyChartDefaults, isChartLibraryLoaded } from "./charts/theme.js";
import { createCityPanel } from "./cities/cityPanel.js";
import { initFilterPanel } from "./filters/filterPanel.js";
import { createMapView } from "./map/mapView.js";
import { filtersStore, selectedCityStore } from "./state.js";
import { createDataBanner } from "./ui/dataBanner.js";
import { initNavigation } from "./ui/navigation.js";
import { renderOverview } from "./ui/overview.js";

// How often to ask the server again, depending on what it last said.
const RECHECK_DELAYS_MS = {
  loading: 3_000,
  stale: 60_000,
  unavailable: 30_000,
  serverDown: 15_000,
};

const overview = document.getElementById("overview-stats");
const filterNotice = document.getElementById("filter-notice");
const renderBanner = createDataBanner(document.getElementById("data-banner"), {
  onRetry: () => checkServer(),
});

let recheckTimer = null;
let controlsBuilt = false;
let views = null;
let shownStatus = null;

function scheduleRecheck(delayMs) {
  clearTimeout(recheckTimer);
  recheckTimer = setTimeout(checkServer, delayMs);
}

function hasData(status) {
  return status === "ready" || status === "stale";
}

// A city named in a shared link is only opened if it really exists.
function checkLinkedCity(meta) {
  const city = selectedCityStore.get();
  if (city && !meta.locations.some((location) => location.name === city)) {
    selectedCityStore.set(null);
    filterNotice.textContent = `The link named a city we don't track ("${city}"), so the map shows all cities.`;
    filterNotice.hidden = false;
  }
}

// Controls only need the reference data, so they are built as soon as the
// server answers, even if Elanco's data is not available yet.
function buildControls(meta) {
  if (controlsBuilt) {
    return;
  }
  controlsBuilt = true;
  if (isChartLibraryLoaded()) {
    applyChartDefaults();
  }
  checkLinkedCity(meta);
  initFilterPanel(meta);
}

function createViews(meta) {
  let firstLoad = true;
  const created = {};
  created.panel = createCityPanel({
    locations: meta.locations,
    findSummary: (city) => created.map.findLocation(city),
  });
  created.map = createMapView(meta, {
    onData: () => {
      const city = selectedCityStore.get();
      if (firstLoad && city) {
        created.panel.open(city, { moveFocus: false });
      } else {
        created.panel.refresh();
      }
      firstLoad = false;
    },
  });
  filtersStore.subscribe(() => created.map.load());
  selectedCityStore.subscribe((city) => {
    if (city) {
      created.panel.open(city, { moveFocus: true });
    } else {
      created.panel.close();
    }
  });
  return created;
}

function loadDataViews(meta) {
  views ??= createViews(meta);
  views.map.load();
}

// Asks the server what data it has. While Elanco is loading, stale or down,
// it keeps checking, so the page recovers by itself without a reload.
async function checkServer() {
  try {
    const meta = await api.meta();
    const { status } = meta.data;
    renderBanner({ dataState: meta.data });
    renderOverview(overview, meta);
    buildControls(meta);
    if (hasData(status) && status !== shownStatus) {
      loadDataViews(meta);
    }
    shownStatus = status;
    if (status in RECHECK_DELAYS_MS) {
      scheduleRecheck(RECHECK_DELAYS_MS[status]);
    }
  } catch (error) {
    renderBanner({ serverError: error });
    renderOverview(overview, null);
    scheduleRecheck(RECHECK_DELAYS_MS.serverDown);
  }
}

initNavigation();
renderOverview(overview, null);
checkServer();
