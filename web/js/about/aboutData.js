import { api } from "../api.js";
import { h } from "../dom.js";
import { formatDay, formatInstant, formatNumber, plural } from "../format.js";
import { errorState, loadingState } from "../ui/status.js";

const explainer = document.getElementById("severity-explainer");
const qualityBox = document.getElementById("data-quality");

function percent(ratio) {
  return `${Math.round(Math.abs(ratio - 1) * 100)}%`;
}

function learnMore(summary, ...content) {
  return h(
    "details",
    { class: "learn-more" },
    h("summary", {}, summary),
    h("div", { class: "learn-more__body" }, ...content),
  );
}

// The severity rule in plain words, built from the numbers the server
// actually uses, so the explanation can never drift from the code.
export function renderSeverityExplainer(rule, dateRange) {
  const newest = dateRange ? ` (${formatDay(dateRange.latest)})` : "";
  explainer.replaceChildren(
    h(
      "p",
      {},
      "Recent sightings count for more than old ones, and each city is compared with the typical city. So severity shows where activity is higher than elsewhere, not an absolute risk.",
    ),
    learnMore(
      "Learn more about the method",
      h(
        "ol",
        { class: "list-decimal space-y-2 pl-5" },
        h(
          "li",
          {},
          `Each sighting is weighted by its age: 1 on the reference date, 0.5 a year older, 0.25 two years older, and so on (a ${Math.round(rule.halfLifeDays / 30.4)}-month half-life).`,
        ),
        h("li", {}, "A city's score is the total of its weights."),
        h(
          "li",
          {},
          `At least ${percent(rule.highAtOrAbove)} above the median city is high, at least ${percent(rule.lowAtOrBelow)} below is low, and anything between is medium.`,
        ),
      ),
      h(
        "p",
        {},
        `The reference date is the end of the period you choose, or the newest sighting${newest}. Measuring from today would make every sighting look years old.`,
      ),
      h(
        "p",
        {},
        "Why not just count sightings? Old ones would count as much as new ones. Why not use only the latest sighting? One stray record would turn a quiet city red. Weighting by recency uses both.",
      ),
    ),
  );
}

function reasonRows(entries) {
  return entries.map((entry) =>
    h(
      "tr",
      {
        class: `border-b border-line last:border-0 ${entry.count === 0 ? "text-ink-muted" : "text-ink"}`,
      },
      h("th", { scope: "row", class: "py-1.5 pr-3 text-left font-normal" }, entry.description),
      h("td", { class: "py-1.5 text-right tabular-nums" }, formatNumber(entry.count)),
    ),
  );
}

function reasonsTable(caption, entries) {
  return h(
    "table",
    { class: "mt-3 w-full text-sm" },
    h("caption", { class: "mb-1 text-left font-semibold text-ink" }, caption),
    h("tbody", {}, reasonRows(entries)),
  );
}

function qualityContent(report) {
  const fetched = report.fetchedAt ? formatInstant(report.fetchedAt) : "an unknown time";
  const source = report.source === "snapshot" ? "a saved copy of Elanco's data" : "Elanco's API";
  return h(
    "div",
    {},
    h(
      "p",
      { class: "mb-3 text-ink-soft" },
      `${plural(report.received, "record")} from ${source}, fetched ${fetched}. ${formatNumber(report.kept)} were used: ${formatNumber(report.removed)} removed and ${formatNumber(report.corrected)} corrected.`,
    ),
    learnMore(
      "Learn more about each check",
      reasonsTable("Checks that remove a record", report.removedByReason),
      reasonsTable("Fixes applied to a kept record", report.correctionsByType),
    ),
  );
}

export function showDataQualityWaiting(error, onRetry) {
  qualityBox.replaceChildren(
    error
      ? errorState({ title: "No data-quality report yet", error, onRetry })
      : loadingState("The report appears once the data has loaded."),
  );
}

// Shows what the cleaning step found in Elanco's data: every check, even
// those that found nothing, so it is clear the checks ran.
export async function loadDataQuality() {
  qualityBox.replaceChildren(loadingState("Loading the data-quality report…"));
  try {
    qualityBox.replaceChildren(qualityContent(await api.dataQuality()));
  } catch (error) {
    qualityBox.replaceChildren(
      errorState({
        title: "Couldn't load the data-quality report",
        error,
        onRetry: loadDataQuality,
      }),
    );
  }
}
