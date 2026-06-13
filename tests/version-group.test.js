import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSeries } from '../src/modules/parse-series.js';
import { validateDraft } from '../pipeline/validate-draft.js';
import { draftToSeriesData } from '../pipeline/draft-to-series-data.js';
import { mergeCuration } from '../pipeline/mergeCuration.js';
import { CURATION_FIELDS } from '../pipeline/curation-fields.js';

// Issue #53 — durable `versionGroup` key. ADR-0014:
//  - versionGroup is a string|null Entry field, default null, zero migration;
//  - type-validated (string or null) in BOTH gate layers, mirroring `excluded`;
//  - it is a CURATION field (preserved across update-series for existing entries),
//    while a research-proposed value on a genuinely-NEW entry survives the merge
//    (the new-entry asymmetry — the merge restores curation only onto existing);
//  - the publish whitelist carries it through (15 -> 16 fields).
// These specs are RED against unmodified source, EXCEPT the new-entry-asymmetry
// guard, which is GREEN already (the merge spreads new-entry fields verbatim) —
// it protects against a future mis-implementation that "restores" curation onto
// new entries and would wipe the proposed slug.

const validEntry = {
  id: 're1',
  title: 'Resident Evil (2002)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '2002-03-22',
  recommendedOrder: 1,
  recommendedReason: 'The definitive version of where it all began.',
  chronologicalOrder: 1,
  summary: 'S.T.A.R.S. Bravo Team investigates a mansion in the Arklay Mountains.',
  image: 'assets/re1.jpg',
  imageUrl: null,
  status: false,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)']
};

const validSeries = {
  slug: 'resident-evil',
  name: 'Resident Evil',
  entries: [validEntry]
};

describe('#53 versionGroup — publish GATE type validation (string|null)', () => {
  it('ACCEPTS a string versionGroup', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, versionGroup: 're1' }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `string versionGroup must validate: ${result.error}`);
  });

  it('ACCEPTS null versionGroup', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, versionGroup: null }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `null versionGroup must validate: ${result.error}`);
  });

  it('REJECTS a non-string, non-null versionGroup (e.g. a number)', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, id: 'bad', versionGroup: 42 }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, false, 'a numeric versionGroup must be rejected');
  });

  it('REJECTS an object versionGroup', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, id: 'bad', versionGroup: { slug: 're1' } }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, false, 'an object versionGroup must be rejected');
  });

  it('defaults an absent versionGroup to null on normalize (backward-compat)', () => {
    const result = parseSeries(JSON.stringify(validSeries));
    assert.equal(result.ok, true, result.error);
    assert.ok('versionGroup' in result.series.entries[0], 'normalized entry must carry versionGroup');
    assert.equal(result.series.entries[0].versionGroup, null);
  });

  it('preserves a string versionGroup through normalize', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, versionGroup: 're1' }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, result.error);
    assert.equal(result.series.entries[0].versionGroup, 're1');
  });
});

describe('#53 versionGroup — backward-compat: shipped data.json validates unchanged', () => {
  const reData = JSON.parse(readFileSync(
    new URL('../series/resident-evil/data.json', import.meta.url), 'utf8'
  ));

  it('still validates with no versionGroup field anywhere', () => {
    const result = parseSeries(JSON.stringify(reData));
    assert.equal(result.ok, true, `shipped data.json must validate unchanged: ${result.error}`);
  });

  it('normalizes every entry to versionGroup:null', () => {
    const result = parseSeries(JSON.stringify(reData));
    assert.equal(result.ok, true, result.error);
    for (const entry of result.series.entries) {
      assert.equal(entry.versionGroup, null, `entry ${entry.id} should default versionGroup:null`);
    }
  });
});

describe('#53 versionGroup — DRAFT-stage type validation (string|null)', () => {
  const draftEntry = (overrides) => ({
    id: 'x', title: 'X', medium: 'game', branch: 'mainline',
    recommendedOrder: 1, recommendedReason: 'r', summary: 's',
    sources: ['https://example.com'], status: false,
    confidence: 'high', confidenceReason: null, versionNote: null, sourceNotes: null,
    ...overrides
  });
  const draft = (entries) => ({
    slug: 's', name: 'S', orderRationale: 'r', incompleteMedia: [], entries
  });

  it('ACCEPTS a string versionGroup', () => {
    const result = validateDraft(draft([draftEntry({ versionGroup: 're1' })]));
    assert.equal(result.ok, true, `string versionGroup must validate in draft: ${result.error}`);
  });

  it('ACCEPTS null / absent versionGroup (backward-compat)', () => {
    const withNull = validateDraft(draft([draftEntry({ versionGroup: null })]));
    assert.equal(withNull.ok, true, `null versionGroup must validate: ${withNull.error}`);
    const absent = validateDraft(draft([draftEntry()])); // no versionGroup key
    assert.equal(absent.ok, true, `absent versionGroup must validate: ${absent.error}`);
  });

  it('REJECTS a non-string, non-null versionGroup', () => {
    const result = validateDraft(draft([draftEntry({ versionGroup: 42 })]));
    assert.equal(result.ok, false, 'draft gate must type-check versionGroup');
  });
});

