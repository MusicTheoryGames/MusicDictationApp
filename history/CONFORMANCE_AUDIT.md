# MELODIC_CURRICULUM.md conformance audit — honest, line-by-line

2026-07-02, after the owner (correctly) called out repeated false conformance
claims. Root cause of the false claims: the P9 "conformance sweep" verified that
every level MOUNTS AND RUNS without errors — it never verified that what plays
matches what the curriculum document prescribes, and I reported the first as if
it were the second. This document is the real comparison: doc says / data
encodes / runtime does, per level, all discrepancies listed. Nothing here is
softened.

## A. SYSTEMATIC NONCONFORMANCES FOUND

### A1. Exercise modes — doc prescribes MULTIPLE modes per level (often an
ordered within-level progression); the game played exactly ONE. 15 levels short:

| Level | Doc (§2 table / §3 detail) | Game played |
|---|---|---|
| M5 | Labeling → recognition | labeling only |
| M6 | Recognition → labeling | recognition only |
| M7 | Labeling + missing-note | missing-note only |
| M8 | Labeling + missing-note | missing-note only |
| M11 | Labeling → notation entry | notation-entry only |
| M12 | Missing-note + notation | missing-note only |
| M13 | Recognition → labeling → notation | recognition only |
| M14 | Labeling + full notation | labeling only |
| M16 | Missing-note + notation | missing-note only |
| M18 | Error-detection + notation | error-detect only |
| M19 | Recognition → notation | recognition only (see A5) |
| M21 | Error-detection + notation | error-detect only |
| M22 | Error-detection + notation | error-detect only |
| M23 | Recognition → labeling → notation | recognition only |
| M24 | Recognition → labeling → notation | labeling only |

Conformant already: M0 M1 M2 M3 M4 M9 M10 M15 M17 M25 M26; M20's three rungs
are its own in-level progression.

### A2. Rhythm vocabulary — doc cites Hall chapter RANGES ("Ch 1–3", "Ch 4–6",
"Ch 6–12 mixed"); the data encoded ONE hallRhythmRef per level, so a level only
ever drilled one chapter's rhythmic vocabulary. Affects nearly every level
(m2 doc Ch1–3 → played ch3 only; m9 doc Ch4–6 → ch6 only; m17 doc Ch6–12
mixed → ch12 only; etc).

### A3. Phrase length as MATERIAL — doc: M14 = "4-bar phrases" (mastery goal:
notate a 4-BAR phrase), M17 = 8-bar period, M26 = 8-bar piece. Runtime played
2-bar rounds everywhere until today's depth build, and even after it the level's
own material length only arrived at the Proficient band. The doc's length is the
level's material, not a stretch goal.

### A4. M26 modulating length — generateModulatingMelody was invoked at 4 total
bars; the doc's M26 goal is an 8-bar piece. (M17's 8-bar period was correct at
capstone only — covered by A3.)

### A5. M19/M24 notation rung — doc ends M19 at "notation" and M24 at
"labeling → notation"; the round builder forces RECOGNITION for modulating and
symmetric-collection melodies because degree labels/entry are single-diatonic-key
concepts (grading a notated answer across a key change needs modulation-aware
grading that does not exist yet). REGISTERED as an honest gap, not silently
substituted: M24's pentatonic keys DO get labeling/notation (they are diatonic
subsets); M24's whole-tone/octatonic rounds and all M19 rounds stay recognition
until a modulation/collection-aware notation grader is built (backlog).

### A6. Doc lines stale in the OTHER direction (doc behind the build):
- §2 M25 row says "simple↔compound equivalence markings: future" — these SHIPPED
  (P7, ♪=♪ markings at every class change).
- §2 M20 row said "full two-voice notation: future rung" — rung 3 SHIPPED, and the row was
  corrected on 2026-07-09. The row also called the engine "first-species counterpoint"; it is
  note-against-note, not first species (VISION.md §9).

### A7. Depth (fixed earlier today, recorded for completeness): meters[] was
never rotated (m2 declared 2/4·3/4·4/4, played one), all rounds were 2 bars,
advancement needed ~5 rounds. Fixed in build AB: meter rotation, length ladder,
coverage-gated advancement (every key/meter, ≥10 rounds, one clean long round),
Practice Studio (2/4/8-measure drills).

## B. VERIFIED CONFORMANT (spot-checked directly, not assumed)
- Key/mode sets per level match §2 exactly (m4 C→G; m6 Am/Dm; m8 G/F/Dm; m9 five
  pairs; m10 ≤1 accidental; m12/m14 ≤2; m16-m18/m21-m22 ≤3; m13 three minor
  forms × A/D/E; m23 five named modes; m19 modulating set; m24 any-tonic subset
  + 3 collections).
- Degree/leap material per level matches §2 (pentascale spans, leap order
  3rd→P4/P5→P8/6th→7th, m24 pentatonic degree subsets).
- M0 drone-then-test-pitch, M0 which-of-two, M1 up/down/same, M2 = real rhythm
  game embed, M9 two-phase (rhythm first, then degrees), M10 find+CORRECT,
  M15 6/8, M25 irregular groups 2+3 / 2+2+3 + three round kinds.
- Hall refs that ARE encoded all exist in the rhythm vocabulary (ch1-ch15;
  ch13 does not exist as a vocab entry — m25 uses ch12/ch14, the nearest
  present chapters; doc cites "Ch 13+").

## C. FIX PLAN (all in this build round)
1. Curriculum data: `exerciseModes[]` (ordered, per §2/§3), `hallRhythmRefs[]`
   (per the doc's chapter ranges, meter-compatible), `lengthBars` (m14+=4,
   m17/m26=8) on every level; legacy single fields kept as [0]-th values.
2. Round builder: validated `opts.exerciseMode` + `opts.hallRhythmRef`;
   modulating/symmetric forced-recognition safeguard unchanged (A5).
3. Game: within-level mode PROGRESSION (below Familiar = first/easiest mode,
   middle band = rotate all prescribed modes, capstone = the hardest mode at the
   level's full material length); Hall-ref rotation per round; base length =
   the level's own lengthBars (scaffolded at half below Familiar).
4. Coverage gate (D2) extended: every prescribed exercise mode must ALSO be
   answered correctly before the capstone arms; HUD checklist shows modes.
5. Practice Studio gains an Exercise picker (any prescribed mode).
6. MELODIC_CURRICULUM.md stale lines corrected (A6); M19/M24 notation gap noted
   in the doc where it prescribes it (A5).
7. New curriculum test: every level × every meters[] × every hallRhythmRefs[] ×
   its lengthBars generates a valid, bar-filling melody (the sweep that would
   have caught A2/A3 the day they were written).
