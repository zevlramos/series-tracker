---
name: update-series
description: Refresh an existing Series with newly released titles without clobbering the maintainer's curation. Re-researches, semantically aligns, diffs, then delegates to curate-series to merge-preserve and run the wizard before the parseSeries fail-closed publish. Use when user wants to update a series, add new entries to an existing franchise, or refresh series data.
---

# update-series

## Quick start

User names an existing Series → you re-research, semantically align fresh results to
existing Entries, diff, get field-by-field approval, then **delegate to
[curate-series](../curate-series/SKILL.md)** with the existing Entries as the starting
set. It merges (preserving curation), runs the 6-phase wizard, and publishes through the
`parseSeries` gate. An update is the unified pipeline with a non-empty starting set
(ADR-0012).

## Workflow

### 0. Load existing Series

Read the existing `series/<slug>/data.json` and validate it:

```js
import { parseSeries } from '../../src/modules/parse-series.js';
import { readFileSync } from 'node:fs';

const raw = readFileSync(`series/${slug}/data.json`, 'utf8');
const parseResult = parseSeries(raw);
if (!parseResult.ok) {
  // Abort — existing data is corrupt
  throw new Error(`Existing data.json failed validation: ${parseResult.error}`);
}
const existingSeries = parseResult.series;
```

### 1. Re-research

Reuse the create-series research pipeline: discover media, fan out per-medium subagents, consolidate results. The output is a flat list of fresh Entry objects with `id`, `title`, `medium`, `branch`, `releaseDate`, `summary`, `image`, `imageUrl`, and `sources`.

Mint ids for fresh entries with `deriveEntryId` — these are provisional and may be replaced during alignment.

### 2. Semantic alignment (LLM)

Match fresh results to existing Entries by **meaning** — normalized title + release date + medium — not by id string equality (ADR-0009). Web-research titles drift between runs, so exact matching is fragile.

Produce an alignment structure:

```js
const alignment = {
  matches: [
    { existingId: 'resident-evil-2002', freshEntry: { /* fresh fields */ } },
    // ...
  ],
  unmatched: [
    { id: 'resident-evil-5', /* genuinely new Entry, standalone work */ },
    // A new version of an already-tracked work: genuinely new (own id), but joins the
    // existing group and is flagged redundant — never matched onto the original's id,
    // never excluded by research (ADR-0014):
    {
      id: 'resident-evil-2-2019',
      versionGroup: 're2',                  // = the existing member's slug
      redundantWith: 'resident-evil-1998',  // surfaced as "redundant with X" in review
      /* other fresh fields */
    }
  ]
};
```

