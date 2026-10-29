const { countBy, groupBy, mostCommon } = require("../lib/collections");
const { addDays } = require("../lib/dates");
const { LOCATIONS } = require("../reference/locations");
const { SPECIES } = require("../reference/species");

// "Recent activity" on the map means a sighting in the last 30 days before
// the reference date.
const RECENT_ACTIVITY_DAYS = 30;

const LOCATIONS_BY_NAME = new Map(LOCATIONS.map((location) => [location.name, location]));

function latestDate(sightings) {
  return sightings.reduce(
    (latest, sighting) => (sighting.date > latest ? sighting.date : latest),
    sightings[0].date,
  );
}

function speciesBreakdown(sightings) {
  const counts = countBy(sightings, (sighting) => sighting.species);
  return SPECIES.map(({ name }) => ({ name, count: counts.get(name) ?? 0 }));
}

function countRecent(sightings, referenceDate, recentDays) {
  const windowStart = addDays(referenceDate, -recentDays);
  return sightings.filter(
    (sighting) => sighting.date > windowStart && sighting.date <= referenceDate,
  ).length;
}

/**
 * One summary per city that has sightings: totals, species mix, latest and
 * recent activity, and its severity rating. Cities come out most severe
 * first. `ratings` comes from rateLocationSeverity.
 */
function summariseLocations(
  sightings,
  { ratings, referenceDate, recentDays = RECENT_ACTIVITY_DAYS },
) {
  const sightingsByLocation = groupBy(sightings, (sighting) => sighting.location);
  return ratings
    .filter((rating) => sightingsByLocation.has(rating.location))
    .map((rating) => {
      const { name, region, nation, lat, lng } = LOCATIONS_BY_NAME.get(rating.location);
      const locationSightings = sightingsByLocation.get(name);
      return {
        location: name,
        region,
        nation,
        lat,
        lng,
        total: locationSightings.length,
        species: speciesBreakdown(locationSightings),
        mostSeenSpecies: mostCommon(countBy(locationSightings, (sighting) => sighting.species)),
        latestSighting: latestDate(locationSightings),
        recentCount: countRecent(locationSightings, referenceDate, recentDays),
        severity: {
          band: rating.band,
          score: rating.score,
          comparedToMedian: rating.comparedToMedian,
        },
      };
    })
    .sort(
      (first, second) =>
        second.severity.score - first.severity.score ||
        first.location.localeCompare(second.location),
    );
}

// Groups city summaries into the UK's statistical regions, largest first.
function summariseRegions(locationSummaries) {
  const regions = new Map();
  for (const summary of locationSummaries) {
    if (!regions.has(summary.region)) {
      regions.set(summary.region, {
        region: summary.region,
        nation: summary.nation,
        total: 0,
        locations: [],
      });
    }
    const region = regions.get(summary.region);
    region.total += summary.total;
    region.locations.push(summary.location);
  }
  return [...regions.values()]
    .map((region) => ({ ...region, locations: region.locations.sort() }))
    .sort(
      (first, second) => second.total - first.total || first.region.localeCompare(second.region),
    );
}

// One entry for each of the five species, including any with no sightings.
function summariseSpecies(sightings) {
  const sightingsBySpecies = groupBy(sightings, (sighting) => sighting.species);
  return SPECIES.map(({ name, latinName }) => {
    const speciesSightings = sightingsBySpecies.get(name) ?? [];
    return {
      name,
      latinName,
      count: speciesSightings.length,
      share: sightings.length > 0 ? speciesSightings.length / sightings.length : 0,
      mostSeenIn: mostCommon(countBy(speciesSightings, (sighting) => sighting.location)),
      latestSighting: speciesSightings.length > 0 ? latestDate(speciesSightings) : null,
    };
  });
}

module.exports = { RECENT_ACTIVITY_DAYS, summariseLocations, summariseRegions, summariseSpecies };
