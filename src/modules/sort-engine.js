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
      return copy.sort((a, b) => a.recommendedOrder - b.recommendedOrder);
    case 'release':
      return copy.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    case 'chronological':
      return copy.sort(byRankNullsLast);
    default:
      return copy;
  }
}

// Ascending by chronologicalOrder, with unranked (null) entries pushed to the
// end. Explicit null handling — `null - n` would coerce to 0 and interleave
// unranked entries instead of placing them last.
function byRankNullsLast(a, b) {
  const ra = a.chronologicalOrder;
  const rb = b.chronologicalOrder;
  if (ra == null && rb == null) return 0;
  if (ra == null) return 1;
  if (rb == null) return -1;
  return ra - rb;
}
