const { loadConfig } = require("./src/config");
const { createLogger } = require("./src/logger");
const { createApp } = require("./src/app");
const { getSightings } = require("./src/elanco/client");

const config = loadConfig();
const logger = createLogger(config.logLevel);
const app = createApp({ config, logger, getSightings });

app.listen(config.port, () => {
  logger.info(`Tick Tracker running at http://localhost:${config.port}`);
});
