const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { startTestApp } = require("./support/testApp");

let app;
before(async () => {
  app = await startTestApp();
});
after(() => app.close());

async function getJson(path) {
  const response = await app.get(path);
  return { status: response.status, body: await response.json() };
}

describe("GET /api/insights/locations", () => {
  it("returns one summary per city for the map, with the rule used", async () => {
    const { status, body } = await getJson("/api/insights/locations");

    assert.equal(status, 200);
    assert.equal(body.referenceDate, "2024-12-30T16:00:00");
    assert.deepEqual(body.rule, {
      halfLifeDays: 365,
      highAtOrAbove: 1.25,
      lowAtOrBelow: 0.75,
      recentDays: 30,
    });
    assert.deepEqual(body.totals, { sightings: 24, locations: 4 });

    const london = body.locations[0];
    assert.equal(london.location, "London");
    assert.equal(london.lat, 51.5074);
    assert.equal(london.total, 8);
    assert.equal(london.latestSighting, "2024-12-20T10:00:00");
    assert.equal(london.recentCount, 1);
    assert.deepEqual(london.severity, { band: "high", score: 4.19, comparedToMedian: null });
  });

  it("measures recency from the end of the chosen period", async () => {
    const { body } = await getJson("/api/insights/locations?to=2023-12-31");

    assert.equal(body.referenceDate, "2023-12-31T23:59:59");
    assert.equal(body.totals.sightings, 16);
  });

  it("returns no cities when the severity filter matches none", async () => {
    const { status, body } = await getJson("/api/insights/locations?severity=low");

    assert.equal(status, 200);
    assert.deepEqual(body.locations, []);
    assert.deepEqual(body.totals, { sightings: 0, locations: 0 });
  });

  it("rejects bad filters with 422", async () => {
    const { status, body } = await getJson("/api/insights/locations?species=deer");
    assert.equal(status, 422);
    assert.equal(body.error.details[0].field, "species");
  });
});

describe("GET /api/insights/regions", () => {
  it("adds up sightings per UK region", async () => {
    const { body } = await getJson("/api/insights/regions");

    assert.deepEqual(body.totals, { sightings: 24, regions: 4 });
    assert.deepEqual(body.regions[0], {
      region: "London",
      nation: "England",
      total: 8,
      locations: ["London"],
    });
  });
});

describe("GET /api/insights/species", () => {
  it("returns all five species with counts and shares", async () => {
    const { body } = await getJson("/api/insights/species");

    assert.equal(body.species.length, 5);
    const marsh = body.species.find((species) => species.name === "Marsh tick");
    assert.equal(marsh.count, 6);
    assert.equal(marsh.share, 0.25);
    assert.deepEqual(marsh.mostSeenIn, { names: ["London"], count: 3 });
    assert.equal(marsh.latestSighting, "2024-12-20T10:00:00");
  });
});

describe("GET /api/insights/trends", () => {
  it("defaults to monthly counts across the data, including empty months", async () => {
    const { body } = await getJson("/api/insights/trends");

    assert.equal(body.interval, "month");
    assert.equal(body.from, "2022-01-03");
    assert.equal(body.to, "2024-12-30");
    assert.equal(body.points.length, 36);
    assert.deepEqual(body.points[0], { period: "2022-01", start: "2022-01-01", count: 2 });
    assert.deepEqual(body.points[1], { period: "2022-02", start: "2022-02-01", count: 0 });
    assert.equal(
      body.points.reduce((sum, point) => sum + point.count, 0),
      24,
    );
  });

  it("supports weekly and yearly intervals", async () => {
    const weekly = await getJson("/api/insights/trends?interval=week");
    const yearly = await getJson("/api/insights/trends?interval=year");

    assert.equal(weekly.body.points[0].period, "2022-W01");
    assert.deepEqual(
      yearly.body.points.map((point) => `${point.period}:${point.count}`),
      ["2022:8", "2023:8", "2024:8"],
    );
  });

  it("follows the filters", async () => {
    const { body } = await getJson("/api/insights/trends?interval=year&location=Cardiff");
    assert.deepEqual(
      body.points.map((point) => point.count),
      [2, 2, 0],
    );
  });

  it("returns no points for a period with no data", async () => {
    const { body } = await getJson("/api/insights/trends?from=2026-01-01");

    assert.equal(body.from, null);
    assert.deepEqual(body.points, []);
  });

  it("rejects an unknown interval", async () => {
    const { status } = await getJson("/api/insights/trends?interval=daily");
    assert.equal(status, 422);
  });
});

describe("GET /api/insights/seasonal", () => {
  it("counts sightings per calendar month and judges the pattern honestly", async () => {
    const { body } = await getJson("/api/insights/seasonal");

    assert.equal(body.months.length, 12);
    assert.equal(body.total, 24);
    assert.equal(body.averagePerMonth, 2);
    assert.equal(body.pattern.kind, "too-few");
  });

  it("can be narrowed to one city and one year", async () => {
    const { body } = await getJson(
      "/api/insights/seasonal?location=Glasgow&from=2023-01-01&to=2023-12-31",
    );

    assert.equal(body.total, 3);
    assert.deepEqual(body.filters.location, ["Glasgow"]);
  });
});

describe("insights while data is loading", () => {
  it("answer 503 rather than an empty result", async () => {
    const loadingApp = await startTestApp({ dataStatus: "loading" });
    const response = await loadingApp.get("/api/insights/locations");
    await loadingApp.close();

    assert.equal(response.status, 503);
  });
});
