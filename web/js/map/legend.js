import { h } from "../dom.js";

function legendRow(symbol, text) {
  return h("li", { class: "flex items-center gap-2" }, symbol, h("span", {}, text));
}

function legendContents() {
  return h(
    "ul",
    { class: "mt-2 space-y-1.5" },
    legendRow(h("span", { class: "swatch swatch--high", "aria-hidden": "true" }), "High severity"),
    legendRow(
      h("span", { class: "swatch swatch--medium", "aria-hidden": "true" }),
      "Medium severity",
    ),
    legendRow(h("span", { class: "swatch swatch--low", "aria-hidden": "true" }), "Low severity"),
    legendRow(
      h("span", {
        class: "swatch",
        style: "box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--series)",
        "aria-hidden": "true",
      }),
      "Ring: seen in the last 30 days of the data",
    ),
    legendRow(
      h("span", { class: "font-semibold", "aria-hidden": "true" }, "Size"),
      "Bigger circle: more sightings",
    ),
    legendRow(
      h("span", { class: "whitespace-nowrap font-semibold", "aria-hidden": "true" }, "F M P S T"),
      "Most-seen species (= for a tie)",
    ),
  );
}

// The key sits in the map's top-right corner (open sea on a UK map), open on
// large screens and folded away on phones where space is tight.
export function addLegend(map) {
  const legend = L.control({ position: "topright" });
  legend.onAdd = () => {
    const element = h(
      "details",
      { class: "map-legend", open: window.matchMedia("(min-width: 640px)").matches },
      h("summary", {}, "Map key"),
      legendContents(),
    );
    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.disableScrollPropagation(element);
    return element;
  };
  legend.addTo(map);
}
