import { plural } from "../format.js";

// The key numbers, as one quiet sentence under the introduction, so it wraps
// naturally on a phone. A number that is not known yet is left out rather
// than shown as a misleading zero.
export function renderOverview(container, meta) {
  if (!meta) {
    container.textContent = "";
    container.hidden = true;
    return;
  }
  const { records, dateRange } = meta.data;
  const sightings = records > 0 ? `${plural(records, "sighting")} across ` : "";
  const places = `${plural(meta.locations.length, "city", "cities")} and ${plural(meta.species.length, "species", "species")}`;
  const years = dateRange
    ? `, from ${dateRange.earliest.slice(0, 4)} to ${dateRange.latest.slice(0, 4)}`
    : "";
  container.textContent = `In the data: ${sightings}${places}${years}.`;
  container.hidden = false;
}
