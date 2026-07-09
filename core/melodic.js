/**
 * @file core/melodic.js
 * @module core/melodic
 *
 * MELODIC ENGINE — the pitch/degree generator + labeling + distractors.
 *
 * PURE, framework-agnostic ES module following Functional Core / Imperative Shell,
 * the same discipline as `core/mastery.js` and `core/curriculum.js`:
 *   - NO DOM, NO audio, NO I/O, NO wall-clock, NO Firebase.
 *   - Every function takes all data as parameters and returns NEW data; inputs are
 *     never mutated (melodies are immutable value objects).
 *   - All randomness flows through an INJECTED, deterministic seed (a tiny splitmix32
 *     PRNG), so every generated melody/distractor set is reproducible under `spec.seed`.
 *
 * It implements the shared contract in `MELODIC_ENGINE_SPEC.md`:
 *   §1 the data model (MelodicNote / Melody),
 *   §2 `generateMelody(spec)`,
 *   §3 `labelNote(note, ctx)` + `labelPalette(ctx)` (numbers / fixed-do / moveable-do,
 *      with the moveable-do minor la-based vs do-based sub-fork),
 *   §4 `distractors(correct, opts)`.
 *
 * The rhythm layer is borrowed BY REFERENCE from `core/curriculum.js`: a spec cites a
 * Hall chapter id (`hallRhythmRef`, e.g. 'ch3'); this module keeps a small internal
 * rhythm vocabulary keyed by that id so it stays self-contained + testable (the real
 * rhythm-game generator is app-layer). Durations use the SAME VexFlow codes the rhythm
 * engine uses ('w','h','q','8','16','hd', rests as 'qr' etc.).
 */

/* ============================================================================
 * ENUMS / CONSTANTS — the spec's vocabulary, in one place.
 * ========================================================================== */

/** Diatonic modes the generator understands. @type {ReadonlyArray<string>} */
export const MODES = Object.freeze([
  'major',
  'natural-minor',
  'harmonic-minor',
  'melodic-minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
]);

/** Allowed melodic moves (degree-jumps, NOT interval-name tests). @type {ReadonlyArray<string>} */
export const LEAPS = Object.freeze(['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th']);

/** Labeling systems. Default is 'numbers'. @type {ReadonlyArray<string>} */
export const LABEL_SYSTEMS = Object.freeze(['numbers', 'fixed-do', 'moveable-do']);

/**
 * The number of DIATONIC scale-steps a leap spans (degree distance), used to
 * translate a spec's allowed `leaps` into permissible degree jumps.
 *   step = 1 diatonic step, 3rd = 2 steps, P4 = 3, P5 = 4, 6th = 5, 7th = 6,
 *   P8 = 7 (a full octave — same degree, one octave apart).
 * @type {Readonly<Record<string, number>>}
 */
export const LEAP_DEGREE_SPAN = Object.freeze({
  step: 1,
  '3rd': 2,
  P4: 3,
  P5: 4,
  '6th': 5,
  '7th': 6,
  P8: 7,
});

/**
 * Semitone offset of each diatonic scale degree (1..7) above the tonic, per mode.
 * Index 0 unused; index d = degree d. `alter` (±1) is added on top of these.
 *
 * natural-minor: 1 2 ♭3 4 5 ♭6 ♭7  → 0 2 3 5 7 8 10
 * harmonic-minor: raised 7̂          → 0 2 3 5 7 8 11
 * melodic-minor (ascending form): raised 6̂ AND 7̂ → 0 2 3 5 7 9 11
 * @type {Readonly<Record<string, number[]>>}
 */
export const SCALE_SEMITONES = Object.freeze({
  major: [0, 0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 0, 2, 3, 5, 7, 9, 11],
  // M23: church modes — each is the plain diatonic (white-key-relative) collection
  // starting on a different scale degree of major. Still a 7-note-per-octave, one-
  // letter-per-degree collection, so midiToPitch's letter-spelling logic (which only
  // assumes "degree d is (tonicLetter + d-1) around the 7-letter wheel") needs no
  // changes at all to spell these correctly.
  dorian: [0, 0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 0, 1, 3, 5, 6, 8, 10],
});

/**
 * VexFlow duration code → its length in QUARTER-NOTE beats.
 * Rests share the numeric length of their note (e.g. 'qr' === 'q' length).
 * @type {Readonly<Record<string, number>>}
 */
export const DURATION_QUARTERS = Object.freeze({
  w: 4, // whole
  hd: 3, // dotted half
  h: 2, // half
  qd: 1.5, // dotted quarter
  q: 1, // quarter
  '8d': 0.75, // dotted eighth
  8: 0.5, // eighth
  16: 0.25, // sixteenth
});

/* Letter <-> chromatic (pitch-class) mapping for the "natural" letters. */
const LETTER_PC = Object.freeze({ c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 });
const LETTERS = Object.freeze(['c', 'd', 'e', 'f', 'g', 'a', 'b']);

/**
 * Internal, per-`hallRhythmRef` rhythm vocabulary. Each entry is a set of
 * WHOLE-BEAT figures whose durations (in the level's beat unit) the generator may
 * draw from. Kept intentionally small + self-contained (the app-layer rhythm game
 * is the real source); ids MUST be real `core/curriculum.js` level ids.
 *
 * Simple quarter-beat chapters express one beat as either a 'q' or '8','8'. Later
 * chapters add finer subdivisions. Compound chapters express one dotted-quarter beat
 * as a 'qd' or three '8's, etc. Every figure sums to a whole number of beats.
 *
 * @type {Readonly<Record<string, string[][]>>} ref → list of per-beat figures (arrays of duration codes)
 */
export const RHYTHM_VOCAB = Object.freeze({
  // Simple, quarter beat.
  ch1: [['q'], ['8', '8'], ['h']], // quarter / two-eighths / half(2 beats)
  ch2: [['q'], ['8', '8'], ['h']],
  ch3: [['q'], ['8', '8'], ['h']],
  ch4: [['q'], ['8', '8'], ['h'], ['qd', '8']], // + dotted-quarter+eighth (2 beats)
  ch6: [['q'], ['8', '8'], ['16', '16', '16', '16']], // + sixteenths
  ch7: [['q'], ['8', '8'], ['8d', '16']], // + dotted eighth
  ch9: [['q'], ['8', '8'], ['h']],
  ch12: [['q'], ['8', '8'], ['h']],
  // Compound, dotted-quarter beat (one beat = 3 eighths = 1.5 quarters).
  ch5: [['qd'], ['8', '8', '8'], ['q', '8'], ['8', 'q']],
  ch8: [['qd'], ['8', '8', '8'], ['16', '16', '16', '16', '16', '16']],
  ch10: [['qd'], ['8', '8', '8'], ['q', '8']],
  ch11: [['qd'], ['8', '8', '8'], ['q', '8'], ['8', 'q']],
  // Simple, half-note beat (one beat = a half = 2 quarters).
  ch14: [['h'], ['q', 'q'], ['q', '8', '8'], ['8', '8', 'q']],
  // Compound, dotted-half beat (one beat = 3 quarters).
  ch15: [['hd'], ['q', 'q', 'q'], ['h', 'q'], ['q', 'h']],
});

/**
 * Fallback rhythm figure set for any `hallRhythmRef` not explicitly tabulated
 * above, chosen by the level's meter beat unit at generation time.
 * @type {Readonly<Record<string, string[][]>>}
 */
const DEFAULT_VOCAB_BY_BEAT = Object.freeze({
  quarter: [['q'], ['8', '8'], ['h']],
  'dotted-quarter': [['qd'], ['8', '8', '8'], ['q', '8']],
  half: [['h'], ['q', 'q']],
  'dotted-half': [['hd'], ['q', 'q', 'q']],
});

/* ============================================================================
 * SEEDED PRNG — deterministic, tiny, no dependencies (splitmix32).
 * ========================================================================== */

/**
 * Create a deterministic pseudo-random generator from a seed. Returns a function
 * that yields floats in [0,1). Same seed ⇒ same stream. If seed is undefined, a
 * fixed default is used (so "no seed" is still deterministic — the spec requires
 * reproducibility for tests; a caller wanting variety supplies its own seed).
 *
 * @param {number} [seed=0x9e3779b9] 32-bit seed
 * @returns {() => number} next() → float in [0,1)
 */
export function makeRng(seed = 0x9e3779b9) {
  // Coerce to a 32-bit unsigned integer state.
  let state = (Number.isFinite(seed) ? Math.floor(seed) : 0) >>> 0;
  return function next() {
    // splitmix32
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 0x100000000;
  };
}

/**
 * Pick a uniformly random element of a non-empty array using an rng.
 * @template T
 * @param {() => number} rng
 * @param {T[]} arr
 * @returns {T}
 */
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/* ============================================================================
 * METER + PITCH HELPERS (pure)
 * ========================================================================== */

/**
 * Parse a time signature string into its numeric parts and quarter-length per bar.
 *   '2/4' → { top:2, bottom:4, compound:false, beats:2, beatUnitQuarters:1, barQuarters:2 }
 *   '6/8' → { top:6, bottom:8, compound:true,  beats:2, beatUnitQuarters:1.5, barQuarters:3 }
 *
 * A meter is COMPOUND when the top is 6/9/12 (divisible by 3 and > 3); the beat is
 * the dotted value spanning three of the bottom-note units. Otherwise SIMPLE.
 *
 * @param {string} meter e.g. '2/4','3/4','4/4','6/8','9/8','2/2','6/4'
 * @returns {{top:number, bottom:number, compound:boolean, beats:number,
 *            beatUnitQuarters:number, barQuarters:number}}
 */
export function parseMeter(meter) {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(String(meter));
  if (!m) throw new RangeError('parseMeter: invalid meter ' + meter);
  const top = Number(m[1]);
  const bottom = Number(m[2]);
  if (!(top > 0) || !(bottom > 0)) throw new RangeError('parseMeter: non-positive meter ' + meter);
  // Quarters per one bottom-note unit: bottom=4 → 1 quarter, 8 → 0.5, 2 → 2, 16 → 0.25.
  const unitQuarters = 4 / bottom;
  const compound = top % 3 === 0 && top > 3;
  const beats = compound ? top / 3 : top;
  const beatUnitQuarters = compound ? unitQuarters * 3 : unitQuarters;
  const barQuarters = top * unitQuarters;
  return { top, bottom, compound, beats, beatUnitQuarters, barQuarters };
}

/**
 * Sum a list of notes' durations in quarter-note beats.
 * @param {{duration:string}[]} notes
 * @returns {number}
 */
export function totalQuarters(notes) {
  let sum = 0;
  for (const n of notes) {
    const q = DURATION_QUARTERS[n.duration];
    if (q === undefined) throw new RangeError('unknown duration code: ' + n.duration);
    sum += q;
  }
  return sum;
}

/**
 * Absolute semitone offset (may be negative or > 11) of a diatonic degree in an
 * octave `oct` above/below the tonic octave, including its `alter`.
 *   octave 0 = same octave as tonic; +1 = one octave up; -1 = one down.
 * @param {number} degree 1..7
 * @param {number} alter -1|0|+1
 * @param {number} oct octave offset (integer)
 * @param {string} mode
 * @returns {number} semitone offset above the tonic
 */
