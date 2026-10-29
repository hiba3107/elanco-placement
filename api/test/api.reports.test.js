const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const { addDays, formatDay, ukNow } = require("../src/lib/dates");
const { createPng } = require("./support/images");
const { startTestApp } = require("./support/testApp");

const YESTERDAY = formatDay(addDays(ukNow(), -1));

function reportForm(overrides = {}, photo) {
  const form = new FormData();
  const fields = {
    date: YESTERDAY,
    time: "09:15",
    location: "Leeds",
    species: "Marsh tick",
    notes: "Found on my dog after a walk",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  if (photo) {
    form.set("photo", new Blob([photo.buffer], { type: photo.type }), photo.name);
  }
  return form;
}

async function postReport(app, form) {
  const response = await app.post("/api/reports", { body: form });
  return { response, body: await response.json() };
}

async function uploadedFiles(app) {
  return fs.readdir(path.join(app.directory, "uploads"));
}

describe("POST /api/reports", () => {
  let app;
  before(async () => {
    app = await startTestApp();
  });
  after(() => app.close());

  it("saves a valid report and returns it with 201 Created", async () => {
    const { response, body } = await postReport(app, reportForm());

    const { id, submittedAt, ...details } = body.data;
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("location"), `/api/reports/${id}`);
    assert.match(id, /^[0-9a-f-]{36}$/);
    assert.match(submittedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.deepEqual(body.warnings, []);
    assert.deepEqual(details, {
      date: `${YESTERDAY}T09:15:00`,
      location: "Leeds",
      species: "Marsh tick",
      latinName: "Ixodes apronophorus",
      notes: "Found on my dog after a walk",
      photoUrl: null,
      status: "unverified",
    });
  });

  it("stores a photo and serves it back with safe, long-lived caching", async () => {
    const png = createPng(4, 4);
    const { response, body } = await postReport(
      app,
      reportForm({ location: "Cardiff" }, { buffer: png, type: "image/png", name: "tick.png" }),
    );
    assert.equal(response.status, 201);
    assert.match(body.data.photoUrl, /^\/api\/uploads\/[0-9a-f-]{36}\.png$/);

    const photo = await app.get(body.data.photoUrl);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get("content-type"), "image/png");
    assert.match(photo.headers.get("cache-control"), /immutable/);
    assert.equal(photo.headers.get("content-security-policy"), "default-src 'none'");
    assert.deepEqual(Buffer.from(await photo.arrayBuffer()), png);
  });

  it("rejects a file that is not really an image, and stores nothing", async () => {
    const before = await uploadedFiles(app);
    const fake = { buffer: Buffer.from("not an image"), type: "image/png", name: "tick.png" };
    const { response, body } = await postReport(app, reportForm({ location: "Bristol" }, fake));

    assert.equal(response.status, 422);
    assert.deepEqual(body.error.details, [
      { field: "photo", message: "The photo must be a JPEG or PNG image." },
    ]);
    assert.deepEqual(await uploadedFiles(app), before);
    assert.ok(app.reports.list().every((report) => report.location !== "Bristol"));
  });

  it("rejects a photo over 5 MB", async () => {
    const huge = Buffer.concat([createPng(), Buffer.alloc(5 * 1024 * 1024)]);
    const { response, body } = await postReport(
      app,
      reportForm({}, { buffer: huge, type: "image/png", name: "big.png" }),
    );

    assert.equal(response.status, 422);
    assert.deepEqual(body.error.details, [
      { field: "photo", message: "The photo must be 5 MB or smaller." },
    ]);
  });

  it("lists every problem with the form in one 422 response", async () => {
    const { response, body } = await postReport(
      app,
      reportForm({ date: "", time: "25:00", location: "Atlantis", species: "" }),
    );

    assert.equal(response.status, 422);
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.equal(body.error.message, "Please correct the highlighted fields.");
    assert.deepEqual(
      body.error.details.map((detail) => detail.field),
      ["date", "time", "location", "species"],
    );
  });

  it("warns about a likely repeat but still saves it", async () => {
    await postReport(app, reportForm({ location: "Glasgow", species: "Tree-hole tick" }));
    const { response, body } = await postReport(
      app,
      reportForm({ location: "Glasgow", species: "Tree-hole tick", time: "17:40" }),
    );

    assert.equal(response.status, 201);
    assert.deepEqual(
      body.warnings.map((warning) => warning.code),
      ["possibleDuplicate"],
    );
  });

  it("warns about an old sighting but still saves it", async () => {
    const { response, body } = await postReport(app, reportForm({ date: "2021-05-01" }));

    assert.equal(response.status, 201);
    assert.equal(body.warnings[0].code, "oldSighting");
  });

  it("keeps notes as plain text, exactly as written", async () => {
    const notes = '<script>alert("hi")</script> & <b>bold</b>';
    const { body } = await postReport(app, reportForm({ location: "London", notes }));
    assert.equal(body.data.notes, notes);
  });

  it("answers 415 for a body that is not a form", async () => {
    const response = await app.post("/api/reports", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location: "Leeds" }),
    });
    const body = await response.json();

    assert.equal(response.status, 415);
    assert.equal(body.error.code, "UNSUPPORTED_MEDIA_TYPE");
  });

  it("answers 400 for a form that is cut off half-way", async () => {
    const response = await app.post("/api/reports", {
      headers: { "Content-Type": "multipart/form-data; boundary=tick" },
      body: '--tick\r\nContent-Disposition: form-data; name="date"\r\n\r\n2026-10-28',
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "BAD_REQUEST");
  });
});

