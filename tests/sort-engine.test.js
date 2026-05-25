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
    const sorts = availableSorts(series);
    assert.ok(sorts.includes('recommended'));
  });

  it('includes release when all entries have releaseDate', () => {
    const entries = makeEntries([
      { releaseDate: '2020-01-01' },
      { releaseDate: '2021-06-15' }
    ]);
    const sorts = availableSorts({ entries });
    assert.ok(sorts.includes('release'));
  });

  it('excludes release when any entry lacks releaseDate', () => {
    const entries = makeEntries([
      { releaseDate: '2020-01-01' },
      { releaseDate: null }
    ]);
    const sorts = availableSorts({ entries });
    assert.ok(!sorts.includes('release'));
  });

  it('includes chronological when all entries have chronologicalOrder', () => {
    const entries = makeEntries([
      { chronologicalOrder: 1 },
      { chronologicalOrder: 2 }
    ]);
    const sorts = availableSorts({ entries });
    assert.ok(sorts.includes('chronological'));
  });

  it('excludes chronological when any entry lacks chronologicalOrder', () => {
    const entries = makeEntries([
      { chronologicalOrder: 1 },
      { chronologicalOrder: null }
    ]);
    const sorts = availableSorts({ entries });
    assert.ok(!sorts.includes('chronological'));
  });

  it('returns all three when data is complete', () => {
    const entries = makeEntries([
      { releaseDate: '2020-01-01', chronologicalOrder: 1 },
      { releaseDate: '2021-01-01', chronologicalOrder: 2 }
    ]);
    const sorts = availableSorts({ entries });
    assert.deepEqual(sorts, ['recommended', 'release', 'chronological']);
  });
});

describe('sortEntries', () => {
  it('sorts by recommendedOrder', () => {
    const entries = makeEntries([
      { recommendedOrder: 3 },
      { recommendedOrder: 1 },
      { recommendedOrder: 2 }
    ]);
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

  it('sorts by chronologicalOrder ascending', () => {
    const entries = makeEntries([
      { chronologicalOrder: 3 },
      { chronologicalOrder: 1 },
      { chronologicalOrder: 2 }
    ]);
    const sorted = sortEntries(entries, 'chronological');
    assert.deepEqual(sorted.map(e => e.chronologicalOrder), [1, 2, 3]);
  });

  it('does not mutate the original array', () => {
    const entries = makeEntries([
      { recommendedOrder: 3 },
      { recommendedOrder: 1 }
    ]);
    const original = [...entries];
    sortEntries(entries, 'recommended');
    assert.deepEqual(entries.map(e => e.id), original.map(e => e.id));
  });
});
