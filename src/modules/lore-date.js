// Variable-precision in-universe "lore date" logic (ADR-0011).
// A lore date is a nullable ISO-8601 string at year, month, or day precision —
// "1998", "1998-09", or "1998-09-28". This deep module is the single source of
// truth for parsing, ordering, and display; the gate, draft validator, and view
// call into it rather than re-deriving the rules.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR = /^\d{4}$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parse a lore-date string into its components, or null if it is not one of the
// three exact precisions (including calendar-invalid days). Non-string input
// returns null too — but note that null is also the result for the valid
// "absent date" case, so callers that must distinguish a bad value from an
// absent one check `typeof !== 'string'` themselves before parsing.
export function parseLoreDate(s) {
  if (typeof s !== 'string') return null;

  if (YEAR.test(s)) {
    return { year: Number(s), precision: 'year' };
  }

  let m = YEAR_MONTH.exec(s);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return { year, month, precision: 'month' };
  }

  m = FULL_DATE.exec(s);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > daysInMonth(year, month)) return null;
    return { year, month, day, precision: 'day' };
  }

  return null;
}

// Comparator over lore-date strings. Returns -1 | 0 | 1. Orders by year, then
// month, then day, where an absent (coarser) field sorts before any present one
// ("1998" < "1998-09" < "1999"). null and unparseable values sort AFTER every
// known date, so it can be used directly as an Array.sort comparator to push
// unknowns last.
export function compareLoreDate(a, b) {
  const pa = parseLoreDate(a);
  const pb = parseLoreDate(b);

  if (pa === null && pb === null) return 0;
  if (pa === null) return 1;
  if (pb === null) return -1;

  return (
    cmp(pa.year, pb.year) ||
    cmp(pa.month ?? 0, pb.month ?? 0) ||
    cmp(pa.day ?? 0, pb.day ?? 0)
  );
}

// Human-readable rendering, deferring entirely to parseLoreDate for validity:
// "1998", "September 1998", "September 28, 1998". Returns null for an absent or
// invalid value so the caller can omit the "Set in:" surface.
export function formatLoreDate(s) {
  const parsed = parseLoreDate(s);
  if (parsed === null) return null;

  const { year, month, day, precision } = parsed;
  if (precision === 'year') return String(year);

  const monthName = MONTH_NAMES[month - 1];
  if (precision === 'month') return `${monthName} ${year}`;
  return `${monthName} ${day}, ${year}`;
}

function cmp(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
