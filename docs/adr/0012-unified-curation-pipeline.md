# Create and update are one curation pipeline differing only in the starting set

`create-series` and `update-series` are modeled as **one pipeline** with a single parameter — the **starting set** of Entries. A create starts from the empty set; an update starts from the Series' current Entries. Every stage after that is identical:

```
starting set (∅ for create | current Entries for update)
        │
        ▼
  fresh research  ──►  align + diff + merge  ──►  Curation wizard  ──►  publish (parseSeries gate)
```

When the starting set is empty, align/diff/merge are pass-throughs: there is nothing to align against, every researched Entry falls through as "new," and the wizard sees raw research. `mergeCuration` already behaves this way for an empty existing set (empty `existingById` Map → everything lands in `new`), so no special-casing is required.

**The wizard sits on top of the merge; it does not replace it.** On an update, the curation-preservation machinery (semantic alignment → `diffSeries` → `mergeCuration`) runs **first** and produces a merged set in which the maintainer's curation — `status`, `recommendedOrder`, `recommendedReason`, `chronologicalOrder` — is preserved per [ADR-0009](0009-stable-content-derived-ids-semantic-matching.md). The wizard then edits that already-merged set (placing new Entries, adjusting order, filling lore dates and ranks for newcomers). This keeps three layers with one job each: **merge** preserves existing curation, the **wizard** is the human curation surface, and **`parseSeries`** is the fail-closed publish gate.

This resolves a conflict in the original wizard prototype, whose publish endpoint overwrote `data.json` wholesale. That is correct for a fresh population (a create — nothing to preserve) but would destroy curation on an update. Framing both as the same pipeline with different starting sets makes the wholesale write correct in exactly one case (the empty-set create) and routes updates through the merge first.

**The shared pipeline becomes a shared skill, `curate-series`,** which owns research → merge → wizard → publish. `create-series` and `update-series` remain as thin, user-facing entry points: each assembles its starting set (empty vs. loaded-and-validated existing data) and delegates. The two invocation verbs are kept because they are two distinct user intents; only the implementation is unified. The three skills are authored and edited with the `/write-a-skill` skill to keep structure and progressive disclosure consistent across the refactor.

## Considered options

- **Duplicate the wizard as a stage inside each of `create-series` and `update-series`** — rejected. It copies the most complex, highest-drift logic (merge + wizard + publish) into two places; the unification argument is precisely that this is one concern.
- **Collapse everything into one `manage-series` skill with a create/update mode flag** — rejected. It folds two clean user intents into a flag and discards two working, tested skills for a larger rewrite than needed. A shared `curate-series` skill with two thin entry points gets the DRY benefit while keeping the two intents distinct.
- **Let the wizard replace the update diff/merge (re-vet everything each update)** — rejected. It throws away the ADR-0009 curation-preservation guarantee and turns every refresh into a full re-curation of all Entries.
- **Wizard publish always overwrites `data.json` wholesale (the prototype's behavior)** — rejected. Safe only for a create; on an update it clobbers preserved curation. The starting-set framing keeps wholesale-write for the empty-set case and merges first otherwise.
