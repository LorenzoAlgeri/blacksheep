/**
 * Format an event date for display in the BlackSheep List UI.
 *
 * Uses the it-IT locale with Europe/Rome timezone — produces output like
 * "15 mag 2026, 21:00" (short month, 2-digit day/year, 24h time).
 *
 * Accepts both Date instances and ISO strings; returns "" if the input
 * is not a valid date (no NaN-formatted output leaks into the UI).
 */
const FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function formatEventDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return FORMATTER.format(date);
}
