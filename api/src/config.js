const LOG_LEVELS = ["error", "warn", "info", "debug", "silent"];

function readWholeNumber(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a whole number (0 or more), got "${raw}"`);
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
    elanco: Object.freeze({
      url: env.ELANCO_API_URL || "https://dev-task.elancoapps.com/data/tick-sightings",
    }),
  });
}

module.exports = { loadConfig };
