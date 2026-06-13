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

## Published entry shape — the 16-field whitelist

`draftToSeriesData` rebuilds each entry from exactly these keys (any other field, including
every `_`-prefixed UI field, is dropped):

```
id, title, medium, branch, releaseDate, recommendedOrder, recommendedReason,
chronologicalOrder, loreDate, summary, image, imageUrl, status, excluded,
versionGroup, sources
```

Field rules enforced by `parseSeries` (the gate):
- Required non-empty strings: `id, title, medium, branch, recommendedReason, summary`.
- `recommendedOrder` — required integer. `status` — required boolean. `sources` — required array.
- `medium` ∈ game·novel·comic·film·show·stagePlay·podcast·audio·video. `branch` ∈ mainline·spinoff.
- `releaseDate` — string|null. `image`/`imageUrl` — any|null (never type-checked).
- `loreDate` — null, or a string that `parseLoreDate` accepts (`YYYY` / `YYYY-MM` / `YYYY-MM-DD`).
- `chronologicalOrder` — integer|null. **`0` is a real rank distinct from null** — never coerce empty→0 or 0→null. The Chronological lens turns on as soon as **any** Entry has a non-null rank (`0` counts); unranked (`null`) Entries sort last.
- `excluded` — boolean (default `false`, ADR-0014). An excluded Entry is retained but reader-hidden, so the gate **exempts** it from the `recommendedReason`/`recommendedOrder` requirements and sorts null-order Entries last.
- `versionGroup` — string|null (default `null`, ADR-0014). A content-derived slug shared by the Entries that are alternative versions of one work; the Include-phase version card is an emergent group-by on it. Both `excluded` and `versionGroup` are curation fields, preserved across `update-series`.

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

## Order-phase lenses (`_orderResearch` scratch, #40 / ADR-0013)

The Order phase helps the maintainer author `recommendedOrder` with **refusable suggestions**:
no researched/fandom ordering is ever auto-applied — the release-order floor is the baseline
(create seeds `recommendedOrder` from it before the wizard), and nothing writes to the order
until an explicit per-entry accept or a drag.

- **Pre-baked, no live LLM.** Step 1.5 researches the framings once and writes them to the Draft
  as top-level `_orderResearch = { consensus, alternatives }` (each `order` is an array of entry
  **ids**). The wizard reads this and switches lenses instantly; `curate-server.mjs` stays a dumb
  file-server.
- **`src/modules/order-lens.js`** (`shapeLenses`, `computeReleaseOrder`) is the single shaping
  core, imported by **both** the research step (to sanity-check honesty) and the wizard (served at
  `/src/modules/order-lens.js`). The wizard recomputes `shapeLenses({ includedEntries: included(),
  research: _orderResearch })` **every render**, so lenses always reflect the current included set
  (permutation-only — positions, never add/remove).
- **Lens kinds:** `release` (always present, computed from `releaseDate` — the honest floor and the
  dismiss target), `fan-consensus` (only when real consensus exists), `alternative` (0..n, only on a
  sourced split). **Honesty:** `thin` (no researched ordering → degrade to the floor), `uncontested`
  (one distinct researched ordering), `contested` (≥2 distinct — a real split to adjudicate).
- **Scratch survival.** `_orderResearch` is `_`-prefixed and lives top-level on the Draft. The wizard's
  autosave (`draftDoc`) carries every top-level `_`-field verbatim so a later phase never drops it;
  `draftToSeriesData` strips it at publish (it rebuilds from `{slug,name,entries}` + the 16-field
  whitelist, so top-level and per-entry `_`-fields both vanish).

## Include-phase version card (`versionGroup` group-by, #47 / #55 / ADR-0014)

When ≥2 Entries are alternative versions of one underlying work, the Include phase surfaces
them as a single **N-member version card** — "which version(s) of this work do I track," not N
independent keep/drops. The pure logic lives in `src/modules/version-card.js` (unit-tested under
`node --test`); `curate.html` imports it and owns only the DOM render and raw key-event wiring.

- **Grouped by the durable `versionGroup` field.** Each member carries a shared, content-derived
  `versionGroup` slug (ADR-0014); the card is an emergent group-by, not a pre-derived scratch
  array. `curate.html` calls `deriveVersionGroups(ENTRIES)` from `src/modules/version-pairing.js`
  — pure, deterministic — **at render time** every phase-1 paint, keyed off the entries' own
  `versionGroup`. There is no pre-wizard pairing step and nothing extra written to the Draft.
- **Render-time, not persisted.** `deriveVersionGroups` returns `[{ versionGroup, members }]`,
  one entry per slug shared by ≥2 entries, members in release order (nulls last). This replaces
  the retired title-matching matcher (`stripYear` + base-title equality + a publish-stripped
  `versionNote`), which produced zero pairings on update once titles were decorated.
- **Anchored at the earliest member.** `buildVersionCard(group)` folds the group into the deck at
  the **earliest** member's release slot (latest-anchor was considered and rejected), titled by
  the base work, e.g. "Resident Evil — which version(s)? · 3 versions · 1996–2015". Members are
  listed sorted by release date.
- **All shown by default; per-member show/exclude.** Nothing is hidden until the maintainer acts.
  A **release-timeline** rail shows each member as a solid node (shown) or dashed-ghost node
  (excluded), with a shared **"Readers will see"** readout (`readerOutcome`) beneath that reflects
  the live toggle state.
- **Keyboard — uniform accumulate-then-advance for ALL group sizes, including N=2** (this replaces
  #47's modal one-press-commit, where `1`/`2`/`3` committed a finished state and advanced). The
  pure reducer is `reduceCardKey(state, key, card)`:
  `1`–`N` toggle member N (date order) and **stay** on the card · `0` show all · `x` exclude all ·
  `→`/`Enter` advance (commit) · `←` back · `Space` skip. Number keys cap at 9; groups of 10+ fall
  back to click (the card says so).
- **Projects to durable `excluded`, not `_drop`.** Each member's show/exclude toggle writes the
  member Entry's durable `excluded` flag (`projectExclusions`). At publish, `selectPublishEntries`
  performs the 3-state projection: a `_drop` entry (a Tinder swipe-left on a non-grouped Entry) is
  genuinely removed; an `excluded:true` member is **retained** with `recommendedOrder: null` (the
  gate exempts it, #52); a visible Entry keeps `excluded:false` and is renumbered across the
  visible set only (excluded members consume no `recommendedOrder` slot). `versionGroup` and
  `excluded` are whitelisted, preserved curation fields that survive publish → re-import.
- The phase-1 card sequence folds each group into one card at the earliest member's slot; the
  other members get no standalone card. Phases 2–3 (Branch/Consumed) and 4–6 operate over the
  working visible set (`included()` = not `_drop` and not `excluded`).

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
