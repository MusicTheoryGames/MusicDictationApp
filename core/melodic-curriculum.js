/**
 * @file core/melodic-curriculum.js
 * @module core/melodic-curriculum
 *
 * The MELODIC CURRICULUM LADDER (M0–M26), encoded as DATA.
 *
 * This is a PURE, framework-agnostic ES module: no I/O, no DOM, no engine
 * dependency. It is the melodic analog of {@link module:core/curriculum} (the
 * 31-chapter RHYTHM spine): a data-only ladder of level objects that the melodic
 * generator ({@link module:core/melodic}), labeler, distractors, and renderers key
 * on. Traversal and mastery ARE wired: melodic-game.html builds PLAYABLE from this
 * ladder and drives core/mastery.js. This file holds the ladder + lookup accessors.
 *
 * Grounding
 * ---------
 * The ladder faithfully encodes `MELODIC_CURRICULUM.md` (§2 table + §3 per-level
 * detail) — the M0–M20 RCM/Hall-aligned progression, PLUS the M21–M26 beyond-RCM
 * extension (modal mixture, secondary dominants, church modes, symmetric/synthetic
 * scales, irregular meter, and a composition capstone) — and matches the exact
 * level-object shape in `MELODIC_ENGINE_SPEC.md` §5. Its LOCKED design decisions
 * (`MELODIC_CURRICULUM.md` §5, resolved with the owner 2026-07-01):
 *
 *   - **Degree-jumps, not interval-name tests.** `pitch.leaps` uses the degree-jump
 *     enum (`'step','3rd','P4','P5','P8','6th','7th'`) — the SAME vocabulary
 *     `core/melodic.js`'s `generateMelody(spec)` consumes — NOT interval names. The
 *     "interval" rungs (M7/M8/M12/M16) mean "bigger degree jumps", ordered by
 *     the RCM difficulty sequence (3rds → P5 → P4 → P8 → 6ths → 2nds → 7ths). The
 *     tritone is NOT a leap a melody is generated to contain — `core/melodic.js`
 *     deliberately BANS it as a move (see `chooseNextHarmonic`); M18's "tritone"
 *     content is a chromatic PASSING TONE (`spec.chromaticPassingTone`), not a leap.
 *   - **Minor enters at M6** (early, per RCM Prep B).
 *   - **Notation (exerciseMode 'notation-entry') is withheld until M9** — the whole
 *     M2–M8 span is aural + no-staff (rhythm + degrees only). A reading-only staff
 *     (`'recognition'`) may appear earlier (~M4).
 *   - **Soft gate, not hard block.** `softGateHall` names the Hall rhythm level a
 *     student should be at; the shell WARNS + steers but allows override.
 *
 * Rhythm lockstep (by REFERENCE)
 * ------------------------------
 * A melodic level never redefines rhythm — it CITES a Hall chapter id from
 * `core/curriculum.js` (`hallRhythmRef`). `MELODIC_CURRICULUM.md` frequently cites a
 * RANGE ("Hall Ch 1–3", "Ch 3–4", "Ch 4–6"); a single `hallRhythmRef` must resolve
 * to ONE real id, so we resolve each range to its TOP (most-advanced) chapter — the
 * rhythmic ceiling the level draws on. `softGateHall` is the same id (be at least
 * that far in the rhythm game). Both MUST be ids that exist in `core/curriculum.js`;
 * the test cross-checks this.
 *
 * @see module:core/curriculum for the rhythm ladder whose ids this references.
 * @see MELODIC_ENGINE_SPEC.md §5 for the level-object contract.
 */

/* ===========================================================================
 * TYPEDEFS — the melodic level data model (MELODIC_ENGINE_SPEC.md §5)
 * =========================================================================*/

/**
 * Which of the 4 teaching LAYERS a level works in (the layered method spine):
 * `'0a'` tonic orientation · `'0b'` contour · `'R'` rhythm · `'D'` degree/solfège ·
 * `'N'` notation. A level lists every layer it exercises.
 *
 * @typedef {('0a'|'0b'|'R'|'D'|'N')} MelodicLayer
 */

/**
 * A melodic MOVE / degree-jump — the assessed pitch-motion vocabulary. This is the
 * degree-jump enum (NOT interval names): `'step'` = a 2nd, `'3rd'`, `'P4'`, `'P5'`,
 * `'P8'` = octave, `'6th'`, `'7th'`. Ordered per the RCM interval difficulty sequence.
 * The SAME vocabulary `core/melodic.js`'s `spec.leaps` consumes (which does not
 * include a tritone — it is banned as a move, never an allowed leap; see
 * `chooseNextHarmonic` in `core/melodic.js`).
 *
 * @typedef {('step'|'3rd'|'P4'|'P5'|'P8'|'6th'|'7th')} DegreeJump
 */

/**
 * The MIDI pitch range a level's melodies live in.
 * @typedef {Object} PitchRange
 * @property {number} lowMidi  Lowest allowed MIDI note.
 * @property {number} highMidi Highest allowed MIDI note.
 */

/**
 * The PITCH material spec for a level — consumed directly by
 * `core/melodic.js`'s `generateMelody(spec)` (`spec.degrees`/`leaps`/`range`/`startOn`).
 *
 * @typedef {Object} PitchSpec
 * @property {number[]}      degrees Allowed diatonic scale degrees (1..7), e.g.
 *                                   `[1,2,3]` (M3) or `[1,2,3,4,5]` (pentascale, M5).
 * @property {DegreeJump[]}  leaps   Allowed melodic moves (degree-jumps).
 * @property {PitchRange}    range   MIDI range the melodies stay within.
 * @property {('tonic'|'any')} startOn Which degree(s) a melody may begin on
 *                                   (RCM: early rungs start on 1̂/3̂/5̂ ⇒ `'tonic'`).
 */

/**
 * The app exercise MODE a level renders in — the renderer contract (Phase 3 builds
 * one renderer per value). This is the mode-difficulty spine (recognition → missing-
 * note → labeling → notation-entry), NOT interchangeable.
 *
 * @typedef {(
 *   | 'tonic-contour'    // M0–M1 aural pre-foundation ("is this home?" / "up-down-same?")
 *   | 'rhythm-first'     // M2: reuse the rhythm dictation game to extract the rhythm
 *   | 'labeling'         // assign degree/solfège over a given rhythm (no staff)
 *   | 'recognition'      // hear it, pick the matching notation (reading, not producing)
 *   | 'missing-note'     // melody shown with one note hidden; supply the degree
 *   | 'error-detect'     // find + correct a single wrong pitch
 *   | 'notation-entry'   // full staff PRODUCTION (pitch + rhythm) — withheld until M9
 *   | 'two-part'         // two simultaneous melodic lines (the melodic duet, M20)
 * )} MelodicExerciseMode
 */

