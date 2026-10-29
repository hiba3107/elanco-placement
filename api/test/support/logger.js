// A logger that records messages instead of printing them, so tests stay quiet
// and can check what would have been logged.
function createTestLogger() {
  const messages = [];
  const record = (level) => (message) => messages.push({ level, message });
  return {
    messages,
    logger: {
      error: record("error"),
      warn: record("warn"),
      info: record("info"),
      debug: record("debug"),
    },
  };
}

module.exports = { createTestLogger };
