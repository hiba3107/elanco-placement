const { HttpError } = require("../errors");

const MAX_TRACKED_CLIENTS = 10_000;

function describeWait(seconds) {
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? "a minute" : `${minutes} minutes`;
}

/**
 * Allows each client (by IP address) at most `limit` requests per window,
 * using a fixed window: a counter that resets every `windowMs`. Elanco limits
 * how often this server can call it; this limits how often anyone can post
 * reports, so one person cannot flood the map with fake ones.
 */
function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const clients = new Map();

  function forgetExpired(time) {
    for (const [key, entry] of clients) {
      if (entry.resetAt <= time) {
        clients.delete(key);
      }
    }
  }

  return function rateLimit(request, response, next) {
    const time = now();
    let entry = clients.get(request.ip);
    if (!entry || entry.resetAt <= time) {
      if (clients.size >= MAX_TRACKED_CLIENTS) {
        forgetExpired(time);
      }
      entry = { count: 0, resetAt: time + windowMs };
      clients.set(request.ip, entry);
    }
    entry.count += 1;

    if (entry.count > limit) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - time) / 1000);
      throw new HttpError(
        429,
        "RATE_LIMITED",
        `You have sent a lot of reports in a short time. Please wait ${describeWait(retryAfterSeconds)} and try again.`,
        { headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
    next();
  };
}

module.exports = { createRateLimiter };
