const express = require("express");

function createApp({ config, logger, getSightings }) {
  const app = express();

  app.get("/api/health", (request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/sightings", async (request, response) => {
    try {
      const sightings = await getSightings(config.elanco.url);
      response.json(sightings);
    } catch (error) {
      logger.error("Could not reach the Elanco API", error.message);
      response.status(502).json({ error: "Could not reach the Elanco API" });
    }
  });

  return app;
}

module.exports = { createApp };
