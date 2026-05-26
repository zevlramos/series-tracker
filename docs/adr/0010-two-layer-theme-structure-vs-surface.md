# Two-layer Theme: structure is a Layout Mode, surface is a theme.css override

A Series' look is two layers:

- **`theme.json`** — machine-derivable **Visual tokens** (palette, fonts, hero image, background) plus the **Layout Mode** selector. The safe, closed layer `create-series` can always derive.
- **`theme.css`** — an optional per-Series CSS layer carrying the **Experiential layer**: the texture, structure-feel, and motion that tokens can't express.

The #16 theme spike (Resident Evil graded against its hand-seed) showed that tokens alone render as "the same layout in different colors": competent, but never franchise-distinct. The identity that landed lived in texture, structure, and motion. So `theme.css` is reframed from ADR-0001's "exception that must justify itself" into an expected, routinely-authored layer that `create-series` generates per Series. It stays **optional**: a token-only Series is valid and renders, it just looks generic.

This **refines [ADR-0001](0001-shared-shell-with-overrides.md)** (the override hatch is no longer a rare exception) and **[ADR-0006](0006-layout-mode-theme-dimension.md)** (which already made Layout Mode a theming axis distinct from skin).

## The classification rule

Two layers raise a recurring question: when a Series wants something tokens can't do, is it a per-Series `theme.css` customization, or a new shared **Layout Mode**? The rule:

> **Structure, navigation, or behavior → Layout Mode (shared, in the Shell). Surface look → `theme.css` (per-Series).**

"Would another Series reuse this?" and "does it need new DOM or JS?" are tells that you are on the structure side. Worked example: the dossier prototype's 3D page-turn is navigation, so it belongs to the Paged Layout Mode in the shared Shell; the leather-and-aged-paper skin is surface, so it belongs in Resident Evil's `theme.css`.

## Mechanism is shared even with one customer; adoption is per-Series

A new structural ask always has exactly one customer at first. Building it speculatively as a universal default is what ADR-0006 forbids; re-implementing it per Series is the snowflake drift ADR-0001 forbids. We square these: **build the structural mechanism once in the shared Shell, but let each Series opt into it.** The page-turn mechanism lives in the Shell; Resident Evil adopts it, another Series need not.

## The classification happens at the human checkpoint

The rule on paper does not prevent drift; the process does. When a maintainer's UI feedback is structural, the `create-series` / `update-series` theme stage **stops and surfaces the choice** — shared Layout Mode (more work, reusable) versus one-off override (faster, bespoke) — rather than silently defaulting to a per-Series customization. This mirrors how low-confidence and low-trust Entries are surfaced at the review checkpoint instead of being decided silently.

## Considered options

- **Keep `theme.css` as ADR-0001's rare exception** — rejected: the spike showed token-only Series are generic, so generating a `theme.css` has to be a normal step, not an exception, if Series are to feel like their franchise.
- **Make every structural flourish a Layout Mode** — rejected: speculative mode explosion for Series that don't exist yet (ADR-0006), and most surface flourishes are genuinely one-off.
- **Let the builder classify silently** — rejected: under time pressure that defaults to per-Series customization, which is exactly the snowflake drift; the classification must be an explicit, surfaced decision.
