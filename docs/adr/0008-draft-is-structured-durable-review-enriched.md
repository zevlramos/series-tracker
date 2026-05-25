# The Draft is a structured, durable, review-enriched artifact

`create-series` and `update-series` consolidate research into a **Draft** whose source of truth is a **structured file** (a superset of `data.json`'s entry shape plus review-only fields), not prose. The skill renders the Draft as a readable Markdown summary for approval; the human reacts in natural language and the agent edits the structured file and re-renders. Generation is then a mechanical projection: strip the review-only fields, validate against `parse-series.js`, write `data.json`.

The Draft is **written to disk before approval** — a gitignored scratch path (e.g. `.drafts/<slug>.json`), never the published `series/<slug>/`, which only ever holds final outputs. Research, the expensive many-subagent step, is therefore durable: a session that dies mid-review resumes at the review step instead of re-researching. "Checkpointed" in [ADR-0004](0004-checkpointed-research-pipeline.md) means both a human approval gate **and** a resumable on-disk artifact.

Review-only fields (stripped at generation, absent from `data.json`): a binary `confidence` flag per Entry, version-relationship notes (see [ADR-0007](0007-remakes-are-curation-not-schema.md)), brief source/corroboration notes, and a top-level proposed-order rationale. They exist to make the Draft *vettable*.

## Considered options

- **Markdown-canonical Draft, parsed to `data.json` at the end** — rejected: identical review experience, but it puts an LLM re-extraction step on the output boundary, where a dropped Entry or mangled date can still pass `parse-series.js` (which validates shape, not fidelity). Structured-canonical builds each Entry once, at consolidation, with full research context.
- **Ephemeral in-conversation Draft** — rejected: a dead session would discard all research and force a full re-run of the costly step.
