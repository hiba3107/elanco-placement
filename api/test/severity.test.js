const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { addDays, makeWallClock } = require("../src/lib/dates");
const { SEVERITY_RULE, rateLocationSeverity, recencyWeight } = require("../src/analysis/severity");

const REFERENCE_DATE = makeWallClock(2024, 12, 30, 12, 0);
const CITIES = ["Bristol", "Cardiff", "Glasgow", "Leeds", "London"];

// Makes one sighting per age, each that many days before the reference date.
function sightingsIn(location, ...agesInDays) {
  return agesInDays.map((age) => ({ location, date: addDays(REFERENCE_DATE, -age) }));
}

function rate(sightings, locations = CITIES) {
  return rateLocationSeverity(sightings, { locations, referenceDate: REFERENCE_DATE });
}

function ratingFor(result, location) {
  return result.ratings.find((rating) => rating.location === location);
}

function bands(result) {
  return Object.fromEntries(result.ratings.map((rating) => [rating.location, rating.band]));
}

describe("recencyWeight", () => {
  it("counts a sighting on the reference date as 1", () => {
    assert.equal(recencyWeight(REFERENCE_DATE, REFERENCE_DATE), 1);
  });

  it("halves the weight for every year of age", () => {
    assert.equal(recencyWeight(addDays(REFERENCE_DATE, -365), REFERENCE_DATE), 0.5);
    assert.equal(recencyWeight(addDays(REFERENCE_DATE, -730), REFERENCE_DATE), 0.25);
    assert.equal(recencyWeight(addDays(REFERENCE_DATE, -1095), REFERENCE_DATE), 0.125);
  });

  it("never gives more than 1 to a sighting after the reference date", () => {
    assert.equal(recencyWeight(addDays(REFERENCE_DATE, 10), REFERENCE_DATE), 1);
  });

  it("uses a 12-month half-life by default", () => {
    assert.equal(SEVERITY_RULE.halfLifeDays, 365);
  });
});

describe("rateLocationSeverity", () => {
  it("scores each city as the sum of its sightings' weights", () => {
    const result = rate([...sightingsIn("Leeds", 0, 0), ...sightingsIn("London", 0, 365)]);

    assert.equal(ratingFor(result, "Leeds").score, 2);
    assert.equal(ratingFor(result, "London").score, 1.5);
  });

  it("ranks a few recent sightings above many old ones", () => {
    const result = rate([
      ...sightingsIn("Leeds", 10, 20),
      ...sightingsIn("London", 1095, 1100, 1105, 1110),
    ]);

    assert.ok(ratingFor(result, "Leeds").score > ratingFor(result, "London").score);
  });

  it("bands cities against the median, with both 25% thresholds inclusive", () => {
    // Every sighting is on the reference date, so each score is just a count.
    const result = rate([
      ...sightingsIn("London", 0, 0, 0, 0, 0),
      ...sightingsIn("Leeds", 0, 0, 0, 0),
      ...sightingsIn("Glasgow", 0, 0, 0, 0),
      ...sightingsIn("Cardiff", 0, 0, 0, 0),
      ...sightingsIn("Bristol", 0, 0, 0),
    ]);

    assert.equal(result.medianScore, 4);
    assert.deepEqual(bands(result), {
      London: "high",
      Leeds: "medium",
      Glasgow: "medium",
      Cardiff: "medium",
      Bristol: "low",
    });
    assert.equal(ratingFor(result, "London").comparedToMedian, 1.25);
    assert.equal(ratingFor(result, "Bristol").comparedToMedian, 0.75);
  });

  it("keeps cities just inside the thresholds as medium", () => {
    // 4.5 is 12.5% above the median of 4 and 3.5 is 12.5% below it.
    const result = rate([
      ...sightingsIn("London", 0, 0, 0, 0, 365),
      ...sightingsIn("Leeds", 0, 0, 0, 0),
      ...sightingsIn("Glasgow", 0, 0, 0, 0),
      ...sightingsIn("Cardiff", 0, 0, 0, 0),
      ...sightingsIn("Bristol", 0, 0, 0, 365),
    ]);

    assert.equal(ratingFor(result, "London").band, "medium");
    assert.equal(ratingFor(result, "Bristol").band, "medium");
  });

  it("calls every city medium when they are all equally active", () => {
    const result = rate(CITIES.flatMap((city) => sightingsIn(city, 5, 50, 500)));

    assert.deepEqual(new Set(Object.values(bands(result))), new Set(["medium"]));
  });

  it("rates a city with no sightings as low", () => {
    const result = rate(CITIES.slice(1).flatMap((city) => sightingsIn(city, 0, 0)));

    assert.deepEqual(ratingFor(result, "Bristol"), {
      location: "Bristol",
      score: 0,
      band: "low",
      comparedToMedian: 0,
    });
  });

  it("rates any city with sightings as high when most cities have none", () => {
    const result = rate(sightingsIn("Leeds", 100));

    assert.equal(result.medianScore, 0);
    assert.equal(ratingFor(result, "Leeds").band, "high");
    assert.equal(ratingFor(result, "Leeds").comparedToMedian, null);
    assert.equal(ratingFor(result, "London").band, "low");
  });

  it("returns a rating for every listed city and ignores unknown ones", () => {
    const result = rate([...sightingsIn("Leeds", 0), ...sightingsIn("Atlantis", 0)]);

    assert.deepEqual(
      result.ratings.map((rating) => rating.location),
      CITIES,
    );
  });

  it("applies a different rule when given one", () => {
    const quarterlyHalfLife = { ...SEVERITY_RULE, halfLifeDays: 91.25 };
    const result = rateLocationSeverity(sightingsIn("Leeds", 365), {
      locations: ["Leeds"],
      referenceDate: REFERENCE_DATE,
      rule: quarterlyHalfLife,
    });

    assert.equal(result.ratings[0].score, 0.0625);
  });
});
