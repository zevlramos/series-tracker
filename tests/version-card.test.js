import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSeries } from '../src/modules/parse-series.js';

// Issue #55 — N-member version card logic, EXTRACTED out of curate.html into an
// importable ESM module so it is unit-testable under node --test. ADR-0014 + the
// prototype-resolved UX embedded in issue #55 are the source of truth; these are
// DECISIONS, not suggestions. The DOM render (release-timeline nodes), real
// keydown wiring, and N>=4 title wrapping live in curate.html and are verified via
// /verify — NOT here. This module is the pure logic only.
//
// These specs are RED against current source: src/modules/version-card.js does not
// yet exist. The implementer MUST create it exporting exactly the API prescribed
// below (mirroring how excluded-entries.test.js prescribed visibleEntries).
//
// PRESCRIPTIVE API CONTRACT — src/modules/version-card.js
//   buildVersionCard(group)            -> card model anchored at EARLIEST member
//   initialExcludeState(card)          -> reducer state with NOBODY excluded
//   reduceCardKey(state, key, card)    -> { state, action } accumulate-then-advance
//   projectExclusions(members, state)  -> [{ id, excluded }] per member
//   selectPublishEntries(entries)      -> 3-state publish selection + renumber
//   readerOutcome(card, state)         -> { visibleCount, hiddenCount, visibleTitles, hiddenTitles }
//
// `group` is a { versionGroup, members } element from deriveVersionGroups: members
// are already release-ordered (earliest first, nulls last) and are entry objects
// with at least { id, title, releaseDate }.

import * as VC from '../src/modules/version-card.js';

// ---------------------------------------------------------------------------
// Test fixtures: the RE1 triple from ADR-0014 (1996 / 2002 / 2015), deliberately
// fed in NON-release order to prove the builder/anchor sort, not input order.
// ---------------------------------------------------------------------------
const re1996 = { id: 're1-original', title: 'Resident Evil (1996)', releaseDate: '1996-03-22', versionGroup: 're1' };
const re2002 = { id: 're1-remake',   title: 'Resident Evil (2002)', releaseDate: '2002-03-22', versionGroup: 're1' };
const re2015 = { id: 're1-remaster', title: 'Resident Evil HD Remaster (2015)', releaseDate: '2015-01-20', versionGroup: 're1' };

// A group as deriveVersionGroups returns it: members in release order, earliest first.
const re1Group = { versionGroup: 're1', members: [re1996, re2002, re2015] };

// A 2-member group, to prove N=2 uses the SAME accumulate-then-advance model.
const pairGroup = { versionGroup: 're2', members: [
  { id: 're2-original', title: 'Resident Evil 2 (1998)', releaseDate: '1998-01-21', versionGroup: 're2' },
  { id: 're2-remake',   title: 'Resident Evil 2 (2019)', releaseDate: '2019-01-25', versionGroup: 're2' },
]};

// ===========================================================================
// (a) CARD MODEL — anchored at the EARLIEST member (latest-anchor was REJECTED)
// ===========================================================================
describe('#55 buildVersionCard — card model anchored at the earliest member', () => {
  it('anchors at the EARLIEST member release slot (not latest)', () => {
    const card = VC.buildVersionCard(re1Group);
    // The single rule: fold into the deck at the earliest member's release slot.
    assert.equal(card.anchorReleaseDate, '1996-03-22',
      'card must anchor at the earliest member (1996), not the latest (2015)');
  });

  it('titles the card from the base work (stripped of the year parenthetical)', () => {
    const card = VC.buildVersionCard(re1Group);
    assert.equal(card.title, 'Resident Evil — which version(s)?',
      'title is the base work + the version prompt');
  });

  it('renders the date range as earliest–latest ("1996–2015")', () => {
    const card = VC.buildVersionCard(re1Group);
    assert.equal(card.dateRange, '1996–2015',
      'date range spans the earliest and latest member release years with an en dash');
  });

  it('keeps members in release order, earliest first', () => {
    const card = VC.buildVersionCard(re1Group);
    assert.deepEqual(card.members.map(m => m.id), ['re1-original', 're1-remake', 're1-remaster']);
  });

  it('reports the member count', () => {
    const card = VC.buildVersionCard(re1Group);
    assert.equal(card.count, 3, '3 versions');
  });

  it('carries the versionGroup slug onto the card model', () => {
    const card = VC.buildVersionCard(re1Group);
    assert.equal(card.versionGroup, 're1');
  });

  it('collapses a single-year range to one year (earliest === latest year)', () => {
    const sameYear = { versionGroup: 'x', members: [
      { id: 'a', title: 'Foo (2010)', releaseDate: '2010-01-01', versionGroup: 'x' },
      { id: 'b', title: 'Foo Redux (2010)', releaseDate: '2010-09-09', versionGroup: 'x' },
    ]};
    const card = VC.buildVersionCard(sameYear);
    assert.equal(card.dateRange, '2010', 'a single shared year shows once, not "2010–2010"');
  });
});

