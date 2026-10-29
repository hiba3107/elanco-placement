import { api } from "./api.js";
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

function scheduleRecheck(delayMs) {
  clearTimeout(recheckTimer);
  recheckTimer = setTimeout(checkServer, delayMs);
}

function scheduleRecheckFor(status) {
  if (status in RECHECK_DELAYS_MS) {
    scheduleRecheck(RECHECK_DELAYS_MS[status]);
  }
}

// Asks the server what data it has. While Elanco is loading, stale or down,
// it keeps checking, so the page recovers by itself without a reload.
async function checkServer() {
  try {
    const meta = await api.meta();
    renderBanner({ dataState: meta.data });
    renderOverview(overview, meta);
    scheduleRecheckFor(meta.data.status);
  } catch (error) {
    renderBanner({ serverError: error });
    renderOverview(overview, null);
    scheduleRecheck(RECHECK_DELAYS_MS.serverDown);
  }
}

initNavigation();
renderOverview(overview, null);
checkServer();
