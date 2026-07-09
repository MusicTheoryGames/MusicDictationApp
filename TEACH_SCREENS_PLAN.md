# Teach screens — design (approved by owner 2026-06-29)

**Core rule: quick by default; a fuller lesson ONLY when the student is struggling with the principle;
ALWAYS skippable.** Hear → see → do, not read. Reuse the shared themes, notation, beat-guide, tap
engine, audio, and `window.TEACH_CONTENT` (already authored, per level). Per-game framed. Wires into
the existing `GUIDE.maybeTeach()` seam, shown before a new level. Both dictation + tapping.

## A. Quick warm-up — the DEFAULT (first time at a new level/concept)
A small, skippable modal:
1. Concept **title** + the one-line **whatsNew** (from `TEACH_CONTENT`).
2. The **new figure shown + PLAYED**, notation **animating on the beat** (reuse the beat-guide + `rhythmHit`) — hear it and see it.
3. **One call-and-response** — "clap/tap it back" (a 1-bar version, reuse the tap engine). Encourage, don't hard-gate.
4. **"Got it → Start"** → straight into the level's 2-bar ramp. Target ~10–15 seconds.
- **SKIP** always present → straight to the level. A skip is remembered (don't re-show this level's warm-up unless escalation fires).
- **Repeats/replays** of a passed level: auto-skip, or a single one-line reminder.

## B. Adaptive escalation — the FULLER lesson, ONLY when struggling
**Trigger (read from the mastery engine):** the student is stuck on the principle — e.g. **fails the
same ramp step twice in a row**, OR **mastery for the level stays below the Attempted band after ≥3
attempts**, OR **the same new figure is missed repeatedly**. Then surface a targeted mini-lesson:
- **I-do:** the figure isolated, **slower tempo**, notation animating + counted.
- **We-do:** count-in, then tap/clap it **together** (app + student) — reuse the tap engine.
- **You-do:** one guided isolated rep at the slower tempo → back to the level.
- Include **contrast-with-the-familiar** (play the new figure against the one they know) + the **counting/syllables**.
- Still **skippable**. **Backs off after firing** — don't nag every round.

## C. Always skippable
Every teach modal has a clear **Skip** → straight to play. Advanced students are never forced through it.

## D. Per-game framing
Dictation = **"what to listen for"**; Tapping = the **coordination/performance cue** (e.g. syncopation:
"this is where your hands stop agreeing"). Pull `dictationTip` / `tappingTip` from `TEACH_CONTENT`.

## E. Reuse / cohesion (hard requirement)
Shared themes (per-theme color, NO emoji, inline SVG), the notation renderer, the beat-guide animation,
the tap engine (clap-back), the audio (`rhythmHit`), and `window.TEACH_CONTENT`. No invented visuals.
