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
    const order = normalize(source.order, includedIds, releaseOrder);
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

// Permutation-only normalization: keep researched ids that are included (in order),
// then append every included id still missing, in release order.
function normalize(order, includedIds, releaseOrder) {
  const present = new Set(order.filter((id) => includedIds.has(id)));
  const kept = [...present];
  for (const id of releaseOrder) {
    if (!present.has(id)) kept.push(id);
  }
  return kept;
}

function cmp(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
