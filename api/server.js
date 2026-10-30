const path = require("node:path");

const { loadConfig } = require("./src/config");
const { createLogger } = require("./src/logger");
const { createApp } = require("./src/app");
const { createElancoLoader } = require("./src/elanco/client");
const { createReportRepository } = require("./src/reports/repository");
const { createSightingStore } = require("./src/sightings/store");

const MINUTE_MS = 60 * 1000;

function describeListenError(error, port) {
  if (error.code === "EADDRINUSE") {
    return `port ${port} is already in use. Stop the other server, or set PORT to a free port.`;
  }
  return error.message;
}

async function main() {
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

  const reports = await createReportRepository({
    filePath: path.join(config.dataDir, "reports.json"),
    uploadsDir: path.join(config.dataDir, "uploads"),
    logger,
  });

  const app = createApp({
    store,
    reports,
    reportRateLimit: {
      limit: config.reports.rateLimit,
      windowMs: config.reports.rateWindowMinutes * MINUTE_MS,
    },
    logger,
    webDir: config.webDir,
  });

  // The server starts listening straight away and loads the data in the
  // background, so the page can show "still loading" instead of failing to connect.
  // Express 5 calls this callback with an error if the port cannot be used.
  const server = app.listen(config.port, (error) => {
    if (error) {
      logger.error(`Tick Tracker could not start: ${describeListenError(error, config.port)}`);
      process.exit(1);
      return;
    }
    logger.info(`Tick Tracker running at http://localhost:${config.port}`);
    store
      .start()
      .catch((startError) => logger.error("The sightings store failed to start", startError));
  });

  function shutDown(signal) {
    logger.info(`Received ${signal}, shutting down`);
    store.stop();
    server.close(() => process.exit(0));
  }

  process.on("SIGINT", shutDown);
  process.on("SIGTERM", shutDown);
}

main().catch((error) => {
  console.error("Tick Tracker could not start:", error.message);
  process.exit(1);
});
