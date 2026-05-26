import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderDraftMarkdown } from '../pipeline/render-draft-markdown.js';

const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('renderDraftMarkdown', () => {
  it('renders the RE golden fixture without error', () => {
    const md = renderDraftMarkdown(validDraft);
    assert.ok(md.includes('# Resident Evil — Draft'));
    assert.ok(md.includes('**Slug:** `resident-evil`'));
  });

  it('includes the order rationale', () => {
    const md = renderDraftMarkdown(validDraft);
    assert.ok(md.includes(validDraft.orderRationale));
  });

  it('includes every entry title', () => {
    const md = renderDraftMarkdown(validDraft);
    for (const entry of validDraft.entries) {
      assert.ok(md.includes(entry.title), `missing title: ${entry.title}`);
    }
  });

  it('includes source URLs', () => {
    const md = renderDraftMarkdown(validDraft);
    for (const entry of validDraft.entries) {
      for (const source of entry.sources) {
        assert.ok(md.includes(source), `missing source: ${source}`);
      }
    }
  });

  it('includes version notes where present', () => {
    const md = renderDraftMarkdown(validDraft);
    const remakeEntry = validDraft.entries.find(e => e.versionNote);
    assert.ok(remakeEntry, 'fixture should have at least one entry with versionNote');
    assert.ok(md.includes(remakeEntry.versionNote));
  });

  it('surfaces low-confidence entries in "Needs review" section', () => {
    const entries = validDraft.entries.map((e, i) =>
      i === 0 ? { ...e, confidence: 'low', confidenceReason: 'Single weak source' } : e
    );
    const draft = { ...validDraft, entries };
    const md = renderDraftMarkdown(draft);
    assert.ok(md.includes('## Needs review (1)'));
    assert.ok(md.includes('low confidence — Single weak source'));
  });

  it('surfaces entries with only low-trust sources in "Needs review"', () => {
    const entries = validDraft.entries.map((e, i) =>
      i === 0 ? { ...e, sources: ['https://www.reddit.com/r/gaming/some-post'] } : e
    );
    const draft = { ...validDraft, entries };
    const md = renderDraftMarkdown(draft);
    assert.ok(md.includes('## Needs review (1)'));
    assert.ok(md.includes('only low-trust sources'));
  });

  it('shows incomplete media warning when present', () => {
    const draft = { ...validDraft, incompleteMedia: ['novel', 'comic'] };
    const md = renderDraftMarkdown(draft);
    assert.ok(md.includes('**Incomplete media:** novel, comic'));
  });

  it('omits incomplete media section when empty', () => {
    const md = renderDraftMarkdown(validDraft);
    assert.ok(!md.includes('Incomplete media'));
  });

  it('all-high-confidence draft has no "Needs review" section', () => {
    const md = renderDraftMarkdown(validDraft);
    assert.ok(!md.includes('Needs review'));
  });

  it('shows recommended order number before each title', () => {
    const md = renderDraftMarkdown(validDraft);
    assert.ok(md.includes('### 1. Resident Evil (2002)'));
    assert.ok(md.includes('### 3. Resident Evil 2 (2019)'));
  });

  it('shows sourceNotes on non-flagged entries', () => {
    const md = renderDraftMarkdown(validDraft);
    const entryWithNotes = validDraft.entries.find(e => e.sourceNotes && e.confidence === 'high');
    assert.ok(entryWithNotes, 'fixture should have a high-confidence entry with sourceNotes');
    assert.ok(md.includes(`**Source notes:** ${entryWithNotes.sourceNotes}`));
  });
});
