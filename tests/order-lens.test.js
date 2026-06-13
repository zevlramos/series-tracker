import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeReleaseOrder, shapeLenses } from '../src/modules/order-lens.js';

// --- helpers ---------------------------------------------------------------

// Build a minimal included-entry; extra fields exist to prove they're ignored.
function entry(id, releaseDate, extra = {}) {
  return { id, releaseDate, title: id.toUpperCase(), ...extra };
}

// Multiset of ids (order-insensitive) for permutation checks.
function idSet(arr) {
  return [...arr].sort();
}

// --- computeReleaseOrder ---------------------------------------------------

describe('computeReleaseOrder', () => {
  it('returns [] for empty input', () => {
    assert.deepEqual(computeReleaseOrder([]), []);
  });

  it('returns the single id for a one-entry list', () => {
    assert.deepEqual(computeReleaseOrder([entry('a', '2020-01-01')]), ['a']);
  });

  it('returns the single id even when its date is null', () => {
    assert.deepEqual(computeReleaseOrder([entry('a', null)]), ['a']);
  });

  it('sorts ids ascending by releaseDate (lexicographic ISO)', () => {
    const entries = [
      entry('c', '2023-01-01'),
      entry('a', '2019-06-15'),
      entry('b', '2021-03-22')
    ];
    assert.deepEqual(computeReleaseOrder(entries), ['a', 'b', 'c']);
  });

  it('places null-date entries last', () => {
    const entries = [
      entry('a', '2020-01-01'),
      entry('n', null),
      entry('b', '2021-01-01')
    ];
    assert.deepEqual(computeReleaseOrder(entries), ['a', 'b', 'n']);
  });

  it('keeps null-date entries in their original input order (nulls-last, stable)', () => {
    const entries = [
      entry('n2', null),
      entry('b', '2021-01-01'),
      entry('n1', null),
      entry('a', '2020-01-01')
    ];
    assert.deepEqual(computeReleaseOrder(entries), ['a', 'b', 'n2', 'n1']);
  });

  it('preserves input order among entries with equal dates (stable sort)', () => {
    const entries = [
      entry('x', '2020-01-01'),
      entry('y', '2020-01-01'),
      entry('z', '2020-01-01')
    ];
    assert.deepEqual(computeReleaseOrder(entries), ['x', 'y', 'z']);
  });

  it('is stable across equal dates while still ordering distinct dates', () => {
    const entries = [
      entry('b1', '2021-01-01'),
      entry('a', '2020-01-01'),
      entry('b2', '2021-01-01')
    ];
    assert.deepEqual(computeReleaseOrder(entries), ['a', 'b1', 'b2']);
  });

  it('does not mutate the input array or its entries', () => {
    const entries = [entry('c', '2023-01-01'), entry('a', '2019-06-15')];
    const snapshot = entries.map(e => ({ ...e }));
    const orderSnapshot = entries.map(e => e.id);
    computeReleaseOrder(entries);
    assert.deepEqual(entries.map(e => e.id), orderSnapshot);
    assert.deepEqual(entries, snapshot);
  });
});

// --- shapeLenses: release lens floor --------------------------------------

