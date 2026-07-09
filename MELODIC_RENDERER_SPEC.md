# Melodic Renderer — build contract (v1)

How each exercise-mode renderer plugs into the melodic game shell (`melodic-mode.js`).
Companion to `MELODIC_ENGINE_SPEC.md` (the engine) and `MELODIC_CURRICULUM.md` (which
`exerciseMode` each level uses). The shell owns the round lifecycle, audio, notation
rendering, themes, and mastery; a **renderer** owns ONE exercise mode's interaction and
reports a graded result. One renderer per `exerciseMode` value.

Proven reference: `melodic-lab.html` already does the recognition flow end-to-end
(generate → VexFlow render → Tone play → click-to-grade). Renderers formalize that.

---

## 1. The renderer interface

Each renderer is a factory that mounts into a host element and returns a small handle:

```js
createXxxRenderer(host, ctx) -> { destroy() }   // e.g. createRecognitionRenderer, createLabelingRenderer …

host  = an empty container <div> the shell provides (already themed).
ctx   = {                                  // everything the renderer needs — SHELL-PROVIDED
  level,          // the melodic-curriculum level object (id, exerciseMode, pitch, key, mode, …)
  melody,         // the correct Melody (from generateMelody) for this round
  distractors,    // [Melody] near-misses (recognition/error-detect); [] if the mode doesn't use them
  labelCtx,       // { key, mode, system:'numbers'|'fixed-do'|'moveable-do', minorSolfege:'la'|'do' }
  services,       // shell-provided helpers (below) — renderers NEVER import VexFlow/Tone directly
  onResult        // callback the renderer MUST call exactly once when the student completes the task
}
```

`onResult(result)` — the single grading channel back to the shell:

```js
result = {
  correct:  Boolean,   // was the task answered correctly at all
  clean:    Boolean,   // correct with no hints/retries (feeds the band-gated mastery streak)
  accuracy: 0..100,    // fine-grained score (per-note for labeling/notation; 100/0 for recognition)
  meta:     { ... }    // optional, mode-specific (e.g. which notes were wrong)
}
```

The shell takes `result` and drives mastery exactly as the rhythm game's `guidedRecord`
does (`mastery-progression-model.md`) — the renderer knows nothing about mastery/ladders.

Lifecycle: shell builds a round → calls `createXxxRenderer(host, ctx)` → student interacts
→ renderer calls `onResult(...)` → shell shows results/celebration + advances → shell calls
`handle.destroy()` before the next round. Renderers are pure per-round; they hold no
cross-round state.

---

## 2. Services the shell provides (renderers use ONLY these — no direct VexFlow/Tone)

```js
services = {
  // NOTATION
  renderStaff(host, melody, opts?) -> void      // draw a Melody (or a partial one) as real notation
  renderStaffPartial(host, melody, hideIdx[], opts?) -> void   // missing-note: blanks at hideIdx
  clearStaff(host) -> void

  // AUDIO (Tone)
  play(melody, opts?) -> Promise                // play a whole Melody
  playNote(midi, durBeats?) -> void             // single pitch (tonic drone, one degree)
  stopAudio() -> void

  // LABELING
  label(note) -> string                         // labelNote(note, ctx.labelCtx) preapplied
  labelPalette() -> [string]                    // the choice set for labeling/degree input

  // THEME/UI atoms (so renderers match the active theme with no theme knowledge)
  button(text, kind?) -> HTMLButtonElement      // kind: 'primary'|'play'|'choice'
  icon(name) -> SVGElement                      // inline SVG, currentColor (NO emoji)
  tempoBPM() -> number

  // REAL RHYTHM-GAME EMBED (the "delegates to the existing rhythm game" contract,
  // used by rhythm-first (M2) and notation-entry's phase 1)
  mountRhythmEntry(host, { durations, meter, onResult }) -> { destroy() }
  // Embeds the ACTUAL rhythm dictation game (solo-mode.js) via its external-target
  // seam (tapping.html?mode=solo&exttarget=1, postMessage protocol: ready ->
  // target{durations,meter} -> unsupported | result{allCorrect,wrongBeats,totalBeats}).
  // The seam converts melodic duration codes to the game's bank patternId cells
  // INSIDE solo-mode.js (the taxonomy lives there), forces guided+correction OFF
  // (the embedding page owns progression and one-shot grading), and hides the
  // game's own path/level/theme controls. onResult(null) = the game can't express
  // that rhythm (compound/irregular meter, exotic figure) or didn't boot — the
  // CALLER falls back to its own entry UI. Seam scope: simple quarter-beat
  // meters (2/4, 3/4, 4/4) and compound 6/8-family (M15); irregular 5/8·7/8
  // (M25) falls back by design.
}
```

