// The only module that talks to the server. The page never calls Elanco
// directly: everything goes through this app's own API.

const REQUEST_TIMEOUT_MS = 15_000;

const FALLBACK_MESSAGES = {
  NETWORK_ERROR:
    "Can't reach the Tick Tracker server. Check your internet connection, then try again.",
  TIMEOUT: "The server is taking too long to answer. Please try again.",
  BAD_RESPONSE: "The server sent a response that couldn't be read. Please try again.",
  SERVER_ERROR: "Something went wrong on the server. Please try again in a moment.",
};

export class ApiError extends Error {
  constructor({ status = 0, code, message, details = [], retryAfterSeconds = null }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function isAbortError(error) {
  return error?.name === "AbortError";
}

function buildUrl(path, params = {}) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    for (const item of [].concat(value)) {
      if (item !== null && item !== undefined && item !== "") {
        url.searchParams.append(key, item);
      }
    }
  }
  return url;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorFromResponse(response, payload) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  const fallback =
    response.status >= 500 ? FALLBACK_MESSAGES.SERVER_ERROR : FALLBACK_MESSAGES.BAD_RESPONSE;
  return new ApiError({
    status: response.status,
    code: payload?.error?.code ?? `HTTP_${response.status}`,
    message: payload?.error?.message ?? fallback,
    details: payload?.error?.details ?? [],
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  });
}

/**
 * Sends a request and returns the parsed JSON, or throws an ApiError with a
 * message fit to show people. Passing an AbortSignal lets a caller cancel a
 * request it no longer needs (for example when the filters change again),
 * so a slow, out-of-date response can never overwrite a newer one.
 */
async function request(path, { params, method = "GET", body, signal } = {}) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      body,
      headers: { Accept: "application/json" },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    const code = timeout.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new ApiError({ code, message: FALLBACK_MESSAGES[code] });
  }

  const payload = await readJson(response);
  if (!response.ok) {
    throw errorFromResponse(response, payload);
  }
  if (payload === null) {
    throw new ApiError({
      status: response.status,
      code: "BAD_RESPONSE",
      message: FALLBACK_MESSAGES.BAD_RESPONSE,
    });
  }
  return payload;
}

// The page's shared filters, as query parameters for the API.
export function filterParams({ from, to, species, severity }) {
  return { from, to, species, severity };
}

// Each function takes the query parameters as a plain object, plus options
// such as an AbortSignal.
export const api = {
  meta: (options) => request("/api/meta", options),
  dataQuality: (options) => request("/api/data-quality", options),
  locations: (params, options) => request("/api/insights/locations", { params, ...options }),
  regions: (params, options) => request("/api/insights/regions", { params, ...options }),
  species: (params, options) => request("/api/insights/species", { params, ...options }),
  trends: (params, options) => request("/api/insights/trends", { params, ...options }),
  seasonal: (params, options) => request("/api/insights/seasonal", { params, ...options }),
  sightings: (params, options) => request("/api/sightings", { params, ...options }),
  reports: (params, options) => request("/api/reports", { params, ...options }),
  submitReport: (formData) => request("/api/reports", { method: "POST", body: formData }),
};
