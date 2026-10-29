const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const sampleRecords = require("../fixtures/sample-sightings.json");
const { createApp } = require("../../src/app");
const { createSightingStore } = require("../../src/sightings/store");
const { createTestLogger } = require("./logger");

const WEB_DIR = path.resolve(__dirname, "..", "..", "..", "web");

function loaderFor(dataStatus, records) {
  if (dataStatus === "unavailable") {
    return async () => {
      throw new Error("Could not connect to Elanco (ENOTFOUND)");
    };
  }
  return async () => records;
}

async function listen(app) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

/**
 * Starts the real app on a random free port, backed by a real sightings
 * store whose "Elanco" is a fixture, so tests never touch the network.
 * dataStatus picks the store's state: "ready", "loading" or "unavailable".
 * Passing a store replaces the real one entirely.
 */
async function startTestApp({ dataStatus = "ready", records = sampleRecords, store } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "tick-api-"));
  const { logger, messages } = createTestLogger();
  if (!store) {
    store = createSightingStore({
      loadRecords: loaderFor(dataStatus, records),
      snapshotPath: path.join(directory, "elanco-snapshot.json"),
      logger,
    });
    if (dataStatus !== "loading") {
      await store.refresh();
    }
  }

  const server = await listen(createApp({ store, logger, webDir: WEB_DIR }));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  return {
    baseUrl,
    store,
    messages,
    directory,
    get: (urlPath) => fetch(`${baseUrl}${urlPath}`),
    async close() {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(directory, { recursive: true, force: true });
    },
  };
}

module.exports = { startTestApp };
