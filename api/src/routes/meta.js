const express = require("express");

const { SEVERITY_RULE } = require("../analysis/severity");
const { RECENT_ACTIVITY_DAYS } = require("../analysis/summaries");
const { formatDay } = require("../lib/dates");
const { requireData } = require("../middleware/requireData");
const { LOCATIONS } = require("../reference/locations");
const { SPECIES } = require("../reference/species");
const { REPORT_RULES } = require("../reports/rules");
const { summariseDataState } = require("../sightings/serialise");

function createMetaRouter({ store }) {
  const router = express.Router();

  // Works even while the data is loading or unavailable, so the page can
  // always build its filters and the report form.
  router.get("/meta", (request, response) => {
    response.json({
      data: summariseDataState(store.getState()),
      locations: LOCATIONS,
      species: SPECIES,
      severityRule: { ...SEVERITY_RULE, recentDays: RECENT_ACTIVITY_DAYS },
      reportRules: { ...REPORT_RULES, earliestDate: formatDay(REPORT_RULES.earliestDate) },
    });
  });

  router.get("/data-quality", requireData(store), (request, response) => {
    const { report, source, fetchedAt } = store.getState();
    response.json({ source, fetchedAt: fetchedAt ? fetchedAt.toISOString() : null, ...report });
  });

  return router;
}

module.exports = { createMetaRouter };
