/**
 * The API speaks UTC ISO strings. Everything shown to a user is rendered in
 * their own timezone via Intl, so a 09:00 UTC slot reads correctly in Kolkata
 * or New York without any manual offset arithmetic.
 */

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayLong = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const dayShort = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

export const formatTime = (iso) => time.format(new Date(iso));
export const formatDayLong = (iso) => dayLong.format(new Date(iso));
export const formatDayShort = (iso) => dayShort.format(new Date(iso));

export const formatRange = (startIso, endIso) => `${formatTime(startIso)} – ${formatTime(endIso)}`;

export const durationMinutes = (startIso, endIso) =>
  Math.round((new Date(endIso) - new Date(startIso)) / 60000);

/** Stable key for grouping, based on local calendar date rather than UTC. */
export const dayKey = (iso) => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const relativeDay = (iso) => {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return relative.format(days, 'day');
  return null;
};

export const isPast = (iso) => new Date(iso).getTime() <= Date.now();

/**
 * Converts a <input type="datetime-local"> value to an ISO string.
 * The input has no timezone, so `new Date()` reads it as local time -- which is
 * what the doctor means when they type it.
 */
export const localInputToIso = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Minimum for a datetime-local input: now, rounded up to the next 5 minutes. */
export const nowForInput = () => {
  const date = new Date(Date.now() + 5 * 60000);
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
