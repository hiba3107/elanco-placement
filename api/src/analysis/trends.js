const { countBy } = require("../lib/collections");
const {
  addDays,
  addMonths,
  addYears,
  isoWeekKey,
  monthKey,
  startOfIsoWeek,
  startOfMonth,
  startOfYear,
  yearKey,
} = require("../lib/dates");

const INTERVALS = Object.freeze({
  week: { startOf: startOfIsoWeek, next: (start) => addDays(start, 7), keyOf: isoWeekKey },
  month: { startOf: startOfMonth, next: (start) => addMonths(start, 1), keyOf: monthKey },
  year: { startOf: startOfYear, next: (start) => addYears(start, 1), keyOf: yearKey },
});

const DEFAULT_INTERVAL = "month";
const MAX_TREND_POINTS = 1000;

function parseInterval(query) {
  const raw = query.interval;
  if (raw === undefined || raw === "") {
    return { value: DEFAULT_INTERVAL, errors: [] };
  }
  const interval = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!Object.hasOwn(INTERVALS, interval)) {
    return {
      value: null,
      errors: [{ field: "interval", message: 'Choose an interval of "week", "month" or "year".' }],
    };
  }
  return { value: interval, errors: [] };
}

// A trend only covers the period that has data: zeros after Elanco's last
// sighting would look like activity stopping when the data simply ends.
function trendRange(filters, dateRange) {
  const from =
    filters.from && filters.from > dateRange.earliest ? filters.from : dateRange.earliest;
  const to = filters.to && filters.to < dateRange.latest ? filters.to : dateRange.latest;
  return from <= to ? { from, to } : null;
}

function periodStarts(interval, { from, to }) {
  const { startOf, next } = INTERVALS[interval];
  const starts = [];
  for (let start = startOf(from); start <= to; start = next(start)) {
    starts.push(start);
  }
  return starts;
}

/**
 * Counts sightings per week, month or year across a range, including the
 * periods with none. Dropping empty periods would make a line chart join the
 * dots straight across a quiet spell and hide it.
 */
function buildTrend(sightings, interval, range) {
  const { keyOf } = INTERVALS[interval];
  const counts = countBy(sightings, (sighting) => keyOf(sighting.date));
  return periodStarts(interval, range).map((start) => ({
    period: keyOf(start),
    start,
    count: counts.get(keyOf(start)) ?? 0,
  }));
}

module.exports = { MAX_TREND_POINTS, buildTrend, parseInterval, trendRange };