describe('#53 versionGroup — curation preservation (versionGroup ∈ CURATION_FIELDS)', () => {
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
    versionGroup: 're1',
    ...overrides
  });

  it('lists versionGroup as a CURATION_FIELD', () => {
    assert.equal(CURATION_FIELDS.has('versionGroup'), true,
      'versionGroup must be a CURATION_FIELD so the merge preserves it');
  });

  // Decisive construction (mirrors excluded-entries.test.js): an accepted diff
  // tries to overwrite versionGroup; only if it is a CURATION_FIELD does the
  // restore loop win and keep the maintainer's slug. Re-research can never
  // dissolve or reshuffle an established group.
  it('preserves versionGroup on an existing entry even when an accepted diff tries to change it', () => {
    const existing = [mkEntry({ versionGroup: 're1' })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: { versionGroup: { old: 're1', new: 'resident-evil-1', accepted: true } }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);
    assert.equal(result[0].versionGroup, 're1', 'versionGroup is curation — research may not reshuffle it');
  });

  it('preserves versionGroup through an accepted change to an unrelated field', () => {
    const existing = [mkEntry({ versionGroup: 're1' })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: { summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'Updated.', accepted: true } }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);
    assert.equal(result[0].summary, 'Updated.');
    assert.equal(result[0].versionGroup, 're1');
  });

  it('preserves versionGroup on an unchanged entry', () => {
    const existing = [mkEntry({ versionGroup: 're1' })];
    const diff = { new: [], changed: [], unchanged: ['resident-evil-2002'] };
    const result = mergeCuration(existing, diff);
    assert.equal(result[0].versionGroup, 're1');
  });
});

describe('#53 versionGroup — NEW-ENTRY ASYMMETRY (research-proposed slug survives the merge)', () => {
  // ADR-0014: the merge restores curation ONLY onto existing entries, so a
  // research-proposed versionGroup on a GENUINELY-NEW entry (the `new` bucket)
  // must survive — seeding the card for a freshly-released remaster of an
  // already-tracked work. GREEN against current source (new entries are spread
  // verbatim); this guards against a mis-implementation that restores curation
  // onto new entries and would wipe the proposed slug to null.
  it('keeps a research-proposed versionGroup on a new entry through mergeCuration', () => {
    const newRemaster = {
      id: 're1-remaster',
      title: 'Resident Evil HD Remaster',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '2015-01-20',
      summary: 'A high-definition remaster of the 1996/2002 game.',
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)'],
      versionGroup: 're1'
    };
    const diff = { new: [newRemaster], changed: [], unchanged: [] };
    const result = mergeCuration([], diff);
    assert.equal(result.length, 1);
    assert.equal(result[0].versionGroup, 're1',
      'a research-proposed slug on a new entry must survive (new-entry asymmetry)');
    assert.equal(result[0].status, false, 'new entries still default to unwatched');
  });
});

describe('#53 versionGroup — PUBLISH whitelist carries it through', () => {
  const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
  const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

  it('carries a string versionGroup through the projection', () => {
    const entries = validDraft.entries.map((e, i) =>
      i === 0 ? { ...e, versionGroup: 're1' } : e
    );
    const data = draftToSeriesData({ ...validDraft, entries });
    const projected = data.entries[0];
    assert.ok('versionGroup' in projected, 'whitelist must include versionGroup');
    assert.equal(projected.versionGroup, 're1');
  });

  it('defaults an absent versionGroup to null in the projection', () => {
    const entries = validDraft.entries.map(e => {
      const { versionGroup, ...rest } = e; // strip any versionGroup
      return rest;
    });
    const data = draftToSeriesData({ ...validDraft, entries });
    for (const entry of data.entries) {
      assert.ok('versionGroup' in entry, `entry ${entry.id} should carry versionGroup`);
      assert.equal(entry.versionGroup, null, `entry ${entry.id} should default to null`);
    }
  });
});
