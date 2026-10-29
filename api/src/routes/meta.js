const express = require("express");
const { requireData } = require("../middleware/requireData");
const { LOCATIONS } = require("../reference/locations");
const { SPECIES } = require("../reference/species");
const { summariseDataState } = require("../sightings/serialise");

function createMetaRouter({ store }) {
  const router = express.Router();

  // Works even while the data is loading or unavailable, so the page can
  // still build its filters and the report form.
  router.get("/meta", (request, response) => {
    response.json({
      data: summariseDataState(store.getState()),
      locations: LOCATIONS,
      species: SPECIES,
    });
  });

  router.get("/data-quality", requireData(store), (request, response) => {
    const { report, source, fetchedAt } = store.getState();
    response.json({ source, fetchedAt: fetchedAt ? fetchedAt.toISOString() : null, ...report });
  });

  return router;
}

module.exports = { createMetaRouter };
