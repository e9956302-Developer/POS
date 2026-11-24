/**
 * Pakistan Time (Asia/Karachi) Date & Time Utilities (Change 7)
 * Ensures all displays, timestamps, and day-boundary calculations are localized strictly to Pakistan Standard Time (UTC+5).
 */

export const PK_TIMEZONE = "Asia/Karachi";

/**
 * Returns the current date in Pakistan time as a Date object aligned with Karachi calendar.
 */
export function getNowPK() {
  const now = new Date();
  const pkStr = now.toLocaleString("en-US", { timeZone: PK_TIMEZONE });
  return new Date(pkStr);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Karachi.
 */
export function getTodayDateStringPK() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

/**
 * Parses a date string or timestamp safely into components localized to Asia/Karachi.
 * Handles date-only strings (YYYY-MM-DD) without causing UTC offset backward day shift.
 */
export function parseDateInput(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  // If date-only format YYYY-MM-DD
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnlyMatch) {
    const year = parseInt(dateOnlyMatch[1], 10);
    const month = parseInt(dateOnlyMatch[2], 10) - 1;
    const day = parseInt(dateOnlyMatch[3], 10);
    // Create date at noon UTC to ensure any timezone rendering in Pakistan (+5) stays on the exact same calendar day
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a date into a localized date string in Pakistan time (e.g. "Nov 23, 2026" or "23/11/2026").
 */
export function formatDatePK(input, options = {}) {
  const d = parseDateInput(input);
  if (!d) return "—";

  const defaultOptions = {
    timeZone: PK_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  };

  try {
    return new Intl.DateTimeFormat("en-PK", defaultOptions).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Formats a timestamp into localized date & time in Pakistan time (e.g. "23 Nov 2026, 04:30 PM").
 */
export function formatDateTimePK(input, options = {}) {
  const d = parseDateInput(input);
  if (!d) return "—";

  const defaultOptions = {
    timeZone: PK_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options
  };

  try {
    return new Intl.DateTimeFormat("en-PK", defaultOptions).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Calculates remaining days from today (Karachi calendar day) to the target date.
 * Returns negative if target date has passed.
 */
export function getDaysLeftPK(targetDateInput) {
  if (!targetDateInput) return null;
  const target = parseDateInput(targetDateInput);
  if (!target) return null;

  // Format both today and target in YYYY-MM-DD in Karachi
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const todayStr = formatter.format(new Date());
  const targetStr = formatter.format(target);

  const [tY, tM, tD] = todayStr.split("-").map(Number);
  const [targetY, targetM, targetD] = targetStr.split("-").map(Number);

  const d1 = Date.UTC(tY, tM - 1, tD);
  const d2 = Date.UTC(targetY, targetM - 1, targetD);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((d2 - d1) / msPerDay);
}
