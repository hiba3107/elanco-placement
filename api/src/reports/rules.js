const { makeWallClock } = require("../lib/dates");

// The limits a report must meet. /api/meta sends them to the page, so the
// browser checks the same rules before the server checks them again.
const REPORT_RULES = Object.freeze({
  earliestDate: makeWallClock(2000, 1, 1),
  maxNotesLength: 500,
  maxPhotoBytes: 5 * 1024 * 1024,
  maxPhotoDimension: 8000,
  photoTypes: Object.freeze(["image/jpeg", "image/png"]),
  oldSightingDays: 365,
  futureToleranceMinutes: 5,
});

module.exports = { REPORT_RULES };
