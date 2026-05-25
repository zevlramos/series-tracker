export function availableSorts(series) {
  const sorts = ['recommended'];

  if (series.entries.every(e => e.releaseDate != null)) {
    sorts.push('release');
  }
  if (series.entries.every(e => e.chronologicalOrder != null)) {
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
      return copy.sort((a, b) => a.chronologicalOrder - b.chronologicalOrder);
    default:
      return copy;
  }
}
