const { setTimeout: wait } = require("node:timers/promises");

// Exponential backoff: roughly 1s, 2s, 4s, 8s... capped at maxDelayMs. Half of
// each delay is random ("jitter"), so many servers restarting at the same time
// do not all retry in the same instant. A server's own instruction, such as a
// 429 response's Retry-After header, sets the minimum wait.
function backoffDelay(attempt, { baseDelayMs, maxDelayMs, random, minimumMs = 0 }) {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  const withJitter = exponential / 2 + random() * (exponential / 2);
  return Math.round(Math.min(maxDelayMs, Math.max(minimumMs, withJitter)));
}

/**
 * Runs an async operation and retries it when it fails, waiting longer after
 * each failure. Stops early when shouldRetry says the error is permanent
 * (for example a 404, which will never fix itself). The final error is
 * rethrown unchanged.
 */
async function retry(operation, options = {}) {
  const {
    attempts = 5,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    shouldRetry = () => true,
    onRetry = () => {},
    sleep = wait,
    random = Math.random,
  } = options;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }
      const delayMs = backoffDelay(attempt, {
        baseDelayMs,
        maxDelayMs,
        random,
        minimumMs: error.retryAfterMs ?? 0,
      });
      onRetry({ error, attempt, delayMs });
      await sleep(delayMs);
    }
  }
}

module.exports = { backoffDelay, retry };
