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

describe("GET /api/sightings", () => {
  it("returns the first page, newest first, with totals", async () => {
    const { status, body } = await getJson("/api/sightings");

    assert.equal(status, 200);
    assert.equal(body.data.length, 20);
    assert.equal(body.data[0].id, "gla-2024-12-30");
    assert.deepEqual(body.pagination, { page: 1, pageSize: 20, total: 24, totalPages: 2 });
    assert.deepEqual(body.filters, {
      from: null,
      to: null,
      location: [],
      species: [],
      severity: [],
    });
  });

  it("returns sightings in Elanco's date format", async () => {
    const { body } = await getJson("/api/sightings?pageSize=1");
    assert.deepEqual(body.data[0], {
      id: "gla-2024-12-30",
      date: "2024-12-30T16:00:00",
      location: "Glasgow",
      species: "Tree-hole tick",
      latinName: "Ixodes arboricola",
    });
  });

  it("filters by location and species, ignoring letter case, and echoes what it understood", async () => {
    const { body } = await getJson("/api/sightings?location=london&species=marsh%20tick");

    assert.deepEqual(
      body.data.map((sighting) => sighting.id),
      ["lon-2024-12-20", "lon-2024-06-15", "lon-2023-05-05"],
    );
    assert.deepEqual(body.filters.location, ["London"]);
    assert.deepEqual(body.filters.species, ["Marsh tick"]);
  });

  it("filters by time range, including both end dates", async () => {
    const { body } = await getJson("/api/sightings?from=2024-01-01&to=2024-12-30&pageSize=100");

    assert.equal(body.pagination.total, 8);
    assert.ok(body.data.every((sighting) => sighting.date.startsWith("2024-")));
  });

  it("handles a species name with a slash", async () => {
    const { body } = await getJson(
      `/api/sightings?species=${encodeURIComponent("Fox/badger tick")}`,
    );
    assert.equal(body.pagination.total, 5);
  });

  it("pages through the results in either order", async () => {
    const oldest = await getJson("/api/sightings?sort=oldest&pageSize=2");
    const secondPage = await getJson("/api/sightings?page=2");

    assert.deepEqual(
      oldest.body.data.map((sighting) => sighting.id),
      ["cdf-2022-01-03", "lon-2022-01-14"],
    );
    assert.equal(secondPage.body.data.length, 4);
  });

  it("returns an empty list, not an error, when nothing matches", async () => {
    const { status, body } = await getJson("/api/sightings?severity=low");

    assert.equal(status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.pagination.total, 0);
  });

  it("answers 422 with a suggestion for a mistyped location", async () => {
    const { status, body } = await getJson("/api/sightings?location=Londn");

    assert.equal(status, 422);
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.deepEqual(body.error.details, [
      {
        field: "location",
        message: 'Unknown location "Londn". Did you mean "London"?',
        suggestion: "London",
      },
    ]);
  });

  it("answers 422 for an option it does not recognise instead of ignoring it", async () => {
    const { status, body } = await getJson("/api/sightings?spieces=marsh");

    assert.equal(status, 422);
    assert.equal(body.error.details[0].field, "spieces");
    assert.match(body.error.details[0].message, /is not an option here/);
  });

  it("lists every problem in one response", async () => {
    const { body } = await getJson("/api/sightings?from=yesterday&page=0&sort=random");
    assert.deepEqual(
      body.error.details.map((detail) => detail.field),
      ["from", "page", "sort"],
    );
  });
});

describe("GET /api/sightings/:id", () => {
  it("returns one sighting", async () => {
    const { status, body } = await getJson("/api/sightings/lds-2022-12-31");

    assert.equal(status, 200);
    assert.equal(body.data.date, "2022-12-31T23:30:00");
  });

  it("answers 404 for an unknown id", async () => {
    const { status, body } = await getJson("/api/sightings/no-such-id");

    assert.equal(status, 404);
    assert.deepEqual(body.error, {
      code: "NOT_FOUND",
      message: 'No sighting has the id "no-such-id".',
    });
  });

  it("answers 400 for a malformed address", async () => {
    const { status, body } = await getJson("/api/sightings/%E0%A4%A");

    assert.equal(status, 400);
    assert.equal(body.error.code, "BAD_REQUEST");
  });
});
