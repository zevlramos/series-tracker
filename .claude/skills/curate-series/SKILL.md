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

### 1.5 Research the fandom-order lenses (the Order-phase suggestion)

The Order phase offers researched orderings as **refusable suggestions** — never a seed
(ADR-0013). Research them here, before the wizard, with a single subagent that mirrors the
per-medium fan-out template (`create-series/REFERENCE.md`). It writes **pre-baked lenses**
into the Draft as `_orderResearch` scratch; the wizard switches between them instantly with
no live LLM. Run this for **both** create and update — the Order phase is uniform (ADR-0012).

Dispatch one `Agent` (`subagent_type: "general-purpose"`, e.g. `"research-order-lenses"`) over
the **merged** Entry list. Prompt it to find how the community recommends consuming the Series
and to return JSON:

```jsonc
{
  // the single most widely-agreed ordering, or null if no real consensus exists
  "consensus": { "label": "Fan-recommended order", "order": ["<entry title>", ...], "sources": ["<url>", ...] } | null,
  // 0..n NAMED competing framings — present ONLY on a real, sourced split (e.g. "Chronological", "Publication")
  "alternatives": [ { "label": "Chronological", "order": ["<title>", ...], "sources": ["<url>"] } ]
}
```

Honesty rules for the subagent: **invent no authority.** No consensus found → `consensus: null,
alternatives: []` (the wizard degrades to the release floor and says so). One obvious order →
consensus only, no alternatives. A genuine, cited disagreement → add alternatives. Permutation
only — orderings re-rank the existing set, never add or drop Entries.

Map each `order` title to the merged entry **id** (`deriveEntryId`), drop unknown titles, then
shape and sanity-check before writing:

```js
import { shapeLenses } from '../../src/modules/order-lens.js';
const research = { consensus, alternatives };   // ids, not titles, in each .order
const { honesty } = shapeLenses({ includedEntries: draftEntries.filter(e => !e._drop), research });
// honesty ∈ contested | uncontested | thin — the wizard recomputes this live over the included set.
```

If the subagent errors, write `{ consensus: null, alternatives: [] }` and tell the maintainer at
handoff — the floor still works. `_orderResearch` is `_`-prefixed scratch, stripped at publish.

### 2. Write the Draft (tag merge status, then persist)

Tag each merged entry so the wizard can show new / preserved / changed, then write the
starting Draft — carrying `_orderResearch` as top-level scratch. See
[REFERENCE.md](REFERENCE.md) for the exact tagging snippet.

```js
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.drafts', { recursive: true });
writeFileSync(`.drafts/${slug}.json`, JSON.stringify({ slug, name, _orderResearch: research, entries: draftEntries }, null, 2));
```

The Draft at `.drafts/<slug>.json` is gitignored scratch and is resumable — relaunching
the wizard re-reads it. The wizard autosaves top-level `_`-scratch verbatim, so `_orderResearch`
survives across phases and reloads.

### 3. Launch the wizard

```
node .claude/skills/curate-series/curate-server.mjs <slug>
```

Tell the maintainer to open **http://localhost:8123/** (set `CURATE_PORT` if 8123 is
busy). They drive six phases, autosaving as they go:

1. **Include** — keep/drop each Entry (Tinder card: → keep, ← drop). Entries that share a `versionGroup` slug (ADR-0014) collapse into one **merged version card** with a 3-way *Original only · Both · Remake only* choice (+ ✕ exclude both); default **Both** — nothing dropped until the maintainer picks.
2. **Branch** — mainline / spinoff.
3. **Consumed** — set `status`.
4. **Order** — author the **recommended** order. A lens switcher offers the researched framings (release floor + fan-consensus + alternatives) as refusable suggestions; per-entry ghost chips show where the active lens would place each Entry, with a surgical **Move to #N** accept (green where it already agrees). For a one-click baseline, each lens has an **Apply** button that reorders every Entry to that lens (reasons preserved, fully editable after) with an airtight one-level **Undo apply**. Drag or nudge freely; **dismiss** falls back to the release floor. Nothing writes to the order until the maintainer accepts, drags, or applies. Edit each one-line reason.
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
