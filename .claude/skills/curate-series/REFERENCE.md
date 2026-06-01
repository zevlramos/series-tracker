# curate-series Reference

## The starting-set framing (ADR-0012)

create-series and update-series are one pipeline with one parameter — the starting set.
A create starts empty; an update starts from the current Entries. `mergeCuration` already
handles the empty case (empty `existingById` Map → everything lands in `new`), so the
wizard never needs to know which verb invoked it.

| Layer | Job |
|-------|-----|
| `mergeCuration` | Preserve existing curation (update); pass-through (create). Runs **once, before** the wizard. |
| Curation wizard | The human curation surface — 6 phases over the merged set. |
| `parseSeries` | Fail-closed publish gate. |

## Merge-status tagging (Draft step)

`mergeCuration` returns a **flat array** with no status field. Derive `_mergeStatus`
from the `approvedDiff` buckets the caller already holds — not from array position
(positional mapping breaks if merge order ever changes):

```js
const changedIds = new Set(approvedDiff.changed.map(c => c.existingId));
const newIds     = new Set(approvedDiff.new.map(e => e.id));
const draftEntries = merged.map(e => ({
  ...e,
  _mergeStatus: newIds.has(e.id) ? 'new' : changedIds.has(e.id) ? 'changed' : 'preserved',
}));
```

Note the naming: the spec's **`preserved`** is the diff bucket literally named
**`unchanged`** — there is no `preserved` key in the code. `_mergeStatus` is itself a
UI field and is stripped at publish.

## The merge layer in detail

`diffSeries(existingEntries, alignment) → { new, changed, unchanged }`:
- `new` = `alignment.unmatched` (genuinely new Entries).
- `changed` = `[{ existingId, fields: { <field>: { old, new } } }]` — non-curation fields only.
- `unchanged` = array of existing ids with no field changes.

**The diff is not directly merge-ready.** `mergeCuration` reads `delta.accepted` on each
changed field, but `diffSeries` emits `{old, new}` with no `accepted`. The caller's review
step must inject `accepted: true|false` per field before calling `mergeCuration`. For a
create there are no changed entries, so this seam is inert.

`mergeCuration(existingEntries, approvedDiff)` restores all four `CURATION_FIELDS`
(`status`, `recommendedOrder`, `recommendedReason`, `chronologicalOrder`) from the existing
entry after applying accepted deltas — which is exactly why it must run **before** the
wizard edits those fields, and never again after.

## Published entry shape — the 14-field whitelist

`draftToSeriesData` rebuilds each entry from exactly these keys (any other field, including
every `_`-prefixed UI field, is dropped):

```
id, title, medium, branch, releaseDate, recommendedOrder, recommendedReason,
chronologicalOrder, loreDate, summary, image, imageUrl, status, sources
```

Field rules enforced by `parseSeries` (the gate):
- Required non-empty strings: `id, title, medium, branch, recommendedReason, summary`.
- `recommendedOrder` — required integer. `status` — required boolean. `sources` — required array.
- `medium` ∈ game·novel·comic·film·show·stagePlay·podcast·audio·video. `branch` ∈ mainline·spinoff.
- `releaseDate` — string|null. `image`/`imageUrl` — any|null (never type-checked).
- `loreDate` — null, or a string that `parseLoreDate` accepts (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`).
- `chronologicalOrder` — integer|null. **`0` is a real rank distinct from null** — never coerce empty→0 or 0→null. The Chronological lens turns on as soon as **any** Entry has a non-null rank (`0` counts); unranked (`null`) Entries sort last.

## The committed tooling

Two committed, series-agnostic files in this skill directory:

- **`curate.html`** — the wizard UI. Loads `name`/`slug`/`entries`/`_mergeStatus` from
  `GET /data` at runtime; imports the repo's real `esc` and `lore-date` helpers (served
  at `/src/modules/*`) so its date handling matches the gate exactly.
- **`curate-server.mjs`** — local Node server (`node curate-server.mjs <slug>`). Endpoints:

| Route | Method | Behaviour |
|-------|--------|-----------|
| `/` | GET | serve `curate.html` |
| `/data` | GET | the working Draft (`.drafts/<slug>.json`) |
| `/src/...`, `/pipeline/...` | GET | serve a whitelisted browser-imported module |
| `/stage` | POST | **ungated** autosave of the full working set → `.drafts/<slug>.json` |
| `/publish` | POST | `draftToSeriesData` → `parseSeries` gate → write `data.json` + registry + `index.html` only on `gate.ok` |

The wizard autosaves the **entire** working set (UI flags included) on every change, so a
later phase's save never clobbers an earlier phase's edits.

## Drift advisories (Timeline phase)

- **Secondary (rank-vs-lore)** — a chronological rank that contradicts its own lore date.
  Fixed inline: **Match the dates** (moves only that one Entry, never reseeds others) or
  **Keep as-is**.
- **Primary (recommended-vs-lore)** — an Entry recommended far ahead of another whose lore
  date is much later (large gaps only). Surfaced as a banner: **Fix in Order phase** or
  **Dismiss**. This is a **first cut** for the maintainer to drive.
- Both are amber, dismissable, and **never gate publish** — the recommended order may
  intentionally diverge from in-universe order (CONTEXT.md).

## ADR cross-references

- **0008** — Draft is structured, durable, resumable scratch.
- **0009** — Stable content-derived ids; alignment is semantic; curation is preserved.
- **0011** — Curated chronological rank + lore-date enrichment.
- **0012** — Unified curation pipeline; the starting-set framing.