Rules:
- **Every existing Entry must appear in `matches`** — if fresh research didn't return anything for an existing Entry, pair the existing id with a `freshEntry` that mirrors the existing data (so it lands in `unchanged`). An existing Entry missing from the alignment would be silently dropped from the merge, destroying curation.
- **Carry forward existing ids** on matches — do not re-derive.
- **Mint new stable ids** (via `deriveEntryId`) only for genuinely new Entries in `unmatched`.
- A re-worded title that clearly refers to the same Entry must align, not appear as new.
- **Excluded entries are retained existing Entries (ADR-0014) — align them like any other.** An entry the maintainer deliberately excluded (`excluded: true`) is still in `data.json` and still in `existingSeries.entries`, so it MUST appear in `matches`. When re-research re-discovers that work, pair the fresh candidate onto the excluded Entry's **existing id** — do NOT emit it in `unmatched`/`new`. This is what stops a deliberately-omitted original (or dropped tie-in) from re-surfacing as a new entry on every update. The exclusion is remembered through the card; it is never re-litigated as a new discovery.
- **Flag redundancy: a genuinely-new entry that is another version of an already-tracked work (ADR-0014).** A freshly-released remaster or remake of a work already in `existingSeries.entries` is a *distinct* Entry — it is genuinely new, so it lands in `unmatched`/`new` with its own minted id (do NOT match it onto the original's id). But it is **the same underlying work** as a tracked version, so it is not independent of it. Seed its `versionGroup` with the **existing member's** `versionGroup` slug (joining the durable group), and attach a redundancy flag — `redundantWith: <existing id>` — describing it in the alignment review as "redundant with X" (e.g. "redundant with Resident Evil 2 (1998) — same work, 2019 remake"). This is a **flag only**: it seeds the version card so the maintainer can decide which version(s) to track. Do NOT set `excluded` — research never excludes; inclusion is the maintainer's decision on the card (#55).
- Present the alignment to the user for confirmation before proceeding — the redundancy flag is surfaced **inside this review the maintainer already confirms**, not acted on automatically.

### 3. Diff

Deterministically categorize aligned results:

```js
import { diffSeries } from '../../pipeline/diffSeries.js';

const diff = diffSeries(existingSeries.entries, alignment);
// diff = { new: [...], changed: [...], unchanged: [...] }
```

`diffSeries` compares only non-curation fields. The curation fields — **status**, **recommendedOrder**, **recommendedReason**, **chronologicalOrder**, **excluded**, and **versionGroup** (`CURATION_FIELDS`) — are never surfaced as changes; they are the maintainer's curation and are always preserved (ADR-0009, ADR-0014). In particular, a re-discovered excluded work can never surface a change that un-excludes it, and re-research can never flip `excluded`.

Each `changed` entry has per-field deltas:
```js
{
  existingId: 'resident-evil-degeneration',
  fields: {
    summary: { old: '...', new: '...' },
    releaseDate: { old: '2008-10-17', new: '2008-10-18' }
  }
}
```

### 4. Human approval — tag the diff with `accepted`

Present the diff and turn it into an **approved diff** curate-series can merge. `diffSeries`
emits `{old, new}` deltas with no `accepted` flag; the merge reads `delta.accepted`, so you
must inject it per field here.

**Unchanged entries** — list briefly, no action needed.

**Changed entries** — show each field change; the user accepts or rejects **per field**:

```js
// After user review, stamp each delta in place:
change.fields.summary.accepted = true;
change.fields.releaseDate.accepted = false;  // user wants to keep the old date
```

**New entries** (`diff.new`) — placement and reasons are the maintainer's job in the
wizard's Order phase; you don't need to pre-assign `recommendedOrder` here. New entries
default to `status: false` in the merge. A new entry that carries a `versionGroup` slug
(a fresh version of an already-tracked work) joins that durable group and seeds the
Include-phase version card, so the maintainer decides inclusion there — never pre-set
`excluded`. The `redundantWith` flag is review scratch (it surfaces the "redundant with X"
note in this approval); only the durable `versionGroup` is carried into the merge.

Continue until the user approves. The result is the `approvedDiff` —
`{ new: diff.new, changed: diff.changed (now with accepted flags), unchanged: diff.unchanged }`.

### 5. Delegate to curate-series (existing Entries as the starting set)

```js
const startingEntries = existingSeries.entries;   // non-empty: update preserves curation
const approvedDiff = { new: diff.new, changed: diff.changed, unchanged: diff.unchanged };
```

Then follow **[curate-series](../curate-series/SKILL.md)** from its Step 1. It runs
`mergeCuration(startingEntries, approvedDiff)` **before** the wizard (preserving `status`,
`recommendedOrder`, `recommendedReason`, `chronologicalOrder`, and `excluded` per ADR-0009/ADR-0014), writes the
Draft, runs the 6-phase wizard, and on "Publish" **projects through `draftToSeriesData`**
then the `parseSeries` gate before writing `series/<slug>/data.json`.

That projection is the fix for the old wholesale-write: publish writes the **projected**
merged set, never the raw working object — so wizard UI fields never reach disk, and
re-running `mergeCuration` after the wizard (which would revert Order/Timeline edits) is
designed out.

### 6. Verify

Open `/series/<slug>/` in the Shell and confirm the updated entries render correctly, and
that the Chronological lens reflects any rank edits.

## Constraints

- **Curation is never auto-overwritten** — the `CURATION_FIELDS` (status, recommendedOrder, recommendedReason, chronologicalOrder, excluded, versionGroup) are preserved by the merge (ADR-0009, ADR-0014)
- **Merge runs once, before the wizard** — never re-merge after; it would clobber Order/Timeline edits
- **Publish belongs to curate-series** — its projected, fail-closed `parseSeries` write is the only path that touches `data.json`
- **Semantic alignment, not string matching** — ids carried forward on matches, minted only for genuinely new Entries
- **Field-by-field approval** — the human accepts/rejects each changed field individually
- **Stable ids** — `deriveEntryId` for new Entries, never positional
- **Every Entry needs at least one Source URL**
- **Remakes are distinct** — each gets its own Entry (ADR-0007)
- **Exclusions are remembered (ADR-0014, #54)** — a deliberately-excluded Entry is retained in `data.json`; align a re-discovered candidate onto its existing id (never `new`), and `mergeCuration` preserves its `excluded: true`. A re-research can never un-exclude it or re-surface it as a new entry.
- **Alignment flags redundancy, never excludes (ADR-0014, #56)** — a fresh version of an already-tracked work is flagged "redundant with X" inside the alignment review and seeded into the existing `versionGroup`, but stays a genuinely-new Entry with its own id. Research/alignment **never** sets `excluded`; inclusion is the maintainer's decision on the version card.
