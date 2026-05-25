# No build step — vanilla shell served directly

The Shell is plain HTML + ES-module JS that fetches each Series' `data.json`/`theme.json` and renders client-side. No static site generator, no bundler, no GitHub Action. GitHub Pages serves the repo as-is.

Chosen over an SSG (Astro/11ty) because the deciding goal is "a skill builds a whole Series in one run": with no build, Claude just writes files and Pages serves them — nothing has to compile or pass CI — and merging a data PR updates the live site instantly. The cost is client-side rendering (no pre-rendered HTML), which is irrelevant for a personal tracker. Revisit if Series count or page weight ever makes client rendering or SEO a real problem.
