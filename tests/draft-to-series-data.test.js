import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { draftToSeriesData } from '../pipeline/draft-to-series-data.js';
import { parseSeries } from '../src/modules/parse-series.js';

const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('draftToSeriesData', () => {
  it('produces a data object with slug, name, and entries', () => {
    const data = draftToSeriesData(validDraft);
    assert.equal(data.slug, 'resident-evil');
    assert.equal(data.name, 'Resident Evil');
    assert.equal(data.entries.length, 7);
  });

  it('strips review-only fields from entries', () => {
    const data = draftToSeriesData(validDraft);
    for (const entry of data.entries) {
      assert.equal('confidence' in entry, false);
      assert.equal('confidenceReason' in entry, false);
      assert.equal('versionNote' in entry, false);
      assert.equal('sourceNotes' in entry, false);
    }
  });

  it('strips top-level review-only fields', () => {
    const data = draftToSeriesData(validDraft);
    assert.equal('orderRationale' in data, false);
    assert.equal('incompleteMedia' in data, false);
  });

  it('drops every _-prefixed scratch field, top-level and per-entry (#40 lenses / #47 pairings)', () => {
    const draft = {
      ...validDraft,
      _orderResearch: { consensus: { label: 'Fan order', order: [], sources: ['x'] }, alternatives: [] },
      _pairings: [{ originalId: 'a', remakeId: 'b', note: 'remake' }],
      entries: validDraft.entries.map(e => ({ ...e, _mergeStatus: 'new', _drop: false, _proposedSummary: 'x', _proposedReason: 'thin honest one-liner', _orderDriftDismissed: true })),
    };
    const data = draftToSeriesData(draft);
    assert.equal('_orderResearch' in data, false);
    assert.equal('_pairings' in data, false);
    assert.equal(Object.keys(data).every(k => !k.startsWith('_')), true);
    for (const entry of data.entries) {
      assert.equal(Object.keys(entry).some(k => k.startsWith('_')), false, `entry ${entry.id} leaked a _ field`);
      assert.equal('_proposedReason' in entry, false, `entry ${entry.id} leaked _proposedReason past Projection`);
    }
  });

  // ADR-0015 GATE-HONESTY: a _proposedReason is scratch, stripped by Projection BEFORE
  // the publish gate runs, so it is structurally incapable of satisfying the gate. An
  // entry with a blank recommendedReason + a proposal must still FAIL parseSeries — and
  // fail specifically on recommendedReason, proving the proposal didn't sneak through.
  it('a _proposedReason cannot satisfy the gate — blank recommendedReason still fails (GATE-BACKSTOP)', () => {
    const badEntry = {
      ...validDraft.entries[0],          // a known gate-valid entry shape
      recommendedReason: '',             // blank authored reason
      _proposedReason: 'something',      // scratch proposal — must NOT count
    };
    // First so parseSeries's first-error-wins returns this entry's reason error.
    const draft = { ...validDraft, entries: [badEntry, ...validDraft.entries.slice(1)] };

    const data = draftToSeriesData(draft);
    const result = parseSeries(JSON.stringify(data));

    assert.equal(result.ok, false, 'a blank reason must fail the gate even with a proposal present');
    assert.match(result.error, /recommendedReason/, `expected a recommendedReason error, got: ${result.error}`);
  });

  it('preserves all 16 data.json fields per entry', () => {
    const data = draftToSeriesData(validDraft);
    const entry = data.entries[0];
    const expectedFields = [
      'id', 'title', 'medium', 'branch', 'releaseDate',
      'recommendedOrder', 'recommendedReason', 'chronologicalOrder', 'loreDate',
      'summary', 'image', 'imageUrl', 'status', 'excluded', 'versionGroup', 'sources'
    ];
    for (const field of expectedFields) {
      assert.ok(field in entry, `entry should have "${field}"`);
    }
    assert.equal(Object.keys(entry).length, 16);
  });

  it('carries loreDate through, defaulting absent to null', () => {
    const entries = [
      { ...validDraft.entries[0], id: 'has-lore', loreDate: '1998-09' },
      { ...validDraft.entries[1], id: 'no-lore' },  // loreDate absent
    ];
    const data = draftToSeriesData({ ...validDraft, entries });
    assert.equal(data.entries.find(e => e.id === 'has-lore').loreDate, '1998-09');
    assert.equal(data.entries.find(e => e.id === 'no-lore').loreDate, null);
  });

  it('output passes parseSeries validation', () => {
    const data = draftToSeriesData(validDraft);
    const result = parseSeries(JSON.stringify(data));
    assert.equal(result.ok, true, `parseSeries failed: ${result.error}`);
  });

  it('preserves entry field values faithfully', () => {
    const data = draftToSeriesData(validDraft);
    const entry = data.entries.find(e => e.id === 'resident-evil-2-2019');
    assert.equal(entry.title, 'Resident Evil 2 (2019)');
    assert.equal(entry.medium, 'game');
    assert.equal(entry.branch, 'mainline');
    assert.equal(entry.releaseDate, '2019-01-25');
    assert.equal(entry.recommendedOrder, 3);
    assert.equal(entry.status, false);
  });
});
