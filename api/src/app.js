const express = require("express");

const { apiNotFound } = require("./middleware/apiNotFound");
const { createErrorHandler } = require("./middleware/errorHandler");
const { securityHeaders } = require("./middleware/securityHeaders");
const { createHealthRouter } = require("./routes/health");
const { createInsightsRouter } = require("./routes/insights");
const { createMetaRouter } = require("./routes/meta");
const { createReportsRouter } = require("./routes/reports");
const { createSightingsRouter } = require("./routes/sightings");

// Builds the app without starting it, so tests can create one with fake
// dependencies and server.js can create the real one.
function createApp({ store, reports, reportRateLimit, logger, webDir }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use("/api", createHealthRouter({ store }));
  app.use("/api", createMetaRouter({ store }));
  app.use("/api", createSightingsRouter({ store }));
  app.use("/api", createInsightsRouter({ store }));
  app.use("/api", createReportsRouter({ reports, rateLimit: reportRateLimit }));
  app.use("/api", apiNotFound);

  // The page is served from the same origin as the API, so the browser needs
  // no CORS rules to call it.
  app.use(express.static(webDir));

  app.use(createErrorHandler(logger));
  return app;
}

module.exports = { createApp };
