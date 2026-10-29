const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { createRateLimiter } = require("../src/middleware/rateLimit");

function createClock(start = 0) {
  let time = start;
  return { now: () => time, advance: (ms) => (time += ms) };
}

function send(rateLimit, ip = "203.0.113.7") {
  let passed = false;
  rateLimit({ ip }, {}, () => {
    passed = true;
  });
  return passed;
}

describe("createRateLimiter", () => {
  it("lets requests through up to the limit, then refuses with 429", () => {
    const clock = createClock();
    const rateLimit = createRateLimiter({ limit: 2, windowMs: 60_000, now: clock.now });

    assert.equal(send(rateLimit), true);
    assert.equal(send(rateLimit), true);
    assert.throws(
      () => send(rateLimit),
      (error) => {
        assert.equal(error.status, 429);
        assert.equal(error.code, "RATE_LIMITED");
        assert.deepEqual(error.headers, { "Retry-After": "60" });
        assert.match(error.message, /Please wait a minute and try again/);
        return true;
      },
    );
  });

  it("starts counting again once the window has passed", () => {
    const clock = createClock();
    const rateLimit = createRateLimiter({ limit: 1, windowMs: 60_000, now: clock.now });

    send(rateLimit);
    assert.throws(() => send(rateLimit));
    clock.advance(60_000);
    assert.equal(send(rateLimit), true);
  });

  it("counts each client separately", () => {
    const rateLimit = createRateLimiter({ limit: 1, windowMs: 60_000, now: createClock().now });

    assert.equal(send(rateLimit, "198.51.100.1"), true);
    assert.equal(send(rateLimit, "198.51.100.2"), true);
    assert.throws(() => send(rateLimit, "198.51.100.1"));
  });

  it("says how many minutes are left", () => {
    const clock = createClock();
    const rateLimit = createRateLimiter({ limit: 1, windowMs: 15 * 60_000, now: clock.now });

    send(rateLimit);
    clock.advance(2 * 60_000);
    assert.throws(() => send(rateLimit), /Please wait 13 minutes/);
  });
});
