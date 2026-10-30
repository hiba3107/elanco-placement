import { api, filterParams, isAbortError } from "../api.js";
import { createChartPanel } from "../charts/chartPanel.js";
import { h, icon } from "../dom.js";
import { directionsUrl, shareLink } from "../share.js";
import { EMPTY_FILTERS, filtersStore, selectedCityStore } from "../state.js";
import { createLatestRequest, errorState, loadingState } from "../ui/status.js";
import {
  panelSection,
  reportsContent,
  sightingsContent,
  speciesContent,
  summaryContent,
} from "./panelContent.js";
import { TIMELINE_CHART } from "./timelineChart.js";

const listView = document.getElementById("city-list-view");
const panel = document.getElementById("city-panel");

const LATEST_SIGHTINGS = 5;
const LATEST_REPORTS = 3;

function resetFilters() {
  filtersStore.set({ ...EMPTY_FILTERS });
}

// Moves the report form to this city and takes the visitor there.
function reportSightingIn(city) {
  const select = document.getElementById("report-location");
  select.value = city;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  document.getElementById("report").scrollIntoView();
  document.getElementById("report-date").focus({ preventScroll: true });
}

// Fills a box from a request, with its own loading and error state, so one
// failing request never blanks the rest of the panel.
async function loadInto(box, runLatest, request, render, retry) {
  box.replaceChildren(loadingState());
  try {
    box.replaceChildren(render(await runLatest(request)));
  } catch (error) {
    if (!isAbortError(error)) {
      box.replaceChildren(errorState({ title: "Couldn't load this", error, onRetry: retry }));
    }
  }
}

/**
 * The detail panel shown in place of the city list. The summary comes from
 * the map's data; the timeline, latest sightings and community reports are
 * fetched separately. Opening it moves focus to the city's name, and closing
 * it returns focus to the marker or list row that opened it.
 */
export function createCityPanel({ locations, findSummary }) {
  const runTimeline = createLatestRequest();
  const runSightings = createLatestRequest();
  const runReports = createLatestRequest();
  let city = null;
  let returnFocusTo = null;

  const heading = h("h3", { class: "text-xl font-semibold text-ink", tabindex: "-1" });
  const place = h("p", { class: "text-sm text-ink-muted" });
  const summaryBox = h("div", { class: "mt-3" });
  const shareStatus = h("div", { class: "mt-2 text-sm text-ink-soft", "aria-live": "polite" });
  const directionsLink = h(
    "a",
    { class: "btn-secondary", target: "_blank", rel: "noopener" },
    "Directions",
    icon("external", "h-4 w-4"),
    h("span", { class: "sr-only" }, " (opens Google Maps in a new tab)"),
  );
  const timelineBox = h("div", { class: "mt-3" });
  const speciesBox = h("div");
  const sightingsBox = h("div");
  const reportsBox = h("div");
  const timeline = createChartPanel(timelineBox, TIMELINE_CHART);

  async function share() {
    shareStatus.replaceChildren();
    const outcome = await shareLink({
      title: `Tick sightings in ${city}`,
      text: `Tick activity in ${city} on Tick Tracker`,
      url: window.location.href,
    });
    if (outcome === "copied") {
      shareStatus.replaceChildren("Link copied. It opens this city with the same filters.");
    } else if (outcome === "manual") {
      const field = h("input", {
        class: "field-input",
        readonly: true,
        value: window.location.href,
        "aria-label": "Link to this view",
      });
      shareStatus.replaceChildren("Copy this link to share this view:", field);
      field.select();
    }
  }

  panel.replaceChildren(
    h(
      "div",
      { class: "border-b border-line px-4 py-3" },
      h(
        "button",
        { type: "button", class: "btn-small", onClick: () => selectedCityStore.set(null) },
        "← All cities",
      ),
    ),
    h(
      "div",
      { class: "px-4 py-4" },
      heading,
      place,
      summaryBox,
      h(
        "div",
        { class: "mt-4 flex flex-wrap gap-2" },
        h(
          "button",
          { type: "button", class: "btn-primary", onClick: () => reportSightingIn(city) },
          "Report a sighting here",
        ),
        directionsLink,
        h("button", { type: "button", class: "btn-secondary", onClick: share }, "Share"),
      ),
      shareStatus,
    ),
    panelSection(
      "Activity over time",
      h("p", { class: "text-sm text-ink-muted" }, "Sightings per year, following the filters"),
      timelineBox,
    ),
    panelSection("Species seen", speciesBox),
    panelSection("Latest sightings", sightingsBox),
    panelSection(
      "Community reports",
      h(
        "p",
        { class: "text-sm text-ink-muted" },
        "Sent in by visitors. Not checked, and not counted in severity.",
      ),
      reportsBox,
    ),
  );
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      selectedCityStore.set(null);
    }
  });

  async function loadTimeline() {
    timeline.showLoading();
    const name = city;
    const params = { ...filterParams(filtersStore.get()), location: name, interval: "year" };
    try {
      const response = await runTimeline((signal) => api.trends(params, { signal }));
      timeline.render({ ...response, city: name });
    } catch (error) {
      if (!isAbortError(error)) {
        timeline.showError(error, loadTimeline);
      }
    }
  }

  function loadSightings() {
    const params = {
      ...filterParams(filtersStore.get()),
      location: city,
      pageSize: LATEST_SIGHTINGS,
    };
    return loadInto(
      sightingsBox,
      runSightings,
      (signal) => api.sightings(params, { signal }),
      sightingsContent,
      loadSightings,
    );
  }

  function loadReports() {
    const name = city;
    return loadInto(
      reportsBox,
      runReports,
      (signal) => api.reports({ location: name, pageSize: LATEST_REPORTS }, { signal }),
      (response) => reportsContent(response, name, { onReport: () => reportSightingIn(name) }),
      loadReports,
    );
  }

  function renderDetails() {
    const summary = findSummary(city);
    summaryBox.replaceChildren(summaryContent(city, summary, { onResetFilters: resetFilters }));
    speciesBox.replaceChildren(speciesContent(summary));
    loadTimeline();
    loadSightings();
  }

  function restoreFocus(closedCity) {
    const target = returnFocusTo?.isConnected
      ? returnFocusTo
      : listView.querySelector(`[data-city="${CSS.escape(closedCity)}"]`);
    target?.focus();
    returnFocusTo = null;
  }

  return {
    open(name, { moveFocus }) {
      if (moveFocus && !panel.contains(document.activeElement)) {
        returnFocusTo = document.activeElement;
      }
      city = name;
      const reference = locations.find((location) => location.name === name);
      heading.textContent = name;
      place.textContent = `${reference.region} · ${reference.nation}`;
      directionsLink.href = directionsUrl(reference);
      shareStatus.replaceChildren();
      listView.hidden = true;
      panel.hidden = false;
      renderDetails();
      loadReports();
      if (moveFocus) {
        heading.focus();
      }
    },
    close() {
      const closedCity = city;
      city = null;
      panel.hidden = true;
      listView.hidden = false;
      if (closedCity) {
        restoreFocus(closedCity);
      }
    },
    // Called when the map's data reloads, for example after a filter change.
    refresh() {
      if (city) {
        renderDetails();
      }
    },
    // Called after a report is sent, so a new report shows straight away.
    refreshReports() {
      if (city) {
        loadReports();
      }
    },
  };
}
