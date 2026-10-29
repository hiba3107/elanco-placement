const { endOfDay, formatDay, parseDay } = require("../lib/dates");
const { createNameMatcher } = require("../lib/textMatch");
const { LOCATION_NAMES } = require("../reference/locations");
const { SPECIES_NAMES } = require("../reference/species");
const { SEVERITY_BANDS } = require("./severity");

const FILTER_KEYS = ["from", "to", "location", "species", "severity"];

const matchers = {
  location: createNameMatcher(LOCATION_NAMES),
  species: createNameMatcher(SPECIES_NAMES),
  severity: createNameMatcher(SEVERITY_BANDS),
};

// A query value arrives as a string, as a list when the key is repeated
// (?species=a&species=b), or as one comma-separated string (?species=a,b).
function toList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDayParam(query, key, errors) {
  const raw = query[key];
  if (raw === undefined || raw === "") {
    return null;
  }
  if (typeof raw !== "string") {
    errors.push({ field: key, message: `Give "${key}" only once.` });
    return null;
  }
  const day = parseDay(raw);
  if (!day) {
    errors.push({
      field: key,
      message: `"${raw}" is not a valid date. Use YYYY-MM-DD, for example 2024-03-01.`,
    });
  }
  return day;
}

function unknownNameError(key, value, matcher) {
  const suggestion = matcher.suggest(value);
  if (suggestion) {
    return {
      field: key,
      message: `Unknown ${key} "${value}". Did you mean "${suggestion}"?`,
      suggestion,
    };
  }
  return {
    field: key,
    message: `Unknown ${key} "${value}". Choose from: ${matcher.names.join(", ")}.`,
  };
}

function parseNameList(query, key, errors) {
  const matcher = matchers[key];
  const names = [];
  for (const value of toList(query[key])) {
    const name = matcher.find(value);
    if (!name) {
      errors.push(unknownNameError(key, value, matcher));
    } else if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names.length > 0 ? names : null;
}

/**
 * Reads the filters shared by every sightings endpoint:
 *   from, to   dates as YYYY-MM-DD; both ends are included
 *   location   one or more city names
 *   species    one or more species names
 *   severity   one or more of high, medium, low
 * Names are matched ignoring case and spacing. An unknown name is reported as
 * an error, never silently ignored: Elanco's own API answers a mistyped city
 * with an empty list, which looks exactly like "no sightings".
 */
function parseSightingFilters(query) {
  const errors = [];
  const from = parseDayParam(query, "from", errors);
  const lastDay = parseDayParam(query, "to", errors);
  if (from && lastDay && from > lastDay) {
    errors.push({
      field: "to",
      message: `"to" (${formatDay(lastDay)}) must be on or after "from" (${formatDay(from)}).`,
    });
  }
  return {
    value: {
      from,
      to: lastDay ? endOfDay(lastDay) : null,
      locations: parseNameList(query, "location", errors),
      species: parseNameList(query, "species", errors),
      severities: parseNameList(query, "severity", errors),
    },
    errors,
  };
}

function matchesFilters(sighting, { from, to, locations, species }) {
  return (
    (!from || sighting.date >= from) &&
    (!to || sighting.date <= to) &&
    (!locations || locations.includes(sighting.location)) &&
    (!species || species.includes(sighting.species))
  );
}

function filterSightings(sightings, filters) {
  return sightings.filter((sighting) => matchesFilters(sighting, filters));
}

// Echoes the filters back in canonical form, so a client can see that
// "london" was understood as "London".
function describeFilters({ from, to, locations, species, severities }) {
  return {
    from: from ? formatDay(from) : null,
    to: to ? formatDay(to) : null,
    location: locations ?? [],
    species: species ?? [],
    severity: severities ?? [],
  };
}

module.exports = { FILTER_KEYS, describeFilters, filterSightings, parseSightingFilters };
