const express = require("express");
const { summariseDataState } = require("../sightings/serialise");

// Always answers 200 while the server is running, even when Elanco is down:
// the server itself is healthy, and "data.status" says what it is serving.
function createHealthRouter({ store }) {
  const router = express.Router();

  router.get("/health", (request, response) => {
    const state = store.getState();
    response.json({
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      data: { ...summariseDataState(state), lastError: state.lastError },
    });
  });

  return router;
}

module.exports = { createHealthRouter };
