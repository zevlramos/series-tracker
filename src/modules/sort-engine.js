// The reader's single entry-consumption chokepoint (ADR-0014): excluded entries
// are retained in data.json but never shown. Only `excluded === true` is hidden;
// absent/false stay visible (backward-compatible default).
export function visibleEntries(entries) {
  return entries.filter(e => e.excluded !== true);
}

export function availableSorts(series) {
  const sorts = ['recommended'];

  if (series.entries.every(e => e.releaseDate != null)) {
    sorts.push('release');
  }
  // Chronological is offered as soon as ANY entry carries an in-universe rank
  // (ADR-0011): unknown ranks sort last rather than suppressing the lens.
  if (series.entries.some(e => e.chronologicalOrder != null)) {
    sorts.push('chronological');
  }

  return sorts;
}

export function sortEntries(entries, mode) {
  const copy = [...entries];
  switch (mode) {
    case 'recommended':
      return copy.sort(makeNullsLast(e => e.recommendedOrder));
    case 'release':
      return copy.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    case 'chronological':
      return copy.sort(makeNullsLast(e => e.chronologicalOrder));
    default:
      return copy;
  }
}

// Comparator factory: orders ascending by a numeric selector, placing null/undefined
// keys last. Explicit null handling because `null - n` coerces to 0, which would
// interleave keyless entries instead of placing them last. Shared by the
// chronological and recommended lenses and by the publish gate (parse-series).
export function makeNullsLast(selector) {
  return (a, b) => {
    const ra = selector(a);
    const rb = selector(b);
    if (ra == null && rb == null) return 0;
    if (ra == null) return 1;
    if (rb == null) return -1;
    return ra - rb;
  };
}