// ===========================================================================
// (b) DEFAULT ALL-SHOWN — initial state excludes nobody
// ===========================================================================
describe('#55 initialExcludeState — all members shown by default', () => {
  it('excludes nobody initially (nothing dropped until the maintainer acts)', () => {
    const card = VC.buildVersionCard(re1Group);
    const state = VC.initialExcludeState(card);
    const projected = VC.projectExclusions(card.members, state);
    assert.equal(projected.every(p => p.excluded === false), true,
      'every member is shown (excluded:false) before any key is pressed');
  });
});

// ===========================================================================
// (c) KEYBOARD REDUCER (pure) — uniform accumulate-then-advance for ALL sizes
// ===========================================================================
describe('#55 reduceCardKey — accumulate-then-advance (number keys toggle + STAY)', () => {
  it('pressing "1" toggles member 1 (date order) and STAYS on the card (action "stay")', () => {
    const card = VC.buildVersionCard(re1Group);
    const s0 = VC.initialExcludeState(card);
    const { state, action } = VC.reduceCardKey(s0, '1', card);
    assert.equal(action, 'stay', 'a number key flips one member and stays — it does NOT advance');
    const proj = VC.projectExclusions(card.members, state);
    assert.equal(proj.find(p => p.id === 're1-original').excluded, true, 'member 1 (1996) is now excluded');
    assert.equal(proj.find(p => p.id === 're1-remake').excluded, false, 'others untouched');
    assert.equal(proj.find(p => p.id === 're1-remaster').excluded, false);
  });

  it('pressing the same number twice toggles the member back to shown', () => {
    const card = VC.buildVersionCard(re1Group);
    let s = VC.initialExcludeState(card);
    s = VC.reduceCardKey(s, '2', card).state; // exclude member 2 (2002)
    s = VC.reduceCardKey(s, '2', card).state; // toggle it back
    const proj = VC.projectExclusions(card.members, s);
    assert.equal(proj.find(p => p.id === 're1-remake').excluded, false,
      'two presses of the same number return the member to shown');
  });

  it('accumulates: distinct number presses each flip one member, all staying', () => {
    const card = VC.buildVersionCard(re1Group);
    let s = VC.initialExcludeState(card);
    const r1 = VC.reduceCardKey(s, '1', card); s = r1.state;
    const r3 = VC.reduceCardKey(s, '3', card); s = r3.state;
    assert.equal(r1.action, 'stay');
    assert.equal(r3.action, 'stay');
    const proj = VC.projectExclusions(card.members, s);
    assert.deepEqual(
      proj.map(p => [p.id, p.excluded]),
      [['re1-original', true], ['re1-remake', false], ['re1-remaster', true]],
      'members 1 and 3 excluded, member 2 still shown — accumulated across presses'
    );
  });

  it('"0" shows ALL members (clears every exclusion)', () => {
    const card = VC.buildVersionCard(re1Group);
    let s = VC.initialExcludeState(card);
    s = VC.reduceCardKey(s, '1', card).state;
    s = VC.reduceCardKey(s, '2', card).state;
    const { state, action } = VC.reduceCardKey(s, '0', card);
    assert.equal(action, 'stay', '"0" stays on the card');
    const proj = VC.projectExclusions(card.members, state);
    assert.equal(proj.every(p => p.excluded === false), true, '"0" shows all');
  });

  it('"x" excludes ALL members', () => {
    const card = VC.buildVersionCard(re1Group);
    const s0 = VC.initialExcludeState(card);
    const { state, action } = VC.reduceCardKey(s0, 'x', card);
    assert.equal(action, 'stay', '"x" stays on the card');
    const proj = VC.projectExclusions(card.members, state);
    assert.equal(proj.every(p => p.excluded === true), true, '"x" excludes all');
  });

  it('ArrowRight advances (commit)', () => {
    const card = VC.buildVersionCard(re1Group);
    const { action } = VC.reduceCardKey(VC.initialExcludeState(card), 'ArrowRight', card);
    assert.ok(action === 'advance' || action === 'commit',
      'ArrowRight commits/advances the card');
  });

  it('Enter advances (commit), same as ArrowRight', () => {
    const card = VC.buildVersionCard(re1Group);
    const right = VC.reduceCardKey(VC.initialExcludeState(card), 'ArrowRight', card).action;
    const enter = VC.reduceCardKey(VC.initialExcludeState(card), 'Enter', card).action;
    assert.equal(enter, right, 'Enter behaves identically to ArrowRight');
  });

  it('ArrowLeft goes back (action "back")', () => {
    const card = VC.buildVersionCard(re1Group);
    const { action } = VC.reduceCardKey(VC.initialExcludeState(card), 'ArrowLeft', card);
    assert.equal(action, 'back');
  });

  it('Space skips (action "skip")', () => {
    const card = VC.buildVersionCard(re1Group);
    const { action } = VC.reduceCardKey(VC.initialExcludeState(card), ' ', card);
    assert.equal(action, 'skip');
  });

  it('advance/back/skip do NOT mutate the exclude-state (only the action differs)', () => {
    const card = VC.buildVersionCard(re1Group);
    let s = VC.initialExcludeState(card);
    s = VC.reduceCardKey(s, '2', card).state; // exclude member 2
    const before = VC.projectExclusions(card.members, s).map(p => p.excluded);
    for (const key of ['ArrowRight', 'Enter', 'ArrowLeft', ' ']) {
      const after = VC.projectExclusions(card.members, VC.reduceCardKey(s, key, card).state).map(p => p.excluded);
      assert.deepEqual(after, before, key + ' must not change the exclude-state');
    }
  });

  it('ignores a number key > the group size (action "stay", state unchanged)', () => {
    const card = VC.buildVersionCard(re1Group); // 3 members
    const s0 = VC.initialExcludeState(card);
    const before = VC.projectExclusions(card.members, s0).map(p => p.excluded);
    const { state, action } = VC.reduceCardKey(s0, '4', card);
    assert.equal(action, 'stay', 'out-of-range number is a no-op stay');
    assert.deepEqual(VC.projectExclusions(card.members, state).map(p => p.excluded), before,
      'a number > group size toggles nobody');
  });

  it('"9" toggles the 9th member of a 10-member group (digit keys cap at 9; 10+ falls back to click)', () => {
    const members = Array.from({ length: 10 }, (_, i) => ({
      id: 'm' + (i + 1), title: 'M' + (i + 1) + ' (200' + i + ')', releaseDate: '200' + i + '-01-01', versionGroup: 'big',
    }));
    const card = VC.buildVersionCard({ versionGroup: 'big', members });
    const r9 = VC.reduceCardKey(VC.initialExcludeState(card), '9', card);
    assert.equal(r9.action, 'stay');
    assert.equal(VC.projectExclusions(card.members, r9.state).find(p => p.id === 'm9').excluded, true,
      '"9" toggles the 9th member');
  });
});

