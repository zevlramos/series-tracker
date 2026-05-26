---
name: create-series
description: Create a new Series from a franchise name. Discovers media, researches Entries via per-medium subagents, consolidates into a reviewable Draft, and generates Shell-ready output after human approval. Use when user wants to add a new franchise tracker (e.g. "create a Silent Hill series", "add a new series for Zelda").
---

# create-series

## Quick start

User names a franchise → you discover media, research Entries, build a Draft, get approval, generate files.

## Workflow

### 0. Precondition + resumability check

Derive the slug from the franchise name with `deriveEntryId` — the same rule used to mint Entry ids, so the series slug, the registry key, and every Entry id stay consistent (handles accents and punctuation, e.g. `Pokémon` → `pokemon`). Then check two things:

```js
import { checkPrecondition } from '../../pipeline/check-precondition.js';
import { deriveEntryId } from '../../pipeline/derive-entry-id.js';
import { readFileSync, existsSync } from 'node:fs';

const slug = deriveEntryId(name);
const registry = JSON.parse(readFileSync('series.json', 'utf8'));
const check = checkPrecondition(registry, slug);
// If check.ok === false → abort, tell user to run update-series
```

**Resumability:** before doing any research, check if a Draft already exists:

```js
import { validateDraft } from '../../pipeline/validate-draft.js';

const draftPath = `.drafts/${slug}.json`;
if (existsSync(draftPath)) {
  const saved = JSON.parse(readFileSync(draftPath, 'utf8'));
  const result = validateDraft(saved);
  if (result.ok) {
    // Skip to Stage 4 (Review) — research is already done
    // Tell the user: "Found a saved Draft with N entries. Jumping to review."
  } else {
    // Saved Draft is stale or invalid (result.error). Warn the user and proceed
    // with fresh research as if no Draft existed — recovering a broken Draft is
    // human work, not worth auto-repairing. Do not jump to review.
  }
}
```

### 1. Discovery

Web-search the franchise to enumerate which media it spans. Use the valid medium values: `game`, `film`, `show`, `novel`, `comic`, `stagePlay`, `podcast`, `audio`, `video`.

Present the discovered media list to the user in one sentence and ask for confirmation:

> "I found that [Name] spans **games**, **films**, and **novels**. Anything to add or remove before I start researching?"

Proceed after the user confirms. If they add a medium, include it. If they narrow the scope, respect that.

### 2. Research (per-medium subagent fan-out)

Dispatch one `Agent` call per confirmed medium. Run all subagents **in parallel** (multiple Agent tool calls in one message). Each subagent searches the web for Entries in its assigned medium.

**Subagent prompt template** — adapt the franchise name and medium:

```
Research all [MEDIUM] entries in the [FRANCHISE NAME] franchise.

For each entry found, return a JSON array of objects with these fields:
- title: string — the official title. For remakes/remasters, include the year in parentheses to disambiguate (e.g. "Resident Evil 2 (2019)")
- medium: "[MEDIUM]"
- branch: "mainline" or "spinoff" — mainline if it's part of the core narrative, spinoff otherwise
- releaseDate: "YYYY-MM-DD" or null if unknown
- summary: 2-3 sentence plot/content summary
- imageUrl: a URL to official cover art or a reliable image, or null if not confidently found. Never download images.
- sources: array of 1+ URLs you used to verify this entry exists and get its details. Prefer authoritative sources (Wikipedia, official sites, established databases like IGDB/TMDB/GoodReads). Every entry MUST have at least one source URL.
- confidence: "high" or "low" — use "low" if: only one weak source exists, the entry's existence is ambiguous, sources disagree on key facts, or the entry is obscure with limited coverage
- confidenceReason: string explaining why confidence is low, or null if high
- versionNote: if this is a remake, remaster, or alternate version, describe its relationship to the original (e.g. "2019 remake of the 1998 original"). null if standalone.
- sourceNotes: brief note on source corroboration (e.g. "Wikipedia + IGDB corroborate"), or null

Important:
- Remakes and remasters are DISTINCT entries — never collapse them with the original
- Include the disambiguating year in the title for any remake/remaster
- Be thorough: find everything, including lesser-known entries
- If you cannot complete research (e.g. too many results, unclear scope), return what you have and note the limitation

Return ONLY the JSON array, no other text.
```

