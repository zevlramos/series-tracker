---
name: create-series
description: Create a new Series from a franchise name. Discovers media, researches Entries via per-medium subagents, then delegates to curate-series for the 6-phase wizard and publish, and derives the theme. Use when user wants to add a new franchise tracker (e.g. "create a Silent Hill series", "add a new series for Zelda").
---

# create-series

## Quick start

User names a franchise → you discover media, research Entries, then **delegate to
[curate-series](../curate-series/SKILL.md)** with an empty starting set: it runs the
6-phase wizard and publishes. A create is the unified pipeline with nothing to merge
against (ADR-0012); this skill owns discovery, research, and theming around it.

## Workflow

### 0. Precondition + resumability check

Derive the slug with `deriveEntryId(name)`. Run `checkPrecondition(registry, slug)` — abort if slug exists. Then check for an existing Draft at `.drafts/${slug}.json` — if one is present, skip research and hand it straight to curate-series (Stage 4). See [REFERENCE.md](REFERENCE.md) for code.

### 1. Discovery

Web-search the franchise to enumerate which media it spans. Use the valid medium values: `game`, `film`, `show`, `novel`, `comic`, `stagePlay`, `podcast`, `audio`, `video`.

Present the discovered media list to the user in one sentence and ask for confirmation:

> "I found that [Name] spans **games**, **films**, and **novels**. Anything to add or remove before I start researching?"

Proceed after the user confirms. If they add a medium, include it. If they narrow the scope, respect that.

### 2. Research (per-medium subagent fan-out)

Dispatch one `Agent` call per confirmed medium, all **in parallel**. Use `subagent_type: "general-purpose"`, named descriptively (e.g. `"research-games"`). See [REFERENCE.md](REFERENCE.md) for the subagent prompt template.

If a subagent errors or returns unparseable results, note that medium as incomplete and tell the user at handoff — don't retry automatically.

### 3. Consolidate the researched Entries

Merge all subagent results into a flat Entry list (you, the orchestrator — not a subagent).

1. Parse each subagent's JSON (strip code fences/prose first). Failed media → note them and tell the user; don't retry automatically.
2. Mint ids with `deriveEntryId(title)` for every Entry.
3. Seed a provisional `recommendedOrder` from **release order** — the create baseline: sort by `releaseDate` (undated Entries last) and number 1-based. Use `computeReleaseOrder` from `src/modules/order-lens.js` so the seed matches the Order phase's release-floor lens exactly. Add a one-line `recommendedReason` per Entry. The maintainer refines both in the wizard's Order phase. The old **mainline-first seed is retired** (ADR-0013): grouping all mainline ahead of all spinoffs regardless of date is what stranded mid-timeline spinoffs (e.g. Resident Evil Outbreak after a far-later mainline Entry).
4. Set `status: false`, `image: null`, `loreDate: null`, `chronologicalOrder: null` on each Entry.

### 4. Delegate to curate-series (empty starting set)

A create has nothing to merge against, so hand curate-series a **pass-through diff** —
every researched Entry is `new`:

```js
const startingEntries = [];                 // empty: create starts from ∅ (ADR-0012)
const approvedDiff = { new: researchedEntries, changed: [], unchanged: [] };
```

Then follow **[curate-series](../curate-series/SKILL.md)** from its Step 1 (merge is a
pass-through here) through publish. It writes the Draft, launches the 6-phase wizard, and
on the maintainer's "Publish" projects through the `parseSeries` gate to
`series/<slug>/data.json` + `series.json` + `index.html`. Do not write `data.json`
yourself — the wizard's publish is the single fail-closed write.

### 5. Theme (derive Visual tokens)

After the Series renders in the Shell, derive franchise-appropriate Visual tokens.

1. Web-search the franchise's visual identity — palette, fonts, key art, hero imagery.
2. Assemble with `buildTheme({ layoutMode: 'paged', tokens: { ... } })`, validate with `validateTheme`, write `series/<slug>/theme.json`. See [REFERENCE.md](REFERENCE.md) for code.
3. Open `/series/<slug>/` in the Shell to preview.
4. **Iterate.** Present the proposed tokens and ask:

> "Here's the theme I derived. You can ask me to: adjust colors, change fonts, add/remove the hero image, tweak the background, or approve as-is."

Rebuild → re-validate → write → refresh preview. Continue until approved.

### 6. Theme CSS (experiential layer)

After Visual tokens are approved, author a per-Series `theme.css` — the surface skin that tokens can't express (texture, typography feel, decorative elements). Per ADR-0010, `theme.css` is **surface only**.

1. Web-search the franchise's visual identity for texture, material, and decorative cues beyond palette/fonts.
2. Write `series/<slug>/theme.css` targeting the Shell's existing DOM classes (see `style.css` and `shell.js` for class names). It loads after `style.css`, so same-specificity selectors win by cascade order — avoid `!important`. Never assume custom DOM elements or JS-injected attributes.
3. Regenerate `series/<slug>/index.html` with `renderSeriesIndex(name, { hasThemeCss: true })` so the `<link>` is present.
4. Open `/series/<slug>/` in the Shell to preview.
5. **Iterate.** Present the proposed skin and ask:

> "Here's the theme.css I derived. You can ask me to: adjust textures, change decorative elements, tweak typography feel, or approve as-is."

Edit → write → refresh preview. Continue until approved.

**Structural/navigational gate (ADR-0010):** if the maintainer's feedback is structural or navigational — new DOM elements, JS behavior, navigation changes, animations requiring JS — **stop and surface the choice**:

> "That's a structural ask, not surface skin. Two options: (1) build it as a shared Layout Mode in the Shell (more work, reusable by other Series), or (2) build it as a one-off override (faster, bespoke to this Series). Which feels right?"

Do not silently bake structural asks into `theme.css`. The classification must be an explicit, surfaced decision at this checkpoint.

## Constraints

- **Publish belongs to curate-series** — the wizard's fail-closed `parseSeries` write is the only path that creates `data.json`; never write it from this skill
- **Stable ids** — `deriveEntryId`, never positional (ADR-0009)
- **Draft is gitignored** — `.drafts/` is scratch, never committed
- **No schema changes** — output conforms to existing `data.json` / `theme.json`
- **Layout mode** — always `"paged"` (ADR-0006)
- **Every Entry needs ≥1 Source URL** — the user must be able to verify claims
- **Remakes are distinct** — each gets its own Entry with a `versionNote` (ADR-0007)
- **Cover URLs recorded, never downloaded** — `imageUrl` only (ADR-0005)
- **Failed media surfaced** — tell the user which media didn't research; never silently dropped
