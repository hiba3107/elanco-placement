const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { startTestApp } = require("./support/testApp");

describe("GET /api/meta", () => {
  it("returns reference data and the data's date range", async () => {
    const app = await startTestApp();
    const body = await (await app.get("/api/meta")).json();
    await app.close();

    assert.equal(body.locations.length, 14);
    assert.deepEqual(body.locations[0], {
      name: "Birmingham",
      region: "West Midlands",
      nation: "England",
      lat: 52.4862,
      lng: -1.8904,
    });
    assert.equal(body.species.length, 5);
    assert.equal(body.data.status, "ready");
    assert.deepEqual(body.data.dateRange, { earliest: "2022-01-03", latest: "2024-12-30" });
  });

  it("shares the severity rule and the report rules with the page", async () => {
    const app = await startTestApp();
    const body = await (await app.get("/api/meta")).json();
    await app.close();

    assert.deepEqual(body.severityRule, {
      halfLifeDays: 365,
      highAtOrAbove: 1.25,
      lowAtOrBelow: 0.75,
      recentDays: 30,
    });
    assert.deepEqual(body.reportRules, {
      earliestDate: "2000-01-01",
      maxNotesLength: 500,
      maxPhotoBytes: 5242880,
      maxPhotoDimension: 8000,
      photoTypes: ["image/jpeg", "image/png"],
      oldSightingDays: 365,
      futureToleranceMinutes: 5,
    });
  });

  it("still works while the data is loading, so the page can build its controls", async () => {
    const app = await startTestApp({ dataStatus: "loading" });
    const response = await app.get("/api/meta");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "loading");
    assert.equal(body.data.dateRange, null);
    assert.equal(body.locations.length, 14);
  });
});

describe("GET /api/data-quality", () => {
  let app;
  before(async () => {
    app = await startTestApp();
  });
  after(() => app.close());

  it("returns the cleaning report for the loaded data", async () => {
    const body = await (await app.get("/api/data-quality")).json();

    assert.equal(body.source, "elanco");
    assert.equal(body.received, 24);
    assert.equal(body.kept, 24);
    assert.equal(body.removed, 0);
    assert.equal(body.removedByReason.length, 9);
    assert.match(body.fetchedAt, /^\d{4}-\d{2}-\d{2}T.*Z$/);
  });
});

describe("endpoints that need data", () => {
  it("answer 503 DATA_LOADING with Retry-After while loading", async () => {
    const app = await startTestApp({ dataStatus: "loading" });
    const response = await app.get("/api/data-quality");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "5");
    assert.equal(body.error.code, "DATA_LOADING");
  });

  it("answer 503 DATA_UNAVAILABLE when Elanco could not be reached", async () => {
    const app = await startTestApp({ dataStatus: "unavailable" });
    const response = await app.get("/api/sightings");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(body.error.code, "DATA_UNAVAILABLE");
  });
});
