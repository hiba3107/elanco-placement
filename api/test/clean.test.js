const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const messyRecords = require("./fixtures/messy-sightings.json");
const { formatTimestamp, makeWallClock } = require("../src/lib/dates");
const { cleanSightings } = require("../src/sightings/clean");

const NOW = makeWallClock(2026, 10, 29, 12, 0);

function clean(records) {
  return cleanSightings(records, { now: NOW });
}

function countFor(entries, code) {
  return entries.find((entry) => entry.code === code).count;
}

function record(overrides = {}) {
  return {
    id: "abc123",
    date: "2024-05-01T10:00:00",
    location: "London",
    species: "Marsh tick",
    latinName: "Ixodes apronophorus",
    ...overrides,
  };
}

describe("cleanSightings with the messy fixture", () => {
  const { sightings, report } = clean(messyRecords);
  const keptIds = sightings.map((sighting) => sighting.id);

  it("accounts for every record it received", () => {
    assert.equal(report.received, 33);
    assert.equal(report.kept, 9);
    assert.equal(report.removed, 24);
    const removedTotal = report.removedByReason.reduce((total, entry) => total + entry.count, 0);
    assert.equal(removedTotal, report.removed);
  });

  it("counts removals by reason", () => {
    const expected = {
      notAnObject: 3,
      missingField: 6,
      invalidDate: 6,
      futureDate: 1,
      implausibleDate: 1,
      unknownLocation: 2,
      unknownSpecies: 1,
      duplicateId: 2,
      duplicateSighting: 2,
    };
    for (const [code, count] of Object.entries(expected)) {
      assert.equal(countFor(report.removedByReason, code), count, code);
    }
  });

  it("counts the kept records that needed fixing", () => {
    assert.equal(report.corrected, 5);
    assert.equal(countFor(report.correctionsByType, "tidiedText"), 2);
    assert.equal(countFor(report.correctionsByType, "filledLatinName"), 1);
    assert.equal(countFor(report.correctionsByType, "fixedLatinName"), 1);
    assert.equal(countFor(report.correctionsByType, "convertedTimezone"), 1);
  });

  it("keeps the valid records, sorted oldest first", () => {
    assert.deepEqual(keptIds, [
      "12345",
      "wrong-latin",
      "no-latin",
      "tidy-manchester",
      "space-date",
      "ok-leeds",
      "feb-30",
      "ok-london",
      "utc-summer",
    ]);
  });

  it("keeps the first copy when an id is reused", () => {
    const leeds = sightings.find((sighting) => sighting.id === "ok-leeds");
    assert.equal(leeds.location, "Leeds");
    assert.equal(leeds.species, "Fox/badger tick");
  });

  it("only treats kept records as seen", () => {
    const leapDay = sightings.find((sighting) => sighting.id === "feb-30");
    assert.equal(formatTimestamp(leapDay.date), "2024-02-29T10:00:00");
  });

  it("outputs only the known fields, with canonical values", () => {
    const manchester = sightings.find((sighting) => sighting.id === "tidy-manchester");
    assert.deepEqual(Object.keys(manchester).sort(), [
      "date",
      "id",
      "latinName",
      "location",
      "species",
    ]);
    assert.equal(manchester.location, "Manchester");
    assert.equal(manchester.species, "Tree-hole tick");
  });

  it("derives the Latin name from the species", () => {
    const filled = sightings.find((sighting) => sighting.id === "no-latin");
    const fixed = sightings.find((sighting) => sighting.id === "wrong-latin");
    assert.equal(filled.latinName, "Ixodes acuminatus");
    assert.equal(fixed.latinName, "Ixodes apronophorus");
  });

  it("normalises date formats and converts timezones to UK time", () => {
    const spaced = sightings.find((sighting) => sighting.id === "space-date");
    const summer = sightings.find((sighting) => sighting.id === "utc-summer");
    assert.equal(formatTimestamp(spaced.date), "2022-06-15T09:30:00");
    assert.equal(formatTimestamp(summer.date), "2024-07-01T13:00:00");
  });

  it("gives examples of what was removed and why", () => {
    const epoch = report.examples.find((example) => example.id === "epoch");
    assert.deepEqual(epoch, {
      index: 19,
      id: "epoch",
      reason: "implausibleDate",
      detail: 'Date "1970-01-01T00:00:00" is before 2000',
    });
  });
});

describe("cleanSightings rules", () => {
  it("passes clean data through untouched", () => {
    const { sightings, report } = clean([record()]);
    assert.equal(report.kept, 1);
    assert.equal(report.corrected, 0);
    assert.equal(sightings[0].location, "London");
    assert.equal(formatTimestamp(sightings[0].date), "2024-05-01T10:00:00");
  });

  it("handles an empty list", () => {
    const { sightings, report } = clean([]);
    assert.deepEqual(sightings, []);
    assert.equal(report.received, 0);
    assert.equal(report.kept, 0);
  });

  it("records the position of a record that has no id", () => {
    const { report } = clean([record(), null]);
    assert.deepEqual(report.examples, [
      { index: 1, id: null, reason: "notAnObject", detail: "Got null" },
    ]);
  });

  it("rejects input that is not a list", () => {
    assert.throws(() => clean({ data: [] }), /expects an array/);
  });

  it("treats a date only moments from now as valid and one just after as future", () => {
    const { report } = clean([
      record({ id: "now", date: "2026-10-29T12:00:00" }),
      record({ id: "later", date: "2026-10-29T12:00:01" }),
    ]);
    assert.equal(report.kept, 1);
    assert.equal(countFor(report.removedByReason, "futureDate"), 1);
  });

  it("matches species names containing a slash", () => {
    const { sightings } = clean([
      record({ species: "fox/badger tick", latinName: "Ixodes canisuga" }),
    ]);
    assert.equal(sightings[0].species, "Fox/badger tick");
  });

  it("does not treat the same species in the same city at different times as duplicates", () => {
    const { report } = clean([
      record({ id: "a", date: "2024-05-01T10:00:00" }),
      record({ id: "b", date: "2024-05-01T10:30:00" }),
    ]);
    assert.equal(report.kept, 2);
  });

  it("caps the examples so a very messy feed cannot flood the report", () => {
    const broken = Array.from({ length: 50 }, (_, index) =>
      record({ id: `x${index}`, date: "no" }),
    );
    const { report } = clean(broken);
    assert.equal(report.removed, 50);
    assert.equal(report.examples.length, 20);
  });
});
