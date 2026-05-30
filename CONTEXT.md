# Series Tracker

A GitHub-hosted, static collection of franchise trackers. Each **Series** (Resident Evil, Silent Hill, …) gets its own themed front-end and a source-controlled record of every piece of media in it and whether it's been consumed. There is no backend — the data lives in the repo and is edited through source control.

## Language

**Series**:
One tracked franchise as a whole (e.g. Resident Evil). Each Series has its own directory, theme, and data file.
_Avoid_: Space, Franchise, Collection, Directory.

**Entry**:
A single piece of media within a Series — one game, novel, film, comic, show, podcast episode-set, etc. A remake or remaster is its **own** Entry, not a variant of the original; the recommended order is curated to feature one canonical version per slot (Resident Evil includes the 2002 remake and omits the 1996 original). See [[0007-remakes-are-curation-not-schema]].
_Avoid_: Title (reserved for an Entry's name), Work, Item.

**Medium**:
The kind of media an Entry is: game, novel, comic/graphic novel, film, show, stage play, podcast, audio, video, … Drives which verb the UI shows for consuming it.

**Branch**:
Whether an Entry is **mainline** (core canon of the Series) or a **spinoff** (side story, crossover, or ancillary work). Surfaced as a badge on the Entry.

**Status**:
Whether an Entry has been consumed — **binary**: done or not done (no in-progress stage). The field is called `status` generically, but the UI surfaces a **medium-specific verb**: Played / Not played (game), Read / Unread (novel/comic), Watched / Unwatched (film/show), Listened / Unlistened (podcast/audio).
_Avoid_: Consumed, Experienced (as field names — these describe the concept, not the field).

**Shell**:
The single shared static front-end that renders every Series from its data and theme. A Series never has its own app code; it plugs into the Shell. See [[0001-shared-shell-with-overrides]].

**Theme**:
The per-Series look, in two layers. **`theme.json`** holds the **Layout Mode** selector plus the machine-derivable **Visual tokens** (palette, fonts, hero image, background). An optional per-series **`theme.css`** carries the **Experiential layer** that tokens can't express. A Series is valid with tokens alone; it just looks generic. See [[0001-shared-shell-with-overrides]].

**`theme.css`** (Experiential layer):
The optional per-Series CSS the Shell loads on top of the **Visual tokens**, carrying the structure, texture, and motion that make a Series feel like its franchise (what a token can't express, e.g. aged-paper surface, page-turn motion). Routinely authored for a Series, not a rare escape hatch, but optional: a token-only Series still renders. Structural or navigational asks belong in a **Layout Mode**, not here. See [[0001-shared-shell-with-overrides]], [[0010-two-layer-theme-structure-vs-surface]].

**Layout Mode**:
One of the Shell's curated, enumerated page structures, chosen in a Series' Theme — e.g. *Paged* (TOC landing, one Entry per page, flip navigation, bookmark-tab jump-index). The mode owns structure and navigation (including which jump-index style is used); Visual tokens skin it. Layout is a theming axis, not just colors/fonts. Launch ships the *Paged* mode only. Structure, navigation, and behavior live here (shared); surface look lives in a Series' `theme.css`. See [[0006-layout-mode-theme-dimension]], [[0010-two-layer-theme-structure-vs-surface]].

**Visual token**:
A single named styling value in a Series' Theme (`theme.json`) that the Shell maps to its rendering — the palette colors (`bg`, `surface`, `text`, `accent`), the heading/body `fonts`, the `heroImage`, and the `background`. Tokens are a **closed, enumerated vocabulary**: a Series skins its **Layout Mode** by setting tokens and only tokens; anything a token can't express must go through the `theme.css`/partials override. Covers are **not** tokens — they live per-Entry in `data.json` (`image`/`imageUrl`). See [[0006-layout-mode-theme-dimension]].
_Avoid_: Style, CSS variable, setting.

**Timeline**:
The ordered display of a Series' Entries. Its default spine is the **Recommended order**. A reader can switch to other lenses the Series supports: **Chronological order** (in-universe) and **Release order** (by publication date). A sort is offered only when it has data to sort by, so no empty toggle is ever shown. These three orderings are orthogonal — the same Series can read differently under each.

**Recommended order**:
The curated "order you should generally consume this Series in," with a per-Entry reason for its placement. The headline of each Series and the Timeline's default. It is **authored, never derived** — it may intentionally diverge from both release and in-universe order (e.g. playing an original before its prequel so a later reveal still lands). See [[0011-curated-chronological-rank-lore-date-enrichment]].
_Avoid_: treating it as the in-universe timeline — the recommended path need not match **Chronological order**.

**Chronological order**:
The order a Series' Entries occur **in-universe** — the canon timeline, independent of when each shipped. A distinct lens from the **Recommended order**: a Series may deliberately be experienced out of in-universe order. Carried as an explicit per-Entry rank so it works even for a Series that has a clear in-universe order but no known in-universe dates (an Entry can have a known position without a known date). Seeded by **Lore date** where dates exist, then curated. See [[0011-curated-chronological-rank-lore-date-enrichment]].

**Lore date**:
The in-universe date an Entry's events are set (e.g. *September 1998*), distinct from its **release date** (when the media shipped). A fact surfaced on the Entry, often coarse (year-only) or unknown — many Series have a clear in-universe *order* but no meaningful in-universe *dates*. Informs **Chronological order** (it seeds the rank) but does not replace it. See [[0011-curated-chronological-rank-lore-date-enrichment]].
_Avoid_: Release date, Date (unqualified), Chronological order (that's the ordering, this is the date).

**Source**:
A citation URL on an Entry backing its existence and details. Lets a human verify research and lets `update-series` diff fresh research against existing data. See [[0004-checkpointed-research-pipeline]].

**Draft**:
The flat, reviewable intermediate that `create-series`/`update-series` produce from research — the Entry list, order, reasons, summaries, cover URLs, and Sources — before any site is generated. The maintainer curates the Draft in the **Curation wizard**, then it's rendered into the Shell.

**Curation wizard**:
The interactive surface where the maintainer vets a Draft pass by pass — keep/drop, branch, consumed, recommended order + reasons, in-universe timeline (lore dates and chronological rank), and summaries — rather than approving auto-decided choices in bulk. The shared curation stage for both `create-series` and `update-series`: it edits a starting set of Entries that is empty for a create and the curation-preserved merge for an update, so the wizard itself never needs to know which it is. See [[0012-unified-curation-pipeline]].
_Avoid_: Editor, Form (it's a guided multi-pass review, not a single form).

## Example dialogue

> **Dev:** "Is _Resident Evil 4_ an Entry or a Series?"
> **You:** "An Entry. Resident Evil is the Series; RE4 is one Entry in it, medium = game."
> **Dev:** "And when I finish it, I mark it consumed?"
> **You:** "You flip its Status — it's binary. Because its medium is game, the UI shows that as 'Played' vs 'Not played'."
