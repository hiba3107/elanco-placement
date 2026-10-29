const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseWholeNumber(query, key, { min, max, fallback }, errors) {
  const raw = query[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const value = typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!Number.isInteger(value) || value < min || value > max) {
    const range = max === Infinity ? `${min} or more` : `between ${min} and ${max}`;
    errors.push({ field: key, message: `"${key}" must be a whole number ${range}.` });
    return fallback;
  }
  return value;
}

// Capping the page size means no single request can ask for the whole
// dataset at once, however large it grows.
function parsePagination(query) {
  const errors = [];
  const page = parseWholeNumber(query, "page", { min: 1, max: Infinity, fallback: 1 }, errors);
  const pageSize = parseWholeNumber(
    query,
    "pageSize",
    { min: 1, max: MAX_PAGE_SIZE, fallback: DEFAULT_PAGE_SIZE },
    errors,
  );
  return { value: { page, pageSize }, errors };
}

function paginate(items, { page, pageSize }) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    },
  };
}

const SORT_ORDERS = ["newest", "oldest"];

function parseSort(query) {
  const raw = query.sort;
  if (raw === undefined || raw === "") {
    return { value: "newest", errors: [] };
  }
  const sort = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!SORT_ORDERS.includes(sort)) {
    return {
      value: null,
      errors: [{ field: "sort", message: 'Choose a sort order of "newest" or "oldest".' }],
    };
  }
  return { value: sort, errors: [] };
}

module.exports = { paginate, parsePagination, parseSort };
