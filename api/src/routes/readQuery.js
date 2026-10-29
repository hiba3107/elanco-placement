const { FILTER_KEYS, parseSightingFilters } = require("../analysis/filters");
const { parsePagination, parseSort } = require("../analysis/pagination");
const { validationError } = require("../errors");

const QUERY_PARSERS = Object.freeze({
  filters: { keys: FILTER_KEYS, parse: parseSightingFilters },
  pagination: { keys: ["page", "pageSize"], parse: parsePagination },
  sort: { keys: ["sort"], parse: parseSort },
});

function findUnknownKeys(query, allowedKeys) {
  return Object.keys(query)
    .filter((key) => !allowedKeys.includes(key))
    .map((key) => ({
      field: key,
      message: `"${key}" is not an option here. Options are: ${allowedKeys.join(", ")}.`,
    }));
}

/**
 * Validates a query string with the named parsers and returns their values by
 * name, for example readQuery(request.query, ["filters", "pagination"]).
 * Every problem is collected before failing, so one 422 response lists them
 * all. Options the endpoint does not know are errors too: a typo such as
 * "spieces" would otherwise be ignored and quietly return unfiltered data.
 */
function readQuery(query, parserNames) {
  const parsers = parserNames.map((name) => [name, QUERY_PARSERS[name]]);
  const allowedKeys = parsers.flatMap(([, parser]) => parser.keys);
  const errors = findUnknownKeys(query, allowedKeys);
  const values = {};
  for (const [name, parser] of parsers) {
    const result = parser.parse(query);
    values[name] = result.value;
    errors.push(...result.errors);
  }
  if (errors.length > 0) {
    throw validationError(errors, "Some of the options in this request are not valid.");
  }
  return values;
}

module.exports = { readQuery };