describe("GET /api/reports", () => {
  let app;
  before(async () => {
    app = await startTestApp();
    await postReport(app, reportForm({ location: "Leeds", time: "08:00" }));
    await postReport(app, reportForm({ location: "London", time: "10:00" }));
    await postReport(app, reportForm({ location: "Leeds", date: "2024-03-01" }));
  });
  after(() => app.close());

  it("lists reports, most recent sighting first", async () => {
    const body = await (await app.get("/api/reports")).json();

    assert.equal(body.pagination.total, 3);
    assert.deepEqual(
      body.data.map((report) => report.location),
      ["London", "Leeds", "Leeds"],
    );
  });

  it("filters by location ignoring case, and by date", async () => {
    const leeds = await (await app.get("/api/reports?location=leeds")).json();
    const recent = await (await app.get("/api/reports?from=2025-01-01")).json();

    assert.equal(leeds.pagination.total, 2);
    assert.deepEqual(leeds.filters, { from: null, to: null, location: ["Leeds"], species: [] });
    assert.equal(recent.pagination.total, 2);
  });

  it("rejects the severity filter, which reports do not have", async () => {
    const response = await app.get("/api/reports?severity=high");
    assert.equal(response.status, 422);
  });

  it("returns one report by id, or 404", async () => {
    const [first] = (await (await app.get("/api/reports")).json()).data;

    assert.equal((await app.get(`/api/reports/${first.id}`)).status, 200);
    assert.equal((await app.get("/api/reports/nope")).status, 404);
  });

  it("answers 404 for a photo that does not exist", async () => {
    const response = await app.get("/api/uploads/missing.jpg");
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.message, "That photo does not exist.");
  });
});

describe("reports when things go wrong elsewhere", () => {
  it("still accepts reports while Elanco is unreachable", async () => {
    const app = await startTestApp({ dataStatus: "unavailable" });
    const { response } = await postReport(app, reportForm());
    await app.close();

    assert.equal(response.status, 201);
  });

  it("limits how many reports one client can send", async () => {
    const app = await startTestApp({ reportRateLimit: { limit: 2, windowMs: 60_000 } });
    await postReport(app, reportForm({ time: "07:00" }));
    await postReport(app, reportForm({ time: "07:30" }));
    const { response, body } = await postReport(app, reportForm({ time: "08:00" }));
    await app.close();

    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
    assert.equal(body.error.code, "RATE_LIMITED");
  });
});
