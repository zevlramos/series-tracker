# Shared shell with per-series override hatches

Every Series is rendered by one shared static **Shell** (HTML/CSS/JS) from per-series data and theme config, rather than as an independent site per Series. The Shell guarantees the required UX (timeline, status, spoiler-free summaries, jump-index) so a new Series is mostly `data.json` + `theme.json` + assets — which is what lets a skill build a whole Series in one run.

_Refined by [ADR-0006](0006-layout-mode-theme-dimension.md): the "required UX" is delivered through a curated menu of **Layout Modes** selected in `theme.json`, not a single fixed layout — layout structure is itself a theming axis._

The Shell also supports optional per-series overrides (a `theme.css` and custom section partials) for bespoke flourishes config can't express. **Config is the default path; an override is an exception that must justify itself** — this keeps Series from each rotting into bespoke snowflakes (which would have been the "independent sites" option we rejected).

## Considered options

- **Independent site per Series** — maximum theming freedom, but Claude regenerates a whole site each time (many failure points), no guaranteed UX, and Shell improvements don't propagate. Rejected: it sacrifices reliability and consistency, the two things the framework exists to provide.
- **Strict shell + config only (no overrides)** — simplest, but the escape hatch is cheap up front and expensive to retrofit, so we left it open.
