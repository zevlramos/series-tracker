// Version-group derivation for the Curation wizard (ADR-0014): a Version group is
// emergent — "the entries where versionGroup === <slug>" — materialized by a
// group-by. This replaces the old title-matching matcher (stripYear + base-title
// equality + a publish-stripped versionNote), which produced zero pairings on
// update once titles were decorated. Pairing is now a trivial group-by that scales
// from two members to N with no new logic.

const YEAR_SUFFIX = /\s*\(\d{4}\)\s*$/;

// Title minus a trailing 4-digit year parenthetical; preserves case/whitespace for display.
// Single source of truth for the contract's strip pattern, shared with the wizard card.
export function stripYear(title) {
  return String(title).replace(YEAR_SUFFIX, '');
}

// Orders members within a group: earliest releaseDate first, null sorts last
// (mirroring the gate's nulls-last treatment); equal dates keep input order.
function compareByReleaseDate(a, b) {
  const aDate = a.releaseDate ?? null;
  const bDate = b.releaseDate ?? null;
  if (aDate === bDate) return 0;
  if (aDate === null) return 1;
  if (bDate === null) return -1;
  return aDate < bDate ? -1 : 1;
}

// deriveVersionGroups(entries) -> Array<{ versionGroup, members }>, one per slug
// shared by >= 2 entries (a lone member is not a version card). Entries with
// versionGroup == null are never grouped. Members are returned by release order,
// nulls last, as the original entry references (the card mutates _drop on them).
// Pure: the input array and its entries are not mutated.
export function deriveVersionGroups(entries) {
  const bySlug = new Map();

  for (const entry of entries) {
    const slug = entry.versionGroup ?? null;
    if (slug === null) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(entry);
  }

  const groups = [];
  for (const [versionGroup, members] of bySlug) {
    if (members.length < 2) continue;
    const sorted = [...members].sort(compareByReleaseDate);
    groups.push({ versionGroup, members: sorted });
  }

  return groups;
}
