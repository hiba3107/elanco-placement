const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { setTimeout: wait } = require("node:timers/promises");

const LOCKED_FILE_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);

async function readJsonFile(filePath) {
  let text;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return { status: "missing" };
    }
    throw error;
  }
  try {
    return { status: "ok", data: JSON.parse(text) };
  } catch (error) {
    return { status: "corrupt", error };
  }
}

// On Windows, antivirus scanners and sync tools such as OneDrive can lock a
// file for a moment, which makes a rename fail. A short retry gets past it.
async function renameWithRetry(fromPath, toPath, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await fs.rename(fromPath, toPath);
      return;
    } catch (error) {
      if (attempt >= attempts || !LOCKED_FILE_ERRORS.has(error.code)) {
        throw error;
      }
      await wait(50 * attempt);
    }
  }
}

/**
 * Writes JSON so that a crash mid-write can never leave a half-written file:
 * the data goes to a temporary file, is flushed to disk, and only then
 * replaces the real file in a single rename.
 */
async function writeJsonFileAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  const handle = await fs.open(tempPath, "w");
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await renameWithRetry(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

// Keeps an unreadable file for manual recovery instead of overwriting it.
async function setAsideCorruptFile(filePath) {
  const corruptPath = `${filePath}.corrupt-${Date.now()}`;
  await renameWithRetry(filePath, corruptPath);
  return corruptPath;
}

module.exports = { readJsonFile, setAsideCorruptFile, writeJsonFileAtomic };
