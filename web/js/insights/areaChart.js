import { barDataset, countAxis } from "../charts/theme.js";
import { formatNumber, plural } from "../format.js";

// Turns either API response into the same rows: cities from
// /api/insights/locations, or UK regions from /api/insights/regions.
export function areaRows(response, grouping) {
  const rows =
    grouping === "region"
      ? response.regions.map((region) => ({
          name: region.region,
          total: region.total,
          detail: region.locations.join(", "),
        }))
      : response.locations.map((location) => ({
          name: location.location,
          total: location.total,
          detail: location.region,
        }));
  return rows.sort(
    (first, second) => second.total - first.total || first.name.localeCompare(second.name),
  );
}

function describeLeader({ rows }) {
  const [top] = rows;
  return `${top.name} has the most, with ${plural(top.total, "sighting")}.`;
}

// One horizontal bar per city or region, largest first, each with its value
// written at the end of the bar. Nominal categories, so every bar is the same
// colour: the length carries the number.
export const AREA_CHART = Object.freeze({
  height: "h-96",
  isEmpty: (data) => data.rows.length === 0,
  emptyMessage: {
    title: "No sightings match these filters",
    message: "Try a wider date range, or fewer species or severity levels.",
  },
  summary: (data) =>
    `Bar chart of sightings by ${data.grouping === "region" ? "UK region" : "city"}. ${describeLeader(data)}`,
  caption: describeLeader,
  table: (data) => ({
    caption: data.grouping === "region" ? "Sightings by UK region" : "Sightings by city",
    columns: [data.grouping === "region" ? "Region (cities)" : "City (region)", "Sightings"],
    rows: data.rows.map((row) => [`${row.name} (${row.detail})`, formatNumber(row.total)]),
  }),
  chartConfig: (data) => ({
    type: "bar",
    data: {
      labels: data.rows.map((row) => row.name),
      datasets: [barDataset(data.rows.map((row) => row.total))],
    },
    options: {
      indexAxis: "y",
      layout: { padding: { right: 40 } },
      scales: {
        x: { ...countAxis(), ticks: { display: false }, grid: { display: false } },
        y: { grid: { display: false }, border: { display: false } },
      },
      plugins: {
        barValueLabels: { display: true },
        tooltip: { callbacks: { label: (item) => plural(item.parsed.x, "sighting") } },
      },
    },
  }),
});
