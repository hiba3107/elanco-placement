// Zero-width characters sneak in when text is copied from web pages and make
// two strings that look identical compare as different.
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/g;

function normaliseText(value) {
  return value.normalize("NFKC").replace(INVISIBLE_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

function toMatchKey(value) {
  return normaliseText(value).toLowerCase();
}

function editDistance(first, second) {
  let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let i = 1; i <= first.length; i += 1) {
    const currentRow = [i];
    for (let j = 1; j <= second.length; j += 1) {
      const substitutionCost = first[i - 1] === second[j - 1] ? 0 : 1;
      currentRow.push(
        Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + substitutionCost),
      );
    }
    previousRow = currentRow;
  }
  return previousRow[second.length];
}

/**
 * Matches free text against a fixed list of names, ignoring letter case,
 * repeated spaces and invisible characters. Elanco's own API is case-sensitive
 * and silently returns nothing for "london"; this matcher is the defence
 * against that. It only fixes differences that cannot change the meaning.
 * Typos are never corrected automatically, only suggested.
 */
function createNameMatcher(names) {
  const namesByKey = new Map(names.map((name) => [toMatchKey(name), name]));

  function find(input) {
    if (typeof input !== "string") {
      return null;
    }
    return namesByKey.get(toMatchKey(input)) ?? null;
  }

  function suggest(input) {
    if (typeof input !== "string" || toMatchKey(input) === "") {
      return null;
    }
    const inputKey = toMatchKey(input);
    const maxDistance = Math.max(2, Math.floor(inputKey.length / 4));
    let closest = null;
    let closestDistance = Infinity;
    for (const [key, name] of namesByKey) {
      const distance = editDistance(inputKey, key);
      if (distance < closestDistance) {
        closest = name;
        closestDistance = distance;
      }
    }
    return closestDistance <= maxDistance ? closest : null;
  }

  return { names, find, suggest };
}

module.exports = { createNameMatcher, editDistance, normaliseText, toMatchKey };
