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
The per-Series config (`theme.json`) that makes the Shell look like that Series: a **Layout Mode** selector plus **Visual tokens** (palette, fonts, background art, hero image). It does **not** hold arbitrary CSS — that's what the optional per-series `theme.css`/partials **override** is for, used only when a token can't express something.

**Layout Mode**:
One of the Shell's curated, enumerated page structures, chosen in a Series' Theme — e.g. *Paged* (TOC landing, one Entry per page, flip navigation, bookmark-tab jump-index). The mode owns structure and navigation (including which jump-index style is used); Visual tokens skin it. Layout is a theming axis, not just colors/fonts. Launch ships the *Paged* mode only. See [[0006-layout-mode-theme-dimension]].

**Visual token**:
A single named styling value in a Series' Theme (`theme.json`) that the Shell maps to its rendering — the palette colors (`bg`, `surface`, `text`, `accent`), the heading/body `fonts`, the `heroImage`, and the `background`. Tokens are a **closed, enumerated vocabulary**: a Series skins its **Layout Mode** by setting tokens and only tokens; anything a token can't express must go through the `theme.css`/partials override. Covers are **not** tokens — they live per-Entry in `data.json` (`image`/`imageUrl`). See [[0006-layout-mode-theme-dimension]].
_Avoid_: Style, CSS variable, setting.

**Timeline**:
The ordered display of a Series' Entries. Its default spine is the **Recommended order**; the Shell offers only the sorts a Series declares it supports — Recommended always, release date when Entries carry dates, and an optional in-universe **Chronological order** when defined — so no empty sort toggle is ever shown.

**Recommended order**:
The curated "order you should generally consume this Series in," with a per-Entry reason for its placement. The headline of each Series and the Timeline's default.

**Source**:
A citation URL on an Entry backing its existence and details. Lets a human verify research and lets `update-series` diff fresh research against existing data. See [[0004-checkpointed-research-pipeline]].

**Draft**:
The flat, reviewable intermediate that `create-series`/`update-series` produce from research — the Entry list, order, reasons, summaries, cover URLs, and Sources — before any site is generated. The human approves the Draft, then it's rendered into the Shell.

## Example dialogue

> **Dev:** "Is _Resident Evil 4_ an Entry or a Series?"
> **You:** "An Entry. Resident Evil is the Series; RE4 is one Entry in it, medium = game."
> **Dev:** "And when I finish it, I mark it consumed?"
> **You:** "You flip its Status — it's binary. Because its medium is game, the UI shows that as 'Played' vs 'Not played'."
