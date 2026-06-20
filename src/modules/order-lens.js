// Ordering "lenses" for the curation wizard (#40): the always-present release-order
// floor plus researched fan orderings, normalized to a permutation of the included set.

// Ascending by ISO releaseDate (lexicographic); null dates sort last in input order.
// Stable among equal dates. Pure — does not mutate `entries`.
export function computeReleaseOrder(entries) {
  return [...entries]
    .sort((a, b) => {
      const an = a.releaseDate == null;
      const bn = b.releaseDate == null;
      if (an && bn) return 0;
      if (an) return 1;
      if (bn) return -1;
      return cmp(a.releaseDate, b.releaseDate);
    })
    .map((e) => e.id);
}

// Build the lens list and an honesty verdict over the INCLUDED set.
// `research` ({ consensus, alternatives } | null | undefined) supplies researched
// orderings; each is normalized to a total order over exactly the included ids.
export function shapeLenses({ includedEntries, research }) {
  const releaseOrder = computeReleaseOrder(includedEntries);
  const includedIds = new Set(includedEntries.map((e) => e.id));
  const dateById = new Map(includedEntries.map((e) => [e.id, e.releaseDate ?? null]));

  const releaseLens = {
    kind: 'release',
    label: 'Release order',
    order: releaseOrder,
    sources: [],
    computed: true,
  };

  // Empty included set: nothing to order — only the honest release floor.
  if (includedEntries.length === 0) {
    return { lenses: [releaseLens], honesty: 'thin' };
  }

  let { consensus = null, alternatives = [] } = research ?? {};
  if (!Array.isArray(alternatives)) alternatives = []; // tolerate null/malformed scratch

  const researched = [];
  if (consensus != null) {
    researched.push({ kind: 'fan-consensus', source: consensus });
  }
  for (const alt of alternatives) {
    researched.push({ kind: 'alternative', source: alt });
  }

  const seen = new Set();
  const dedupedResearchedLenses = [];
  for (const { kind, source } of researched) {
    const order = normalize(source.order, includedIds, releaseOrder, dateById);
    const key = order.join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedResearchedLenses.push({
      kind,
      label: source.label,
      order,
      sources: source.sources,
      computed: false,
    });
  }

  const D = dedupedResearchedLenses.length;
  const honesty = D === 0 ? 'thin' : D === 1 ? 'uncontested' : 'contested';

  return { lenses: [releaseLens, ...dedupedResearchedLenses], honesty };
}

// Permutation-only normalization. Researched ids that are included keep their authored
// order. Every included id the research omits (a "non-researched" entry) is woven in by
// release date: it lands BEFORE the earliest researched entry whose releaseDate is strictly
// later (scanning the authored order; null researched dates don't count as "later"). With no
// such entry — or a null date of its own — it falls to the tail. Non-researched entries keep
// release order among themselves. This stops mid-timeline entries (e.g. RE Outbreak) from
// being block-appended after far-later researched entries (the stranding ADR-0013 retired).
function normalize(order, includedIds, releaseOrder, dateById) {
  const seen = new Set();
  const researched = [];
  for (const id of order) {
    if (includedIds.has(id) && !seen.has(id)) { seen.add(id); researched.push(id); }
  }
  // Bucket each non-researched id (walked in release order) by its insertion slot — the
  // index in `researched` of the first strictly-later entry, or the tail.
  const buckets = new Map();
  for (const id of releaseOrder) {
    if (seen.has(id)) continue;
    const d = dateById.get(id);
    let slot = researched.length;
    if (d != null) {
      const i = researched.findIndex((rid) => {
        const rd = dateById.get(rid);
        return rd != null && cmp(rd, d) > 0;
      });
      if (i !== -1) slot = i;
    }
    if (!buckets.has(slot)) buckets.set(slot, []);
    buckets.get(slot).push(id);
  }
  const result = [];
  for (let i = 0; i <= researched.length; i++) {
    if (buckets.has(i)) result.push(...buckets.get(i));
    if (i < researched.length) result.push(researched[i]);
  }
  return result;
}

function cmp(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
