import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mergeCuration } from '../pipeline/mergeCuration.js';
import { parseSeries } from '../src/modules/parse-series.js';
import { planReasonFill } from '../src/modules/reason-fill.js';

const mkEntry = (overrides) => ({
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
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)'],
  ...overrides
});

describe('mergeCuration', () => {
  it('preserves status on unchanged entries', () => {
    const existing = [mkEntry({ status: true })];
    const diff = { new: [], changed: [], unchanged: ['resident-evil-2002'] };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].status, true);
  });

  it('preserves recommendedOrder on unchanged entries', () => {
    const existing = [mkEntry({ recommendedOrder: 42 })];
    const diff = { new: [], changed: [], unchanged: ['resident-evil-2002'] };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].recommendedOrder, 42);
  });

  it('preserves recommendedReason on unchanged entries', () => {
    const existing = [mkEntry({ recommendedReason: 'My custom reason.' })];
    const diff = { new: [], changed: [], unchanged: ['resident-evil-2002'] };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].recommendedReason, 'My custom reason.');
  });

  it('applies accepted field changes from diff', () => {
    const existing = [mkEntry()];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'Updated summary.', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].summary, 'Updated summary.');
  });

  it('rejects field changes when accepted is false', () => {
    const existing = [mkEntry()];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'Updated summary.', accepted: false }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].summary, 'S.T.A.R.S. investigates a mansion.');
  });

  it('preserves status even on changed entries', () => {
    const existing = [mkEntry({ status: true })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          releaseDate: { old: '2002-03-22', new: '2002-03-25', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].status, true);
    assert.equal(result[0].releaseDate, '2002-03-25');
  });

  it('preserves recommendedOrder and recommendedReason on changed entries', () => {
    const existing = [mkEntry({ recommendedOrder: 7, recommendedReason: 'Custom placement.' })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          branch: { old: 'mainline', new: 'spinoff', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].recommendedOrder, 7);
    assert.equal(result[0].recommendedReason, 'Custom placement.');
  });

  // ADR-0015: the reason producer over a MERGED set. mergeCuration PRESERVES authored
  // reasons on existing entries and leaves new entries' reasons as authored-or-blank.
  // A research pass then attaches _proposedReason scratch. planReasonFill must target
  // ONLY the entries whose recommendedReason is empty (new/blank) — NEVER the authored
  // ones mergeCuration preserved. This is the never-clobber property over a real merge.
  describe('planReasonFill over a merged set (ADR-0015 producer)', () => {
    it('targets only blank reasons, never the authored ones mergeCuration preserved', () => {
      const existing = [mkEntry({ id: 'kept', recommendedReason: 'Maintainer wrote this.' })];
      const newEntry = {
        id: 'fresh',
        title: 'Resident Evil 5',
        medium: 'game',
        branch: 'mainline',
        releaseDate: '2009-03-05',
        recommendedOrder: 2,
        recommendedReason: '',                 // new entry — blank reason (the #41 wall)
        chronologicalOrder: null,
        summary: 'Chris and Sheva fight bioterrorism in Africa.',
        image: null,
        imageUrl: null,
        status: false,
        sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5'],
      };
      const diff = { new: [newEntry], changed: [], unchanged: ['kept'] };

      const merged = mergeCuration(existing, diff);

      // Simulate the research pass attaching scratch proposals to every entry.
      const researched = merged.map(e => ({ ...e, _proposedReason: 'thin honest one-liner' }));

      const plan = planReasonFill(researched);

      assert.deepEqual(plan, [{ id: 'fresh', value: 'thin honest one-liner' }]);
      assert.equal(plan.some(p => p.id === 'kept'), false, 'planReasonFill must not target the preserved authored reason');
    });
  });

  it('places approved new entries at their specified position', () => {
    const existing = [mkEntry({ recommendedOrder: 1 })];
    const newEntry = {
      id: 'resident-evil-5',
      title: 'Resident Evil 5',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '2009-03-05',
      recommendedOrder: 2,
      recommendedReason: "Continues Chris's story after RE4.",
      chronologicalOrder: null,
      summary: 'Chris and Sheva fight bioterrorism in Africa.',
      image: null,
      imageUrl: null,
      status: false,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5']
    };
    const diff = {
      new: [newEntry],
      changed: [],
      unchanged: ['resident-evil-2002']
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result.length, 2);
    const re5 = result.find(e => e.id === 'resident-evil-5');
    assert.ok(re5);
    assert.equal(re5.status, false);
    assert.equal(re5.recommendedOrder, 2);
  });

  it('handles mix of accepted and rejected fields on one entry', () => {
    const existing = [mkEntry()];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'New summary.', accepted: true },
          releaseDate: { old: '2002-03-22', new: '2002-01-01', accepted: false },
          branch: { old: 'mainline', new: 'spinoff', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].summary, 'New summary.');
    assert.equal(result[0].releaseDate, '2002-03-22');
    assert.equal(result[0].branch, 'spinoff');
  });

  it('applies an accepted loreDate while preserving chronologicalOrder and status', () => {
    const existing = [mkEntry({ loreDate: '1998', chronologicalOrder: 2, status: true })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          loreDate: { old: '1998', new: '1998-09', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].loreDate, '1998-09');     // diffed fact applied
    assert.equal(result[0].chronologicalOrder, 2);    // curation rank preserved
    assert.equal(result[0].status, true);             // curation preserved
  });

  it('keeps the existing loreDate when the delta is rejected', () => {
    const existing = [mkEntry({ loreDate: '1998', chronologicalOrder: 2 })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          loreDate: { old: '1998', new: '1998-09', accepted: false }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);

    assert.equal(result[0].loreDate, '1998');
    assert.equal(result[0].chronologicalOrder, 2);
  });

  it('output passes parseSeries when wrapped in a series envelope', () => {
    const existing = [mkEntry()];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'Updated.', accepted: true }
        }
      }],
      unchanged: []
    };
    const merged = mergeCuration(existing, diff);
    const series = { slug: 'resident-evil', name: 'Resident Evil', entries: merged };
    const parseResult = parseSeries(JSON.stringify(series));

    assert.ok(parseResult.ok, `parseSeries rejected: ${parseResult.error}`);
  });

  it('every existing entry survives when alignment is complete', () => {
    const entries = [
      mkEntry({ id: 'a', recommendedOrder: 1 }),
      mkEntry({ id: 'b', recommendedOrder: 2, title: 'Entry B' }),
      mkEntry({ id: 'c', recommendedOrder: 3, title: 'Entry C', status: true })
    ];
    const diff = {
      new: [],
      changed: [],
      unchanged: ['a', 'b', 'c']
    };
    const result = mergeCuration(entries, diff);
    assert.equal(result.length, 3);
    for (const original of entries) {
      assert.ok(result.find(e => e.id === original.id), `entry ${original.id} was dropped`);
    }
  });

  it('forces status to false on new entries even if input has status true', () => {
    const existing = [mkEntry()];
    const newEntry = {
      id: 'resident-evil-5',
      title: 'Resident Evil 5',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '2009-03-05',
      recommendedOrder: 2,
      recommendedReason: 'After RE4.',
      chronologicalOrder: null,
      summary: 'Chris in Africa.',
      image: null,
      imageUrl: null,
      status: true,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5']
    };
    const diff = { new: [newEntry], changed: [], unchanged: ['resident-evil-2002'] };
    const result = mergeCuration(existing, diff);
    const re5 = result.find(e => e.id === 'resident-evil-5');
    assert.equal(re5.status, false);
  });

  describe('resident-evil fixture', () => {
    const reData = JSON.parse(readFileSync(
      new URL('../series/resident-evil/data.json', import.meta.url), 'utf8'
    ));

    it('preserves all status, recommendedOrder, and recommendedReason through a no-change merge', () => {
      const diff = {
        new: [],
        changed: [],
        unchanged: reData.entries.map(e => e.id)
      };
      const result = mergeCuration(reData.entries, diff);

      for (const original of reData.entries) {
        const merged = result.find(e => e.id === original.id);
        assert.ok(merged, `missing entry ${original.id}`);
        assert.equal(merged.status, original.status, `status changed for ${original.id}`);
        assert.equal(merged.recommendedOrder, original.recommendedOrder, `recommendedOrder changed for ${original.id}`);
        assert.equal(merged.recommendedReason, original.recommendedReason, `recommendedReason changed for ${original.id}`);
      }
    });

    it('applies accepted changes and preserves curation on resident-evil fixture', () => {
      const diff = {
        new: [{
          id: 'resident-evil-5',
          title: 'Resident Evil 5',
          medium: 'game',
          branch: 'mainline',
          releaseDate: '2009-03-05',
          recommendedOrder: 8,
          recommendedReason: "Continues Chris's story in Africa.",
          chronologicalOrder: null,
          summary: 'Chris and Sheva fight bioterrorism in Kijuju.',
          image: null,
          imageUrl: null,
          status: false,
          sources: ['https://en.wikipedia.org/wiki/Resident_Evil_5']
        }],
        changed: [{
          existingId: 'resident-evil-degeneration',
          fields: {
            summary: {
              old: reData.entries.find(e => e.id === 'resident-evil-degeneration').summary,
              new: 'Updated Degeneration summary.',
              accepted: true
            }
          }
        }],
        unchanged: reData.entries.filter(e => e.id !== 'resident-evil-degeneration').map(e => e.id)
      };

      const result = mergeCuration(reData.entries, diff);

      assert.equal(result.length, reData.entries.length + 1);

      const degen = result.find(e => e.id === 'resident-evil-degeneration');
      assert.equal(degen.summary, 'Updated Degeneration summary.');
      assert.equal(degen.status, false);
      assert.equal(degen.recommendedOrder, reData.entries.find(e => e.id === 'resident-evil-degeneration').recommendedOrder);
      assert.equal(degen.recommendedReason, reData.entries.find(e => e.id === 'resident-evil-degeneration').recommendedReason);

      const re5 = result.find(e => e.id === 'resident-evil-5');
      assert.ok(re5);
      assert.equal(re5.status, false);

      for (const original of reData.entries.filter(e => e.id !== 'resident-evil-degeneration')) {
        const merged = result.find(e => e.id === original.id);
        assert.equal(merged.status, original.status);
        assert.equal(merged.recommendedOrder, original.recommendedOrder);
        assert.equal(merged.recommendedReason, original.recommendedReason);
      }

      const series = { slug: 'resident-evil', name: 'Resident Evil', entries: result };
      const parseResult = parseSeries(JSON.stringify(series));
      assert.ok(parseResult.ok, `parseSeries rejected merged output: ${parseResult.error}`);
    });
  });
});
