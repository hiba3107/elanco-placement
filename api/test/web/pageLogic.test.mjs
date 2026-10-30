import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { countActiveFilters, sanitiseFilters } from "../../../web/js/filters/filterValues.js";
import { formatDay, formatPeriod, nowInUk, parseWallClock } from "../../../web/js/format.js";
import { describeTrend } from "../../../web/js/insights/trendChart.js";
import { describeMarker, markerSize, mostSeenBadge } from "../../../web/js/map/markers.js";
import { distanceKm, isFarAway, nearestCity } from "../../../web/js/report/location.js";
import { describeSeasonalPattern } from "../../../web/js/seasonal/seasonalChart.js";
import { describeComparedToMedian } from "../../../web/js/severity.js";

const SPECIES = ["Marsh tick", "Tree-hole tick"];

describe("sanitiseFilters", () => {
  it("keeps valid filters from a link untouched", () => {
    const filters = {
      from: "2024-01-01",
      to: "2024-12-30",
      species: ["Marsh tick"],
      severity: ["high"],
    };
    assert.deepEqual(sanitiseFilters(filters, SPECIES), { filters, changed: false });
  });

  it("drops anything that does not exist, and says it did", () => {
    const { filters, changed } = sanitiseFilters(
      {
        from: "2024-02-30",
        to: "soon",
        species: ["Deer tick", "Marsh tick", "Marsh tick"],
        severity: ["extreme"],
      },
      SPECIES,
    );
    assert.equal(changed, true);
    assert.deepEqual(filters, { from: null, to: null, species: ["Marsh tick"], severity: [] });
  });

  it("drops an end date before the start date", () => {
    const { filters } = sanitiseFilters(
      { from: "2024-06-01", to: "2024-01-01", species: [], severity: [] },
      SPECIES,
    );
    assert.equal(filters.to, null);
  });

  it("counts the active filters", () => {
    assert.equal(
      countActiveFilters({
        from: "2024-01-01",
        to: null,
        species: ["Marsh tick"],
        severity: ["high", "low"],
      }),
      4,
    );
  });
});

describe("dates on the page", () => {
  it("shows sighting times exactly as recorded, whatever the device's timezone", () => {
    assert.equal(parseWallClock("2024-03-31T23:30:00").toISOString(), "2024-03-31T23:30:00.000Z");
    assert.equal(formatDay("2024-12-31T23:30:00"), "31 Dec 2024");
  });

  it("knows the current UK time in summer and winter", () => {
    assert.equal(nowInUk(new Date("2026-07-01T11:00:00Z")), "2026-07-01T12:00");
    assert.equal(nowInUk(new Date("2026-12-01T11:00:00Z")), "2026-12-01T11:00");
  });

  it("names periods for charts", () => {
    assert.equal(formatPeriod({ start: "2024-03-01" }, "month"), "Mar 2024");
    assert.equal(formatPeriod({ start: "2024-01-01" }, "year"), "2024");
    assert.equal(formatPeriod({ start: "2024-12-30" }, "week"), "Week of 30 Dec 2024");
  });
});

describe("map markers", () => {
  it("scales the circle's area, not its width, with the number of sightings", () => {
    assert.equal(markerSize(100, 100), 38);
    assert.equal(markerSize(25, 100), 22);
    assert.equal(markerSize(64, 100), 30);
  });

  it("shows a species letter, or = when species are tied", () => {
    assert.equal(mostSeenBadge({ names: ["Marsh tick"], count: 4 }), "M");
    assert.equal(mostSeenBadge({ names: ["Marsh tick", "Tree-hole tick"], count: 4 }), "=");
  });

  it("describes a marker in words for screen readers", () => {
    const description = describeMarker({
      location: "Leeds",
      total: 59,
      severity: { band: "medium" },
      mostSeenSpecies: { names: ["Marsh tick", "Tree-hole tick"], count: 14 },
      recentCount: 1,
    });
    assert.equal(
      description,
      "Leeds: 59 sightings, medium severity, most seen Marsh tick and Tree-hole tick (14 each), 1 sighting in the last 30 days of the data, Press Enter for details",
    );
  });
});

describe("severity in words", () => {
  it("says how far a city is from the median", () => {
    assert.equal(
      describeComparedToMedian({ score: 5, comparedToMedian: 1.32 }),
      "32% above the median city",
    );
    assert.equal(
      describeComparedToMedian({ score: 3, comparedToMedian: 0.75 }),
      "25% below the median city",
    );
    assert.equal(
      describeComparedToMedian({ score: 4, comparedToMedian: 1.001 }),
      "About the same as the median city",
    );
    assert.equal(
      describeComparedToMedian({ score: 2, comparedToMedian: null }),
      "One of the few cities with any sightings in this period",
    );
  });
});

describe("chart captions", () => {
  it("never claims a seasonal peak the data does not support", () => {
    const scope = "across all cities and years";
    assert.match(
      describeSeasonalPattern({ kind: "too-few", total: 7, minimumNeeded: 60 }, scope),
      /^Only 7 sightings across all cities and years\. At least 60 are needed/,
    );
    assert.match(
      describeSeasonalPattern({ kind: "even", peakMonths: [8], quietestMonths: [12] }, scope),
      /^No clear seasonal pattern across all cities and years\. .* busiest was August and the quietest December\.$/,
    );
    assert.equal(
      describeSeasonalPattern(
        { kind: "seasonal", peakMonths: [6, 7], quietestMonths: [1, 2, 12] },
        scope,
      ),
      "Sightings across all cities and years peak in June and July and are lowest in January, February and December.",
    );
  });

  it("describes a trend with its busiest period", () => {
    const data = {
      interval: "week",
      total: 3,
      points: [
        { start: "2024-12-23", count: 1 },
        { start: "2024-12-30", count: 2 },
      ],
    };
    assert.equal(
      describeTrend(data),
      "3 sightings from the week of 23 Dec 2024 to the week of 30 Dec 2024. Busiest week: the week of 30 Dec 2024, with 2.",
    );
  });
});

describe("nearest city", () => {
  const cities = [
    { name: "London", lat: 51.5074, lng: -0.1278 },
    { name: "Leeds", lat: 53.8008, lng: -1.5491 },
  ];

  it("measures distance over the Earth's surface", () => {
    assert.ok(Math.abs(distanceKm(cities[0], cities[1]) - 272) < 3);
  });

  it("picks the closest city and flags one that is far away", () => {
    const { city, distance } = nearestCity({ lat: 53.4, lng: -1.5 }, cities);
    assert.equal(city.name, "Leeds");
    assert.equal(isFarAway(distance), false);
    assert.equal(isFarAway(nearestCity({ lat: 48.85, lng: 2.35 }, cities).distance), true);
  });
});
