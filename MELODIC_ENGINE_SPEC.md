# Melodic Engine — build contract (v1)

The interface every melodic module builds against, so the generator, curriculum data,
labeling, distractors, and (later) renderers interlock without integration drift.
Companion to `MELODIC_CURRICULUM.md` (the pedagogy) and `core/curriculum.js` (the rhythm
ladder this reuses). Plain ES modules under `core/`, mirroring the existing `core/*.js`
style (pure, testable, no DOM). All randomness accepts an optional seed for deterministic
tests.

---

## 1. Data model (the shared currency)

```js
// One melodic note. Carries BOTH degree and absolute pitch because the labeling toggle
// needs both: numbers/moveable-do use `degree`; fixed-do uses `pitch` (letter name).
MelodicNote = {
  degree:   1..7,          // diatonic scale degree relative to the tonic
  alter:    -1 | 0 | +1,   // chromatic shift of that degree (minor raised-6/7, chromatic tones); 0 = diatonic
  pitch:    'c/4',         // ABSOLUTE pitch, VexFlow key format 'letter/octave' (letter lowercase, may include accidental e.g. 'f#/4')
  midi:     60,            // absolute MIDI number (for playback + interval math)
  duration: 'q'           // VexFlow duration code — SAME vocabulary as the rhythm engine ('w','h','q','8','16','hd', rests as 'qr' etc.)
}

// A full melody.
Melody = {
  notes:        [MelodicNote, ...],
  key:          'C',        // tonic letter (+ accidental if any), e.g. 'C','G','F','Bb'
  mode:         'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor',
  meter:        '2/4',      // time signature (drives the rhythm layer)
  tonicMidi:    60,         // MIDI of the tonic (fixes octave/register + fixed-do reference)
  hallRhythmRef:'ch3',      // the core/curriculum.js rhythm level whose vocabulary the durations came from (lockstep)
  meta:         { bars, lengthNotes, seed }  // provenance for tests/repro
}
```

Rules: `notes` durations MUST sum to whole bars of `meter`. `pitch`/`midi`/`degree`/`alter`
MUST be mutually consistent (degree+alter+key+mode ⇒ pitch/midi). Melodies are immutable
values (return new ones; never mutate inputs) — same discipline as `core/mastery.js`.

---

## 2. Generator — `core/melodic.js`

```js
generateMelody(spec) -> Melody

spec = {
  key:           'C',
  mode:          'major' | 'natural-minor' | 'harmonic-minor' | 'melodic-minor'
               | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian',   // M23: church modes
  degrees:       [1,2,3,4,5],        // allowed diatonic degrees (e.g. [1,2,3] for M3, pentascale for M5;
                                     //   a pentatonic subset like [1,2,3,5,6] IS the M24 pentatonic slice)
  leaps:         ['step','3rd','P4','P5','P8','6th','7th'],  // allowed melodic moves (degree-jumps, NOT interval-name
                                     //   tests). No 'tritone': the tritone is BANNED as a move
                                     //   (chooseNextHarmonic); M18's tritone content is a passing TONE.
  range:         { lowMidi, highMidi },
  meter:         '2/4',              // simple, compound (6/8-family), or irregular '5/8'/'7/8' (M25:
                                     //   rhythm fills group-by-group, 2+3 / 2+2+3 — see IRREGULAR_GROUPS)
  hallRhythmRef: 'ch3',              // which rhythm vocabulary to draw durations from
  rhythm:        undefined,          // OPTIONAL: a fixed [{duration}] to use verbatim (so the shell can feed the exact rhythm-game rhythm for two-phase notation); if absent, generate a simple rhythm from hallRhythmRef
  lengthBars:    2,
  startOn:       'tonic' | 'any',    // RCM: early rungs start on tonic/mediant/dominant
  endOn:         1,                  // degree the melody is steered to END on. Default 1 (authentic
                                     //   close). 5 = HALF-CADENCE ending (the antecedent of a period /
                                     //   the pre-modulation half of M19). Guaranteed by the cadence
                                     //   FUNNEL: trailing notes stay within remainingMoves×maxSpan of
                                     //   an in-range end-degree position (100/100 across seed sweeps).
  seed:          12345,              // optional; deterministic output for tests
  meterSequence: undefined,          // M25 CHANGING METER: one meter string per bar
                                     //   (overrides meter/lengthBars). Same-class
                                     //   sequences (Hall Ch19/20) need nothing more;
                                     //   MIXED simple<->compound (Ch21/22) also
                                     //   requires `equivalence` below or it throws.
                                     //   Result carries meterSequence (+equivalence);
                                     //   renderers restate the signature at every
                                     //   change and draw the equivalence marking at
                                     //   class changes.
  equivalence: undefined,            // 'division' (eighth carries over — Hall's own
                                     //   default rule) or 'beat' (beat carries over;
                                     //   playback scales compound bars 2/3). Only
                                     //   consulted for mixed-class meterSequence.

  // COLOR-TONE flags (M18/M21/M22) — post-processing insertions/alterations, each a
  // no-op when the melody offers no eligible spot; applied in this fixed order:
  chromaticPassingTone: false,       // M18: ONE resolving chromatic passing tone (fills a diatonic
                                     //   whole step, approached+left by a half step, same direction)
  modalMixture:         false,       // M21: borrow ♭6̂ from the parallel minor into an existing
                                     //   6̂→5̂ descent (major mode only; alters, never inserts)
  secondaryDominant:    false,       // M22: raise 4̂ where it already ascends to 5̂ (V/V leading tone)
}
```