Rationale: routing all notation/audio through the shell means (a) one place owns the
authentic-notation rules, (b) themes/kids-mode style everything consistently, (c) renderers
stay tiny and testable, (d) the two-voice engine (M20) is added once, in the shell.

---

## 3. The eight renderers (one per exerciseMode)

| exerciseMode     | what the student does | uses distractors | onResult.accuracy |
|------------------|-----------------------|------------------|-------------------|
| `tonic-contour`  | "is this the tonic?" / "up-down-same?" via buttons (M0–M1) | no | 100/0 per prompt |
| `rhythm-first`   | dictate the rhythm — **delegates to the existing rhythm game** (M2) | no | from rhythm grader |
| `labeling`       | tap the degree/syllable under each shown note (M3+) | no | per-note % correct |
| `recognition`    | hear it, pick the matching staff from options (M4+) | **yes** | 100/0 |
| `missing-note`   | supply the hidden pitch(es) via the degree palette (M7+) | no | per-blank % |
| `error-detect`   | click the wrong note in a shown staff, then CORRECT it via the degree palette (M10+) | one altered melody | 100 found+fixed / 50 found only / 0 |
| `notation-entry` | **two-phase**: (1) dictate rhythm, (2) place degrees on the staff (M9+) | no | per-note pitch+rhythm % |
| `two-part`       | identify/notate two simultaneous voices (M20) | maybe | per-voice — NEEDS the two-voice engine |

Build order for Wave 2+: `recognition` (≈reuse the harness) and `labeling` (the novel
middle rung) first; then `tonic-contour`; then `missing-note`+`error-detect`; then
`notation-entry` (biggest); `two-part` last (shared two-voice engine).

**Build status (2026-07-02): ALL EIGHT renderers are BUILT and browser-verified.**
`two-part` ships ALL THREE rungs (voice-attention → one-voice dictation → FULL
two-voice dictation, per-voice accuracy averaged) on the first-species two-voice
engine (TWO_VOICE_ENGINE_PLAN.md). `rhythm-first`
and `notation-entry`'s phase 1 delegate to the real rhythm game via
`services.mountRhythmEntry` (above); `notation-entry` falls back to a duration-palette
entry UI when the game can't express the rhythm (compound/irregular meters). Symmetric
(M24) and modulating (M19/M26) rounds always mount `recognition` — degree labels are a
single-diatonic-key concept, but "pick the staff that matches what you heard" works for
any pitch material; their distractors are different-seed siblings from the same
generator (the edit-distance distractor engine can't re-degree non-diatonic or
two-key melodies).

---

## 4. Rules for renderer authors

- **NEVER import VexFlow or Tone directly** — go through `services`. Same for any hard-coded
  color (themes own color) and any emoji (`services.icon` gives inline SVG).
- **Call `onResult` exactly once** per round, when the task is genuinely complete.
- **No cross-round state, no mastery/ladder knowledge, no persistence** — the shell owns all of it.
- **Authentic notation only** — never restyle noteheads/staff (the shell's `renderStaff`
  enforces this; renderers just call it).
- **Self-contained + unit-testable** where logic is separable (e.g. the labeling grader).
- Match the note data model from `MELODIC_ENGINE_SPEC.md` §1 exactly.
