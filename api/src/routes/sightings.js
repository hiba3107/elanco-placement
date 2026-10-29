const express = require("express");

const { describeFilters } = require("../analysis/filters");
const { paginate } = require("../analysis/pagination");
const { selectSightings } = require("../analysis/selection");
const { notFoundError } = require("../errors");
const { requireData } = require("../middleware/requireData");
const { toSightingResponse } = require("../sightings/serialise");
const { readQuery } = require("./readQuery");

function createSightingsRouter({ store }) {
  const router = express.Router();
  const needsData = requireData(store);

  // Search and filter sightings by time range, location, species and
  // severity, one page at a time.
  router.get("/sightings", needsData, (request, response) => {
    const { filters, pagination, sort } = readQuery(request.query, [
      "filters",
      "pagination",
      "sort",
    ]);
    const { sightings, dateRange } = store.getState();
    const selected = selectSightings(sightings, filters, dateRange).sightings;
    // The store keeps sightings oldest first, so newest first is a reversal.
    const ordered = sort === "oldest" ? selected : [...selected].reverse();
    const page = paginate(ordered, pagination);

    response.json({
      data: page.items.map(toSightingResponse),
      pagination: page.pagination,
      filters: describeFilters(filters),
    });
  });

  router.get("/sightings/:id", needsData, (request, response) => {
    const sighting = store.getState().sightingsById.get(request.params.id);
    if (!sighting) {
      throw notFoundError(`No sighting has the id "${request.params.id}".`);
    }
    response.json({ data: toSightingResponse(sighting) });
  });

  return router;
}

module.exports = { createSightingsRouter };
