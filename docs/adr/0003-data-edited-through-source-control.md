# Data edited through source control

Each Series' `data.json` is the single source of truth for both its Entries and their Status. There is no backend; changes are made as git commits/PRs. The Shell renders a per-Entry "Edit on GitHub" deep-link so marking something consumed is a few clicks into GitHub's web editor, then a commit.

Control over the data comes from **merge rights, not PR restrictions**: the repo is public (free GitHub Pages requires a public repo), so anyone can fork and open a PR, but only the owner can merge or push to the default branch — so `data.json` only changes when the owner merges. Branch protection can make this explicit.

## Considered options

- **localStorage + optional export** — zero-friction, instant, but device-specific, not synced, loseable, and creates two sources of truth. Rejected now; revisit once a backend exists to sync against.
- **A real backend / database** — none is available to host yet. The whole "source control is the DB" approach is the interim answer until one exists.
