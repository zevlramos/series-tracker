import { CURATION_FIELDS } from './curation-fields.js';

export function mergeCuration(existingEntries, approvedDiff) {
  const existingById = new Map(existingEntries.map(e => [e.id, e]));
  const result = [];

  for (const id of approvedDiff.unchanged) {
    result.push({ ...existingById.get(id) });
  }

  for (const change of approvedDiff.changed) {
    const existing = existingById.get(change.existingId);
    const merged = { ...existing };

    for (const [field, delta] of Object.entries(change.fields)) {
      if (delta.accepted) {
        merged[field] = delta.new;
      }
    }

    for (const field of CURATION_FIELDS) {
      merged[field] = existing[field];
    }

    result.push(merged);
  }

  for (const entry of approvedDiff.new) {
    result.push({ ...entry, status: false });
  }

  return result;
}
