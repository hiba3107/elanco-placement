const LEVELS = ["error", "warn", "info", "debug"];

function createLogger(level = "info", sink = console) {
  const threshold = level === "silent" ? -1 : LEVELS.indexOf(level);

  function write(levelName, message, details) {
    if (LEVELS.indexOf(levelName) > threshold) {
      return;
    }
    const line = `${new Date().toISOString()} ${levelName.toUpperCase()} ${message}`;
    if (details === undefined) {
      sink[levelName](line);
    } else {
      sink[levelName](line, details);
    }
  }

  return {
    error: (message, details) => write("error", message, details),
    warn: (message, details) => write("warn", message, details),
    info: (message, details) => write("info", message, details),
    debug: (message, details) => write("debug", message, details),
  };
}

module.exports = { createLogger };
