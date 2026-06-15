import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSeries } from '../src/modules/parse-series.js';
import { mergeCuration } from '../pipeline/mergeCuration.js';
import { draftToSeriesData } from '../pipeline/draft-to-series-data.js';
import { validateDraft } from '../pipeline/validate-draft.js';
import { renderDraftMarkdown } from '../pipeline/render-draft-markdown.js';
import { sortEntries } from '../src/modules/sort-engine.js';

// Issue #52 — Excluded entries are retained and hidden from readers.
// ADR-0014: `excluded` is a boolean Entry field (default false), the publish
// gate exempts excluded entries from recommendedReason/recommendedOrder, null
// orders sort last, `excluded` is a curation field, and the publish whitelist
// carries it through. These specs are RED against unmodified source.

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

// An entry whose ONLY missing fields are recommendedReason + recommendedOrder.
// Everything else stays valid so the gate-exemption is the sole variable.
function excludedSkeleton(overrides = {}) {
  return {
    id: 're1-original',
    title: 'Resident Evil (1996)',
    medium: 'game',
    branch: 'mainline',
    releaseDate: '1996-03-22',
    // no recommendedOrder
    // no recommendedReason
    chronologicalOrder: null,
    summary: 'The 1996 original, superseded by the 2002 remake.',
    image: null,
    imageUrl: null,
    status: false,
    sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(1996_video_game)'],
    excluded: true,
    ...overrides
  };
}

describe('#52 excluded entries — publish GATE exemption', () => {
  it('ACCEPTS an excluded entry with no recommendedOrder and no recommendedReason', () => {
    const series = { ...validSeries, entries: [validEntry, excludedSkeleton()] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `gate should accept excluded entry: ${result.error}`);
  });

  // #52 literal criterion: hand-setting excluded:true on an already-curated
  // entry (which still has a valid order + reason) must publish. Exemption means
  // order/reason are OPTIONAL on excluded entries, not forbidden. Green now and
  // after — documents that the rule relaxes, never tightens.
  it('ACCEPTS an excluded entry that still carries a valid recommendedOrder + reason', () => {
    const handFlagged = {
      ...validEntry,
      id: 're1-original',
      excluded: true,
      recommendedOrder: 2,
      recommendedReason: 'Kept for reference.'
    };
    const series = { ...validSeries, entries: [validEntry, handFlagged] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `hand-flagged excluded entry should still publish: ${result.error}`);
  });

  it('ACCEPTS an excluded entry whose recommendedReason is the empty string', () => {
    const series = {
      ...validSeries,
      entries: [validEntry, excludedSkeleton({ recommendedReason: '' })]
    };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `gate should accept excluded entry with empty reason: ${result.error}`);
  });

  // Narrowness guard: GREEN now and must stay green. The exemption is scoped to
  // excluded entries only — a normal entry still needs both fields.
  it('STILL REJECTS a non-excluded entry missing recommendedReason/recommendedOrder', () => {
    const broken = excludedSkeleton({ id: 'broken', excluded: false });
    const series = { ...validSeries, entries: [validEntry, broken] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, false, 'a non-excluded entry must still require order + reason');
  });

  it('STILL REJECTS a non-excluded entry missing recommendedReason/recommendedOrder when excluded is absent', () => {
    const broken = excludedSkeleton({ id: 'broken' });
    delete broken.excluded;
    const series = { ...validSeries, entries: [validEntry, broken] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, false, 'absent excluded must behave like excluded:false (still required)');
  });
});

describe('#52 excluded entries — nulls-last sort through parseSeries', () => {
  it('sorts an excluded order-less entry LAST while ordered entries keep ascending order', () => {
    const e1 = { ...validEntry, id: 'one', recommendedOrder: 1 };
    const e2 = { ...validEntry, id: 'two', recommendedOrder: 2 };
    const excluded = excludedSkeleton({ id: 'excluded-last' }); // no recommendedOrder
    // Deliberately feed out of order to prove the sort, not input order.
    const series = { ...validSeries, entries: [excluded, e2, e1] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `gate should accept: ${result.error}`);
    const ids = result.series.entries.map(e => e.id);
    assert.deepEqual(ids, ['one', 'two', 'excluded-last']);
  });
});

