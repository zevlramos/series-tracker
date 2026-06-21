import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasProposedReason,
  hasAuthoredReason,
  canUseProposed,
  planReasonFill,
} from '../src/modules/reason-fill.js';

// The pinned module contract (ADR-0015). "Empty" means FALSY (null/undefined/''),
// matching the publish gate (parse-series.js:61 `!e[field]`). No trimming: a
// whitespace-only string is non-empty/truthy and therefore counts as AUTHORED.

describe('hasProposedReason', () => {
  it('is true for a non-empty _proposedReason string', () => {
    assert.equal(hasProposedReason({ _proposedReason: 'x' }), true);
  });

  it('is false for empty / missing _proposedReason', () => {
    assert.equal(hasProposedReason({ _proposedReason: '' }), false);
    assert.equal(hasProposedReason({ _proposedReason: null }), false);
    assert.equal(hasProposedReason({ _proposedReason: undefined }), false);
    assert.equal(hasProposedReason({}), false);
  });
});

describe('hasAuthoredReason', () => {
  it('is true for a non-empty recommendedReason string', () => {
    assert.equal(hasAuthoredReason({ recommendedReason: 'My reason' }), true);
  });

  it('treats a whitespace-only reason as authored (falsy-test, no trim — mirrors the gate)', () => {
    assert.equal(hasAuthoredReason({ recommendedReason: '  ' }), true);
  });

  it('is false for empty / missing recommendedReason', () => {
    assert.equal(hasAuthoredReason({ recommendedReason: '' }), false);
    assert.equal(hasAuthoredReason({ recommendedReason: null }), false);
    assert.equal(hasAuthoredReason({ recommendedReason: undefined }), false);
    assert.equal(hasAuthoredReason({}), false);
  });
});

describe('canUseProposed', () => {
  it('is true only when a proposal exists AND no authored reason', () => {
    assert.equal(canUseProposed({ _proposedReason: 'thin honest one-liner' }), true);
    assert.equal(canUseProposed({ _proposedReason: 'p', recommendedReason: '' }), true);
  });

  it('is false when an authored reason exists, even if a proposal also exists', () => {
    assert.equal(canUseProposed({ _proposedReason: 'p', recommendedReason: 'My reason' }), false);
  });

  it('is false when an authored whitespace-only reason exists (never clobber)', () => {
    assert.equal(canUseProposed({ _proposedReason: 'p', recommendedReason: '  ' }), false);
  });

  it('is false when there is no proposal', () => {
    assert.equal(canUseProposed({ recommendedReason: '' }), false);
    assert.equal(canUseProposed({}), false);
  });
});

describe('planReasonFill', () => {
  it('returns {id,value} ONLY for blank+proposed entries, input order preserved', () => {
    const entries = [
      { id: 'authored-and-proposed', recommendedReason: 'Author wrote this', _proposedReason: 'machine text' },
      { id: 'blank-and-proposed', recommendedReason: '', _proposedReason: 'thin honest one-liner' },
      { id: 'blank-no-proposal', recommendedReason: '' },
      { id: 'authored-no-proposal', recommendedReason: 'Author only' },
      { id: 'second-blank-and-proposed', recommendedReason: '', _proposedReason: 'another proposal' },
    ];

    const plan = planReasonFill(entries);

    assert.deepEqual(plan, [
      { id: 'blank-and-proposed', value: 'thin honest one-liner' },
      { id: 'second-blank-and-proposed', value: 'another proposal' },
    ]);
  });

  it('uses the _proposedReason verbatim as the value', () => {
    const plan = planReasonFill([
      { id: 'e1', recommendedReason: '', _proposedReason: 'exactly this' },
    ]);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].value, 'exactly this');
  });

  it('NEVER includes an authored entry — the never-clobber property', () => {
    const entries = [
      { id: 'a', recommendedReason: 'Authored', _proposedReason: 'proposal A' },
      { id: 'b', recommendedReason: '  ', _proposedReason: 'proposal B' }, // whitespace == authored
    ];
    const plan = planReasonFill(entries);
    assert.equal(plan.length, 0);
    assert.equal(plan.some(p => p.id === 'a'), false);
    assert.equal(plan.some(p => p.id === 'b'), false);
  });

  it('returns an empty plan when nothing is fillable', () => {
    assert.deepEqual(planReasonFill([]), []);
    assert.deepEqual(planReasonFill([{ id: 'x', recommendedReason: '' }]), []);
  });
});
