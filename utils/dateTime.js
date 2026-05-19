/**
 * Shared date/time utility helpers.
 * Used across Appointments, Lab Reports, and Analytics.
 */

/**
 * Check if a string is a valid ISO datetime.
 * Accepts: "2025-06-15T10:30:00" or "2025-06-15 10:30:00"
 */
export const isValidDatetime = (str) => {
  const dt = new Date(str);
  return !isNaN(dt.getTime());
};

/**
 * Check if a datetime is in the future.
 */
export const isFutureDatetime = (str) => {
  return new Date(str) > new Date();
};

/**
 * Format a JS Date to MySQL DATETIME string.
 * "YYYY-MM-DD HH:MM:SS"
 */
export const toMySQLDatetime = (date = new Date()) => {
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Add minutes to a datetime and return a new Date.
 */
export const addMinutes = (date, minutes) => {
  return new Date(new Date(date).getTime() + minutes * 60000);
};

/**
 * Check if two time ranges overlap.
 * [start1, end1) vs [start2, end2) — half-open intervals.
 */
export const hasTimeOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};