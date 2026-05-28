# create-series Reference

## Draft schema

The Draft is pipeline-internal JSON persisted at `.drafts/<slug>.json`. Review-only fields are stripped by `draftToSeriesData` before generation.

```json
{
  "slug": "string",
  "name": "string",
  "orderRationale": "string — why this overall recommended ordering",
  "incompleteMedia": ["string — media whose research did not finish"],
  "entries": [
    {
      "id": "string — content-derived via deriveEntryId",
      "title": "string",
      "medium": "game|novel|comic|film|show|stagePlay|podcast|audio|video",
      "branch": "mainline|spinoff",
      "releaseDate": "string|null — YYYY-MM-DD",
      "recommendedOrder": "integer",
      "recommendedReason": "string",
      "chronologicalOrder": "integer|null",
      "summary": "string",
      "image": "string|null — local asset path",
      "imageUrl": "string|null — remote cover URL",
      "status": "boolean — always false for new Series",
      "sources": ["string — citation URLs, at least one"],
      "confidence": "high|low",
      "confidenceReason": "string|null — why low; null when high",
      "versionNote": "string|null — e.g. '2019 remake of the 1998 original'",
      "sourceNotes": "string|null — e.g. 'Wikipedia + Fandom corroborate'"
    }
  ]
}
```

## Pipeline modules

| Module | Signature | Purpose |
|--------|-----------|---------|
| `check-precondition.js` | `checkPrecondition(registry, slug) → {ok}∣{ok:false, error}` | Refuse create if slug exists |
| `derive-entry-id.js` | `deriveEntryId(title, {disambiguator?}) → slug` | Stable content-derived id |
| `validate-draft.js` | `validateDraft(draft) → {ok, draft}∣{ok:false, error}` | Validate full Draft shape |
| `draft-to-series-data.js` | `draftToSeriesData(draft) → dataJsonObject` | Strip review fields → data.json |
| `append-to-registry.js` | `appendToRegistry(registry, {slug, name}) → registry` | Idempotent series.json append |
| `render-series-index.js` | `renderSeriesIndex(name, {hasThemeCss?}) → htmlString` | Template substitution for index.html; pass `{hasThemeCss: true}` to include `<link>` to `theme.css` |
| `flag-low-trust-source.js` | `hasOnlyLowTrustSources(sources) → boolean` | True if all sources match low-trust domains |
| `render-draft-markdown.js` | `renderDraftMarkdown(draft) → string` | Draft → review Markdown, flagged Entries first |
| `build-theme.js` | `buildTheme({layoutMode?, tokens}) → themeObject` | Assemble tokens into theme.json shape; defaults layoutMode to `"paged"`, fills missing heroImage/background with null |
| `validate-theme.js` | `validateTheme(theme) → {ok, theme}∣{ok:false, error}` | Validate theme.json shape: layoutMode enum, palette 4 keys, fonts 2 keys, heroImage/background present |

## Output files

| File | Content |
|------|---------|
| `series/<slug>/data.json` | The 13-field Entry array — must pass `parseSeries` |
| `series/<slug>/index.html` | Shell bootstrap page with correct `<title>` |
| `series/<slug>/theme.json` | Visual tokens — assembled by `buildTheme`, validated by `validateTheme` |
| `series/<slug>/theme.css` | Experiential layer — per-Series surface skin (optional, ADR-0010) |
| `series.json` | Registry — `[{slug, name}]`, append-only |

## Stage code snippets

### Stage 0 — Precondition + resumability

```js
import { checkPrecondition } from '../../pipeline/check-precondition.js';
import { deriveEntryId } from '../../pipeline/derive-entry-id.js';
import { readFileSync, existsSync } from 'node:fs';

const slug = deriveEntryId(name);
const registry = JSON.parse(readFileSync('series.json', 'utf8'));
const check = checkPrecondition(registry, slug);
// If check.ok === false → abort, tell user to run update-series
```

**Resumability:**

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
    // with fresh research as if no Draft existed.
  }
}
```

### Stage 2 — Subagent prompt template

Adapt the franchise name and medium:

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

### Stage 5 — Generate imports

```js
import { validateDraft } from '../../pipeline/validate-draft.js';
import { draftToSeriesData } from '../../pipeline/draft-to-series-data.js';
import { appendToRegistry } from '../../pipeline/append-to-registry.js';
import { renderSeriesIndex } from '../../pipeline/render-series-index.js';
import { parseSeries } from '../../src/modules/parse-series.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
```

### Stage 7 — Theme build + validate

```js
import { buildTheme } from '../../pipeline/build-theme.js';
import { validateTheme } from '../../pipeline/validate-theme.js';
import { writeFileSync } from 'node:fs';

const theme = buildTheme({
  layoutMode: 'paged',
  tokens: {
    palette: { bg: '...', surface: '...', text: '...', accent: '...' },
    fonts: { heading: '...', body: '...' },
    heroImage: '...' || null,
    background: '...' || null
  }
});

const result = validateTheme(theme);
if (!result.ok) throw new Error(`Invalid theme: ${result.error}`);

writeFileSync(`series/${slug}/theme.json`, JSON.stringify(theme, null, 2));
```

**What each token controls in the Shell:**
- `palette.bg` / `palette.surface` / `palette.text` / `palette.accent` — the four core colors
- `fonts.heading` / `fonts.body` — font stacks for headings and body text
- `heroImage` — if non-null, renders as a banner image above the TOC list
- `background` — if set, overrides `bg` on the `<body>` (e.g. a gradient)

## Domain vocabulary

Use terms from `CONTEXT.md`: Series, Entry, Medium, Branch, Status, Shell, Theme, Layout Mode, Draft, Source. Do not use: Franchise, Title (for Entry name), Item, Work.

## ADR cross-references

- **0004** — Checkpointed research pipeline (discovery → research → Draft → approval → generate)
- **0006** — Layout Mode: `"paged"` only at launch
- **0007** — Remakes are distinct Entries, no schema link
- **0008** — Draft is structured, durable, review-enriched
- **0009** — Stable content-derived ids; update matching is semantic
- **0010** — Two-layer Theme: `theme.json` (Visual tokens) + optional `theme.css` (Experiential layer)

## Golden fixture

`tests/fixtures/resident-evil-draft.json` — hand-authored RE Draft. The acceptance bar: generated output renders in the Shell and matches or improves on the original hand-seed at `series/resident-evil/`.
