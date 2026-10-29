const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const { readJsonFile, setAsideCorruptFile, writeJsonFileAtomic } = require("../lib/jsonFile");
const { fromStoredReport, toStoredReport } = require("./serialise");

async function loadReports(filePath, logger) {
  const file = await readJsonFile(filePath);
  if (file.status === "missing") {
    return [];
  }
  if (file.status === "corrupt" || !Array.isArray(file.data?.reports)) {
    const keptAt = await setAsideCorruptFile(filePath);
    logger.error(
      `The reports file was unreadable, so it was kept at ${keptAt} and a new one started`,
    );
    return [];
  }
  const reports = file.data.reports.map(fromStoredReport).filter(Boolean);
  const skipped = file.data.reports.length - reports.length;
  if (skipped > 0) {
    logger.warn(`Skipped ${skipped} unreadable entries in the reports file`);
  }
  return reports;
}

/**
 * Stores user-submitted reports in a JSON file, with their photos in a
 * folder beside it. Reports are kept in memory for reading and written to
 * disk on every change.
 *
 * Writes go through a queue, one at a time, so two reports arriving together
 * cannot overwrite each other. Each write is atomic, so a crash never leaves
 * a half-written file. If saving fails, the photo is deleted again, so no
 * orphaned files pile up.
 */
async function createReportRepository({ filePath, uploadsDir, logger, now = () => new Date() }) {
  await fs.mkdir(uploadsDir, { recursive: true });
  let reports = await loadReports(filePath, logger);
  let writeQueue = Promise.resolve();

  async function save(details, photo) {
    const id = crypto.randomUUID();
    const report = {
      id,
      ...details,
      photo: photo
        ? {
            fileName: `${id}.${photo.extension}`,
            type: photo.type,
            bytes: photo.bytes,
            width: photo.width,
            height: photo.height,
          }
        : null,
      submittedAt: now().toISOString(),
      status: "unverified",
    };

    const photoPath = photo ? path.join(uploadsDir, report.photo.fileName) : null;
    if (photoPath) {
      await fs.writeFile(photoPath, photo.buffer, { flag: "wx" });
    }
    const updated = [...reports, report];
    try {
      await writeJsonFileAtomic(filePath, { reports: updated.map(toStoredReport) });
    } catch (error) {
      if (photoPath) {
        await fs.rm(photoPath, { force: true });
      }
      throw error;
    }
    reports = updated;
    return report;
  }

  function add(details, photo) {
    const result = writeQueue.then(() => save(details, photo));
    // A failed save rejects for its caller but must not block later saves.
    writeQueue = result.catch(() => {});
    return result;
  }

  return {
    uploadsDir,
    list: () => reports,
    find: (id) => reports.find((report) => report.id === id) ?? null,
    add,
  };
}

module.exports = { createReportRepository };
