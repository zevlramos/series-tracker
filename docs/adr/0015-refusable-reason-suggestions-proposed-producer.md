# Reason suggestions are a refusable `_proposed*` producer — authored, maintainer-initiated, never a silent auto-fill

The Curation wizard's Order phase gave **placement** (`recommendedOrder`) refusable AI help (the order lenses + per-Entry "Move to #N" chips, [ADR-0013](0013-fandom-order-refusable-suggestion-lenses.md)) but gave its neighbour **reason** (`recommendedReason`) nothing — a blank textarea typed from scratch. Because the **Publish gate** hard-requires a non-empty reason on every visible Entry, a run that introduces many new Entries at once (the *#41 wall* — 19 new Resident Evil Entries) becomes a wall of fully-manual reason authoring with zero assist. This decision closes that asymmetry by giving reasons the same refusable-suggestion shape, while keeping `recommendedReason` *authored, never derived* ([ADR-0011](0011-curated-chronological-rank-lore-date-enrichment.md)).

## The decision

A research-time **producer** writes a per-Entry `_proposedReason` into the Draft as `_`-prefixed scratch — the same mechanism as `_orderResearch` ([ADR-0013](0013-fandom-order-refusable-suggestion-lenses.md)), i.e. prose instructions the research pass follows, **not** a live model call behind the wizard (`curate-server.mjs` stays a dumb file-server). The wizard surfaces it as a refusable suggestion the maintainer accepts, edits, or ignores. The accepted value lands in the real `recommendedReason`; the scratch field is dropped by **Projection** at publish, so it can never reach `data.json`.

The design is fixed on five points:

- **WHEN — pre-baked at research time, only for Entries lacking an authored reason.** `recommendedReason` is a CURATION-preserved field, so an update never clobbers an existing authored reason; the producer only proposes for the new (empty) Entries — exactly the #41 case. The accepted cost is *staleness*: a reason derived from "summary + placement" can drift if the Entry is later reordered. Acceptable because the suggestion is a floor-level starting point, not a placement-specific claim; revisit only if staleness bites in practice. (On-demand/live generation in the wizard was rejected — it reopens the live-model-behind-the-curation-UI door [ADR-0013](0013-fandom-order-refusable-suggestion-lenses.md) deliberately shut.)

- **HONESTY — thin-honest by default, fabricated authority banned, blank as last resort.** The producer emits a thin, *descriptive* one-liner grounded in the Entry's own summary and its honest placement basis ("A standalone side-story; slots here by release date"). It is forbidden from inventing editorial authority it has no source for ("an essential prequel you must play first"). A blank is the rare fallback when nothing truthful can be said. Rationale: **readers act on these reasons**, so a confident fabrication is strictly worse than a thin truth — it misroutes a real decision. This narrows the #41 wall rather than eliminating it; genuinely obscure Entries still require authoring.

- **GATE — the suggestion never counts as "filled"; the gate stays a backstop until the maintainer deliberately defuses it.** `_proposedReason` is scratch, stripped by Projection *before* the Publish gate runs, so it is *structurally* incapable of satisfying the gate — a value counts only once it lands in the real `recommendedReason`, which is a human act. **Nothing auto-fills on phase entry.** The lazy path (do nothing → Publish) still blocks on any blank, which is the catch that prevents shipping an un-reviewed reason.

- **SURFACING — ghost text in the textarea (option A), with the suggestion in the `placeholder`, not the value.** The proposal shows greyed *inside* the box; a "Use this" affordance copies it into the real field, and typing replaces it. Putting it in `placeholder` (genuinely empty as far as the value goes) keeps the gate honest — the box can look prefilled while `recommendedReason` stays empty until the maintainer acts. The grey-looks-done risk is purely visual and was accepted. (The accept/dismiss *chip* mirroring placement was the considered alternative; ghost-text was chosen for compact editing. The invariant — real field empty until an explicit act — holds under either, so this is reversible at low cost.)

