# In-universe order is a curated rank; lore date is a seeded enrichment

A Series' Timeline offers three orthogonal orderings, each a valid lens a reader can pick: **Recommended order** (the curated spine, the default), **Chronological order** (in-universe canon), and **Release order** (publication). They are genuinely different — the same Series reads differently under each — so all three are first-class, not variants of one.

**Recommended order is authored, never derived.** It is the human's "best way to experience this," and it may intentionally diverge from both release and in-universe order. The worked example: Resident Evil's recommended path is RE → RE0 (play the original, then the prequel, so the Rebecca reveal still lands), while the in-universe order is RE0 → RE (zero happens first). A date or a lore rank cannot produce the recommended order, because by the maintainer's own taste the recommended order is *not* the lore order. So recommended order stays a curated field (`recommendedOrder`) and is never computed.

**In-universe time is modeled as two fields with distinct jobs**, not one:

- `chronologicalOrder` — an integer **rank**. The *only* key the Chronological view sorts by. Human-curated, and a curation field preserved across `update-series` runs.
- `loreDate` — a variable-precision ISO string (`"1998"`, `"1998-09"`, `"1998-09-28"`), nullable. A **fact**: when the Entry's events are set. It has two jobs — it is surfaced on the Entry ("Set in: September 1998"), and during curation it **seeds** the chronological rank. A researched field, diffed across updates like `summary`/`releaseDate`.

**Why the rank is the sort key rather than sorting the date directly.** Real Series are never cleanly dated:

- **Ties** — a remake and its original share a lore date (RE2 and REmake 2 are both set in 1998). A raw-date sort leaves their order undefined; the rank fixes it and co-locates them.
- **Nulls** — an otherwise-dated Series still has vaguely-timed Entries. The rank places them; a date cannot.
- **Override** — chronological intuition can beat the raw date when dates collide or are coarse (the RE0/RE prequel case shares a month).
- **Ordered but dateless** — some Series have a clear in-universe order with no meaningful dates at all (Devil May Cry 3 is set before DMC1, but the exact in-universe dates are unknown and narratively irrelevant). A rank captures this; a date-keyed sort would silently exclude the whole Series.

The rank is therefore "the dates, sorted, with every tie, null, and override resolved into one clean total order." For a perfectly and uniquely dated Series the rank is just "sorted dates" — but because real Series are not that clean, the rank is standardized as the sort key and the date is the enrichment that seeds it and tells the reader *when*.

**The Chronological sort is offered when at least one Entry has a `chronologicalOrder`, and unknown ranks sort last.** This replaces the previous all-or-nothing gate (offer the sort only if *every* Entry has a rank), which left the sort permanently dead in practice — 4 of 67 Resident Evil Entries carried a rank, so the toggle never rendered. Keying availability off the rank (not the date) means a Series like Devil May Cry — ordered but undated — still gets the lens.

## Considered options

- **Lore date only; sort the Chronological view by the date directly** — rejected. It gives no lens to a Series that has in-universe *order* but no in-universe *dates* (Devil May Cry), and it leaves remake/original ties undefined. Dates are naturally sparse; making them the sort key makes the sort sparse too.
- **Rank only; no lore date** — rejected. It loses the high-value, low-cost "Set in 1998" display and the signal that co-locates remakes with their originals, which is the most useful half of the in-universe feature.
- **Two independently hand-maintained ordering fields (a date and a rank, each authored)** — rejected. They would drift and force the maintainer to keep them consistent by hand — the "two competing timeline mechanisms" this decision set out to avoid. Here only the rank orders; the date never tries to, and it *seeds* the rank rather than racing it.
- **Keep the old `chronologicalOrder` semantics and gate** — rejected. As a hand-authored, all-or-nothing sparse rank it was dead weight (never surfaced). Repurposing it as a date-seeded, partially-populated, nulls-last rank is what makes the in-universe lens real.
