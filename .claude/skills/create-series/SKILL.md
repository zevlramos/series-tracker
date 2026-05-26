# create-series

Create a new Series from a franchise name. Discovers media, researches Entries across parallel per-medium subagents, consolidates into a reviewable Draft, then generates Shell-ready output after human approval.

## When to use

The user wants to add a new franchise tracker (e.g. "create a Silent Hill series").

## Pipeline stages

### 0. Precondition check

Read `series.json`. If the slug already exists, **abort** and tell the user to run `update-series` instead — never overwrite a curated Series.

### 1. Discovery

Ask the user which franchise. Identify which media the franchise spans (games, films, novels, comics, shows, etc.). Confirm the media list with the user.

### 2. Per-medium research

Fan out research per medium. For each medium, find:
- Title, medium, branch (mainline/spinoff), releaseDate, summary, cover URL, sources (at least one)
- Self-assign `confidence: "high" | "low"` per Entry
- Note remakes/remasters as distinct candidates with a `versionNote`

If a medium's research fails or times out, record it in `incompleteMedia` rather than silently dropping it.

### 3. Consolidate into Draft

Merge all medium results into a single structured Draft:
- Mint `id` per Entry using `deriveEntryId(title)` from `pipeline/derive-entry-id.js`
- Propose a `recommendedOrder` with a per-Entry `recommendedReason`
- Write `orderRationale` explaining the overall ordering philosophy
- Set `status: false` for all Entries (nothing consumed yet)

Write the Draft to `.drafts/<slug>.json` (gitignored scratch — resumable if interrupted).

### 4. Render for review

Present the Draft to the user as readable Markdown:
- Low-confidence Entries surfaced first
- Each Entry shows: title, medium, branch, release date, recommended position + reason, sources
- Version notes and source notes visible

### 5. Human review/approval loop

The user approves or revises conversationally:
- Reorder, drop, add, rewrite reasons, change branches
- Iterate until the user approves

Update `.drafts/<slug>.json` after each revision.

### 6. Generate content outputs

Once approved, generate deterministically — **fail closed** (no partial writes if any step fails):

```javascript
import { validateDraft } from './pipeline/validate-draft.js';
import { draftToSeriesData } from './pipeline/draft-to-series-data.js';
import { appendToRegistry } from './pipeline/append-to-registry.js';
import { renderSeriesIndex } from './pipeline/render-series-index.js';
import { parseSeries } from './src/modules/parse-series.js';
```

1. `validateDraft(draft)` — abort if not ok
2. `draftToSeriesData(draft)` — project to data.json shape
3. `parseSeries(JSON.stringify(data))` — **fail-closed gate**: abort if not ok, write nothing
4. Write `series/<slug>/data.json`
5. `appendToRegistry(registry, { slug, name })` — write updated `series.json`
6. `renderSeriesIndex(name)` — write `series/<slug>/index.html`
7. Copy a default or proposed `theme.json` to `series/<slug>/theme.json`

### 7. Theme track (deferred to slice #18)

Propose theme tokens from franchise visual identity via `buildTheme`. Preview in the real Shell at `/series/<slug>/`. Iterate with the user until approved.

## Key constraints

- **Fail closed**: if `parseSeries` rejects the projected data, abort generation entirely — no partial files on disk.
- **Idempotent registry**: `appendToRegistry` never duplicates a slug.
- **Stable ids**: use `deriveEntryId` — never positional, so reordering never churns.
- **Draft is gitignored**: `.drafts/` is scratch, never committed.
- **No schema changes**: output must conform to existing `data.json` / `theme.json` shapes exactly.
- **Layout mode**: always `"paged"` (ADR-0006).

## References

- PRD: issue #14
- ADRs: 0004 (pipeline), 0006 (layout mode), 0008 (Draft), 0009 (stable ids)
- Domain vocabulary: CONTEXT.md
