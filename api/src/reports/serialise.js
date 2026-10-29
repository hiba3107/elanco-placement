const { formatTimestamp, parseTimestamp } = require("../lib/dates");

const UPLOADS_URL = "/api/uploads";

// On disk, dates are text in Elanco's format; in memory they are Dates, so
// reports can go through the same filters as sightings.
function toStoredReport(report) {
  return { ...report, date: formatTimestamp(report.date) };
}

function fromStoredReport(stored) {
  const date = parseTimestamp(stored?.date);
  if (!date || typeof stored.id !== "string" || !stored.location || !stored.species) {
    return null;
  }
  return { ...stored, date };
}

function toReportResponse(report) {
  return {
    id: report.id,
    date: formatTimestamp(report.date),
    location: report.location,
    species: report.species,
    latinName: report.latinName,
    notes: report.notes,
    photoUrl: report.photo ? `${UPLOADS_URL}/${report.photo.fileName}` : null,
    submittedAt: report.submittedAt,
    status: report.status,
  };
}

module.exports = { UPLOADS_URL, fromStoredReport, toReportResponse, toStoredReport };
