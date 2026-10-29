const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { buildTrend, parseInterval, trendRange } = require("../src/analysis/trends");
const { formatDay, makeWallClock } = require("../src/lib/dates");

function sightingOn(year, month, day, hour = 12) {
  return { date: makeWallClock(year, month, day, hour) };
}

function asText(points) {
  return points.map((point) => `${point.period}:${point.count}`);
}

const range = (from, to) => ({ from, to });

describe("buildTrend", () => {
  it("counts sightings per month and fills empty months with zero", () => {
    const sightings = [sightingOn(2024, 1, 5), sightingOn(2024, 1, 20), sightingOn(2024, 3, 1)];
    const points = buildTrend(
      sightings,
      "month",
      range(makeWallClock(2024, 1, 1), makeWallClock(2024, 4, 30)),
    );

    assert.deepEqual(asText(points), ["2024-01:2", "2024-02:0", "2024-03:1", "2024-04:0"]);
    assert.equal(formatDay(points[1].start), "2024-02-01");
  });

  it("starts at the beginning of the period that contains the first day", () => {
    const points = buildTrend(
      [sightingOn(2024, 2, 20)],
      "month",
      range(makeWallClock(2024, 2, 15), makeWallClock(2024, 2, 28)),
    );
    assert.deepEqual(asText(points), ["2024-02:1"]);
  });

  it("uses ISO weeks, which start on Monday and can belong to the next year", () => {
    const sightings = [sightingOn(2024, 12, 30), sightingOn(2025, 1, 2), sightingOn(2025, 1, 6)];
    const points = buildTrend(
      sightings,
      "week",
      range(makeWallClock(2024, 12, 23), makeWallClock(2025, 1, 12)),
    );

    assert.deepEqual(asText(points), ["2024-W52:0", "2025-W01:2", "2025-W02:1"]);
    assert.equal(formatDay(points[1].start), "2024-12-30");
  });

  it("counts per year", () => {
    const sightings = [sightingOn(2022, 6, 1), sightingOn(2024, 1, 1), sightingOn(2024, 12, 31)];
    const points = buildTrend(
      sightings,
      "year",
      range(makeWallClock(2022, 1, 1), makeWallClock(2024, 12, 31)),
    );
    assert.deepEqual(asText(points), ["2022:1", "2023:0", "2024:2"]);
  });

  it("keeps a sighting at 23:30 on 31 December in that year", () => {
    const points = buildTrend(
      [sightingOn(2022, 12, 31, 23)],
      "month",
      range(makeWallClock(2022, 12, 1), makeWallClock(2023, 1, 31)),
    );
    assert.deepEqual(asText(points), ["2022-12:1", "2023-01:0"]);
  });

  it("returns all zeros when nothing matches", () => {
    const points = buildTrend(
      [],
      "month",
      range(makeWallClock(2024, 1, 1), makeWallClock(2024, 3, 31)),
    );
    assert.deepEqual(asText(points), ["2024-01:0", "2024-02:0", "2024-03:0"]);
  });
});

describe("trendRange", () => {
  const dateRange = {
    earliest: makeWallClock(2012, 1, 3, 9, 30),
    latest: makeWallClock(2024, 12, 30, 16, 0),
  };

  it("covers the whole dataset when no dates are chosen", () => {
    assert.deepEqual(trendRange({}, dateRange), { from: dateRange.earliest, to: dateRange.latest });
  });

  it("never extends past the data, so the line does not drop to zero where data ends", () => {
    const result = trendRange(
      { from: makeWallClock(2000, 1, 1), to: makeWallClock(2030, 1, 1) },
      dateRange,
    );
    assert.deepEqual(result, { from: dateRange.earliest, to: dateRange.latest });
  });

  it("narrows to the chosen dates inside the data", () => {
    const from = makeWallClock(2020, 1, 1);
    const to = makeWallClock(2020, 12, 31);
    assert.deepEqual(trendRange({ from, to }, dateRange), { from, to });
  });

  it("returns null when the chosen dates are outside the data", () => {
    assert.equal(trendRange({ from: makeWallClock(2026, 1, 1) }, dateRange), null);
  });
});

describe("parseInterval", () => {
  it("defaults to month", () => {
    assert.deepEqual(parseInterval({}), { value: "month", errors: [] });
  });

  it("accepts week, month and year in any case", () => {
    assert.equal(parseInterval({ interval: "WEEK" }).value, "week");
    assert.equal(parseInterval({ interval: "year" }).value, "year");
  });

  it("rejects anything else", () => {
    const { errors } = parseInterval({ interval: "daily" });
    assert.deepEqual(errors, [
      { field: "interval", message: 'Choose an interval of "week", "month" or "year".' },
    ]);
  });
});