describe('shapeLenses release lens', () => {
  const included = [
    entry('a', '2020-01-01'),
    entry('b', '2021-01-01'),
    entry('c', '2022-01-01')
  ];

  it('always emits a release lens first', () => {
    const { lenses } = shapeLenses({ includedEntries: included, research: null });
    assert.equal(lenses[0].kind, 'release');
  });

  it('release lens has label "Release order", empty sources, computed:true', () => {
    const { lenses } = shapeLenses({ includedEntries: included, research: null });
    const release = lenses[0];
    assert.equal(release.label, 'Release order');
    assert.deepEqual(release.sources, []);
    assert.equal(release.computed, true);
  });

  it('release lens order equals computeReleaseOrder(includedEntries)', () => {
    const { lenses } = shapeLenses({ includedEntries: included, research: null });
    assert.deepEqual(lenses[0].order, computeReleaseOrder(included));
  });

  it('is still first when research provides a consensus', () => {
    const research = { consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s'] }, alternatives: [] };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.equal(lenses[0].kind, 'release');
    assert.equal(lenses[0].computed, true);
  });
});

// --- shapeLenses: honesty classification ----------------------------------

describe('shapeLenses honesty', () => {
  const included = [
    entry('a', '2020-01-01'),
    entry('b', '2021-01-01'),
    entry('c', '2022-01-01')
  ];

  it('no research → thin, with only the release lens', () => {
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research: null });
    assert.equal(honesty, 'thin');
    assert.equal(lenses.length, 1);
    assert.equal(lenses[0].kind, 'release');
  });

  it('undefined research → thin (treated as no consensus / no alternatives)', () => {
    const { lenses, honesty } = shapeLenses({ includedEntries: included });
    assert.equal(honesty, 'thin');
    assert.equal(lenses.length, 1);
  });

  it('explicit empty research → thin', () => {
    const { lenses, honesty } = shapeLenses({
      includedEntries: included,
      research: { consensus: null, alternatives: [] }
    });
    assert.equal(honesty, 'thin');
    assert.equal(lenses.length, 1);
  });

  it('consensus only → uncontested (release + consensus lens)', () => {
    const research = { consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] }, alternatives: [] };
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research });
    assert.equal(honesty, 'uncontested');
    assert.equal(lenses.length, 2);
    assert.equal(lenses[1].kind, 'fan-consensus');
  });

  it('consensus + one DISTINCT alternative → contested', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      alternatives: [{ label: 'Story order', order: ['a', 'c', 'b'], sources: ['s2'] }]
    };
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research });
    assert.equal(honesty, 'contested');
    assert.equal(lenses.length, 3);
    assert.equal(lenses[1].kind, 'fan-consensus');
    assert.equal(lenses[2].kind, 'alternative');
  });

  it('consensus + an alternative whose normalized order EQUALS consensus → uncontested (dedup collapses it)', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      // Same set, same positions once normalized → identical → dropped.
      alternatives: [{ label: 'Duplicate', order: ['c', 'b', 'a'], sources: ['s2'] }]
    };
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research });
    assert.equal(honesty, 'uncontested');
    assert.equal(lenses.length, 2);
    assert.equal(lenses[1].kind, 'fan-consensus');
  });

  it('two DISTINCT alternatives + consensus → contested', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      alternatives: [
        { label: 'Story order', order: ['a', 'c', 'b'], sources: ['s2'] },
        { label: 'Watch order', order: ['b', 'a', 'c'], sources: ['s3'] }
      ]
    };
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research });
    assert.equal(honesty, 'contested');
    assert.equal(lenses.length, 4);
  });

  it('an alternative identical to consensus collapses, leaving a distinct one → contested', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      alternatives: [
        { label: 'Dupe of consensus', order: ['c', 'b', 'a'], sources: ['s2'] },
        { label: 'Story order', order: ['a', 'c', 'b'], sources: ['s3'] }
      ]
    };
    const { lenses, honesty } = shapeLenses({ includedEntries: included, research });
    assert.equal(honesty, 'contested');
    // release + consensus + the one surviving distinct alternative
    assert.equal(lenses.length, 3);
    assert.deepEqual(lenses.map(l => l.kind), ['release', 'fan-consensus', 'alternative']);
  });
});

// --- shapeLenses: lens object shape ---------------------------------------

