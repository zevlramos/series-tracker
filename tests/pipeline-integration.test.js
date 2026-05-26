import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDraft } from '../pipeline/validate-draft.js';
import { draftToSeriesData } from '../pipeline/draft-to-series-data.js';
import { renderSeriesIndex } from '../pipeline/render-series-index.js';
import { parseSeries } from '../src/modules/parse-series.js';

const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('pipeline integration (Draft → Shell-ready output)', () => {
  it('RE Draft validates, projects to data.json, passes parseSeries gate', () => {
    const validation = validateDraft(validDraft);
    assert.equal(validation.ok, true);

    const data = draftToSeriesData(validation.draft);
    const parseResult = parseSeries(JSON.stringify(data));
    assert.equal(parseResult.ok, true, `parseSeries failed: ${parseResult.error}`);
    assert.equal(parseResult.series.slug, 'resident-evil');
    assert.equal(parseResult.series.entries.length, 7);
  });

  it('renderSeriesIndex produces HTML matching the golden seed structure', () => {
    const html = renderSeriesIndex(validDraft.name);
    assert.ok(html.includes('<title>Resident Evil — Series Tracker</title>'));
    assert.ok(html.includes("initShell(document.getElementById('app'), '.')"));
  });

  it('fail-closed: invalid Draft aborts before producing data', () => {
    const badDraft = { ...validDraft, entries: [{ ...validDraft.entries[0], medium: 'boardgame' }] };
    const validation = validateDraft(badDraft);
    assert.equal(validation.ok, false);
  });

  it('fail-closed: if draftToSeriesData output is manually corrupted, parseSeries catches it', () => {
    const data = draftToSeriesData(validDraft);
    data.entries[0].medium = 'invalid';
    const parseResult = parseSeries(JSON.stringify(data));
    assert.equal(parseResult.ok, false);
  });
});