describe('#55 reduceCardKey — N=2 uses the SAME accumulate-then-advance model (NOT #47 one-press-commit)', () => {
  it('pressing "1" on a 2-member group flips member 1 and STAYS — it does NOT commit/advance', () => {
    const card = VC.buildVersionCard(pairGroup);
    const { state, action } = VC.reduceCardKey(VC.initialExcludeState(card), '1', card);
    assert.equal(action, 'stay',
      'N=2 must accumulate-then-advance: "1" flips one member and stays, replacing #47 modal commit');
    const proj = VC.projectExclusions(card.members, state);
    assert.equal(proj.find(p => p.id === 're2-original').excluded, true, 'member 1 toggled off');
    assert.equal(proj.find(p => p.id === 're2-remake').excluded, false, 'member 2 untouched and still on the card');
  });

  it('a number press on N=2 never advances/commits — only ArrowRight/Enter commits', () => {
    const card = VC.buildVersionCard(pairGroup);
    const r = VC.reduceCardKey(VC.initialExcludeState(card), '2', card);
    assert.notEqual(r.action, 'advance', 'a number press on N=2 must not advance');
    assert.notEqual(r.action, 'commit', 'a number press on N=2 must not commit');
    const adv = VC.reduceCardKey(r.state, 'ArrowRight', card).action;
    assert.ok(adv === 'advance' || adv === 'commit', 'only ArrowRight/Enter commits');
  });
});

