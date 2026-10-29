const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { readJsonFile, setAsideCorruptFile, writeJsonFileAtomic } = require("../src/lib/jsonFile");

let directory;

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "tick-json-"));
});

afterEach(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

describe("readJsonFile", () => {
  it("reports a missing file without throwing", async () => {
    assert.deepEqual(await readJsonFile(path.join(directory, "nope.json")), { status: "missing" });
  });

  it("returns the parsed data", async () => {
    const filePath = path.join(directory, "data.json");
    await fs.writeFile(filePath, '{"reports":[1,2]}');
    assert.deepEqual(await readJsonFile(filePath), { status: "ok", data: { reports: [1, 2] } });
  });

  it("reports a corrupt file instead of crashing", async () => {
    const filePath = path.join(directory, "data.json");
    await fs.writeFile(filePath, '{"reports": [1, 2');
    const result = await readJsonFile(filePath);
    assert.equal(result.status, "corrupt");
    assert.ok(result.error instanceof SyntaxError);
  });
});

describe("writeJsonFileAtomic", () => {
  it("creates missing folders and leaves no temporary files behind", async () => {
    const filePath = path.join(directory, "nested", "deeper", "data.json");
    await writeJsonFileAtomic(filePath, { ok: true });

    assert.equal(await fs.readFile(filePath, "utf8"), '{\n  "ok": true\n}\n');
    assert.deepEqual(await fs.readdir(path.dirname(filePath)), ["data.json"]);
  });

  it("replaces the previous contents completely", async () => {
    const filePath = path.join(directory, "data.json");
    await writeJsonFileAtomic(filePath, { items: [1, 2, 3, 4, 5] });
    await writeJsonFileAtomic(filePath, { items: [] });

    assert.deepEqual(JSON.parse(await fs.readFile(filePath, "utf8")), { items: [] });
  });
});

describe("setAsideCorruptFile", () => {
  it("keeps the unreadable file under a new name", async () => {
    const filePath = path.join(directory, "reports.json");
    await fs.writeFile(filePath, "garbage");

    const keptAt = await setAsideCorruptFile(filePath);

    assert.match(path.basename(keptAt), /^reports\.json\.corrupt-\d+$/);
    assert.equal(await fs.readFile(keptAt, "utf8"), "garbage");
    await assert.rejects(fs.access(filePath));
  });
});
