---
name: create-series
description: Create a new Series from a franchise name. Discovers media, researches Entries via per-medium subagents, consolidates into a reviewable Draft, and generates Shell-ready output after human approval. Use when user wants to add a new franchise tracker (e.g. "create a Silent Hill series", "add a new series for Zelda").
---

# create-series

## Quick start

User names a franchise → you discover media, research Entries, build a Draft, get approval, generate files.

## Workflow

### 0. Precondition

```js
import { checkPrecondition } from '../../pipeline/check-precondition.js';
const registry = JSON.parse(readFileSync('series.json', 'utf8'));
const check = checkPrecondition(registry, slug);
// If check.ok === false → abort, tell user to run update-series
```

### 1. Discovery

Identify which media the franchise spans (games, films, novels, comics, shows, …). Confirm the list with the user.

### 2. Research

Fan out **per-medium subagents**. Each finds Entries with: title, medium, branch (`mainline`/`spinoff`), releaseDate, summary, cover URL, sources (≥1). Each Entry self-assigns `confidence: "high" | "low"` and notes remakes via `versionNote`. Failed/timed-out media → record in `incompleteMedia`, don't drop silently.

### 3. Consolidate Draft

Merge results into a structured Draft (see [REFERENCE.md](REFERENCE.md) for schema):
- Mint ids via `deriveEntryId(title)` from `pipeline/derive-entry-id.js`
- Propose `recommendedOrder` + per-Entry `recommendedReason`
- Write `orderRationale`; set `status: false` for all Entries
- Persist to `.drafts/<slug>.json` (gitignored, resumable)

### 4. Review

Render Draft as Markdown (low-confidence Entries first). User approves or revises conversationally — reorder, drop, add, rewrite. Update `.drafts/<slug>.json` after each revision.

### 5. Generate (fail-closed)

Once approved — **no partial writes if any step fails**:

```js
import { validateDraft } from '../../pipeline/validate-draft.js';
import { draftToSeriesData } from '../../pipeline/draft-to-series-data.js';
import { appendToRegistry } from '../../pipeline/append-to-registry.js';
import { renderSeriesIndex } from '../../pipeline/render-series-index.js';
import { parseSeries } from '../../src/modules/parse-series.js';
```

1. `validateDraft(draft)` — abort if `!ok`
2. `draftToSeriesData(draft)` → data object
3. `parseSeries(JSON.stringify(data))` — **fail-closed gate**: abort if `!ok`
4. Write `series/<slug>/data.json`
5. `appendToRegistry(registry, { slug, name })` → write `series.json`
6. `renderSeriesIndex(name)` → write `series/<slug>/index.html`
7. Copy user-provided `theme.json` to `series/<slug>/theme.json` (auto-derivation deferred to #18)

### 6. Verify

Open `/series/<slug>/` in the real Shell via the dev server. Confirm TOC + Entry pages render.

## Constraints

- **Fail closed** — if `parseSeries` rejects the projection, write nothing
- **Idempotent registry** — `appendToRegistry` never duplicates a slug
- **Stable ids** — `deriveEntryId`, never positional (ADR-0009)
- **Draft is gitignored** — `.drafts/` is scratch, never committed
- **No schema changes** — output conforms to existing `data.json` / `theme.json`
- **Layout mode** — always `"paged"` (ADR-0006)