function degreeSemitoneOffset(degree, alter, oct, mode) {
  const table = SCALE_SEMITONES[mode];
  if (!table) throw new RangeError('unknown mode: ' + mode);
  return table[degree] + alter + 12 * oct;
}

/**
 * Convert an absolute MIDI number + a diatonic degree/mode/key into a VexFlow
 * 'letter/octave' pitch string whose LETTER matches the degree's diatonic letter
 * (so e.g. degree 3 in C is spelled 'e', not 'd#'). Accidentals are appended.
 *
 * We spell by letter (degree → letter) then reconcile the accidental against the
 * actual midi pitch-class, which yields correct sharps/flats/naturals for the
 * diatonic + single-alter cases this engine produces.
 *
 * @param {number} midi absolute midi number
 * @param {number} degree 1..7
 * @param {string} key tonic letter (+accidental), e.g. 'C','G','F','Bb'
 * @param {string} mode
 * @returns {string} VexFlow key format, e.g. 'e/4','f#/4','bb/3'
 */
function midiToPitch(midi, degree, key, mode) {
  const tonicLetter = key[0].toLowerCase();
  const tonicLetterIndex = LETTERS.indexOf(tonicLetter);
  if (tonicLetterIndex < 0) throw new RangeError('bad key letter: ' + key);
  // The degree's letter is (tonicLetter + (degree-1)) around the 7-letter wheel.
  const letterIndex = (tonicLetterIndex + (degree - 1)) % 7;
  const letter = LETTERS[letterIndex];

  const pc = ((midi % 12) + 12) % 12; // actual pitch class 0..11
  const naturalPc = LETTER_PC[letter];
  // Signed accidental in [-2,+2]: difference between actual pc and the natural letter pc,
  // wrapped to the nearest (so +11 reads as -1, a flat, not eleven sharps).
  let diff = pc - naturalPc;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;

  // MIDI octave: the note whose pitch class is `pc`. We derive the octave from the
  // midi number relative to the letter so the printed octave matches the sounding one.
  // Standard convention: MIDI 60 = C4. octave = floor(midi/12) - 1, adjusted so that
  // the letter's own natural is used as the octave anchor (handles b#/cb edge cases;
  // this engine never produces those, but the arithmetic stays correct).
  const octave = Math.floor((midi - diff) / 12) - 1;

  let accidental = '';
  if (diff === 1) accidental = '#';
  else if (diff === -1) accidental = 'b';
  else if (diff === 2) accidental = '##';
  else if (diff === -2) accidental = 'bb';

  return `${letter}${accidental}/${octave}`;
}

/**
 * MIDI number of the tonic given a key letter (+accidental) and a reference octave.
 * @param {string} key tonic letter (+accidental)
 * @param {number} octave e.g. 4 for the C4-based octave
 * @returns {number}
 */
export function tonicMidiFor(key, octave = 4) {
  const letter = key[0].toLowerCase();
  let pc = LETTER_PC[letter];
  if (pc === undefined) throw new RangeError('bad key letter: ' + key);
  const acc = key.slice(1);
  if (acc === '#' || acc === '♯') pc += 1;
  else if (acc === 'b' || acc === '♭') pc -= 1;
  // MIDI 60 = C4 → tonic midi = 12*(octave+1) + pc.
  return 12 * (octave + 1) + ((pc % 12) + 12) % 12;
}

/* ============================================================================
 * DEGREE MOTION MODEL
 * ========================================================================== */

/**
 * A degree "position": a scale degree (1..7) plus an octave offset (…, -1, 0, +1…)
 * so the same degree can recur across octaves. We walk these positions to keep
 * leap sizes measured in DIATONIC steps.
 * @typedef {{degree:number, oct:number}} DegPos
 */

/**
 * The diatonic "index" of a degree position on an infinite scale ladder:
 *   index = oct*7 + (degree-1). Degree distance between two positions is the
 *   absolute difference of their indices.
 * @param {DegPos} p
 * @returns {number}
 */
function degIndex(p) {
  return p.oct * 7 + (p.degree - 1);
}

/**
 * Build a DegPos from a diatonic ladder index (inverse of {@link degIndex}).
 * @param {number} idx
 * @returns {DegPos}
 */
function posFromIndex(idx) {
  const oct = Math.floor(idx / 7);
  const degree = (idx - oct * 7) + 1;
  return { degree, oct };
}

/**
 * MIDI of a degree position given tonic + mode.
 * @param {DegPos} p
 * @param {number} tonicMidi
 * @param {string} mode
 * @param {number} [alter=0]
 * @returns {number}
 */
function posMidi(p, tonicMidi, mode, alter = 0) {
  return tonicMidi + degreeSemitoneOffset(p.degree, alter, p.oct, mode);
}

/* ============================================================================
 * §2  GENERATOR — generateMelody(spec)
 * ========================================================================== */

/**
 * @typedef {Object} MelodicNote
 * @property {number} degree   1..7 diatonic scale degree.
 * @property {(-1|0|1)} alter  chromatic shift (0 = diatonic).
 * @property {string} pitch    absolute VexFlow 'letter/octave' pitch.
 * @property {number} midi     absolute MIDI number.
 * @property {string} duration VexFlow duration code (same vocab as the rhythm engine).
 */

/**
 * @typedef {Object} Melody
 * @property {MelodicNote[]} notes
 * @property {string} key        tonic letter (+accidental), e.g. 'C'
 * @property {string} mode       one of {@link MODES}
 * @property {string} meter      time signature, e.g. '2/4'
 * @property {number} tonicMidi  MIDI of the tonic
 * @property {string} hallRhythmRef rhythm level id the durations came from
 * @property {{bars:number, lengthNotes:number, seed:number}} meta
 */

/**
 * Generate a rhythm (array of duration codes) filling `lengthBars` whole bars of
 * `meter`, drawing per-beat figures from the vocabulary for `hallRhythmRef`.
 *
 * @param {() => number} rng
 * @param {ReturnType<typeof parseMeter>} pm
 * @param {string} hallRhythmRef
 * @param {number} lengthBars
 * @param {string} beatUnit one of quarter/dotted-quarter/half/dotted-half (for fallback vocab)
 * @returns {string[]} duration codes summing to lengthBars whole bars
 */
/**
 * M25: irregular meters and their beat GROUPINGS in quarter-note lengths.
 * 5/8 = 2+3 eighths → [1, 1.5] quarters; 7/8 = 2+2+3 → [1, 1, 1.5].
 * (Same groupings the app-layer beaming uses — the two MUST agree or the notation
 * shows one grouping while the generator composed another.)
 * @type {Readonly<Record<string, ReadonlyArray<number>>>}
 */
export const IRREGULAR_GROUPS = Object.freeze({
  '5/8': Object.freeze([1, 1.5]),
  '7/8': Object.freeze([1, 1, 1.5]),
});

/**
 * Figures that exactly fill ONE beat group of an irregular meter, by group length.
 * A 2-eighth group is a quarter or two eighths; a 3-eighth group is the compound-
 * style dotted-quarter / three-eighths / quarter+eighth family.
 * @type {Readonly<Record<string, string[][]>>}
 */
const IRREGULAR_GROUP_FIGURES = Object.freeze({
  1: [['q'], ['8', '8']],
  1.5: [['qd'], ['8', '8', '8'], ['q', '8'], ['8', 'q']],
});

function generateRhythm(rng, pm, hallRhythmRef, lengthBars, beatUnit, perBarQuarters = null) {
  // M25: irregular meters fill GROUP-BY-GROUP (2+3 / 2+2+3 eighths), never letting
  // a figure straddle a group boundary — the grouping IS the meter's identity, and
  // a note crossing it would notate as the wrong meter even if the math added up.
  const groups = IRREGULAR_GROUPS[`${pm.top}/${pm.bottom}`];
  if (groups) {
    const out = [];
    for (let bar = 0; bar < lengthBars; bar++) {
      for (const g of groups) {
        const fig = pick(rng, IRREGULAR_GROUP_FIGURES[g]);
        for (const d of fig) out.push(d);
      }
    }
    return out;
  }

  const vocab =
    RHYTHM_VOCAB[hallRhythmRef] ||
    DEFAULT_VOCAB_BY_BEAT[beatUnit] ||
    DEFAULT_VOCAB_BY_BEAT.quarter;
  const out = [];
  for (let bar = 0; bar < lengthBars; bar++) {
    // CHANGING METER (M25): when a per-bar meter list is supplied, each bar fills
    // to ITS OWN length. Constant beat class across the sequence is validated by
    // the caller (Hall Ch19/20: changing-simple or changing-compound; the beat is
    // steady, only the bar length changes).
    const barQuarters = perBarQuarters ? perBarQuarters[bar] : pm.barQuarters;
    let filled = 0;
    // Fill this bar beat-by-beat with figures that fit the remaining room.
    let guard = 0;
    while (filled < barQuarters - 1e-9) {
      const remaining = barQuarters - filled;
      // Candidate figures whose total length fits the remaining room in this bar.
      const candidates = vocab.filter((fig) => figureQuarters(fig) <= remaining + 1e-9);
      let fig;
      if (candidates.length === 0) {
        // No listed figure fits (e.g. a 2-beat half at the end of an odd bar);
        // fall back to filling one beat at a time with a single beat-unit note.
        fig = beatFillFigure(remaining, pm);
      } else {
        fig = pick(rng, candidates);
      }
      for (const d of fig) out.push(d);
      filled += figureQuarters(fig);
      if (++guard > 512) throw new Error('generateRhythm: failed to fill a bar (vocab gap)');
    }
  }
  return out;
}

/** Quarter length of a figure (array of duration codes). */
function figureQuarters(fig) {
  let s = 0;
  for (const d of fig) s += DURATION_QUARTERS[d];
  return s;
}

/**
 * Produce a single-figure filler for `remaining` quarters using the coarsest
 * exact duration code available (used only when no vocab figure fits the tail).
 * @param {number} remaining quarters left in the bar
 * @param {ReturnType<typeof parseMeter>} pm
 * @returns {string[]}
 */
function beatFillFigure(remaining, pm) {
  // Prefer the exact code for `remaining`; else subdivide into beat-unit notes.
  const exact = Object.keys(DURATION_QUARTERS).find(
    (code) => Math.abs(DURATION_QUARTERS[code] - remaining) < 1e-9,
  );
  if (exact) return [exact];
  // Subdivide into whole beat-unit notes; if the beat unit is itself the tail, emit one.
  const unit = pm.beatUnitQuarters;
  const codeForUnit = Object.keys(DURATION_QUARTERS).find(
    (code) => Math.abs(DURATION_QUARTERS[code] - unit) < 1e-9,
  );
  if (codeForUnit && remaining >= unit - 1e-9) return [codeForUnit];
  // Last resort: a quarter (always valid; caller guards bar totals).
  return ['q'];
}

