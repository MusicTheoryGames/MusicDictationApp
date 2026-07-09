# Two-Voice Engine — scoping plan (NOT yet built)

The one genuinely unbuilt capability in both games: **two simultaneous lines**.
It gates exactly two shipped-curriculum ceilings, deliberately flagged
`needs-engine` in their data files rather than half-built:

- **MelodyQuest M20 — two-part melodic dictation** (`core/melodic-curriculum.js`,
  `exerciseMode: 'two-part'`): hear two melodies at once, notate/identify both.
- **BeatQuest/Tapping duets** (`tapping-handswap-duet-design` memory;
  `core/curriculum.js` models it as `forms.*.voices: 2`): Hall's two-voice
  exercises — one hand per line, or app-plays-one-line.

This document scopes the shared engine so ONE build serves both, per the locked
duet design (hand-swap first, true duets second) and the mastery model. It is a
plan for owner review — no engine code should land until the approach here is
approved.

---

## 1. What "two-voice" must mean (from the shipped curricula)

| Consumer | Voice 1 | Voice 2 | Student task |
|---|---|---|---|
| Tapping duet (rhythm) | rhythm line A (tap: right hand) | rhythm line B (tap: left hand) | perform both simultaneously; graded per onset per hand |
| Tapping "app plays a line" | rhythm line A (student) | rhythm line B (app audio) | perform A against B — ensemble skill before independence |
| MelodyQuest M20 identify | melody A (top) | melody B (bottom) | answer questions about a named voice ("which voice moves down?") |
| MelodyQuest M20 notate | melody A | melody B | dictate one voice at a time across hearings; then both |

Shared requirement: **two independently-generated but musically-related lines
with aligned bars, plus per-voice grading.** Nothing needs simultaneous
free counterpoint of arbitrary complexity — Hall's duets and RCM two-part
dictation are deliberately simple (note-against-note to 2:1).

## 2. Generation approach (melodic) — extend, don't rewrite

`core/melodic.js` already generates ONE line with a harmonic plan
(`makeHarmonicPlan`: chord degrees per bar). The two-voice generator rides that
same plan — this is the entire trick, and it's why the engine is an EXTENSION:

```
generateTwoPartMelody(spec) -> { voices: [Melody, Melody], meta }
```

1. Generate the TOP voice exactly as today (`generateMelody`, unchanged).
2. Generate the BOTTOM voice against the SAME `harmonicPlan` and the SAME
   rhythm — first species (note-against-note) for the entry rung; later rungs
   give the bottom voice its own generated rhythm (2:1 at most).
3. Constrain the bottom-voice walk with counterpoint rules as candidate FILTERS
   in the existing `chooseNextHarmonic` (they slot beside the tritone
   ban/funnel):
   - no voice crossing (bottom stays below top),
   - imperfect consonances preferred on strong beats (3rds/6ths; 5th/octave
     allowed, unison only at the cadence),
   - **no parallel 5ths/octaves** (check against BOTH voices' previous notes),
   - contrary/oblique motion weighted over similar motion into perfect
     consonances,
   - both voices cadence together (existing endOn/funnel machinery, per voice).
4. Determinism: one seed drives both walks (`seed` for top, `seed ^ 0x9e37` for
   bottom) — same discipline as everything else.

Data model: NO change to `MelodicNote`/`Melody`. A two-part piece is
`{ voices: [Melody, Melody] }` — every existing single-voice consumer
(labelNote, distractors, renderStaff) keeps working per voice, untouched.

## 3. Rhythm-duet generation (tapping) — already 90% present

`generateTarget()` in solo-mode.js already builds one rhythm line from a bank.
A duet target is TWO calls with complementarity constraints (the deferred-seams
comment in solo-mode.js already names the insertion points):
- voice B drawn from the same-or-easier family,
- density cap: B has ≤ A's onsets per bar at the entry rung,
- alignment: at least one shared downbeat onset per bar (keeps the duet
  performable before independence is trained).

## 4. Rendering & audio (shared services)

- `renderStaff` gains a grand-staff-less TWO-STAVE mode: two staves per system,
  aligned bars (VexFlow: two voices formatted to two staves with a shared
  formatter — the existing per-measure loop generalizes; the beaming/stem code
  is reused verbatim per voice).
- `play` gains multi-voice scheduling (Tone already schedules per-note; two
  arrays interleave trivially). Per-voice mute/solo — the pedagogy needs
  "hear the top voice alone."
- Tap-back duet UI (two hand zones) is ALREADY designed in
  `tapping-handswap-duet-design`; the engine only has to hand it two onset
  walks instead of one.

## 5. Exercise design (M20, per MELODIC_RENDERER_SPEC.md)

Rung-in order (matches the adaptive separate-line help in the duet design):
1. **Voice-attention**: both voices play; "which voice ended higher / moved by
   leap?" (recognition-style, no notation) — trains selective listening.
2. **One-voice dictation**: both play, notate ONLY the named voice
   (existing labeling/notation-entry renderers, fed `voices[i]`).
3. **Two-voice notation**: dictate both across multiple hearings (voice picker
   + the existing notation-entry flow per voice; per-voice accuracy, overall =
   mean).

## 6. Verification gates (same discipline as everything shipped)

- Unit: counterpoint invariants across seed sweeps (no crossing, no parallel
  perfect intervals, consonance table on strong beats, aligned bar totals,
  determinism) — target ≥ 40 new tests in `core/melodic.test.js`.
- The classical single-voice validators still pass on EACH voice independently.
- Browser: two-stave render screenshots (beaming/stem rules per voice),
  per-voice playback mute/solo, all five themes.
- Regression: 376 existing tests + ext-seam suite stay green (no existing
  export changes).

## 7. Estimated shape & order

1. `generateTwoPartMelody` + tests (core, pure) — the real work, ~1 session.
2. Two-stave `renderStaff` mode + multi-voice `play` (services) — ~half session.
3. M20 rung-1/rung-2 renderers (reuse-heavy) — ~half session.
4. Tapping duet target generation + duet tap-back UI wiring — separate track,
   after the melodic proof, sharing rule code where applicable.
5. Rung-3 (full two-voice notation) last.

**Open decisions for the owner before building:**
- Entry-rung species: strict note-against-note only, or allow 2:1 from the start?
- M20 keys: keep it C/G/F major + A/D minor (like M9) for the first duet rung,
  or inherit M19's wider set?
- Does the tapping duet or melodic M20 ship first? (The engine order above
  builds melodic first because its verification is cheaper — no timing pipeline.)