describe('#52 excluded entries — default + normalize + backward-compat', () => {
  it('defaults an absent excluded to false on normalize', () => {
    const result = parseSeries(JSON.stringify(validSeries));
    assert.equal(result.ok, true);
    assert.equal(result.series.entries[0].excluded, false);
  });

  it('preserves excluded:true through normalize', () => {
    const series = { ...validSeries, entries: [validEntry, excludedSkeleton()] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, result.error);
    const original = result.series.entries.find(e => e.id === 're1-original');
    assert.ok(original, 'excluded entry must be RETAINED by parseSeries, not dropped');
    assert.equal(original.excluded, true);
  });

  it('keeps a retained excluded entry in the parsed output (parseSeries never filters)', () => {
    const series = { ...validSeries, entries: [validEntry, excludedSkeleton()] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, result.error);
    assert.equal(result.series.entries.length, 2);
  });

  describe('shipped resident-evil data.json (zero-migration backward-compat)', () => {
    const reData = JSON.parse(readFileSync(
      new URL('../series/resident-evil/data.json', import.meta.url), 'utf8'
    ));

    it('still validates with no excluded field anywhere', () => {
      const result = parseSeries(JSON.stringify(reData));
      assert.equal(result.ok, true, `shipped data.json must validate unchanged: ${result.error}`);
    });

    it('normalizes every entry to excluded:false', () => {
      const result = parseSeries(JSON.stringify(reData));
      assert.equal(result.ok, true, result.error);
      for (const entry of result.series.entries) {
        assert.equal(entry.excluded, false, `entry ${entry.id} should default excluded:false`);
      }
    });
  });
});

describe('#52 excluded entries — curation preservation (excluded ∈ CURATION_FIELDS)', () => {
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
    excluded: true,
    ...overrides
  });

  // The decisive construction: research must NEVER be able to flip `excluded`.
  // We force a conflict by putting an accepted excluded delta in the diff; only
  // if `excluded` is a CURATION_FIELD does the restore loop win and keep `true`.
  it('preserves excluded:true even when an accepted diff tries to flip it to false', () => {
    const existing = [mkEntry({ excluded: true })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          excluded: { old: true, new: false, accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);
    assert.equal(result[0].excluded, true, 'excluded is curation — research may not flip it');
  });

  it('preserves excluded:true through an accepted change to an unrelated field', () => {
    const existing = [mkEntry({ excluded: true })];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-2002',
        fields: {
          summary: { old: 'S.T.A.R.S. investigates a mansion.', new: 'Updated.', accepted: true }
        }
      }],
      unchanged: []
    };
    const result = mergeCuration(existing, diff);
    assert.equal(result[0].summary, 'Updated.');
    assert.equal(result[0].excluded, true);
  });
});

describe('#52 excluded entries — publish whitelist carries excluded through', () => {
  const fixturePath = new URL('./fixtures/resident-evil-draft.json', import.meta.url);
  const validDraft = JSON.parse(readFileSync(fixturePath, 'utf8'));

  it('carries excluded:true through the projection', () => {
    const entries = validDraft.entries.map((e, i) =>
      i === 0 ? { ...e, excluded: true } : e
    );
    const data = draftToSeriesData({ ...validDraft, entries });
    const projected = data.entries[0];
    assert.ok('excluded' in projected, 'whitelist must include excluded');
    assert.equal(projected.excluded, true);
  });

  it('defaults an absent excluded to false in the projection', () => {
    const entries = validDraft.entries.map(e => {
      const { excluded, ...rest } = e; // strip any excluded
      return rest;
    });
    const data = draftToSeriesData({ ...validDraft, entries });
    for (const entry of data.entries) {
      assert.ok('excluded' in entry, `entry ${entry.id} should carry excluded`);
      assert.equal(entry.excluded, false, `entry ${entry.id} should default to false`);
    }
  });
});

