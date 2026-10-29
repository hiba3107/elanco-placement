// Elanco's timestamps have no timezone ("2024-05-01T10:00:00"): they are UK
// local times. Every Date in this codebase stores that wall-clock time in its
// UTC fields and is only ever read with the getUTC* methods. That way a
// sighting at 23:30 on 31 March is grouped into March on any server, whatever
// timezone the machine itself is set to.

const DAY_MS = 24 * 60 * 60 * 1000;

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const ukClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year, month) {
  const lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return lengths[month - 1];
}

function isRealDateTime({ year, month, day, hour, minute, second }) {
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59
  );
}

// Date.UTC treats years 0-99 as 1900-1999, so the year is set separately.
function makeWallClock(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date;
}

function parseOffsetMinutes(offset) {
  if (offset === "Z") {
    return 0;
  }
  const sign = offset.startsWith("-") ? -1 : 1;
  const digits = offset.slice(1).replace(":", "");
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2));
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return sign * (hours * 60 + minutes);
}

function toUkWallClock(instant) {
  const parts = {};
  for (const part of ukClock.formatToParts(instant)) {
    parts[part.type] = Number(part.value);
  }
  return makeWallClock(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    instant.getUTCMilliseconds(),
  );
}

function ukNow(now = new Date()) {
  return toUkWallClock(now);
}

/**
 * Strictly parses an ISO 8601 date or date-time into a wall-clock Date.
 * Accepts "YYYY-MM-DD", optionally followed by "THH:mm", ":ss" and fractions,
 * with "T" or a space between date and time. A timestamp with an explicit
 * offset ("Z", "+01:00") is converted to UK local time. Anything else,
 * including impossible dates such as 30 February and ambiguous formats such
 * as "01/05/2024", returns null.
 */
function parseTimestampDetailed(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = "", offset] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
  if (!isRealDateTime(parts)) {
    return null;
  }
  const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3));
  const wallClock = makeWallClock(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    millisecond,
  );
  if (offset === undefined) {
    return { date: wallClock, hadOffset: false };
  }
  const offsetMinutes = parseOffsetMinutes(offset);
  if (offsetMinutes === null) {
    return null;
  }
  const instant = new Date(wallClock.getTime() - offsetMinutes * 60 * 1000);
  return { date: toUkWallClock(instant), hadOffset: true };
}

function parseTimestamp(value) {
  const parsed = parseTimestampDetailed(value);
  return parsed ? parsed.date : null;
}

function parseDay(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = DAY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (!isRealDateTime({ ...parts, hour: 0, minute: 0, second: 0 })) {
    return null;
  }
  return makeWallClock(parts.year, parts.month, parts.day);
}

function pad(number, width = 2) {
  return String(number).padStart(width, "0");
}

function formatDay(date) {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatTimestamp(date) {
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  return `${formatDay(date)}T${time}`;
}

function startOfDay(date) {
  return makeWallClock(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function endOfDay(date) {
  return new Date(startOfDay(date).getTime() + DAY_MS - 1);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetween(earlier, later) {
  return (later.getTime() - earlier.getTime()) / DAY_MS;
}

function startOfMonth(date) {
  return makeWallClock(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function addMonths(monthStart, months) {
  const monthIndex = monthStart.getUTCMonth() + months;
  return makeWallClock(
    monthStart.getUTCFullYear() + Math.floor(monthIndex / 12),
    (((monthIndex % 12) + 12) % 12) + 1,
    1,
  );
}

function startOfYear(date) {
  return makeWallClock(date.getUTCFullYear(), 1, 1);
}

function addYears(yearStart, years) {
  return makeWallClock(yearStart.getUTCFullYear() + years, 1, 1);
}

// ISO 8601 weeks start on Monday. Week 1 is the week containing the year's
// first Thursday, so 30 December 2024 belongs to week 1 of 2025.
function startOfIsoWeek(date) {
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(startOfDay(date), -daysSinceMonday);
}

function isoWeekParts(date) {
  const thursday = addDays(startOfIsoWeek(date), 3);
  const year = thursday.getUTCFullYear();
  const week = Math.ceil((daysBetween(makeWallClock(year, 1, 1), thursday) + 1) / 7);
  return { year, week };
}

function isoWeekKey(date) {
  const { year, week } = isoWeekParts(date);
  return `${pad(year, 4)}-W${pad(week)}`;
}

function monthKey(date) {
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}`;
}

function yearKey(date) {
  return pad(date.getUTCFullYear(), 4);
}

module.exports = {
  DAY_MS,
  addDays,
  addMonths,
  addYears,
  daysBetween,
  endOfDay,
  formatDay,
  formatTimestamp,
  isoWeekKey,
  makeWallClock,
  monthKey,
  parseDay,
  parseTimestamp,
  parseTimestampDetailed,
  startOfDay,
  startOfIsoWeek,
  startOfMonth,
  startOfYear,
  toUkWallClock,
  ukNow,
  yearKey,
};
