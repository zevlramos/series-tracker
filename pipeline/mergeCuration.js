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

    merged.status = existing.status;
    merged.recommendedOrder = existing.recommendedOrder;
    merged.recommendedReason = existing.recommendedReason;
    merged.chronologicalOrder = existing.chronologicalOrder;

    result.push(merged);
  }

  for (const entry of approvedDiff.new) {
    result.push({ ...entry });
  }

  return result;
}
