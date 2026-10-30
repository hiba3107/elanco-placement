// Sighting dates arrive as UK wall-clock text with no timezone
// ("2024-05-01T10:00:00"). Reading them as UTC and formatting them in UTC
// shows exactly the time that was recorded, whatever timezone the visitor's
// device uses. fetchedAt-style times are real moments and use local time.

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const instantFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const ukClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const numberFormat = new Intl.NumberFormat("en-GB");
const decimalFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

export function parseWallClock(text) {
  return new Date(`${text.length === 10 ? `${text}T00:00:00` : text}Z`);
}

export function formatDay(text) {
  return dayFormat.format(parseWallClock(text));
}

export function formatDateTime(text) {
  return dateTimeFormat.format(parseWallClock(text));
}

export function formatInstant(isoText) {
  return instantFormat.format(new Date(isoText));
}

export function formatNumber(value) {
  return numberFormat.format(value);
}

export function formatDecimal(value) {
  return decimalFormat.format(value);
}

export function formatPercent(share) {
  return `${Math.round(share * 100)}%`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

export function formatPeriod(period, interval) {
  if (interval === "year") {
    return period.start.slice(0, 4);
  }
  if (interval === "week") {
    return `Week of ${formatDay(period.start)}`;
  }
  return monthFormat.format(parseWallClock(period.start));
}

// The current UK wall-clock time as "YYYY-MM-DDTHH:mm", the same shape as a
// date and time typed into the report form, so the two compare as text.
export function nowInUk(now = new Date()) {
  const parts = Object.fromEntries(
    ukClock.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function todayInUk(now = new Date()) {
  return nowInUk(now).slice(0, 10);
}
