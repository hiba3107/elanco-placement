const { formatTimestamp, makeWallClock, parseTimestampDetailed, ukNow } = require("../lib/dates");
const { createNameMatcher, normaliseText, toMatchKey } = require("../lib/textMatch");
const { LOCATION_NAMES } = require("../reference/locations");
const { SPECIES } = require("../reference/species");

// Anything earlier is far more likely to be a placeholder (such as the
// 1970-01-01 Unix epoch) than a real tick sighting.
const EARLIEST_PLAUSIBLE_DATE = makeWallClock(2000, 1, 1);

const MAX_EXAMPLES = 20;

const REMOVAL_REASONS = Object.freeze({
  notAnObject: "Not a record at all (null, text or a list)",
  missingField: "Missing an id, date, location or species",
  invalidDate: "Date is not a real date in ISO format (YYYY-MM-DDTHH:mm:ss)",
  futureDate: "Date is in the future",
  implausibleDate: "Date is before 2000, so probably a placeholder",
  unknownLocation: "Location is not one of the 14 known cities",
  unknownSpecies: "Species is not one of the 5 known species",
  duplicateId: "Repeats the id of a record already kept",
  duplicateSighting: "Same date, location and species as a record already kept",
});

const CORRECTION_TYPES = Object.freeze({
  tidiedText: "Fixed letter case, spacing or a numeric id",
  filledLatinName: "Filled in a missing Latin name from the species",
  fixedLatinName: "Replaced a Latin name that did not match the species",
  convertedTimezone: "Converted a timestamp with a timezone to UK time",
});

function reject(reason, detail) {
  return { rejection: { reason, detail } };
}

function describeValue(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "a list";
  }
  return typeof value === "string" ? `"${value}"` : `a ${typeof value}`;
}

function isBlank(value) {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

function readId(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return typeof value === "string" ? normaliseText(value) : "";
}

function checkId(rawId, corrections) {
  const id = readId(rawId);
  if (!id) {
    return reject(
      "missingField",
      isBlank(rawId) ? "No id" : `Id ${describeValue(rawId)} is unusable`,
    );
  }
  if (id !== rawId) {
    corrections.add("tidiedText");
  }
  return { value: id };
}

function checkDate(rawDate, { now, earliestDate }, corrections) {
  if (isBlank(rawDate)) {
    return reject("missingField", "No date");
  }
  const parsed = parseTimestampDetailed(rawDate);
  if (!parsed) {
    return reject("invalidDate", `Date ${describeValue(rawDate)} is not a real ISO date`);
  }
  if (parsed.date > now) {
    return reject("futureDate", `Date ${describeValue(rawDate)} is in the future`);
  }
  if (parsed.date < earliestDate) {
    return reject("implausibleDate", `Date ${describeValue(rawDate)} is before 2000`);
  }
  if (parsed.hadOffset) {
    corrections.add("convertedTimezone");
  }
  return { value: parsed.date };
}

function checkName(rawValue, field, matcher, unknownReason, corrections) {
  if (isBlank(rawValue)) {
    return reject("missingField", `No ${field}`);
  }
  const name = matcher.find(rawValue);
  if (!name) {
    return reject(unknownReason, `The ${field} ${describeValue(rawValue)} is not recognised`);
  }
  if (name !== rawValue) {
    corrections.add("tidiedText");
  }
  return { value: name };
}

function checkLatinName(rawLatinName, expectedLatinName, corrections) {
  const latinName = typeof rawLatinName === "string" ? normaliseText(rawLatinName) : "";
  if (!latinName) {
    corrections.add("filledLatinName");
  } else if (toMatchKey(latinName) !== toMatchKey(expectedLatinName)) {
    corrections.add("fixedLatinName");
  } else if (rawLatinName !== expectedLatinName) {
    corrections.add("tidiedText");
  }
  return expectedLatinName;
}

/**
 * Validates and normalises one raw Elanco record. Returns either
 * { sighting, corrections } or { rejection: { reason, detail } }.
 * Unambiguous problems are fixed (letter case, spacing, a missing Latin name);
 * anything that would need a guess rejects the record instead.
 */
function cleanRecord(raw, context) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return reject("notAnObject", `Got ${describeValue(raw)}`);
  }
  const corrections = new Set();

  const id = checkId(raw.id, corrections);
  if (id.rejection) {
    return id;
  }
  const date = checkDate(raw.date, context, corrections);
  if (date.rejection) {
    return date;
  }
  const { locationMatcher, speciesMatcher, latinNames } = context;
  const location = checkName(
    raw.location,
    "location",
    locationMatcher,
    "unknownLocation",
    corrections,
  );
  if (location.rejection) {
    return location;
  }
  const species = checkName(raw.species, "species", speciesMatcher, "unknownSpecies", corrections);
  if (species.rejection) {
    return species;
  }
  const latinName = checkLatinName(raw.latinName, latinNames.get(species.value), corrections);

  return {
    sighting: {
      id: id.value,
      date: date.value,
      location: location.value,
      species: species.value,
      latinName,
    },
    corrections,
  };
}

