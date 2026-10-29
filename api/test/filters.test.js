const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const sampleRecords = require("./fixtures/sample-sightings.json");
const {
  describeFilters,
  filterSightings,
  parseSightingFilters,
} = require("../src/analysis/filters");
const { formatTimestamp } = require("../src/lib/dates");
const { cleanSightings } = require("../src/sightings/clean");

const { sightings } = cleanSightings(sampleRecords);

// Parses a query string the way Express does, so the tests cover URL encoding too.
function parseQueryString(queryString) {
  const query = {};
  for (const [key, value] of new URLSearchParams(queryString)) {
    query[key] = key in query ? [].concat(query[key], value) : value;
  }
  return parseSightingFilters(query);
}

function idsOf(list) {
  return list.map((sighting) => sighting.id).sort();
}

describe("parseSightingFilters", () => {
  it("returns no filters for an empty query", () => {
    const { value, errors } = parseSightingFilters({});
    assert.deepEqual(errors, []);
    assert.deepEqual(value, {
      from: null,
      to: null,
      locations: null,
      species: null,
      severities: null,
    });
  });

  it("makes the date range include the whole of the last day", () => {
    const { value } = parseQueryString("from=2024-01-01&to=2024-01-31");
    assert.equal(formatTimestamp(value.from), "2024-01-01T00:00:00");
    assert.equal(value.to.toISOString(), "2024-01-31T23:59:59.999Z");
  });

  it("rejects a range that ends before it starts", () => {
    const { errors } = parseQueryString("from=2024-02-01&to=2024-01-01");
    assert.deepEqual(errors, [
      { field: "to", message: '"to" (2024-01-01) must be on or after "from" (2024-02-01).' },
    ]);
  });

  it("explains the expected date format", () => {
    const { errors } = parseQueryString("from=01/02/2024&to=2024-02-30");
    assert.equal(errors.length, 2);
    assert.match(errors[0].message, /"01\/02\/2024" is not a valid date. Use YYYY-MM-DD/);
    assert.equal(errors[1].field, "to");
  });

  it("refuses a date given twice", () => {
    const { errors } = parseQueryString("from=2024-01-01&from=2024-02-01");
    assert.deepEqual(errors, [{ field: "from", message: 'Give "from" only once.' }]);
  });

  it("matches locations whatever the letter case", () => {
    const { value, errors } = parseQueryString("location=london");
    assert.deepEqual(errors, []);
    assert.deepEqual(value.locations, ["London"]);
  });

  it("accepts several locations, repeated or comma-separated, without duplicates", () => {
    const { value } = parseQueryString("location=london, LEEDS&location=Glasgow&location=leeds");
    assert.deepEqual(value.locations, ["London", "Leeds", "Glasgow"]);
  });

  it("handles species names containing a slash once URL-encoded", () => {
    const { value } = parseQueryString(`species=${encodeURIComponent("fox/badger tick")}`);
    assert.deepEqual(value.species, ["Fox/badger tick"]);
  });

  it("reports an unknown location with a suggestion instead of returning nothing", () => {
    const { value, errors } = parseQueryString("location=Londn");
    assert.equal(value.locations, null);
    assert.deepEqual(errors, [
      {
        field: "location",
        message: 'Unknown location "Londn". Did you mean "London"?',
        suggestion: "London",
      },
    ]);
  });

  it("lists the valid choices when nothing is close", () => {
    const { errors } = parseQueryString("species=Deer tick");
    assert.match(errors[0].message, /^Unknown species "Deer tick". Choose from: Fox\/badger tick,/);
  });

  it("reads severity levels in any case", () => {
    const { value, errors } = parseQueryString("severity=HIGH,medium");
    assert.deepEqual(errors, []);
    assert.deepEqual(value.severities, ["high", "medium"]);
  });

  it("rejects a severity level that does not exist", () => {
    const { errors } = parseQueryString("severity=extreme");
    assert.equal(errors[0].field, "severity");
  });

  it("ignores empty values, as sent by an untouched form field", () => {
    const { value, errors } = parseQueryString("from=&location=&species=");
    assert.deepEqual(errors, []);
    assert.equal(value.from, null);
    assert.equal(value.locations, null);
  });

  it("collects every problem at once", () => {
    const { errors } = parseQueryString("from=soon&location=Atlantis&severity=meh");
    assert.deepEqual(
      errors.map((error) => error.field),
      ["from", "location", "severity"],
    );
  });
});

describe("filterSightings", () => {
  it("keeps everything when no filters are set", () => {
    assert.equal(filterSightings(sightings, {}).length, 24);
  });

  it("includes sightings on both the first and the last day of the range", () => {
    const { value } = parseQueryString("from=2022-01-03&to=2022-01-14");
    assert.deepEqual(idsOf(filterSightings(sightings, value)), [
      "cdf-2022-01-03",
      "lon-2022-01-14",
    ]);
  });

  it("does not move a late-evening sighting into the next year", () => {
    const { value } = parseQueryString("from=2023-01-01&to=2023-12-31&location=Leeds");
    assert.deepEqual(idsOf(filterSightings(sightings, value)), ["lds-2023-10-10"]);
  });

  it("filters by one or several locations", () => {
    const { value } = parseQueryString("location=Cardiff,Leeds");
    const result = filterSightings(sightings, value);
    assert.equal(result.length, 10);
    assert.ok(result.every((sighting) => ["Cardiff", "Leeds"].includes(sighting.location)));
  });

  it("combines location, species and dates", () => {
    const { value } = parseQueryString("location=London&species=marsh tick&from=2024-01-01");
    assert.deepEqual(idsOf(filterSightings(sightings, value)), [
      "lon-2024-06-15",
      "lon-2024-12-20",
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    const { value } = parseQueryString("location=Cardiff&species=Tree-hole tick");
    assert.deepEqual(filterSightings(sightings, value), []);
  });
});

describe("describeFilters", () => {
  it("echoes the filters in their canonical form", () => {
    const { value } = parseQueryString(
      "from=2024-01-01&to=2024-06-30&location=london&severity=High",
    );
    assert.deepEqual(describeFilters(value), {
      from: "2024-01-01",
      to: "2024-06-30",
      location: ["London"],
      species: [],
      severity: ["high"],
    });
  });
});