/**
 * Choose the starting degree position for a melody.
 *   startOn 'tonic' (early rungs) → 1̂, 3̂, or 5̂ (stable tonic-triad tones), per RCM.
 *   startOn 'any' → any allowed degree.
 * @param {() => number} rng
 * @param {number[]} degrees allowed degrees
 * @param {string} startOn 'tonic'|'any'
 * @returns {DegPos}
 */
function chooseStart(rng, degrees, startOn) {
  if (startOn === 'tonic') {
    const stable = [1, 3, 5].filter((d) => degrees.includes(d));
    const choices = stable.length ? stable : degrees;
    return { degree: pick(rng, choices), oct: 0 };
  }
  return { degree: pick(rng, degrees), oct: 0 };
}

/**
 * Given the current degree position, choose the NEXT position honoring the allowed
 * `leaps` (measured as diatonic degree spans), staying inside `degrees` and `range`.
 *
 * @param {() => number} rng
 * @param {DegPos} cur
 * @param {Object} p
 * @param {number[]} p.degrees allowed degrees
 * @param {string[]} p.leaps allowed leap names
 * @param {{lowMidi:number, highMidi:number}} p.range
 * @param {number} p.tonicMidi
 * @param {string} p.mode
 * @returns {DegPos} the chosen next position (falls back to `cur` if truly stuck)
 */
function chooseNext(rng, cur, p) {
  const spans = p.leaps.map((l) => LEAP_DEGREE_SPAN[l]).filter((s) => s !== undefined);
  const candidates = [];
  for (const span of spans) {
    for (const dir of [1, -1]) {
      const idx = degIndex(cur) + dir * span;
      const np = posFromIndex(idx);
      if (!p.degrees.includes(np.degree)) continue;
      const midi = posMidi(np, p.tonicMidi, p.mode);
      if (midi < p.range.lowMidi || midi > p.range.highMidi) continue;
      candidates.push(np);
    }
  }
  if (candidates.length === 0) return cur; // stuck: repeat (still valid: 0-span isn't a leap)
  return pick(rng, candidates);
}

/* ============================================================================
 * HARMONY-FIRST PITCH WALK — replaces a uniform-random chooseNext with one that
 * prefers chord tones on strong beats, stepwise/contour-biased motion on weak
 * beats, resolves large leaps by stepping back the other way, and can be steered
 * toward a specific degree (used to force a real cadence). Candidate GENERATION
 * (which degrees/leaps/range are even legal) is unchanged from chooseNext above —
 * this only changes which of those already-legal candidates gets picked, so every
 * structural guarantee chooseNext already satisfied still holds.
 * ========================================================================== */

/**
 * Per-note position metadata (which bar, and whether it lands on a beat boundary)
 * derived purely from the duration sequence + meter — used to decide chord-tone bias
 * (strong beats) and which bar's harmony is in effect.
 * @param {string[]} durations
 * @param {ReturnType<typeof parseMeter>} pm
 * @returns {{bar:number, isStrong:boolean, startCum:number}[]}
 */
function computeNotePositions(durations, pm, perBarQuarters = null) {
  // Irregular meters (M25): strong positions are the GROUP starts (2+3 / 2+2+3),
  // not every beat-unit multiple — a 5/8 bar's strong points are eighths 1 and 3.
  const groups = IRREGULAR_GROUPS[`${pm.top}/${pm.bottom}`];
  const groupStarts = groups
    ? groups.reduce((acc, g) => { acc.push(acc[acc.length - 1] + g); return acc; }, [0]).slice(0, -1)
    : null;
  // Changing meter: cumulative bar-start offsets from the per-bar lengths.
  const barStarts = perBarQuarters
    ? perBarQuarters.reduce((acc, q) => { acc.push(acc[acc.length - 1] + q); return acc; }, [0])
    : null;
  let cum = 0;
  return durations.map((d) => {
    const q = DURATION_QUARTERS[d];
    let bar, offsetInBar;
    if (barStarts) {
      bar = 0;
      while (bar + 1 < barStarts.length - 0 && cum + 1e-9 >= barStarts[bar + 1]) bar++;
      offsetInBar = cum - barStarts[bar];
    } else {
      bar = Math.floor((cum + 1e-9) / pm.barQuarters);
      offsetInBar = cum - bar * pm.barQuarters;
    }
    const isStrong = groupStarts
      ? groupStarts.some((s) => Math.abs(offsetInBar - s) < 1e-6)
      : (offsetInBar % pm.beatUnitQuarters) < 1e-6;
    const pos = { bar, isStrong, startCum: cum };
    cum += q;
    return pos;
  });
}

/**
 * One functional-harmony chord (as scale-degree numbers, e.g. I=[1,3,5]) per bar:
 * bar 0 opens on the tonic, the final bar approaches on the dominant (so the melody's
 * last note can resolve TO the tonic), interior bars cycle IV/ii/vi for gentle motion.
 * Each chord is intersected with the level's allowed `degrees` — a level that doesn't
 * teach degree 5 yet (e.g. M3's 1-2-3) still gets a coherent, just smaller, chord.
 * @param {number} numBars
 * @param {number[]} degrees allowed degrees
 * @returns {number[][]} chord degrees per bar
 */
function makeHarmonicPlan(numBars, degrees) {
  const wrap = (n) => ((n - 1) % 7) + 1;
  const triadOf = (root) => [wrap(root), wrap(root + 2), wrap(root + 4)];
  const plan = [];
  for (let b = 0; b < numBars; b++) {
    let root;
    if (b === 0) root = 1;
    else if (b === numBars - 1) root = 5;
    else root = [4, 2, 6][b % 3];
    const chord = triadOf(root).filter((d) => degrees.includes(d));
    plan.push(chord.length ? chord : degrees.slice());
  }
  return plan;
}

/**
 * Harmony-aware next-position choice. Same HARD constraints as {@link chooseNext}
 * (degree/leap/range validity + a tritone ban on the adjacent interval); among the
 * resulting legal candidates, prefers — in order of influence — an exact `preferDegree`
 * match (the cadence), then chord tones on strong beats, then stepwise motion, then the
 * requested contour direction, then stepping back after a big leap.
 *
 * @param {() => number} rng
 * @param {DegPos} cur
 * @param {Object} p same shape as {@link chooseNext}'s `p`
 * @param {Object} opts
 * @param {number[]} [opts.chordDegs] this bar's chord tones (scale degrees)
 * @param {boolean} [opts.isStrong] is the note being chosen on a strong beat
 * @param {number} [opts.contourBias] +1 prefer rising, -1 prefer falling, 0 neutral
 * @param {number} [opts.prevSpan] diatonic span of the move that led to `cur`
 * @param {number} [opts.prevDir] direction (+1/-1) of the move that led to `cur`
 * @param {number|null} [opts.preferDegree] force this exact degree if reachable (cadence)
 * @returns {DegPos}
 */
function chooseNextHarmonic(rng, cur, p, opts) {
  const spans = p.leaps.map((l) => LEAP_DEGREE_SPAN[l]).filter((s) => s !== undefined);
  const curMidi = posMidi(cur, p.tonicMidi, p.mode);
  let candidates = [];
  for (const span of spans) {
    for (const dir of [1, -1]) {
      const idx = degIndex(cur) + dir * span;
      const np = posFromIndex(idx);
      if (!p.degrees.includes(np.degree)) continue;
      const midi = posMidi(np, p.tonicMidi, p.mode);
      if (midi < p.range.lowMidi || midi > p.range.highMidi) continue;
      candidates.push({ pos: np, span, dir, midi });
    }
  }
  if (candidates.length === 0) return cur;

  // CADENCE FUNNEL: with `remainingMoves` moves left after this one, the walk must
  // stay within remainingMoves*maxSpan diatonic steps of SOME in-range end-degree
  // position, or the forced final cadence becomes unreachable (the failure mode the
  // old preference-only steering hit ~4% of the time). Filter, with a safe fallback
  // if the funnel would empty the pool (possible only if the walk was already
  // outside its own funnel — never true by induction from a legal start).
  if (opts.funnel && opts.funnel.targetIdxs.length) {
    const { targetIdxs, remainingMoves, maxSpan } = opts.funnel;
    const inFunnel = candidates.filter((c) => {
      const idx = degIndex(c.pos);
      return targetIdxs.some((t) => Math.abs(idx - t) <= remainingMoves * maxSpan);
    });
    if (inFunnel.length) candidates = inFunnel;
  }

  // Hard tritone ban on the adjacent interval (a real style rule, not just preference) —
  // relax it only if it would eliminate every legal candidate.
  const tritoneSafe = candidates.filter((c) => Math.abs(c.midi - curMidi) !== 6);
  if (tritoneSafe.length) candidates = tritoneSafe;

  // General candidate filter (two-voice counterpoint injects its rules here:
  // no crossing, no parallel perfects, strong-beat consonance). Soft: if the
  // filter would empty the pool, keep the unfiltered candidates — a weaker
  // counterpoint moment beats a stuck walk (and the tests sweep for violations).
  if (opts.filter) {
    const kept = candidates.filter((c) => opts.filter(c));
    if (kept.length) candidates = kept;
  }

  // A no-zero-span walk can NEVER return to the same degree except via a full-octave
  // leap — so if `avoidDegree` (the tonic, when steering the penultimate note toward a
  // leading tone) is left reachable and happens to win, the FOLLOWING note's forced
  // cadence back to that same degree becomes structurally impossible. Excluding it here
  // (with a safe fallback if that empties the pool) is what actually guarantees the
  // final tonic stays reachable one step later.
  if (opts.avoidDegree != null) {
    const withoutAvoid = candidates.filter((c) => c.pos.degree !== opts.avoidDegree);
    if (withoutAvoid.length) candidates = withoutAvoid;
  }

  if (opts.preferDegree != null) {
    const exact = candidates.filter((c) => c.pos.degree === opts.preferDegree);
    if (exact.length) return pick(rng, exact.map((c) => c.pos));
  }

  const chordDegs = opts.chordDegs || [];
  const scored = candidates.map((c) => {
    let s = 1;
    if (opts.isStrong && chordDegs.includes(c.pos.degree)) s *= 3;
    if (c.span === 1) s *= 2.2;
    else if (c.span === 2) s *= 1.3;
    else if (c.span >= 4) s *= 0.4;
    if (opts.contourBias > 0 && c.dir > 0) s *= 1.6;
    if (opts.contourBias < 0 && c.dir < 0) s *= 1.6;
    if (opts.prevSpan >= 3 && c.span === 1 && c.dir === -opts.prevDir) s *= 2.2; // leap resolution
    return { c, s };
  });
  const total = scored.reduce((a, x) => a + x.s, 0);
  let r = rng() * total;
  for (const x of scored) { r -= x.s; if (r <= 0) return x.c.pos; }
  return scored[scored.length - 1].c.pos;
}

/**
 * Build one MelodicNote from a degree position + duration.
 * @param {DegPos} pos
 * @param {string} duration
 * @param {Object} ctx { key, mode, tonicMidi }
 * @returns {MelodicNote}
 */
function makeNote(pos, duration, ctx) {
  const alter = 0;
  const midi = posMidi(pos, ctx.tonicMidi, ctx.mode, alter);
  const pitch = midiToPitch(midi, pos.degree, ctx.key, ctx.mode);
  return { degree: pos.degree, alter, pitch, midi, duration };
}

