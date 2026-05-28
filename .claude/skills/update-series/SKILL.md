---
name: update-series
description: Refresh an existing Series with newly released titles without clobbering the maintainer's curation. Re-researches, aligns, diffs, reviews, merges, and regenerates through the parseSeries fail-closed gate. Use when user wants to update a series, add new entries to an existing franchise, or refresh series data.
---

# update-series

## Quick start

User names an existing Series → you re-research, semantically align fresh results to existing Entries, diff, get field-by-field approval, merge preserving curation, and regenerate.

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
    { id: 'resident-evil-5', /* genuinely new Entry */ }
  ]
};
```

Rules:
- **Every existing Entry must appear in `matches`** — if fresh research didn't return anything for an existing Entry, pair the existing id with a `freshEntry` that mirrors the existing data (so it lands in `unchanged`). An existing Entry missing from the alignment would be silently dropped from the merge, destroying curation.
- **Carry forward existing ids** on matches — do not re-derive.
- **Mint new stable ids** (via `deriveEntryId`) only for genuinely new Entries in `unmatched`.
- A re-worded title that clearly refers to the same Entry must align, not appear as new.
- Present the alignment to the user for confirmation before proceeding.

### 3. Diff

Deterministically categorize aligned results:

```js
import { diffSeries } from '../../pipeline/diffSeries.js';

const diff = diffSeries(existingSeries.entries, alignment);
// diff = { new: [...], changed: [...], unchanged: [...] }
```

`diffSeries` compares only non-curation fields. **Status**, **recommendedOrder**, and **recommendedReason** are never surfaced as changes — they are the maintainer's curation and are always preserved (ADR-0009).

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

### 4. Human approval (review checkpoint)

Present the diff to the user. For each category:

**Unchanged entries** — list briefly, no action needed.

**Changed entries** — show each field change. The user accepts or rejects **per field**. Mark each delta with `accepted: true` or `accepted: false`:

```js
// After user review:
change.fields.summary.accepted = true;
change.fields.releaseDate.accepted = false;  // user wants to keep the old date
```

**New entries** — the user approves placement in the recommended order. Each new Entry needs:
- `recommendedOrder` — where it slots in
- `recommendedReason` — why it belongs there
- `status` — always `false` for new entries (never consumed yet)

Continue the review loop until the user approves.

### 5. Merge

Apply approved changes while preserving curation:

```js
import { mergeCuration } from '../../pipeline/mergeCuration.js';

const mergedEntries = mergeCuration(existingSeries.entries, diff);
```

`mergeCuration` guarantees:
- **Status** is never overwritten — existing entries keep their `status`, new entries default to `false`
- **recommendedOrder** and **recommendedReason** are preserved on existing entries
- Only fields where `accepted: true` are applied
- New entries are placed at their approved positions

### 6. Regenerate (fail-closed)

Rebuild the data file through the `parseSeries` gate:

```js
import { parseSeries } from '../../src/modules/parse-series.js';
import { writeFileSync } from 'node:fs';

const updatedData = {
  slug: existingSeries.slug,
  name: existingSeries.name,
  entries: mergedEntries
};

const gate = parseSeries(JSON.stringify(updatedData));
if (!gate.ok) {
  // Fail closed — do not write
  throw new Error(`parseSeries rejected merged output: ${gate.error}`);
}

writeFileSync(`series/${slug}/data.json`, JSON.stringify(updatedData, null, 2));
```

### 7. Verify

Open `/series/<slug>/` in the Shell and confirm the updated entries render correctly.

## Constraints

- **Curation is never auto-overwritten** — status, recommendedOrder, recommendedReason are preserved (ADR-0009)
- **Fail closed** — if `parseSeries` rejects the merged output, write nothing
- **Semantic alignment, not string matching** — ids are carried forward on matches, minted only for genuinely new Entries
- **Field-by-field approval** — the human accepts/rejects each changed field individually
- **Stable ids** — `deriveEntryId` for new Entries, never positional
- **Every Entry needs at least one Source URL**
- **Remakes are distinct** — each gets its own Entry (ADR-0007)
