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

  it('preserves all 13 data.json fields per entry', () => {
    const data = draftToSeriesData(validDraft);
    const entry = data.entries[0];
    const expectedFields = [
      'id', 'title', 'medium', 'branch', 'releaseDate',
      'recommendedOrder', 'recommendedReason', 'chronologicalOrder',
      'summary', 'image', 'imageUrl', 'status', 'sources'
    ];
    for (const field of expectedFields) {
      assert.ok(field in entry, `entry should have "${field}"`);
    }
    assert.equal(Object.keys(entry).length, 13);
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
