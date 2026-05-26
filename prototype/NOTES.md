# Theme Aesthetic Spike — Issue #16

**Question:** Can an LLM auto-derive Theme tokens (palette, fonts, heroImage, background) for a franchise that match or beat hand-authored ones?

**Fixture:** `series/resident-evil/theme.json` (hand-authored baseline).

## How to run

```
# from the worktree root
python3 -m http.server 8070
# Open http://localhost:8070/prototype/index.html?theme=dossier-full
```

Use the floating switcher at the bottom or `[` / `]` keys to toggle variants.

## Variants

| ID | Strategy | Verdict |
|----|----------|---------|
| `baseline` | Hand-authored theme.json (the graded fixture) | Fine, but generic — dark + crimson + system fonts |
| `cinematic-horror` | RE2-remake / Village key-art palette, dramatic serif | Token-only; competent but not exciting |
| `umbrella-clinical` | Umbrella Corp visual identity, light mode, geometric sans | Token-only; a genuinely different *read* of the franchise |
| `typewriter-dossier` | In-game typewriter/documents, aged paper, mono fonts | Token-only; the closest tokens get, still flat |
| `biohazard` | Hazard iconography, caution-tape yellow/black, industrial | Token-only; the deliberate "miss" |
| `dossier-full` | **Same typewriter tokens + a `theme.css` override** | **Winner.** Leather-bound book, aged paper, right-edge bookmark tabs, 3D clone-overlay page-flip |

## Findings

### The token surface is too thin to differentiate franchises

This is the headline result. Auto-derived **tokens alone (palette + fonts + bg) all look like the same layout in different colors** — competent, but none of them is *exciting* or franchise-distinct. An LLM picking good hex values and font stacks can match the hand-authored baseline, but matching it isn't the bar; the baseline itself is generic.

The aesthetic identity that made the franchise feel real lived in **structure, texture, and motion** — none of which fits in `theme.json`:
- aged-paper surface texture + leather spine/cover frame
- right-edge bookmark tabs (vertical, hover-to-expand)
- a 3D page-turn animation (clone-overlay, rotates around the left spine, box-shadow depth)
- typewriter section labels, CONFIDENTIAL stamp, "File No." headers

### Recommendation: a two-layer Theme = `theme.json` (tokens) + `theme.css` (experience)

Tokens stay for the mechanical layer (colors, fonts) so they remain machine-derivable and safe. The **experiential layer** is a per-series `theme.css` override that reshapes the real Shell's DOM. This is exactly the override hatch ADR-0001 already anticipates — `theme.css` *is* that hatch.

For the `create-series` theme step, an LLM should derive **both**: the `theme.json` tokens AND a `theme.css`. The token derivation is the easy/safe part; the `theme.css` is where the franchise identity actually comes from, and is the harder generation problem worth its own slice.

### CSS gap: heroImage and background are dead tokens

`themeToCssVars()` writes `--hero-image` and `--background`, but `style.css` never consumes them. The prototype adds minimal CSS hooks to test them. **Either wire them up in the real Shell or drop them from the token schema** — shipping tokens nothing reads is a trap.

### What moved the needle?

- **Palette / Fonts:** necessary but not sufficient — they set mood, not identity.
- **theme.css (structure + texture + motion):** this is the whole game. The `dossier-full` variant is the only one that felt like *Resident Evil* rather than "a dark website."

### Page-flip animation (recovered + ported)

The dossier flip is a **clone-overlay**: a copy of the viewport is pinned `position: fixed` over the live content and flipped, so the real DOM never distorts. Both directions rotate around the left spine (`rotateY` overshoot to `-105deg`, inline `perspective(1800px)`, box-shadow ramp for depth); forward sweeps the outgoing page away, backward sweeps the incoming page in. Recovered from the original prototype-E session (`44ecc85b…jsonl`) since that worktree was deleted.

## Decisions to carry into the theme slice

1. Theme = `theme.json` (tokens) **+** optional `theme.css` (experiential override per ADR-0001).
2. `create-series` theme step must generate both; treat `theme.css` generation as its own (harder) slice.
3. Fix or remove the dead `heroImage` / `background` tokens.
4. The clone-overlay page-flip is the reference implementation for the paged layout's transition.
