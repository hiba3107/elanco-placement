import { api, filterParams, isAbortError } from "../api.js";
import { createChartPanel } from "../charts/chartPanel.js";
import { speciesLetter } from "../content/species.js";
import { h, icon } from "../dom.js";
import { formatDateTime, formatDay, formatNumber, plural } from "../format.js";
import { SEVERITY_LABELS, describeComparedToMedian } from "../severity.js";
import { directionsUrl, shareLink } from "../share.js";
import { EMPTY_FILTERS, filtersStore, selectedCityStore } from "../state.js";
import { createLatestRequest, emptyState, errorState, loadingState } from "../ui/status.js";
import { TIMELINE_CHART } from "./timelineChart.js";

const listView = document.getElementById("city-list-view");
const panel = document.getElementById("city-panel");

const LATEST_SIGHTINGS = 5;
const LATEST_REPORTS = 3;

function section(title, ...content) {
  return h(
    "section",
    { class: "border-t border-line px-4 py-4" },
    h("h4", { class: "font-semibold text-ink" }, title),
    ...content,
  );
}

function stat(label, value) {
  return h(
    "div",
    { class: "rounded-lg bg-page px-3 py-2" },
    h("dt", { class: "text-xs text-ink-muted" }, label),
    h("dd", { class: "mt-0.5 font-semibold text-ink" }, value),
  );
}

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

function summaryContent(city, summary) {
  if (!summary) {
    return emptyState({
      title: `No sightings in ${city} match these filters`,
      message: "Change or reset the filters to see this city's activity.",
      action: { label: "Reset filters", onClick: resetFilters },
    });
  }
  const { band } = summary.severity;
  return h(
    "div",
    {},
    h(
      "p",
      { class: "flex items-center gap-2 font-semibold text-ink" },
      h("span", { class: `swatch swatch--${band}`, "aria-hidden": "true" }),
      `${SEVERITY_LABELS[band]} severity`,
    ),
    h(
      "p",
      { class: "mt-1 text-sm text-ink-soft" },
      `Score ${summary.severity.score.toFixed(1)}: ${describeComparedToMedian(summary.severity).toLowerCase()}. `,
      h("a", { class: "text-link", href: "#how-severity-works" }, "How this is worked out"),
    ),
    h(
      "dl",
      { class: "mt-3 grid grid-cols-3 gap-2" },
      stat("Sightings", formatNumber(summary.total)),
      stat("Last seen", formatDay(summary.latestSighting)),
      stat("Last 30 days of data", formatNumber(summary.recentCount)),
    ),
  );
}

function speciesContent(summary) {
  if (!summary) {
    return h(
      "p",
      { class: "mt-2 text-sm text-ink-muted" },
      "No sightings match the current filters.",
    );
  }
  const largest = Math.max(1, ...summary.species.map((entry) => entry.count));
  return h(
    "ul",
    { class: "mt-3 space-y-2" },
    summary.species.map(({ name, count }) =>
      h(
        "li",
        { class: "flex items-center gap-2.5 text-sm" },
        h(
          "span",
          { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" },
          speciesLetter(name),
        ),
        h("span", { class: "w-36 shrink-0 text-ink-soft" }, name),
        h(
          "span",
          { class: "h-2.5 flex-1 rounded-full bg-page", "aria-hidden": "true" },
          h("span", {
            class: "block h-2.5 rounded-full",
            style: `width: ${(count / largest) * 100}%; background: var(--series)`,
          }),
        ),
        h(
          "span",
          { class: "w-8 text-right font-semibold tabular-nums text-ink" },
          formatNumber(count),
        ),
      ),
    ),
  );
}

function sightingItem(sighting) {
  return h(
    "li",
    { class: "flex items-center justify-between gap-3 py-2 text-sm" },
    h(
      "span",
      { class: "flex items-center gap-2 text-ink" },
      h(
        "span",
        { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" },
        speciesLetter(sighting.species),
      ),
      sighting.species,
    ),
    h("span", { class: "text-ink-muted" }, formatDateTime(sighting.date)),
  );
}

function photoUnavailable(event) {
  event.target.replaceWith(
    h(
      "span",
      {
        class:
          "flex h-16 w-16 items-center justify-center rounded-lg bg-page text-center text-xs text-ink-muted",
      },
      "Photo unavailable",
    ),
  );
}

function reportItem(report) {
  return h(
    "li",
    { class: "flex gap-3 py-3" },
    report.photoUrl &&
      h("img", {
        src: report.photoUrl,
        alt: `Photo sent with this ${report.species} report`,
        class: "h-16 w-16 shrink-0 rounded-lg object-cover",
        loading: "lazy",
        onError: photoUnavailable,
      }),
    h(
      "div",
      { class: "min-w-0 text-sm" },
      h(
        "p",
        { class: "font-medium text-ink" },
        `${report.species} · ${formatDateTime(report.date)}`,
      ),
      report.notes && h("p", { class: "mt-0.5 break-words text-ink-soft" }, report.notes),
      h(
        "span",
        {
          class: "mt-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning",
        },
        "Unverified",
      ),
    ),
  );
}

/**
 * The detail panel shown in place of the city list. The summary comes from
 * the map's data; the timeline, latest sightings and community reports are
 * fetched separately, each with its own loading, empty and error state, so
 * one failing request never blanks the whole panel.
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
    section(
      "Activity over time",
      h("p", { class: "text-sm text-ink-muted" }, "Sightings per year, following the filters"),
      timelineBox,
    ),
    section("Species seen", speciesBox),
    section("Latest sightings", sightingsBox),
    section(
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

  async function loadInto(box, runLatest, request, render, retry) {
    box.replaceChildren(loadingState());
    try {
      const response = await runLatest(request);
      box.replaceChildren(render(response));
    } catch (error) {
      if (!isAbortError(error)) {
        box.replaceChildren(errorState({ title: "Couldn't load this", error, onRetry: retry }));
      }
    }
  }

  async function loadTimeline() {
    timeline.showLoading();
    const name = city;
    try {
      const response = await runTimeline((signal) =>
        api.trends(
          { ...filterParams(filtersStore.get()), location: name, interval: "year" },
          { signal },
        ),
      );
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
      (response) =>
        response.data.length === 0
          ? h(
              "p",
              { class: "mt-2 text-sm text-ink-muted" },
              "No sightings match the current filters.",
            )
          : h("ul", { class: "mt-1 divide-y divide-line" }, response.data.map(sightingItem)),
      loadSightings,
    );
  }

  function loadReports() {
    const name = city;
    return loadInto(
      reportsBox,
      runReports,
      (signal) => api.reports({ location: name, pageSize: LATEST_REPORTS }, { signal }),
      (response) => {
        if (response.data.length === 0) {
          return h(
            "p",
            { class: "mt-2 text-sm text-ink-muted" },
            `No community reports for ${name} yet. `,
            h(
              "button",
              { type: "button", class: "text-link", onClick: () => reportSightingIn(name) },
              "Be the first to report one",
            ),
          );
        }
        const more = response.pagination.total - response.data.length;
        return h(
          "div",
          {},
          h("ul", { class: "divide-y divide-line" }, response.data.map(reportItem)),
          more > 0 &&
            h("p", { class: "text-sm text-ink-muted" }, `and ${plural(more, "more report")}`),
        );
      },
      loadReports,
    );
  }

  function renderDetails() {
    const summary = findSummary(city);
    summaryBox.replaceChildren(summaryContent(city, summary));
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
