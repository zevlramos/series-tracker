# Entry ids are stable and content-derived; update matching is semantic

Each Entry's `id` is **content-derived, human-meaningful, and stable** (`re2-remake`, `re0`, `degeneration`) — a concise slug from the canonical title, disambiguated where needed (a remake carries its year), assigned **once** when the Entry is first created and never renumbered. Ids must **not** be positional (`entry-1`, `entry-2`): reordering is the norm for a curated recommended order, and positional ids would renumber on every reorder, making the update diff treat every Entry as changed and destroying the human's preserved curation and Status.

`update-series` re-researches the whole Series and must align fresh results to existing Entries. It does this **semantically** — normalized title + `releaseDate` + `medium`, a judgment the agent makes well — and **carries forward the existing id** on a match, minting new stable ids only for genuinely new Entries. It does **not** re-derive ids and match on string equality: web-research titles drift run-to-run, so exact re-derivation is fragile. The human reviews the alignment in the diff Draft, so a mis-match is caught. In short: ids are for **cataloging and preservation**; the **comparison is semantic**.

Stable, meaningful ids also keep the deferred version-link in [ADR-0007](0007-remakes-are-curation-not-schema.md) cheap to backfill.

## Considered options

- **Positional / sequential ids** — rejected: they churn on every reorder, and reordering is the norm for a curated recommended order; the diff and all preserved curation would break.
- **Re-derive ids deterministically and match on id equality** — rejected: depends on the title being byte-stable across independent web-research runs, which it is not. Semantic alignment is robust to wording drift and is reviewed by the human anyway.