/**
 * Re-alter an existing note in place (new object) — shifts `midi` by exactly the
 * change in `alter` (alter is a straight semitone offset, independent of degree/
 * oct/mode) and re-spells `pitch` from the new midi. This is the one primitive
 * every M19-M21 color-tone insertion below needs: "take this already-placed
 * diatonic note and chromatically raise/lower it."
 * @param {MelodicNote} note
 * @param {(-1|0|1)} alter
 * @param {{key:string, mode:string}} ctx
 * @returns {MelodicNote}
 */
function reAlter(note, alter, ctx) {
  const midi = note.midi + (alter - (note.alter || 0));
  const pitch = midiToPitch(midi, note.degree, ctx.key, ctx.mode);
  return { ...note, alter, pitch, midi };
}

/**
 * M19 — insert ONE chromatic passing tone into an otherwise-diatonic note sequence.
 * Finds an adjacent pair a diatonic whole step apart (2 semitones) where at least
 * one side is a quarter note (splittable into two eighths), not the first note
 * (protects `startOn`) and not within the last 2 notes (protects the cadence).
 * The passing tone is always spelled as the EARLIER note of the pair, altered one
 * semitone toward the later note — the textbook resolved-passing-tone spelling
 * convention (ascending: raised lower neighbor; descending: lowered upper neighbor).
 * No-op (returns `notes` unchanged) if no eligible pair exists for this melody.
 * @param {MelodicNote[]} notes
 * @param {() => number} rng
 * @param {{key:string, mode:string}} ctx
 * @returns {MelodicNote[]}
 */
function insertChromaticPassingTone(notes, rng, ctx) {
  const candidates = [];
  for (let i = 1; i < notes.length - 2; i++) {
    const cur = notes[i];
    const nxt = notes[i + 1];
    const diff = nxt.midi - cur.midi;
    if (Math.abs(diff) !== 2) continue;
    const dir = Math.sign(diff);
    if (cur.duration === 'q') candidates.push({ splitIdx: i, anchor: cur, dir, before: false });
    if (nxt.duration === 'q') candidates.push({ splitIdx: i + 1, anchor: cur, dir, before: true });
  }
  if (!candidates.length) return notes;
  const chosen = candidates[Math.floor(rng() * candidates.length)];
  const passing = {
    degree: chosen.anchor.degree,
    alter: (chosen.anchor.alter || 0) + chosen.dir,
    duration: '8',
  };
  passing.midi = chosen.anchor.midi + chosen.dir;
  passing.pitch = midiToPitch(passing.midi, passing.degree, ctx.key, ctx.mode);
  const out = notes.slice();
  const splitNote = { ...out[chosen.splitIdx], duration: '8' };
  out.splice(chosen.splitIdx, 1, ...(chosen.before ? [passing, splitNote] : [splitNote, passing]));
  return out;
}

/**
 * M20 — modal mixture: borrow the ♭6̂ from the parallel minor wherever a major-mode
 * melody already has a diatonic 6̂→5̂ descent (the classic mixture gesture). Alters
 * an existing note in place (no rhythm change, no note added). No-op if the melody
 * has no 6̂→5̂ pair. Major mode only (mixture is meaningless without a major 6̂ to lower).
 * @param {MelodicNote[]} notes
 * @param {() => number} rng
 * @param {{key:string, mode:string}} ctx
 * @returns {MelodicNote[]}
 */
function insertModalMixture(notes, rng, ctx) {
  if (ctx.mode !== 'major') return notes;
  const candidates = [];
  for (let i = 1; i < notes.length - 2; i++) {
    const cur = notes[i];
    const nxt = notes[i + 1];
    if (cur.degree === 6 && (cur.alter || 0) === 0 && nxt.degree === 5) candidates.push(i);
  }
  if (!candidates.length) return notes;
  const idx = candidates[Math.floor(rng() * candidates.length)];
  const out = notes.slice();
  out[idx] = reAlter(out[idx], -1, ctx);
  return out;
}

/**
 * M21 — secondary dominant color: raise scale-degree 4̂ wherever it already ascends
 * to 5̂, creating a temporary leading tone (the melodic signature of V/V) that
 * resolves up by a half step. Works in major or minor (degree 4 is an unaltered
 * perfect 4th in both). Alters an existing note in place. No-op if no 4̂→5̂ pair exists.
 * @param {MelodicNote[]} notes
 * @param {() => number} rng
 * @param {{key:string, mode:string}} ctx
 * @returns {MelodicNote[]}
 */
function insertSecondaryDominant(notes, rng, ctx) {
  const candidates = [];
  for (let i = 1; i < notes.length - 2; i++) {
    const cur = notes[i];
    const nxt = notes[i + 1];
    if (cur.degree === 4 && (cur.alter || 0) === 0 && nxt.degree === 5) candidates.push(i);
  }
  if (!candidates.length) return notes;
  const idx = candidates[Math.floor(rng() * candidates.length)];
  const out = notes.slice();
  out[idx] = reAlter(out[idx], 1, ctx);
  return out;
}

/**
 * §2 — Generate a valid {@link Melody} from a spec. Deterministic under `spec.seed`.
 *
 * Guarantees (asserted by the self-test):
 *   - every degree ∈ spec.degrees (unless chromatic, which this v1 leaves diatonic);
 *   - every adjacent leap ∈ spec.leaps (measured as a diatonic degree span);
 *   - every midi ∈ [range.lowMidi, range.highMidi];
 *   - durations sum to EXACTLY `lengthBars` whole bars of `meter`;
 *   - degree/alter/key/mode ⇒ pitch & midi are mutually consistent;
 *   - startOn:'tonic' ⇒ first note is 1̂/3̂/5̂;
 *   - honors a fixed `spec.rhythm` verbatim when supplied.
 *
 * @param {Object} spec see MELODIC_ENGINE_SPEC §2
 * @returns {Melody}
 */
