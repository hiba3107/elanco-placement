const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  CHI_SQUARED_CRITICAL_VALUE,
  buildSeasonalProfile,
  describeSeasonalPattern,
} = require("../src/analysis/seasonal");
const { makeWallClock } = require("../src/lib/dates");

// Turns twelve monthly counts into sightings spread over those months.
function sightingsFromMonthlyCounts(counts) {
  return counts.flatMap((count, monthIndex) =>
    Array.from({ length: count }, (_, index) => ({
      date: makeWallClock(2020 + (index % 4), monthIndex + 1, 1 + (index % 28)),
    })),
  );
}

describe("buildSeasonalProfile", () => {
  it("counts sightings in each calendar month across years", () => {
    const sightings = [
      { date: makeWallClock(2019, 3, 10) },
      { date: makeWallClock(2023, 3, 31, 23, 30) },
      { date: makeWallClock(2024, 12, 1) },
    ];
    const profile = buildSeasonalProfile(sightings);

    assert.equal(profile.months.length, 12);
    assert.deepEqual(profile.months[2], { month: 3, name: "March", count: 2 });
    assert.deepEqual(profile.months[11], { month: 12, name: "December", count: 1 });
    assert.equal(profile.total, 3);
    assert.equal(profile.averagePerMonth, 0.25);
  });
});

describe("describeSeasonalPattern", () => {
  it("says there are too few sightings to judge below 60", () => {
    const pattern = describeSeasonalPattern([9, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0]);

    assert.equal(pattern.kind, "too-few");
    assert.equal(pattern.total, 59);
    assert.equal(pattern.minimumNeeded, 60);
    assert.equal(pattern.chiSquared, null);
    assert.deepEqual(pattern.peakMonths, [1]);
  });

  it("calls perfectly flat counts even", () => {
    const pattern = describeSeasonalPattern(new Array(12).fill(10));

    assert.equal(pattern.kind, "even");
    assert.equal(pattern.chiSquared, 0);
  });

  it("calls ordinary random wobble even, rather than inventing a peak", () => {
    const pattern = describeSeasonalPattern([12, 8, 11, 9, 10, 13, 7, 10, 11, 9, 10, 10]);

    assert.equal(pattern.kind, "even");
    assert.equal(pattern.chiSquared, 3);
    assert.deepEqual(pattern.peakMonths, [6]);
    assert.deepEqual(pattern.quietestMonths, [7]);
  });

  it("detects a genuine summer peak", () => {
    const pattern = describeSeasonalPattern([2, 2, 4, 10, 20, 25, 25, 20, 10, 4, 2, 2]);

    assert.equal(pattern.kind, "seasonal");
    assert.ok(pattern.chiSquared > CHI_SQUARED_CRITICAL_VALUE);
    assert.deepEqual(pattern.peakMonths, [6, 7]);
    assert.deepEqual(pattern.quietestMonths, [1, 2, 11, 12]);
  });

  it("handles no sightings at all", () => {
    const pattern = describeSeasonalPattern(new Array(12).fill(0));

    assert.equal(pattern.kind, "too-few");
    assert.deepEqual(pattern.peakMonths, []);
    assert.deepEqual(pattern.quietestMonths, []);
  });

  it("works on a profile built from sightings", () => {
    const counts = [12, 8, 11, 9, 10, 13, 7, 10, 11, 9, 10, 10];
    const profile = buildSeasonalProfile(sightingsFromMonthlyCounts(counts));

    assert.deepEqual(
      profile.months.map((month) => month.count),
      counts,
    );
    assert.equal(profile.pattern.kind, "even");
  });
});
