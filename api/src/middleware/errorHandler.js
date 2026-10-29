const { HttpError } = require("../errors");

const UNEXPECTED_ERROR_MESSAGE = "Something went wrong on our side. Please try again.";

function toHttpError(error) {
  if (error instanceof HttpError) {
    return error;
  }
  // Express and its parsers raise errors with a 4xx status for bad requests,
  // such as a malformed percent-encoded URL.
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
    const message = error.expose ? error.message : "The request could not be understood.";
    return new HttpError(error.status, "BAD_REQUEST", message);
  }
  return new HttpError(500, "INTERNAL_ERROR", UNEXPECTED_ERROR_MESSAGE);
}

function createErrorHandler(logger) {
  // Express only treats a middleware as an error handler if it declares four
  // parameters, so `next` has to stay even when it is not called.
  return function handleError(error, request, response, next) {
    if (response.headersSent) {
      next(error);
      return;
    }
    const httpError = toHttpError(error);
    if (httpError.status >= 500) {
      logger.error(`${request.method} ${request.originalUrl} failed`, error);
    }
    if (httpError.headers) {
      response.set(httpError.headers);
    }
    const body = { code: httpError.code, message: httpError.message };
    if (httpError.details) {
      body.details = httpError.details;
    }
    response.status(httpError.status).json({ error: body });
  };
}

module.exports = { createErrorHandler };
