# Melodic Dictation Curriculum — the level-by-level ladder

Companion to `research/HALL_CURRICULUM.md` / `research/HALL_CATALOG.md` (the rhythm ladder) and
`core/curriculum.js` (the coded 31-chapter rhythm spine). This document designs the
**MELODIC** side: a ladder that takes a student who has *no idea how to do melodic
dictation* to genuine multi-phrase competence, built in **layers**, notation LAST.

> Status honesty. The pitch/interval/key ordering is grounded in the **RCM Piano
> Syllabus (2022 & 2015 editions)** aural-skills scope-and-sequence (see "Sources").
> The **layered method** (contour → rhythm → scale-degree/solfège → notation) and the
> mapping of that method onto **app exercise modes** is the product owner's teaching
> methodology plus my synthesis — it is *not* how RCM or Hall package their material.
> Where I extend beyond a cited source I say so. Do not treat build-status guesses as
> commitments; they are my read of the existing engine (`core/*.js`, `solo-mode.js`).

---

## 1. Design rationale

**The problem with "start on the staff."** A beginner told to "write down the melody
you hear" fails at four things at once: holding the tune in memory, feeling its rhythm,
knowing which scale degree each note is, and drawing the right notehead on the right
line. Conflating these is why melodic dictation feels impossible to novices. The fix,
and the product owner's core methodology, is to **teach one layer at a time and make
notation the last thing added, not the first.** Every melodic skill in this ladder is
learned through the same pipeline:

> **(0a) Where is home?** establish the TONIC / key center → **(0b) Which way?** hear
> CONTOUR (up / down / same) → **(1) What's the rhythm?** figure out the underlying
> rhythm first (this is where we *reuse the existing rhythm game wholesale*) → **(2)
> What are the degrees?** assign SCALE-DEGREE NUMBERS or MOVEABLE-DO SOLFÈGE to that
> rhythm, still with no staff → **(3) Write it.** only now notate pitch + rhythm on the
> staff.

This pipeline is the spine of the whole ladder. Early levels live entirely in layers
0–2; the staff (layer 3, "full notation entry") is withheld until a student can already
hear home, feel the rhythm, and name the degrees. That withholding is the pedagogical
thesis of the product.

**Synthesizing the three sources.** (a) **Hall & Urban** gives the *rhythm* ladder and,
just as importantly, a *sequencing philosophy*: each rung adds exactly one new idea on
top of the last, new material is demonstrated before it is tested, and advancement is
mastery-gated (`mastery-progression-model.md`). The melodic ladder reuses the Hall
rhythm ladder verbatim for its "what's the rhythm?" layer — a melodic level literally
cites a Hall chapter for its rhythmic vocabulary, so a student's rhythm competence and
melodic competence climb in lockstep and never gets ahead of itself. (b) **RCM Celebrate
Theory / RCM aural syllabus** grounds the *pitch* progression in a real, validated
scope-and-sequence: RCM starts melodic playback on the **first 3 notes of the scale**
(Prep), expands to the **pentascale 1–5** (Level 1–4), then to the **full octave scale**
(Level 6+); introduces **minor at Prep B** (very early, alongside major); and orders
intervals **3rds → P5 → P4 → octave → 6ths → 2nds → 7ths → tritone**. Our pitch rungs
follow that spine. (c) The **product owner's layered method** is the connective tissue
that turns those two content ladders into a *teachable order of operations* and maps each
rung onto a **buildable app exercise mode.**