describe('shapeLenses lens shapes', () => {
  const included = [
    entry('a', '2020-01-01'),
    entry('b', '2021-01-01'),
    entry('c', '2022-01-01')
  ];

  it('consensus lens carries kind, label, sources from research and computed:false', () => {
    const research = { consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1', 's2'] }, alternatives: [] };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    const consensus = lenses[1];
    assert.equal(consensus.kind, 'fan-consensus');
    assert.equal(consensus.label, 'Fan order');
    assert.deepEqual(consensus.sources, ['s1', 's2']);
    assert.equal(consensus.computed, false);
  });

  it('alternative lens carries kind, label, sources and computed:false', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      alternatives: [{ label: 'Story order', order: ['a', 'c', 'b'], sources: ['s2'] }]
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    const alt = lenses[2];
    assert.equal(alt.kind, 'alternative');
    assert.equal(alt.label, 'Story order');
    assert.deepEqual(alt.sources, ['s2']);
    assert.equal(alt.computed, false);
  });

  it('alternatives appear in their input order', () => {
    const research = {
      consensus: { label: 'Fan order', order: ['c', 'b', 'a'], sources: ['s1'] },
      alternatives: [
        { label: 'First alt', order: ['a', 'c', 'b'], sources: [] },
        { label: 'Second alt', order: ['b', 'a', 'c'], sources: [] }
      ]
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.deepEqual(lenses.slice(2).map(l => l.label), ['First alt', 'Second alt']);
  });
});

// --- shapeLenses: permutation normalization -------------------------------

describe('shapeLenses normalization', () => {
  const included = [
    entry('a', '2020-01-01'),
    entry('b', '2021-01-01'),
    entry('c', '2022-01-01')
  ];

  it('drops ids from a researched order that are not in the included set', () => {
    const research = {
      consensus: { label: 'Has ghost', order: ['c', 'ghost', 'a', 'b'], sources: [] },
      alternatives: []
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.ok(!lenses[1].order.includes('ghost'));
    assert.deepEqual(lenses[1].order, ['c', 'a', 'b']);
  });

  it('appends included ids missing from the researched order, in release order', () => {
    // Researched order only mentions 'c'; a and b are missing.
    const research = {
      consensus: { label: 'Partial', order: ['c'], sources: [] },
      alternatives: []
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    // release order of included is [a, b, c]; missing-after-c are a then b.
    assert.deepEqual(lenses[1].order, ['c', 'a', 'b']);
  });

  it('both drops a non-included id and appends a missing included id', () => {
    // 'b' is missing, 'ghost' is foreign.
    const research = {
      consensus: { label: 'Messy', order: ['c', 'ghost', 'a'], sources: [] },
      alternatives: []
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.deepEqual(lenses[1].order, ['c', 'a', 'b']);
  });

  it('every lens order is a permutation of exactly the included ids', () => {
    const research = {
      consensus: { label: 'Partial', order: ['c', 'ghost'], sources: [] },
      alternatives: [{ label: 'Alt', order: ['b', 'phantom', 'a'], sources: [] }]
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    const expectedSet = idSet(['a', 'b', 'c']);
    for (const lens of lenses) {
      assert.equal(lens.order.length, 3);
      assert.deepEqual(idSet(lens.order), expectedSet);
    }
  });

  it('dedups a repeated included id so the result stays a permutation', () => {
    // Researched order repeats 'a' (e.g. two titles collapsing to one id); the
    // normalized order must still place each included id exactly once.
    const research = {
      consensus: { label: 'Dupes', order: ['a', 'a', 'b'], sources: [] },
      alternatives: []
    };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.equal(lenses[1].order.length, 3);
    assert.deepEqual(idSet(lenses[1].order), idSet(['a', 'b', 'c']));
    assert.deepEqual(lenses[1].order, ['a', 'b', 'c']);
  });

  it('an empty researched order normalizes to the full release order', () => {
    const research = { consensus: { label: 'Empty', order: [], sources: [] }, alternatives: [] };
    const { lenses } = shapeLenses({ includedEntries: included, research });
    assert.deepEqual(lenses[1].order, computeReleaseOrder(included));
  });
});

// --- shapeLenses: empty included set --------------------------------------

describe('shapeLenses with empty included set', () => {
  it('returns a single release lens with order [] and honesty thin', () => {
    const { lenses, honesty } = shapeLenses({
      includedEntries: [],
      research: { consensus: { label: 'x', order: ['a', 'b'], sources: [] }, alternatives: [] }
    });
    assert.equal(honesty, 'thin');
    assert.equal(lenses.length, 1);
    assert.equal(lenses[0].kind, 'release');
    assert.deepEqual(lenses[0].order, []);
    assert.equal(lenses[0].computed, true);
  });
});

// --- shapeLenses: purity ---------------------------------------------------

describe('shapeLenses purity', () => {
  it('does not mutate includedEntries, research, or the researched order arrays', () => {
    const included = [
      entry('a', '2020-01-01'),
      entry('b', '2021-01-01'),
      entry('c', '2022-01-01')
    ];
    const includedSnapshot = included.map(e => ({ ...e }));
    const includedOrderSnapshot = included.map(e => e.id);

    const consensusOrder = ['c', 'ghost', 'a'];
    const altOrder = ['b', 'a'];
    const research = {
      consensus: { label: 'Fan order', order: consensusOrder, sources: ['s1'] },
      alternatives: [{ label: 'Alt', order: altOrder, sources: ['s2'] }]
    };
    const consensusOrderSnapshot = [...consensusOrder];
    const altOrderSnapshot = [...altOrder];

    shapeLenses({ includedEntries: included, research });

    assert.deepEqual(included.map(e => e.id), includedOrderSnapshot);
    assert.deepEqual(included, includedSnapshot);
    assert.deepEqual(consensusOrder, consensusOrderSnapshot);
    assert.deepEqual(altOrder, altOrderSnapshot);
  });
});
