const { addDays, formatDay, parseDay, ukNow } = require("../lib/dates");
const { createNameMatcher } = require("../lib/textMatch");
const { LOCATION_NAMES } = require("../reference/locations");
const { SPECIES } = require("../reference/species");
const { REPORT_RULES } = require("./rules");

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Control characters (except tab and newline) have no business in notes. The
// lint rule below exists to catch control characters used by accident.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const locationMatcher = createNameMatcher(LOCATION_NAMES);
const speciesMatcher = createNameMatcher(SPECIES.map((species) => species.name));
const LATIN_NAMES = new Map(SPECIES.map((species) => [species.name, species.latinName]));

function readField(fields, name, errors) {
  const value = fields[name];
  if (Array.isArray(value)) {
    errors.push({ field: name, message: `Send "${name}" only once.` });
    return "";
  }
  return typeof value === "string" ? value.trim() : "";
}

function checkDate(dateText, rules, errors) {
  if (!dateText) {
    errors.push({ field: "date", message: "Enter the date you saw the tick." });
    return null;
  }
  const date = parseDay(dateText);
  if (!date) {
    errors.push({ field: "date", message: "Enter a real date in the format YYYY-MM-DD." });
    return null;
  }
  if (date < rules.earliestDate) {
    errors.push({ field: "date", message: "Enter a date from 1 January 2000 onwards." });
    return null;
  }
  return date;
}

function checkTime(timeText, errors) {
  if (!timeText) {
    errors.push({ field: "time", message: "Enter the time you saw the tick." });
    return null;
  }
  const match = TIME_PATTERN.exec(timeText);
  if (!match) {
    errors.push({ field: "time", message: "Enter a time in 24-hour format, for example 14:30." });
    return null;
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function checkWhen(fields, { now, rules }, errors, warnings) {
  const date = checkDate(readField(fields, "date", errors), rules, errors);
  const time = checkTime(readField(fields, "time", errors), errors);
  if (!date || !time) {
    return null;
  }
  const sightedAt = new Date(date.getTime() + (time.hours * 60 + time.minutes) * 60 * 1000);
  const latestAllowed = new Date(now.getTime() + rules.futureToleranceMinutes * 60 * 1000);
  if (sightedAt > latestAllowed) {
    errors.push({ field: "date", message: "The date and time cannot be in the future." });
    return null;
  }
  if (sightedAt < addDays(now, -rules.oldSightingDays)) {
    warnings.push({
      code: "oldSighting",
      field: "date",
      message:
        "This sighting is more than a year old. It has been saved, but please check the date.",
    });
  }
  return sightedAt;
}

function checkChoice(fields, name, matcher, messages, errors) {
  const text = readField(fields, name, errors);
  if (!text) {
    errors.push({ field: name, message: messages.missing });
    return null;
  }
  const choice = matcher.find(text);
  if (!choice) {
    const suggestion = matcher.suggest(text);
    errors.push({
      field: name,
      message: suggestion ? `${messages.unknown} Did you mean "${suggestion}"?` : messages.unknown,
    });
  }
  return choice;
}

function checkNotes(fields, rules, errors) {
  const notes = readField(fields, "notes", errors)
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "");
  if (notes.length > rules.maxNotesLength) {
    errors.push({
      field: "notes",
      message: `Notes must be ${rules.maxNotesLength} characters or fewer (these are ${notes.length}).`,
    });
  }
  return notes;
}

/**
 * Validates a submitted report's text fields: date, time, location, species
 * and optional notes. Returns { value, errors, warnings }. Errors stop the
 * report being saved; warnings do not, they are shown alongside the success
 * message. The browser runs the same checks first, but these are the ones
 * that count, because anything can be sent to an API directly.
 */
function validateReport(fields, { now = ukNow(), rules = REPORT_RULES } = {}) {
  const errors = [];
  const warnings = [];
  const date = checkWhen(fields, { now, rules }, errors, warnings);
  const location = checkChoice(
    fields,
    "location",
    locationMatcher,
    {
      missing: "Choose the city where you saw the tick.",
      unknown: "Choose one of the listed cities.",
    },
    errors,
  );
  const species = checkChoice(
    fields,
    "species",
    speciesMatcher,
    {
      missing: "Choose the species of tick.",
      unknown: "Choose one of the five listed species.",
    },
    errors,
  );
  const notes = checkNotes(fields, rules, errors);

  if (errors.length > 0) {
    return { value: null, errors, warnings: [] };
  }
  return {
    value: { date, location, species, latinName: LATIN_NAMES.get(species), notes },
    errors,
    warnings,
  };
}

// The same species in the same city on the same day is probably the same
// tick reported twice. It is still saved, because it could be a second tick.
function findSimilarReport(reports, candidate) {
  const day = formatDay(candidate.date);
  return reports.find(
    (report) =>
      report.location === candidate.location &&
      report.species === candidate.species &&
      formatDay(report.date) === day,
  );
}

function possibleDuplicateWarning(report) {
  return {
    code: "possibleDuplicate",
    field: null,
    message: `A ${report.species} in ${report.location} was already reported for ${formatDay(report.date)}. This report has been saved too, so there is no need to send it again.`,
  };
}

module.exports = { findSimilarReport, possibleDuplicateWarning, validateReport };
