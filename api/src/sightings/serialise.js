const { formatDay, formatTimestamp } = require("../lib/dates");

// Sighting dates go out exactly as Elanco writes them: UK wall-clock times
// with no timezone ("2024-05-01T10:00:00"). Operational times such as
// fetchedAt are real moments, so they go out as ISO instants with a "Z".

function toSightingResponse(sighting) {
  return {
    id: sighting.id,
    date: formatTimestamp(sighting.date),
    location: sighting.location,
    species: sighting.species,
    latinName: sighting.latinName,
  };
}

function toInstant(date) {
  return date ? date.toISOString() : null;
}

function summariseDataState(state) {
  return {
    status: state.status,
    source: state.source,
    records: state.sightings.length,
    fetchedAt: toInstant(state.fetchedAt),
    lastAttemptAt: toInstant(state.lastAttemptAt),
    dateRange: state.dateRange
      ? { earliest: formatDay(state.dateRange.earliest), latest: formatDay(state.dateRange.latest) }
      : null,
  };
}

module.exports = { summariseDataState, toSightingResponse };
