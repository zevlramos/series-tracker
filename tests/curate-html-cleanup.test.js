import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// #63 (ADR-0015): delete the dormant "AI rewrite" summary button and its inert
// _proposedSummary / applyProposed() plumbing. The separate _origSummary / "Factual"
// revert-to-research affordance is kept independently.
//
// These read curate.html as TEXT. The ABSENT assertions prove the four dead substrings
// are gone; the KEPT assertions guard against over-deletion of the _origSummary / "Factual"
// revert affordance.

const html = readFileSync(
  new URL('../.claude/skills/curate-series/curate.html', import.meta.url),
  'utf8'
);

describe('curate.html #63 cleanup', () => {
  describe('removed — the dead AI-rewrite summary plumbing', () => {
    it('no longer references the data-ai button attribute', () => {
      assert.equal(html.includes('data-ai'), false);
    });

    it('no longer references the applyProposed() function', () => {
      assert.equal(html.includes('applyProposed'), false);
    });

    it('no longer references the _proposedSummary scratch field', () => {
      assert.equal(html.includes('_proposedSummary'), false);
    });

    it('no longer shows the "AI rewrite" button label', () => {
      assert.equal(html.includes('AI rewrite'), false);
    });
  });

  describe('kept — the Factual revert-to-research affordance', () => {
    it('still references _origSummary', () => {
      assert.equal(html.includes('_origSummary'), true);
    });

    it('still references the data-factual button', () => {
      assert.equal(html.includes('data-factual'), true);
    });

    it('still shows the "Factual" button label', () => {
      assert.equal(html.includes('Factual'), true);
    });
  });
});
