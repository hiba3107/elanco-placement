import { barDataset, categoryAxis, countAxis } from "../charts/theme.js";
import { formatDecimal, formatNumber, plural } from "../format.js";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function listMonths(monthNumbers) {
  const names = monthNumbers.map((month) => MONTH_NAMES[month - 1]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * Puts the API's verdict on the seasonal pattern into words. The page never
 * claims a peak the numbers do not support: with few sightings it says so,
 * and when the months differ only by chance it says there is no pattern.
 */
export function describeSeasonalPattern(pattern, scope) {
  if (pattern.kind === "too-few") {
    return `Only ${plural(pattern.total, "sighting")} ${scope}. At least ${pattern.minimumNeeded} are needed to tell whether there is a seasonal pattern.`;
  }
  if (pattern.kind === "even") {
    return `No clear seasonal pattern ${scope}. The months differ only as much as chance would produce: the busiest was ${listMonths(pattern.peakMonths)} and the quietest ${listMonths(pattern.quietestMonths)}.`;
  }
  return `Sightings ${scope} peak in ${listMonths(pattern.peakMonths)} and are lowest in ${listMonths(pattern.quietestMonths)}.`;
}

// Twelve columns, one per calendar month, with a line at the average month so
// it is easy to see how far each month really is from even.
export const SEASONAL_CHART = Object.freeze({
  height: "h-72",
  isEmpty: (data) => data.total === 0,
  emptyMessage: {
    title: "No sightings for this choice",
    message: "Try another city or year, or choose all of them.",
  },
  summary: (data) =>
    `Column chart of sightings in each month of the year, ${plural(data.total, "sighting")} in total, averaging ${formatDecimal(data.averagePerMonth)} a month.`,
  table: (data) => ({
    caption: "Sightings in each month of the year",
    columns: ["Month", "Sightings"],
    rows: data.months.map((month) => [month.name, formatNumber(month.count)]),
  }),
  chartConfig: (data) => ({
    type: "bar",
    data: {
      labels: data.months.map((month) => month.name.slice(0, 3)),
      datasets: [barDataset(data.months.map((month) => month.count))],
    },
    options: {
      scales: { x: categoryAxis(), y: countAxis() },
      plugins: {
        referenceLine: {
          value: data.averagePerMonth,
          label: `Average month: ${formatDecimal(data.averagePerMonth)}`,
        },
        tooltip: {
          callbacks: {
            title: (items) => data.months[items[0].dataIndex].name,
            label: (item) => plural(item.parsed.y, "sighting"),
          },
        },
      },
    },
  }),
});
