import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffSeries } from '../pipeline/diffSeries.js';
import { mergeCuration } from '../pipeline/mergeCuration.js';
import { parseSeries } from '../src/modules/parse-series.js';

// Issue #54 — Deliberate exclusions survive update-series (no re-surfacing).
//
// THE GUARANTEE: a deliberately-excluded Entry is RETAINED in data.json (#52).
// On a re-research, semantic alignment (ADR-0009) matches the re-discovered
// candidate onto that retained Entry's EXISTING id, so diffSeries puts it in
// changed/unchanged — NEVER `new` — and mergeCuration preserves its
// `excluded:true`. This is what stops omitted works from re-surfacing as new on
// every update (ADR-0014: "the next update-series re-research aligns its
// re-discovered candidate onto the existing id and it lands in changed/unchanged,
// never new — the exclusion is remembered").
//
// FRAMING: the deterministic half of this guarantee is an EMERGENT consequence
// of #52 (retained excluded entries) + the existing diffSeries/mergeCuration
// behavior. These specs are GREEN-ALREADY by design — they are a REGRESSION LOCK
// on the guarantee, not artificial red. None require new deterministic code.
//
// What these tests DO prove: the deterministic pipeline HONORS a correct
// alignment (excluded id in matches => never new, curation preserved).
// What they do NOT prove: that the LLM PRODUCES that correct alignment — that is
// alignment-time discipline, documented in update-series/SKILL.md (criterion #4).

// A normal, fully-curated existing entry (the surviving remake).
const remake = {
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
  excluded: false
};

// A deliberately-excluded existing entry (the superseded 1996 original). It is
// RETAINED in data.json by #52 — so it is available as an alignment target.
const excludedOriginal = {
  id: 'resident-evil-1996',
  title: 'Resident Evil (1996)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '1996-03-22',
  recommendedOrder: null,
  recommendedReason: null,
  chronologicalOrder: null,
  summary: 'The 1996 original, superseded by the 2002 remake.',
  image: null,
  imageUrl: null,
  status: false,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(1996_video_game)'],
  excluded: true
};

// What re-research re-discovers for the excluded original — a FRESH candidate.
// Web titles drift between runs, so this carries no id and a slightly reworded
// summary; alignment must still pair it onto the existing excluded id.
const rediscoveredOriginal = {
  title: 'Resident Evil (1996, original release)',
  medium: 'game',
  branch: 'mainline',
  releaseDate: '1996-03-22',
  summary: 'The 1996 original survival horror game.',
  image: null,
  imageUrl: null,
  sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(1996_video_game)']
};

describe('#54 exclusion memory — RE-SURFACING GUARD (green-emergent regression lock)', () => {
  // (a) THE KEY SPEC. The existing set INCLUDES an excluded entry. Alignment
  // pairs a fresh re-discovered candidate onto that excluded entry's existing id.
  // diffSeries must put it in changed/unchanged — and NEVER in `new`.
  it('a fresh candidate aligned onto an excluded entry id lands in changed/unchanged, never new', () => {
    const existing = [remake, excludedOriginal];
    const alignment = {
      matches: [
        { existingId: 'resident-evil-2002', freshEntry: { ...remake } },
        { existingId: 'resident-evil-1996', freshEntry: rediscoveredOriginal }
      ],
      unmatched: []
    };
    const result = diffSeries(existing, alignment);

    // The excluded id appears somewhere in changed ∪ unchanged...
    const settled = [...result.unchanged, ...result.changed.map(c => c.existingId)];
    assert.ok(settled.includes('resident-evil-1996'), 'excluded entry must be categorized, not dropped');
    // ...and is NEVER emitted as a new entry. This is the no-re-surfacing core.
    assert.equal(result.new.length, 0, 'nothing should be new — re-discovered work is not re-surfaced');
  });

  // (a, contrast) The guard is meaningful: a GENUINELY new entry IS surfaced,
  // while the re-discovered excluded one is NOT. Proves `new` is not just empty.
  it('surfaces a genuine new entry while the re-discovered excluded one stays out of new', () => {
    const existing = [remake, excludedOriginal];
    const genuinelyNew = {
      id: 'resident-evil-4',
      title: 'Resident Evil 4',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '2005-01-11',
      summary: 'Leon rescues the president daughter.',
      image: null,
      imageUrl: null,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_4']
    };
    const alignment = {
      matches: [
        { existingId: 'resident-evil-2002', freshEntry: { ...remake } },
        { existingId: 'resident-evil-1996', freshEntry: rediscoveredOriginal }
      ],
      unmatched: [genuinelyNew]
    };
    const result = diffSeries(existing, alignment);

    const newIds = result.new.map(e => e.id);
    assert.deepStrictEqual(newIds, ['resident-evil-4'], 'only the genuine new entry is new');
    assert.equal(newIds.includes('resident-evil-1996'), false, 'the excluded work must NOT re-surface as new');
  });

  // The re-discovery with an IDENTICAL non-curation payload settles as unchanged.
  it('an identical re-discovered candidate on the excluded id is unchanged, not new', () => {
    const existing = [excludedOriginal];
    const identical = {
      title: 'Resident Evil (1996)',
      medium: 'game',
      branch: 'mainline',
      releaseDate: '1996-03-22',
      summary: 'The 1996 original, superseded by the 2002 remake.',
      image: null,
      imageUrl: null,
      sources: ['https://en.wikipedia.org/wiki/Resident_Evil_(1996_video_game)']
    };
    const alignment = {
      matches: [{ existingId: 'resident-evil-1996', freshEntry: identical }],
      unmatched: []
    };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-1996']);
    assert.equal(result.changed.length, 0);
    assert.equal(result.new.length, 0);
  });
});

