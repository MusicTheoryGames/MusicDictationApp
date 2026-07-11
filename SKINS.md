# RhythmQuest / MelodyQuest skins

The redesign UI (`quest-redesign.css`) reads its colors from CSS variables on
`:root`. A **skin** is nothing but a set of variable overrides scoped to a body
class. No layout, no markup, no JS changes.

```css
body.quest-redesign.skin-neon { --accent: #39ff88; --metal-1: #26123a; /* … */ }
```

```html
<body class="quest-redesign skin-neon" data-app="beatquest"> … </body>
```

That is the whole mechanism. Three worked examples live (commented out) at the
bottom of `quest-redesign.css`; copy one into your own stylesheet or uncomment
it, add the class to `<body>`, done.

---

## The token set

Every token below defaults to the exact color the redesign already shipped, so
adding the tokens changed nothing visually. A skin overrides the ones it cares
about. Tokens marked **(reused)** already existed in the game; the rest were
added by the skinning pass.

### Chassis / device shell
| token | default | role |
|---|---|---|
| `--metal-1` **(reused)** | `#3f4045` | chassis top |
| `--metal-2` **(reused)** | `#26272b` | chassis mid |
| `--metal-3` **(reused)** | `#17181b` | chassis bottom (also dark surfaces) |
| `--edge` **(reused)** | `#070708` | chassis edge line |
| `--line` **(reused)** | `rgba(255,255,255,.1)` | hairline borders |
| `--panel` | `#111214` | recessed panels (readouts, mode switch, speed control) |
| `--bank-face`* | — | *(not tokenized — see “What still resists”)* |

### Screen (LCD)
| token | default | role |
|---|---|---|
| `--lcd` **(reused)** | `#dbe9c4` | screen surface (drives tiles + beat cells too) |
| `--lcd-low` **(reused)** | `#c8d9ad` | screen gradient bottom |
| `--screen-hi` | `#edf6dc` | screen gradient top highlight |
| `--lcd-ink` **(reused)** | `rgba(23,32,22,.78)` | ink printed on the screen (time signature) |
| `--barline` | `rgba(25,30,24,.72)` | measure barline |
| `--note-ink` | `rgba(20,25,19,.94)` | **VexFlow** review-note ink (see caveat) |

### Accent
| token | default | role |
|---|---|---|
| `--accent` **(reused)** | `var(--green)` | primary accent (GO button, LCD chips, meters) |
| `--accent-bg` **(reused)** | `#03180b` | dark backing behind accent chips |
| `--accent-ink` | `#06180d` | dark text printed *on* the accent (GO) button |

### Status colors
| token | default | role |
|---|---|---|
| `--green` **(reused)** | `#32ef7a` | good / correct (also the accent source) |
| `--amber` **(reused)** | `#ffd35a` | warn / bonus / hints |
| `--red` **(reused)** | `#ef5757` | bad / blocked / wrong |
| `--blue` **(reused)** | `#5ccfff` | play / recording highlight |

### Buttons & text
| token | default | role |
|---|---|---|
| `--btn-face` | `#24252a` | hardware button base face |
| `--tool-face` | `#181a1d` | rail tool-button base face |
| `--btn-shadow` | `#080809` | hard bottom edge under raised buttons |
| `--text` **(reused)** | `#f1f1ee` | primary text |
| `--muted` **(reused)** | `#a8aaa8` | secondary/label text |
| `--ink-bright` | `#f4f5ee` | bright ink on dark surfaces (result panels) |
| `--ink-dark` | `#141414` | dark ink on lit/active buttons |

### Sizing (drives **kid mode** — these are colors-agnostic layout knobs)
| token | default |
|---|---|
| `--slot-w` / `--slot-h` | `96px` / `68px` (answer-board beat slot) |
| `--slot-gap` | `10px` |
| `--measure-gap` | `10px` |
| `--bank-slot-w` / `--bank-slot-h` | `96px` / `66px` (rhythm bank tile) |
| `--melody-tile-w` / `--melody-tile-h` | `64px` / `60px` |

---

## Authoring a skin

