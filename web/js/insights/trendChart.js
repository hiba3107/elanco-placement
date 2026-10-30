import { barDataset, categoryAxis, countAxis, lineDataset } from "../charts/theme.js";
import { formatDay, formatNumber, formatPeriod, plural } from "../format.js";

const PERIOD_NAMES = { week: "week", month: "month", year: "year" };

function busiestPoint(points) {
  return points.reduce((best, point) => (point.count > best.count ? point : best), points[0]);
}

// A period as it reads inside a sentence: "the week of 3 Jan 2022".
function periodInSentence(point, interval) {
  return interval === "week"
    ? `the week of ${formatDay(point.start)}`
    : formatPeriod(point, interval);
}

export function describeTrend(data) {
  const busiest = busiestPoint(data.points);
  const first = periodInSentence(data.points[0], data.interval);
  const last = periodInSentence(data.points[data.points.length - 1], data.interval);
  return `${plural(data.total, "sighting")} from ${first} to ${last}. Busiest ${PERIOD_NAMES[data.interval]}: ${periodInSentence(busiest, data.interval)}, with ${formatNumber(busiest.count)}.`;
}

// Weeks and months are a line over a faint wash (bars would be too thin to
// read); years are bars. Empty periods are zeros from the API, so a quiet
// spell shows as a dip rather than being skipped.
export const TREND_CHART = Object.freeze({
  height: "h-72",
  isEmpty: (data) => data.points.length === 0 || data.total === 0,
  emptyMessage: {
    title: "No sightings in this period",
    message: "Try a wider date range, or fewer species or severity levels.",
  },
  summary: (data) =>
    `${data.interval === "year" ? "Bar" : "Line"} chart of sightings per ${PERIOD_NAMES[data.interval]}. ${describeTrend(data)}`,
  caption: describeTrend,
  table: (data) => ({
    caption: `Sightings per ${PERIOD_NAMES[data.interval]}`,
    columns: ["Period", "Sightings"],
    rows: data.points.map((point) => [
      formatPeriod(point, data.interval),
      formatNumber(point.count),
    ]),
  }),
  chartConfig: (data) => {
    const counts = data.points.map((point) => point.count);
    const isYearly = data.interval === "year";
    return {
      type: isYearly ? "bar" : "line",
      data: {
        labels: data.points.map((point) => formatPeriod(point, data.interval)),
        datasets: [isYearly ? barDataset(counts) : lineDataset(counts)],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        scales: { x: categoryAxis(), y: countAxis() },
        plugins: {
          tooltip: { callbacks: { label: (item) => plural(item.parsed.y, "sighting") } },
        },
      },
    };
  },
});
