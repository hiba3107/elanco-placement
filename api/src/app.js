const express = require("express");
const { formatTimestamp } = require("./lib/dates");

function createApp({ store }) {
  const app = express();

  app.get("/api/health", (request, response) => {
    const { status, sightings, source, fetchedAt, lastError } = store.getState();
    response.json({
      status: "ok",
      data: { status, records: sightings.length, source, fetchedAt, lastError },
    });
  });

  app.get("/api/sightings", (request, response) => {
    const { status, sightings } = store.getState();
    if (status === "loading" || status === "unavailable") {
      response.status(503).json({ error: "Tick data is not available yet" });
      return;
    }
    response.json(
      sightings.map((sighting) => ({ ...sighting, date: formatTimestamp(sighting.date) })),
    );
  });

  return app;
}

module.exports = { createApp };
