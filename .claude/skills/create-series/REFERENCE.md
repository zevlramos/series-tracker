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
| `render-series-index.js` | `renderSeriesIndex(name) → htmlString` | Template substitution for index.html |

## Output files

| File | Content |
|------|---------|
| `series/<slug>/data.json` | The 13-field Entry array — must pass `parseSeries` |
| `series/<slug>/index.html` | Shell bootstrap page with correct `<title>` |
| `series/<slug>/theme.json` | Visual tokens — hand-provided until #18 lands `buildTheme` |
| `series.json` | Registry — `[{slug, name}]`, append-only |

## Domain vocabulary

Use terms from `CONTEXT.md`: Series, Entry, Medium, Branch, Status, Shell, Theme, Layout Mode, Draft, Source. Do not use: Franchise, Title (for Entry name), Item, Work.

## ADR cross-references

- **0004** — Checkpointed research pipeline (discovery → research → Draft → approval → generate)
- **0006** — Layout Mode: `"paged"` only at launch
- **0007** — Remakes are distinct Entries, no schema link
- **0008** — Draft is structured, durable, review-enriched
- **0009** — Stable content-derived ids; update matching is semantic

## Golden fixture

`tests/fixtures/resident-evil-draft.json` — hand-authored RE Draft. The acceptance bar: generated output renders in the Shell and matches or improves on the original hand-seed at `series/resident-evil/`.