- Starts/ends on stable degrees for early rungs (per RCM: begin on 1̂/3̂/5̂).
- Rhythm: if `spec.rhythm` given, use it; else generate a plain rhythm whose figures fit
  `hallRhythmRef`'s vocabulary (a light internal rhythm model — the *real* rhythm-game
  generator is app-layer, so `core/melodic.js` stays self-contained + testable). Durations
  MUST use the same VexFlow codes the rhythm engine uses.
- Never produce a leap outside `spec.leaps`; never a degree outside `spec.degrees` (color-tone
  flags alter `alter`, never `degree`); never exceed `range`.
- Ships a self-test (`core/melodic.test.js`) asserting: valid degrees/leaps/range, bars sum,
  degree↔pitch consistency, determinism under a fixed seed, start-on-tonic honored, color
  tones fire and resolve across seed sweeps, church modes + pentatonic subsets generate valid.

### 2b. Modulation — `generateModulatingMelody(spec)` (M19, and M26's spine)

```js
generateModulatingMelody(spec) -> Melody & { modulation: { to, atBar, atNote } }
dominantKeyOf(key)             -> 'G'   // C→G, F→C, Bb→F, B→F#, Eb→Bb …
```

Same spec as `generateMelody` plus whole-piece `lengthBars` (default 8, min 2), split evenly:
the ANTECEDENT lives in `spec.key` and ends in a half cadence on 5̂ (`endOn: 5`); the
CONSEQUENT lives in the DOMINANT key (tonic = the original 5̂), opens ON the new tonic (the
arrival the student must hear) and cadences authentically there. Composed from two
independently-steered walks — each half gets the full cadence treatment of its own key.
**M26 (composition capstone):** color-tone flags apply to the ANTECEDENT ONLY, by
construction (the consequent is generated with flags stripped) — a color tone after the
modulation would read as an error in the new key. `modulation.atNote` lets exercise UIs ask
"where does the key change?".

### 2c. Symmetric collections — `generateSymmetricMelody(spec)` (M24)

```js
generateSymmetricMelody({ key, collection, meter, hallRhythmRef, lengthBars, seed, range,
                          maxLeapSteps }) -> Melody   // `collection` replaces `mode`
SYMMETRIC_COLLECTIONS = { 'whole-tone': [0,2,4,6,8,10],
                          'octatonic-wh': [0,2,3,5,6,8,9,11],
                          'octatonic-hw': [0,1,3,4,6,7,9,10] }
```

Whole-tone/octatonic are NOT 7-note diatonic collections (6/8 notes per octave, no
one-letter-per-degree spelling), so they get their own generator: pitches spelled as the
letter needing the fewest accidentals; NO functional harmony (that's the collections' whole
character) — the walk is stepwise-biased, arcs up then down, starts AND ends on the tonic
pitch-class; `degree` on each note is the 1..N position within the COLLECTION. Rendering
convention: no key signature; every accidental inline (the app layer's `keySigSpec` returns
'C' whenever `melody.collection` is set).

---

## 3. Labeling — `core/melodic-label.js` (or exported from `core/melodic.js`)

