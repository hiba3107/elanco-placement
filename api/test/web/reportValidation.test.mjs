import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateReportForm } from "../../../web/js/report/validation.js";

// The same rules /api/meta sends to the page.
const rules = {
  earliestDate: "2000-01-01",
  maxNotesLength: 500,
  oldSightingDays: 365,
  futureToleranceMinutes: 5,
};
const now = "2026-10-29T14:00";

function validate(overrides = {}) {
  const values = {
    date: "2026-10-28",
    time: "09:15",
    location: "Leeds",
    species: "Marsh tick",
    notes: "",
    ...overrides,
  };
  return validateReportForm(values, { rules, now });
}

describe("validateReportForm (browser)", () => {
  it("accepts a complete report", () => {
    assert.deepEqual(validate(), { errors: {}, warnings: {} });
  });

  it("names every missing field, matching the server's wording", () => {
    const { errors } = validateReportForm(
      { date: "", time: "", location: "", species: "", notes: "" },
      { rules, now },
    );
    assert.deepEqual(errors, {
      date: "Enter the date you saw the tick.",
      time: "Enter the time you saw the tick.",
      location: "Choose the city where you saw the tick.",
      species: "Choose the species of tick.",
    });
  });

  it("rejects impossible, early and future dates", () => {
    assert.equal(validate({ date: "2026-02-30" }).errors.date, "Enter a real date.");
    assert.match(validate({ date: "1999-12-31" }).errors.date, /from 1 January 2000/);
    assert.equal(validate({ date: "2026-10-30" }).errors.date, "The date can't be in the future.");
  });

  it("allows a few minutes of clock difference but not a future time", () => {
    assert.deepEqual(validate({ date: "2026-10-29", time: "14:04" }).errors, {});
    assert.equal(
      validate({ date: "2026-10-29", time: "14:06" }).errors.time,
      "The time can't be in the future.",
    );
  });

  it("only accepts 24-hour times", () => {
    assert.ok(validate({ time: "9:30" }).errors.time);
    assert.ok(validate({ time: "25:00" }).errors.time);
  });

  it("warns, without blocking, about a sighting over a year old", () => {
    const { errors, warnings } = validate({ date: "2025-06-01" });
    assert.deepEqual(errors, {});
    assert.match(warnings.date, /more than a year ago/);
  });

  it("warns as notes near the limit and blocks them past it", () => {
    assert.equal(validate({ notes: "a".repeat(460) }).warnings.notes, "40 characters left.");
    assert.equal(validate({ notes: "a".repeat(499) }).warnings.notes, "1 character left.");
    assert.equal(
      validate({ notes: "a".repeat(501) }).errors.notes,
      "Notes must be 500 characters or fewer (these are 501).",
    );
  });

  it("ignores spaces around the notes when counting", () => {
    assert.deepEqual(validate({ notes: `   ${"a".repeat(500)}   ` }).errors, {});
  });
});
