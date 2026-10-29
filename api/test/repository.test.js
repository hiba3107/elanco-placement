const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { formatTimestamp, makeWallClock } = require("../src/lib/dates");
const { checkPhoto } = require("../src/reports/image");
const { createReportRepository } = require("../src/reports/repository");
const { createPng } = require("./support/images");
const { createTestLogger } = require("./support/logger");

const SUBMITTED_AT = new Date("2026-10-29T14:05:00Z");

let directory;
let filePath;
let uploadsDir;

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "tick-reports-"));
  filePath = path.join(directory, "reports.json");
  uploadsDir = path.join(directory, "uploads");
});

afterEach(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

function details(overrides = {}) {
  return {
    date: makeWallClock(2026, 10, 28, 9, 15),
    location: "Leeds",
    species: "Marsh tick",
    latinName: "Ixodes apronophorus",
    notes: "",
    ...overrides,
  };
}

async function openRepository() {
  const { logger, messages } = createTestLogger();
  const repository = await createReportRepository({
    filePath,
    uploadsDir,
    logger,
    now: () => SUBMITTED_AT,
  });
  return { repository, messages };
}

async function readStoredFile() {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

describe("report repository", () => {
  it("starts empty when there is no file yet, and creates the uploads folder", async () => {
    const { repository } = await openRepository();

    assert.deepEqual(repository.list(), []);
    assert.ok((await fs.stat(uploadsDir)).isDirectory());
  });

  it("saves a report with an id, a timestamp and an unverified status", async () => {
    const { repository } = await openRepository();
    const report = await repository.add(details(), null);

    assert.match(report.id, /^[0-9a-f-]{36}$/);
    assert.equal(report.status, "unverified");
    assert.equal(report.submittedAt, "2026-10-29T14:05:00.000Z");
    assert.equal(report.photo, null);
    assert.deepEqual(repository.list(), [report]);

    const stored = await readStoredFile();
    assert.equal(stored.reports.length, 1);
    assert.equal(stored.reports[0].date, "2026-10-28T09:15:00");
  });

  it("stores the photo under the report's id, never the uploaded file name", async () => {
    const { repository } = await openRepository();
    const png = createPng(3, 3);
    const report = await repository.add(details(), checkPhoto({ buffer: png }).photo);

    assert.equal(report.photo.fileName, `${report.id}.png`);
    assert.deepEqual(report.photo, {
      fileName: `${report.id}.png`,
      type: "image/png",
      bytes: png.length,
      width: 3,
      height: 3,
    });
    assert.deepEqual(await fs.readFile(path.join(uploadsDir, report.photo.fileName)), png);
  });

  it("loads saved reports again after a restart", async () => {
    const first = await openRepository();
    const saved = await first.repository.add(details({ notes: "Second walk" }), null);

    const second = await openRepository();
    const [loaded] = second.repository.list();

    assert.equal(loaded.id, saved.id);
    assert.equal(formatTimestamp(loaded.date), "2026-10-28T09:15:00");
    assert.equal(loaded.notes, "Second walk");
    assert.equal(second.repository.find(saved.id).id, saved.id);
  });

  it("keeps every report when several arrive at once", async () => {
    const { repository } = await openRepository();
    await Promise.all(
      ["Leeds", "London", "Glasgow", "Cardiff", "Bristol"].map((location) =>
        repository.add(details({ location }), null),
      ),
    );

    assert.equal(repository.list().length, 5);
    assert.equal((await readStoredFile()).reports.length, 5);
  });

  it("keeps a corrupt file aside and starts afresh instead of overwriting it", async () => {
    await fs.writeFile(filePath, '{"reports": [ {"id": ');
    const { repository, messages } = await openRepository();

    assert.deepEqual(repository.list(), []);
    const files = await fs.readdir(directory);
    assert.ok(files.some((name) => name.startsWith("reports.json.corrupt-")));
    assert.ok(messages.some((entry) => entry.level === "error"));
  });

  it("treats a file with the wrong shape as corrupt", async () => {
    await fs.writeFile(filePath, "[]");
    const { repository } = await openRepository();
    assert.deepEqual(repository.list(), []);
  });

  it("skips unreadable entries but keeps the good ones", async () => {
    const good = { id: "a", date: "2026-10-01T10:00:00", location: "Leeds", species: "Marsh tick" };
    await fs.writeFile(
      filePath,
      JSON.stringify({ reports: [good, { id: "b", date: "soon" }, null] }),
    );
    const { repository, messages } = await openRepository();

    assert.deepEqual(
      repository.list().map((report) => report.id),
      ["a"],
    );
    assert.ok(messages.some((entry) => /Skipped 2 unreadable entries/.test(entry.message)));
  });

  it("removes the photo again and keeps the list unchanged if saving fails", async () => {
    const { repository } = await openRepository();
    await fs.mkdir(path.join(filePath, "blocked"), { recursive: true });

    await assert.rejects(repository.add(details(), checkPhoto({ buffer: createPng() }).photo));
    assert.deepEqual(repository.list(), []);
    assert.deepEqual(await fs.readdir(uploadsDir), []);

    await fs.rm(filePath, { recursive: true });
    await repository.add(details(), null);
    assert.equal(repository.list().length, 1);
  });
});
