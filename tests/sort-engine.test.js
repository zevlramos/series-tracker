import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { availableSorts, sortEntries } from '../src/modules/sort-engine.js';

const baseEntry = {
  id: 'a',
  title: 'A',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '2020-01-01',
  recommendedOrder: 1,
  recommendedReason: 'First.',
  chronologicalOrder: 2,
  summary: 'Test.',
  image: null,
  imageUrl: null,
  status: false,
  sources: []
};

function makeEntries(overrides) {
  return overrides.map((o, i) => ({ ...baseEntry, id: `e${i}`, ...o }));
}

describe('availableSorts', () => {
  it('always includes recommended', () => {
    const series = { entries: [baseEntry] };
    assert.ok(availableSorts(series).includes('recommended'));
  });

  describe('release (gate unchanged — all-or-nothing)', () => {
    it('includes release when all entries have releaseDate', () => {
      const entries = makeEntries([{ releaseDate: '2020-01-01' }, { releaseDate: '2021-06-15' }]);
      assert.ok(availableSorts({ entries }).includes('release'));
    });

    it('excludes release when any entry lacks releaseDate', () => {
      const entries = makeEntries([{ releaseDate: '2020-01-01' }, { releaseDate: null }]);
      assert.ok(!availableSorts({ entries }).includes('release'));
    });
  });

  describe('chronological (offered when ≥1 entry has a rank)', () => {
    it('includes chronological when every entry has a chronologicalOrder', () => {
      const entries = makeEntries([{ chronologicalOrder: 1 }, { chronologicalOrder: 2 }]);
      assert.ok(availableSorts({ entries }).includes('chronological'));
    });

    it('includes chronological when only SOME entries have a rank', () => {
      const entries = makeEntries([
        { chronologicalOrder: 1 },
        { chronologicalOrder: null },
        { chronologicalOrder: null }
      ]);
      assert.ok(availableSorts({ entries }).includes('chronological'));
    });

    it('includes chronological when exactly one entry has a rank', () => {
      const entries = makeEntries([
        { chronologicalOrder: null },
        { chronologicalOrder: null },
        { chronologicalOrder: 5 }
      ]);
      assert.ok(availableSorts({ entries }).includes('chronological'));
    });

    it('excludes chronological when NO entry has a rank', () => {
      const entries = makeEntries([{ chronologicalOrder: null }, { chronologicalOrder: null }]);
      assert.ok(!availableSorts({ entries }).includes('chronological'));
    });

    it('treats rank 0 as a real rank (offers chronological)', () => {
      const entries = makeEntries([{ chronologicalOrder: 0 }, { chronologicalOrder: null }]);
      assert.ok(availableSorts({ entries }).includes('chronological'));
    });
  });

  it('returns all three when data is complete', () => {
    const entries = makeEntries([
      { releaseDate: '2020-01-01', chronologicalOrder: 1 },
      { releaseDate: '2021-01-01', chronologicalOrder: 2 }
    ]);
    assert.deepEqual(availableSorts({ entries }), ['recommended', 'release', 'chronological']);
  });
});

describe('sortEntries', () => {
  it('sorts by recommendedOrder', () => {
    const entries = makeEntries([{ recommendedOrder: 3 }, { recommendedOrder: 1 }, { recommendedOrder: 2 }]);
    const sorted = sortEntries(entries, 'recommended');
    assert.deepEqual(sorted.map(e => e.recommendedOrder), [1, 2, 3]);
  });

  it('sorts by releaseDate ascending', () => {
    const entries = makeEntries([
      { releaseDate: '2023-01-01' },
      { releaseDate: '2019-06-15' },
      { releaseDate: '2021-03-22' }
    ]);
    const sorted = sortEntries(entries, 'release');
    assert.deepEqual(sorted.map(e => e.releaseDate), ['2019-06-15', '2021-03-22', '2023-01-01']);
  });

  describe('chronological', () => {
    it('sorts ranked entries by chronologicalOrder ascending', () => {
      const entries = makeEntries([
        { chronologicalOrder: 3 },
        { chronologicalOrder: 1 },
        { chronologicalOrder: 2 }
      ]);
      const sorted = sortEntries(entries, 'chronological');
      assert.deepEqual(sorted.map(e => e.chronologicalOrder), [1, 2, 3]);
    });

    it('places null-rank entries last, keeping ranked entries ascending', () => {
      const entries = makeEntries([
        { id: 'x', chronologicalOrder: null },
        { id: 'y', chronologicalOrder: 2 },
        { id: 'z', chronologicalOrder: null },
        { id: 'w', chronologicalOrder: 1 }
      ]);
      const sorted = sortEntries(entries, 'chronological');
      assert.deepEqual(sorted.slice(0, 2).map(e => e.chronologicalOrder), [1, 2]);
      assert.equal(sorted[2].chronologicalOrder, null);
      assert.equal(sorted[3].chronologicalOrder, null);
    });

    it('handles all-null ranks without error (nulls are last by definition)', () => {
      const entries = makeEntries([{ chronologicalOrder: null }, { chronologicalOrder: null }]);
      const sorted = sortEntries(entries, 'chronological');
      assert.equal(sorted.length, 2);
      assert.ok(sorted.every(e => e.chronologicalOrder === null));
    });

    it('treats rank 0 as a real rank, sorting it before null-rank entries', () => {
      const entries = makeEntries([
        { id: 'n', chronologicalOrder: null },
        { id: 'zero', chronologicalOrder: 0 },
        { id: 'one', chronologicalOrder: 1 }
      ]);
      const sorted = sortEntries(entries, 'chronological');
      assert.deepEqual(sorted.map(e => e.chronologicalOrder), [0, 1, null]);
    });
  });

  it('does not mutate the original array', () => {
    const entries = makeEntries([{ recommendedOrder: 3 }, { recommendedOrder: 1 }]);
    const original = [...entries];
    sortEntries(entries, 'recommended');
    assert.deepEqual(entries.map(e => e.id), original.map(e => e.id));
  });
});
