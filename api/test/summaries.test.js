const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const sampleRecords = require("./fixtures/sample-sightings.json");
const { selectSightings } = require("../src/analysis/selection");
const {
  summariseLocations,
  summariseRegions,
  summariseSpecies,
} = require("../src/analysis/summaries");
const { countBy, groupBy, mostCommon } = require("../src/lib/collections");
const { formatTimestamp } = require("../src/lib/dates");
const { cleanSightings } = require("../src/sightings/clean");

const { sightings } = cleanSightings(sampleRecords);
const dateRange = { earliest: sightings[0].date, latest: sightings[sightings.length - 1].date };
const selection = selectSightings(sightings, {}, dateRange);
const locationSummaries = summariseLocations(selection.sightings, selection);

function summaryFor(location) {
  return locationSummaries.find((summary) => summary.location === location);
}

describe("summariseLocations", () => {
  it("summarises only the cities that have sightings, most severe first", () => {
    assert.deepEqual(
      locationSummaries.map((summary) => summary.location),
      ["London", "Leeds", "Glasgow", "Cardiff"],
    );
  });

  it("adds the coordinates and region from the reference data", () => {
    const leeds = summaryFor("Leeds");
    assert.equal(leeds.lat, 53.8008);
    assert.equal(leeds.lng, -1.5491);
    assert.equal(leeds.region, "Yorkshire and the Humber");
    assert.equal(leeds.nation, "England");
  });

  it("counts sightings per city", () => {
    assert.equal(summaryFor("London").total, 8);
    assert.equal(summaryFor("Cardiff").total, 4);
    const sum = locationSummaries.reduce((total, summary) => total + summary.total, 0);
    assert.equal(sum, 24);
  });

  it("breaks each city down by every species, including those not seen there", () => {
    assert.deepEqual(summaryFor("Glasgow").species, [
      { name: "Fox/badger tick", count: 1 },
      { name: "Marsh tick", count: 1 },
      { name: "Passerine tick", count: 2 },
      { name: "Southern rodent tick", count: 0 },
      { name: "Tree-hole tick", count: 2 },
    ]);
  });

  it("names the most-seen species and keeps ties", () => {
    assert.deepEqual(summaryFor("London").mostSeenSpecies, { names: ["Marsh tick"], count: 3 });
    assert.deepEqual(summaryFor("Glasgow").mostSeenSpecies, {
      names: ["Passerine tick", "Tree-hole tick"],
      count: 2,
    });
  });

  it("finds each city's latest sighting", () => {
    assert.equal(formatTimestamp(summaryFor("Leeds").latestSighting), "2024-12-28T08:00:00");
    assert.equal(formatTimestamp(summaryFor("Cardiff").latestSighting), "2023-08-08T08:08:00");
  });

  it("counts recent activity in the 30 days up to the reference date", () => {
    assert.equal(summaryFor("Glasgow").recentCount, 1);
    assert.equal(summaryFor("London").recentCount, 1);
    assert.equal(summaryFor("Cardiff").recentCount, 0);
  });

  it("carries each city's severity rating through", () => {
    const london = summaryFor("London");
    assert.equal(london.severity.band, "high");
    assert.ok(Math.abs(london.severity.score - 4.1872) < 0.0001);
  });
});

describe("summariseRegions", () => {
  it("adds up cities by region, largest first and alphabetical on ties", () => {
    assert.deepEqual(summariseRegions(locationSummaries), [
      { region: "London", nation: "England", total: 8, locations: ["London"] },
      { region: "Scotland", nation: "Scotland", total: 6, locations: ["Glasgow"] },
      {
        region: "Yorkshire and the Humber",
        nation: "England",
        total: 6,
        locations: ["Leeds"],
      },
      { region: "Wales", nation: "Wales", total: 4, locations: ["Cardiff"] },
    ]);
  });

  it("combines cities that share a region", () => {
    const summaries = [
      { location: "Leeds", region: "Yorkshire and the Humber", nation: "England", total: 5 },
      { location: "Sheffield", region: "Yorkshire and the Humber", nation: "England", total: 7 },
      { location: "Glasgow", region: "Scotland", nation: "Scotland", total: 9 },
    ];
    assert.deepEqual(summariseRegions(summaries), [
      {
        region: "Yorkshire and the Humber",
        nation: "England",
        total: 12,
        locations: ["Leeds", "Sheffield"],
      },
      { region: "Scotland", nation: "Scotland", total: 9, locations: ["Glasgow"] },
    ]);
  });
});

describe("summariseSpecies", () => {
  const species = summariseSpecies(selection.sightings);

  function speciesSummary(name) {
    return species.find((entry) => entry.name === name);
  }

  it("lists all five species in a fixed order", () => {
    assert.deepEqual(
      species.map((entry) => entry.name),
      ["Fox/badger tick", "Marsh tick", "Passerine tick", "Southern rodent tick", "Tree-hole tick"],
    );
  });

  it("counts each species and its share of all sightings", () => {
    assert.equal(speciesSummary("Marsh tick").count, 6);
    assert.equal(speciesSummary("Marsh tick").share, 0.25);
    const totalShare = species.reduce((sum, entry) => sum + entry.share, 0);
    assert.ok(Math.abs(totalShare - 1) < 1e-9);
  });

  it("says where each species is seen most, keeping ties", () => {
    assert.deepEqual(speciesSummary("Tree-hole tick").mostSeenIn, {
      names: ["Glasgow"],
      count: 2,
    });
    assert.deepEqual(speciesSummary("Southern rodent tick").mostSeenIn, {
      names: ["Cardiff", "Leeds", "London"],
      count: 1,
    });
  });

  it("still lists a species with no sightings", () => {
    const cardiffOnly = sightings.filter((sighting) => sighting.location === "Cardiff");
    const treeHole = summariseSpecies(cardiffOnly).find((entry) => entry.name === "Tree-hole tick");
    assert.deepEqual(treeHole, {
      name: "Tree-hole tick",
      latinName: "Ixodes arboricola",
      count: 0,
      share: 0,
      mostSeenIn: { names: [], count: 0 },
      latestSighting: null,
    });
  });

  it("copes with no sightings at all", () => {
    assert.ok(summariseSpecies([]).every((entry) => entry.count === 0 && entry.share === 0));
  });
});

describe("collection helpers", () => {
  it("groups and counts by a key", () => {
    const words = ["tick", "mite", "flea", "tock"];
    assert.deepEqual(
      [...groupBy(words, (word) => word[0])],
      [
        ["t", ["tick", "tock"]],
        ["m", ["mite"]],
        ["f", ["flea"]],
      ],
    );
    assert.deepEqual([...countBy(words, (word) => word.length)], [[4, 4]]);
  });

  it("returns every name tied for the highest count", () => {
    const counts = new Map([
      ["b", 2],
      ["a", 2],
      ["c", 1],
    ]);
    assert.deepEqual(mostCommon(counts), { names: ["a", "b"], count: 2 });
    assert.deepEqual(mostCommon(new Map()), { names: [], count: 0 });
  });
});
