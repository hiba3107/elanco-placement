const path = require("node:path");

const API_ROOT = path.resolve(__dirname, "..");
const LOG_LEVELS = ["error", "warn", "info", "debug", "silent"];

function readWholeNumber(env, name, fallback, { min = 0 } = {}) {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be a whole number of at least ${min}, got "${raw}"`);
  }
  return value;
}

function readLogLevel(env) {
  const level = (env.LOG_LEVEL || "info").toLowerCase();
  if (!LOG_LEVELS.includes(level)) {
    throw new Error(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}, got "${env.LOG_LEVEL}"`);
  }
  return level;
}

// Reads settings from environment variables once at startup and fails fast on
// bad values, so a typo in a deployment shows up immediately rather than as odd
// behaviour later.
function loadConfig(env = process.env) {
  return Object.freeze({
    port: readWholeNumber(env, "PORT", 3000),
    logLevel: readLogLevel(env),
    dataDir: path.resolve(env.DATA_DIR || path.join(API_ROOT, "data")),
    webDir: path.resolve(API_ROOT, "..", "web"),
    reports: Object.freeze({
      rateLimit: readWholeNumber(env, "REPORT_RATE_LIMIT", 10, { min: 1 }),
      rateWindowMinutes: readWholeNumber(env, "REPORT_RATE_WINDOW_MINUTES", 15, { min: 1 }),
    }),
    elanco: Object.freeze({
      url: env.ELANCO_API_URL || "https://dev-task.elancoapps.com/data/tick-sightings",
      timeoutMs: readWholeNumber(env, "ELANCO_TIMEOUT_MS", 10_000, { min: 1 }),
      maxAttempts: readWholeNumber(env, "ELANCO_MAX_ATTEMPTS", 5, { min: 1 }),
      refreshMinutes: readWholeNumber(env, "ELANCO_REFRESH_MINUTES", 360),
      recoveryMinutes: readWholeNumber(env, "ELANCO_RECOVERY_MINUTES", 2),
    }),
  });
}

module.exports = { loadConfig };
