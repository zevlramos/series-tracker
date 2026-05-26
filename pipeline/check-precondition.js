export function checkPrecondition(registry, slug) {
  if (registry.some(entry => entry.slug === slug)) {
    return { ok: false, error: `Series "${slug}" already exists — use update-series instead` };
  }
  return { ok: true };
}
