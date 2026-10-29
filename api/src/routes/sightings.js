const express = require("express");
const { requireData } = require("../middleware/requireData");
const { toSightingResponse } = require("../sightings/serialise");

function createSightingsRouter({ store }) {
  const router = express.Router();

  router.get("/sightings", requireData(store), (request, response) => {
    response.json({ data: store.getState().sightings.map(toSightingResponse) });
  });

  return router;
}

module.exports = { createSightingsRouter };
