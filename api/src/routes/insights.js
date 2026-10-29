const express = require("express");

const { describeFilters } = require("../analysis/filters");
const { buildSeasonalProfile } = require("../analysis/seasonal");
const { selectSightings } = require("../analysis/selection");
const { SEVERITY_RULE } = require("../analysis/severity");
const {
  RECENT_ACTIVITY_DAYS,
  summariseLocations,
  summariseRegions,
  summariseSpecies,
} = require("../analysis/summaries");
const { MAX_TREND_POINTS, buildTrend, trendRange } = require("../analysis/trends");
const { validationError } = require("../errors");
const { formatDay, formatTimestamp } = require("../lib/dates");
const { requireData } = require("../middleware/requireData");
const { readQuery } = require("./readQuery");

function roundTo(value, decimals) {
  if (value === null) {
    return null;
  }
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toLocationResponse(summary) {
  return {
    ...summary,
    latestSighting: formatTimestamp(summary.latestSighting),
    severity: {
      band: summary.severity.band,
      score: roundTo(summary.severity.score, 2),
      comparedToMedian: roundTo(summary.severity.comparedToMedian, 3),
    },
  };
}

function toSpeciesResponse(summary) {
  return {
    ...summary,
    share: roundTo(summary.share, 4),
    latestSighting: summary.latestSighting ? formatTimestamp(summary.latestSighting) : null,
  };
}

function createInsightsRouter({ store }) {
  const router = express.Router();
  const needsData = requireData(store);

  function selectionFor(filters) {
    const { sightings, dateRange } = store.getState();
    return selectSightings(sightings, filters, dateRange);
  }

  // Everything the map needs: one summary per city, with its severity.
  router.get("/insights/locations", needsData, (request, response) => {
    const { filters } = readQuery(request.query, ["filters"]);
    const selection = selectionFor(filters);
    const locations = summariseLocations(selection.sightings, selection);

    response.json({
      referenceDate: formatTimestamp(selection.referenceDate),
      medianScore: roundTo(selection.medianScore, 2),
      rule: { ...SEVERITY_RULE, recentDays: RECENT_ACTIVITY_DAYS },
      totals: { sightings: selection.sightings.length, locations: locations.length },
      locations: locations.map(toLocationResponse),
      filters: describeFilters(filters),
    });
  });

  // Sightings per UK region (each region holds one or more of the cities).
  router.get("/insights/regions", needsData, (request, response) => {
    const { filters } = readQuery(request.query, ["filters"]);
    const selection = selectionFor(filters);
    const regions = summariseRegions(summariseLocations(selection.sightings, selection));

    response.json({
      totals: { sightings: selection.sightings.length, regions: regions.length },
      regions,
      filters: describeFilters(filters),
    });
  });

  router.get("/insights/species", needsData, (request, response) => {
    const { filters } = readQuery(request.query, ["filters"]);
    const selection = selectionFor(filters);

    response.json({
      totals: { sightings: selection.sightings.length },
      species: summariseSpecies(selection.sightings).map(toSpeciesResponse),
      filters: describeFilters(filters),
    });
  });

  // Sightings per week, month or year, with empty periods included as zeros.
  router.get("/insights/trends", needsData, (request, response) => {
    const { filters, interval } = readQuery(request.query, ["filters", "interval"]);
    const selection = selectionFor(filters);
    const range = trendRange(filters, store.getState().dateRange);
    const points = range ? buildTrend(selection.sightings, interval, range) : [];
    if (points.length > MAX_TREND_POINTS) {
      throw validationError([
        {
          field: "interval",
          message: `That would be ${points.length} points, more than ${MAX_TREND_POINTS}. Choose a longer interval or a shorter date range.`,
        },
      ]);
    }

    response.json({
      interval,
      from: range ? formatDay(range.from) : null,
      to: range ? formatDay(range.to) : null,
      total: selection.sightings.length,
      points: points.map(({ period, start, count }) => ({
        period,
        start: formatDay(start),
        count,
      })),
      filters: describeFilters(filters),
    });
  });

  // Sightings per calendar month, plus an honest verdict on whether there is
  // a seasonal pattern at all.
  router.get("/insights/seasonal", needsData, (request, response) => {
    const { filters } = readQuery(request.query, ["filters"]);
    const profile = buildSeasonalProfile(selectionFor(filters).sightings);

    response.json({
      ...profile,
      averagePerMonth: roundTo(profile.averagePerMonth, 2),
      pattern: { ...profile.pattern, chiSquared: roundTo(profile.pattern.chiSquared, 2) },
      filters: describeFilters(filters),
    });
  });

  return router;
}

module.exports = { createInsightsRouter };
