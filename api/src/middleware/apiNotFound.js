const { notFoundError } = require("../errors");

function apiNotFound(request) {
  throw notFoundError(`There is no API endpoint at ${request.method} ${request.originalUrl}.`);
}

module.exports = { apiNotFound };
