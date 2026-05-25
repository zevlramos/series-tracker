# Layout Mode is a first-class, enumerated theme dimension

Prototyping Resident Evil showed that **layout structure** — not just colors and fonts — is a primary driver of how a Series feels: the favored "paged book + table-of-contents + flip navigation" layout is fundamentally different from a vertical scroll. So the Shell owns a small, curated, **enumerated** set of **Layout Modes**, and a Series selects one in its `theme.json`.

This **refines ADR-0001**: the Shell still guarantees the required UX and stays config-first, but it does so through a *menu* of layouts rather than a single fixed one. Structure and skin are separate — a Layout Mode is neutral and reusable (Silent Hill could pick the same one); visual tokens (palette, fonts, art) skin it; arbitrary CSS still only goes through the override hatch. The **jump-index style is bundled with the Layout Mode**, not independently configurable.

**Launch scope: build exactly one mode** — *Paged* (TOC landing, one Entry per page, flip navigation, bookmark-tab jump-index), the structure behind the prototype's "Dossier" favorite. Additional modes (vertical scroll, card grid, horizontal panels) get built only when a real Series wants one — not speculatively.

**Visual reference:** the prototype on branch `worktree-prototype-re-ui` holds 5 variants; variant E ("Dossier") is the Paged mode skinned for RE. That RE skin is a *reference* for when `create-series` runs on RE — it is not committed as RE's series data/theme.

## Considered options

- **Build all 5 prototype variants as modes now** — rejected: speculative engineering for Series that don't exist yet.
- **Leave radical layouts to the override hatch** — rejected: they'd become bespoke per-series code, exactly the snowflake drift ADR-0001 guards against. Enumerated modes keep them shared and tested.