// ---------------------------------------------------------------------------
// SHELL reader-filter — single entry-consumption chokepoint (ADR-0014).
// The Shell itself is browser DOM and is verified via /verify. This asserts the
// PURE helper the implementer must expose for the chokepoint. Naming/location is
// a prescriptive contract: `visibleEntries` in src/modules/sort-engine.js
// (shell.js already imports from that module). If the implementer chooses a
// different seam they must update this import to match.
describe('#52 excluded entries — Shell reader-filter chokepoint helper', () => {
  it('filters excluded:true and keeps visible / excluded-absent entries', async () => {
    const mod = await import('../src/modules/sort-engine.js');
    assert.equal(
      typeof mod.visibleEntries,
      'function',
      'implementer must expose visibleEntries(entries) for the Shell chokepoint'
    );
    const shown = { id: 'shown', excluded: false };
    const absent = { id: 'absent' }; // excluded ?? false
    const hidden = { id: 'hidden', excluded: true };
    const result = mod.visibleEntries([shown, absent, hidden]);
    const ids = result.map(e => e.id);
    assert.deepEqual(ids, ['shown', 'absent'], 'only excluded:true is hidden');
  });
});

// Review-gate hardening (code-review on #52): `excluded` is a typed field like
// `status`, the recommended lens shares the gate's nulls-last ordering, and the
// draft render no longer leaks the now-optional order/reason as literal null.
describe('#52 excluded entries — gate hardening', () => {
  it('parseSeries REJECTS a non-boolean excluded (e.g. the string "true")', () => {
    const series = { ...validSeries, entries: [{ ...validEntry, id: 'bad', excluded: 'true' }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, false, 'a string "true" must not be silently mistreated as excluded');
  });

  it('parseSeries still ACCEPTS absent or null excluded (backward-compat default)', () => {
    const absent = { ...validEntry, id: 'a' };
    delete absent.excluded;
    const series = { ...validSeries, entries: [absent, { ...validEntry, id: 'b', excluded: null }] };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `absent/null excluded must validate: ${result.error}`);
    assert.equal(result.series.entries.every(e => e.excluded === false), true);
  });

  it('validateDraft REJECTS a non-boolean excluded', () => {
    const draft = {
      slug: 's', name: 'S', orderRationale: 'r', incompleteMedia: [],
      entries: [{
        id: 'x', title: 'X', medium: 'game', branch: 'mainline',
        recommendedOrder: 1, recommendedReason: 'r', summary: 's',
        sources: ['https://example.com'], status: false,
        confidence: 'high', confidenceReason: null, versionNote: null, sourceNotes: null,
        excluded: 'nope'
      }]
    };
    const result = validateDraft(draft);
    assert.equal(result.ok, false, 'draft gate must type-check excluded too');
  });

  it('sortEntries("recommended") places a null-order entry last, not interleaved', () => {
    const entries = [
      { id: 'two', recommendedOrder: 2 },
      { id: 'none', recommendedOrder: null },
      { id: 'one', recommendedOrder: 1 }
    ];
    const ids = sortEntries(entries, 'recommended').map(e => e.id);
    assert.deepEqual(ids, ['one', 'two', 'none']);
  });

  it('renderDraftMarkdown renders an excluded entry without literal null/undefined', () => {
    const draft = {
      slug: 's', name: 'S', orderRationale: 'r', incompleteMedia: [],
      entries: [{
        id: 'x', title: 'Old Version', medium: 'game', branch: 'mainline',
        summary: 'Superseded.', sources: ['https://example.com'], status: false,
        confidence: 'high', confidenceReason: null, versionNote: null, sourceNotes: null,
        excluded: true
      }]
    };
    const md = renderDraftMarkdown(draft);
    assert.equal(md.includes('null'), false, 'no literal "null" in heading');
    assert.equal(md.includes('undefined'), false, 'no literal "undefined" for the missing reason');
    assert.match(md, /Old Version _\(excluded\)_/);
  });
});
