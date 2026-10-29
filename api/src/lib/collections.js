function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  }
  return groups;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// Returns every name that shares the highest count, so ties are shown honestly.
function mostCommon(counts) {
  let highest = 0;
  let names = [];
  for (const [name, count] of counts) {
    if (count > highest) {
      highest = count;
      names = [name];
    } else if (count === highest && count > 0) {
      names.push(name);
    }
  }
  return { names: names.sort(), count: highest };
}

module.exports = { countBy, groupBy, mostCommon };