export function generateMelody(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('generateMelody: spec required');
  const {
    key = 'C',
    mode = 'major',
    degrees = [1, 2, 3, 4, 5],
    leaps = ['step'],
    range,
    meter = '2/4',
    hallRhythmRef = 'ch1',
    rhythm,
    lengthBars = 2,
    startOn = 'tonic',
    seed = 12345,
  } = spec;

  if (!MODES.includes(mode)) throw new RangeError('generateMelody: unknown mode ' + mode);
  if (!Array.isArray(degrees) || degrees.length === 0) {
    throw new RangeError('generateMelody: degrees must be a non-empty array');
  }
  for (const d of degrees) {
    if (!(Number.isInteger(d) && d >= 1 && d <= 7)) {
      throw new RangeError('generateMelody: degree out of 1..7: ' + d);
    }
  }
  for (const l of leaps) {
    if (LEAP_DEGREE_SPAN[l] === undefined) throw new RangeError('generateMelody: unknown leap ' + l);
  }

  // CHANGING METER (M25, Hall Ch19/20): `spec.meterSequence` = one meter string per
  // bar; the time signature changes mid-piece while the BEAT stays constant. v1
  // supports changing-SIMPLE (all x/4) and changing-COMPOUND (all compound x/8) —
  // mixing the two requires a metric-equivalence marking (Hall Ch21/22) and is a
  // deliberate future step, rejected here rather than mis-notated.
  const meterSequence = Array.isArray(spec.meterSequence) && spec.meterSequence.length
    ? spec.meterSequence.map(String)
    : null;
  const effMeter = meterSequence ? meterSequence[0] : meter;
  const effLengthBars = meterSequence ? meterSequence.length : lengthBars;
  const pm = parseMeter(effMeter);
  let perBarQuarters = null;
  if (meterSequence) {
    const pms = meterSequence.map(parseMeter);
    const firstCompound = pms[0].compound, firstBottom = pms[0].bottom;
    const mixed = pms.some((p2) => p2.compound !== firstCompound || p2.bottom !== firstBottom);
    if (mixed && spec.equivalence !== 'division' && spec.equivalence !== 'beat') {
      // Hall Ch21/22: changing BETWEEN simple and compound is ambiguous without a
      // metric-equivalence declaration — the notation must carry the marking, so
      // the spec must carry the choice. Hall's own default rule is division-
      // constant, but the CALLER must say so explicitly (no silent guessing).
      throw new RangeError('generateMelody: mixed simple/compound meterSequence requires spec.equivalence ("division" for eighth-constant per Hall\'s default, or "beat")');
    }
    // Bar lengths in NOTATED quarters are meter-arithmetic and identical under
    // either equivalence — equivalence changes TEMPO mapping (playback), not the
    // page. Playback scaling is applied by the audio layer via meta.equivalence.
    perBarQuarters = pms.map((p2) => p2.barQuarters);
  }
  const tonicMidi = tonicMidiFor(key, spec.tonicOctave ?? 4);

  // Range: default to a comfortable octave-and-a-bit around the tonic if unspecified.
  const rng = makeRng(seed);
  const effectiveRange = range && Number.isFinite(range.lowMidi) && Number.isFinite(range.highMidi)
    ? { lowMidi: range.lowMidi, highMidi: range.highMidi }
    : { lowMidi: tonicMidi - 2, highMidi: tonicMidi + 14 };
  if (effectiveRange.highMidi < effectiveRange.lowMidi) {
    throw new RangeError('generateMelody: range.highMidi < range.lowMidi');
  }

  // Beat unit label for fallback rhythm vocab.
  const beatUnit = pm.compound
    ? (pm.beatUnitQuarters === 3 ? 'dotted-half' : 'dotted-quarter')
    : (pm.beatUnitQuarters === 2 ? 'half' : 'quarter');

  // 1. Rhythm: use the fixed one verbatim if given, else generate to fill whole bars.
  let durations;
  if (Array.isArray(rhythm) && rhythm.length) {
    durations = rhythm.map((r) => (typeof r === 'string' ? r : r.duration));
    for (const d of durations) {
      if (DURATION_QUARTERS[d] === undefined) {
        throw new RangeError('generateMelody: fixed rhythm has unknown duration ' + d);
      }
    }
  } else {
    durations = generateRhythm(rng, pm, hallRhythmRef, effLengthBars, beatUnit, perBarQuarters);
  }

  // 2. Pitch walk over the rhythm, one degree per note.
  const noteCtx = { key, mode, tonicMidi };
  const stepParams = {
    degrees,
    leaps,
    range: effectiveRange,
    tonicMidi,
    mode,
  };
  let cur = chooseStart(rng, degrees, startOn);
  // Anchor foundational rungs on the EXACT tonic (not just any of 1̂/3̂/5̂) when it's
  // reachable — establishes the key before anything else happens, rather than leaving
  // the opener to a uniform-random pick among the stable triad tones.
  if (startOn === 'tonic' && degrees.includes(1)) cur = { degree: 1, oct: 0 };
  // Guarantee the start position is actually IN RANGE: snap to whichever octave of
  // the start degree lies inside the range, nearest the range center. (The old
  // "snap" reset oct to 0 — a no-op, since 0 was already the default — so a key
  // whose octave-4 tonic sits outside a level's range, e.g. G major against an
  // m4-style 55..64 window, started OUT of range, every walk candidate got
  // range-rejected, and the whole melody degenerated to one repeated note.)
  if (posMidi(cur, tonicMidi, mode) < effectiveRange.lowMidi ||
      posMidi(cur, tonicMidi, mode) > effectiveRange.highMidi) {
    const center = (effectiveRange.lowMidi + effectiveRange.highMidi) / 2;
    let best = null;
    for (let oct = -3; oct <= 3; oct++) {
      const midi = posMidi({ degree: cur.degree, oct }, tonicMidi, mode);
      if (midi < effectiveRange.lowMidi || midi > effectiveRange.highMidi) continue;
      if (!best || Math.abs(midi - center) < Math.abs(best.midi - center)) best = { oct, midi };
    }
    if (best) cur = { degree: cur.degree, oct: best.oct };
  }

  // Harmony-first pitch walk: a chord per bar (tonic opens, dominant approaches the
  // final cadence) with strong-beat chord-tone bias, stepwise/contour-biased weak
  // beats, and the melody's very last note steered to land on the tonic (with the
  // note before it steered toward a leading-tone-ish degree) — a real cadence, not
  // just "stop wherever the random walk happens to be."
  const positions = computeNotePositions(durations, pm, perBarQuarters);
  const numBars = positions.length ? positions[positions.length - 1].bar + 1 : 1;
  const harmonicPlan = makeHarmonicPlan(numBars, degrees);
  const lastStartCum = positions.length ? positions[positions.length - 1].startCum : 0;

  // The degree the melody is steered to END on. Default 1 (a full authentic-feeling
  // close). `spec.endOn: 5` yields a HALF-CADENCE ending — the antecedent half of a
  // period (and the original-key half of a modulation, M19) ends this way.
  const endDegree = Number.isInteger(spec.endOn) && degrees.includes(spec.endOn) ? spec.endOn : 1;
  // Every in-range ladder index where the end degree lives — the cadence-funnel
  // targets (see chooseNextHarmonic's funnel option).
  const endTargetIdxs = [];
  if (degrees.includes(endDegree)) {
    for (let oct = -3; oct <= 3; oct++) {
      const p = { degree: endDegree, oct };
      const m = posMidi(p, tonicMidi, mode);
      if (m >= effectiveRange.lowMidi && m <= effectiveRange.highMidi) endTargetIdxs.push(degIndex(p));
    }
  }
  const maxAllowedSpan = Math.max(...leaps.map((l) => LEAP_DEGREE_SPAN[l] || 1), 1);

  const notes = [];
  let prevSpan = 0;
  let prevDir = 1;
  for (let i = 0; i < durations.length; i++) {
    notes.push(makeNote(cur, durations[i], noteCtx));
    if (i < durations.length - 1) {
      const targetIdx = i + 1;
      const pos = positions[targetIdx];
      const isFinal = targetIdx === durations.length - 1;
      const isPenultimate = targetIdx === durations.length - 2 && durations.length >= 3;
      // Steer the PENULTIMATE note to a step-neighbor of the end degree so the final
      // forced move is guaranteed reachable (leaps of 1 span always exist). For the
      // tonic this is the classic leading-tone (7̂) / supertonic (2̂) approach; the
      // same wheel arithmetic generalizes it to any end degree (endOn 5 → 4̂ or 6̂).
      const below = ((endDegree - 2 + 7) % 7) + 1;
      const above = (endDegree % 7) + 1;
      const preferDegree = isFinal && degrees.includes(endDegree) ? endDegree
        : isPenultimate && (degrees.includes(below) || degrees.includes(above))
          ? (degrees.includes(below) ? below : above)
          : null;
      // Also true one note EARLIER than isFinal: the note right before the final one
      // must not itself land on the end degree (see chooseNextHarmonic's avoidDegree
      // doc) or the forced final cadence becomes unreachable.
      const isBeforeFinal = targetIdx === durations.length - 2;
      const avoidDegree = isBeforeFinal && degrees.includes(endDegree) ? endDegree : null;
      const contourBias = lastStartCum > 0 ? (pos.startCum < lastStartCum / 2 ? 1 : -1) : 0;
      const next = chooseNextHarmonic(rng, cur, stepParams, {
        chordDegs: harmonicPlan[pos.bar],
        isStrong: pos.isStrong,
        contourBias,
        prevSpan,
        prevDir,
        preferDegree,
        avoidDegree,
        // remaining moves AFTER the note being chosen now.
        funnel: { targetIdxs: endTargetIdxs, remainingMoves: durations.length - 1 - targetIdx, maxSpan: maxAllowedSpan },
      });
      prevSpan = Math.abs(degIndex(next) - degIndex(cur));
      prevDir = Math.sign(degIndex(next) - degIndex(cur)) || prevDir;
      cur = next;
    }
  }

  // M19-M21: optional post-processing color tones, applied in this fixed order so
  // composition is well-defined when a level enables more than one (M26 proves this
  // matters — see colorMaxNote below). Each is a no-op if the melody happens not to
  // offer an eligible spot; a level that enables one of these should be tested across
  // multiple seeds, not assumed to fire on every single generated melody.
  const colorCtx = { key, mode };
  let coloredNotes = notes;
  if (spec.chromaticPassingTone) coloredNotes = insertChromaticPassingTone(coloredNotes, rng, colorCtx);
  if (spec.modalMixture) coloredNotes = insertModalMixture(coloredNotes, rng, colorCtx);
  if (spec.secondaryDominant) coloredNotes = insertSecondaryDominant(coloredNotes, rng, colorCtx);

  const bars = meterSequence
    ? meterSequence.length
    : Math.round(totalQuarters(coloredNotes) / pm.barQuarters);

  return Object.freeze({
    notes: Object.freeze(coloredNotes.map((n) => Object.freeze(n))),
    key,
    mode,
    meter: effMeter,
    meterSequence: meterSequence ? Object.freeze(meterSequence.slice()) : undefined,
    equivalence: meterSequence && (spec.equivalence === 'division' || spec.equivalence === 'beat')
      ? spec.equivalence : undefined,
    tonicMidi,
    hallRhythmRef,
    meta: Object.freeze({ bars, lengthNotes: coloredNotes.length, seed }),
  });
}

/* ============================================================================
 * §3  LABELING — labelNote(note, ctx) + labelPalette(ctx)
 * ========================================================================== */

/** Caret-combining glyph appended to a degree number, e.g. '1' + CARET = '1̂'. */
const CARET = '̂';

/** Moveable-do MAJOR syllables by degree (1..7). do = tonic. */
const MAJOR_SOLFEGE = ['', 'do', 're', 'mi', 'fa', 'sol', 'la', 'ti'];
/** Moveable-do MINOR, LA-BASED (relative): la ti do re mi fa sol from 1̂..7̂. */
const MINOR_SOLFEGE_LA = ['', 'la', 'ti', 'do', 're', 'mi', 'fa', 'sol'];
/** Moveable-do MINOR, DO-BASED (parallel): do re me fa sol le te from 1̂..7̂. */
const MINOR_SOLFEGE_DO = ['', 'do', 're', 'me', 'fa', 'sol', 'le', 'te'];

/** Fixed-do: syllable per natural letter (do=C always). */
const FIXED_DO_BY_LETTER = Object.freeze({
  c: 'do', d: 're', e: 'mi', f: 'fa', g: 'sol', a: 'la', b: 'ti',
});

/**
 * Chromatic raise/lower syllable forms for moveable-do (Curwen-style):
 *   raised: di ri fi si li   lowered: ra me se le te (partial; covers ±1 alters).
 * We only need single-alter forms this engine produces.
 */
const MOVEABLE_RAISED = ['', 'di', 'ri', 'fi', 'fi', 'si', 'li', 'li'];
const MOVEABLE_LOWERED = ['', 'ra', 'ra', 'me', 'fe', 'se', 'le', 'te'];

/**
 * Is a mode any minor form?
 * @param {string} mode
 * @returns {boolean}
 */
function isMinor(mode) {
  return mode === 'natural-minor' || mode === 'harmonic-minor' || mode === 'melodic-minor';
}

/**
 * §3 — Label a single note under a labeling context. Pure function of (note, ctx).
 *
 * @param {MelodicNote} note
 * @param {Object} ctx
 * @param {string} ctx.key
 * @param {string} ctx.mode
 * @param {('numbers'|'fixed-do'|'moveable-do')} [ctx.system='numbers']
 * @param {('la'|'do')} [ctx.minorSolfege='la'] moveable-do minor sub-fork
 * @returns {string} the rendered label, e.g. '1̂', '♯4̂', 'do', 're'
 */
export function labelNote(note, ctx) {
  const system = (ctx && ctx.system) || 'numbers';
  if (!LABEL_SYSTEMS.includes(system)) throw new RangeError('labelNote: unknown system ' + system);
  const degree = note.degree;
  const alter = note.alter || 0;

  if (system === 'numbers') {
    // Scale-degree number with a caret; accidental prefix for altered tones.
    const acc = alter === 1 ? '♯' : alter === -1 ? '♭' : '';
    return acc + String(degree) + CARET;
  }

  if (system === 'fixed-do') {
    // Fixed-do depends on the ABSOLUTE pitch letter (do=C always), not the degree.
    const letter = note.pitch[0].toLowerCase();
    const syl = FIXED_DO_BY_LETTER[letter];
    if (!syl) throw new RangeError('labelNote(fixed-do): bad pitch letter ' + note.pitch);
    // Basic fixed-do keeps the syllable regardless of accidental (per spec §3);
    // richer chromatic-fixed-do is deferred.
    return syl;
  }

  // moveable-do
  const minor = isMinor(ctx.mode);
  let base;
  if (minor) {
    base = ((ctx && ctx.minorSolfege) || 'la') === 'do' ? MINOR_SOLFEGE_DO : MINOR_SOLFEGE_LA;
  } else {
    base = MAJOR_SOLFEGE;
  }
  if (alter === 0) return base[degree];
  // Altered tone → Curwen chromatic syllable (major-frame table; adequate for the
  // single-alter tones this engine produces).
  return alter === 1 ? MOVEABLE_RAISED[degree] : MOVEABLE_LOWERED[degree];
}

/**
 * §3 — The ordered palette of labels a labeling UI shows for a context (the buttons
 * the student picks from). Covers degrees 1..7 in the selected system.
 *
 * For 'fixed-do' the palette is the seven fixed syllables for the DIATONIC letters
 * of the key (do..ti starting at do=C), since fixed-do labels absolute letters.
 *
 * @param {Object} ctx { key, mode, system, minorSolfege }
 * @returns {string[]} palette in ascending degree/letter order
 */
