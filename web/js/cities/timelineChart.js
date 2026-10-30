import { barDataset, categoryAxis, countAxis } from "../charts/theme.js";
import { formatNumber, plural } from "../format.js";

function busiestPoint(points) {
  return points.reduce((best, point) => (point.count > best.count ? point : best), points[0]);
}

// Sightings per year in one city, showing how activity has progressed there.
// The data is the trends response plus the city's name.
export const TIMELINE_CHART = Object.freeze({
  height: "h-48",
  isEmpty: (data) => data.points.length === 0 || data.total === 0,
  emptyMessage: {
    title: "Nothing to chart",
    message: "No sightings in this city match the current filters.",
  },
  summary: (data) => {
    const busiest = busiestPoint(data.points);
    const first = data.points[0].period;
    const last = data.points[data.points.length - 1].period;
    return `Bar chart of sightings per year in ${data.city} from ${first} to ${last}. The busiest year was ${busiest.period}, with ${plural(busiest.count, "sighting")}.`;
  },
  table: (data) => ({
    caption: `Sightings per year in ${data.city}`,
    columns: ["Year", "Sightings"],
    rows: data.points.map((point) => [point.period, formatNumber(point.count)]),
  }),
  chartConfig: (data) => ({
    type: "bar",
    data: {
      labels: data.points.map((point) => point.period),
      datasets: [barDataset(data.points.map((point) => point.count))],
    },
    options: {
      scales: { x: categoryAxis(), y: countAxis() },
      plugins: {
        tooltip: { callbacks: { label: (item) => plural(item.parsed.y, "sighting") } },
      },
    },
  }),
});
