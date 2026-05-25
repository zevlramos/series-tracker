# Remakes and remasters are curation, not schema

A franchise often has multiple versions of one work — an original game/film and its remake or remaster. Each version is its own **Entry** (own `id`, summary, sources). There is **no schema link** between a version and its original; the relationship is resolved by **curation**, not data. `create-series` surfaces every version as a distinct candidate and *proposes* which one fills the recommended-order slot (default: the modern canonical version), but the human decides at the Draft checkpoint whether to feature one, both, or one-with-a-note.

Consolidating versions in the UI (one collapsed "RE2" card with a 1998/2019 toggle) is a **deliberately deferred capability**, not an oversight. It would need an optional relationship field on the Entry schema — additive and backward-compatible, so adding it later costs nothing and needs no migration. We decline to build it now: no Series requires it, and the locked schema + Resident Evil golden seed already prove the curation-only approach. Stable, content-derived ids (`re2-original`, `re2-remake`) keep a future link cheap to backfill.

## Considered options

- **Add a `versionOf` / `relatedTo` field now** — rejected: speculative engineering against the just-locked, 272-test schema for a UI feature no Series has asked for. Its additive nature means deferring is free.
- **Silently merge or drop non-canonical versions during research** — rejected: dropping the original is indistinguishable from research *missing* it, the exact failure mode ADR-0004's Draft checkpoint exists to catch. Versions must surface as distinct candidates for human review.
