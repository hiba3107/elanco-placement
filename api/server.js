const express = require("express");
const cors = require("cors");
const { getSightings } = require("./elanco");

const app = express();

app.use(cors());

app.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

app.get("/sightings", async (request, response) => {
  try {
    const sightings = await getSightings();
    response.json(sightings);
  } catch (error) {
    console.error(error);
    response.status(502).json({ error: "Could not reach the Elanco API" });
  }
});

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});