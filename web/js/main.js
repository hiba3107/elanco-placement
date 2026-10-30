import { api } from "./api.js";
import { initFilterPanel } from "./filters/filterPanel.js";
import { createMapView } from "./map/mapView.js";
import { filtersStore } from "./state.js";
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

// Controls only need the reference data, so they are built as soon as the
// server answers, even if Elanco's data is not available yet.
function buildControls(meta) {
  if (controlsBuilt) {
    return;
  }
  controlsBuilt = true;
  initFilterPanel(meta);
}

function loadDataViews(meta) {
  if (!views) {
    views = { map: createMapView(meta) };
    filtersStore.subscribe(() => views.map.load());
  }
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
