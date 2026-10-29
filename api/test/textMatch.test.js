const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { createNameMatcher, editDistance, normaliseText } = require("../src/lib/textMatch");

const species = createNameMatcher(["Fox/badger tick", "Marsh tick", "Tree-hole tick"]);
const cities = createNameMatcher(["London", "Leeds", "Newcastle"]);

describe("normaliseText", () => {
  it("trims, collapses spaces and removes invisible characters", () => {
    assert.equal(normaliseText("  Marsh \t  tick\u200B "), "Marsh tick");
    assert.equal(normaliseText("Marsh\u00A0tick"), "Marsh tick");
  });

  it("turns look-alike characters into their plain versions", () => {
    assert.equal(normaliseText("Fox\uFF0Fbadger tick"), "Fox/badger tick");
  });
});

describe("createNameMatcher", () => {
  it("finds the canonical name whatever the letter case or spacing", () => {
    assert.equal(cities.find("london"), "London");
    assert.equal(cities.find("  LONDON "), "London");
    assert.equal(species.find("fox/BADGER   tick"), "Fox/badger tick");
  });

  it("returns null instead of guessing", () => {
    assert.equal(cities.find("Londn"), null);
    assert.equal(cities.find(""), null);
    assert.equal(cities.find(42), null);
    assert.equal(cities.find(undefined), null);
  });

  it("suggests the closest name for a likely typo", () => {
    assert.equal(cities.suggest("Londn"), "London");
    assert.equal(cities.suggest("newcastel"), "Newcastle");
    assert.equal(species.suggest("Fox badger tick"), "Fox/badger tick");
    assert.equal(species.suggest("mash tick"), "Marsh tick");
  });

  it("makes no suggestion when nothing is close", () => {
    assert.equal(cities.suggest("Atlantis"), null);
    assert.equal(cities.suggest(""), null);
    assert.equal(cities.suggest(null), null);
  });
});

describe("editDistance", () => {
  it("counts the single-character edits between two words", () => {
    assert.equal(editDistance("kitten", "sitting"), 3);
    assert.equal(editDistance("leeds", "leeds"), 0);
    assert.equal(editDistance("", "abc"), 3);
  });
});
