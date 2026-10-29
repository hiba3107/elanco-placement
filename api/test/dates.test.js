const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  addMonths,
  endOfDay,
  formatDay,
  formatTimestamp,
  isoWeekKey,
  makeWallClock,
  monthKey,
  parseDay,
  parseTimestamp,
  parseTimestampDetailed,
  startOfIsoWeek,
  ukNow,
} = require("../src/lib/dates");

function parsedAsText(value) {
  const date = parseTimestamp(value);
  return date ? formatTimestamp(date) : null;
}

describe("parseTimestamp", () => {
  it("parses Elanco's format as a UK wall-clock time", () => {
    assert.equal(parsedAsText("2024-05-01T10:00:00"), "2024-05-01T10:00:00");
  });

  it("accepts the common ISO variations", () => {
    assert.equal(parsedAsText("2024-05-01T10:00"), "2024-05-01T10:00:00");
    assert.equal(parsedAsText("2024-05-01 10:00:00"), "2024-05-01T10:00:00");
    assert.equal(parsedAsText("2024-05-01"), "2024-05-01T00:00:00");
    assert.equal(parsedAsText("2024-05-01T10:00:00.123456"), "2024-05-01T10:00:00");
    assert.equal(parsedAsText("  2024-05-01T10:00:00  "), "2024-05-01T10:00:00");
  });

  it("rejects dates that do not exist", () => {
    assert.equal(parseTimestamp("2024-02-30T10:00:00"), null);
    assert.equal(parseTimestamp("2024-13-01T10:00:00"), null);
    assert.equal(parseTimestamp("2024-00-10T10:00:00"), null);
    assert.equal(parseTimestamp("2024-04-31T10:00:00"), null);
    assert.equal(parseTimestamp("2024-05-01T24:00:00"), null);
    assert.equal(parseTimestamp("2024-05-01T10:60:00"), null);
    assert.equal(parseTimestamp("2024-05-01T10:00:60"), null);
  });

  it("knows which years are leap years", () => {
    assert.notEqual(parseTimestamp("2024-02-29"), null);
    assert.notEqual(parseTimestamp("2000-02-29"), null);
    assert.equal(parseTimestamp("2023-02-29"), null);
    assert.equal(parseTimestamp("1900-02-29"), null);
  });

  it("rejects ambiguous or non-ISO formats rather than guessing", () => {
    assert.equal(parseTimestamp("01/05/2024"), null);
    assert.equal(parseTimestamp("2024-5-1"), null);
    assert.equal(parseTimestamp("1 May 2024"), null);
    assert.equal(parseTimestamp("2024-05-01T10"), null);
    assert.equal(parseTimestamp(""), null);
  });

  it("rejects values that are not text", () => {
    assert.equal(parseTimestamp(null), null);
    assert.equal(parseTimestamp(undefined), null);
    assert.equal(parseTimestamp(1714557600000), null);
    assert.equal(parseTimestamp({}), null);
  });

  it("keeps two-digit years as written instead of moving them to the 1900s", () => {
    assert.equal(parseTimestamp("0024-05-01").getUTCFullYear(), 24);
  });

  it("converts a timestamp with an offset to UK local time, including summer time", () => {
    assert.equal(parsedAsText("2024-07-01T12:00:00Z"), "2024-07-01T13:00:00");
    assert.equal(parsedAsText("2024-01-15T12:00:00Z"), "2024-01-15T12:00:00");
    assert.equal(parsedAsText("2024-07-01T12:00:00+02:00"), "2024-07-01T11:00:00");
    assert.equal(parsedAsText("2024-07-01T12:00:00-0500"), "2024-07-01T18:00:00");
    assert.equal(parseTimestampDetailed("2024-07-01T12:00:00Z").hadOffset, true);
    assert.equal(parseTimestampDetailed("2024-07-01T12:00:00").hadOffset, false);
  });

  it("rejects an offset that is out of range", () => {
    assert.equal(parseTimestamp("2024-07-01T12:00:00+25:00"), null);
  });
});

describe("parseDay", () => {
  it("accepts only a plain YYYY-MM-DD date", () => {
    assert.equal(formatDay(parseDay("2024-02-29")), "2024-02-29");
    assert.equal(parseDay("2024-02-30"), null);
    assert.equal(parseDay("2024-02-29T00:00"), null);
    assert.equal(parseDay("29/02/2024"), null);
    assert.equal(parseDay(20240229), null);
  });
});

describe("ukNow", () => {
  it("returns the current UK wall-clock time in summer and winter", () => {
    assert.equal(formatTimestamp(ukNow(new Date("2024-07-01T11:00:00Z"))), "2024-07-01T12:00:00");
    assert.equal(formatTimestamp(ukNow(new Date("2024-12-01T11:00:00Z"))), "2024-12-01T11:00:00");
  });

  it("handles the hour the clocks go forward", () => {
    assert.equal(formatTimestamp(ukNow(new Date("2024-03-31T00:59:00Z"))), "2024-03-31T00:59:00");
    assert.equal(formatTimestamp(ukNow(new Date("2024-03-31T01:00:00Z"))), "2024-03-31T02:00:00");
  });
});

describe("period helpers", () => {
  it("ends a day one millisecond before midnight", () => {
    const end = endOfDay(makeWallClock(2024, 5, 1, 9, 30));
    assert.equal(end.toISOString(), "2024-05-01T23:59:59.999Z");
  });

  it("steps through months across year boundaries", () => {
    assert.equal(monthKey(addMonths(makeWallClock(2024, 12, 1), 1)), "2025-01");
    assert.equal(monthKey(addMonths(makeWallClock(2024, 1, 1), -1)), "2023-12");
    assert.equal(monthKey(addMonths(makeWallClock(2024, 1, 1), 14)), "2025-03");
  });

  it("starts ISO weeks on Monday", () => {
    assert.equal(formatDay(startOfIsoWeek(makeWallClock(2025, 1, 5))), "2024-12-30");
    assert.equal(formatDay(startOfIsoWeek(makeWallClock(2024, 12, 30))), "2024-12-30");
  });

  it("puts late-December and early-January days in the right ISO week year", () => {
    assert.equal(isoWeekKey(makeWallClock(2024, 12, 30)), "2025-W01");
    assert.equal(isoWeekKey(makeWallClock(2021, 1, 3)), "2020-W53");
    assert.equal(isoWeekKey(makeWallClock(2024, 1, 1)), "2024-W01");
    assert.equal(isoWeekKey(makeWallClock(2024, 6, 15)), "2024-W24");
  });
});