export function labelPalette(ctx) {
  const system = (ctx && ctx.system) || 'numbers';
  if (!LABEL_SYSTEMS.includes(system)) throw new RangeError('labelPalette: unknown system ' + system);

  if (system === 'numbers') {
    return [1, 2, 3, 4, 5, 6, 7].map((d) => String(d) + CARET);
  }

  if (system === 'fixed-do') {
    // Seven fixed syllables for the diatonic letters of the key, in pitch order
    // starting from the tonic letter (so the palette follows the scale the student hears).
    const tonicLetter = ctx.key[0].toLowerCase();
    const start = LETTERS.indexOf(tonicLetter);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const letter = LETTERS[(start + i) % 7];
      out.push(FIXED_DO_BY_LETTER[letter]);
    }
    return out;
  }

  // moveable-do
  const minor = isMinor(ctx.mode);
  const base = minor
    ? (((ctx && ctx.minorSolfege) || 'la') === 'do' ? MINOR_SOLFEGE_DO : MINOR_SOLFEGE_LA)
    : MAJOR_SOLFEGE;
  return [1, 2, 3, 4, 5, 6, 7].map((d) => base[d]);
}

/* ============================================================================
 * §4  DISTRACTORS — distractors(correct, opts)
 * ========================================================================== */

/**
 * A stable structural signature of a melody, for uniqueness comparison. Two melodies
 * are "the same" iff they have identical (degree, alter, duration) sequences (pitch &
 * midi are derived from those + key/mode, so they don't add distinctions).
 * @param {Melody} m
 * @returns {string}
 */
function melodySignature(m) {
  return m.notes.map((n) => `${n.degree}.${n.alter}.${n.duration}`).join('|');
}

/**
 * Rebuild the derived fields (pitch, midi) of a note after its degree changed, so a
 * perturbed melody stays internally consistent.
 * @param {MelodicNote} note
 * @param {number} newDegree
 * @param {Object} ctx { key, mode, tonicMidi }
 * @param {number} [oct=0] octave offset for the new degree
 * @returns {MelodicNote}
 */
function reDegree(note, newDegree, ctx) {
  // Place the new degree in the octave CLOSEST to the original note's register, so a distractor edit
  // stays a small step/skip and never becomes an accidental OCTAVE jump. (Forcing oct 0 made edits on
  // notes below the tonic's octave leap a full octave — that was the "absurdly obvious big jump" in the
  // recognition foils.) The adjacent-degree ops always want the nearest octave anyway.
  let useOct = 0, best = Infinity, midi = posMidi({ degree: newDegree, oct: 0 }, ctx.tonicMidi, ctx.mode, 0);
  for (let o = -2; o <= 2; o++) {
    const m = posMidi({ degree: newDegree, oct: o }, ctx.tonicMidi, ctx.mode, 0);
    if (Math.abs(m - note.midi) < best) { best = Math.abs(m - note.midi); useOct = o; midi = m; }
  }
  void useOct;
  const pitch = midiToPitch(midi, newDegree, ctx.key, ctx.mode);
  return { degree: newDegree, alter: 0, pitch, midi, duration: note.duration };
}

/**
 * Count how many note-positions differ (by degree|alter|duration) between two
 * equal-length melodies — a simple edit distance for the guarantee tests.
 * @param {Melody} a
 * @param {Melody} b
 * @returns {number}
 */
export function editDistance(a, b) {
  const n = Math.min(a.notes.length, b.notes.length);
  let d = Math.abs(a.notes.length - b.notes.length);
  for (let i = 0; i < n; i++) {
    const x = a.notes[i];
    const y = b.notes[i];
    if (x.degree !== y.degree || (x.alter || 0) !== (y.alter || 0) || x.duration !== y.duration) d++;
  }
  return d;
}

/**
 * The set of edit operations that produce ONE musically-plausible near-miss each.
 * Each returns a new notes[] array (or null if the edit can't apply here). All stay
 * diatonic, same length, same meter.
 */
const EDIT_OPS = {
  /** Shift ONE note up or down by a diatonic step (staying in the melody's degree set is
   *  not enforced here — a step neighbor is inherently plausible). */
  shiftStep(notes, ctx, rng, allowedDegrees) {
    const i = Math.floor(rng() * notes.length);
    const dir = rng() < 0.5 ? 1 : -1;
    const src = { degree: notes[i].degree, oct: 0 };
    const np = posFromIndex(degIndex(src) + dir);
    if (np.degree < 1 || np.degree > 7) return null;
    if (allowedDegrees && !allowedDegrees.includes(np.degree)) return null;
    const out = notes.slice();
    out[i] = reDegree(notes[i], np.degree, ctx, np.oct);
    return out;
  },

  /** Swap two ADJACENT notes' degrees (flip the local contour). */
  swapAdjacent(notes, ctx, rng) {
    if (notes.length < 2) return null;
    const i = Math.floor(rng() * (notes.length - 1));
    if (notes[i].degree === notes[i + 1].degree) return null; // no-op swap
    const out = notes.slice();
    out[i] = reDegree(notes[i], notes[i + 1].degree, ctx);
    out[i + 1] = reDegree(notes[i + 1], notes[i].degree, ctx);
    return out;
  },

  /** Swap the DURATIONS of two adjacent notes (pitches UNCHANGED) — a tiny RHYTHMIC near-miss. Only
   *  when they differ AND the pair stays inside ONE bar, so the swap can never push a note across a
   *  barline (which would need a tie). ctx.meter drives the bar size. */
  swapAdjacentDur(notes, ctx, rng) {
    const dq = (d) => DURATION_QUARTERS[String(d).replace(/r$/, '')] || 1;
    const [t, v] = String(ctx.meter || '4/4').split('/').map(Number);
    const barQ = (v === 8 && t % 3 === 0) ? (t / 3) * 1.5 : t * (4 / v); // quarters per bar
    const starts = []; let c = 0;
    notes.forEach((n) => { starts.push(c); c += dq(n.duration); });
    const cands = [];
    for (let i = 0; i < notes.length - 1; i++) {
      if (notes[i].duration === notes[i + 1].duration) continue;
      const bar0 = Math.floor((starts[i] + 1e-6) / barQ);
      const barEnd = Math.floor((starts[i] + dq(notes[i].duration) + dq(notes[i + 1].duration) - 1e-6) / barQ);
      if (bar0 === barEnd) cands.push(i); // whole pair inside one bar -> safe to swap
    }
    if (!cands.length) return null;
    const i = cands[Math.floor(rng() * cands.length)];
    const out = notes.slice();
    out[i] = { ...notes[i], duration: notes[i + 1].duration };
    out[i + 1] = { ...notes[i + 1], duration: notes[i].duration };
    return out;
  },

  /** Replace ONE note's degree with a different allowed degree (a bigger, "obvious" edit). */
  swapDegree(notes, ctx, rng, allowedDegrees) {
    const pool = allowedDegrees && allowedDegrees.length ? allowedDegrees : [1, 2, 3, 4, 5, 6, 7];
    const i = Math.floor(rng() * notes.length);
    const others = pool.filter((d) => d !== notes[i].degree);
    if (others.length === 0) return null;
    const nd = others[Math.floor(rng() * others.length)];
    const out = notes.slice();
    out[i] = reDegree(notes[i], nd, ctx);
    return out;
  },
};

/**
 * §4 — Produce up to `n` musically-plausible near-miss melodies, each ONE meaningful
 * edit away from `correct`. Deterministic under `opts.seed`.
 *
 * Guarantees (asserted by the self-test):
 *   - every distractor differs from `correct` (editDistance ≥ 1);
 *   - every distractor is unique (no two share a signature);
 *   - all are valid Melodies (consistent degree/pitch/midi, same length/meter/key);
 *   - 'subtle' → single small edit (step shift / adjacent swap; editDistance ≤ 2);
 *     'obvious' → a larger degree replacement is allowed too.
 *
 * @param {Melody} correct
 * @param {Object} [opts]
 * @param {number} [opts.n=5]
 * @param {('subtle'|'obvious')} [opts.difficulty='subtle']
 * @param {number} [opts.seed=777]
 * @param {number[]} [opts.degrees] the allowed degree pool (defaults to the degrees
 *   actually used in `correct`, so edits stay within the level's vocabulary)
 * @returns {Melody[]}
 */
export function distractors(correct, opts = {}) {
  if (!correct || !Array.isArray(correct.notes)) {
    throw new TypeError('distractors: a valid Melody is required');
  }
  const n = Number.isFinite(opts.n) ? Math.max(0, Math.floor(opts.n)) : 5;
  const difficulty = opts.difficulty === 'obvious' ? 'obvious' : 'subtle';
  const rng = makeRng(Number.isFinite(opts.seed) ? opts.seed : 777);
  const ctx = { key: correct.key, mode: correct.mode, tonicMidi: correct.tonicMidi, meter: correct.meter };
  const allowedDegrees =
    opts.degrees && opts.degrees.length
      ? opts.degrees.slice()
      : Array.from(new Set(correct.notes.map((x) => x.degree))).sort((a, b) => a - b);

  const opNames =
    difficulty === 'obvious'
      ? ['swapDegree', 'shiftStep', 'swapAdjacent']
      : ['shiftStep', 'swapAdjacent', 'swapAdjacentDur'];

  const seen = new Set([melodySignature(correct)]);
  const out = [];
  let attempts = 0;
  const maxAttempts = n * 60 + 60;

  while (out.length < n && attempts < maxAttempts) {
    attempts++;
    const op = opNames[Math.floor(rng() * opNames.length)];
    const nextNotes = EDIT_OPS[op](correct.notes, ctx, rng, allowedDegrees);
    if (!nextNotes) continue;

    const candidate = Object.freeze({
      notes: Object.freeze(nextNotes.map((x) => Object.freeze(x))),
      key: correct.key,
      mode: correct.mode,
      meter: correct.meter,
      tonicMidi: correct.tonicMidi,
      hallRhythmRef: correct.hallRhythmRef,
      meta: Object.freeze({
        bars: correct.meta ? correct.meta.bars : undefined,
        lengthNotes: nextNotes.length,
        seed: Number.isFinite(opts.seed) ? opts.seed : 777,
        distractorOf: melodySignature(correct),
        edit: op,
      }),
    });

    const sig = melodySignature(candidate);
    if (seen.has(sig)) continue; // differs from correct AND from prior distractors
    seen.add(sig);
    out.push(candidate);
  }

  return out;
}

/* ============================================================================
 * §6c  TWO-PART — generateTwoPartMelody(spec)  (M20; TWO_VOICE_ENGINE_PLAN.md)
 *
 * FIRST SPECIES (note-against-note, the plan's default entry rung): the TOP
 * voice is a normal generateMelody result, untouched; the BOTTOM voice walks
 * the SAME rhythm one register down, constrained by counterpoint filters fed
 * through chooseNextHarmonic's filter hook:
 *   - no voice crossing (bottom strictly below the top; unison allowed only at
 *     the final cadence),
 *   - no parallel 5ths/octaves (both voices moving the same direction into a
 *     perfect interval equal to the previous one),
 *   - strong beats prefer consonance (3rds/6ths favored; 5th/octave allowed;
 *     2nds/7ths/tritones rejected on strong beats).
 * Data model per the plan: { voices: [Melody, Melody] } — each voice is a full
 * ordinary Melody, so every single-voice consumer works on either voice as-is.
 * ========================================================================== */

/**
 * @param {Object} spec same as {@link generateMelody}
 * @returns {{voices: [Melody, Melody], key:string, mode:string, meter:string, meta:Object}}
 */
