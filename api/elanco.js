const ELANCO_URL = "https://dev-task.elancoapps.com/data/tick-sightings";

let cache = null;

async function getSightings() {
  if (cache) {
    return cache;
  }

  const response = await fetch(ELANCO_URL);

  if (!response.ok) {
    throw new Error("Elanco API returned " + response.status);
  }

  cache = await response.json();
  console.log("Fetched " + cache.length + " sightings from Elanco");
  return cache;
}

module.exports = { getSightings };