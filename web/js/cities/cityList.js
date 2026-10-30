import { h } from "../dom.js";
import { formatDay, formatNumber } from "../format.js";
import { SEVERITY_LABELS } from "../severity.js";

function cityButton(summary, isSelected, onSelect) {
  const { band } = summary.severity;
  return h(
    "button",
    {
      type: "button",
      class:
        "flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-page aria-[current=true]:bg-accent-soft",
      "aria-current": isSelected ? "true" : null,
      "data-city": summary.location,
      onClick: () => onSelect(summary.location),
    },
    h("span", { class: `swatch swatch--${band}`, "aria-hidden": "true" }),
    h(
      "span",
      { class: "min-w-0 flex-1" },
      h("span", { class: "block font-semibold text-ink" }, summary.location),
      h(
        "span",
        { class: "block text-sm text-ink-muted" },
        `${SEVERITY_LABELS[band]} severity · last seen ${formatDay(summary.latestSighting)}`,
      ),
      summary.recentCount > 0 &&
        h(
          "span",
          {
            class: "mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent",
          },
          "Seen in the last 30 days",
        ),
    ),
    h(
      "span",
      { class: "text-right" },
      h("span", { class: "block font-semibold text-ink" }, formatNumber(summary.total)),
      h(
        "span",
        { class: "block text-xs text-ink-muted" },
        summary.total === 1 ? "sighting" : "sightings",
      ),
    ),
  );
}

// The same cities as the map, as a list: easier with a keyboard or a screen
// reader, and the main way to browse on a phone.
export function renderCityList(container, { locations, selectedCity, onSelect }) {
  container.replaceChildren(
    h(
      "div",
      { class: "border-b border-line px-4 py-3" },
      h("h3", { class: "font-semibold text-ink" }, `Cities (${locations.length})`),
      h("p", { class: "text-sm text-ink-muted" }, "Most recent activity first"),
    ),
    h(
      "ul",
      { class: "divide-y divide-line" },
      locations.map((summary) =>
        h("li", {}, cityButton(summary, summary.location === selectedCity, onSelect)),
      ),
    ),
  );
}

// Updates which city is marked as selected without rebuilding the list, so
// the button the visitor used keeps its place and can get focus back later.
export function markSelectedCity(container, city) {
  for (const button of container.querySelectorAll("[data-city]")) {
    if (button.dataset.city === city) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  }
}
