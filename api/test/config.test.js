const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { loadConfig } = require("../src/config");

describe("loadConfig", () => {
  it("uses sensible defaults when nothing is set", () => {
    const config = loadConfig({});

    assert.equal(config.port, 3000);
    assert.equal(config.logLevel, "info");
    assert.equal(config.elanco.url, "https://dev-task.elancoapps.com/data/tick-sightings");
  });

  it("reads overrides from the environment", () => {
    const config = loadConfig({
      PORT: "8080",
      LOG_LEVEL: "DEBUG",
      ELANCO_API_URL: "http://localhost:4000/data",
    });

    assert.equal(config.port, 8080);
    assert.equal(config.logLevel, "debug");
    assert.equal(config.elanco.url, "http://localhost:4000/data");
  });

  it("treats an empty value as not set", () => {
    assert.equal(loadConfig({ PORT: "  " }).port, 3000);
  });

  it("rejects a port that is not a whole number", () => {
    assert.throws(() => loadConfig({ PORT: "three thousand" }), /PORT must be a whole number/);
    assert.throws(() => loadConfig({ PORT: "30.5" }), /PORT must be a whole number/);
    assert.throws(() => loadConfig({ PORT: "-1" }), /PORT must be a whole number/);
  });

  it("rejects an unknown log level", () => {
    assert.throws(() => loadConfig({ LOG_LEVEL: "loud" }), /LOG_LEVEL must be one of/);
  });
});

describe("loadConfig data settings", () => {
  it("has defaults for the Elanco connection and data folder", () => {
    const config = loadConfig({});

    assert.equal(config.elanco.timeoutMs, 10000);
    assert.equal(config.elanco.maxAttempts, 5);
    assert.equal(config.elanco.refreshMinutes, 360);
    assert.equal(config.elanco.recoveryMinutes, 2);
    assert.match(config.dataDir, /api[\\/]data$/);
  });

  it("resolves DATA_DIR to an absolute path", () => {
    assert.equal(loadConfig({ DATA_DIR: "/srv/tick-data" }).dataDir, "/srv/tick-data");
  });

  it("needs at least one attempt and a timeout above zero", () => {
    assert.throws(() => loadConfig({ ELANCO_MAX_ATTEMPTS: "0" }), /at least 1/);
    assert.throws(() => loadConfig({ ELANCO_TIMEOUT_MS: "0" }), /at least 1/);
  });
});
