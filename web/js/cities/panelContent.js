import { speciesLetter } from "../content/species.js";
import { h } from "../dom.js";
import { formatDateTime, formatDay, formatNumber, plural } from "../format.js";
import { SEVERITY_LABELS, describeComparedToMedian } from "../severity.js";
import { emptyState } from "../ui/status.js";

// Builders for the pieces of a city's detail panel. Each turns data into
// elements and nothing more; cityPanel.js decides when to show them.

function letterBadge(species) {
  return h(
    "span",
    { class: "letter-badge !h-6 !w-6 !text-xs", "aria-hidden": "true" },
    speciesLetter(species),
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

function quietNote(text) {
  return h("p", { class: "mt-2 text-sm text-ink-muted" }, text);
}

export function panelSection(title, ...content) {
  return h(
    "section",
    { class: "border-t border-line px-4 py-4" },
    h("h4", { class: "font-semibold text-ink" }, title),
    ...content,
  );
}

export function summaryContent(city, summary, { onResetFilters }) {
  if (!summary) {
    return emptyState({
      title: `No sightings in ${city} match these filters`,
      message: "Change or reset the filters to see this city's activity.",
      action: { label: "Reset filters", onClick: onResetFilters },
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

// One bar per species, scaled to the most common species in this city.
export function speciesContent(summary) {
  if (!summary) {
    return quietNote("No sightings match the current filters.");
  }
  const largest = Math.max(1, ...summary.species.map((entry) => entry.count));
  return h(
    "ul",
    { class: "mt-3 space-y-2" },
    summary.species.map(({ name, count }) =>
      h(
        "li",
        {
          class:
            "grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(4rem,40%)_2rem] items-center gap-2.5 text-sm",
        },
        letterBadge(name),
        h("span", { class: "text-ink-soft" }, name),
        h(
          "span",
          { class: "h-2.5 rounded-full bg-page", "aria-hidden": "true" },
          h("span", {
            class: "block h-2.5 rounded-full",
            style: `width: ${(count / largest) * 100}%; background: var(--series)`,
          }),
        ),
        h("span", { class: "text-right font-semibold tabular-nums text-ink" }, formatNumber(count)),
      ),
    ),
  );
}

export function sightingsContent(response) {
  if (response.data.length === 0) {
    return quietNote("No sightings match the current filters.");
  }
  return h(
    "ul",
    { class: "mt-1 divide-y divide-line" },
    response.data.map((sighting) =>
      h(
        "li",
        { class: "flex items-center justify-between gap-3 py-2 text-sm" },
        h(
          "span",
          { class: "flex items-center gap-2 text-ink" },
          letterBadge(sighting.species),
          sighting.species,
        ),
        h("span", { class: "text-ink-muted" }, formatDateTime(sighting.date)),
      ),
    ),
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

// Notes are shown as text, never as HTML, so nothing a visitor types can
// change the page.
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

export function reportsContent(response, city, { onReport }) {
  if (response.data.length === 0) {
    return h(
      "p",
      { class: "mt-2 text-sm text-ink-muted" },
      `No community reports for ${city} yet. `,
      h(
        "button",
        { type: "button", class: "text-link", onClick: onReport },
        "Be the first to report one",
      ),
    );
  }
  const more = response.pagination.total - response.data.length;
  return h(
    "div",
    {},
    h("ul", { class: "divide-y divide-line" }, response.data.map(reportItem)),
    more > 0 && h("p", { class: "text-sm text-ink-muted" }, `and ${plural(more, "more report")}`),
  );
}
