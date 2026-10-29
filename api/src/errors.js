// Every error the API sends has the same JSON shape:
//   { "error": { "code": "VALIDATION_FAILED", "message": "...", "details": [...] } }
// "code" is stable for programs to check; "message" is written for people.
class HttpError extends Error {
  constructor(status, code, message, { details, headers } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

function validationError(details, message = "Some of the information sent is not valid.") {
  return new HttpError(422, "VALIDATION_FAILED", message, { details });
}

function notFoundError(message) {
  return new HttpError(404, "NOT_FOUND", message);
}

module.exports = { HttpError, notFoundError, validationError };
