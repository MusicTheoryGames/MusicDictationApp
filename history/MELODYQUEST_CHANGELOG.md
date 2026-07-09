# MelodyQuest — Change Log & Rationale

The single running record of what changed, WHY, and how it was verified. Build tags (e.g. `DM`) are the
tiny version stamp bottom-right of the app. Companion docs: `LEVELS_4_10_ROBUSTNESS.md` (the curriculum
stage-ladder plan + research), `BUTTON_DESIGN.md` (control language), `MELODIC_CURRICULUM.md` (curriculum
invariants). Newest first.

## 2026-07-04 → 07-05 session

### Register / octave fix — home note in the right octave every key (build DP)
Owner-caught: in G major the melody sat on low ledger lines (G3) while "hear home" played G4 — a
home/octave mismatch; and it made some tunes fall outside instrument ranges. Cause: the level's
`pitch.range` was an ABSOLUTE MIDI window (written around C4=60) that didn't move with the key, so a
key a 5th up forced the melody an octave below its own tonic. Fix (melodic-round.js): shift the range by
the key's distance from C (`tonicMidiFor(key,4) - 60`) so it always straddles the ACTUAL tonic the
generator + home reference use. Verified: tonic notes == home pitch for C/G/A-min/D-min; G major now
67–71 (on the staff). NB: helps but doesn't fully solve high-floor instruments (flute/oboe) on low keys —
follow-up: curate instrument list to full-range voices and/or raise the melodic floor.


### Real instrument voices — switchable sampled instruments (build DO)
Owner: can we play examples on a real instrument (piano/violin/flute…) instead of the synth? Built a
multisample engine (`melodic-instruments.js` → `smplr`, lazy-loaded from esm.sh CDN) sharing the app's one
AudioContext. Melody notes now route through `emitNote()` in melodic-shell-services.js — sampled instrument
if one is loaded, else the oscillator synth (instant default + safe fallback if a CDN hiccups). Instrument
picker added to Settings (synth · grand piano · violin · cello · flute · clarinet · oboe · trumpet · guitar),
persisted. Verified: `setInstrument('piano')` loads the sampled SplendidGrandPiano from CDN, no errors.
Licensing-safe (free/redistributable soundfonts + CC piano) — a commercial VST's samples can NOT be shipped;
literal EastWest quality would need server-side VST rendering (documented for later).


### Ear Arcade — whack-a-degree GAME, first version (build DN)
Owner idea: a game-style aural-recognition mode that progresses through scale degrees (tap when you hear
1̂, then 3̂, then 1̂-vs-3̂, up the scale — whack-a-mole feel). Built as a STANDALONE Practice-menu mode
(`melodic-ear-arcade.js` → `mountEarArcade`); nothing on the main ladder changes. Notes stream in C major;
the buttons ARE the target degrees; tap the degree you hear within its window → hit (combo/score), miss if a
target passes untapped, penalty for a wrong tap; tempo ramps. 8 stages (1̂ → 3̂ → 5̂ → 1̂vs3̂ → triad → +2̂ →
up-to-5̂ → full scale), advance on a clean wave (≥80% caught, ≤2 wrong). Reuses M0's live-tap idea; own
save-free session. Verified: mounts from Practice menu, runs a wave end-to-end, scores hits/misses/false, no
errors. FINE-TUNING TODO: timing window feel, tempo curve, key rotation, a clearer per-note visual, sound.


### Difficulty is now RAMPED + robust (build DM)
Owner: "a game that could take a student MONTHS to pass — robust and logical, not short and easy."
- **Adaptive difficulty ramp.** `buildRound` now generates several candidate melodies and picks the one at
  `opts.difficultyPercentile` (`pickByDifficulty` + a `melodyDifficulty` scorer in `melodic-round.js`).
  `startRound` drives the percentile from mastery score (`diffPct = clamp(score/100, .12, .95)`; capstone
  .92). So difficulty CLIMBS with mastery instead of swinging random-easy/random-hard.
  *Verified:* difficulty rises monotonically across percentiles 0.1/0.5/0.9 on m3/m4/m5/m7.
- **Killed the jarring 2↔4-bar alternation.** Length is now monotonic: 2 bars until score ≥ 70, then 4.
- *Why the swings existed:* each round was a fresh RANDOM seed (no difficulty ordering) + a per-band bar flip
  + key rotation — no coordinated ramp.

