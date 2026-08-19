// Date helpers shared by the browser bundle and the Node server.
// All parsing is UTC-based so a rental never changes length because of the
// timezone the server or the visitor happens to be in.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Parse a `YYYY-MM-DD` string into a UTC-midnight Date.
 * @returns {Date|null} null when the string is missing or not a real calendar date.
 */
export function parseISODate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Rejects impossible dates that still parse, e.g. 2026-02-31 rolling to March.
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** Format a Date as `YYYY-MM-DD`. */
export function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/** Today at UTC midnight. */
export function startOfToday(now = new Date()) {
  return new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

/** Add whole days to a date, returning a new Date. */
export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Billable rental days between two dates. A same-day rental still bills one day.
 * @returns {number} 0 when the range is invalid or reversed.
 */
export function rentalDays(pickup, returnDate) {
  const from = pickup instanceof Date ? pickup : parseISODate(pickup);
  const to = returnDate instanceof Date ? returnDate : parseISODate(returnDate);
  if (!from || !to) return 0;
  const diff = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  if (diff < 0) return 0;
  return Math.max(diff, 1);
}
