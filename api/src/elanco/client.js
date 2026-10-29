let cache = null;

async function getSightings(url) {
  if (cache) {
    return cache;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Elanco API returned " + response.status);
  }

  cache = await response.json();
  return cache;
}

module.exports = { getSightings };
