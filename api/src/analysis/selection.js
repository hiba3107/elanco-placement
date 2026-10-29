const { LOCATION_NAMES } = require("../reference/locations");
const { filterSightings } = require("./filters");
const { rateLocationSeverity } = require("./severity");

// Recency is measured from the end of the chosen period, or from the newest
// sighting if that is earlier. Measuring from today would make every sighting
// in Elanco's data (which ends in December 2024) look years old, and every
// city would score close to zero.
function referenceDateFor(filters, dateRange) {
  return filters.to && filters.to < dateRange.latest ? filters.to : dateRange.latest;
}

function isShown(rating, filters) {
  return (
    (!filters.locations || filters.locations.includes(rating.location)) &&
    (!filters.severities || filters.severities.includes(rating.band))
  );
}

/**
 * Applies the shared filters in a fixed order:
 * 1. the date range and species decide which sightings count;
 * 2. severity is rated on those, comparing every city with all the others;
 * 3. the location and severity filters then choose which cities to show.
 * Step 3 comes last so that picking one city, or only "high" cities, never
 * changes how any other city is rated.
 */
function selectSightings(sightings, filters, dateRange) {
  const referenceDate = referenceDateFor(filters, dateRange);
  const counted = filterSightings(sightings, {
    from: filters.from,
    to: filters.to,
    species: filters.species,
  });
  const { medianScore, ratings } = rateLocationSeverity(counted, {
    locations: LOCATION_NAMES,
    referenceDate,
  });
  const shownRatings = ratings.filter((rating) => isShown(rating, filters));
  const shownLocations = new Set(shownRatings.map((rating) => rating.location));

  return {
    referenceDate,
    medianScore,
    ratings: shownRatings,
    sightings: counted.filter((sighting) => shownLocations.has(sighting.location)),
  };
}

module.exports = { referenceDateFor, selectSightings };
