const { readJsonFile, writeJsonFileAtomic } = require("../lib/jsonFile");
const { cleanSightings } = require("./clean");

// The store is always in one of four states:
//   loading      the first fetch is still running, so there is nothing to serve yet
//   ready        serving data fetched from Elanco since this server started
//   stale        Elanco was unreachable at startup, so serving the last saved snapshot
//   unavailable  Elanco is unreachable and there is no snapshot, so nothing to serve
// While stale or unavailable it keeps retrying in the background. Once ready,
// it refreshes on a slower schedule and keeps the current data if a refresh fails.

function dateRangeOf(sightings) {
  if (sightings.length === 0) {
    return null;
  }
  return { earliest: sightings[0].date, latest: sightings[sightings.length - 1].date };
}

function describeUnusableFeed(report) {
  if (report.received === 0) {
    return "Elanco returned an empty list of sightings";
  }
  const mostCommon = [...report.removedByReason].sort((a, b) => b.count - a.count)[0];
  const detail = mostCommon && mostCommon.count > 0 ? `: ${mostCommon.description}` : "";
  return `Elanco returned ${report.received} records but none could be used${detail}`;
}

function parseInstant(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createSightingStore({
  loadRecords,
  snapshotPath,
  logger,
  refreshIntervalMs = 0,
  recoveryIntervalMs = 0,
  clean = cleanSightings,
  now = () => new Date(),
}) {
  let state = Object.freeze({
    status: "loading",
    sightings: [],
    sightingsById: new Map(),
    report: null,
    dateRange: null,
    source: null,
    fetchedAt: null,
    lastAttemptAt: null,
    lastError: null,
  });
  let inFlight = null;
  let timer = null;
  let stopped = false;

  function setState(changes) {
    state = Object.freeze({ ...state, ...changes });
  }

  // A feed with nothing usable in it (empty, or every record rejected) is far
  // more likely to be a breaking change upstream than real news, so it must
  // never replace good data.
  function cleanUsable(records) {
    const cleaned = clean(records);
    if (cleaned.sightings.length === 0) {
      throw new Error(describeUnusableFeed(cleaned.report));
    }
    return {
      ...cleaned,
      sightingsById: new Map(cleaned.sightings.map((sighting) => [sighting.id, sighting])),
      dateRange: dateRangeOf(cleaned.sightings),
    };
  }

  async function saveSnapshot(records, fetchedAt) {
    try {
      await writeJsonFileAtomic(snapshotPath, { fetchedAt: fetchedAt.toISOString(), records });
    } catch (error) {
      logger.warn(`Could not save the Elanco snapshot: ${error.message}`);
    }
  }

  async function loadFromSnapshot() {
    try {
      const file = await readJsonFile(snapshotPath);
      if (file.status === "missing") {
        logger.warn("No saved snapshot to fall back on");
        setState({ status: "unavailable" });
        return;
      }
      if (file.status === "corrupt" || !Array.isArray(file.data?.records)) {
        throw new Error("the snapshot file is unreadable");
      }
      const fetchedAt = parseInstant(file.data.fetchedAt);
      setState({
        status: "stale",
        source: "snapshot",
        fetchedAt,
        ...cleanUsable(file.data.records),
      });
      const savedAt = fetchedAt ? fetchedAt.toISOString() : "an unknown time";
      logger.warn(
        `Serving ${state.sightings.length} sightings from the snapshot saved at ${savedAt}`,
      );
    } catch (error) {
      logger.error(`Could not use the saved snapshot: ${error.message}`);
      setState({ status: "unavailable" });
    }
  }

  async function loadFromElanco() {
    const attemptedAt = now();
    setState({ lastAttemptAt: attemptedAt });
    try {
      const records = await loadRecords();
      const usable = cleanUsable(records);
      setState({
        status: "ready",
        source: "elanco",
        fetchedAt: attemptedAt,
        lastError: null,
        ...usable,
      });
      const { received, kept, removed, corrected } = usable.report;
      logger.info(
        `Loaded ${kept} of ${received} sightings from Elanco (${removed} removed, ${corrected} corrected)`,
      );
      await saveSnapshot(records, attemptedAt);
    } catch (error) {
      setState({ lastError: error.message });
      logger.warn(`Could not load sightings from Elanco: ${error.message}`);
      if (state.status === "loading") {
        await loadFromSnapshot();
      }
    }
  }

  // Calls that arrive while a fetch is already running share it, so the store
  // never sends Elanco two requests at once.
  function refresh() {
    if (!inFlight) {
      inFlight = loadFromElanco().finally(() => {
        inFlight = null;
      });
    }
    return inFlight;
  }

  function scheduleNextRefresh() {
    const delayMs = state.status === "ready" ? refreshIntervalMs : recoveryIntervalMs;
    if (stopped || !delayMs) {
      return;
    }
    timer = setTimeout(async () => {
      await refresh();
      scheduleNextRefresh();
    }, delayMs);
    timer.unref();
  }

  async function start() {
    stopped = false;
    await refresh();
    scheduleNextRefresh();
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    timer = null;
  }

  return { getState: () => state, refresh, start, stop };
}

module.exports = { createSightingStore };