// ===========================================================================
// (d) EXCLUSION PROJECTION — exclude-state -> per-entry excluded flags
// ===========================================================================
describe('#55 projectExclusions — per-member excluded flags from the reducer state', () => {
  it('maps shown members to excluded:false and excluded members to excluded:true', () => {
    const card = VC.buildVersionCard(re1Group);
    let s = VC.initialExcludeState(card);
    s = VC.reduceCardKey(s, '2', card).state; // exclude only the 2002 remake
    const proj = VC.projectExclusions(card.members, s);
    assert.deepEqual(proj, [
      { id: 're1-original', excluded: false },
      { id: 're1-remake',   excluded: true },
      { id: 're1-remaster', excluded: false },
    ]);
  });

  it('"x" then projection marks every member excluded:true', () => {
    const card = VC.buildVersionCard(re1Group);
    const s = VC.reduceCardKey(VC.initialExcludeState(card), 'x', card).state;
    const proj = VC.projectExclusions(card.members, s);
    assert.equal(proj.every(p => p.excluded === true), true);
  });
});

// ===========================================================================
// (e) PUBLISH 3-STATE SELECTION — the #52<->#55 seam (reviewer hard-checks this)
//   (a) _drop          -> genuinely removed (gone from the published set)
//   (b) excluded:true  -> RETAINED, recommendedOrder:null (gate exempts it, #52)
//   (c) visible        -> excluded:false, renumbered recommendedOrder across visibles
// ===========================================================================
describe('#55 selectPublishEntries — 3-state publish selection (drop / excluded / visible)', () => {
  const working = () => [
    { id: 'v1', title: 'A', _drop: false, excluded: false, recommendedOrder: 99 },
    { id: 'gone', title: 'Swiped', _drop: true, excluded: false, recommendedOrder: 99 },
    { id: 'kept-excluded', title: 'Old version', _drop: false, excluded: true, recommendedOrder: 99 },
    { id: 'v2', title: 'B', _drop: false, excluded: false, recommendedOrder: 99 },
  ];

  it('DROPS _drop entries entirely (a Tinder swipe-left is gone, not retained)', () => {
    const out = VC.selectPublishEntries(working());
    assert.equal(out.find(e => e.id === 'gone'), undefined, '_drop entries must not appear in the published set');
  });

  it('RETAINS a card-excluded member with excluded:true and recommendedOrder:null (NOT deleted)', () => {
    const out = VC.selectPublishEntries(working());
    const kept = out.find(e => e.id === 'kept-excluded');
    assert.ok(kept, 'an excluded member is RETAINED in the published set, not dropped');
    assert.equal(kept.excluded, true, 'it stays excluded:true');
    assert.equal(kept.recommendedOrder, null, 'an excluded member must NOT receive a recommendedOrder');
  });

  it('renumbers recommendedOrder ONLY across the visible (non-excluded, non-drop) entries', () => {
    const out = VC.selectPublishEntries(working());
    const v1 = out.find(e => e.id === 'v1');
    const v2 = out.find(e => e.id === 'v2');
    assert.equal(v1.recommendedOrder, 1, 'first visible -> 1');
    assert.equal(v2.recommendedOrder, 2, 'second visible -> 2 (excluded member did NOT consume a slot)');
  });

  it('is pure — does not mutate the input entries', () => {
    const input = working();
    const snapshot = JSON.stringify(input);
    VC.selectPublishEntries(input);
    assert.equal(JSON.stringify(input), snapshot, 'selectPublishEntries must be pure (no input mutation)');
  });

  it('produces exactly the retained set: drops removed, excluded + visible kept', () => {
    const out = VC.selectPublishEntries(working());
    assert.deepEqual(out.map(e => e.id).sort(), ['kept-excluded', 'v1', 'v2'],
      'three retained entries (2 visible + 1 excluded); the _drop is gone');
  });

  it('a dropped entry is gone even if it also carries excluded:true (drop wins)', () => {
    const out = VC.selectPublishEntries([
      { id: 'both', _drop: true, excluded: true, recommendedOrder: 99 },
      { id: 'v', _drop: false, excluded: false, recommendedOrder: 99 },
    ]);
    assert.equal(out.find(e => e.id === 'both'), undefined, 'a dropped entry is gone even if also excluded');
  });
});

