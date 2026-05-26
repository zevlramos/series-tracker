import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateDraft } from '../pipeline/validate-draft.js';

const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('validateDraft', () => {
  describe('valid input', () => {
    it('accepts the RE golden fixture draft', () => {
      const result = validateDraft(validDraft);
      assert.equal(result.ok, true);
      assert.deepEqual(result.draft, validDraft);
    });

    it('accepts a draft with incompleteMedia entries', () => {
      const draft = { ...validDraft, incompleteMedia: ['novel'] };
      const result = validateDraft(draft);
      assert.equal(result.ok, true);
    });

    it('accepts a low-confidence entry with a reason', () => {
      const entries = [...validDraft.entries];
      entries[0] = { ...entries[0], confidence: 'low', confidenceReason: 'Single forum source' };
      const draft = { ...validDraft, entries };
      const result = validateDraft(draft);
      assert.equal(result.ok, true);
    });
  });

  describe('top-level fields', () => {
    it('rejects missing slug', () => {
      const { slug, ...noSlug } = validDraft;
      const result = validateDraft(noSlug);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('slug'));
    });

    it('rejects missing name', () => {
      const { name, ...noName } = validDraft;
      const result = validateDraft(noName);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('name'));
    });

    it('rejects missing orderRationale', () => {
      const { orderRationale, ...noRationale } = validDraft;
      const result = validateDraft(noRationale);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('orderRationale'));
    });

    it('rejects missing incompleteMedia', () => {
      const { incompleteMedia, ...noMedia } = validDraft;
      const result = validateDraft(noMedia);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('incompleteMedia'));
    });

    it('rejects non-array incompleteMedia', () => {
      const draft = { ...validDraft, incompleteMedia: 'games' };
      const result = validateDraft(draft);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('incompleteMedia'));
    });

    it('rejects missing entries', () => {
      const { entries, ...noEntries } = validDraft;
      const result = validateDraft(noEntries);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('entries'));
    });

    it('rejects empty entries array', () => {
      const draft = { ...validDraft, entries: [] };
      const result = validateDraft(draft);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('entries'));
    });
  });

  describe('entry data fields', () => {
    function withEntry(overrides) {
      const entries = [{ ...validDraft.entries[0], ...overrides }];
      return { ...validDraft, entries };
    }

    it('rejects missing id', () => {
      const { id, ...entry } = validDraft.entries[0];
      const result = validateDraft({ ...validDraft, entries: [entry] });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('id'));
    });

    it('rejects missing title', () => {
      const result = validateDraft(withEntry({ title: '' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('title'));
    });

    it('rejects invalid medium', () => {
      const result = validateDraft(withEntry({ medium: 'boardgame' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('medium'));
    });

    it('rejects invalid branch', () => {
      const result = validateDraft(withEntry({ branch: 'sidequest' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('branch'));
    });

    it('rejects non-integer recommendedOrder', () => {
      const result = validateDraft(withEntry({ recommendedOrder: 1.5 }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('recommendedOrder'));
    });

    it('rejects missing recommendedReason', () => {
      const result = validateDraft(withEntry({ recommendedReason: '' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('recommendedReason'));
    });

    it('rejects missing summary', () => {
      const result = validateDraft(withEntry({ summary: '' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('summary'));
    });

    it('rejects non-array sources', () => {
      const result = validateDraft(withEntry({ sources: 'http://example.com' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('sources'));
    });

    it('rejects non-boolean status', () => {
      const result = validateDraft(withEntry({ status: 'done' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('status'));
    });

    it('rejects non-string releaseDate when not null', () => {
      const result = validateDraft(withEntry({ releaseDate: 2002 }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('releaseDate'));
    });

    it('accepts null releaseDate', () => {
      const result = validateDraft(withEntry({ releaseDate: null }));
      assert.equal(result.ok, true);
    });

    it('rejects duplicate entry ids', () => {
      const e1 = { ...validDraft.entries[0], recommendedOrder: 1 };
      const e2 = { ...validDraft.entries[0], recommendedOrder: 2 };
      const draft = { ...validDraft, entries: [e1, e2] };
      const result = validateDraft(draft);
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('id'));
    });
  });

  describe('review-only fields', () => {
    function withEntry(overrides) {
      const entries = [{ ...validDraft.entries[0], ...overrides }];
      return { ...validDraft, entries };
    }

    it('rejects invalid confidence value', () => {
      const result = validateDraft(withEntry({ confidence: 'medium' }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('confidence'));
    });

    it('rejects missing confidence', () => {
      const { confidence, ...entry } = validDraft.entries[0];
      const result = validateDraft({ ...validDraft, entries: [entry] });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('confidence'));
    });

    it('accepts null confidenceReason for high confidence', () => {
      const result = validateDraft(withEntry({ confidence: 'high', confidenceReason: null }));
      assert.equal(result.ok, true);
    });

    it('accepts string confidenceReason for low confidence', () => {
      const result = validateDraft(withEntry({ confidence: 'low', confidenceReason: 'Only one source' }));
      assert.equal(result.ok, true);
    });

    it('rejects non-string non-null confidenceReason', () => {
      const result = validateDraft(withEntry({ confidenceReason: 123 }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('confidenceReason'));
    });

    it('accepts null versionNote', () => {
      const result = validateDraft(withEntry({ versionNote: null }));
      assert.equal(result.ok, true);
    });

    it('rejects non-string non-null versionNote', () => {
      const result = validateDraft(withEntry({ versionNote: true }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('versionNote'));
    });

    it('accepts null sourceNotes', () => {
      const result = validateDraft(withEntry({ sourceNotes: null }));
      assert.equal(result.ok, true);
    });

    it('rejects non-string non-null sourceNotes', () => {
      const result = validateDraft(withEntry({ sourceNotes: [] }));
      assert.equal(result.ok, false);
      assert.ok(result.error.includes('sourceNotes'));
    });
  });
});
