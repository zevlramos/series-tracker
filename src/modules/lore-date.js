// Variable-precision in-universe "lore date" logic (ADR-0011):
// "1998" (year), "1998-09" (month), or "1998-09-28" (day).

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR = /^\d{4}$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const FULL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// null for malformed strings and for non-string input alike.
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

// Orders by year, then month, then day; a coarser (absent) field sorts before a
// present one, so "1998" < "1998-09" < "1999". null and unparseable values sort last.
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

// "1998", "September 1998", or "September 28, 1998"; null for absent or invalid.
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
