const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { referenceDateFor, selectSightings } = require("../src/analysis/selection");
const { addDays, makeWallClock } = require("../src/lib/dates");
const { LOCATION_NAMES } = require("../src/reference/locations");

const LATEST = makeWallClock(2024, 12, 30, 16, 0);
const DATE_RANGE = { earliest: makeWallClock(2012, 1, 3), latest: LATEST };

// Every city gets two recent sightings; a few get extra so the bands differ.
const EXTRA = { London: 3, Leeds: 2, Cardiff: -1, Bristol: -1 };
const SIGHTINGS = LOCATION_NAMES.flatMap((location) => {
  const count = 2 + (EXTRA[location] ?? 0);
  return Array.from({ length: count }, (_, index) => ({
    id: `${location}-${index}`,
    location,
    species: index % 2 === 0 ? "Marsh tick" : "Tree-hole tick",
    date: addDays(LATEST, -index),
  }));
});

function bandsOf(selection) {
  return Object.fromEntries(selection.ratings.map((rating) => [rating.location, rating.band]));
}

describe("referenceDateFor", () => {
  it("uses the newest sighting when no end date is chosen", () => {
    assert.equal(referenceDateFor({}, DATE_RANGE), LATEST);
  });

  it("uses the end of the chosen period when it is earlier", () => {
    const to = makeWallClock(2020, 6, 30, 23, 59);
    assert.equal(referenceDateFor({ to }, DATE_RANGE), to);
  });

  it("does not use a future end date", () => {
    assert.equal(referenceDateFor({ to: makeWallClock(2030, 1, 1) }, DATE_RANGE), LATEST);
  });
});

describe("selectSightings", () => {
  const unfiltered = selectSightings(SIGHTINGS, {}, DATE_RANGE);

  it("rates every city when nothing is filtered", () => {
    assert.equal(unfiltered.ratings.length, 14);
    assert.equal(unfiltered.sightings.length, SIGHTINGS.length);
    assert.equal(bandsOf(unfiltered).London, "high");
    assert.equal(bandsOf(unfiltered).Glasgow, "medium");
    assert.equal(bandsOf(unfiltered).Cardiff, "low");
  });

  it("does not change a city's band when another city is picked", () => {
    const leedsOnly = selectSightings(SIGHTINGS, { locations: ["Leeds"] }, DATE_RANGE);

    assert.deepEqual(
      leedsOnly.ratings,
      unfiltered.ratings.filter((r) => r.location === "Leeds"),
    );
    assert.ok(leedsOnly.sightings.every((sighting) => sighting.location === "Leeds"));
  });

  it("shows only the cities in the chosen severity bands", () => {
    const high = selectSightings(SIGHTINGS, { severities: ["high"] }, DATE_RANGE);

    assert.deepEqual(
      high.ratings.map((rating) => rating.location),
      ["Leeds", "London"],
    );
    assert.ok(high.sightings.every((s) => ["Leeds", "London"].includes(s.location)));
  });

  it("re-rates severity on only the chosen species", () => {
    const marsh = selectSightings(SIGHTINGS, { species: ["Marsh tick"] }, DATE_RANGE);

    assert.ok(marsh.sightings.every((sighting) => sighting.species === "Marsh tick"));
    assert.notDeepEqual(bandsOf(marsh), bandsOf(unfiltered));
  });

  it("returns no sightings, but still rates every city, when nothing matches", () => {
    const empty = selectSightings(SIGHTINGS, { from: makeWallClock(2026, 1, 1) }, DATE_RANGE);

    assert.deepEqual(empty.sightings, []);
    assert.equal(empty.ratings.length, 14);
    assert.ok(empty.ratings.every((rating) => rating.band === "low"));
  });
});
