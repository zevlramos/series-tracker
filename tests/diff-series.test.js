import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffSeries } from '../pipeline/diffSeries.js';

const baseEntry = {
  id: 'resident-evil-2002',
  title: 'Resident Evil (2002)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '2002-03-22',
  recommendedOrder: 1,
  recommendedReason: 'The definitive starting point.',
  chronologicalOrder: 2,
  summary: 'S.T.A.R.S. investigates a mansion.',
  image: null,
  imageUrl: null,
  status: true,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)']
};

const freshMatch = {
  title: 'Resident Evil (2002)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '2002-03-22',
  summary: 'S.T.A.R.S. investigates a mansion.',
  image: null,
  imageUrl: null,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)']
};

describe('diffSeries', () => {
  it('marks an aligned entry with no field changes as unchanged', () => {
    const existing = [baseEntry];
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: freshMatch }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
    assert.deepStrictEqual(result.changed, []);
    assert.deepStrictEqual(result.new, []);
  });

  it('detects field-level changes on a matched entry', () => {
    const existing = [baseEntry];
    const changed = { ...freshMatch, summary: 'Updated summary text.' };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.equal(result.changed.length, 1);
    assert.equal(result.changed[0].existingId, 'resident-evil-2002');
    assert.deepStrictEqual(result.changed[0].fields.summary, {
      old: 'S.T.A.R.S. investigates a mansion.',
      new: 'Updated summary text.'
    });
    assert.equal(result.unchanged.length, 0);
  });

  it('never includes status in the diff — curation is preserved', () => {
    const existing = [{ ...baseEntry, status: true }];
    const changed = { ...freshMatch, status: false };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
    assert.equal(result.changed.length, 0);
  });

  it('never includes recommendedOrder in the diff', () => {
    const existing = [baseEntry];
    const changed = { ...freshMatch, recommendedOrder: 99 };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
  });

  it('never includes recommendedReason in the diff', () => {
    const existing = [baseEntry];
    const changed = { ...freshMatch, recommendedReason: 'New reason text.' };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
  });

  it('categorizes unmatched fresh entries as new', () => {
    const existing = [baseEntry];
    const newEntry = {
      id: 'resident-evil-5',
      title: 'Resident Evil 5',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '2009-03-05',
      summary: 'Chris and Sheva fight bioterrorism in Africa.',
      image: null,
      imageUrl: null,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5']
    };
    const alignment = {
      matches: [{ existingId: 'resident-evil-2002', freshEntry: freshMatch }],
      unmatched: [newEntry]
    };
    const result = diffSeries(existing, alignment);

    assert.equal(result.new.length, 1);
    assert.equal(result.new[0].id, 'resident-evil-5');
  });

  it('detects multiple field changes on one entry', () => {
    const existing = [baseEntry];
    const changed = { ...freshMatch, releaseDate: '2002-03-25', branch: 'spinoff' };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.equal(result.changed.length, 1);
    assert.ok(result.changed[0].fields.releaseDate);
    assert.ok(result.changed[0].fields.branch);
    assert.equal(Object.keys(result.changed[0].fields).length, 2);
  });

  it('handles multiple entries across all categories', () => {
    const entry2 = {
      ...baseEntry,
      id: 'resident-evil-0',
      title: 'Resident Evil 0',
      summary: 'Rebecca and Billy investigate.',
      recommendedOrder: 2
    };
    const existing = [baseEntry, entry2];

    const alignment = {
      matches: [
        { existingId: 'resident-evil-2002', freshEntry: freshMatch },
        { existingId: 'resident-evil-0', freshEntry: { ...freshMatch, title: 'Resident Evil 0', summary: 'Updated RE0 summary.' } }
      ],
      unmatched: [{
        id: 'resident-evil-5',
        title: 'Resident Evil 5',
        medium: 'game',
        branch: 'mainline',
        releaseDate: '2009-03-05',
        summary: 'Chris in Africa.',
        image: null,
        imageUrl: null,
        sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5']
      }]
    };

    const result = diffSeries(existing, alignment);
    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
    assert.equal(result.changed.length, 1);
    assert.equal(result.changed[0].existingId, 'resident-evil-0');
    assert.equal(result.new.length, 1);
  });

  it('ignores chronologicalOrder in the diff (curation field)', () => {
    const existing = [baseEntry];
    const changed = { ...freshMatch, chronologicalOrder: 999 };
    const alignment = { matches: [{ existingId: 'resident-evil-2002', freshEntry: changed }], unmatched: [] };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-2002']);
  });
});
