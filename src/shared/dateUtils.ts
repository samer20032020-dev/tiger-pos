/**
 * Shared local date & time helpers for both Electron main process and React UI.
 * Converts UTC ISO strings and bare SQLite CURRENT_TIMESTAMP strings to the PC's local timezone.
 */

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Parses an ISO string or bare SQLite UTC string ("YYYY-MM-DD HH:MM:SS") into a JS Date.
 */
export function parseDbDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  const bareSqlUtcRegex = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
  let normalized = trimmed;
  if (bareSqlUtcRegex.test(trimmed)) {
    normalized = `${trimmed.replace(' ', 'T')}Z`;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a Date or DB timestamp string as local YYYY-MM-DD.
 */
export function formatLocalDate(dateInput?: Date | string | null): string {
  const d = dateInput instanceof Date ? dateInput : parseDbDate(dateInput);
  if (!d) return dateInput && typeof dateInput === 'string' ? dateInput.substring(0, 10) : '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Returns today's (or offset days) local calendar date as YYYY-MM-DD.
 */
export function getLocalTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return formatLocalDate(d);
}

/**
 * Formats a DB timestamp in local 12-hour short form for compact tables: "MM-DD hh:mm ص/م".
 */
export function formatLocalShortDateTime(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr ? String(dateStr) : '-';
  const hours24 = d.getHours();
  const suffix = hours24 >= 12 ? 'م' : 'ص';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(hours12)}:${pad2(d.getMinutes())} ${suffix}`;
}

/**
 * Formats a DB timestamp in local 12-hour full form for receipts and modals: "YYYY-MM-DD hh:mm ص/م".
 */
export function formatLocalDateTime(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr ? String(dateStr) : '-';
  const hours24 = d.getHours();
  const suffix = hours24 >= 12 ? 'م' : 'ص';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(hours12)}:${pad2(d.getMinutes())} ${suffix}`;
}

/**
 * Formats only local time in 12-hour format: "hh:mm ص/م".
 */
export function formatLocalTime(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return '-';
  const hours24 = d.getHours();
  const suffix = hours24 >= 12 ? 'م' : 'ص';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad2(hours12)}:${pad2(d.getMinutes())} ${suffix}`;
}

/**
 * Formats a DB timestamp in 24-hour local form for Excel sheets and logs: "YYYY-MM-DD HH:MM:SS".
 */
export function formatLocalDateTime24(dateStr?: string | null): string {
  const d = parseDbDate(dateStr);
  if (!d) return dateStr ? String(dateStr) : '-';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