Use `subagent_type: "general-purpose"` for each. Name them descriptively (e.g. `"research-games"`, `"research-films"`).

**Handling failures:** if a subagent errors, times out, or returns unparseable results, record that medium in `incompleteMedia`. Do not retry automatically — the user will decide whether to re-run or proceed.

### 3. Consolidate Draft

Merge all subagent results into the Draft structure. This is done by you (the orchestrator), not a subagent.

**Step by step:**

1. Parse each subagent's JSON response. Strip surrounding code fences (` ```json ... ``` `) and any leading/trailing prose before `JSON.parse`. Only treat a medium as incomplete if extraction still fails after cleanup.

2. Mint stable ids for every Entry:
```js
import { deriveEntryId } from '../../pipeline/derive-entry-id.js';
// For each entry:
entry.id = deriveEntryId(entry.title);
// deriveEntryId handles the year-in-parens naturally — "Resident Evil 2 (2019)" → "resident-evil-2-2019"
```

3. Assign `recommendedOrder` (1-based) across all Entries. Propose an ordering that makes sense for experiencing the franchise — typically: mainline entries in narrative/release order first, then spinoffs. Write a `recommendedReason` per Entry explaining its placement.

4. Write an `orderRationale` summarizing the overall ordering philosophy.

5. Set every Entry's `status` to `false`, `image` to `null`, and `chronologicalOrder` to `null` (or assign if you're confident of an in-universe timeline).

6. Collect any media that failed into `incompleteMedia`.

7. Validate and persist:
```js
import { validateDraft } from '../../pipeline/validate-draft.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const draft = { slug, name, orderRationale, incompleteMedia, entries };
const validation = validateDraft(draft);
if (!validation.ok) {
  // Examine validation.error, correct the offending entry, and re-run validateDraft.
  // Never fall through to the write while invalid — fix and re-validate first.
  throw new Error(`Draft invalid — not persisting: ${validation.error}`);
}
mkdirSync('.drafts', { recursive: true });
writeFileSync(`.drafts/${slug}.json`, JSON.stringify(draft, null, 2));
```

### 4. Review

Render the Draft as Markdown for the user to review. Low-confidence Entries and Entries with only low-trust sources appear first under a "Needs review" heading.

```js
import { renderDraftMarkdown } from '../../pipeline/render-draft-markdown.js';
const md = renderDraftMarkdown(draft);
// Output the markdown to the user
```

Tell the user what they can do:

> "Here's the Draft. You can ask me to: reorder entries, drop entries, add entries you think are missing, rewrite reasons or summaries, change branch assignments, or approve as-is. I'll update the Draft after each change."

**Conversational revision loop:** the user makes requests in natural language. For each:
1. Edit the in-memory draft object accordingly
2. Re-validate with `validateDraft`
3. Re-persist to `.drafts/<slug>.json`
4. Re-render and show the updated section (not the full Draft unless asked)

Continue until the user approves (says something like "looks good", "approved", "ship it").

### 5. Generate (fail-closed)

Once approved — **no partial writes if any step fails**:

```js
import { validateDraft } from '../../pipeline/validate-draft.js';
import { draftToSeriesData } from '../../pipeline/draft-to-series-data.js';
import { appendToRegistry } from '../../pipeline/append-to-registry.js';
import { renderSeriesIndex } from '../../pipeline/render-series-index.js';
import { parseSeries } from '../../src/modules/parse-series.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
```

1. `validateDraft(draft)` — abort if `!ok`
2. `draftToSeriesData(draft)` → data object
3. `parseSeries(JSON.stringify(data))` — **fail-closed gate**: abort if `!ok`
4. `mkdirSync(`series/${slug}`, { recursive: true })` then write `series/<slug>/data.json`
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
- **Every Entry needs ≥1 Source URL** — the user must be able to verify claims
- **Remakes are distinct** — each gets its own Entry with a `versionNote` (ADR-0007)
- **Cover URLs recorded, never downloaded** — `imageUrl` only (ADR-0005)
- **Failed media → `incompleteMedia`** — never silently dropped
- **Low-confidence first** — flagged Entries surface at the top of the review Markdown
