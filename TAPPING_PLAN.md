# Tapping / Performance game — consolidated design plan

The standalone Tapping game (twin of the dictation game), on the SAME shared core. Grounded in
`TAPPING_RESEARCH.md` (Hall performance difficulty) + `SYLLABLE_RESEARCH.md` (syllable systems) +
the verified `core/` engine. Honors `dictation-tapping-parallel-ladders`, `suite-visual-cohesion`,
`level-pass-and-guided-structure`, `subagents-quality-over-speed`. **Review draft — redline freely.**

## 1. Vision & entry
A standalone **Tapping** game on the main hub (next to Dictation), where the student **performs**
Hall's rhythms — graded for tap accuracy — instead of notating them. Same engine, same look, same
levels: dictation *recognizes*, tapping *executes*.

## 2. The matched 1:1 ladder (hard requirement)
**One per-Hall-chapter ladder; the SAME level set in both games — same count, same order, same
ready/roadmap status.** Each level has a `dictation` form (hear → notate) and a `tapping` form
(perform). Level N is the same Hall content in both. For the inherently two-voice chapters
(13, 23–25, 30): the **dictation form uses the single-line composite**, the **tapping form uses
two voices** — so the ladders stay 1:1. (Owner to confirm the composite approach.) The
performance-difficulty research sets the *per-level scaffolding/curve*, NOT a separate structure.
→ Action: reconcile `core/curriculum.js` + `ladder.js` to one matched level set (per-level `form`).

## 3. The three performance modes (per level, easy→hard within a level)
1. **Beat only** — tap the steady pulse (the foundation; Hall: tap the beat from study 1).
2. **Beat + Rhythm (two hands)** — pulse in one hand, the rhythm in the other, **with a hand-switch**
   (beat-hand ↔ rhythm-hand). The core single-line performance skill.
3. **Two-line duet** — tap two independent lines, one per hand, graded **per line**. Easy duets
   (shared attacks) → independent → polyrhythm peak (the difficulty research grades these).
**Three-part (trio):** the **app plays the steadiest line** while the student taps the other two
(also see §4). Fallback: homophonic trios collapse to a 2-line duet; bonus: 2-student co-op.

## 4. App-plays-a-line + hint scaffolding (requested features)
- **App-plays-a-line:** the app can perform any line (audio + the moving beat-guide highlight, reusing
  the tap-back's single-clock engine). Uses: the **trio** mode (app covers a hand), a **duet aid**
  ("play the other line for me"), and a **single-line model** ("play it for me").
- **Hints (perform beat / a measure / the line):** on-demand demonstrations when a student is stuck;
  **using a hint costs groove points** (consistent with the dictation game's hints-vs-groove mechanic).

## 5. Scoring
**Per-line, per-beat all-or-nothing on tap timing**, reusing the **single-clock tap-back engine that
already ships** (count-off → capture, `TAP_TOLERANCE` forgiving window, `TAP_LATENCY` on-device tunable).
Two-line = both hands graded; per-measure per-line pass/fail; mark which measure/hand slipped.
Capstone-per-level + groove-points, same as dictation (`level-pass-and-guided-structure`).

**Tap-and-hold for sustained notes (CONFIRMED 2026-06-28 — build after the guided spine):** grade
HOLD DURATION (press = onset, release = note-end), but ONLY for notes long enough to hold meaningfully
— **half, dotted-half, whole, dotted-quarter, and tied/sustained values (≥ ~1 beat).** Fast notes
(eighths, sixteenths) stay ONSET-ONLY (hold-length there is noise). **Automatic** — it engages whenever
the rhythm contains long notes, no toggle. Forgiving hold window (scaled to tempo). Rationale: the
onset-gap to the *next* tap already verifies durations *between* onsets, but NOT the final/sustained
note, and gives no explicit "you cut the half note short" feedback — tap-and-hold fixes both. This is
the input side of [[rhythm-sound-duration-plan]]. Sequence it AFTER the guided-spine integration so it
doesn't collide with that work in `solo-mode.js`.

## 6. Teacher-configurable syllable layer (suite-wide — dictation + tapping)
Per `SYLLABLE_RESEARCH.md`: one generic schema covering position-based (Takadimi, Gordon, 1-e-&-a,
Eastman) and duration-based (Kodály, French) systems, **plus teacher-custom** (same JSON, the
differentiator). Per-class active system + a custom builder + a **multi-row** option (Hall prints
several at once). **Render** as VexFlow annotations under the notes, **per-theme** (no universal
colors). **Audio** = recorded syllable clips on the Web-Audio lookahead scheduler (sample-accurate;
TTS only as a custom-syllable fallback). Ships as a shared module both games consume.

## 7. Visual cohesion (hard requirement)
Reuse the dictation game's exact visual layer — `suite-theme.js/.css` themes, every color per-theme,
no emoji, and the **same staff + per-note glyph notation** (clone the answer staff the way the
tap-back overlay already does). No invented per-game visuals (`suite-visual-cohesion`).

## 8. Shared-core integration
The tapping game is a thin front-end over the verified `core/`: the **mastery meter**, **Elo
placement**, the **per-beat grader** (timing variant in solo-mode), the **spaced-review** queue, and
the **curriculum ladder** (the matched level set). Solo + classroom via the same `SessionTransport`.

## 9. Build phases (methodical, verified, deployed incrementally)
Each phase: build → independent re-run + adversarial review + doc-conformance → deploy to
`musicdictation-roadtest.netlify.app` → log decisions. One finished phase at a time.
0. **Reconcile the ladder** (`core` matched 1:1) + add per-level `form`/`mode`/`voices`. [verify tests]
1. **Tapping shell + entry** on the hub; reuse the theme + the cloned staff; Beat-only mode + scoring.
2. **Beat + Rhythm (two hands)** mode + the hand-switch; per-line grading.
3. **App-plays-a-line** engine + the hint buttons (groove-cost).
4. **Two-line duets** (the duet levels) + per-line grading; the trio mode (app plays one line).
5. **Syllable layer** (shared module): the presets + the teacher custom builder + per-theme render + clip audio.
6. **Level UI / placement / capstone** wired to the matched ladder (mirrors dictation).
7. Polyrhythm levels (needs the two-zone two-voice engine) — the advanced tail.

## 10. Open flags for the owner (when back)
- Confirm the **composite-dictation** for the two-voice chapters (§2).
- Which **syllable presets** to ship first + whether to record clips now or start text-only.
- Whether the **classroom/teacher** side of tapping comes in v1 or later.
