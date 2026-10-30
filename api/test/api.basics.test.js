const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { startTestApp } = require("./support/testApp");

describe("GET /api/health", () => {
  it("reports the server and data status when data is loaded", async () => {
    const app = await startTestApp();
    const response = await app.get("/api/health");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.data.status, "ready");
    assert.equal(body.data.source, "elanco");
    assert.equal(body.data.records, 24);
    assert.equal(body.data.lastError, null);
    assert.ok(Number.isInteger(body.uptimeSeconds));
  });

  it("stays healthy and explains the problem when Elanco is unreachable", async () => {
    const app = await startTestApp({ dataStatus: "unavailable" });
    const response = await app.get("/api/health");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 200);
    assert.equal(body.data.status, "unavailable");
    assert.equal(body.data.records, 0);
    assert.equal(body.data.lastError, "Could not connect to Elanco (ENOTFOUND)");
  });
});

describe("cross-cutting behaviour", () => {
  let app;
  before(async () => {
    app = await startTestApp();
  });
  after(() => app.close());

  it("sends security headers and hides the framework banner", async () => {
    const response = await app.get("/api/health");

    assert.match(response.headers.get("content-security-policy"), /default-src 'self'/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-powered-by"), null);
  });

  it("lets the page load OpenStreetMap's map tiles", async () => {
    const response = await app.get("/api/health");

    assert.match(
      response.headers.get("content-security-policy"),
      /img-src [^;]*https:\/\/tile\.openstreetmap\.org/,
    );
  });

  it("answers unknown API paths with a JSON 404", async () => {
    const response = await app.get("/api/nothing-here");
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      error: {
        code: "NOT_FOUND",
        message: "There is no API endpoint at GET /api/nothing-here.",
      },
    });
  });

  it("serves the web page from the same origin", async () => {
    const response = await app.get("/");

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
  });
});

describe("unexpected errors", () => {
  it("answer 500 with a generic message and log the details", async () => {
    const brokenStore = {
      getState() {
        throw new Error("secret internal detail");
      },
    };
    const app = await startTestApp({ store: brokenStore });
    const response = await app.get("/api/health");
    const body = await response.json();
    await app.close();

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.doesNotMatch(JSON.stringify(body), /secret internal detail/);
    assert.ok(app.messages.some((entry) => entry.level === "error"));
  });
});
