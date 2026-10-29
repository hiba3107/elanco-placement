const path = require("node:path");

const { loadConfig } = require("./src/config");
const { createLogger } = require("./src/logger");
const { createApp } = require("./src/app");
const { createElancoLoader } = require("./src/elanco/client");
const { createSightingStore } = require("./src/sightings/store");

const MINUTE_MS = 60 * 1000;

const config = loadConfig();
const logger = createLogger(config.logLevel);

const store = createSightingStore({
  loadRecords: createElancoLoader({
    url: config.elanco.url,
    timeoutMs: config.elanco.timeoutMs,
    attempts: config.elanco.maxAttempts,
    logger,
  }),
  snapshotPath: path.join(config.dataDir, "elanco-snapshot.json"),
  logger,
  refreshIntervalMs: config.elanco.refreshMinutes * MINUTE_MS,
  recoveryIntervalMs: config.elanco.recoveryMinutes * MINUTE_MS,
});

const app = createApp({ store, logger, webDir: config.webDir });

// The server starts listening straight away and loads the data in the
// background, so the page can show "still loading" instead of failing to connect.
const server = app.listen(config.port, () => {
  logger.info(`Tick Tracker running at http://localhost:${config.port}`);
});
store.start().catch((error) => logger.error("The sightings store failed to start", error));

function shutDown(signal) {
  logger.info(`Received ${signal}, shutting down`);
  store.stop();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
