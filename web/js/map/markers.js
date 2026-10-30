import { speciesLetter } from "../content/species.js";
import { h } from "../dom.js";
import { formatDay, formatNumber, plural } from "../format.js";
import { SEVERITY_LABELS } from "../severity.js";

const MIN_SIZE = 24;
const MAX_SIZE = 38;

// The circle's area, not its width, grows with the number of sightings,
// because people judge circles by area: twice the sightings looks twice as big.
export function markerSize(total, largestTotal) {
  return Math.round(Math.max(MIN_SIZE, MAX_SIZE * Math.sqrt(total / largestTotal)));
}

// "=" marks a tie, so the badge never claims one species leads when it does not.
export function mostSeenBadge({ names }) {
  return names.length === 1 ? speciesLetter(names[0]) : "=";
}

function describeMostSeen({ names, count }) {
  if (names.length === 0) {
    return "No sightings";
  }
  if (names.length === 1) {
    return `${names[0]} (${formatNumber(count)})`;
  }
  return `${names.join(" and ")} (${formatNumber(count)} each)`;
}

export function markerClasses(summary, isSelected) {
  return [
    "city-marker",
    summary.recentCount > 0 && "city-marker--recent",
    isSelected && "city-marker--selected",
  ]
    .filter(Boolean)
    .join(" ");
}

// The species letter is drawn by CSS from data-species, as decoration: the
// marker's spoken name already says which species is seen most, and keeping
// the letter out of the text means the visible text matches that name.
export function markerBody(summary) {
  return h(
    "span",
    {
      class: `city-marker__body city-marker__body--${summary.severity.band}`,
      "data-species": mostSeenBadge(summary.mostSeenSpecies),
    },
    formatNumber(summary.total),
  );
}

// The same facts the marker shows visually, as words for screen readers.
export function describeMarker(summary) {
  const recent =
    summary.recentCount > 0
      ? `${plural(summary.recentCount, "sighting")} in the last 30 days of the data`
      : "none in the last 30 days of the data";
  return [
    `${summary.location}: ${plural(summary.total, "sighting")}`,
    `${SEVERITY_LABELS[summary.severity.band].toLowerCase()} severity`,
    `most seen ${describeMostSeen(summary.mostSeenSpecies)}`,
    recent,
    "Press Enter for details",
  ].join(", ");
}

export function tooltipContent(summary) {
  return h(
    "div",
    {},
    h("p", { class: "font-semibold" }, summary.location),
    h(
      "p",
      {},
      `${plural(summary.total, "sighting")} · ${SEVERITY_LABELS[summary.severity.band]} severity`,
    ),
    h("p", { class: "text-ink-muted" }, `Last seen ${formatDay(summary.latestSighting)}`),
  );
}