```js
labelNote(note, ctx) -> 'do' | 're' | '1' | '3̂' | ...
labelPalette(ctx)    -> ['do','re','mi',...]   // the buttons/choices a labeling UI shows

ctx = {
  key, mode,
  system:       'numbers' | 'fixed-do' | 'moveable-do',   // default 'numbers'
  minorSolfege: 'la' | 'do'                                // moveable-do minor sub-fork
}
```

- **numbers:** the scale degree (with caret + accidental for altered tones), e.g. `1̂ 2̂ ♯4̂`.
- **moveable-do:** degree ⇒ do re mi fa sol la ti (do = tonic). Minor: `minorSolfege:'la'`
  ⇒ la ti do re mi fa sol; `minorSolfege:'do'` ⇒ do re me fa sol le te.
- **fixed-do:** based on `note.pitch` LETTER, do=C always (C=do,D=re,E=mi,F=fa,G=sol,A=la,B=ti);
  accidentals per standard fixed-do (basic: keep syllable; chromatic-fixed-do optional later).
- Pure function of (note, ctx); no state. Self-tested for all three systems + both minor forks.

---

## 4. Distractors — `core/melodic-distractor.js` (or exported from `core/melodic.js`)

```js
distractors(correct: Melody, opts) -> [Melody]      // musically-plausible near-misses

opts = { n: 5, difficulty: 'subtle'|'obvious', seed }
```

- Perturb the correct melody by ONE musically-meaningful edit each: shift one note by a
  step, flip one contour move, swap two adjacent degrees, or alter one duration — staying
  diatonic + same length + same meter (the current melodic game's hand-authored options do
  exactly this by hand; this automates it).
- Guarantee: every distractor differs from `correct` AND from every other distractor; all
  are valid Melodies. `difficulty:'subtle'` = single small edit; `'obvious'` = larger.
- Self-tested: uniqueness, validity, edit-distance bounds.

---

## 5. Curriculum data — `core/melodic-curriculum.js`

Mirror `core/curriculum.js`. Export the M0–M20 ladder as data; each level:

```js
{
  id:            'm3',
  mIndex:        3,
  title:         'First 3 notes get numbers',
  layers:        ['R','D'],                    // 0a,0b,R,D,N
  pitch:         { degrees:[1,2,3], leaps:['step'], range:{...}, startOn:'tonic' },
  key:           'C', mode: 'major',
  hallRhythmRef: 'ch2',                         // MUST be an id that exists in core/curriculum.js (lockstep)
  exerciseMode:  'labeling',                    // 'tonic-contour'|'rhythm-first'|'labeling'|'recognition'|'missing-note'|'error-detect'|'notation-entry'|'two-part'|'memory-span'|'protonotation'
  // 'memory-span' (M1.5 Hold the tune) + 'protonotation' (M8.5 Sketch it): the
  // ladder-expansion rungs (MELODIC_LADDER_EXPANSION_PLAN.md), fractional mIndex.
  masteryGoal:   'Correct degree/syllable per note over a given rhythm',
  prereqs:       ['m2'],
  softGateHall:  'ch2',                         // WARN (not block) if rhythm-game progress < this Hall level
  buildStatus:   'needs-build'                  // 'ready'|'ready-ish'|'needs-build'|'needs-engine'
}
```

- The `exerciseMode` enum is the renderer contract (Phase 3 builds one renderer per value).
- `hallRhythmRef`/`softGateHall` MUST reference real `core/curriculum.js` ids — the module
  should validate this in its test.
- Do NOT wire into `core/ladder.js`/`core/mastery.js` yet — just export the data + a
  `melodicLadder()` accessor. Shell integration (registering a melodic mode in
  `core/ladder.ladderForMode`, feeding mastery) is Phase 2, done on the main thread.
- Self-tested: every level's `hallRhythmRef` exists, prereqs form a valid DAG, `exerciseMode`
  in enum, monotonic difficulty (degrees/leaps only widen).

---

## 6. Reuse + constraints (all modules)

- **Rhythm lockstep is by REFERENCE:** melodic levels cite Hall ids from `core/curriculum.js`;
  they never redefine rhythm. The generator borrows the durations, not a new rhythm ladder.
- **No DOM, no audio** in `core/*` — pure data + logic (playback/rendering is the shell/renderers).
- **No emoji; no hard-coded UI color** (irrelevant to core, but keep outputs presentation-free).
- **Deterministic under seed** for every randomized function (tests depend on it).
- Match the existing `core/*.js` module + test style (`node --test core/<name>.test.js` passes).