export function generateTwoPartMelody(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('generateTwoPartMelody: spec required');
  const top = generateMelody(spec);

  const key = top.key, mode = top.mode;
  const seed = (spec.seed ?? 12345) ^ 0x9e37;
  const rng = makeRng(seed);
  const tonicMidi = top.tonicMidi;
  const degrees = spec.degrees || [1, 2, 3, 4, 5, 6, 7];
  const leaps = spec.leaps || ['step', '3rd'];
  // Bottom voice lives one octave down from the top's window.
  const topRange = spec.range && Number.isFinite(spec.range.lowMidi)
    ? spec.range : { lowMidi: tonicMidi - 2, highMidi: tonicMidi + 14 };
  const range = { lowMidi: topRange.lowMidi - 12, highMidi: topRange.highMidi - 12 };
  const pm = parseMeter(top.meter);
  const durations = top.notes.map((n) => n.duration);
  const positions = computeNotePositions(durations, pm);
  const numBars = positions.length ? positions[positions.length - 1].bar + 1 : 1;
  const harmonicPlan = makeHarmonicPlan(numBars, degrees);
  const stepParams = { degrees, leaps, range, tonicMidi: tonicMidi - 12, mode };
  const noteCtx = { key, mode, tonicMidi: tonicMidi - 12 };
  const isPerfect = (pc) => pc === 0 || pc === 7;

  // Start on the tonic below the top's opening note.
  let cur = { degree: 1, oct: 0 };
  {
    const startMidi = posMidi(cur, tonicMidi - 12, mode);
    if (startMidi >= top.notes[0].midi || startMidi < range.lowMidi || startMidi > range.highMidi) {
      // snap to the in-range tonic octave nearest below the top's first note
      for (let oct = 1; oct >= -3; oct--) {
        const m = posMidi({ degree: 1, oct }, tonicMidi - 12, mode);
        if (m < top.notes[0].midi && m >= range.lowMidi && m <= range.highMidi) { cur = { degree: 1, oct }; break; }
      }
    }
  }

  const notes = [];
  let prevSpan = 0, prevDir = 1;
  for (let i = 0; i < durations.length; i++) {
    notes.push(makeNote(cur, durations[i], noteCtx));
    if (i < durations.length - 1) {
      const targetIdx = i + 1;
      const pos = positions[targetIdx];
      const isFinal = targetIdx === durations.length - 1;
      const topMidi = top.notes[targetIdx].midi;
      const prevTopMidi = top.notes[targetIdx - 1].midi;
      const prevBotMidi = notes[targetIdx - 1].midi;
      const prevIntervalPc = ((prevTopMidi - prevBotMidi) % 12 + 12) % 12;
      const counterpoint = (c) => {
        // 1. No crossing (unison tolerated only on the final note).
        if (isFinal ? c.midi > topMidi : c.midi >= topMidi) return false;
        const pc = ((topMidi - c.midi) % 12 + 12) % 12;
        // 2. No parallel perfects: same perfect interval class approached with
        //    both voices moving in the same direction.
        const topDir = Math.sign(topMidi - prevTopMidi);
        const botDir = Math.sign(c.midi - prevBotMidi);
        if (isPerfect(pc) && pc === prevIntervalPc && topDir !== 0 && topDir === botDir) return false;
        // 3. Strong beats demand consonance (final note: perfect welcome).
        if (pos.isStrong && ![0, 3, 4, 7, 8, 9].includes(pc)) return false;
        return true;
      };
      // FINAL NOTE: hard-place the cadence tonic (the plan: both voices cadence
      // together). Among in-range tonic positions at/below the top's final note,
      // pick the nearest to the current position that avoids a parallel perfect;
      // if every octave choice would be parallel (rare), take the nearest anyway
      // and let it stand as a cadential hidden octave (documented in the plan).
      if (isFinal && degrees.includes(1)) {
        const cands2 = [];
        for (let oct = -4; oct <= 4; oct++) {
          const p2 = { degree: 1, oct };
          const m2 = posMidi(p2, tonicMidi - 12, mode);
          if (m2 < range.lowMidi || m2 > range.highMidi || m2 > topMidi) continue;
          cands2.push({ pos: p2, midi: m2, dist: Math.abs(degIndex(p2) - degIndex(cur)) });
        }
        if (cands2.length) {
          cands2.sort((a, b) => a.dist - b.dist);
          const topDir = Math.sign(topMidi - prevTopMidi);
          const ok = cands2.find((c) => {
            const pc = ((topMidi - c.midi) % 12 + 12) % 12;
            const botDir = Math.sign(c.midi - prevBotMidi);
            return !(isPerfect(pc) && pc === prevIntervalPc && topDir !== 0 && topDir === botDir);
          });
          const chosen = ok || cands2[0];
          prevSpan = Math.abs(degIndex(chosen.pos) - degIndex(cur));
          prevDir = Math.sign(degIndex(chosen.pos) - degIndex(cur)) || prevDir;
          cur = chosen.pos;
          continue;
        }
      }
      const preferDegree = isFinal && degrees.includes(1) ? 1 : null;
      // STAGED SEARCH: the counterpoint rules are hard requirements, so when the
      // normal leap-reach offers no legal candidate we WIDEN THE REACH before we
      // would ever relax a rule (the plan's tests assert the rules absolutely):
      //   1. level's own leaps, full rules; 2. widened leaps (through the octave),
      //   full rules; 3. widened leaps, parallel rule dropped (rare corner; still
      //   consonant + uncrossed). chooseNextHarmonic soft-fallbacks internally, so
      //   each stage's RESULT is re-verified against the stage's own filter.
      const widened = { ...stepParams, leaps: ['step', '3rd', 'P4', 'P5', '6th', 'P8'] };
      const noParallel = (c) => {
        if (isFinal ? c.midi > topMidi : c.midi >= topMidi) return false;
        const pc = ((topMidi - c.midi) % 12 + 12) % 12;
        if (pos.isStrong && ![0, 3, 4, 7, 8, 9].includes(pc)) return false;
        return true;
      };
      const stages = [
        [stepParams, counterpoint],
        [widened, counterpoint],
        [widened, noParallel],
      ];
      let next = null;
      for (const [params, f] of stages) {
        const cand = chooseNextHarmonic(rng, cur, params, {
          chordDegs: harmonicPlan[pos.bar],
          isStrong: pos.isStrong,
          contourBias: 0,
          prevSpan,
          prevDir,
          preferDegree,
          filter: f,
        });
        const midi = posMidi(cand, tonicMidi - 12, mode);
        if (f({ pos: cand, midi })) { next = cand; break; }
      }
      if (!next) next = cur; // absolute corner: hold the note (oblique motion)
      prevSpan = Math.abs(degIndex(next) - degIndex(cur));
      prevDir = Math.sign(degIndex(next) - degIndex(cur)) || prevDir;
      cur = next;
    }
  }

  const bottom = Object.freeze({
    notes: Object.freeze(notes.map((n) => Object.freeze(n))),
    key, mode, meter: top.meter,
    tonicMidi: tonicMidi - 12,
    hallRhythmRef: top.hallRhythmRef,
    meta: Object.freeze({ bars: top.meta.bars, lengthNotes: notes.length, seed }),
  });

  return Object.freeze({
    voices: Object.freeze([top, bottom]),
    key, mode, meter: top.meter,
    meta: Object.freeze({ bars: top.meta.bars, seed: spec.seed ?? 12345 }),
  });
}

/* ============================================================================
 * §6b  MODULATION — generateModulatingMelody(spec)  (M19, and M26's spine)
 *
 * A modulating PERIOD: the first half (antecedent) lives in the original key and
 * ends in a half cadence on 5̂; the second half (consequent) lives in the NEW key
 * — the dominant, whose tonic is the original key's 5̂ — and cadences
 * authentically on the NEW tonic. Composed from two generateMelody calls rather
 * than one continuous walk: the scratchpad proof (melodic-gen-v3.js) built
 * modulation from discrete bar transposition, and the equivalent architecture
 * here is two independently-steered walks — each half gets the full cadence
 * treatment of its own key, which IS the pedagogical point (the student must
 * hear each key established properly).
 *
 * M26 (composition capstone): color-tone flags (chromaticPassingTone /
 * modalMixture / secondaryDominant) are applied to the ANTECEDENT ONLY — by
 * construction, not by post-hoc filtering. A color tone after the modulation
 * would read as an error in the new key; confining insertion to the first half
 * keeps the consequent cleanly diatonic to the new key (the scratchpad's
 * colorMaxBar rule, realized structurally).
 * ========================================================================== */

/**
 * The DOMINANT key of a tonic: letter is 4 letters up the 7-letter wheel, spelled
 * with whatever accidental lands exactly a perfect 5th (7 semitones) above.
 * C→G, F→C, D→A, Bb→F, B→F#, Eb→Bb.
 * @param {string} key tonic letter (+accidental)
 * @returns {string}
 */
export function dominantKeyOf(key) {
  const letter = key[0].toLowerCase();
  const letterIndex = LETTERS.indexOf(letter);
  if (letterIndex < 0) throw new RangeError('dominantKeyOf: bad key ' + key);
  const newLetter = LETTERS[(letterIndex + 4) % 7];
  const targetPc = (((tonicMidiFor(key, 4) + 7) % 12) + 12) % 12;
  let diff = targetPc - LETTER_PC[newLetter];
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  const acc = diff === 0 ? '' : diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  return newLetter.toUpperCase() + acc;
}

/**
 * §6b — Generate a melody that MODULATES to the dominant (M19). Deterministic
 * under `spec.seed`. Same spec as {@link generateMelody} (degrees/leaps/range/
 * meter/hallRhythmRef/color flags), plus the whole-melody `lengthBars` (default
 * 8; must be ≥ 2) which is split evenly: first half in `spec.key`, second half
 * in its dominant. Returns a Melody whose extra `modulation` field records
 * `{to, atBar, atNote}` so exercise UIs can ask "where does the key change?".
 * Color-tone flags apply to the antecedent only (see header note).
 *
 * @param {Object} spec
 * @returns {Melody & {modulation:{to:string, atBar:number, atNote:number}}}
 */
export function generateModulatingMelody(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('generateModulatingMelody: spec required');
  const lengthBars = spec.lengthBars ?? 8;
  if (!(Number.isInteger(lengthBars) && lengthBars >= 2)) {
    throw new RangeError('generateModulatingMelody: lengthBars must be an integer >= 2');
  }
  const anteBars = Math.ceil(lengthBars / 2);
  const consBars = lengthBars - anteBars;
  const seed = spec.seed ?? 12345;
  const newKey = dominantKeyOf(spec.key ?? 'C');

  const base = { ...spec };
  delete base.modulation;

  // Antecedent: original key, half cadence on 5̂, color flags active (M26).
  const ante = generateMelody({
    ...base, lengthBars: anteBars, seed, endOn: 5,
  });
  // Consequent: the dominant key, opens on ITS tonic (affirming the new key — the
  // student must hear the arrival), cadences authentically there. Color flags
  // stripped: the post-modulation half stays cleanly diatonic to the new key.
  const cons = generateMelody({
    ...base,
    key: newKey,
    lengthBars: consBars,
    seed: seed + 101,
    startOn: 'tonic',
    endOn: 1,
    chromaticPassingTone: false,
    modalMixture: false,
    secondaryDominant: false,
  });

  const notes = [...ante.notes, ...cons.notes];
  return Object.freeze({
    notes: Object.freeze(notes.map((n) => Object.freeze(n))),
    key: ante.key,
    mode: ante.mode,
    meter: ante.meter,
    tonicMidi: ante.tonicMidi,
    hallRhythmRef: ante.hallRhythmRef,
    modulation: Object.freeze({ to: newKey, atBar: anteBars, atNote: ante.notes.length }),
    meta: Object.freeze({
      bars: lengthBars,
      lengthNotes: notes.length,
      seed,
    }),
  });
}