// ===========================================================================
// (f) "Readers will see" readout reflects the LIVE exclude-state
// ===========================================================================
describe('#55 readerOutcome — the shared "Readers will see" readout', () => {
  it('initially reports every member as visible', () => {
    const card = VC.buildVersionCard(re1Group);
    const out = VC.readerOutcome(card, VC.initialExcludeState(card));
    assert.equal(out.visibleCount, 3);
    assert.equal(out.hiddenCount, 0);
    assert.deepEqual(out.visibleTitles, [re1996.title, re2002.title, re2015.title]);
    assert.deepEqual(out.hiddenTitles, []);
  });

  it('reflects an exclusion live: excluding member 2 drops the visible count and moves its title', () => {
    const card = VC.buildVersionCard(re1Group);
    const s = VC.reduceCardKey(VC.initialExcludeState(card), '2', card).state;
    const out = VC.readerOutcome(card, s);
    assert.equal(out.visibleCount, 2, 'two versions still shown to readers');
    assert.equal(out.hiddenCount, 1);
    assert.deepEqual(out.visibleTitles, [re1996.title, re2015.title], 'visible titles in release order');
    assert.deepEqual(out.hiddenTitles, [re2002.title], 'the excluded title moves to hidden');
  });

  it('reflects "x" (exclude all): zero visible, all hidden', () => {
    const card = VC.buildVersionCard(re1Group);
    const s = VC.reduceCardKey(VC.initialExcludeState(card), 'x', card).state;
    const out = VC.readerOutcome(card, s);
    assert.equal(out.visibleCount, 0);
    assert.equal(out.hiddenCount, 3);
  });
});

// ===========================================================================
// (g) normalizeEntry — a reason-less excluded entry normalizes recommendedReason
//     to null (not undefined / missing). Carry-forward decision from #52 review.
//     Verified through parseSeries (the only public surface over normalizeEntry).
// ===========================================================================
describe('#55 normalizeEntry — reason-less excluded entry normalizes recommendedReason to null', () => {
  const validEntry = {
    id: 're1', title: 'Resident Evil (2002)', medium: 'game', branch: 'mainline',
    releaseDate: '2002-03-22', recommendedOrder: 1,
    recommendedReason: 'The definitive version of where it all began.',
    chronologicalOrder: 1, summary: 'A mansion in the Arklay Mountains.',
    image: null, imageUrl: null, status: false,
    sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)'],
  };

  it('emits recommendedReason: null (explicit), not a missing key, for an excluded reason-less entry', () => {
    const excluded = {
      id: 're1-original', title: 'Resident Evil (1996)', medium: 'game', branch: 'mainline',
      releaseDate: '1996-03-22', summary: 'The 1996 original.', image: null, imageUrl: null,
      status: false, excluded: true,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(1996_video_game)'],
      // no recommendedReason, no recommendedOrder
    };
    const series = { slug: 'resident-evil', name: 'Resident Evil', entries: [validEntry, excluded] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, 'gate must accept the excluded entry: ' + result.error);
    const normalized = result.series.entries.find(e => e.id === 're1-original');
    assert.ok('recommendedReason' in normalized, 'recommendedReason must be an explicit key, not missing');
    assert.equal(normalized.recommendedReason, null,
      'a reason-less excluded entry normalizes recommendedReason to null, not undefined');
  });
});