/**
 * Buildability of a melodic level (my read of the existing engine, per
 * `MELODIC_CURRICULUM.md`'s build-status key — treat as guesses, not commitments):
 * `'ready'` (rhythm engine already does it) · `'ready-ish'` (small new aural/button
 * UI, no engine gap) · `'needs-build'` (needs the melodic generator + a renderer, no
 * new engine capability) · `'needs-engine'` (a genuine new capability, e.g. two-voice).
 *
 * @typedef {('ready'|'ready-ish'|'needs-build'|'needs-engine')} MelodicBuildStatus
 */

/**
 * A melodic LEVEL — one rung of the M0–M20 ladder. Shape per MELODIC_ENGINE_SPEC.md §5.
 *
 * @typedef {Object} MelodicLevel
 * @property {string}              id            Stable id, e.g. `'m3'` (= `'m' + mIndex`).
 * @property {number}              mIndex        Ordinal 0..20 (the M-number).
 * @property {string}              title         Display title (from the §2 table).
 * @property {MelodicLayer[]}      layers        Teaching layers this level exercises.
 * @property {PitchSpec}           pitch         Pitch material (degrees/leaps/range/startOn).
 * @property {string}              key           Primary/default tonic letter, e.g. `'C'`,`'A'`
 *                                               — kept for backward compatibility; ALWAYS equal
 *                                               to `keys[0].key`.
 * @property {('major'|'natural-minor'|'harmonic-minor'|'melodic-minor')} mode
 *                                               Primary/default mode — ALWAYS equal to
 *                                               `keys[0].mode`.
 * @property {{key:string, mode:string}[]} keys  The FULL set of key/mode pairs this level
 *                                               allows (MELODIC_CURRICULUM.md's per-level "Key
 *                                               / mode" guidance, e.g. M9's "C, G, F maj / A, D
 *                                               min"). At runtime, pick ONE pair per round from
 *                                               this set — that's how key variety enters actual
 *                                               gameplay. Always non-empty; `keys[0]` === the
 *                                               level's `{key,mode}` primary pair.
 * @property {string}              meter         Primary/default time signature, e.g. `'4/4'`.
 * @property {string[]}            meters        The full set of meters this level allows (most
 *                                               levels: just `[meter]`; M15 introduces 6/8).
 * @property {string}              hallRhythmRef Real `core/curriculum.js` level id whose
 *                                               rhythm vocabulary the level reuses (lockstep).
 * @property {MelodicExerciseMode} exerciseMode  Primary app exercise mode (renderer contract).
 * @property {string}              masteryGoal   What the student must be able to do.
 * @property {string[]}            prereqs       Melodic level ids that must be mastered first
 *                                               (the prerequisite DAG edges, child→parents).
 * @property {string}              softGateHall  Real `core/curriculum.js` id — WARN (not block)
 *                                               if rhythm-game progress is below this Hall level.
 * @property {MelodicBuildStatus}  buildStatus   Engine readiness (see {@link MelodicBuildStatus}).
 */

/* ===========================================================================
 * THE LADDER — M0..M20, in order.
 *
 * `hallRhythmRef`/`softGateHall` resolve each MELODIC_CURRICULUM.md rhythm-range
 * citation to the TOP (most-advanced) real Hall id in the range (the rhythmic
 * ceiling). Both are ids that exist in core/curriculum.js (test-verified).
 * `pitch.degrees`/`leaps` only WIDEN as mIndex grows (monotonic difficulty).
 * =========================================================================*/

// Named accidental-ceiling key SETS, straight from MELODIC_CURRICULUM.md's per-level "Key /
// mode" guidance ("maj/min ≤N ♯/♭"). Reused across M10+ so the ceiling is defined once.
const KEYS_0 = [{ key: 'C', mode: 'major' }, { key: 'A', mode: 'natural-minor' }];
const KEYS_LE1 = [
  ...KEYS_0,
  { key: 'G', mode: 'major' }, { key: 'E', mode: 'natural-minor' },
  { key: 'F', mode: 'major' }, { key: 'D', mode: 'natural-minor' },
];
const KEYS_LE2 = [
  ...KEYS_LE1,
  { key: 'D', mode: 'major' }, { key: 'B', mode: 'natural-minor' },
  { key: 'Bb', mode: 'major' }, { key: 'G', mode: 'natural-minor' },
];
const KEYS_LE3 = [
  ...KEYS_LE2,
  { key: 'A', mode: 'major' }, { key: 'F#', mode: 'natural-minor' },
  { key: 'Eb', mode: 'major' }, { key: 'C', mode: 'natural-minor' },
];
// M13's whole point is MODE variety (the 3 minor forms), not key breadth — a few minor
// tonics (≤2 ♯/♭, per the doc), each in all 3 forms.
const KEYS_THREE_MINORS = ['A', 'D', 'E'].flatMap((key) => [
  { key, mode: 'natural-minor' }, { key, mode: 'harmonic-minor' }, { key, mode: 'melodic-minor' },
]);

/**
 * Reorder a key-set so a level's own PRIMARY {key,mode} pair comes first (matching its
 * legacy `key`/`mode` fields — several levels were deliberately given a non-C primary for
 * ladder variety, e.g. M10=G, M12=D, M16=A — while still drawing their full `keys[]` set
 * from a shared accidental-ceiling constant that happens to list C first).
 * @param {{key:string, mode:string}} primary
 * @param {{key:string, mode:string}[]} set
 * @returns {{key:string, mode:string}[]}
 */
function withPrimaryFirst(primary, set) {
  const rest = set.filter((p) => !(p.key === primary.key && p.mode === primary.mode));
  return [primary, ...rest];
}

