const { HttpError } = require("../errors");

// Endpoints that read sightings answer 503 Service Unavailable until there is
// data to serve, with Retry-After telling clients when to try again. "loading"
// and "unavailable" have different codes so the page can say which it is.
function requireData(store) {
  return function checkDataIsAvailable(request, response, next) {
    const { status } = store.getState();
    if (status === "ready" || status === "stale") {
      next();
      return;
    }
    if (status === "loading") {
      throw new HttpError(
        503,
        "DATA_LOADING",
        "Tick data is still loading from Elanco. Please try again in a few seconds.",
        { headers: { "Retry-After": "5" } },
      );
    }
    throw new HttpError(
      503,
      "DATA_UNAVAILABLE",
      "Tick data is unavailable because Elanco's service could not be reached. The server keeps retrying automatically.",
      { headers: { "Retry-After": "60" } },
    );
  };
}

module.exports = { requireData };
