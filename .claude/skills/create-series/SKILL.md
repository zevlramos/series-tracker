---
name: create-series
description: Create a new Series from a franchise name. Discovers media, researches Entries via per-medium subagents, consolidates into a reviewable Draft, and generates Shell-ready output after human approval. Use when user wants to add a new franchise tracker (e.g. "create a Silent Hill series", "add a new series for Zelda").
---

# create-series

## Quick start

User names a franchise → you discover media, research Entries, build a Draft, get approval, generate files.

## Workflow

### 0. Precondition + resumability check

Derive the slug with `deriveEntryId(name)`. Run `checkPrecondition(registry, slug)` — abort if slug exists. Then check for an existing Draft at `.drafts/${slug}.json` — if valid, skip to Stage 4 (Review). See [REFERENCE.md](REFERENCE.md) for code.

### 1. Discovery

Web-search the franchise to enumerate which media it spans. Use the valid medium values: `game`, `film`, `show`, `novel`, `comic`, `stagePlay`, `podcast`, `audio`, `video`.

Present the discovered media list to the user in one sentence and ask for confirmation:

> "I found that [Name] spans **games**, **films**, and **novels**. Anything to add or remove before I start researching?"

Proceed after the user confirms. If they add a medium, include it. If they narrow the scope, respect that.

### 2. Research (per-medium subagent fan-out)

Dispatch one `Agent` call per confirmed medium, all **in parallel**. Use `subagent_type: "general-purpose"`, named descriptively (e.g. `"research-games"`). See [REFERENCE.md](REFERENCE.md) for the subagent prompt template.

If a subagent errors or returns unparseable results, record that medium in `incompleteMedia` — don't retry automatically.

### 3. Consolidate Draft

Merge all subagent results into the Draft structure (you, the orchestrator — not a subagent).

1. Parse each subagent's JSON (strip code fences/prose first). Failed media → `incompleteMedia`.
2. Mint ids with `deriveEntryId(title)` for every Entry.
3. Assign `recommendedOrder` (1-based) — mainline first, then spinoffs. Write a `recommendedReason` per Entry and an `orderRationale` for the overall philosophy.
4. Set `status: false`, `image: null`, `chronologicalOrder: null` on each Entry.
5. Validate with `validateDraft` and persist to `.drafts/${slug}.json`. Never write while invalid — fix and re-validate first.

### 4. Review

Render with `renderDraftMarkdown(draft)` — low-confidence and low-trust-source Entries surface first. Tell the user:

> "Here's the Draft. You can ask me to: reorder entries, drop entries, add entries you think are missing, rewrite reasons or summaries, change branch assignments, or approve as-is."

**Conversational revision loop:** edit → re-validate → re-persist → show updated section. Continue until approved.

### 5. Generate (fail-closed)

Once approved — **no partial writes if any step fails**:

1. `validateDraft(draft)` — abort if `!ok`
2. `draftToSeriesData(draft)` → data object
3. `parseSeries(JSON.stringify(data))` — **fail-closed gate**: abort if `!ok`
4. Write `series/<slug>/data.json`
5. `appendToRegistry` → write `series.json`
6. `renderSeriesIndex` → write `series/<slug>/index.html`
7. Skip `theme.json` — Shell falls back to defaults. Stage 7 derives proper tokens after content is verified.

See [REFERENCE.md](REFERENCE.md) for imports and code.

### 6. Verify

Open `/series/<slug>/` in the real Shell via the dev server. Confirm TOC + Entry pages render with default styling.

### 7. Theme (derive Visual tokens)

After the Series renders in the Shell, derive franchise-appropriate Visual tokens.

1. Web-search the franchise's visual identity — palette, fonts, key art, hero imagery.
2. Assemble with `buildTheme({ layoutMode: 'paged', tokens: { ... } })`, validate with `validateTheme`, write `series/<slug>/theme.json`. See [REFERENCE.md](REFERENCE.md) for code.
3. Open `/series/<slug>/` in the Shell to preview.
4. **Iterate.** Present the proposed tokens and ask:

> "Here's the theme I derived. You can ask me to: adjust colors, change fonts, add/remove the hero image, tweak the background, or approve as-is."

Rebuild → re-validate → write → refresh preview. Continue until approved.

**Structural feedback (ADR-0010):** if the maintainer asks for something tokens can't express — texture, motion, custom layout, navigation changes — stop and surface the choice: "That's beyond what Visual tokens can do. It belongs in either a Layout Mode (shared structure) or a per-Series `theme.css` (experiential layer). Which feels right?" Do not silently encode structural asks as token hacks.

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