describe('#54 exclusion memory — excluded:true PRESERVED through merge (green-emergent)', () => {
  // (b) The matched excluded entry keeps excluded:true (and the rest of its
  // curation) through mergeCuration, even when research changed a fact on it.
  it('preserves excluded:true on a re-discovered excluded entry whose summary changed', () => {
    const existing = [excludedOriginal];
    const alignment = {
      matches: [{ existingId: 'resident-evil-1996', freshEntry: rediscoveredOriginal }],
      unmatched: []
    };
    const diff = diffSeries(existing, alignment);
    // The summary delta surfaced; accept it (the maintainer takes the new fact).
    assert.equal(diff.changed.length, 1, 'summary should surface as the only change');
    diff.changed[0].fields.summary.accepted = true;

    const merged = mergeCuration(existing, diff);
    const original = merged.find(e => e.id === 'resident-evil-1996');
    assert.ok(original, 'the excluded entry survives the merge');
    assert.equal(original.excluded, true, 'excluded:true is preserved through the re-research');
    assert.equal(original.summary, 'The 1996 original survival horror game.', 'accepted fact applied');
    assert.equal(original.status, false, 'curation preserved');
    assert.equal(original.recommendedOrder, null, 'curation preserved');
  });

  // (b) Unchanged path: a re-discovered excluded entry with no field changes is
  // carried through merge with excluded:true intact.
  it('preserves excluded:true on an UNCHANGED re-discovered excluded entry', () => {
    const existing = [excludedOriginal];
    const identical = { ...rediscoveredOriginal, title: excludedOriginal.title, summary: excludedOriginal.summary };
    const alignment = {
      matches: [{ existingId: 'resident-evil-1996', freshEntry: identical }],
      unmatched: []
    };
    const diff = diffSeries(existing, alignment);
    assert.deepStrictEqual(diff.unchanged, ['resident-evil-1996']);

    const merged = mergeCuration(existing, diff);
    assert.equal(merged[0].excluded, true, 'excluded:true preserved on the unchanged path');
  });
});

describe('#54 exclusion memory — research can NEVER flip excluded (green-emergent)', () => {
  // (c) NEGATIVE/CONTRAST. `excluded` is a curation field, skipped by diffSeries
  // (not in DIFF_FIELDS) — so a fresh candidate carrying excluded:false on the
  // re-discovered id can never surface as a CHANGE that un-excludes the entry.
  it('a fresh candidate carrying excluded:false does NOT surface as a diff change', () => {
    const existing = [excludedOriginal];
    const freshTriesToUnexclude = { ...rediscoveredOriginal, title: excludedOriginal.title, summary: excludedOriginal.summary, excluded: false };
    const alignment = {
      matches: [{ existingId: 'resident-evil-1996', freshEntry: freshTriesToUnexclude }],
      unmatched: []
    };
    const result = diffSeries(existing, alignment);

    assert.deepStrictEqual(result.unchanged, ['resident-evil-1996'], 'no spurious change from the excluded field');
    assert.equal(result.changed.length, 0, 'excluded is curation — never a researched change');
  });

  // (c) Even if an accepted excluded:false delta is forcibly injected into the
  // diff, mergeCuration's CURATION_FIELDS restore wins — the exclusion holds.
  it('mergeCuration ignores an accepted excluded:false delta — exclusion is never re-litigated', () => {
    const existing = [excludedOriginal];
    const diff = {
      new: [],
      changed: [{
        existingId: 'resident-evil-1996',
        fields: { excluded: { old: true, new: false, accepted: true } }
      }],
      unchanged: []
    };
    const merged = mergeCuration(existing, diff);
    assert.equal(merged[0].excluded, true, 'research may not flip a remembered exclusion');
  });
});

describe('#54 exclusion memory — loader retains the excluded entry as an alignment target (green-emergent)', () => {
  // (d) END-TO-END-ISH. parseSeries on data.json containing an excluded entry
  // yields it among the existing entries — confirming the loader retains it, so
  // it is available as an alignment target on the next update.
  it('parseSeries keeps an excluded entry in entries, so it can be aligned onto next update', () => {
    const series = {
      slug: 'resident-evil',
      name: 'Resident Evil',
      entries: [remake, excludedOriginal]
    };
    const result = parseSeries(JSON.stringify(series));
    assert.equal(result.ok, true, `gate must accept: ${result.error}`);

    const loaded = result.series.entries.find(e => e.id === 'resident-evil-1996');
    assert.ok(loaded, 'excluded entry must be RETAINED by the loader (available as alignment target)');
    assert.equal(loaded.excluded, true, 'and still flagged excluded');

    // Closing the loop: feed the loaded existing set straight into diffSeries with
    // a re-discovered candidate on the retained id — it does not re-surface.
    const alignment = {
      matches: result.series.entries.map(e =>
        e.id === 'resident-evil-1996'
          ? { existingId: e.id, freshEntry: rediscoveredOriginal }
          : { existingId: e.id, freshEntry: { ...e } }
      ),
      unmatched: []
    };
    const diff = diffSeries(result.series.entries, alignment);
    assert.equal(diff.new.length, 0, 'a retained-then-realigned excluded entry never re-surfaces as new');
  });
});
