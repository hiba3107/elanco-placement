const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: wait } = require("node:timers/promises");

const { createSightingStore } = require("../src/sightings/store");
const { createTestLogger } = require("./support/logger");

const RAW_RECORDS = [
  {
    id: "a",
    date: "2024-05-01T10:00:00",
    location: "London",
    species: "Marsh tick",
    latinName: "Ixodes apronophorus",
  },
  {
    id: "b",
    date: "2023-02-11T08:30:00",
    location: "Leeds",
    species: "Tree-hole tick",
    latinName: "Ixodes arboricola",
  },
];
const FETCHED_AT = new Date("2026-10-29T12:00:00Z");

let directory;
let snapshotPath;

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "tick-store-"));
  snapshotPath = path.join(directory, "elanco-snapshot.json");
});

afterEach(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

function createStore(options = {}) {
  const { logger, messages } = createTestLogger();
  const store = createSightingStore({
    loadRecords: async () => RAW_RECORDS,
    snapshotPath,
    logger,
    now: () => FETCHED_AT,
    ...options,
  });
  return { store, messages };
}

function failing(message = "Elanco responded with HTTP 503") {
  return async () => {
    throw new Error(message);
  };
}

async function writeSnapshot(contents) {
  await fs.writeFile(
    snapshotPath,
    typeof contents === "string" ? contents : JSON.stringify(contents),
  );
}

describe("sightings store", () => {
  it("starts in the loading state with nothing to serve", () => {
    const { store } = createStore();
    assert.equal(store.getState().status, "loading");
    assert.deepEqual(store.getState().sightings, []);
  });

  it("serves cleaned sightings once Elanco responds", async () => {
    const { store } = createStore();
    await store.refresh();

    const state = store.getState();
    assert.equal(state.status, "ready");
    assert.equal(state.source, "elanco");
    assert.equal(state.sightings.length, 2);
    assert.equal(state.report.kept, 2);
    assert.equal(state.fetchedAt, FETCHED_AT);
    assert.equal(state.lastError, null);
    assert.equal(state.dateRange.earliest.toISOString(), "2023-02-11T08:30:00.000Z");
    assert.equal(state.dateRange.latest.toISOString(), "2024-05-01T10:00:00.000Z");
  });

  it("saves the raw records as a snapshot for next time", async () => {
    const { store } = createStore();
    await store.refresh();

    const saved = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    assert.equal(saved.fetchedAt, FETCHED_AT.toISOString());
    assert.deepEqual(saved.records, RAW_RECORDS);
  });

  it("is unavailable when Elanco fails and there is no snapshot", async () => {
    const { store } = createStore({ loadRecords: failing() });
    await store.refresh();

    const state = store.getState();
    assert.equal(state.status, "unavailable");
    assert.equal(state.lastError, "Elanco responded with HTTP 503");
    assert.equal(state.lastAttemptAt, FETCHED_AT);
  });

  it("falls back to the saved snapshot when Elanco fails at startup", async () => {
    await writeSnapshot({ fetchedAt: "2026-10-01T09:00:00.000Z", records: RAW_RECORDS });
    const { store } = createStore({ loadRecords: failing() });
    await store.refresh();

    const state = store.getState();
    assert.equal(state.status, "stale");
    assert.equal(state.source, "snapshot");
    assert.equal(state.sightings.length, 2);
    assert.equal(state.fetchedAt.toISOString(), "2026-10-01T09:00:00.000Z");
    assert.equal(state.lastError, "Elanco responded with HTTP 503");
  });

  it("switches from the snapshot to live data when Elanco recovers", async () => {
    await writeSnapshot({ fetchedAt: "2026-10-01T09:00:00.000Z", records: RAW_RECORDS });
    let elancoUp = false;
    const { store } = createStore({
      loadRecords: async () => {
        if (!elancoUp) {
          throw new Error("down");
        }
        return RAW_RECORDS;
      },
    });

    await store.refresh();
    assert.equal(store.getState().status, "stale");

    elancoUp = true;
    await store.refresh();
    assert.equal(store.getState().status, "ready");
    assert.equal(store.getState().source, "elanco");
    assert.equal(store.getState().lastError, null);
  });

  it("keeps serving its data when a later refresh fails", async () => {
    let calls = 0;
    const { store } = createStore({
      loadRecords: async () => {
        calls += 1;
        if (calls > 1) {
          throw new Error("down");
        }
        return RAW_RECORDS;
      },
    });

    await store.refresh();
    await store.refresh();

    const state = store.getState();
    assert.equal(state.status, "ready");
    assert.equal(state.sightings.length, 2);
    assert.equal(state.lastError, "down");
  });

  it("never replaces good data with an empty feed", async () => {
    let records = RAW_RECORDS;
    const { store } = createStore({ loadRecords: async () => records });
    await store.refresh();

    records = [];
    await store.refresh();

    assert.equal(store.getState().sightings.length, 2);
    assert.equal(store.getState().lastError, "Elanco returned an empty list of sightings");
  });

  it("treats a feed where every record is rejected as a failure", async () => {
    const renamedFields = RAW_RECORDS.map(({ location, ...rest }) => ({ ...rest, city: location }));
    const { store } = createStore({ loadRecords: async () => renamedFields });
    await store.refresh();

    assert.equal(store.getState().status, "unavailable");
    assert.match(store.getState().lastError, /returned 2 records but none could be used/);
    assert.match(store.getState().lastError, /Missing an id, date, location or species/);
  });

  it("is unavailable, and says why, when the snapshot is corrupt", async () => {
    await writeSnapshot("{ this is not json");
    const { store, messages } = createStore({ loadRecords: failing() });
    await store.refresh();

    assert.equal(store.getState().status, "unavailable");
    assert.ok(messages.some((entry) => entry.level === "error" && /snapshot/.test(entry.message)));
  });

  it("shares one Elanco request between overlapping refreshes", async () => {
    let calls = 0;
    const { store } = createStore({
      loadRecords: async () => {
        calls += 1;
        await wait(10);
        return RAW_RECORDS;
      },
    });

    await Promise.all([store.refresh(), store.refresh(), store.refresh()]);
    assert.equal(calls, 1);
  });

  it("still serves the data when the snapshot cannot be saved", async () => {
    const blocker = path.join(directory, "not-a-folder");
    await fs.writeFile(blocker, "");
    const { store, messages } = createStore({ snapshotPath: path.join(blocker, "snapshot.json") });
    await store.refresh();

    assert.equal(store.getState().status, "ready");
    assert.ok(messages.some((entry) => entry.level === "warn" && /snapshot/.test(entry.message)));
  });

  it("keeps retrying in the background until Elanco comes back, then stops when asked", async () => {
    let calls = 0;
    const { store } = createStore({
      recoveryIntervalMs: 5,
      loadRecords: async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("down");
        }
        return RAW_RECORDS;
      },
    });

    await store.start();
    assert.equal(store.getState().status, "unavailable");
    for (let waited = 0; store.getState().status !== "ready" && waited < 1000; waited += 5) {
      await wait(5);
    }
    store.stop();

    assert.equal(store.getState().status, "ready");
    assert.equal(calls, 3);
  });
});