**The pre-foundation RCM does not have.** RCM's earliest graded task is rhythm clapback
and major/minor triad-quality ID — it has no "contour / high-low / same-different"
listening task (that is preschool/Kodály territory and lives in RCM's practice *software*,
not the graded exam). The product owner explicitly wants these two pre-layers *before*
rhythm: **tonic orientation** ("is this note home?") and **contour** ("did it go up,
down, or stay?"). These are cheap to build, they are the gentlest possible on-ramp, and
they install the two perceptions every later layer depends on (a stable tonic reference,
and melodic direction). So this ladder begins *below* RCM Prep A, with two aural-only
rungs, then rejoins the RCM pitch spine.

**Exercise modes double as a difficulty spine.** The app has ONE melodic generator
feeding many exercise-type renderers (mirroring how the rhythm generator feeds both
dictation and tapping). The modes are not interchangeable — they form their own
difficulty gradient, from *recognition* (easiest: hear it, pick the matching notation) →
*missing-note* (partial recall) → *degree/solfège labeling* (name the degrees over a
given rhythm, no staff) → *full notation entry* (hardest: produce pitch + rhythm from
scratch). Each curriculum rung specifies which mode(s) it uses, and within a rung we can
*re-teach the same pitch material at a harder mode* to deepen mastery before moving the
pitch content forward. This lets the ladder be fine-grained without inventing new pitch
material at every step — a key lever for the app's band-gated mastery model
(`mastery-progression-model.md`), which needs many reps to reach the Proficient band.

**Labeling is a THREE-WAY teacher-selectable toggle (decided by owner 2026-07-01).**
The generator produces one melody; the labeling layer renders it in whichever system the
teacher/curriculum selects:
1. **Scale-degree numbers** — 1̂ 2̂ 3̂ … (the DEFAULT; most universal, system-agnostic, and
   what RCM's written theory uses).
2. **Fixed do** — do=C *always*, independent of key (do re mi fa sol la ti = C D E F G A B).
   This means the label depends on each note's ABSOLUTE pitch (letter name), not its degree.
3. **Moveable do** — do = the tonic (do re mi … from 1̂). Minor sub-fork: **la-based**
   (la ti do re mi …) vs **do-based** (do re me …) — pick one as the minor default.

Because fixed-do needs the absolute pitch while numbers/moveable-do need the scale degree,
every melody note carries **both**: `note = { degree, pitch, duration }` (see §4). Every
"degree/solfège labeling" rung works identically across all three systems.

---

## 1a. The stacking principle (core design law)

**Every level introduces exactly ONE new skill, and re-integrates all previously-taught skills
into exercises that require the new one. No skill is taught and then dropped — each earlier level
*pays off* by being needed, in combination, later.** This is a spiral curriculum: skills don't
retire, they accumulate. A student should never feel an exercise was busywork; Level N is where
Levels 1..N-1 come due.

Worked example — **Level 4 (rhythm)** stacks Levels 1 and 2 into a single item:

- **New skill:** dictate the *rhythm*.
- A note that is a **1/3/5** (tonic-triad anchor) → **name the scale degree** — the Level 1 skill.
- A note that is **not** 1/3/5 (e.g. the passing 2, not yet nameable by number) → **identify its
  shape / contour direction** — the Level 2 skill.

So one Level-4 item requires rhythm (L4) + anchor-degree ID (L1) + contour (L2) at once. Build each
level's ladder so its later stages fold in the prior levels' skills this way.

---

## 1b. Vocabulary introduction order (INVARIANT — enforced by test)

A hard rule of this ladder: **a level may only use scale degrees and leap types that have
already been introduced by that point.** A memory or labeling task must never ask a student to
identify a degree they have never been taught to hear. (This shipped broken once: `m1_5` "Hold
the tune" used degree **4** at mIndex 1.5, while the curriculum introduces *fa* at **m5** — so
students were asked to name a pitch five levels before it was taught. Fixed to `1-2-3-5`.)

**Canonical introduction points** (the source of truth lives in code:
`core/melodic-curriculum.js` → `DEGREE_INTRO_MINDEX` / `LEAP_INTRO_MINDEX`):

| Introduced at | Scale degrees | Leap types |
|---|---|---|
| **mIndex 0** (M0) | 1, 2, 3, 5 | — |
| **mIndex 1** (M1) | — | step, 3rd |
| **mIndex 5** (M5 "Pentascale 1–5") | **4** | P5 |
| **mIndex 8** (M8) | — | P4 |
| **mIndex 11** (M11 "Complete the octave") | **6, 7** | P8 |
| **mIndex 12 / 16** (M12 / M16) | — | 6th / 7th |

So the usable degree set grows `{1,2,3,5}` → `+4 @ M5` → `+6,7 @ M11`, monotonically. A level may
use any *subset* of what's introduced (e.g. M3 uses just `1-2-3`; M24 uses the pentatonic
`1-2-3-5-6`) — it just may not reach *ahead*.

**Enforcement:** `core/melodic-conformance.test.js` fails if any level uses a degree/leap before
its introduction mIndex. Change an intro point ONLY as a deliberate curriculum decision — the
test will then list every level that needs updating.

### Octave equivalence (same rule, pitch-height axis)

Hearing that a note an **octave** from home is *still* home / the same scale degree is a
**separate, harder skill** — beginners often do not hear it. So it is taught, not assumed:

- **Introduced at Level 1 (m0), as its final stage** — the octave-equivalence stage
  (`M0_OCTAVE_EQUIV_STAGE = 5`, shown as "Stage 6 · Home in any octave"). Home sounds in **both
  octaves** in the reference, then the student taps home whether it comes high or low.
- **Every earlier m0 stage is single-octave** (`homeOffsets [0]`; tiles single-octave). This
  fixed a shipped bug where stage 0 already tested octave-displaced home *and* the HOME reference
  only ever played the base octave — so students were asked to match an octave they were never
  given. (Source: `melodic-renderers.js` → `M0_LIVE_TIERS` + `buildTonicStream`.)
- m0's wide **2-octave range is justified by this stage**; levels after Level 1 may assume octave
  equivalence is established.

**Melodic width is enforced on the INTERVAL axis, not the declared range.** How wide a *single
melody* may leap is governed by `LEAP_INTRO_MINDEX` above — a level cannot use a P5 before m5, an
octave before m11, or a 7th before m16. That IS the "wide-not-before-level-X" rule, and it is
tested. The `pitch.range` field is a **generator / key-fitting constraint**, NOT a difficulty
knob: it must be wide enough to fit the level's transposition key set, so m0/m1 declare ~2
octaves to fit their 6 keys even though each single rendered melody is ~1 octave. The generation
conformance test already guarantees every level's range fits its content; a separate **range
sanity** test rejects an inverted or absurd (> 3-octave) declared range. So the "range axis" is
covered by three enforced invariants together: **leap size** (interval width) + **octave
equivalence** (m0 stage 6) + **phrase length** (`lengthBars`, which grows up the ladder).

---

## 2. The ladder table

One row per level. **Layer** = which of the 4 layers (0=tonic/contour · R=rhythm ·
D=degree/solfège · N=notation) the level works in. **Rhythm (Hall ref)** cites the Hall
chapter whose rhythmic vocabulary the level reuses — the melodic ladder does not invent
rhythm, it borrows the rhythm ladder. **Mode** is the primary app exercise mode(s).
**Build** is my guess at engine readiness (see key below the table).

| # | Principle / new skill | Layer | Pitch material | Rhythm (Hall ref) | Key / mode | Exercise mode | Mastery goal | Build |
|---|----------------------|-------|----------------|-------------------|-----------|---------------|--------------|-------|
| **M0** | **Find home** — tonic orientation | 0a | tonic drone + one test pitch (is it home?) | none (untimed) | C major | Tonic-&-contour ("is this the tonic?") | Reliably tell tonic vs not-tonic | **ready-ish** |
| **M1** | **Which way?** — 2–3-note contour | 0b | 2–3 notes, step/skip, from tonic triad 1‑3‑5 | none (untimed) | C major | Tonic-&-contour ("up / down / same?") | Name direction of each move | **ready-ish** |
| **M2** | **The rhythm IS the melody** — rhythm-first | R | (pitch held constant / monotone) | Hall Ch 1–3 (simple 2/4·3/4·4/4, ♩ ♪♪ 𝅗𝅥) | C major | Rhythm-first (reuse rhythm dictation game) | Notate the rhythm alone, clean pass | **ready** (reuse) |
| **M3** | **First 3 notes get numbers** — degree labeling | R·D | do‑re‑mi = 1̂‑2̂‑3̂, stepwise, tonic-start | Hall Ch 1–2 | C major | Degree/solfège labeling over given rhythm | Correct degree per note (given rhythm) | needs-build |
| **M4** | **Read it back** — recognition on 3 notes | R·D·(N) | 1̂‑2̂‑3̂ set, short | Hall Ch 1–3 | C, G major | Recognition (pick matching notation) | Match heard melody to notation | needs-build |
| **M5** | **The pentascale 1–5** — degrees expand | R·D | 1̂‑2̂‑3̂‑4̂‑5̂ pentascale, stepwise + tonic‑triad skips | Hall Ch 3–4 (adds 𝅘𝅥𝅮 rest, dotted‑♩+♪, ties) | C, G major | Labeling + recognition | Label any pentascale melody's degrees | needs-build |
| **M6** | **Minor arrives early** — parallel/relative minor | R·D | minor pentascale 1̂‑5̂ (la‑based or 1̂‑based) | Hall Ch 3–4 | A minor / D minor | Labeling + recognition | Distinguish + label major vs minor pentascale | needs-build |
| **M7** | **Hear the gap** — first melodic intervals | R·D | 3rds (m3/M3) within the pentascale | Hall Ch 4 | C, G maj / A min | Labeling + missing-note | ID a 3rd by degree jump; fill a hidden note | needs-build |
| **M8** | **Skips to the frame** — P4 & P5 | R·D | +P5 (1̂→5̂), +P4 (5̂→1̂ / 1̂→4̂) | Hall Ch 6 (sixteenths in simple) | G, F maj / D min | Labeling + missing-note | ID/produce P4 & P5 leaps | needs-build |
| **M9** | **First staff notation** — write the pentascale | R·D·**N** | pentascale melodies, all prior degrees | Hall Ch 4–6 | C, G, F maj / A, D min | **Full notation entry** (production) | Notate pitch + rhythm, short pentascale phrase | needs-build |
| **M10** | **Spot the wrong note** — error detection | R·D·N | pentascale, 1 altered note | Hall Ch 6–7 | maj/min ≤1 ♯/♭ | Error-detection | Find + correct the single wrong pitch | needs-build |
| **M11** | **Complete the octave** — 6̂ 7̂ 8̂ | R·D·N | full major scale 1̂–8̂ (adds 6̂ 7̂ leading‑tone, octave) | Hall Ch 7 (dotted‑8ths) | C, G, F, D maj | Labeling → notation entry | Label + notate full‑octave major melody | needs-build |
| **M12** | **The octave leap + 6ths** | R·D·N | +P8, +m6/M6 (RCM L4–5 intervals) | Hall Ch 9 (rests & syncopation) | maj/min ≤2 ♯/♭ | Missing-note + notation | ID/notate 6ths & octave leaps in a phrase | needs-build |
| **M13** | **Full minor: three forms** | R·D·N | natural / harmonic / melodic minor (raised 6̂ 7̂) | Hall Ch 9 | minor keys ≤2 ♯/♭ | Recognition → labeling → notation | Hear which minor form; notate it | needs-build |
| **M14** | **Steps everywhere — 2nds; longer phrase** | R·D·N | +m2/M2 (RCM L6); 4‑bar phrases | Hall Ch 12 (triplets) | maj/min ≤2 ♯/♭ | Labeling + full notation | Notate a 4‑bar diatonic phrase, either mode | needs-build |
| **M15** | **Compound‑meter melodies (6/8)** | R·D·N | full diatonic, compound‑meter rhythm | Hall Ch 5/8/10 (6/8 track) | maj/min ≤2 ♯/♭ | Notation entry (compound rhythm) | Notate a melody in 6/8 | needs-build (compound rhythm ready) |
| **M16** | **Wider leaps — 7ths** | R·D·N | +m7/M7 (RCM L7) | Hall Ch 9/12 | maj/min ≤3 ♯/♭ | Missing‑note + notation | ID/notate a 7th in context | needs-build |
| **M17** | **Multi‑phrase dictation (period)** | R·D·N | full octave, antecedent/consequent period | Hall Ch 6–12 mixed | many maj/min keys ≤3 ♯/♭ | Full notation entry | Notate an 8‑bar period, both keys/modes | needs-build |
| **M18** | **First chromatic note** — the tritone & alterations | R·D·N | +tritone (RCM L8), passing chromaticism | Hall Ch 9/12 | maj/min ≤3 ♯/♭ | Error‑detection + notation | Hear + notate a chromatic non‑diatonic tone | needs-build |
| **M19** | **Modulation to the dominant/relative** | R·D·N | pivot to V (`generateModulatingMelody`: antecedent half‑cadences in the home key, consequent cadences in the dominant) | Hall Ch 6–15 | modulating | Recognition → notation | Detect where key changes; notate both keys | generator ready |
| **M20** | **Two‑part / two‑voice melodic dictation** | R·D·N | two simultaneous melodic lines (`generateTwoPartMelody`, note‑against‑note — NOT strict first species: no crossing always, but the parallel‑perfect ban is dropped under a starved search and weak‑beat dissonance is unchecked; see VISION.md §9) | Hall Ch 1+ duets (2‑voice) | maj/min | Voice‑attention → one‑voice dictation → full two‑voice notation (all three rungs SHIPPED) | Identify + dictate the voices of a duet | shipped (all three rungs) |
| **M21** | **Modal mixture** — borrowed color | R·D·N | ♭6̂ borrowed from the parallel minor into a major melody (classic 6̂→5̂ mixture gesture) | Hall Ch 9/12 | maj ≤3 ♯/♭ | Error‑detection + notation | Hear + notate a borrowed (mixture) tone | generator ready |
| **M22** | **Secondary dominant color** | R·D·N | raised 4̂ (V/V) resolving up to 5̂ | Hall Ch 9/12 | maj/min ≤3 ♯/♭ | Error‑detection + notation | Hear + notate a secondary-dominant color tone | generator ready |
| **M23** | **Church modes** | R·D·N | dorian, phrygian, lydian, mixolydian, locrian (full 7‑degree collections) | Hall Ch 6–12 mixed | D dorian / E phrygian / F lydian / G mixolydian / B locrian | Recognition → labeling → notation | Hear + notate melodies in a named mode | generator ready |
| **M24** | **Symmetric & pentatonic collections** | R·D·N | major/minor pentatonic (existing degree‑subset engine); whole‑tone & octatonic (`generateSymmetricMelody`, its own non‑diatonic generator) | Hall Ch 3–8 (pentatonic) / Ch 9+ (symmetric) | any tonic | Recognition → labeling → notation | Hear + notate a pentatonic/whole‑tone/octatonic melody | generator ready |
| **M25** | **Irregular & changing meter** | R·D·N | full diatonic pitch material: 5/8 (2+3) and 7/8 (2+2+3) group‑aligned; mid‑piece changing‑simple meter via `meterSequence` (sig restated at every change, Hall Ch19; simple↔compound with ♪=♪/♩=♩. equivalence markings — SHIPPED) | Hall Ch 13+/19 | maj/min ≤3 ♯/♭ | Notation entry | Notate a phrase in an irregular or changing meter | generator ready |
| **M26** | **Composition capstone** | R·D·N | modulation (M19) + mixture (M21) + secondary dominant (M22) combined in one piece (`generateModulatingMelody` with color flags), color confined to the antecedent BY CONSTRUCTION so the post‑modulation consequent stays cleanly diatonic to the new key | Hall Ch 6–15 mixed | maj/min, modulating | Full notation entry | Notate an 8‑bar piece that both modulates and carries color tones | generator ready |

**Known runtime gap (history/CONFORMANCE_AUDIT.md §A5, registered honestly):** M19's
"→ notation" and M24's notation on the whole-tone/octatonic collections mount
RECOGNITION instead — degree labels/entry are single-diatonic-key concepts, and
a modulation/collection-aware notation grader is not built yet. M24's
pentatonic keys do get labeling/notation (they are diatonic subsets).

**Build-status key.**
`ready` = the rhythm engine already does this (rhythm-first rungs literally reuse
`solo-mode.js`). `ready-ish` = tonic/contour is a simple aural + button UI with no
notation; small new build, no engine gap. `needs-build` = needs the melodic generator +
the specific renderer (labeling grid, recognition-with-distractors, missing-note,
error-detection, staff-entry) but no fundamentally new engine capability. `needs-engine`
= a genuine new capability (the two-voice melodic engine, the exact analog of the
rhythm-duet gap flagged in `tapping-handswap-duet-design.md` and modeled as
`forms.*.voices:2` in `core/curriculum.js`).

**Roughly where things sit (owner decisions to confirm — see §5):**
- **Aural-only pre-foundation:** M0–M1.
- **No-staff layers (rhythm + degrees only):** M2–M8. *(Notation is withheld this entire span.)*
- **Notation introduced:** M9.
- **Minor:** enters at **M6** (early, per RCM Prep B), full three-form minor at M13.
- **Chromatic / modulation:** M18–M19 (top of the RCM-aligned span, M0–M20).
- **Two-part:** M20 (ceiling of the RCM-aligned span; the melodic analog of the rhythm duet,
  and like it a real engine lift).
- **Beyond-RCM extension, M21–M26.** M0–M20 tracks Hall/RCM Prep–8 diatonic mastery. M21–M26
  is a deliberate extension past that ceiling toward late-Romantic/Impressionist/early-20th-
  century color (modal mixture, secondary dominants, church modes, symmetric/synthetic
  scales, irregular meter) and a capstone that composes several of those together — explicitly
  NOT reaching into atonal/serial writing (owner-deferred). Pitch-collection generalization
  (diatonic → mode → pentatonic → whole-tone → octatonic) is the one piece of real new
  generator machinery this span needs; the chord-skeleton/contour/cadence logic is shared
  with M0–M20 and does not change.

---

## 3. Per-level detail (foundational third: M0–M9)

This is the span where the "notation is last" thesis lives, so it gets full detail. Each
entry lists: **layer(s) · pitch material · rhythm (Hall ref) · key/mode · exercise
mode(s) · assessed / mastery goal · prerequisites**, matching the spec in the brief.

### M0 — Find home (tonic orientation)
- **Layer(s):** 0a (tonic/key center). *No rhythm, no notation, no staff — pure aural.*
- **Pitch material:** a sustained **tonic drone** establishes "home"; the app then plays a
  single test pitch. Test pitches are drawn from the tonic triad + immediate neighbors so
  "home vs not-home" is unambiguous at first (1̂ = home; 2̂/3̂/5̂ = clearly not).
- **Rhythm (Hall ref):** none — untimed single tones. (The rhythm game has not started.)
- **Key / mode:** C major only.
- **Exercise mode:** **Tonic-&-contour**, "is this the tonic?" (yes/no, then which-of-two-is-home).
- **Assessed / mastery goal:** the student can reliably identify whether a pitch is the
  tonic against an established key center. This is the single perception every later layer
  leans on (RCM likewise *gives* the tonic chord before every playback task).
- **Prerequisites:** none — this is the floor of the whole product.
- **Build:** `ready-ish` (drone + tone playback + yes/no UI; no generator, no notation).

### M1 — Which way? (2–3-note contour)
- **Layer(s):** 0b (contour).
- **Pitch material:** short 2–3-note figures using tonic-triad tones (1̂‑3̂‑5̂) and steps;
  the only thing assessed is **direction** of each move: up / down / same.
- **Rhythm (Hall ref):** none — even notes, untimed, so rhythm can't distract from contour.
- **Key / mode:** C major.
- **Exercise mode:** **Tonic-&-contour**, "up / down / same?" (per move, or whole-shape
  arrow pick).
- **Assessed / mastery goal:** correctly report the contour of every move. Installs melodic
  *direction* as a perception before any pitch has to be *named*. (This is the pre-layer
  RCM's graded exam skips; owner explicitly wants it.)
- **Prerequisites:** M0.
- **Build:** `ready-ish`.

### M2 — The rhythm IS the melody (rhythm-first)
- **Layer(s):** R (rhythm). **This rung is the hinge of the whole method:** before any
  pitch is named, the student extracts the *rhythm* — and does so in the **existing rhythm
  dictation game**, unchanged.
- **Pitch material:** pitch held essentially constant (a repeated/monotone tone, or a fixed
  1̂), so 100% of attention is on rhythm. No degree naming yet.
- **Rhythm (Hall ref):** **Hall Ch 1–3** — simple duple/triple/quadruple, quarter-beat:
  quarter, two-eighths, half, quarter-rest (the `medium` bank; `ch1`–`ch3` in
  `core/curriculum.js`).
- **Key / mode:** C major (pitch is incidental here).
- **Exercise mode:** **Rhythm-first** — literally the rhythm dictation renderer/grader.
- **Assessed / mastery goal:** a clean rhythm-dictation pass at Hall Ch 1–3 level, using the
  app's existing band-gated mastery. Establishes that "figure out the rhythm first" is a
  concrete, already-masterable step, not a vague instruction.
- **Prerequisites:** M1; and the student's rhythm-game progress must be at/above Hall Ch 3.
- **Build:** `ready` — reuses `solo-mode.js` wholesale. *This is why the melodic ladder is
  cheaper than it looks: its foundation is the shipped rhythm game.*

### M3 — First 3 notes get numbers (degree labeling)
- **Layer(s):** R + D (rhythm already known → now add degrees). **Still no staff.**
- **Pitch material:** the first three scale degrees only — **1̂‑2̂‑3̂ (do‑re‑mi)** — stepwise,
  always starting on the tonic. (Mirrors RCM Prep A: playback on the *first 3 notes* of the
  scale, beginning on tonic or mediant.)
- **Rhythm (Hall ref):** Hall Ch 1–2 (simple, quarter/eighth/half). The rhythm is **given**
  (shown), so the student assigns a degree to each already-placed note.
- **Key / mode:** C major.
- **Exercise mode:** **Degree/solfège labeling over a given rhythm** — the rhythm appears as
  notes on a beat-grid (no staff pitch); the student taps the degree number (or solfège
  syllable) under each note. Selectable 1̂‑2̂‑3̂ vs do‑re‑mi.
- **Assessed / mastery goal:** correct degree/syllable for every note of a 1̂‑2̂‑3̂ melody,
  given its rhythm. This is layer 2 of the method in isolation — pitch *named* but not yet
  *drawn on a staff*.
- **Prerequisites:** M2 (rhythm mastered at this level) + M0 (tonic sense).
- **Build:** `needs-build` — needs the melodic generator (3-degree melodies over a Hall
  rhythm) + the labeling renderer (per-note degree/solfège input). No new engine capability.

### M4 — Read it back (recognition on 3 notes)
- **Layer(s):** R·D, first taste of (N) — but the student *reads* notation, doesn't produce it.
- **Pitch material:** 1̂‑2̂‑3̂ set, short figures.
- **Rhythm (Hall ref):** Hall Ch 1–3.
- **Key / mode:** C, then G major (a second key, so degrees are transposable, not pitch-memorized).
- **Exercise mode:** **Recognition** — hear the melody, pick the matching notation from
  options. The generator makes the correct staff answer AND **musically-meaningful
  distractors** by perturbing one degree or the contour (e.g. 1‑2‑3 vs 1‑3‑2 vs 1‑2‑2).
- **Assessed / mastery goal:** match a heard 3-degree melody to its correct notation among
  plausible foils. Recognition is the *easiest* production-adjacent mode (per the mode
  difficulty spine), so it's the gentle bridge from "name the degree" toward "read the staff."
- **Prerequisites:** M3.
- **Build:** `needs-build` — generator + recognition renderer with distractor logic.

### M5 — The pentascale 1–5 (degrees expand)
- **Layer(s):** R·D. **Still no staff production** — labeling + recognition only.
- **Pitch material:** the full **pentascale 1̂‑2̂‑3̂‑4̂‑5̂**, stepwise plus small tonic-triad
  skips (1̂‑3̂, 3̂‑5̂, 1̂‑5̂). Matches RCM Levels 1–4 (playback on the pentascale, beginning on
  tonic/mediant/dominant).
- **Rhythm (Hall ref):** Hall Ch 3–4 — adds the quarter-rest, the **dotted-quarter+eighth**,
  and **ties** (`ch4`). Rhythm still shown/given for the labeling task.
- **Key / mode:** C, G major.
- **Exercise mode:** **Labeling** (assign degree/solfège over given rhythm) → **recognition**
  to consolidate. Same pitch material re-taught at a second mode = extra reps toward the
  Proficient band without new pitch content.
- **Assessed / mastery goal:** correctly label any pentascale melody's degrees, in two keys.
- **Prerequisites:** M4.
- **Build:** `needs-build`.

### M6 — Minor arrives early (parallel / relative minor)
- **Layer(s):** R·D.
- **Pitch material:** the **minor pentascale** (1̂‑5̂). Present in whichever convention the
  teacher picks — degree-numbers with a minor 3̂, or **la-based moveable-do** (la‑ti‑do‑re‑mi)
  if solfège is selected; this is a real solfège-system fork worth a human decision (§5).
- **Rhythm (Hall ref):** Hall Ch 3–4.
- **Key / mode:** A minor and D minor (relative to C/G major from M5). RCM introduces minor
  astonishingly early — **Prep B**, right after the first major task — so putting minor at
  M6 (immediately after the major pentascale is solid) is faithful to the source, not a
  jump ahead.
- **Exercise mode:** **Recognition** (major vs minor pentascale — the "quality" ear RCM tests
  from Prep) → **labeling**.
- **Assessed / mastery goal:** reliably distinguish major vs minor tonality by ear AND label
  a minor pentascale melody's degrees/syllables.
- **Prerequisites:** M5.
- **Build:** `needs-build` — generator must support minor scales/keys (small extension).

### M7 — Hear the gap (first melodic intervals: 3rds)
- **Layer(s):** R·D, introduce **missing-note**.
- **Pitch material:** **m3 and M3** as melodic intervals inside the (major or minor)
  pentascale (1̂‑3̂, 3̂‑5̂). RCM introduces intervals starting with **3rds at Level 1** — 3rds
  are the first interval in the source's order, so they are the first named interval here too.
- **Rhythm (Hall ref):** Hall Ch 4.
- **Key / mode:** C, G major / A minor.
- **Exercise mode:** **Labeling** (name the degree jump) + first use of **Missing-note**
  (melody shown with one note hidden; student supplies the missing degree — partial recall,
  a notch harder than recognition, still not full production).
- **Assessed / mastery goal:** identify a 3rd by its degree jump and correctly fill a single
  hidden note in a pentascale melody.
- **Prerequisites:** M6.
- **Build:** `needs-build` — adds the missing-note renderer (hide 1 note, accept a degree).

### M8 — Skips to the frame (P4 & P5)
- **Layer(s):** R·D.
- **Pitch material:** **+P5** (1̂→5̂, the tonic-to-dominant frame) and **+P4** (5̂→1̂, 1̂→4̂).
  Follows RCM's interval order exactly: after 3rds come **P5 (Level 2)** then **P4 (Level
  3)**. These two leaps outline the tonal frame the octave scale (M11) will fill in.
- **Rhythm (Hall ref):** **Hall Ch 6** (sixteenths in simple meter) — the rhythm layer keeps
  climbing the Hall ladder in step.
- **Key / mode:** G, F major / D minor (following RCM's key expansion at those levels).
- **Exercise mode:** **Labeling + missing-note.**
- **Assessed / mastery goal:** identify and (via missing-note) produce P4 and P5 leaps in a
  melody. At this point the student can hear home, feel the rhythm, and name every degree in
  the pentascale plus the 3rd/4th/5th leaps — *entirely without a staff.* That is the
  method's promise delivered before notation.
- **Prerequisites:** M7.
- **Build:** `needs-build`.

### M9 — First staff notation (write the pentascale)
- **Layer(s):** R·D·**N** — **notation finally enters, as the last layer.**
- **Pitch material:** pentascale melodies using every degree/interval mastered in M3–M8
  (1̂‑5̂, 3rds/4ths/5ths). Nothing *new* in pitch — the novelty is purely the act of
  **producing** it on a staff.
- **Rhythm (Hall ref):** Hall Ch 4–6.
- **Key / mode:** C, G, F major / A, D minor.
- **Exercise mode:** **Full notation entry (production), as a guided TWO-PHASE task**
  (owner method, locked 2026-07-01): **Phase 1** — dictate the RHYTHM first (this literally
  *is* the rhythm game, reused as the first phase of the melodic exercise); **Phase 2** —
  add the degrees/pitches onto that already-notated rhythm. Never "produce pitch + rhythm at
  once." Because rhythm (M2), degrees (M3–M8), and reading (M4 recognition) are each already
  mastered, each phase carries only one new load. As the student advances, the two phases can
  be fused into one combined dictation, but the ladder TEACHES them separately.
- **Assessed / mastery goal:** notate a short pentascale phrase (pitch + rhythm), clean pass,
  in ≥2 keys and both modes, under the app's band-gated mastery (`mastery-progression-model.md`).
- **Prerequisites:** M8 (and, implicitly, all of M2–M8 — every prior layer).
- **Build:** `needs-build` — the staff-entry renderer/grader is the biggest single melodic
  UI, but it's a renderer, not an engine capability. From here up the ladder is
  "widen the pitch material, climb the Hall rhythm, cycle the modes."

*(M10–M20 are specified in the ladder table §2; full per-level detail for the upper two-
thirds is deferred until the foundational third's exercise modes are built and the owner
has confirmed the §5 decisions, since several upper-rung boundaries — solfège fork, key
count, two-part placement — depend on those answers.)*

---

## 4. How this ladder plugs into the app's existing model

- **One generator, many renderers.** Mirror `core/curriculum.js`: encode a melodic ladder
  as data (levels with `newPitch`, `intervals`, `key/mode`, `hallRhythmRef`, `mode`,
  `buildStatus`), feeding one generator that produces a melody + its correct answer +
  distractors, consumed by per-mode renderers. The rhythm-first rungs delegate straight to
  the existing rhythm renderer.
- **Rhythm reuse is literal, not analogical.** M2 and every rung's rhythm layer cite a Hall
  chapter already coded in `core/curriculum.js`; the melodic level should *reference* that
  rhythm level, so a student cannot outrun their own rhythm competence, and the two games'
  ladders stay coherent (`dictation-tapping-parallel-ladders.md`).
- **Mastery / guided structure carry over unchanged.** Band-gated advancement, retention
  badge, decay/back-up-a-step, spaced review, placement (`mastery-progression-model.md`) and
  the teach-before-test guided shape with a capstone (`level-pass-and-guided-structure.md`)
  apply rung-for-rung. Each melodic level gets a dismissable demo that *plays* the new pitch
  idea before testing it.
- **Kids mode fits the bottom.** M0–M8 (aural + no-staff) are squarely inside the kid-friendly
  band (`kids-mode-design-principles.md`): playful frame, authentic notation only once the
  staff appears at M9, guided-only. The kids cutoff (simple meters + intro compound) lands
  around M15.
- **Two-part is BUILT for melody, still open for rhythm.** M20's two-voice engine shipped
  (`generateTwoPartMelody`, all three rungs). The rhythm *duet* — one line per hand — remains
  unbuilt. An earlier version of this line called two-part "the shared engine gap" long after the
  melodic half shipped; that claim propagated into four other documents. See `VISION.md` §9.

---

## 5. Decisions & open questions

**RESOLVED with owner 2026-07-01:**
- **Labeling (Q1):** THREE-way toggle — scale-degree **numbers (default)** / fixed-do / moveable-do (see §1). Minor sub-fork (la-based vs do-based) still to pick a default.
- **Degrees vs interval names (Q6):** **degree-jumps are the assessed skill**; interval *names* ("major 3rd") are an optional secondary label, NOT a required task (unless RCM exam-prep is later wanted). The M7/M8 "interval" rows below mean "bigger degree jumps," ordered by the RCM difficulty sequence — not an interval-naming test.
- **Notation is a two-phase task (M9+):** rhythm first (reuse the rhythm game), then pitch onto it — never both at once (see M9).
- **Rhythm/melodic lockstep (Q7):** **SOFT gate** — warn + strongly steer a student toward their rhythm level, but allow override. Do NOT hard-block (don't conflate "can do rhythm" with "has used *our* rhythm game" — same principle as the kids-theme decision).
- **Reading staff earlier (Q3):** a **reading-only** staff (recognition against a real staff) may appear earlier (~M4–M5) while **production** (notation entry) still waits until M9.

**STILL OPEN for the human:**

1. **Minor solfège sub-fork default:** in moveable-do, minor as **la-based** (la‑ti‑do…) vs
   **do-based** (do‑re‑me…). Pick one as the shipped default (both remain selectable).
2. **How many major keys before minor?** Minor is placed at **M6**, right after the major
   pentascale (faithful to RCM Prep B). Confirm that's right for this audience, or whether
   M2–M5 should cover more major keys first.
3. **Where does two-part melodic dictation (M20) belong** — a true ceiling, or should a
   gentle two-voice recognition task appear earlier? (It shares the rhythm-duet engine cost.)
4. **Chromatic & modulation scope (M18–M19).** These are an *extension beyond* the RCM Prep–8
   band. Confirm you want them in scope, and whether they stay gated behind full-octave
   diatonic mastery (M17) as drawn.

---

## Sources

- **Rhythm ladder:** `research/HALL_CURRICULUM.md`, `research/HALL_CATALOG.md`, `core/curriculum.js`
  (Hall & Urban, *Studying Rhythm*, 4th ed. — progression only; app generates its own rhythms).
- **Pitch / aural progression:** RCM **Piano Syllabus, 2022 Edition** (current) and **2015
  Edition** — directly-extracted aural-skills ("Ear Tests") scope-and-sequence: interval
  order 3rds → P5 → P4 → P8 → 6ths → 2nds → 7ths → tritone; playback first-3-notes (Prep) →
  pentascale (L1–4) → full scale (L6+); minor from **Prep B**; chord-progression Roman-numeral
  ID from L5. **Caveat established during research:** RCM's graded aural skills live in the
  *practical* exam ("Four Star" drill book), **not** in "Celebrate Theory" (which is the
  *written* theory series with non-graded guided listening); RCM prescribes **no** solfège or
  scale-degree system for the graded ear tests and has **no** contour/high-low task — so the
  contour pre-layer (M1) and the whole layered/solfège method are the **owner's methodology +
  synthesis**, laid on top of the RCM pitch spine.
- **App model:** `mastery-progression-model.md`, `level-pass-and-guided-structure.md`,
  `kids-mode-design-principles.md`, `dictation-tapping-parallel-ladders.md`,
  `tapping-handswap-duet-design.md`, `suite-architecture-state.md`.
