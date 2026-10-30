// The report form's checks in the browser. They mirror the server's checks
// (api/src/reports/validateReport.js) so people see problems straight away,
// but the server always checks again, because a browser can be bypassed.
// Errors stop the report being sent; warnings do not.

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isRealDay(day) {
  if (!DAY_PATTERN.test(day)) {
    return false;
  }
  const date = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

function minutesSinceEpoch(wallClock) {
  return Date.parse(`${wallClock}:00Z`) / 60000;
}

function checkWhen({ date, time }, { rules, now }, errors, warnings) {
  if (!date) {
    errors.date = "Enter the date you saw the tick.";
  } else if (!isRealDay(date)) {
    errors.date = "Enter a real date.";
  } else if (date < rules.earliestDate) {
    errors.date = "Enter a date from 1 January 2000 onwards.";
  } else if (date > now.slice(0, 10)) {
    errors.date = "The date can't be in the future.";
  }

  if (!time) {
    errors.time = "Enter the time you saw the tick.";
  } else if (!TIME_PATTERN.test(time)) {
    errors.time = "Enter a time in 24-hour format, for example 14:30.";
  }

  if (errors.date || errors.time) {
    return;
  }
  const minutesAhead = minutesSinceEpoch(`${date}T${time}`) - minutesSinceEpoch(now);
  if (minutesAhead > rules.futureToleranceMinutes) {
    errors.time = "The time can't be in the future.";
  } else if (-minutesAhead > rules.oldSightingDays * (DAY_MS / 60000)) {
    warnings.date =
      "This is more than a year ago. Please check the date; you can still send the report.";
  }
}

function checkNotes(notes, rules, errors, warnings) {
  const length = notes.length;
  if (length > rules.maxNotesLength) {
    errors.notes = `Notes must be ${rules.maxNotesLength} characters or fewer (these are ${length}).`;
  } else if (length > rules.maxNotesLength * 0.9) {
    const left = rules.maxNotesLength - length;
    warnings.notes = `${left} character${left === 1 ? "" : "s"} left.`;
  }
}

/**
 * Checks the form's values. `values` holds date ("YYYY-MM-DD"), time
 * ("HH:MM"), location, species and notes as typed; `now` is the current UK
 * time as "YYYY-MM-DDTHH:mm"; `rules` comes from /api/meta. Returns
 * { errors, warnings }, each an object of field name to message.
 */
export function validateReportForm(values, { rules, now }) {
  const errors = {};
  const warnings = {};
  checkWhen(values, { rules, now }, errors, warnings);
  if (!values.location) {
    errors.location = "Choose the city where you saw the tick.";
  }
  if (!values.species) {
    errors.species = "Choose the species of tick.";
  }
  checkNotes(values.notes.trim(), rules, errors, warnings);
  return { errors, warnings };
}
