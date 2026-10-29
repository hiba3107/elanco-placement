const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.get("/health", (request, response) => {
  response.json({ status: "ok" });
});

app.listen(3000, () => {
  console.log("API running on http://localhost:3000");
});