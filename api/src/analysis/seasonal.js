const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Below an average of 5 sightings a month, any "pattern" is mostly noise and
// the chi-squared test below is not reliable.
const MIN_SIGHTINGS_FOR_PATTERN = 60;

// If sightings were spread evenly through the year, random variation alone
// would push the chi-squared value above 19.675 only 5% of the time
// (12 months, so 11 degrees of freedom). Months are treated as equal length;
// February's three missing days barely matter at these numbers.
const CHI_SQUARED_CRITICAL_VALUE = 19.675;

function countByMonth(sightings) {
  const counts = new Array(12).fill(0);
  for (const sighting of sightings) {
    counts[sighting.date.getUTCMonth()] += 1;
  }
  return counts;
}

function monthsWithCount(counts, target) {
  return counts.flatMap((count, index) => (count === target ? [index + 1] : []));
}

/**
 * Decides honestly whether the monthly counts show a seasonal pattern:
 *   "too-few"   not enough sightings to tell
 *   "even"      the differences between months are no bigger than chance
 *   "seasonal"  some months are busier than chance alone would explain
 * The chi-squared value measures how far the counts are from perfectly even.
 */
function describeSeasonalPattern(counts) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const peakMonths = total > 0 ? monthsWithCount(counts, Math.max(...counts)) : [];
  const quietestMonths = total > 0 ? monthsWithCount(counts, Math.min(...counts)) : [];
  if (total < MIN_SIGHTINGS_FOR_PATTERN) {
    return {
      kind: "too-few",
      total,
      minimumNeeded: MIN_SIGHTINGS_FOR_PATTERN,
      peakMonths,
      quietestMonths,
      chiSquared: null,
    };
  }
  const expected = total / 12;
  const chiSquared = counts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);
  return {
    kind: chiSquared > CHI_SQUARED_CRITICAL_VALUE ? "seasonal" : "even",
    total,
    peakMonths,
    quietestMonths,
    chiSquared,
  };
}

function buildSeasonalProfile(sightings) {
  const counts = countByMonth(sightings);
  return {
    months: counts.map((count, index) => ({ month: index + 1, name: MONTH_NAMES[index], count })),
    total: sightings.length,
    averagePerMonth: sightings.length / 12,
    pattern: describeSeasonalPattern(counts),
  };
}

module.exports = { CHI_SQUARED_CRITICAL_VALUE, buildSeasonalProfile, describeSeasonalPattern };
