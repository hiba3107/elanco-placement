import { api, isAbortError } from "../api.js";
import { createChartPanel } from "../charts/chartPanel.js";
import { h } from "../dom.js";
import { createLatestRequest } from "../ui/status.js";
import { SEASONAL_CHART, describeSeasonalPattern } from "./seasonalChart.js";

const citySelect = document.getElementById("seasonal-city");
const yearSelect = document.getElementById("seasonal-year");
const summary = document.getElementById("seasonal-summary");

function yearsBetween(dateRange) {
  const first = Number(dateRange.earliest.slice(0, 4));
  const last = Number(dateRange.latest.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, index) => last - index);
}

function describeScope(city, year) {
  const where = city ? `in ${city}` : "across all cities";
  return year ? `${where} in ${year}` : `${where} and years`;
}

// The seasonal chart has its own city and year choices, separate from the
// map filters, so any city and year can be compared month by month.
export function createSeasonalView(meta) {
  const panel = createChartPanel(document.getElementById("seasonal-chart"), SEASONAL_CHART);
  const runLatest = createLatestRequest();
  let yearsListed = false;

  citySelect.append(
    ...meta.locations.map((location) => h("option", { value: location.name }, location.name)),
  );

  // The years come from the data's date range, which is only known once
  // Elanco's data has loaded.
  function listYears(dateRange) {
    if (yearsListed || !dateRange) {
      return;
    }
    yearsListed = true;
    yearSelect.append(...yearsBetween(dateRange).map((year) => h("option", { value: year }, year)));
  }

  async function load() {
    const city = citySelect.value || null;
    const year = yearSelect.value || null;
    const params = {
      location: city,
      from: year ? `${year}-01-01` : null,
      to: year ? `${year}-12-31` : null,
    };
    panel.showLoading();
    try {
      const response = await runLatest((signal) => api.seasonal(params, { signal }));
      panel.render(response);
      summary.textContent = describeSeasonalPattern(response.pattern, describeScope(city, year));
    } catch (error) {
      if (!isAbortError(error)) {
        summary.textContent = "";
        panel.showError(error, load);
      }
    }
  }

  function showWaiting(error, onRetry) {
    summary.textContent = "";
    if (error) {
      panel.showError(error, onRetry);
    } else {
      panel.showLoading();
    }
  }

  citySelect.addEventListener("change", load);
  yearSelect.addEventListener("change", load);

  return {
    load(dateRange) {
      listYears(dateRange);
      return load();
    },
    showWaiting,
  };
}