### Recognition foils made subtle + a real octave-jump BUG fixed (build DL)
Owner: L6 "Read it back" wrong answers were "absurdly obvious… big jumps thrown in."
- **ROOT BUG:** the distractor `reDegree` (core/melodic.js) forced edited notes to octave-0-relative-to-tonic,
  so an edit on any note below the tonic's octave leapt a FULL OCTAVE. Now the new degree is placed in the
  octave NEAREST the original note. *Verified:* 0 big-jump foils (was ~39% of foils, worst a 12-semitone jump).
- **Subtlest-foil selection.** Recognition/error-detect now score a pool of edits with `foilCost`
  (`melodic-round.js`) — pitch displacement + endpoint/contour penalties + a heavy penalty for any NEW leap —
  and take the subtlest. Added a rhythmic edit op `swapAdjacentDur` (swap two adjacent notes' durations within
  a bar) so some foils differ only by a tiny rhythm.

### Staff renders responsive — whole melody + clef always show (build DK)
Owner: "Read it back" tiles cut off part of the clef. `renderStaff` staves were fixed-width + `zoom:1.3` +
centered-overflow, hiding the left clef in narrow tiles. Now every staff carries a `viewBox` and scales to fit
its container (never upscales past natural size). Mystery "?" chips switched to PERCENT coords so they stay
aligned when the staff scales. Applies everywhere renderStaff is used (recognition, error-detect, missing-note).

### Stage ladders for L5–L10 (builds DI–DJ)
Made Educational/Thorough excellent: each dictation level got an explicit STACKING stage ladder (add one skill,
re-integrate all prior). Data-driven `STAGE_LADDERS` map (`{names, degrees, leaps, hallRefs, K}`) + generic
handlers (newRound gating via buildRound opts.degrees/opts.leaps, journey pips, clean-in-a-row advancement via
`S.stageStreaks`, capstone-requires-last-stage). Renderers UNCHANGED. `buildRound` gained `opts.leaps`.
- m3(L5): rhythm graduation (stepwise 1̂-2̂-3̂). m4(L6): steps→+3rd. m5(L7): add 4̂→+5̂/skips→rhythm.
  m6(L9): minor stepwise→skips. m7(L10): step-gaps→skip-gaps. m5_5(L8): live find-home game (not staged).
- *Verified in SEMITONES* (degree-number diffs falsely flag octave-crossing P5s): zero P4/tritone/6th/7th.
- Full design + research + the corrected ladders live in `LEVELS_4_10_ROBUSTNESS.md`.

### Level 4-10 design conformance (build DD) + fine-tunes
- On-screen how-to cues shortened to ONE short line across labeling/recognition/missing-note (full teaching
  stays in the level intro modal), per BUTTON_DESIGN rule 5.
- **Practice menu (DF):** the 5 look-alike practice buttons (Skills/Interval Gym, Pattern drill, Bookends,
  Practice studio) consolidated into ONE "Practice" button → a gated menu with a one-line "when to use" each.
- **Unlock announcements (DF):** a "New in Practice: X" line now appears in the Level-up overlay (was silent).
- **"?" placement (DE):** the missing-note chip centers on the notehead span (getNoteHeadBeginX/EndX), not
  getAbsoluteX (the left attachment point, which crammed it against the previous note).
- **Transport order (DG):** Play → HOME → Speed (the wheel was between Play and HOME).
- **Build stamp trimmed (DH):** the giant changelog stamp is now a tiny version tag; the log lives here + git.

### Level 4 rhythm entry = the REAL BeatQuest drag-and-drop, reused (builds CW–CZ)
Owner corrected me ~5×: not text buttons, not the iframe. Solution: load the actual `rhythm-student.js`
engine natively and mount its bank + staff into MelodyQuest's own containers via its public API
(updateGameSettings/placeTile/userAnswer). Real staff/bars/time-sigs/figure tiles/drag+touch/red-x remove.
No iframe, no chrome. Plays the MELODY; graded by rhythmic onset. Word-button palette DELETED; on a cold load
it waits for the engine ("Loading the rhythm board…") rather than falling back.
- **Speed wheel (DA):** per-example Slow/Medium/Fast scroll wheel in the shared play row (resets to Medium
  each example; per-level bpm factor). **Measure-focus (DB):** "Hear a bar 1/2" plays + highlights one bar.

## Conventions
- Every change: run `node --test core/no-emoji.test.js` (emoji guard) + `node --test` (full suite, 437+),
  headless-verify the behavior (puppeteer), view a screenshot for visual changes, THEN bump the build tag and
  `npx netlify deploy --prod --dir .`.
- Verify leap/interval conformance in SEMITONES from note.midi, never degree numbers.
