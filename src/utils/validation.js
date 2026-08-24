const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_PATTERN.test(value);

export const isEmail = (value) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isNonEmptyString = (value, maxLength = 255) =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;

/** Returns a Date for a valid ISO-8601 string, or null. Keeps NaN dates out of SQL. */
export const parseDate = (value) => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
