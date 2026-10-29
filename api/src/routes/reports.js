const express = require("express");
const multer = require("multer");

const { describeFilters, filterSightings } = require("../analysis/filters");
const { paginate } = require("../analysis/pagination");
const { HttpError, notFoundError, validationError } = require("../errors");
const { ukNow } = require("../lib/dates");
const { createRateLimiter } = require("../middleware/rateLimit");
const { checkPhoto } = require("../reports/image");
const { REPORT_RULES } = require("../reports/rules");
const { toReportResponse } = require("../reports/serialise");
const {
  findSimilarReport,
  possibleDuplicateWarning,
  validateReport,
} = require("../reports/validateReport");
const { readQuery } = require("./readQuery");

const FORM_ERROR_MESSAGE = "Please correct the highlighted fields.";
const MAX_PHOTO_MB = REPORT_RULES.maxPhotoBytes / (1024 * 1024);

const UPLOAD_LIMIT_ERRORS = {
  LIMIT_FILE_SIZE: { field: "photo", message: `The photo must be ${MAX_PHOTO_MB} MB or smaller.` },
  LIMIT_FILE_COUNT: { field: "photo", message: "Attach one photo at most." },
  LIMIT_UNEXPECTED_FILE: {
    field: "photo",
    message: 'Attach one photo at most, in the "photo" field.',
  },
  LIMIT_FIELD_VALUE: { message: "This field is too long." },
  LIMIT_FIELD_KEY: { message: "A field name is too long." },
  LIMIT_FIELD_COUNT: { field: null, message: "The form has too many fields." },
  LIMIT_PART_COUNT: { field: null, message: "The form has too many fields." },
};

function describeUploadError(error) {
  const known = UPLOAD_LIMIT_ERRORS[error.code] ?? { message: "The form could not be accepted." };
  return { field: "field" in known ? known.field : (error.field ?? null), message: known.message };
}

// The photo is held in memory, not written to disk, until every check has
// passed, so a rejected report never leaves a file behind. The limits stop a
// huge upload early, while it is still streaming in.
const parseReportForm = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: REPORT_RULES.maxPhotoBytes,
    files: 1,
    fields: 10,
    fieldSize: 4 * 1024,
    parts: 12,
  },
}).single("photo");

function receiveReportForm(request, response, next) {
  if (!request.is("multipart/form-data")) {
    next(
      new HttpError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send the report as multipart/form-data, the way a form with a file upload does.",
      ),
    );
    return;
  }
  parseReportForm(request, response, (error) => {
    if (!error) {
      next();
    } else if (error instanceof multer.MulterError) {
      next(validationError([describeUploadError(error)], FORM_ERROR_MESSAGE));
    } else {
      next(new HttpError(400, "BAD_REQUEST", "The form data could not be read. Please try again."));
    }
  });
}

function newestSightingFirst(first, second) {
  return second.date - first.date || second.submittedAt.localeCompare(first.submittedAt);
}

function createReportsRouter({ reports, rateLimit }) {
  const router = express.Router();
  const limitReports = createRateLimiter(rateLimit);

  router.post("/reports", limitReports, receiveReportForm, async (request, response) => {
    const { value, errors, warnings } = validateReport(request.body ?? {}, { now: ukNow() });
    const { photo, error: photoError } = checkPhoto(request.file);
    const allErrors = photoError ? [...errors, photoError] : errors;
    if (allErrors.length > 0) {
      throw validationError(allErrors, FORM_ERROR_MESSAGE);
    }

    const similar = findSimilarReport(reports.list(), value);
    const report = await reports.add(value, photo);

    response
      .status(201)
      .location(`/api/reports/${report.id}`)
      .json({
        data: toReportResponse(report),
        warnings: similar ? [...warnings, possibleDuplicateWarning(similar)] : warnings,
      });
  });

  router.get("/reports", (request, response) => {
    const { reportFilters, pagination } = readQuery(request.query, ["reportFilters", "pagination"]);
    const matching = filterSightings(reports.list(), reportFilters);
    const page = paginate([...matching].sort(newestSightingFirst), pagination);
    const filters = describeFilters(reportFilters);
    delete filters.severity;

    response.json({
      data: page.items.map(toReportResponse),
      pagination: page.pagination,
      filters,
    });
  });

  router.get("/reports/:id", (request, response) => {
    const report = reports.find(request.params.id);
    if (!report) {
      throw notFoundError(`No report has the id "${request.params.id}".`);
    }
    response.json({ data: toReportResponse(report) });
  });

  // Photo names are random and never reused, so browsers may cache them for
  // good. The strict policy means a photo could never run code even if
  // something other than an image got stored.
  router.use(
    "/uploads",
    express.static(reports.uploadsDir, {
      index: false,
      immutable: true,
      maxAge: "365d",
      setHeaders: (response) => response.set("Content-Security-Policy", "default-src 'none'"),
    }),
  );
  router.use("/uploads", () => {
    throw notFoundError("That photo does not exist.");
  });

  return router;
}

module.exports = { createReportsRouter };
