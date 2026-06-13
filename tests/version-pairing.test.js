import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Issue #53 — Version-card pairing keys off a durable `versionGroup`, not title
// matching. ADR-0014: a Version group is emergent — "the entries where
// versionGroup === <slug>", materialized by a group-by. This RETIRES the old
// title-matching matcher (stripYear + base-title equality + versionNote), which
// produced zero pairings on update once titles were decorated and versionNote
// was stripped at publish.
//
// These specs REPLACE the old `derivePairings` specs in this file: the matcher
// they covered is being removed by design, so they are legitimately changing —
// they are not regressions. The retirement is asserted directly below.
//
// We use the dynamic-import + `typeof` pattern (mirroring
// excluded-entries.test.js's Shell-helper spec) so a missing export fails as a
// clean per-spec assertion rather than an ESM link error that drops the whole
// file. The module path is unchanged (version-pairing.js) because curate.html
// still imports `stripYear` from it for display.
//
// CONTRACT under test (the implementer defines the export):
//   deriveVersionGroups(entries) -> Array<{ versionGroup, members }>
//   - entries with versionGroup == null are omitted (never grouped),
//   - only multi-member groups (>= 2) are emitted (the card's purpose),
//   - members sorted by releaseDate, nulls last (ADR: intra-group order is by date),
//   - pure: input is not mutated.

const MODULE_PATH = '../src/modules/version-pairing.js';

// Builds an entry with sensible defaults; override only what a case cares about.
function entry(overrides) {
  return {
    id: overrides.id,
    title: 'Resident Evil 2',
    medium: 'game',
    releaseDate: null,
    versionGroup: null,
    ...overrides
  };
}

describe('#53 deriveVersionGroups — groups members sharing a versionGroup slug', () => {
  it('exposes deriveVersionGroups(entries) as a function', async () => {
    const mod = await import(MODULE_PATH);
    assert.equal(
      typeof mod.deriveVersionGroups,
      'function',
      'implementer must expose deriveVersionGroups(entries) for the version card'
    );
  });

  it('groups the members that share a slug into one group', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const original = entry({ id: 're1-original', releaseDate: '1996-03-22', versionGroup: 're1' });
    const remake = entry({ id: 're1-remake', releaseDate: '2002-03-22', versionGroup: 're1' });
    const groups = deriveVersionGroups([original, remake]);
    assert.equal(groups.length, 1, 'two members of one slug form exactly one group');
    assert.equal(groups[0].versionGroup, 're1');
    const ids = groups[0].members.map(e => e.id);
    assert.deepEqual([...ids].sort(), ['re1-original', 're1-remake']);
  });

  // THE KILLER CASE the old title-matcher failed: decorated, NON-equal titles
  // that only the shared durable slug can connect.
  it('groups decorated, non-matching titles purely from the shared slug', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const remaster = entry({
      id: 're1-remaster',
      title: 'Resident Evil HD Remaster',
      releaseDate: '2015-01-20',
      versionGroup: 're1'
    });
    const remake = entry({
      id: 're1-remake',
      title: 'Resident Evil (2002)',
      releaseDate: '2002-03-22',
      versionGroup: 're1'
    });
    const groups = deriveVersionGroups([remaster, remake]);
    assert.equal(groups.length, 1, 'shared slug groups these despite no title overlap');
    assert.equal(groups[0].members.length, 2);
    assert.equal(groups[0].versionGroup, 're1');
  });

  it('omits entries with versionGroup:null (never grouped)', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    // Identical base titles but no slug — the case that proves title-matching is dead.
    const a = entry({ id: 'a', title: 'Resident Evil 2', releaseDate: '1998-01-21', versionGroup: null });
    const b = entry({ id: 'b', title: 'Resident Evil 2 (2019)', releaseDate: '2019-01-25', versionGroup: null });
    assert.deepEqual(deriveVersionGroups([a, b]), [], 'null-group entries are never paired');
  });

  it('does not emit a singleton group (a lone slug member is not a version card)', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const lone = entry({ id: 're1-remake', releaseDate: '2002-03-22', versionGroup: 're1' });
    const unrelated = entry({ id: 'dino', title: 'Dino Crisis', releaseDate: '1999-07-01', versionGroup: null });
    assert.deepEqual(deriveVersionGroups([lone, unrelated]), []);
  });

  it('keeps distinct slugs in distinct groups', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const re1a = entry({ id: 're1-a', releaseDate: '1996-03-22', versionGroup: 're1' });
    const re1b = entry({ id: 're1-b', releaseDate: '2002-03-22', versionGroup: 're1' });
    const re2a = entry({ id: 're2-a', releaseDate: '1998-01-21', versionGroup: 're2' });
    const re2b = entry({ id: 're2-b', releaseDate: '2019-01-25', versionGroup: 're2' });
    const groups = deriveVersionGroups([re1a, re2a, re1b, re2b]);
    assert.equal(groups.length, 2, 're1 and re2 are separate groups');
    const slugs = groups.map(g => g.versionGroup).sort();
    assert.deepEqual(slugs, ['re1', 're2']);
    for (const g of groups) assert.equal(g.members.length, 2);
  });

  // The existing 1:1 card renders original -> remake unchanged; the group-by must
  // hand members back in release order so that mapping survives the key swap.
  it('orders a group by releaseDate ascending (earliest first)', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const later = entry({ id: 'later', title: 'Resident Evil HD Remaster', releaseDate: '2015-01-20', versionGroup: 're1' });
    const earlier = entry({ id: 'earlier', title: 'Resident Evil (2002)', releaseDate: '2002-03-22', versionGroup: 're1' });
    const groups = deriveVersionGroups([later, earlier]);
    assert.equal(groups.length, 1);
    const ids = groups[0].members.map(e => e.id);
    assert.deepEqual(ids, ['earlier', 'later'], 'earliest release sorts first');
  });

  it('sorts a null releaseDate last within a group', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const undated = entry({ id: 'undated', releaseDate: null, versionGroup: 're1' });
    const dated = entry({ id: 'dated', releaseDate: '2002-03-22', versionGroup: 're1' });
    const groups = deriveVersionGroups([undated, dated]);
    assert.equal(groups.length, 1);
    const ids = groups[0].members.map(e => e.id);
    assert.deepEqual(ids, ['dated', 'undated'], 'null date sorts last, mirroring the gate');
  });

  it('does not mutate the input array or its entry objects', async () => {
    const { deriveVersionGroups } = await import(MODULE_PATH);
    const a = entry({ id: 'a', releaseDate: '2015-01-20', versionGroup: 're1' });
    const b = entry({ id: 'b', releaseDate: '2002-03-22', versionGroup: 're1' });
    const input = [a, b];
    const snapshot = JSON.parse(JSON.stringify(input));
    deriveVersionGroups(input);
    assert.deepEqual(input, snapshot, 'group-by must be pure');
  });
});

describe('#53 the old title-matching matcher is RETIRED', () => {
  // derivePairings encoded stripYear + base-title equality + versionNote gating.
  // ADR-0014 removes it ("the title-MATCHING pairing logic must go"). This guard
  // fails RED while the old export still exists and turns GREEN once removed.
  it('no longer exports derivePairings (title/versionNote matcher removed)', async () => {
    const mod = await import(MODULE_PATH);
    assert.equal(
      typeof mod.derivePairings,
      'undefined',
      'the title-matching derivePairings must be removed in favour of the group-by'
    );
  });
});
