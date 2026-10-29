const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { paginate, parsePagination, parseSort } = require("../src/analysis/pagination");

describe("parsePagination", () => {
  it("defaults to the first page of 20", () => {
    assert.deepEqual(parsePagination({}), { value: { page: 1, pageSize: 20 }, errors: [] });
  });

  it("reads the page and page size", () => {
    assert.deepEqual(parsePagination({ page: "3", pageSize: "50" }).value, {
      page: 3,
      pageSize: 50,
    });
  });

  it("rejects pages and sizes that are not sensible whole numbers", () => {
    for (const query of [{ page: "0" }, { page: "-1" }, { page: "two" }, { page: "1.5" }]) {
      assert.equal(parsePagination(query).errors[0].field, "page", JSON.stringify(query));
    }
    assert.deepEqual(parsePagination({ pageSize: "101" }).errors, [
      { field: "pageSize", message: '"pageSize" must be a whole number between 1 and 100.' },
    ]);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 45 }, (_, index) => index + 1);

  it("returns the requested slice and the totals", () => {
    const page = paginate(items, { page: 3, pageSize: 20 });
    assert.deepEqual(page.items, [41, 42, 43, 44, 45]);
    assert.deepEqual(page.pagination, { page: 3, pageSize: 20, total: 45, totalPages: 3 });
  });

  it("returns an empty page past the end rather than failing", () => {
    assert.deepEqual(paginate(items, { page: 9, pageSize: 20 }).items, []);
  });

  it("reports zero pages for an empty list", () => {
    assert.deepEqual(paginate([], { page: 1, pageSize: 20 }).pagination.totalPages, 0);
  });
});

describe("parseSort", () => {
  it("defaults to newest first and accepts oldest", () => {
    assert.equal(parseSort({}).value, "newest");
    assert.equal(parseSort({ sort: "OLDEST" }).value, "oldest");
  });

  it("rejects other orders", () => {
    assert.equal(parseSort({ sort: "random" }).errors[0].field, "sort");
  });
});
