import {
  loadDataQuality,
  renderSeverityExplainer,
  showDataQualityWaiting,
} from "./about/aboutData.js";
import { api } from "./api.js";
import { applyChartDefaults, isChartLibraryLoaded, registerChartPlugins } from "./charts/theme.js";
import { createCityPanel } from "./cities/cityPanel.js";
import { initFilterPanel, setFilterDateRange } from "./filters/filterPanel.js";
import { createSpeciesGuide } from "./guide/speciesGuide.js";
import { createInsightsView } from "./insights/insightsView.js";
import { createMapView } from "./map/mapView.js";
import { initNearMe } from "./map/nearMe.js";
import { initReportForm } from "./report/reportForm.js";
import { createSeasonalView } from "./seasonal/seasonalView.js";
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

const DATA_UNAVAILABLE = {
  message:
    "Elanco's service can't be reached, so there is nothing to show yet. This fills in by itself once it is back.",
};

const overview = document.getElementById("overview-stats");
const filterNotice = document.getElementById("filter-notice");
const renderBanner = createDataBanner(document.getElementById("data-banner"), {
  onRetry: () => checkServer(),
});

let recheckTimer = null;
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

// Everything that only needs the reference data is built as soon as the
// server answers, even if Elanco's data is not available yet: the map, the
// filters, the species guide, the chart frames and the report form.
function createViews(meta) {
  if (isChartLibraryLoaded()) {
    applyChartDefaults();
    registerChartPlugins();
  }
  checkLinkedCity(meta);
  initFilterPanel(meta);

  const created = { guide: createSpeciesGuide(meta) };
  let firstMapLoad = true;
  created.panel = createCityPanel({
    locations: meta.locations,
    findSummary: (city) => created.map.findLocation(city),
  });
  created.map = createMapView(meta, {
    onData: () => {
      const city = selectedCityStore.get();
      if (firstMapLoad && city) {
        created.panel.open(city, { moveFocus: false });
      } else {
        created.panel.refresh();
      }
      firstMapLoad = false;
    },
  });
  created.insights = createInsightsView();
  created.seasonal = createSeasonalView(meta);
  initReportForm(meta, { onSaved: () => created.panel.refreshReports() });
  initNearMe(
    document.getElementById("near-me-button"),
    document.getElementById("near-me-status"),
    meta.locations,
  );
  filtersStore.subscribe(() => {
    created.map.load();
    created.insights.load();
  });
  selectedCityStore.subscribe((city) => {
    if (city) {
      created.panel.open(city, { moveFocus: true });
    } else {
      created.panel.close();
    }
  });
  return created;
}

// Runs whenever the server reports a different data status.
function showDataStatus(meta) {
  const { status, dateRange } = meta.data;
  renderSeverityExplainer(meta.severityRule, dateRange);
  if (hasData(status)) {
    setFilterDateRange(dateRange);
    views.map.load();
    views.insights.load();
    views.seasonal.load(dateRange);
    views.guide.loadNumbers();
    loadDataQuality();
    return;
  }
  const error = status === "unavailable" ? DATA_UNAVAILABLE : null;
  for (const view of [views.map, views.insights, views.seasonal, views.guide]) {
    view.showWaiting(error, checkServer);
  }
  showDataQualityWaiting(error, checkServer);
}

// Asks the server what data it has. While Elanco is loading, stale or down,
// it keeps checking, so the page recovers by itself without a reload.
async function checkServer() {
  try {
    const meta = await api.meta();
    const { status } = meta.data;
    renderBanner({ dataState: meta.data });
    renderOverview(overview, meta);
    views ??= createViews(meta);
    if (status !== shownStatus) {
      shownStatus = status;
      showDataStatus(meta);
    }
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
