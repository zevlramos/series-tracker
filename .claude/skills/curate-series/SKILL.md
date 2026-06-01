---
name: curate-series
description: Shared curation engine for create-series and update-series — merges a starting set with fresh research, drives the 6-phase Curation wizard, and publishes through the parseSeries gate. Use when create-series or update-series needs to run the wizard; not usually invoked directly by a user.
---

# curate-series

## Quick start

A caller (create-series or update-series) hands you a **starting set** of Entries
(empty for create, the Series' current Entries for update) plus an **approved diff**.
You merge, write the merged set as a Draft, launch the wizard, and the maintainer
curates and publishes. The pipeline is identical for both verbs — only the starting
set differs (ADR-0012).

```
starting set (∅ create | current Entries update)
   └─► mergeCuration (update only, BEFORE the wizard) ─► Draft ─► wizard ─► publish (parseSeries gate)
```

## Inputs the caller provides

- `slug`, `name` — the Series identity.
- `startingEntries` — `[]` for create; the validated existing `entries` for update.
- `approvedDiff` — `{ new: Entry[], changed: [{existingId, fields:{f:{old,new,accepted}}}], unchanged: string[] }`.
  For a create this is `{ new: <all researched entries>, changed: [], unchanged: [] }`.

## Workflow

### 1. Merge (preserve curation — update only)

```js
import { mergeCuration } from '../../pipeline/mergeCuration.js';
const merged = mergeCuration(startingEntries, approvedDiff);
```

For a create the starting set is empty, so every entry falls through as new and
`merged` is just the researched entries with `status:false` — no special-casing
(ADR-0012). **Run merge exactly once, before the wizard. Never re-run it after** —
it restores `status`, `recommendedOrder`, `recommendedReason`, `chronologicalOrder`
from the existing entry (CURATION_FIELDS), which would clobber the maintainer's
Order- and Timeline-phase edits.

### 2. Write the Draft (tag merge status, then persist)

Tag each merged entry so the wizard can show new / preserved / changed, then write
the starting Draft. See [REFERENCE.md](REFERENCE.md) for the exact tagging snippet.

```js
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.drafts', { recursive: true });
writeFileSync(`.drafts/${slug}.json`, JSON.stringify({ slug, name, entries: draftEntries }, null, 2));
```

The Draft at `.drafts/<slug>.json` is gitignored scratch and is resumable — relaunching
the wizard re-reads it.

### 3. Launch the wizard

```
node .claude/skills/curate-series/curate-server.mjs <slug>
```

Tell the maintainer to open **http://localhost:8123/** (set `CURATE_PORT` if 8123 is
busy). They drive six phases, autosaving as they go:

1. **Include** — keep/drop each Entry (Tinder card: → keep, ← drop).
2. **Branch** — mainline / spinoff.
3. **Consumed** — set `status`.
4. **Order** — drag the **recommended** order, edit each one-line reason.
5. **Timeline** — set `loreDate` (any precision) and the **chronological rank**; drift advisories flag large gaps, dismissable.
6. **Summaries** — edit the per-Entry summary (AI-rewrite ↔ factual).

### 4. Publish (maintainer clicks "Publish to site")

The server projects the working set through `draftToSeriesData` (dropping every
`_`-prefixed UI field), runs the fail-closed `parseSeries` gate, and writes
`series/<slug>/data.json` **only if the gate passes** — plus the registry entry and
`index.html` on first publish. Nothing is written on rejection; the error shows in the
wizard's status line.

### 5. Verify

Open `/series/<slug>/` in the Shell. Confirm the TOC and Entry pages render, and that
the Chronological sort appears once at least one Entry has a rank.

## Constraints

- **Merge before the wizard, never after** — re-merging reverts Order/Timeline edits.
- **Publish is the only write** — `/stage` autosave is ungated scratch; `/publish` is the `parseSeries` gate.
- **Fail closed** — if the gate rejects the projection, nothing is written.
- **UI fields never reach disk** — `draftToSeriesData` projects to the 14 schema fields.
- **New Entries need a `recommendedReason`** — the gate requires it; the Order phase is where the maintainer writes it.
- **Draft is gitignored scratch** — `.drafts/<slug>.json`, never committed.