- **BULK — a maintainer-initiated "Fill empty reasons" button, fills only blanks, reversible.** To answer the #41 scale without per-Entry clicking, one button runs "Use this" across every empty `recommendedReason`, with a one-level undo. It fills **only empties** (never overwrites a preserved/authored reason), is **maintainer-initiated** (a deliberate click, not a silent on-entry fill), and is **reversible** — the same "maintainer-initiated + reversible = authored" shape [ADR-0013](0013-fandom-order-refusable-suggestion-lenses.md)'s #65 amendment blessed for the bulk order-apply. After the click the gate-backstop is defused *for the blanks the maintainer chose to fill, at a moment they chose* — not invisibly.

## The spine: three apply-policies for one `_proposed*` plumbing

The same scratch-suggestion machinery gets deliberately *different* apply-policies depending on the field's nature. This table is the decision:

| Field | Nature | Apply-policy | Why |
|---|---|---|---|
| **placement** (`recommendedOrder`) | authored | bulk-previewable ("apply as baseline", #65) | a permutation is *one* coherent artifact the maintainer can review as a whole |
| **reason** (`recommendedReason`) | authored | per-Entry "Use this" + maintainer-initiated bulk "Fill empty reasons"; **never** silent auto-fill | N reasons aren't a single reviewable unit; the gate must keep catching un-reviewed Entries until the maintainer deliberately fills |
| **summary** (`summary`) | researched | auto-fill *is* legitimate (the existing `applyProposed`), with a "Factual" undo | the proposal is alternate phrasing of researched content; no editorial authority is forged |

The reframe that drives the reason row: **auto-fill vs. explicit-accept is a choice about the default, not about authority.** The textarea is always editable — override is never barred under any option. What differs is what *doing nothing* ships: auto-fill makes laziness ship unread machine text (the gate becomes a no-op, and a never-read reason is byte-identical in `data.json` to an authored one); explicit/maintainer-initiated keeps the gate a backstop. Because reasons are authored editorial judgements that readers act on, the default must not ship un-vouched text — hence no silent auto-fill for reasons, even though it is fine for summary.

## #63 — delete the dormant "AI rewrite" summary button

Given this producer pattern, the dormant `_proposedSummary` "AI rewrite" button ([#63](https://github.com/zevlramos/series-tracker/issues/63)) resolves to **delete**, not "build the symmetric producer":

- The producer for `_proposedSummary` *is* the scoped-out feature — `_proposedSummary` means an in-universe stylized **rewrite** (voice/tone/style), a separate, larger feature, not part of this work.
- The reason producer does **not** light it up — different field, opposite apply-policy (summary auto-fills as researched; reason is authored).
- A *factual* `_proposedSummary` is incoherent — `summary` already *is* the factual research text, so a factual proposal would duplicate it.

So there is no in-scope producer that resurrects the button. Remove the "AI rewrite" affordance and its inert `_proposedSummary` / `applyProposed()` plumbing until/unless summary-rewrite is greenlit on its own. (The separate `_origSummary` / "Factual" revert-to-research affordance works without a producer and can be kept independently.)

## Considered options

- **On-demand / live generation in the wizard** — rejected. Reopens the live-model-behind-the-curation-UI dependency [ADR-0013](0013-fandom-order-refusable-suggestion-lenses.md) rejected; pre-baking gets refusability with zero live calls.
- **Auto-fill `_proposedReason → recommendedReason` on phase entry** (the summary `applyProposed` model) — rejected for reasons. It silently satisfies the gate with unread machine text, hollowing the gate's "a human vouched for this" guarantee for an *authored* field. Legitimate for summary (researched) only.
- **Strictly per-Entry, no bulk** — rejected. It leaves the #41 scale unaddressed; a blanks-only, maintainer-initiated, reversible bulk fill answers it without violating the authored invariant.
- **Accept/dismiss chip instead of ghost text** — not taken, but a cheap reversal; the invariant holds under both, so the choice is presentation only.
- **Always propose something for obscure Entries** — rejected in favour of thin-honest-then-blank; fabricated authority on an Entry nobody has opinions on is the failure mode this feature must avoid.
