const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { formatTimestamp, makeWallClock } = require("../src/lib/dates");
const {
  findSimilarReport,
  possibleDuplicateWarning,
  validateReport,
} = require("../src/reports/validateReport");

const NOW = makeWallClock(2026, 10, 29, 14, 0);

function validate(overrides = {}) {
  const fields = {
    date: "2026-10-28",
    time: "09:15",
    location: "Leeds",
    species: "Marsh tick",
    notes: "",
    ...overrides,
  };
  return validateReport(fields, { now: NOW });
}

function errorFields(result) {
  return result.errors.map((error) => error.field);
}

describe("validateReport", () => {
  it("accepts a complete report and combines the date and time", () => {
    const { value, errors, warnings } = validate({ notes: "  On my dog after a walk  " });

    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    assert.equal(formatTimestamp(value.date), "2026-10-28T09:15:00");
    assert.equal(value.location, "Leeds");
    assert.equal(value.species, "Marsh tick");
    assert.equal(value.latinName, "Ixodes apronophorus");
    assert.equal(value.notes, "On my dog after a walk");
  });

  it("reports every missing field, in form order", () => {
    const result = validateReport({}, { now: NOW });

    assert.equal(result.value, null);
    assert.deepEqual(result.errors, [
      { field: "date", message: "Enter the date you saw the tick." },
      { field: "time", message: "Enter the time you saw the tick." },
      { field: "location", message: "Choose the city where you saw the tick." },
      { field: "species", message: "Choose the species of tick." },
    ]);
  });

  it("rejects dates that are not real or not in YYYY-MM-DD form", () => {
    for (const date of ["2026-02-30", "28/10/2026", "yesterday", "2026-1-5"]) {
      assert.deepEqual(errorFields(validate({ date })), ["date"], date);
    }
  });

  it("rejects dates before 2000", () => {
    assert.equal(
      validate({ date: "1999-12-31" }).errors[0].message,
      "Enter a date from 1 January 2000 onwards.",
    );
  });

  it("accepts only 24-hour HH:MM times", () => {
    assert.deepEqual(validate({ time: "23:59" }).errors, []);
    for (const time of ["9:30", "24:00", "14:3", "2pm", "14:60"]) {
      assert.deepEqual(errorFields(validate({ time })), ["time"], time);
    }
  });

  it("rejects a sighting in the future, allowing a few minutes of clock difference", () => {
    assert.deepEqual(validate({ date: "2026-10-29", time: "14:04" }).errors, []);
    assert.deepEqual(validate({ date: "2026-10-29", time: "14:06" }).errors, [
      { field: "date", message: "The date and time cannot be in the future." },
    ]);
    assert.deepEqual(errorFields(validate({ date: "2027-01-01" })), ["date"]);
  });

  it("warns about, but still accepts, a sighting more than a year old", () => {
    const { value, errors, warnings } = validate({ date: "2025-06-01" });

    assert.deepEqual(errors, []);
    assert.ok(value);
    assert.deepEqual(
      warnings.map((warning) => warning.code),
      ["oldSighting"],
    );
  });

  it("matches the city and species ignoring case, including names with a slash", () => {
    const { value } = validate({ location: "  leeds ", species: "FOX/BADGER TICK" });
    assert.equal(value.location, "Leeds");
    assert.equal(value.species, "Fox/badger tick");
    assert.equal(value.latinName, "Ixodes canisuga");
  });

  it("suggests the right city for a typo", () => {
    assert.deepEqual(validate({ location: "Leds" }).errors, [
      { field: "location", message: 'Choose one of the listed cities. Did you mean "Leeds"?' },
    ]);
  });

  it("rejects a species that is not one of the five", () => {
    assert.deepEqual(validate({ species: "Deer tick" }).errors, [
      { field: "species", message: "Choose one of the five listed species." },
    ]);
  });

  it("limits notes to 500 characters", () => {
    assert.deepEqual(validate({ notes: "a".repeat(500) }).errors, []);
    assert.deepEqual(validate({ notes: "a".repeat(501) }).errors, [
      { field: "notes", message: "Notes must be 500 characters or fewer (these are 501)." },
    ]);
  });

  it("removes control characters and normalises line breaks in notes", () => {
    const { value } = validate({ notes: "Found\r\non the\u0007 cat\u0000" });
    assert.equal(value.notes, "Found\non the cat");
  });

  it("rejects a field sent twice", () => {
    assert.deepEqual(validate({ location: ["Leeds", "York"] }).errors, [
      { field: "location", message: 'Send "location" only once.' },
      { field: "location", message: "Choose the city where you saw the tick." },
    ]);
  });

  it("treats values that are not text as missing", () => {
    assert.deepEqual(errorFields(validate({ species: 42 })), ["species"]);
  });

  it("returns no warnings when there are errors", () => {
    const { warnings } = validate({ date: "2025-06-01", species: "" });
    assert.deepEqual(warnings, []);
  });
});

describe("findSimilarReport", () => {
  const existing = [
    {
      location: "Leeds",
      species: "Marsh tick",
      date: makeWallClock(2026, 10, 28, 8, 0),
    },
  ];

  it("finds a report of the same species in the same city on the same day", () => {
    const candidate = {
      location: "Leeds",
      species: "Marsh tick",
      date: makeWallClock(2026, 10, 28, 19, 45),
    };
    assert.equal(findSimilarReport(existing, candidate), existing[0]);
  });

  it("ignores reports on other days, of other species or in other cities", () => {
    const base = { location: "Leeds", species: "Marsh tick", date: makeWallClock(2026, 10, 28, 9) };
    assert.equal(
      findSimilarReport(existing, { ...base, date: makeWallClock(2026, 10, 27, 9) }),
      undefined,
    );
    assert.equal(findSimilarReport(existing, { ...base, species: "Tree-hole tick" }), undefined);
    assert.equal(findSimilarReport(existing, { ...base, location: "London" }), undefined);
  });

  it("explains the possible duplicate", () => {
    assert.deepEqual(possibleDuplicateWarning(existing[0]), {
      code: "possibleDuplicate",
      field: null,
      message:
        "A Marsh tick in Leeds was already reported for 2026-10-28. This report has been saved too, so there is no need to send it again.",
    });
  });
});
