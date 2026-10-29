const { DAY_MS } = require("../lib/dates");

const SEVERITY_BANDS = Object.freeze(["high", "medium", "low"]);

/**
 * The severity rule, kept in one place so it is easy to explain and to tune:
 *
 * 1. Weight each sighting by how recent it is. A sighting on the reference
 *    date counts 1, one a year older counts 0.5, two years older 0.25, and so
 *    on: a 12-month half-life, which spans a full tick season, so one quiet
 *    winter does not make a city look safe.
 * 2. Add up the weights per city. That total is the city's score: it rises
 *    with both how many sightings there are and how recent they are.
 * 3. Compare each city with the median city (the middle one when all cities
 *    are lined up by score). At least 25% above the median is "high", at
 *    least 25% below is "low", anything between is "medium". A city with no
 *    sightings is "low". If every city is about as active as the others,
 *    they are all "medium": the map does not invent differences.
 */
const SEVERITY_RULE = Object.freeze({
  halfLifeDays: 365,
  highAtOrAbove: 1.25,
  lowAtOrBelow: 0.75,
});

function recencyWeight(sightingDate, referenceDate, halfLifeDays = SEVERITY_RULE.halfLifeDays) {
  const ageInDays = Math.max(0, (referenceDate - sightingDate) / DAY_MS);
  return 0.5 ** (ageInDays / halfLifeDays);
}

function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function bandFor(score, medianScore, rule) {
  if (score === 0) {
    return "low";
  }
  if (score >= medianScore * rule.highAtOrAbove) {
    return "high";
  }
  if (score <= medianScore * rule.lowAtOrBelow) {
    return "low";
  }
  return "medium";
}

/**
 * Rates every location as high, medium or low using SEVERITY_RULE.
 * `locations` must list every known city, including any with no sightings,
 * so that each city is compared with all of the others. `referenceDate` is
 * "now" for the purpose of recency. Returns the median score and one rating
 * per location: { location, score, band, comparedToMedian }, where
 * comparedToMedian is the score divided by the median (null if the median is 0).
 */
function rateLocationSeverity(sightings, { locations, referenceDate, rule = SEVERITY_RULE }) {
  const scores = new Map(locations.map((location) => [location, 0]));
  for (const sighting of sightings) {
    if (scores.has(sighting.location)) {
      const weight = recencyWeight(sighting.date, referenceDate, rule.halfLifeDays);
      scores.set(sighting.location, scores.get(sighting.location) + weight);
    }
  }
  const medianScore = median([...scores.values()]);
  const ratings = [...scores].map(([location, score]) => ({
    location,
    score,
    band: bandFor(score, medianScore, rule),
    comparedToMedian: medianScore > 0 ? score / medianScore : null,
  }));
  return { medianScore, ratings };
}

module.exports = { SEVERITY_BANDS, SEVERITY_RULE, rateLocationSeverity, recencyWeight };