function sightingKey(sighting) {
  return `${formatTimestamp(sighting.date)}|${sighting.location}|${sighting.species}`;
}

function summariseCounts(descriptions, counts) {
  return Object.entries(descriptions).map(([code, description]) => ({
    code,
    description,
    count: counts.get(code) ?? 0,
  }));
}

function increment(counts, code) {
  counts.set(code, (counts.get(code) ?? 0) + 1);
}

function compareByDateThenId(first, second) {
  return first.date - second.date || first.id.localeCompare(second.id);
}

/**
 * Turns Elanco's raw records into trusted sightings plus a data-quality
 * report. Each record is normalised first and only then checked for
 * duplicates, so two copies that differ only in letter case are still caught.
 * Only kept records count as "seen": if the first copy of an id is invalid,
 * a later valid copy is kept.
 */
function cleanSightings(rawRecords, options = {}) {
  if (!Array.isArray(rawRecords)) {
    throw new TypeError("cleanSightings expects an array of records");
  }
  const {
    locationNames = LOCATION_NAMES,
    species = SPECIES,
    now = ukNow(),
    earliestDate = EARLIEST_PLAUSIBLE_DATE,
  } = options;
  const context = {
    locationMatcher: createNameMatcher(locationNames),
    speciesMatcher: createNameMatcher(species.map((entry) => entry.name)),
    latinNames: new Map(species.map((entry) => [entry.name, entry.latinName])),
    now,
    earliestDate,
  };

  const sightings = [];
  const keptIds = new Set();
  const keptIdsBySightingKey = new Map();
  const removalCounts = new Map();
  const correctionCounts = new Map();
  const examples = [];
  let correctedRecords = 0;

  function recordRemoval(index, raw, reason, detail) {
    increment(removalCounts, reason);
    if (examples.length < MAX_EXAMPLES) {
      const id = raw && typeof raw === "object" ? readId(raw.id) || null : null;
      examples.push({ index, id, reason, detail });
    }
  }

  rawRecords.forEach((raw, index) => {
    const result = cleanRecord(raw, context);
    if (result.rejection) {
      recordRemoval(index, raw, result.rejection.reason, result.rejection.detail);
      return;
    }
    const { sighting, corrections } = result;
    if (keptIds.has(sighting.id)) {
      recordRemoval(index, raw, "duplicateId", `The id "${sighting.id}" was already kept`);
      return;
    }
    const key = sightingKey(sighting);
    if (keptIdsBySightingKey.has(key)) {
      const originalId = keptIdsBySightingKey.get(key);
      recordRemoval(index, raw, "duplicateSighting", `Repeats the sighting "${originalId}"`);
      return;
    }
    keptIds.add(sighting.id);
    keptIdsBySightingKey.set(key, sighting.id);
    sightings.push(sighting);
    if (corrections.size > 0) {
      correctedRecords += 1;
      corrections.forEach((type) => increment(correctionCounts, type));
    }
  });

  sightings.sort(compareByDateThenId);

  return {
    sightings,
    report: {
      received: rawRecords.length,
      kept: sightings.length,
      removed: rawRecords.length - sightings.length,
      corrected: correctedRecords,
      removedByReason: summariseCounts(REMOVAL_REASONS, removalCounts),
      correctionsByType: summariseCounts(CORRECTION_TYPES, correctionCounts),
      examples,
    },
  };
}

module.exports = { cleanSightings };