/* ============================================================================
 * §7  SYMMETRIC COLLECTIONS — generateSymmetricMelody(spec)  (M24)
 *
 * Whole-tone and octatonic scales are NOT 7-note diatonic-family collections, so
 * they don't fit the degree-1..7 / SCALE_SEMITONES model above — a whole-tone
 * scale has 6 notes per octave, octatonic has 8, and neither maps one letter per
 * degree. Ported from the session-verified scratchpad generator (melodic-gen-v3.js:
 * buildSymmetricLadder / generateSymmetricMelody / symmetricCollectionCheck) —
 * see the reuse-verified-code rule; this is the proven implementation, adapted to
 * this module's data model, not a re-derivation.
 *
 * Pitch model: each collection is its semitone offsets from the tonic; each pitch
 * is spelled as whichever LETTER needs the fewest accidentals to reach it (not
 * always the "textbook" spelling, but always pitch-correct and playable). There is
 * no functional harmony (no I/V, no leading tone — that's the collections' whole
 * character), so the walk is simpler than generateMelody's: stepwise-biased, arcs
 * up then down, starts and ends on the tonic.
 * ========================================================================== */

/**
 * Semitone offsets (from the tonic) of each supported symmetric collection.
 * `degree` d of a collection = offsets[d-1] semitones above the tonic.
 * @type {Readonly<Record<string, ReadonlyArray<number>>>}
 */
export const SYMMETRIC_COLLECTIONS = Object.freeze({
  'whole-tone': Object.freeze([0, 2, 4, 6, 8, 10]),
  'octatonic-wh': Object.freeze([0, 2, 3, 5, 6, 8, 9, 11]), // whole-half
  'octatonic-hw': Object.freeze([0, 1, 3, 4, 6, 7, 9, 10]), // half-whole
});

/**
 * Spell a pitch-class as the letter needing the fewest accidentals (±2 max).
 * @param {number} targetPc 0..11
 * @returns {{letter:string, diff:number}} lowercase letter + signed accidental count
 */
function nearestLetterSpelling(targetPc) {
  let best = null;
  for (const letter of LETTERS) {
    let diff = ((targetPc - LETTER_PC[letter] + 18) % 12) - 6;
    if (diff > 2) diff -= 12;
    if (diff < -2) diff += 12;
    if (!best || Math.abs(diff) < Math.abs(best.diff)) best = { letter, diff };
  }
  return best;
}

/**
 * VexFlow pitch string for an absolute midi given a chosen letter spelling.
 * Same octave-anchoring arithmetic as {@link midiToPitch}.
 * @param {number} midi
 * @param {{letter:string, diff:number}} spelling
 * @returns {string} e.g. 'f#/4'
 */
function spellMidi(midi, spelling) {
  const acc = spelling.diff === 0 ? ''
    : spelling.diff > 0 ? '#'.repeat(spelling.diff) : 'b'.repeat(-spelling.diff);
  const octave = Math.floor((midi - spelling.diff) / 12) - 1;
  return `${spelling.letter}${acc}/${octave}`;
}

/**
 * Every playable position of a symmetric collection within a midi range, sorted
 * ascending: `{degree, midi, pitch}` (degree = 1..N within the collection).
 * @param {number} tonicMidi
 * @param {string} collection key of {@link SYMMETRIC_COLLECTIONS}
 * @param {number} lowMidi
 * @param {number} highMidi
 * @returns {{degree:number, midi:number, pitch:string}[]}
 */
function buildSymmetricLadder(tonicMidi, collection, lowMidi, highMidi) {
  const offsets = SYMMETRIC_COLLECTIONS[collection];
  const out = [];
  for (let k = -3; k <= 3; k++) {
    offsets.forEach((off, i) => {
      const midi = tonicMidi + off + 12 * k;
      if (midi < lowMidi || midi > highMidi) return;
      const spelling = nearestLetterSpelling(((midi % 12) + 12) % 12);
      out.push({ degree: i + 1, midi, pitch: spellMidi(midi, spelling) });
    });
  }
  return out.sort((a, b) => a.midi - b.midi);
}

/**
 * §7 — Generate a melody over a SYMMETRIC collection (M24: whole-tone/octatonic).
 * Deterministic under `spec.seed`. Returns the same frozen Melody shape as
 * {@link generateMelody} except: `collection` replaces `mode` (mode is absent),
 * and `degree` is the note's 1..N position within the COLLECTION, not a diatonic
 * scale degree. Guarantees (asserted by tests): every pitch-class belongs to the
 * collection; first and last notes are the tonic pitch-class; every midi is in
 * range; adjacent moves span at most `maxLeapSteps` collection steps (except the
 * final steered-to-tonic note, which may exceed it only if no in-reach tonic
 * exists); durations fill `lengthBars` whole bars.
 *
 * @param {Object} spec {key, collection, meter, hallRhythmRef, lengthBars, seed,
 *   range:{lowMidi,highMidi}, tonicOctave, maxLeapSteps}
 * @returns {Melody} (with `collection` in place of `mode`)
 */
export function generateSymmetricMelody(spec) {
  if (!spec || typeof spec !== 'object') throw new TypeError('generateSymmetricMelody: spec required');
  const {
    key = 'C',
    collection = 'whole-tone',
    meter = '4/4',
    hallRhythmRef = 'ch1',
    lengthBars = 2,
    seed = 12345,
    range,
    maxLeapSteps = 2,
  } = spec;
  if (!SYMMETRIC_COLLECTIONS[collection]) {
    throw new RangeError('generateSymmetricMelody: unknown collection ' + collection);
  }

  const pm = parseMeter(meter);
  const tonicMidi = tonicMidiFor(key, spec.tonicOctave ?? 4);
  const rng = makeRng(seed);
  const effectiveRange = range && Number.isFinite(range.lowMidi) && Number.isFinite(range.highMidi)
    ? { lowMidi: range.lowMidi, highMidi: range.highMidi }
    : { lowMidi: tonicMidi - 2, highMidi: tonicMidi + 14 };

  const beatUnit = pm.compound
    ? (pm.beatUnitQuarters === 3 ? 'dotted-half' : 'dotted-quarter')
    : (pm.beatUnitQuarters === 2 ? 'half' : 'quarter');
  const durations = generateRhythm(rng, pm, hallRhythmRef, lengthBars, beatUnit);

  const ladder = buildSymmetricLadder(tonicMidi, collection, effectiveRange.lowMidi, effectiveRange.highMidi);
  if (!ladder.length) throw new RangeError('generateSymmetricMelody: range holds no collection pitches');

  // Start on the tonic position nearest the reference tonicMidi.
  const tonics = ladder.filter((p) => p.degree === 1);
  const startPool = tonics.length ? tonics : ladder;
  let curIdx = ladder.indexOf(
    startPool.reduce((a, b) => (Math.abs(a.midi - tonicMidi) <= Math.abs(b.midi - tonicMidi) ? a : b)),
  );

  const notes = [];
  for (let i = 0; i < durations.length; i++) {
    const p = ladder[curIdx];
    notes.push({ degree: p.degree, alter: 0, pitch: p.pitch, midi: p.midi, duration: durations[i] });
    if (i === durations.length - 1) break;

    const isFinalNext = i + 1 === durations.length - 1;
    if (isFinalNext && tonics.length) {
      // Steer the final note to the nearest tonic — prefer one within maxLeapSteps,
      // else take the nearest reachable tonic outright (a clean ending outranks the
      // leap cap on the very last move).
      const withDist = tonics.map((t) => ({ t, d: Math.abs(ladder.indexOf(t) - curIdx) }));
      withDist.sort((a, b) => a.d - b.d);
      const inReach = withDist.filter((x) => x.d <= maxLeapSteps && x.d > 0);
      curIdx = ladder.indexOf((inReach.length ? inReach[0] : withDist[0]).t);
      continue;
    }

    // Interior walk: candidates within maxLeapSteps, weighted toward small moves
    // and the contour arc (rise through the first half, fall through the second).
    const contour = i < durations.length / 2 ? 1 : -1;
    const cands = [];
    for (let s = -maxLeapSteps; s <= maxLeapSteps; s++) {
      if (s === 0) continue;
      const idx = curIdx + s;
      if (idx < 0 || idx >= ladder.length) continue;
      // Penultimate position must not sit ON a tonic (would force a repeated-note
      // "cadence"); skip tonic candidates when the note after this one is the final.
      if (isFinalNext && ladder[idx].degree === 1) continue;
      let w = maxLeapSteps + 1 - Math.abs(s); // stepwise bias
      if (Math.sign(s) === contour) w += 1.5; // contour bias
      cands.push({ idx, w });
    }
    if (!cands.length) continue; // stay put — range corner; extremely rare
    let total = 0;
    for (const c of cands) total += c.w;
    let roll = rng() * total;
    let chosen = cands[cands.length - 1];
    for (const c of cands) { roll -= c.w; if (roll <= 0) { chosen = c; break; } }
    curIdx = chosen.idx;
  }

  const bars = Math.round(totalQuarters(notes) / pm.barQuarters);
  return Object.freeze({
    notes: Object.freeze(notes.map((n) => Object.freeze(n))),
    key,
    collection,
    meter,
    tonicMidi,
    hallRhythmRef,
    meta: Object.freeze({ bars, lengthNotes: notes.length, seed }),
  });
}

/* ============================================================================
 * Default export — the public interface as one namespace object, for callers who
 * prefer `import melodic from './melodic.js'`. Named exports remain primary.
 * ========================================================================== */

export default Object.freeze({
  // enums / tables
  MODES,
  LEAPS,
  LABEL_SYSTEMS,
  LEAP_DEGREE_SPAN,
  SCALE_SEMITONES,
  DURATION_QUARTERS,
  RHYTHM_VOCAB,
  // rng
  makeRng,
  // meter / pitch helpers
  parseMeter,
  totalQuarters,
  tonicMidiFor,
  // core API
  generateMelody,
  labelNote,
  labelPalette,
  distractors,
  editDistance,
  // modulation (M19/M26)
  dominantKeyOf,
  generateModulatingMelody,
  // two-part (M20)
  generateTwoPartMelody,
  // symmetric collections (M24)
  SYMMETRIC_COLLECTIONS,
  generateSymmetricMelody,
});
