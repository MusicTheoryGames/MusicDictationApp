# MelodyQuest — Button & Control Design Language

The single source of truth for how every control looks. Levels 1–2 are the REFERENCE
implementations; every other screen must match them. When in doubt, open the referenced
function and copy it — do not invent a new treatment.

## The vocabulary (what a control looks like by ROLE)

| Role | Look | Kind / class | Reference impl |
|---|---|---|---|
| **Primary transport** — Play / Hear it | GREEN play-triangle, **icon-only, NO word, EVER** (matches M0). Use `makePlayButton(services, aria)` or `wireHearings()`. If there's a hearing limit, pips go in a row BELOW the button (`.melodic-play-wrap`), never inside it — the button never changes shape. | `melodic-btn--icon melodic-btn--play/--go` | M0 tiles `createTapStreamGame`; helper `makePlayButton` / `wireHearings` in melodic-renderers.js |
| **Home reference** — "hear home" | **NEUTRAL** "▶ HOME" (play glyph + HOME). NOT green. | `services.button('HOME','choice')` + `prepend(icon('play'))` | M0 HOME tile `melodic-tap-tile--home`; shared `addHomeButton` |
| **Primary CTA** — commits/advances (Check / Next / Confirm) | Theme ACCENT, one word | `services.button(label,'primary')` | `createLabelingRenderer` Check |
| **Answer options / utilities** (degrees, Undo, nav) | NEUTRAL | `services.button(label,'choice')` | every palette |

## Hard rules

1. **Exactly ONE green transport button visible per screen** (the primary Play). The home
   reference is NEUTRAL so two greens never compete. This is why Level 1 never shows two
   green buttons — copy that.
2. **Exactly ONE accent CTA per screen**, `disabled` until it is actionable (e.g. Check
   enables only when every slot is filled / a tile is marked).
3. **Green is per-theme** (each theme renders its own green — see per-theme rules in
   suite-theme.css). Same for the accent. Never a single hardcoded color / `!important`
   universal override.
4. **Feedback colors** (green #2a9d5c correct, red #e6413a wrong, amber #d08700 missed,
   gold #f5b301 celebrate) are RESERVED for grading/celebration. Never a resting control color.
5. **Fewer words.** Counters/progress are DOTS, not text:
   - stage/round progress = pip dots (green done · amber current · hollow upcoming).
   - remaining hearings = depleting pips inside the Play button (NOT "(3 left)").
   - On-screen how-to = one short cue; the full explanation lives in the level MODAL.
6. **No emoji, ever** — inline SVG via `services.icon(...)` only (enforced by
   core/no-emoji.test.js). Allowed: U+0302 caret (3̂), curly quotes, middle-dot.

## Before changing any control

- Screenshot the SAME control on Level 1 and Level 2 first. If your change makes it look
  different from those, stop — match them instead.
- Run `node --test core/no-emoji.test.js` before every deploy.

## Reference glyphs
`services.icon(name)` set: play, check, cross, up, down, same, dot, restart, home.
Home reference uses the PLAY glyph (▶ HOME), matching M0 — not a house icon.
