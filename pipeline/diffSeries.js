import { CURATION_FIELDS } from './curation-fields.js';

const DIFF_FIELDS = [
  'title',
  'medium',
  'branch',
  'releaseDate',
  'summary',
  'image',
  'imageUrl',
  'sources'
];

export function diffSeries(existingEntries, alignment) {
  const existingById = new Map(existingEntries.map(e => [e.id, e]));

  const unchanged = [];
  const changed = [];

  for (const { existingId, freshEntry } of alignment.matches) {
    const existing = existingById.get(existingId);
    const fields = {};

    for (const field of DIFF_FIELDS) {
      if (CURATION_FIELDS.has(field)) continue;
      if (!(field in freshEntry)) continue;
      const oldVal = existing[field];
      const newVal = freshEntry[field];
      if (!fieldEqual(oldVal, newVal)) {
        fields[field] = { old: oldVal, new: newVal };
      }
    }

    if (Object.keys(fields).length > 0) {
      changed.push({ existingId, fields });
    } else {
      unchanged.push(existingId);
    }
  }

  return {
    new: alignment.unmatched,
    changed,
    unchanged
  };
}

function fieldEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
}
