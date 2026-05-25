# Checkpointed, source-cited research pipeline

Both skills (`create-series`, `update-series`) run as a **checkpointed pipeline**: research → a flat reviewable **Draft** → human approval → generate/apply. They do not one-shot a finished site. Research fans out (parallel subagents per medium) and every Entry carries a **Source** URL.

`update-series` re-researches the *whole* Series and presents only a **diff** (new and previously-missed Entries, each with a proposed order slot + reason). It never overwrites Status or curated order/reasons — those are preserved; the human approves where new Entries land.

Web research across many media types is the project's main source of error (missed, invented, or mis-ordered Entries). A flat Draft is easy to vet; errors baked into a themed site are not. The checkpoint deliberately lands on the subjective, high-value curation — the recommended order and its reasons. Source URLs make claims verifiable and power the update diff.

## Considered options

- **One-shot generate** — build the finished site in one run, fix afterward. Rejected: hallucinated/missing Entries hide inside a built UI instead of being obvious in a list.
- **Incremental-only update** (just look for releases since last run) — cheaper, but blind to Entries the original research missed. Rejected in favor of full re-research, since updates are rare and reviewed anyway.
