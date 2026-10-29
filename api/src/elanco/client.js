const { retry } = require("../lib/retry");

class ElancoApiError extends Error {
  constructor(message, { status = null, retryable, retryAfterMs = null, cause } = {}) {
    super(message, { cause });
    this.name = "ElancoApiError";
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

// Retry-After is either a number of seconds or an HTTP date.
function parseRetryAfter(headerValue, now = Date.now()) {
  if (!headerValue) {
    return null;
  }
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const date = Date.parse(headerValue);
  return Number.isNaN(date) ? null : Math.max(0, date - now);
}

function isTimeout(error) {
  return error.name === "TimeoutError" || error.name === "AbortError";
}

function describeShape(body) {
  if (body === null) {
    return "null";
  }
  return typeof body === "object" ? "an object" : `a ${typeof body}`;
}

function connectionError(error, timeoutMs) {
  const message = isTimeout(error)
    ? `Elanco did not respond within ${timeoutMs} ms`
    : `Could not connect to Elanco (${error.cause?.code ?? error.message})`;
  return new ElancoApiError(message, { retryable: true, cause: error });
}

function httpError(response) {
  const { status } = response;
  return new ElancoApiError(`Elanco responded with HTTP ${status}`, {
    status,
    retryable: status === 429 || status >= 500,
    retryAfterMs: parseRetryAfter(response.headers.get("retry-after")),
  });
}

/**
 * Fetches every raw sighting from Elanco in one request. Each failure becomes
 * an ElancoApiError that says whether trying again could help: network
 * errors, timeouts, rate limiting (429) and server errors (5xx) are worth a
 * retry; a 404 or a response that is not a list of records is not.
 */
async function fetchElancoRecords({ url, timeoutMs, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw connectionError(error, timeoutMs);
  }

  if (!response.ok) {
    throw httpError(response);
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    if (isTimeout(error)) {
      throw connectionError(error, timeoutMs);
    }
    throw new ElancoApiError("Elanco sent a response that is not valid JSON", {
      retryable: true,
      cause: error,
    });
  }

  if (!Array.isArray(body)) {
    throw new ElancoApiError(
      `Expected a list of sightings from Elanco, got ${describeShape(body)}`,
      {
        retryable: false,
      },
    );
  }
  return body;
}

function createElancoLoader({ url, timeoutMs, attempts, logger, fetchImpl, sleep }) {
  return function loadElancoRecords() {
    return retry(() => fetchElancoRecords({ url, timeoutMs, fetchImpl }), {
      attempts,
      sleep,
      shouldRetry: (error) => error.retryable === true,
      onRetry: ({ error, attempt, delayMs }) => {
        logger.warn(`Elanco attempt ${attempt} of ${attempts} failed: ${error.message}`);
        logger.info(`Retrying Elanco in ${(delayMs / 1000).toFixed(1)} s`);
      },
    });
  };
}

module.exports = { ElancoApiError, createElancoLoader, fetchElancoRecords, parseRetryAfter };
