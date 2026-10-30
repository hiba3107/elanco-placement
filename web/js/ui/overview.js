import { h } from "../dom.js";
import { formatNumber } from "../format.js";

function tile(label, value) {
  return h(
    "div",
    { class: "rounded-xl border border-line bg-surface px-4 py-3" },
    h("dt", { class: "text-sm text-ink-muted" }, label),
    h("dd", { class: "mt-1 text-xl font-semibold text-ink sm:text-2xl" }, value),
  );
}

// The headline numbers. Values that are not known yet show a dash rather
// than a misleading zero.
export function renderOverview(container, meta) {
  const range = meta?.data.dateRange;
  const hasData = Boolean(meta && meta.data.records > 0);
  container.replaceChildren(
    tile("Sightings", hasData ? formatNumber(meta.data.records) : "–"),
    tile("Cities", meta ? formatNumber(meta.locations.length) : "–"),
    tile("Species", meta ? formatNumber(meta.species.length) : "–"),
    tile(
      "Years covered",
      range ? `${range.earliest.slice(0, 4)}–${range.latest.slice(0, 4)}` : "–",
    ),
  );
}