1. Start from `body.quest-redesign.skin-YOURNAME { }`.
2. Set the chassis (`--metal-1/2/3`, `--edge`), the screen (`--lcd`, `--lcd-low`,
   `--screen-hi`, `--lcd-ink`), and the accent (`--accent`, `--accent-ink`,
   `--accent-bg`). Those four groups carry ~80% of the mood.
3. `--accent` defaults to `var(--green)`, so set `--accent` **explicitly** if you
   want an accent that differs from your “correct/good” green. (Also note:
   `body[data-app="melodyquest"]` re-points `--accent` to `--amber` — override
   inside a `body.skin-x[data-app="melodyquest"]` block if you need to.)
4. Keep the **screen light** (see caveat) unless you don’t mind hidden notes.
5. Tune status colors (`--green/--amber/--red/--blue`) and surfaces
   (`--panel`, `--btn-face`, `--tool-face`, `--btn-shadow`, `--barline`, `--note-ink`).

### Kid mode

Kid mode is the same skin idea, just bump the **size** variables (they are already
real game variables):

```css
body.quest-redesign.skin-candy {
  /* …colors… */
  --slot-w: 112px; --slot-h: 82px; --slot-gap: 12px; --measure-gap: 12px;
  --bank-slot-w: 112px; --bank-slot-h: 80px;
  --melody-tile-w: 76px; --melody-tile-h: 70px;
}
```

Corner **radius** is *not* yet a variable (border-radius is hard-coded per
element), so “rounder for little hands” is out of scope for this color pass — it
would need a follow-up `--radius` token.

---

## Example skins (shipped commented in `quest-redesign.css`)

- **skin-neon** — dark purple cabinet, neon-green accent, magenta-leaning status;
  screen kept a pale phosphor green so black note PNGs stay visible.
- **skin-candy** — bright bubblegum palette **and** kid-mode sizing (bigger slots
  and bank tiles).
- **skin-mono** — charcoal chassis, paper-white screen, near-black accent.

---

## What still resists (honest coverage)

This was a **color-token pass over the main surfaces**, verified as a strict
visual no-op. It did **not** try to make every pixel skin-driven. A skin now
controls, cleanly:

- the chassis shell, edge, and recessed panels;
- the LCD screen (surface, highlight, ink, barline);
- the accent (button, chips, meters) and its ink;
- rhythm bank tiles and answer beat cells (they derive from `--lcd`);
- status colors, primary/secondary text, hardware & tool button faces + shadow.

Still hard-coded / not skin-driven (left deliberately, to guarantee the no-op):

1. **Note glyphs are raster.** Placed answer notes and bank-tile notes are PNGs
   drawn with `filter: brightness(0)` → always black. Only VexFlow review notes
   read `--note-ink`. **Consequence: the screen must stay light**, so a truly
   dark-screen skin (e.g. classic neon CRT) can’t be done without changing note
   rendering. This is an engine limitation, not a token gap.
2. **Accent glows / tint states.** Many hover/drag/flash states use literal
   `rgba(50,239,122,α)`, `rgba(255,211,90,α)`, `rgba(92,207,255,α)` at assorted
   alphas (glows, ring flashes, drag fills). These are the same hues as
   `--green/--amber/--blue` but at fixed alpha, so they do **not** follow a
   recolored accent. Making them follow would need CSS relative-color syntax
   (`rgb(from var(--green) r g b / α)`), which changes rendering semantics and
   was avoided to keep the byte-for-byte no-op guarantee.
3. **White sheen & black depth.** The pervasive `rgba(255,255,255,α)` highlights
   and `rgba(0,0,0,α)` shadows are palette-agnostic gloss/shadow; intentionally
   left literal (they read fine on any palette).
4. **Outer page background** (`body.quest-redesign`, the metal behind the device)
   and the **melody-specific** amber theme block and **tapback result** deep
   states keep some literal colors.
5. **Corner radius / borders geometry** are not variables (color pass only).

Rough estimate: a skin now drives **~75–85%** of the visible chrome (everything
that defines the cabinet’s identity — chassis, screen, accent, tiles, buttons,
text). The remaining ~15–25% is fixed sheen/shadow, accent-hue glow states, and
the raster note ink. A second pass using relative-color syntax (once verified in
Safari) could pull the glow states in and would push this well past 90%.
