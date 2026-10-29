const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { backoffDelay, retry } = require("../src/lib/retry");

function failingTimes(count, error = new Error("boom")) {
  let calls = 0;
  const operation = async () => {
    calls += 1;
    if (calls <= count) {
      throw error;
    }
    return "done";
  };
  return { operation, calls: () => calls };
}

function recordSleeps() {
  const delays = [];
  return { delays, sleep: async (ms) => delays.push(ms) };
}

describe("retry", () => {
  it("returns the result straight away when the first attempt works", async () => {
    const { operation, calls } = failingTimes(0);
    const { delays, sleep } = recordSleeps();

    assert.equal(await retry(operation, { sleep }), "done");
    assert.equal(calls(), 1);
    assert.deepEqual(delays, []);
  });

  it("waits longer after each failure, doubling the delay", async () => {
    const { operation, calls } = failingTimes(3);
    const { delays, sleep } = recordSleeps();

    const result = await retry(operation, { sleep, random: () => 1, baseDelayMs: 1000 });

    assert.equal(result, "done");
    assert.equal(calls(), 4);
    assert.deepEqual(delays, [1000, 2000, 4000]);
  });

  it("gives up after the last attempt and rethrows the error", async () => {
    const error = new Error("still down");
    const { operation, calls } = failingTimes(10, error);
    const { sleep } = recordSleeps();

    await assert.rejects(retry(operation, { attempts: 3, sleep }), error);
    assert.equal(calls(), 3);
  });

  it("does not retry errors that cannot fix themselves", async () => {
    const { operation, calls } = failingTimes(10, Object.assign(new Error("404"), { status: 404 }));
    const { sleep } = recordSleeps();

    await assert.rejects(retry(operation, { sleep, shouldRetry: (error) => error.status !== 404 }));
    assert.equal(calls(), 1);
  });

  it("waits at least as long as the server asked", async () => {
    const rateLimited = Object.assign(new Error("429"), { retryAfterMs: 7000 });
    const { operation } = failingTimes(1, rateLimited);
    const { delays, sleep } = recordSleeps();

    await retry(operation, { sleep, random: () => 0, baseDelayMs: 1000 });
    assert.deepEqual(delays, [7000]);
  });

  it("reports each retry so it can be logged", async () => {
    const { operation } = failingTimes(2);
    const { sleep } = recordSleeps();
    const reported = [];

    await retry(operation, {
      sleep,
      random: () => 1,
      onRetry: ({ attempt, delayMs }) => reported.push([attempt, delayMs]),
    });
    assert.deepEqual(reported, [
      [1, 1000],
      [2, 2000],
    ]);
  });
});

describe("backoffDelay", () => {
  const settings = { baseDelayMs: 1000, maxDelayMs: 10_000 };

  it("adds jitter between half and all of the exponential delay", () => {
    assert.equal(backoffDelay(3, { ...settings, random: () => 0 }), 2000);
    assert.equal(backoffDelay(3, { ...settings, random: () => 0.5 }), 3000);
    assert.equal(backoffDelay(3, { ...settings, random: () => 1 }), 4000);
  });

  it("never waits longer than the cap, even when asked to", () => {
    assert.equal(backoffDelay(10, { ...settings, random: () => 1 }), 10_000);
    assert.equal(backoffDelay(1, { ...settings, random: () => 1, minimumMs: 60_000 }), 10_000);
  });
});
