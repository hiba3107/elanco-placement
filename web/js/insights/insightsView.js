import { api, filterParams, isAbortError } from "../api.js";
import { createChartPanel } from "../charts/chartPanel.js";
import { filtersStore } from "../state.js";
import { createLatestRequest } from "../ui/status.js";
import { AREA_CHART, areaRows } from "./areaChart.js";
import { TREND_CHART } from "./trendChart.js";

function checkedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function onChoiceChange(name, handler) {
  for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
    input.addEventListener("change", handler);
  }
}

// The trends section: sightings over time and sightings by area. Both follow
// the map's filters and reload when they change.
export function createInsightsView() {
  const trendPanel = createChartPanel(document.getElementById("trend-chart"), TREND_CHART);
  const areaPanel = createChartPanel(document.getElementById("area-chart"), AREA_CHART);
  const runTrend = createLatestRequest();
  const runArea = createLatestRequest();

  async function loadTrend() {
    trendPanel.showLoading();
    const params = {
      ...filterParams(filtersStore.get()),
      interval: checkedValue("trend-interval"),
    };
    try {
      trendPanel.render(await runTrend((signal) => api.trends(params, { signal })));
    } catch (error) {
      if (!isAbortError(error)) {
        trendPanel.showError(error, loadTrend);
      }
    }
  }

  async function loadArea() {
    areaPanel.showLoading();
    const grouping = checkedValue("area-grouping");
    const params = filterParams(filtersStore.get());
    try {
      const response = await runArea((signal) =>
        grouping === "region" ? api.regions(params, { signal }) : api.locations(params, { signal }),
      );
      areaPanel.render({ grouping, rows: areaRows(response, grouping) });
    } catch (error) {
      if (!isAbortError(error)) {
        areaPanel.showError(error, loadArea);
      }
    }
  }

  onChoiceChange("trend-interval", loadTrend);
  onChoiceChange("area-grouping", loadArea);

  return {
    load() {
      loadTrend();
      loadArea();
    },
    showWaiting(error, onRetry) {
      for (const panel of [trendPanel, areaPanel]) {
        if (error) {
          panel.showError(error, onRetry);
        } else {
          panel.showLoading();
        }
      }
    },
  };
}
