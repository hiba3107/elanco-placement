const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  ElancoApiError,
  createElancoLoader,
  fetchElancoRecords,
  parseRetryAfter,
} = require("../src/elanco/client");
const { createTestLogger } = require("./support/logger");

const URL = "https://elanco.test/data/tick-sightings";
const RECORDS = [{ id: "a", date: "2024-05-01T10:00:00", location: "London" }];

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function fetchReturning(...responses) {
  let calls = 0;
  const fetchImpl = async () => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls += 1;
    if (next instanceof Error) {
      throw next;
    }
    return typeof next === "function" ? next() : next;
  };
  return { fetchImpl, calls: () => calls };
}

function fetchOnce(response) {
  return fetchElancoRecords({
    url: URL,
    timeoutMs: 1000,
    fetchImpl: fetchReturning(response).fetchImpl,
  });
}

describe("fetchElancoRecords", () => {
  it("returns the list of raw records", async () => {
    assert.deepEqual(await fetchOnce(jsonResponse(RECORDS)), RECORDS);
  });

  it("marks rate limiting as worth retrying and reads Retry-After", async () => {
    const response = new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": "3" },
    });
    await assert.rejects(fetchOnce(response), (error) => {
      assert.ok(error instanceof ElancoApiError);
      assert.equal(error.status, 429);
      assert.equal(error.retryable, true);
      assert.equal(error.retryAfterMs, 3000);
      return true;
    });
  });

  it("marks server errors as worth retrying", async () => {
    await assert.rejects(fetchOnce(new Response("", { status: 503 })), { retryable: true });
  });

  it("does not retry a 404, which will not fix itself", async () => {
    await assert.rejects(fetchOnce(new Response("", { status: 404 })), {
      retryable: false,
      message: "Elanco responded with HTTP 404",
    });
  });

  it("explains a connection failure", async () => {
    const networkError = new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    await assert.rejects(fetchOnce(networkError), {
      retryable: true,
      message: "Could not connect to Elanco (ENOTFOUND)",
    });
  });

  it("gives up on a slow response after the timeout", async () => {
    // A real request's open socket keeps Node running until the timeout fires.
    // This fake has no socket, so a timer stands in for it.
    const neverResponds = (url, { signal }) =>
      new Promise((resolve, reject) => {
        const openSocket = setTimeout(resolve, 5000);
        signal.addEventListener("abort", () => {
          clearTimeout(openSocket);
          reject(signal.reason);
        });
      });
    await assert.rejects(
      fetchElancoRecords({ url: URL, timeoutMs: 20, fetchImpl: neverResponds }),
      {
        retryable: true,
        message: "Elanco did not respond within 20 ms",
      },
    );
  });

  it("rejects a body that is not JSON", async () => {
    await assert.rejects(fetchOnce(new Response("<html>Maintenance</html>")), {
      retryable: true,
      message: "Elanco sent a response that is not valid JSON",
    });
  });

  it("rejects JSON that is not a list, without retrying", async () => {
    await assert.rejects(fetchOnce(jsonResponse({ data: RECORDS })), {
      retryable: false,
      message: "Expected a list of sightings from Elanco, got an object",
    });
  });
});

describe("parseRetryAfter", () => {
  it("reads a number of seconds", () => {
    assert.equal(parseRetryAfter("120"), 120_000);
  });

  it("reads an HTTP date", () => {
    const now = Date.parse("2024-05-01T10:00:00Z");
    assert.equal(parseRetryAfter("Wed, 01 May 2024 10:00:30 GMT", now), 30_000);
  });

  it("ignores a missing or unreadable header", () => {
    assert.equal(parseRetryAfter(null), null);
    assert.equal(parseRetryAfter("soon"), null);
  });
});

describe("createElancoLoader", () => {
  it("retries through rate limiting and logs each retry", async () => {
    const { fetchImpl, calls } = fetchReturning(
      () => new Response("", { status: 429 }),
      () => new Response("", { status: 429 }),
      () => jsonResponse(RECORDS),
    );
    const { logger, messages } = createTestLogger();
    const load = createElancoLoader({
      url: URL,
      timeoutMs: 1000,
      attempts: 5,
      logger,
      fetchImpl,
      sleep: async () => {},
    });

    assert.deepEqual(await load(), RECORDS);
    assert.equal(calls(), 3);
    assert.equal(messages.filter((entry) => entry.level === "warn").length, 2);
  });

  it("stops at the first permanent failure", async () => {
    const { fetchImpl, calls } = fetchReturning(() => new Response("", { status: 404 }));
    const load = createElancoLoader({
      url: URL,
      timeoutMs: 1000,
      attempts: 5,
      logger: createTestLogger().logger,
      fetchImpl,
      sleep: async () => {},
    });

    await assert.rejects(load(), { status: 404 });
    assert.equal(calls(), 1);
  });
});