/** @type {MelodicLevel[]} */
export const MELODIC_LEVELS = [
  // --- M0–M1 : aural-only pre-foundation (no rhythm, no staff) ------------
  {
    id: 'm0', mIndex: 0, title: 'Find home',
    layers: ['0a'],
    // Tonic + immediate tonic-triad neighbours; "is this note home?". No leaps
    // are assessed (single test tones), so no melodic moves in play. Range widened
    // to hold several tonic octaves so HOME can VARY by key (below).
    pitch: { degrees: [1, 2, 3, 5], leaps: [], range: { lowMidi: 55, highMidi: 79 }, startOn: 'tonic' },
    // HOME must NOT always be the same pitch (owner: dictation is learning to
    // re-establish home in ANY key). The drone sets home each round; rotating the
    // key forces the student to LISTEN for home, not memorise "C = home".
    key: 'C', mode: 'major',
    keys: [
      { key: 'C', mode: 'major' }, { key: 'D', mode: 'major' }, { key: 'E', mode: 'major' },
      { key: 'F', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'A', mode: 'major' },
    ],
    meter: '4/4', meters: ['4/4'],
    // No rhythm yet — untimed single tones. The lockstep must still cite a REAL
    // Hall id (the field is non-null by contract); the floor of the rhythm ladder
    // (ch1) is the honest reference and softGateHall for a level that predates rhythm.
    hallRhythmRef: 'ch1',
    exerciseMode: 'tonic-contour',
    masteryGoal: 'Reliably tell the tonic from a not-tonic pitch against an established key center',
    prereqs: [],
    softGateHall: 'ch1',
    buildStatus: 'ready-ish'
  },
  {
    id: 'm1', mIndex: 1, title: 'Which way?',
    layers: ['0b'],
    // 2–3-note figures over the tonic triad + steps; only DIRECTION is assessed.
    // Range widened so contour is practised across KEYS from the very start (owner) —
    // a narrow C4–G4 window clipped the higher tonics.
    pitch: { degrees: [1, 2, 3, 5], leaps: ['step', '3rd'], range: { lowMidi: 55, highMidi: 79 }, startOn: 'tonic' },
    key: 'C', mode: 'major', keys: [
      { key: 'C', mode: 'major' }, { key: 'D', mode: 'major' }, { key: 'E', mode: 'major' },
      { key: 'F', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'A', mode: 'major' },
    ],
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch1', // still untimed / even notes; cite the rhythm floor.
    exerciseMode: 'tonic-contour',
    masteryGoal: 'Correctly name the contour (up / down / same) of every move',
    prereqs: ['m0'],
    softGateHall: 'ch1',
    buildStatus: 'ready-ish'
  },

  // --- M1.5 : HOLD THE TUNE — melody-memory span (MELODIC_LADDER_EXPANSION_PLAN
  //   NEW-A). Research's dominant finding: dictation fails at working memory, and
  //   tonal WM predicts it (β=.406). Echo back a growing span of in-key notes
  //   BEFORE any naming/notation load. mIndex 1.5 keeps it between M1 and M2
  //   without renumbering the ladder (mIndex is only ever compared / checked >=17).
  {
    id: 'm1_5', mIndex: 1.5, title: 'Hold the tune',
    layers: ['0b'],
    // Vocabulary matches Levels 1-2 (1-2-3-5) — NOT the full pentascale. Degree 4 (fa) is
    // the hardest passing tone and the curriculum doesn't introduce it until m5, so a memory
    // level at mIndex 1.5 must not ask the student to identify a degree they've never heard.
    pitch: { degrees: [1, 2, 3, 5], leaps: ['step', '3rd'], range: { lowMidi: 60, highMidi: 72 }, startOn: 'tonic' },
    key: 'C', mode: 'major', keys: [{ key: 'C', mode: 'major' }],
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch1',
    exerciseMode: 'memory-span', exerciseModes: ['memory-span'], hallRhythmRefs: ['ch1'], lengthBars: 2,
    masteryGoal: 'Echo back a growing run of notes — hold the whole phrase in your ear',
    prereqs: ['m1'],
    softGateHall: 'ch1',
    buildStatus: 'ready'
  },

  // --- M2 : the rhythm-first hinge (reuse the rhythm game wholesale) ------
  {
    id: 'm2', mIndex: 2, title: 'The rhythm IS the melody',
    layers: ['R'],
    // Pitch held constant (monotone / fixed 1̂) — 100% attention on rhythm.
    pitch: { degrees: [1], leaps: [], range: { lowMidi: 60, highMidi: 60 }, startOn: 'tonic' },
    key: 'C', mode: 'major', keys: [{ key: 'C', mode: 'major' }],
    meter: '4/4', meters: ['2/4', '3/4', '4/4'], // Hall Ch1-3 exercises all three simple meters
    // "Hall Ch 1–3" → top of range = ch3 (simple duple/triple/quadruple, quarter beat).
    hallRhythmRef: 'ch3',
    // The rhythm-first hinge, now on a real (moving 1-2-3-5) melody, dictated on the
    // MelodyQuest-native palette; the final stage also names the 1/3/5 anchors and shapes the
    // passing tones (stacking). Same 'rhythm-first' mode; the renderer gates the name/shape step.
    exerciseMode: 'rhythm-first',
    masteryGoal: 'Dictate the rhythm of a short melody at Hall Ch 1–3; then name/shape its notes',
    // §3: prereq M1, AND rhythm-game progress at/above Hall Ch 3 (soft-gated below).
    prereqs: ['m1'],
    softGateHall: 'ch3',
    buildStatus: 'ready'
  },

  // --- M3–M8 : no-staff span (rhythm + degrees only; notation withheld) ---
  {
    id: 'm3', mIndex: 3, title: 'First 3 notes get numbers',
    layers: ['R', 'D'],
    // First three scale degrees only, stepwise, tonic-start (RCM Prep A).
    pitch: { degrees: [1, 2, 3], leaps: ['step'], range: { lowMidi: 60, highMidi: 64 }, startOn: 'tonic' },
    key: 'C', mode: 'major', keys: [{ key: 'C', mode: 'major' }],
    meter: '2/4', meters: ['2/4'],
    // "Hall Ch 1–2" → top = ch2.
    hallRhythmRef: 'ch2',
    exerciseMode: 'labeling',
    masteryGoal: 'Correct degree/syllable per note over a given rhythm (1̂-2̂-3̂ melody)',
    // §3: M2 (rhythm mastered here) + M0 (tonic sense).
    prereqs: ['m2', 'm0'],
    softGateHall: 'ch2',
    buildStatus: 'needs-build'
  },
  {
    id: 'm4', mIndex: 4, title: 'Read it back',
    layers: ['R', 'D', 'N'],
    // Same 1̂-2̂-3̂ set; N here is READING only (recognition), not production.
    pitch: { degrees: [1, 2, 3], leaps: ['step', '3rd'], range: { lowMidi: 55, highMidi: 64 }, startOn: 'tonic' },
    // "C, then G major" — a second key, so degrees are transposable, not pitch-memorized.
    key: 'C', mode: 'major', keys: [{ key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }],
    meter: '2/4', meters: ['2/4'],
    // "Hall Ch 1–3" → top = ch3.
    hallRhythmRef: 'ch3',
    exerciseMode: 'recognition',
    masteryGoal: 'Match a heard 3-degree melody to its correct notation among plausible foils',
    prereqs: ['m3'],
    softGateHall: 'ch3',
    buildStatus: 'needs-build'
  },
  {
    id: 'm5', mIndex: 5, title: 'The pentascale 1–5',
    layers: ['R', 'D'],
    // Full pentascale 1̂–5̂: stepwise + tonic-triad skips (1̂-3̂, 3̂-5̂, 1̂-5̂).
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "C, G major".
    key: 'C', mode: 'major', keys: [{ key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }],
    meter: '3/4', meters: ['3/4'],
    // "Hall Ch 3–4" → top = ch4 (adds dotted-quarter+eighth, ties).
    hallRhythmRef: 'ch4',
    exerciseMode: 'labeling',
    masteryGoal: "Correctly label any pentascale melody's degrees, in two keys",
    prereqs: ['m4'],
    softGateHall: 'ch4',
    buildStatus: 'needs-build'
  },
  // --- M5.5 : FIND HOME — MINOR (aural orientation for minor keys). Finding the
  //   tonic in minor is a DISTINCT skill from major — it does not transfer
  //   automatically (owner). An M0-style live find-home session, but run in minor:
  //   the student taps HOME on the tonic across several natural-minor keys, then
  //   hears the minor-third landmark (the note that defines minor). Slotted just
  //   before M6 (first minor level) as its aural on-ramp; fractional mIndex 5.5 so
  //   nothing renumbers. Layers ['0a'] — the same tonic-orientation layer as M0.
  {
    id: 'm5_5', mIndex: 5.5, title: 'Find home — minor',
    layers: ['0a'],
    // Minor pentascale material, same breadth as M6. The live renderer generates
    // its OWN test tones from the tonic; these fields exist so the round-builder /
    // generator conformance sweep has a valid minor spec to build against.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // A few natural-minor keys so HOME must be re-found by ear, not memorized.
    key: 'A', mode: 'natural-minor',
    keys: [
      { key: 'A', mode: 'natural-minor' }, { key: 'E', mode: 'natural-minor' }, { key: 'D', mode: 'natural-minor' },
    ],
    meter: '4/4', meters: ['4/4'],
    // Untimed live tones like M0 — cite the rhythm floor (the field is non-null by contract).
    hallRhythmRef: 'ch1',
    exerciseMode: 'live-home-minor',
    masteryGoal: 'Reliably find the tonic (home) by ear in several minor keys, and hear the minor third',
    prereqs: ['m5'],
    softGateHall: 'ch1',
    buildStatus: 'ready-ish'
  },
  {
    id: 'm6', mIndex: 6, title: 'Minor arrives early',
    layers: ['R', 'D'],
    // Minor pentascale 1̂–5̂ (la-based or 1̂-based). Same degree/leap breadth as M5.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "A minor and D minor (relative to C/G major from M5)".
    key: 'A', mode: 'natural-minor', keys: [{ key: 'A', mode: 'natural-minor' }, { key: 'D', mode: 'natural-minor' }],
    meter: '3/4', meters: ['3/4'],
    // "Hall Ch 3–4" → top = ch4.
    hallRhythmRef: 'ch4',
    exerciseMode: 'recognition',
    masteryGoal: 'Distinguish major vs minor tonality by ear and label a minor pentascale melody',
    prereqs: ['m5'],
    softGateHall: 'ch4',
    buildStatus: 'needs-build'
  },
  {
    id: 'm7', mIndex: 7, title: 'Hear the gap',
    layers: ['R', 'D'],
    // 3rds (m3/M3) as melodic intervals inside the pentascale. Adds missing-note.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "C, G maj / A min".
    key: 'C', mode: 'major',
    keys: [{ key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'A', mode: 'natural-minor' }],
    meter: '3/4', meters: ['3/4'],
    hallRhythmRef: 'ch4',
    exerciseMode: 'missing-note',
    masteryGoal: 'Identify a 3rd by degree jump and fill a single hidden note in a pentascale melody',
    prereqs: ['m6'],
    softGateHall: 'ch4',
    buildStatus: 'needs-build'
  },
  {
    id: 'm8', mIndex: 8, title: 'Skips to the frame',
    layers: ['R', 'D'],
    // +P5 (1̂→5̂) and +P4 (5̂→1̂, 1̂→4̂) — the tonal frame, still no staff.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P4', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "G, F maj / D min".
    key: 'G', mode: 'major',
    keys: [{ key: 'G', mode: 'major' }, { key: 'F', mode: 'major' }, { key: 'D', mode: 'natural-minor' }],
    meter: '2/4', meters: ['2/4'],
    // "Hall Ch 6" → ch6 (sixteenths in simple meter).
    hallRhythmRef: 'ch6',
    exerciseMode: 'missing-note',
    masteryGoal: 'Identify and (via missing-note) produce P4 and P5 leaps in a melody',
    prereqs: ['m7'],
    softGateHall: 'ch6',
    buildStatus: 'needs-build'
  },

  // --- M8.5 : SKETCH IT — protonotation entry (MELODIC_LADDER_EXPANSION_PLAN
  //   NEW-C). The missing bridge between the last no-staff rung (M8) and first
  //   staff notation (M9): capture only what's HEARD (scale-degree numbers +
  //   up/down/same contour) before fighting staff fluency. Karpinski's device;
  //   no shipped product has it. Grades UNDERSTANDING separately from NOTATION.
  {
    id: 'm8_5', mIndex: 8.5, title: 'Sketch it',
    layers: ['R', 'D'],
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P4', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    key: 'C', mode: 'major',
    keys: [{ key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'A', mode: 'natural-minor' }],
    meter: '2/4', meters: ['2/4'],
    hallRhythmRef: 'ch4',
    exerciseMode: 'protonotation', exerciseModes: ['protonotation'], hallRhythmRefs: ['ch4', 'ch6'], lengthBars: 2,
    masteryGoal: 'Sketch a melody as scale-degrees + contour — capture what you HEAR before the staff',
    prereqs: ['m8'],
    softGateHall: 'ch6',
    buildStatus: 'ready'
  },

  // --- M9 : notation finally enters (as the LAST layer) -------------------
  {
    id: 'm9', mIndex: 9, title: 'First staff notation',
    layers: ['R', 'D', 'N'],
    // Pentascale melodies using every prior degree/leap (1̂–5̂, 3rds/4ths/5ths).
    // Nothing NEW in pitch — the novelty is PRODUCING it on a staff.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P4', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "C, G, F maj / A, D min".
    key: 'C', mode: 'major',
    keys: [
      { key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'F', mode: 'major' },
      { key: 'A', mode: 'natural-minor' }, { key: 'D', mode: 'natural-minor' },
    ],
    meter: '2/4', meters: ['2/4'],
    // "Hall Ch 4–6" → top = ch6.
    hallRhythmRef: 'ch6',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Notate a short pentascale phrase (pitch + rhythm), clean pass, ≥2 keys and both modes',
    prereqs: ['m8'],
    softGateHall: 'ch6',
    buildStatus: 'needs-build'
  },

  // --- M10–M20 : widen pitch, climb the Hall rhythm, cycle the modes ------
  {
    id: 'm10', mIndex: 10, title: 'Spot the wrong note',
    layers: ['R', 'D', 'N'],
    // Pentascale, 1 altered note — error detection.
    pitch: { degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P4', 'P5'], range: { lowMidi: 55, highMidi: 67 }, startOn: 'tonic' },
    // "maj/min ≤1 ♯/♭".
    key: 'G', mode: 'major', keys: withPrimaryFirst({ key: 'G', mode: 'major' }, KEYS_LE1),
    meter: '2/4', meters: ['2/4'],
    // "Hall Ch 6–7" → top = ch7 (dotted eighths in simple meter).
    hallRhythmRef: 'ch7',
    exerciseMode: 'error-detect',
    masteryGoal: 'Find and correct the single wrong pitch in a pentascale melody',
    prereqs: ['m9'],
    softGateHall: 'ch7',
    buildStatus: 'needs-build'
  },
  {
    id: 'm11', mIndex: 11, title: 'Complete the octave',
    layers: ['R', 'D', 'N'],
    // Full major scale 1̂–8̂: adds 6̂, 7̂ (leading tone), and the octave leap.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8'], range: { lowMidi: 60, highMidi: 72 }, startOn: 'tonic' },
    // "C, G, F, D maj" — major only, no minor yet at the full octave.
    key: 'C', mode: 'major',
    keys: [
      { key: 'C', mode: 'major' }, { key: 'G', mode: 'major' },
      { key: 'F', mode: 'major' }, { key: 'D', mode: 'major' },
    ],
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 7" → ch7.
    hallRhythmRef: 'ch7',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Label and notate a full-octave major melody',
    prereqs: ['m10'],
    softGateHall: 'ch7',
    buildStatus: 'needs-build'
  },
  {
    id: 'm12', mIndex: 12, title: 'The octave leap + 6ths',
    layers: ['R', 'D', 'N'],
    // +P8, +m6/M6 (RCM L4–5 intervals).
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th'], range: { lowMidi: 57, highMidi: 74 }, startOn: 'tonic' },
    // "maj/min ≤2 ♯/♭".
    key: 'D', mode: 'major', keys: withPrimaryFirst({ key: 'D', mode: 'major' }, KEYS_LE2),
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 9" → ch9 (rests & syncopation in simple meter).
    hallRhythmRef: 'ch9',
    exerciseMode: 'missing-note',
    masteryGoal: 'Identify and notate 6ths and octave leaps in a phrase',
    prereqs: ['m11'],
    softGateHall: 'ch9',
    buildStatus: 'needs-build'
  },
  {
    id: 'm13', mIndex: 13, title: 'Full minor: three forms',
    layers: ['R', 'D', 'N'],
    // Natural / harmonic / melodic minor (raised 6̂ 7̂). Full octave.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th'], range: { lowMidi: 57, highMidi: 74 }, startOn: 'tonic' },
    // "minor keys ≤2 ♯/♭" — the axis here is MODE (3 forms), not key breadth.
    key: 'A', mode: 'harmonic-minor', keys: withPrimaryFirst({ key: 'A', mode: 'harmonic-minor' }, KEYS_THREE_MINORS),
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch9',
    exerciseMode: 'recognition',
    masteryGoal: 'Hear which of the three minor forms is in play and notate it',
    prereqs: ['m12'],
    softGateHall: 'ch9',
    buildStatus: 'needs-build'
  },
  {
    id: 'm14', mIndex: 14, title: 'Steps everywhere — 2nds; longer phrase',
    layers: ['R', 'D', 'N'],
    // +m2/M2 (RCM L6); 4-bar phrases. ('step' already covers 2nds; this is where
    // 2nds become the explicitly-taught interval and phrases lengthen.)
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th'], range: { lowMidi: 57, highMidi: 74 }, startOn: 'tonic' },
    // "maj/min ≤2 ♯/♭".
    key: 'D', mode: 'major', keys: withPrimaryFirst({ key: 'D', mode: 'major' }, KEYS_LE2),
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 12" → ch12 (triplets).
    hallRhythmRef: 'ch12',
    exerciseMode: 'labeling',
    masteryGoal: 'Notate a 4-bar diatonic phrase, either mode',
    prereqs: ['m13'],
    softGateHall: 'ch12',
    buildStatus: 'needs-build'
  },
  {
    id: 'm15', mIndex: 15, title: 'Compound-meter melodies (6/8)',
    layers: ['R', 'D', 'N'],
    // Full diatonic, compound-meter rhythm.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th'], range: { lowMidi: 57, highMidi: 74 }, startOn: 'tonic' },
    // "maj/min ≤2 ♯/♭".
    key: 'D', mode: 'major', keys: withPrimaryFirst({ key: 'D', mode: 'major' }, KEYS_LE2),
    meter: '6/8', meters: ['6/8'],
    // "Hall Ch 5/8/10 (6/8 track)" → top of the compound run = ch10 (rests &
    // syncopation in 6/8). ch5/ch8/ch10 are the compound dotted-quarter chapters.
    hallRhythmRef: 'ch10',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Notate a melody in 6/8',
    prereqs: ['m14'],
    softGateHall: 'ch10',
    buildStatus: 'needs-build'
  },
  {
    id: 'm16', mIndex: 16, title: 'Wider leaps — 7ths',
    layers: ['R', 'D', 'N'],
    // +m7/M7 (RCM L7).
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'tonic' },
    // "maj/min ≤3 ♯/♭".
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3),
    meter: '4/4', meters: ['4/4', '6/8'],
    // "Hall Ch 9/12" → top = ch12.
    hallRhythmRef: 'ch12',
    exerciseMode: 'missing-note',
    masteryGoal: 'Identify and notate a 7th in context',
    prereqs: ['m15'],
    softGateHall: 'ch12',
    buildStatus: 'needs-build'
  },
  {
    id: 'm17', mIndex: 17, title: 'Multi-phrase dictation (period)',
    layers: ['R', 'D', 'N'],
    // Full octave, antecedent/consequent period. startOn relaxes to 'any'.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    // "many maj/min keys ≤3 ♯/♭".
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3),
    meter: '4/4', meters: ['4/4', '3/4', '6/8'],
    // "Hall Ch 6–12 mixed" → top = ch12.
    hallRhythmRef: 'ch12',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Notate an 8-bar period, both keys/modes',
    prereqs: ['m16'],
    softGateHall: 'ch12',
    buildStatus: 'needs-build'
  },
  {
    id: 'm18', mIndex: 18, title: 'First chromatic note — the tritone & alterations',
    layers: ['R', 'D', 'N'],
    // Passing chromaticism (RCM L8). All 7 degrees; the "tritone" content is a
    // chromatic PASSING TONE (spec.chromaticPassingTone), not a leap — see the
    // module-header note on why 'tritone' was removed from `leaps`.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    chromaticPassingTone: true,
    // "maj/min ≤3 ♯/♭".
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3),
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 9/12" → top = ch12.
    hallRhythmRef: 'ch12',
    exerciseMode: 'error-detect',
    masteryGoal: 'Hear and notate a chromatic non-diatonic tone (a resolving passing alteration)',
    prereqs: ['m17'],
    softGateHall: 'ch12',
    buildStatus: 'ready'
  },
  {
    id: 'm19', mIndex: 19, title: 'Modulation to the dominant/relative',
    layers: ['R', 'D', 'N'],
    // Pivot to V or relative major/minor. Full degree/leap breadth (unchanged
    // from M18 — the novelty is the key change, not new pitch material).
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    // "modulating" — the level's whole point is a mid-piece key change, so `keys`
    // here lists plausible STARTING keys (the far-key end is derived at generation
    // time from the pivot, not a separate fixed pair).
    key: 'C', mode: 'major',
    keys: [
      { key: 'C', mode: 'major' }, { key: 'G', mode: 'major' }, { key: 'F', mode: 'major' },
      { key: 'A', mode: 'natural-minor' }, { key: 'E', mode: 'natural-minor' }, { key: 'D', mode: 'natural-minor' },
    ],
    // The modulation itself: generateModulatingMelody splits the piece in half —
    // antecedent in the level's key ending in a half cadence, consequent in the
    // DOMINANT key cadencing on the new tonic.
    modulation: 'dominant',
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 6–15" → top of the READY span cited = ch15 (dotted-half compound beat).
    hallRhythmRef: 'ch15',
    exerciseMode: 'recognition',
    masteryGoal: 'Detect where the key changes and notate both keys',
    prereqs: ['m18'],
    softGateHall: 'ch15',
    buildStatus: 'ready'
  },
  {
    id: 'm20', mIndex: 20, title: 'Two-part / two-voice melodic dictation',
    layers: ['R', 'D', 'N'],
    // Two simultaneous melodic lines (the melodic duet). Same pitch breadth.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 48, highMidi: 79 }, startOn: 'any' },
    // "maj/min" — unrestricted breadth implied; reuse the ≤3 ♯/♭ set as a sensible default.
    key: 'C', mode: 'major', keys: KEYS_LE3,
    meter: '4/4', meters: ['4/4'],
    // "Hall Ch 1+ duets (2-voice)" → the duet foundation is the rhythm floor, ch1
    // (the 2-voice capability itself is the engine lift, tracked in buildStatus).
    hallRhythmRef: 'ch1',
    exerciseMode: 'two-part',
    masteryGoal: 'Identify and dictate the voices of a two-part melody',
    prereqs: ['m19'],
    softGateHall: 'ch1',
    // Two-voice engine BUILT (generateTwoPartMelody — note-against-note, NOT
    // strict first species; see VISION.md §9 and the engine's own header).
    // All three rungs ship: voice-attention, one-voice dictation, and full
    // two-voice notation (RENDERERS['two-part-notate'], melodic-game.html).
    buildStatus: 'ready'
  },
  /* =========================================================================
   * M21-M26 — BEYOND-RCM EXTENSION. M0-M20 above tracks Hall/RCM Prep-8
   * diatonic mastery; this span deliberately extends past that ceiling toward
   * late-Romantic/Impressionist/early-20th-century color, per the owner's
   * locked scope (late-Romantic → Impressionist → early-20th-c., NOT atonal).
   * See MELODIC_CURRICULUM.md's "Beyond-RCM extension" note (§2, after the
   * ladder table) for the full rationale.
   * =======================================================================*/
  {
    id: 'm21', mIndex: 21, title: 'Modal mixture — borrowed color',
    layers: ['R', 'D', 'N'],
    // ♭6̂ borrowed from the parallel minor wherever a diatonic 6̂→5̂ descent already
    // exists (spec.modalMixture). Major mode only — mixture is meaningless without
    // a major 6̂ to lower.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    modalMixture: true,
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3.filter((k) => k.mode === 'major')),
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch12',
    exerciseMode: 'error-detect',
    masteryGoal: 'Hear and notate a borrowed (modal-mixture) tone',
    prereqs: ['m20'],
    softGateHall: 'ch12',
    buildStatus: 'ready'
  },
  {
    id: 'm22', mIndex: 22, title: 'Secondary dominant color',
    layers: ['R', 'D', 'N'],
    // Raised 4̂ (V/V) wherever it already ascends to 5̂ (spec.secondaryDominant).
    // Works in major or minor — degree 4 is an unaltered perfect 4th in both.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    secondaryDominant: true,
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3),
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch12',
    exerciseMode: 'error-detect',
    masteryGoal: 'Hear and notate a secondary-dominant (raised-4̂) color tone',
    prereqs: ['m21'],
    softGateHall: 'ch12',
    buildStatus: 'ready'
  },
  {
    id: 'm23', mIndex: 23, title: 'Church modes',
    layers: ['R', 'D', 'N'],
    // Full 7-degree collections in each of the 5 non-major/minor church modes.
    // One representative tonic per mode (dorian/phrygian/lydian/mixolydian/locrian),
    // matching core/melodic.js's MODES + SCALE_SEMITONES entries directly.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    key: 'D', mode: 'dorian',
    keys: [
      { key: 'D', mode: 'dorian' }, { key: 'E', mode: 'phrygian' }, { key: 'F', mode: 'lydian' },
      { key: 'G', mode: 'mixolydian' }, { key: 'B', mode: 'locrian' },
    ],
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch12',
    exerciseMode: 'recognition',
    masteryGoal: 'Hear and notate a melody in a named church mode',
    prereqs: ['m22'],
    softGateHall: 'ch12',
    buildStatus: 'ready'
  },
  {
    id: 'm24', mIndex: 24, title: 'Symmetric & pentatonic collections',
    layers: ['R', 'D', 'N'],
    // Major-pentatonic slice: the EXISTING degrees-restriction mechanism already
    // produces a genuine pentatonic collection (degrees [1,2,3,5,6] on major has
    // no new generator code — see core/melodic.test.js's pentatonic seed-sweep
    // test). Whole-tone/octatonic are NOT yet ported (they are non-diatonic, no
    // single-letter-per-degree collection, and need their own generator function
    // — proven in this session's scratchpad as generateSymmetricMelody but not
    // yet brought into core/melodic.js) — flagged accurately below, not hidden.
    pitch: { degrees: [1, 2, 3, 5, 6], leaps: ['step', '3rd', 'P4', 'P5', '6th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'tonic' },
    key: 'C', mode: 'major', keys: withPrimaryFirst({ key: 'C', mode: 'major' }, KEYS_LE2.filter((k) => k.mode === 'major')),
    // The non-diatonic half of this level: whole-tone + both octatonic forms, via
    // core/melodic.js's generateSymmetricMelody (its own generator — the diatonic
    // degree walk doesn't apply to 6/8-note collections).
    symmetricCollections: ['whole-tone', 'octatonic-wh', 'octatonic-hw'],
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch6',
    exerciseMode: 'labeling',
    masteryGoal: 'Hear and label a pentatonic melody; recognize whole-tone/octatonic melodies',
    prereqs: ['m23'],
    softGateHall: 'ch6',
    buildStatus: 'ready'
  },
  {
    id: 'm25', mIndex: 25, title: 'Irregular & changing meter',
    layers: ['R', 'D', 'N'],
    // Full diatonic pitch material; the novelty is 5/8 (2+3), 7/8 (2+2+3), and
    // mid-piece CHANGING meter. Irregular: core/melodic.js fills GROUP-BY-GROUP
    // (IRREGULAR_GROUPS) so no figure straddles a group boundary. Changing:
    // spec.meterSequence (one meter per bar, constant beat class per Hall Ch19/20;
    // the time signature is restated at every change in both staff renderers).
    // Rounds rotate by seed across THREE kinds (see melodic-round.js): irregular,
    // changing-simple (Ch19), and changing simple<->compound (Ch21/22) with the
    // division-constant equivalence marking drawn at each class change.
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    key: 'A', mode: 'major', keys: withPrimaryFirst({ key: 'A', mode: 'major' }, KEYS_LE3),
    meter: '5/8', meters: ['5/8', '7/8'],
    hallRhythmRef: 'ch12',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Notate a phrase in an irregular or changing meter',
    prereqs: ['m24'],
    softGateHall: 'ch12',
    buildStatus: 'ready'
  },
  {
    id: 'm26', mIndex: 26, title: 'Composition capstone',
    layers: ['R', 'D', 'N'],
    // Modulation (M19) + mixture (M21) + secondary dominant (M22) combined in one
    // piece: generateModulatingMelody applies the color flags to the ANTECEDENT
    // ONLY by construction, so the post-modulation consequent stays cleanly
    // diatonic to the new key (the scratchpad's colorMaxBar rule, structural now).
    pitch: { degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th'], range: { lowMidi: 55, highMidi: 76 }, startOn: 'any' },
    modalMixture: true, secondaryDominant: true, modulation: 'dominant',
    key: 'C', mode: 'major', keys: withPrimaryFirst({ key: 'C', mode: 'major' }, KEYS_LE3.filter((k) => k.mode === 'major')),
    meter: '4/4', meters: ['4/4'],
    hallRhythmRef: 'ch15',
    exerciseMode: 'notation-entry',
    masteryGoal: 'Notate an 8-bar piece that both modulates and carries color tones',
    prereqs: ['m19', 'm21', 'm22'],
    softGateHall: 'ch15',
    buildStatus: 'ready'
  }
];

/* ===========================================================================
 * DOC CONFORMANCE (history/CONFORMANCE_AUDIT.md §C1, 2026-07-02) — three per-level
 * facts MELODIC_CURRICULUM.md prescribes that the single-value fields above
 * under-encoded:
 *   exerciseModes  — the §2/§3 exercise-mode PROGRESSION (ordered easiest →
 *                    hardest; the legacy exerciseMode field = its first entry
 *                    for m6, otherwise a member).
 *   hallRhythmRefs — the §2 Hall chapter RANGE ("Ch 1–3" etc.), restricted to
 *                    chapters that exist in the rhythm vocabulary and fit the
 *                    level's meter track (ch13 has no vocab entry — m25 uses
 *                    ch12/ch14, the nearest present chapters).
 *   lengthBars     — the level's own MATERIAL length where the doc names one
 *                    (M14 "4-bar phrases", M17 8-bar period, M26 8-bar piece).
 * m19 stays ['recognition'] and m24's symmetric rounds stay recognition-only:
 * degree entry across a modulation / outside a diatonic collection needs a
 * modulation-aware notation grader that does not exist yet (audit §A5 —
 * registered gap, not a silent substitution).
 * =========================================================================*/
const DOC_CONFORMANCE = {
  m0: { exerciseModes: ['tonic-contour'], hallRhythmRefs: ['ch1'], lengthBars: 2 },
  m1: { exerciseModes: ['tonic-contour'], hallRhythmRefs: ['ch1'], lengthBars: 2 },
  m2: { exerciseModes: ['rhythm-first'], hallRhythmRefs: ['ch1', 'ch2', 'ch3'], lengthBars: 2 }, // native rhythm palette on a moving melody; final stage adds name/shape (stacking)
  m3: { exerciseModes: ['labeling'], hallRhythmRefs: ['ch1', 'ch2'], lengthBars: 2 },
  m4: { exerciseModes: ['recognition'], hallRhythmRefs: ['ch1', 'ch2', 'ch3'], lengthBars: 2 },
  m5: { exerciseModes: ['labeling', 'recognition'], hallRhythmRefs: ['ch3', 'ch4'], lengthBars: 2 },
  m5_5: { exerciseModes: ['live-home-minor'], hallRhythmRefs: ['ch1'], lengthBars: 2 },
  m6: { exerciseModes: ['recognition', 'labeling'], hallRhythmRefs: ['ch3', 'ch4'], lengthBars: 2 },
  m7: { exerciseModes: ['labeling', 'missing-note'], hallRhythmRefs: ['ch4'], lengthBars: 2 },
  m8: { exerciseModes: ['labeling', 'missing-note'], hallRhythmRefs: ['ch6'], lengthBars: 2 },
  m9: { exerciseModes: ['notation-entry'], hallRhythmRefs: ['ch4', 'ch6'], lengthBars: 2 },
  m10: { exerciseModes: ['error-detect'], hallRhythmRefs: ['ch6', 'ch7'], lengthBars: 2 },
  m11: { exerciseModes: ['labeling', 'notation-entry'], hallRhythmRefs: ['ch7'], lengthBars: 2 },
  m12: { exerciseModes: ['missing-note', 'notation-entry'], hallRhythmRefs: ['ch9'], lengthBars: 2 },
  m13: { exerciseModes: ['recognition', 'labeling', 'notation-entry'], hallRhythmRefs: ['ch9'], lengthBars: 2 },
  m14: { exerciseModes: ['labeling', 'notation-entry'], hallRhythmRefs: ['ch12'], lengthBars: 4 },
  m15: { exerciseModes: ['notation-entry'], hallRhythmRefs: ['ch5', 'ch8', 'ch10'], lengthBars: 2 },
  m16: { exerciseModes: ['missing-note', 'notation-entry'], hallRhythmRefs: ['ch9', 'ch12'], lengthBars: 2 },
  m17: { exerciseModes: ['notation-entry'], hallRhythmRefs: ['ch6', 'ch7', 'ch9', 'ch12'], lengthBars: 8 },
  m18: { exerciseModes: ['error-detect', 'notation-entry'], hallRhythmRefs: ['ch9', 'ch12'], lengthBars: 2 },
  m19: { exerciseModes: ['recognition'], hallRhythmRefs: ['ch15'], lengthBars: 4 },
  m20: { exerciseModes: ['two-part'], hallRhythmRefs: ['ch1'], lengthBars: 2 },
  m21: { exerciseModes: ['error-detect', 'notation-entry'], hallRhythmRefs: ['ch9', 'ch12'], lengthBars: 2 },
  m22: { exerciseModes: ['error-detect', 'notation-entry'], hallRhythmRefs: ['ch9', 'ch12'], lengthBars: 2 },
  m23: { exerciseModes: ['recognition', 'labeling', 'notation-entry'], hallRhythmRefs: ['ch6', 'ch7', 'ch9', 'ch12'], lengthBars: 2 },
  m24: { exerciseModes: ['recognition', 'labeling', 'notation-entry'], hallRhythmRefs: ['ch3', 'ch4', 'ch6', 'ch9'], lengthBars: 2 },
  m25: { exerciseModes: ['notation-entry'], hallRhythmRefs: ['ch12', 'ch14'], lengthBars: 2 },
  m26: { exerciseModes: ['notation-entry'], hallRhythmRefs: ['ch15'], lengthBars: 8 },
};
for (const L of MELODIC_LEVELS) {
  const c = DOC_CONFORMANCE[L.id];
  if (c) Object.assign(L, c);
}

/** @type {Map<string, MelodicLevel>} id → MelodicLevel, for O(1) lookup. */
const MELODIC_LEVEL_BY_ID = new Map(MELODIC_LEVELS.map((l) => [l.id, l]));

/* ===========================================================================
 * ACCESSORS
 * =========================================================================*/

/**
 * VOCABULARY INTRODUCTION ORDER (curriculum invariant).
 *
 * The canonical mIndex at which each scale degree and leap type first becomes available.
 * INVARIANT: no level may use a degree/leap before the mIndex listed here — a memory/labeling
 * task must never ask a student to identify a degree they have not yet been taught to hear.
 * (This is exactly the bug that shipped in m1_5, which used degree 4 at mIndex 1.5 while the
 * curriculum introduces fa at m5.) Enforced by core/melodic-conformance.test.js and documented
 * in MELODIC_CURRICULUM.md §"Vocabulary introduction order". Change a value here ONLY as a
 * deliberate curriculum decision; the conformance test will then flag every level to update.
 */
export const DEGREE_INTRO_MINDEX = Object.freeze({ 1: 0, 2: 0, 3: 0, 5: 0, 4: 5, 6: 11, 7: 11 });
export const LEAP_INTRO_MINDEX = Object.freeze({ step: 1, '3rd': 1, P5: 5, P4: 8, P8: 11, '6th': 12, '7th': 16 });

/**
 * OCTAVE EQUIVALENCE (curriculum invariant). Recognising that a pitch an octave from home is
 * still "home"/the same degree is a distinct, harder skill — it must be TAUGHT, not sprung.
 * It is introduced at Level 1 (m0) as its FINAL stage (0-based `M0_OCTAVE_EQUIV_STAGE`, i.e.
 * "Stage 6"), with an octave-matched reference. INVARIANT: every earlier m0 stage — and any
 * home/degree identification before this stage — uses a SINGLE octave. m0's wide 2-octave
 * pitch.range is justified BY this stage; levels after Level 1 may assume octave equivalence.
 * See MELODIC_CURRICULUM.md §1b "Octave equivalence". The single-octave-early / octave-late
 * behavior lives in `melodic-renderers.js` (M0_LIVE_TIERS + buildTonicStream) and is verified
 * by the per-stage octave-config check (homeOffsets [0] for stages 0-4, [0,12,-12] for stage 5).
 */
export const M0_OCTAVE_EQUIV_STAGE = 5;

/**
 * The ordered melodic ladder (M0..M20).
 * @returns {MelodicLevel[]} The levels in ladder order (a live reference to the
 *   module array — treat as read-only, same discipline as core/curriculum.js).
 */
export function melodicLadder() {
  return MELODIC_LEVELS;
}

/**
 * Look up a melodic level by id.
 * @param {string} id Melodic level id, e.g. `'m3'`.
 * @returns {MelodicLevel|undefined} The level, or `undefined` if unknown.
 */
export function melodicLevel(id) {
  return MELODIC_LEVEL_BY_ID.get(id);
}

/**
 * The number of levels in the melodic ladder.
 * @returns {number} 30 (M0..M26 + the M1.5/M5.5/M8.5 expansion rungs).
 */
export function melodicCount() {
  return MELODIC_LEVELS.length;
}
