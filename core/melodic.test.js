/**
 * @file core/melodic.test.js
 * Exhaustive unit tests for the MELODIC ENGINE (core/melodic.js).
 *
 * Run with:  node --test core/melodic.test.js
 *        or  node --test            (from core/)
 *
 * Fully deterministic: every generator/distractor call passes an explicit seed, so
 * there is no wall-clock or ambient-randomness dependency. The tests assert EVERY
 * guarantee in MELODIC_ENGINE_SPEC §1–§4 + §6.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import Mel, {
  MODES,
  LEAPS,
  LABEL_SYSTEMS,
  LEAP_DEGREE_SPAN,
  SCALE_SEMITONES,
  DURATION_QUARTERS,
  RHYTHM_VOCAB,
  makeRng,
  parseMeter,
  totalQuarters,
  tonicMidiFor,
  generateMelody,
  generateSymmetricMelody,
  generateModulatingMelody,
  generateTwoPartMelody,
  dominantKeyOf,
  SYMMETRIC_COLLECTIONS,
  labelNote,
  labelPalette,
  distractors,
  editDistance,
} from './melodic.js';

/* Real rhythm-level ids from core/curriculum.js, to validate hallRhythmRef lockstep. */
import { LEVELS as RHYTHM_LEVELS } from './curriculum.js';
const RHYTHM_IDS = new Set(RHYTHM_LEVELS.map((l) => l.id));

/* ---------------------------------------------------------------------------
 * Shared validity checker — asserts a Melody honors the whole §1 data model.
 * ------------------------------------------------------------------------- */

/**
 * Assert a melody satisfies the §1 rules: valid duration codes, bars sum to whole
 * measures, and degree/alter/key/mode ⇒ pitch & midi are mutually consistent.
 * @param {import('./melodic.js').Melody} m
 * @param {Object} [opts] { degrees, leaps, range } to additionally enforce §2 bounds
 */
function assertValidMelody(m, opts = {}) {
  assert.ok(Array.isArray(m.notes) && m.notes.length > 0, 'has notes');
  assert.ok(MODES.includes(m.mode), 'valid mode');

  // bars sum to whole measures of the meter
  const pm = parseMeter(m.meter);
  const q = totalQuarters(m.notes);
  const bars = q / pm.barQuarters;
  assert.ok(Math.abs(bars - Math.round(bars)) < 1e-9, `bars are whole: got ${bars}`);
  assert.equal(m.meta.bars, Math.round(bars), 'meta.bars matches computed bars');

  // per-note consistency
  for (const note of m.notes) {
    assert.ok(DURATION_QUARTERS[note.duration] !== undefined, 'known duration ' + note.duration);
    assert.ok(note.degree >= 1 && note.degree <= 7, 'degree in 1..7');
    assert.ok([-1, 0, 1].includes(note.alter), 'alter in -1|0|1');

    // Recompute midi from degree/alter/octave against the tonic; must match note.midi.
    // Derive octave offset from the printed pitch octave vs the tonic octave.
    const semis = SCALE_SEMITONES[m.mode][note.degree] + note.alter;
    // The note's midi minus tonic, reduced to an octave-consistent offset:
    const rel = note.midi - m.tonicMidi;
    // rel must equal semis + 12*k for some integer k (same degree, some octave).
    const k = Math.round((rel - semis) / 12);
    assert.equal(rel, semis + 12 * k, `midi consistent for degree ${note.degree}`);

    // pitch string parses and its pitch-class matches the midi pitch-class.
    const mm = /^([a-g])(#|##|b|bb)?\/(-?\d+)$/.exec(note.pitch);
    assert.ok(mm, 'pitch is letter[/acc]/octave: ' + note.pitch);
    const LETTER_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    let pc = LETTER_PC[mm[1]];
    if (mm[2] === '#') pc += 1;
    else if (mm[2] === '##') pc += 2;
    else if (mm[2] === 'b') pc -= 1;
    else if (mm[2] === 'bb') pc -= 2;
    pc = ((pc % 12) + 12) % 12;
    assert.equal(pc, ((note.midi % 12) + 12) % 12, 'pitch letter matches midi pitch-class');

    if (opts.degrees) assert.ok(opts.degrees.includes(note.degree), 'degree within spec.degrees');
    if (opts.range) {
      assert.ok(note.midi >= opts.range.lowMidi && note.midi <= opts.range.highMidi, 'within range');
    }
  }

  // leaps: every adjacent move is within the allowed degree spans (measured diatonically).
  if (opts.leaps) {
    const allowedSpans = new Set(opts.leaps.map((l) => LEAP_DEGREE_SPAN[l]));
    allowedSpans.add(0); // a repeated degree (0-span) is always permissible (not a leap)
    for (let i = 1; i < m.notes.length; i++) {
      // Diatonic degree distance across the octave: use midi to infer octave, then span.
      const a = m.notes[i - 1];
      const b = m.notes[i];
      // reconstruct diatonic index from degree + octave-of-midi
      const idxA = diatonicIndex(a, m);
      const idxB = diatonicIndex(b, m);
      const span = Math.abs(idxA - idxB);
      assert.ok(allowedSpans.has(span), `leap span ${span} allowed (note ${i})`);
    }
  }
}

/** Reconstruct a note's absolute diatonic ladder index (oct*7 + degree-1) from its midi. */
function diatonicIndex(note, m) {
  const semis = SCALE_SEMITONES[m.mode][note.degree] + note.alter;
  const rel = note.midi - m.tonicMidi;
  const k = Math.round((rel - semis) / 12);
  return k * 7 + (note.degree - 1);
}

/* ===========================================================================
 * ENUMS / CONSTANTS match the spec vocabulary exactly.
 * ========================================================================= */

test('spec enums are exactly as contracted', () => {
  assert.deepEqual([...LEAPS], ['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th']);
  assert.deepEqual([...MODES], [
    'major', 'natural-minor', 'harmonic-minor', 'melodic-minor',
    'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian',
  ]);
  assert.deepEqual([...LABEL_SYSTEMS], ['numbers', 'fixed-do', 'moveable-do']);
  // duration codes are the VexFlow vocabulary the rhythm engine uses
  for (const code of ['w', 'h', 'q', '8', '16', 'hd']) {
    assert.ok(DURATION_QUARTERS[code] !== undefined, 'has duration code ' + code);
  }
});

test('default export mirrors the named API', () => {
  assert.equal(Mel.generateMelody, generateMelody);
  assert.equal(Mel.labelNote, labelNote);
  assert.equal(Mel.distractors, distractors);
  assert.equal(Mel.parseMeter, parseMeter);
});

/* ===========================================================================
 * parseMeter — simple + compound.
 * ========================================================================= */

test('parseMeter handles simple meters', () => {
  const m = parseMeter('2/4');
  assert.equal(m.compound, false);
  assert.equal(m.beats, 2);
  assert.equal(m.barQuarters, 2);
  assert.equal(parseMeter('4/4').barQuarters, 4);
  assert.equal(parseMeter('3/4').beats, 3);
});

test('parseMeter handles compound meters (top 6/9/12)', () => {
  const m = parseMeter('6/8');
  assert.equal(m.compound, true);
  assert.equal(m.beats, 2);
  assert.equal(m.beatUnitQuarters, 1.5);
  assert.equal(m.barQuarters, 3);
  assert.equal(parseMeter('9/8').beats, 3);
  assert.equal(parseMeter('12/8').beats, 4);
});

test('parseMeter rejects garbage', () => {
  assert.throws(() => parseMeter('x'), RangeError);
  assert.throws(() => parseMeter('4/0'), RangeError);
});

/* ===========================================================================
 * tonicMidiFor + accidentals.
 * ========================================================================= */

test('tonicMidiFor maps keys to midi (C4=60)', () => {
  assert.equal(tonicMidiFor('C', 4), 60);
  assert.equal(tonicMidiFor('G', 4), 67);
  assert.equal(tonicMidiFor('F', 4), 65);
  assert.equal(tonicMidiFor('Bb', 4), 70);
  assert.equal(tonicMidiFor('A', 4), 69);
});

/* ===========================================================================
 * makeRng — determinism.
 * ========================================================================= */

test('makeRng is deterministic per seed and varies across seeds', () => {
  const a = makeRng(42);
  const b = makeRng(42);
  const c = makeRng(43);
  const seqA = [a(), a(), a(), a()];
  const seqB = [b(), b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, [c(), c(), c(), c()]);
  for (const x of seqA) assert.ok(x >= 0 && x < 1, 'in [0,1)');
});

/* ===========================================================================
 * §2 GENERATOR — validity guarantees.
 * ========================================================================= */

test('generateMelody: 3-note major, stepwise, tonic-start, C major 2/4', () => {
  const spec = {
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    range: { lowMidi: 60, highMidi: 72 }, meter: '2/4',
    hallRhythmRef: 'ch1', lengthBars: 2, startOn: 'tonic', seed: 1,
  };
  const m = generateMelody(spec);
  assert.equal(m.key, 'C');
  assert.equal(m.mode, 'major');
  assert.equal(m.tonicMidi, 60);
  assertValidMelody(m, { degrees: spec.degrees, leaps: spec.leaps, range: spec.range });
  // startOn tonic ⇒ first note is 1/3/5
  assert.ok([1, 3, 5].includes(m.notes[0].degree), 'starts on stable degree');
});

test('generateMelody: pentascale with tonic-triad skips honors leaps + range', () => {
  const spec = {
    key: 'G', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P4', 'P5'],
    range: { lowMidi: 67, highMidi: 79 }, meter: '3/4',
    hallRhythmRef: 'ch2', lengthBars: 4, startOn: 'tonic', seed: 99,
  };
  const m = generateMelody(spec);
  assertValidMelody(m, { degrees: spec.degrees, leaps: spec.leaps, range: spec.range });
});

test('generateMelody: bars sum to exactly whole measures (2/4, 3/4, 4/4, 6/8)', () => {
  for (const [meter, ref, bars] of [
    ['2/4', 'ch1', 2],
    ['3/4', 'ch2', 3],
    ['4/4', 'ch3', 2],
    ['6/8', 'ch5', 2],
  ]) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 80 }, meter, hallRhythmRef: ref,
      lengthBars: bars, startOn: 'tonic', seed: 7,
    });
    const pm = parseMeter(meter);
    assert.equal(totalQuarters(m.notes), bars * pm.barQuarters, `${meter} sums to ${bars} bars`);
    assert.equal(m.meta.bars, bars);
    assertValidMelody(m);
  }
});

test('generateMelody: deterministic under a fixed seed (identical output)', () => {
  const spec = {
    key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd', 'P5'],
    range: { lowMidi: 58, highMidi: 74 }, meter: '4/4', hallRhythmRef: 'ch4',
    lengthBars: 2, startOn: 'tonic', seed: 20260701,
  };
  const a = generateMelody(spec);
  const b = generateMelody(spec);
  assert.deepEqual(a, b);
  // A different seed generally yields a different melody.
  const c = generateMelody({ ...spec, seed: 20260702 });
  assert.notDeepEqual(a.notes.map((n) => [n.degree, n.duration]),
    c.notes.map((n) => [n.degree, n.duration]));
});

test('generateMelody: honors a fixed rhythm verbatim', () => {
  const fixed = ['q', '8', '8', 'h', 'q', 'q', 'q', 'q'];
  const m = generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    range: { lowMidi: 60, highMidi: 72 }, meter: '4/4', hallRhythmRef: 'ch1',
    rhythm: fixed, lengthBars: 2, startOn: 'tonic', seed: 5,
  });
  assert.deepEqual(m.notes.map((n) => n.duration), fixed);
  assertValidMelody(m);
});

test('generateMelody: accepts a fixed rhythm as [{duration}] objects too', () => {
  const fixed = [{ duration: 'h' }, { duration: 'h' }];
  const m = generateMelody({
    key: 'C', mode: 'major', degrees: [1, 3, 5], leaps: ['3rd'],
    range: { lowMidi: 60, highMidi: 72 }, meter: '4/4', hallRhythmRef: 'ch1',
    rhythm: fixed, lengthBars: 1, startOn: 'tonic', seed: 3,
  });
  assert.deepEqual(m.notes.map((n) => n.duration), ['h', 'h']);
});

test('generateMelody: never produces a leap outside spec.leaps', () => {
  // Steps only → no adjacent move may exceed one diatonic step.
  for (let seed = 0; seed < 25; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step'],
      range: { lowMidi: 55, highMidi: 80 }, meter: '4/4', hallRhythmRef: 'ch3',
      lengthBars: 2, startOn: 'tonic', seed,
    });
    assertValidMelody(m, { leaps: ['step'] });
  }
});

test('generateMelody: never leaves the range', () => {
  const range = { lowMidi: 60, highMidi: 64 }; // a very tight window (C..E)
  for (let seed = 0; seed < 25; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step', '3rd'],
      range, meter: '2/4', hallRhythmRef: 'ch1', lengthBars: 2, startOn: 'tonic', seed,
    });
    for (const note of m.notes) {
      assert.ok(note.midi >= range.lowMidi && note.midi <= range.highMidi, `midi ${note.midi} in range`);
    }
  }
});

test('generateMelody: minor modes produce the right scale degrees', () => {
  // harmonic-minor raised 7 → 7̂ is 11 semitones over tonic.
  const m = generateMelody({
    key: 'A', mode: 'harmonic-minor', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step'],
    range: { lowMidi: 57, highMidi: 81 }, meter: '4/4', hallRhythmRef: 'ch3',
    lengthBars: 2, startOn: 'tonic', seed: 11,
  });
  assertValidMelody(m);
  // Find a 7̂ note if present and check its offset above tonic is 11 (mod 12).
  for (const note of m.notes) {
    if (note.degree === 7) {
      assert.equal(((note.midi - m.tonicMidi) % 12 + 12) % 12, 11, 'harmonic-minor 7̂ is +11');
    }
    if (note.degree === 3) {
      assert.equal(((note.midi - m.tonicMidi) % 12 + 12) % 12, 3, 'minor 3̂ is +3');
    }
  }
});

test('generateMelody: startOn "any" still yields valid melodies', () => {
  const m = generateMelody({
    key: 'F', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
    range: { lowMidi: 60, highMidi: 77 }, meter: '3/4', hallRhythmRef: 'ch2',
    lengthBars: 2, startOn: 'any', seed: 8,
  });
  assertValidMelody(m, { degrees: [1, 2, 3, 4, 5] });
});

test('generateMelody: validates its inputs', () => {
  assert.throws(() => generateMelody({ mode: 'ionian' }), RangeError);
  assert.throws(() => generateMelody({ degrees: [] }), RangeError);
  assert.throws(() => generateMelody({ degrees: [0, 9] }), RangeError);
  assert.throws(() => generateMelody({ degrees: [1], leaps: ['9th'] }), RangeError);
  assert.throws(() => generateMelody(null), TypeError);
});

test('generateMelody: returned melody is immutable (frozen)', () => {
  const m = generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    range: { lowMidi: 60, highMidi: 72 }, meter: '2/4', hallRhythmRef: 'ch1', seed: 1,
  });
  assert.ok(Object.isFrozen(m));
  assert.ok(Object.isFrozen(m.notes));
  assert.ok(Object.isFrozen(m.notes[0]));
  assert.throws(() => { m.notes[0].degree = 9; }, TypeError);
});

/* ===========================================================================
 * hallRhythmRef lockstep — every ref this module tabulates is a real rhythm id.
 * ========================================================================= */

test('every RHYTHM_VOCAB key is a real core/curriculum.js level id (lockstep)', () => {
  for (const ref of Object.keys(RHYTHM_VOCAB)) {
    assert.ok(RHYTHM_IDS.has(ref), `hallRhythmRef ${ref} exists in curriculum.js`);
  }
});

/* ===========================================================================
 * §3 LABELING — all three systems + both minor forks.
 * ========================================================================= */

test('labelNote: numbers system (default) renders caret degrees with accidentals', () => {
  const ctx = { key: 'C', mode: 'major' }; // system defaults to numbers
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'c/4', midi: 60 }, ctx), '1̂');
  assert.equal(labelNote({ degree: 5, alter: 0, pitch: 'g/4', midi: 67 }, ctx), '5̂');
  assert.equal(labelNote({ degree: 4, alter: 1, pitch: 'f#/4', midi: 66 }, ctx), '♯4̂');
  assert.equal(labelNote({ degree: 6, alter: -1, pitch: 'ab/4', midi: 68 }, ctx), '♭6̂');
});

test('labelNote: fixed-do labels the absolute pitch letter (do=C always)', () => {
  const ctx = { key: 'G', mode: 'major', system: 'fixed-do' };
  // In G major, degree 1 is G → sol; degree 5 is D → re; fixed-do ignores the key.
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'g/4', midi: 67 }, ctx), 'sol');
  assert.equal(labelNote({ degree: 5, alter: 0, pitch: 'd/5', midi: 74 }, ctx), 're');
  assert.equal(labelNote({ degree: 3, alter: 0, pitch: 'b/4', midi: 71 }, ctx), 'ti');
  // Same pitch C in any key → do.
  assert.equal(labelNote({ degree: 4, alter: 0, pitch: 'c/5', midi: 72 }, ctx), 'do');
});

test('labelNote: moveable-do MAJOR maps degree→do-re-mi (do=tonic)', () => {
  const ctx = { key: 'G', mode: 'major', system: 'moveable-do' };
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'g/4', midi: 67 }, ctx), 'do');
  assert.equal(labelNote({ degree: 2, alter: 0, pitch: 'a/4', midi: 69 }, ctx), 're');
  assert.equal(labelNote({ degree: 3, alter: 0, pitch: 'b/4', midi: 71 }, ctx), 'mi');
  assert.equal(labelNote({ degree: 7, alter: 0, pitch: 'f#/5', midi: 78 }, ctx), 'ti');
});

test('labelNote: moveable-do MINOR la-based fork (la ti do re mi fa sol)', () => {
  const ctx = { key: 'A', mode: 'natural-minor', system: 'moveable-do', minorSolfege: 'la' };
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'a/4', midi: 69 }, ctx), 'la');
  assert.equal(labelNote({ degree: 2, alter: 0, pitch: 'b/4', midi: 71 }, ctx), 'ti');
  assert.equal(labelNote({ degree: 3, alter: 0, pitch: 'c/5', midi: 72 }, ctx), 'do');
  assert.equal(labelNote({ degree: 5, alter: 0, pitch: 'e/5', midi: 76 }, ctx), 'mi');
});

test('labelNote: moveable-do MINOR do-based fork (do re me fa sol le te)', () => {
  const ctx = { key: 'A', mode: 'natural-minor', system: 'moveable-do', minorSolfege: 'do' };
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'a/4', midi: 69 }, ctx), 'do');
  assert.equal(labelNote({ degree: 2, alter: 0, pitch: 'b/4', midi: 71 }, ctx), 're');
  assert.equal(labelNote({ degree: 3, alter: 0, pitch: 'c/5', midi: 72 }, ctx), 'me');
  assert.equal(labelNote({ degree: 6, alter: 0, pitch: 'f/5', midi: 77 }, ctx), 'le');
  assert.equal(labelNote({ degree: 7, alter: 0, pitch: 'g/5', midi: 79 }, ctx), 'te');
});

test('labelNote: moveable-do minor defaults to la-based when fork unspecified', () => {
  const ctx = { key: 'A', mode: 'natural-minor', system: 'moveable-do' };
  assert.equal(labelNote({ degree: 1, alter: 0, pitch: 'a/4', midi: 69 }, ctx), 'la');
});

test('labelNote: rejects an unknown system', () => {
  assert.throws(() => labelNote({ degree: 1, alter: 0, pitch: 'c/4', midi: 60 }, { system: 'bogus' }), RangeError);
});

test('labelPalette: numbers → 1̂..7̂', () => {
  assert.deepEqual(labelPalette({ key: 'C', mode: 'major', system: 'numbers' }),
    ['1̂', '2̂', '3̂', '4̂', '5̂', '6̂', '7̂']);
  // default system is numbers
  assert.deepEqual(labelPalette({ key: 'C', mode: 'major' }),
    ['1̂', '2̂', '3̂', '4̂', '5̂', '6̂', '7̂']);
});

test('labelPalette: moveable-do major and both minor forks', () => {
  assert.deepEqual(labelPalette({ key: 'C', mode: 'major', system: 'moveable-do' }),
    ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti']);
  assert.deepEqual(labelPalette({ key: 'A', mode: 'natural-minor', system: 'moveable-do', minorSolfege: 'la' }),
    ['la', 'ti', 'do', 're', 'mi', 'fa', 'sol']);
  assert.deepEqual(labelPalette({ key: 'A', mode: 'natural-minor', system: 'moveable-do', minorSolfege: 'do' }),
    ['do', 're', 'me', 'fa', 'sol', 'le', 'te']);
});

test('labelPalette: fixed-do follows the key scale letters', () => {
  assert.deepEqual(labelPalette({ key: 'C', mode: 'major', system: 'fixed-do' }),
    ['do', 're', 'mi', 'fa', 'sol', 'la', 'ti']);
  // G major: scale G A B C D E F → sol la ti do re mi fa
  assert.deepEqual(labelPalette({ key: 'G', mode: 'major', system: 'fixed-do' }),
    ['sol', 'la', 'ti', 'do', 're', 'mi', 'fa']);
});

test('labelNote/labelPalette: labeling a whole generated melody works in every system', () => {
  const m = generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
    range: { lowMidi: 60, highMidi: 72 }, meter: '4/4', hallRhythmRef: 'ch3',
    lengthBars: 2, startOn: 'tonic', seed: 314,
  });
  for (const system of LABEL_SYSTEMS) {
    const ctx = { key: m.key, mode: m.mode, system };
    const palette = labelPalette(ctx);
    for (const note of m.notes) {
      const label = labelNote(note, ctx);
      assert.equal(typeof label, 'string');
      assert.ok(label.length > 0, `non-empty label in ${system}`);
      assert.ok(palette.includes(label), `label "${label}" is in the ${system} palette`);
    }
  }
});

/* ===========================================================================
 * §4 DISTRACTORS — uniqueness, validity, edit-distance, determinism.
 * ========================================================================= */

function baseMelody(seed = 1) {
  return generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
    range: { lowMidi: 58, highMidi: 74 }, meter: '4/4', hallRhythmRef: 'ch3',
    lengthBars: 2, startOn: 'tonic', seed,
  });
}

test('distractors: returns n unique, valid near-misses (subtle)', () => {
  const correct = baseMelody(1);
  const ds = distractors(correct, { n: 5, difficulty: 'subtle', seed: 100 });
  assert.equal(ds.length, 5);
  const sigs = new Set();
  const correctSig = correct.notes.map((n) => `${n.degree}.${n.alter}.${n.duration}`).join('|');
  for (const d of ds) {
    assertValidMelody(d);
    // same length / meter / key / mode as the correct answer
    assert.equal(d.notes.length, correct.notes.length);
    assert.equal(d.meter, correct.meter);
    assert.equal(d.key, correct.key);
    assert.equal(d.mode, correct.mode);
    // differs from the correct answer
    assert.ok(editDistance(correct, d) >= 1, 'distractor differs from correct');
    const sig = d.notes.map((n) => `${n.degree}.${n.alter}.${n.duration}`).join('|');
    assert.notEqual(sig, correctSig, 'distractor != correct');
    assert.ok(!sigs.has(sig), 'distractors are mutually unique');
    sigs.add(sig);
  }
});

test('distractors: subtle edits are small (editDistance ≤ 2 per distractor)', () => {
  const correct = baseMelody(2);
  const ds = distractors(correct, { n: 5, difficulty: 'subtle', seed: 55 });
  for (const d of ds) {
    const ed = editDistance(correct, d);
    assert.ok(ed >= 1 && ed <= 2, `subtle editDistance ${ed} in [1,2]`);
  }
});

test('distractors: obvious difficulty still yields unique valid melodies', () => {
  const correct = baseMelody(3);
  const ds = distractors(correct, { n: 4, difficulty: 'obvious', seed: 9 });
  assert.equal(ds.length, 4);
  const sigs = new Set();
  for (const d of ds) {
    assertValidMelody(d);
    assert.ok(editDistance(correct, d) >= 1);
    const sig = d.notes.map((n) => `${n.degree}.${n.alter}.${n.duration}`).join('|');
    assert.ok(!sigs.has(sig));
    sigs.add(sig);
  }
});

test('distractors: deterministic under a fixed seed', () => {
  const correct = baseMelody(4);
  const a = distractors(correct, { n: 5, seed: 2024 });
  const b = distractors(correct, { n: 5, seed: 2024 });
  assert.deepEqual(a, b);
  const c = distractors(correct, { n: 5, seed: 2025 });
  // Different seed → generally a different set (compare degree/duration signatures).
  const sig = (ds) => ds.map((d) => d.notes.map((n) => `${n.degree}.${n.duration}`).join('|')).join('#');
  assert.notEqual(sig(a), sig(c));
});

test('distractors: distractors are frozen/immutable', () => {
  const correct = baseMelody(5);
  const ds = distractors(correct, { n: 3, seed: 1 });
  for (const d of ds) {
    assert.ok(Object.isFrozen(d));
    assert.ok(Object.isFrozen(d.notes[0]));
  }
});

test('distractors: does not mutate the correct melody', () => {
  const correct = baseMelody(6);
  const snap = JSON.stringify(correct);
  distractors(correct, { n: 5, seed: 12 });
  assert.equal(JSON.stringify(correct), snap);
});

test('distractors: rejects a non-melody input', () => {
  assert.throws(() => distractors(null), TypeError);
  assert.throws(() => distractors({}), TypeError);
});

/* ===========================================================================
 * editDistance sanity.
 * ========================================================================= */

test('editDistance is 0 for identical, >0 for differing melodies', () => {
  const m = baseMelody(1);
  assert.equal(editDistance(m, m), 0);
  const ds = distractors(m, { n: 1, seed: 3 });
  assert.ok(editDistance(m, ds[0]) >= 1);
});

/* ===========================================================================
 * M23: church modes — dorian/phrygian/lydian/mixolydian/locrian generate valid,
 * self-consistent melodies (same assertValidMelody contract as the original 4 modes).
 * ========================================================================= */

test('generateMelody: every church mode produces a valid melody', () => {
  for (const mode of ['dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian']) {
    const m = generateMelody({
      key: 'D', mode, degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 2, startOn: 'tonic', seed: 42,
    });
    assertValidMelody(m, { degrees: [1, 2, 3, 4, 5, 6, 7] });
  }
});

test('generateMelody: church mode semitone tables match standard music theory', () => {
  // Each mode's degree-2 offset (the interval that most distinguishes it) checked
  // against the textbook formula intervals from the tonic.
  assert.deepEqual(SCALE_SEMITONES.dorian, [0, 0, 2, 3, 5, 7, 9, 10]);
  assert.deepEqual(SCALE_SEMITONES.phrygian, [0, 0, 1, 3, 5, 7, 8, 10]);
  assert.deepEqual(SCALE_SEMITONES.lydian, [0, 0, 2, 4, 6, 7, 9, 11]);
  assert.deepEqual(SCALE_SEMITONES.mixolydian, [0, 0, 2, 4, 5, 7, 9, 10]);
  assert.deepEqual(SCALE_SEMITONES.locrian, [0, 0, 1, 3, 5, 6, 8, 10]);
});

/* ===========================================================================
 * M24 (pentatonic slice): the EXISTING `degrees` restriction already produces a
 * pentatonic collection when given major/minor-pentatonic degree sets — no new
 * generator code needed, just proof the restriction actually holds under a seed
 * sweep (not just "didn't throw").
 * ========================================================================= */

test('generateMelody: degrees:[1,2,3,5,6] on major yields a genuine major-pentatonic melody', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 5, 6], leaps: ['step', '3rd'],
      range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 2, startOn: 'tonic', seed,
    });
    for (const note of m.notes) assert.ok([1, 2, 3, 5, 6].includes(note.degree), 'degree in pentatonic set');
  }
});

/* ===========================================================================
 * M19-M21: chromatic passing tone / modal mixture / secondary dominant color
 * tones. Each is a probabilistic no-op (only fires when the diatonic melody
 * happens to offer an eligible spot), so these sweep many seeds and assert the
 * mechanism fires AT LEAST ONCE — proving it actually works, not just "never
 * crashes" — while every individual melody (colored or not) stays fully valid.
 * ========================================================================= */

test('generateMelody: chromaticPassingTone inserts a resolving passing tone across a seed sweep', () => {
  let sawAlteredNote = false;
  for (let seed = 1; seed <= 40; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 4, startOn: 'tonic', seed, chromaticPassingTone: true,
    });
    assertValidMelody(m, { degrees: [1, 2, 3, 4, 5, 6, 7] });
    const flat = m.notes;
    for (let i = 0; i < flat.length; i++) {
      if ((flat[i].alter || 0) === 0) continue;
      sawAlteredNote = true;
      // must resolve: flanked on both sides by a half step in the SAME direction.
      assert.ok(i > 0 && i < flat.length - 1, 'chromatic tone not at a phrase boundary');
      const d1 = flat[i].midi - flat[i - 1].midi;
      const d2 = flat[i + 1].midi - flat[i].midi;
      assert.equal(Math.abs(d1), 1, 'approached by a half step');
      assert.equal(Math.sign(d1), Math.sign(d2), 'left in the same direction (resolves as a passing tone)');
    }
  }
  assert.ok(sawAlteredNote, 'chromaticPassingTone fired at least once across the seed sweep');
});

test('generateMelody: modalMixture borrows ♭6̂ only into an existing 6̂→5̂ descent', () => {
  let sawMixture = false;
  for (let seed = 1; seed <= 40; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 4, startOn: 'tonic', seed, modalMixture: true,
    });
    assertValidMelody(m, { degrees: [1, 2, 3, 4, 5, 6, 7] });
    m.notes.forEach((n, i) => {
      if ((n.alter || 0) === 0) return;
      sawMixture = true;
      assert.equal(n.degree, 6, 'mixture only ever alters degree 6');
      assert.equal(n.alter, -1, 'mixture always lowers (borrows ♭6̂)');
      assert.equal(m.notes[i + 1].degree, 5, 'mixture 6̂ is always followed by 5̂');
    });
  }
  assert.ok(sawMixture, 'modalMixture fired at least once across the seed sweep');
});

test('generateMelody: secondaryDominant raises 4̂ only where it resolves up to 5̂', () => {
  let sawSecDom = false;
  for (let seed = 1; seed <= 40; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 4, startOn: 'tonic', seed, secondaryDominant: true,
    });
    assertValidMelody(m, { degrees: [1, 2, 3, 4, 5, 6, 7] });
    m.notes.forEach((n, i) => {
      if ((n.alter || 0) === 0) return;
      sawSecDom = true;
      assert.equal(n.degree, 4, 'secondary dominant only ever alters degree 4');
      assert.equal(n.alter, 1, 'secondary dominant always raises (♯4̂)');
      assert.equal(m.notes[i + 1].degree, 5, 'raised 4̂ is always followed by 5̂');
      assert.equal(m.notes[i + 1].midi - n.midi, 1, 'raised 4̂ resolves UP by exactly a half step');
    });
  }
  assert.ok(sawSecDom, 'secondaryDominant fired at least once across the seed sweep');
});

/* ===========================================================================
 * M24: symmetric collections — whole-tone/octatonic melodies via
 * generateSymmetricMelody. Ports the scratchpad's symmetricCollectionCheck
 * discipline: every pitch-class in the collection, tonic first AND last, range
 * respected, bars filled, deterministic.
 * ========================================================================= */

test('generateSymmetricMelody: every collection generates pc-pure, tonic-anchored melodies', () => {
  for (const collection of Object.keys(SYMMETRIC_COLLECTIONS)) {
    for (let seed = 1; seed <= 10; seed++) {
      const m = generateSymmetricMelody({
        key: 'C', collection, meter: '4/4', hallRhythmRef: 'ch1',
        lengthBars: 2, seed, range: { lowMidi: 58, highMidi: 79 },
      });
      const tonicPc = ((m.tonicMidi % 12) + 12) % 12;
      const allowed = new Set(SYMMETRIC_COLLECTIONS[collection].map((o) => (tonicPc + o) % 12));
      for (const n of m.notes) {
        const pc = ((n.midi % 12) + 12) % 12;
        assert.ok(allowed.has(pc), `${collection} seed ${seed}: pc ${pc} outside collection (${n.pitch})`);
        assert.ok(n.midi >= 58 && n.midi <= 79, 'midi in range');
        assert.ok(DURATION_QUARTERS[n.duration] !== undefined, 'known duration');
      }
      assert.equal(((m.notes[0].midi % 12) + 12) % 12, tonicPc, `${collection} seed ${seed}: starts on tonic pc`);
      assert.equal(((m.notes[m.notes.length - 1].midi % 12) + 12) % 12, tonicPc, `${collection} seed ${seed}: ends on tonic pc`);
      const q = totalQuarters(m.notes);
      assert.ok(Math.abs(q / 4 - Math.round(q / 4)) < 1e-9, 'whole bars of 4/4');
    }
  }
});

test('generateSymmetricMelody: interior moves respect maxLeapSteps', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateSymmetricMelody({
      key: 'D', collection: 'whole-tone', meter: '3/4', hallRhythmRef: 'ch2',
      lengthBars: 2, seed, range: { lowMidi: 58, highMidi: 80 }, maxLeapSteps: 2,
    });
    // whole-tone: every step is 2 semitones, so <=2 collection steps <= 4 semitones
    // (the final steered-to-tonic move is exempt by contract).
    for (let i = 1; i < m.notes.length - 1; i++) {
      const span = Math.abs(m.notes[i].midi - m.notes[i - 1].midi);
      assert.ok(span <= 4, `seed ${seed} note ${i}: interior leap of ${span} semitones exceeds 2 whole-tone steps`);
    }
  }
});

test('generateSymmetricMelody: deterministic under a fixed seed; validates inputs', () => {
  const spec = { key: 'C', collection: 'octatonic-wh', meter: '4/4', hallRhythmRef: 'ch1', lengthBars: 2, seed: 9 };
  assert.deepEqual(generateSymmetricMelody(spec).notes, generateSymmetricMelody(spec).notes);
  assert.throws(() => generateSymmetricMelody({ collection: 'chromatic' }), RangeError);
  assert.throws(() => generateSymmetricMelody(null), TypeError);
});

test('generateSymmetricMelody: pitch spellings are pitch-correct (pc of spelling === pc of midi)', () => {
  const LETTER_PC2 = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  for (const collection of Object.keys(SYMMETRIC_COLLECTIONS)) {
    const m = generateSymmetricMelody({ key: 'Eb', collection, meter: '4/4', hallRhythmRef: 'ch1', lengthBars: 2, seed: 4 });
    for (const n of m.notes) {
      const mm = /^([a-g])(#{1,2}|b{1,2})?\/(-?\d+)$/.exec(n.pitch);
      assert.ok(mm, 'pitch parses: ' + n.pitch);
      let pc = LETTER_PC2[mm[1]];
      if (mm[2]) pc += mm[2][0] === '#' ? mm[2].length : -mm[2].length;
      assert.equal(((pc % 12) + 12) % 12, ((n.midi % 12) + 12) % 12, `spelling matches midi: ${n.pitch}`);
    }
  }
});

/* ===========================================================================
 * M19: modulation to the dominant — generateModulatingMelody. Ports the
 * scratchpad's modulationCheck discipline: antecedent diatonic to the original
 * key ending on ITS 5̂ (half cadence), consequent diatonic to the NEW key
 * (tonic = original 5̂) ending on the NEW tonic. A real key change, not decoration.
 * ========================================================================= */

test('dominantKeyOf: spells the dominant correctly across the circle', () => {
  assert.equal(dominantKeyOf('C'), 'G');
  assert.equal(dominantKeyOf('G'), 'D');
  assert.equal(dominantKeyOf('F'), 'C');
  assert.equal(dominantKeyOf('Bb'), 'F');
  assert.equal(dominantKeyOf('B'), 'F#');
  assert.equal(dominantKeyOf('Eb'), 'Bb');
  assert.equal(dominantKeyOf('A'), 'E');
});

test('generateModulatingMelody: antecedent in the original key, consequent in the dominant', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateModulatingMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 79 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 4, seed,
    });
    assert.equal(m.modulation.to, 'G');
    assert.equal(m.modulation.atBar, 2);
    const tonic1Pc = ((m.tonicMidi % 12) + 12) % 12;
    const scale1 = new Set(SCALE_SEMITONES.major.slice(1).map((s) => (tonic1Pc + s) % 12));
    const tonic2Pc = (tonic1Pc + 7) % 12;
    const scale2 = new Set(SCALE_SEMITONES.major.slice(1).map((s) => (tonic2Pc + s) % 12));

    const ante = m.notes.slice(0, m.modulation.atNote);
    const cons = m.notes.slice(m.modulation.atNote);
    for (const n of ante) {
      const pc = ((n.midi % 12) + 12) % 12;
      assert.ok(scale1.has(pc), `seed ${seed}: antecedent note ${n.pitch} outside original key`);
    }
    for (const n of cons) {
      const pc = ((n.midi % 12) + 12) % 12;
      assert.ok(scale2.has(pc), `seed ${seed}: consequent note ${n.pitch} outside new key`);
    }
    // half cadence: antecedent ends on the ORIGINAL key's 5̂ …
    assert.equal(((ante[ante.length - 1].midi % 12) + 12) % 12, (tonic1Pc + 7) % 12,
      `seed ${seed}: antecedent must end on 5̂ (half cadence)`);
    // … and the whole melody ends on the NEW tonic (authentic cadence there).
    assert.equal(((m.notes[m.notes.length - 1].midi % 12) + 12) % 12, tonic2Pc,
      `seed ${seed}: must cadence on the new tonic`);
    // consequent opens ON the new tonic (the arrival the student must hear).
    assert.equal(((cons[0].midi % 12) + 12) % 12, tonic2Pc,
      `seed ${seed}: consequent must open on the new tonic`);
    // durations still fill whole bars end to end.
    const q = totalQuarters(m.notes);
    assert.equal(q, 16, `seed ${seed}: 4 bars of 4/4 = 16 quarters, got ${q}`);
  }
});

test('generateModulatingMelody: M26 composition — color tones confined to the antecedent', () => {
  let sawColor = false;
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateModulatingMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 79 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 4, seed,
      chromaticPassingTone: true, modalMixture: true, secondaryDominant: true,
    });
    m.notes.forEach((n, i) => {
      if ((n.alter || 0) === 0) return;
      sawColor = true;
      assert.ok(i < m.modulation.atNote,
        `seed ${seed}: color tone ${n.pitch} at index ${i} leaked past the modulation (atNote ${m.modulation.atNote})`);
    });
    // consequent stays strictly diatonic to the NEW key even with all flags on.
    const tonic2Pc = ((m.tonicMidi + 7) % 12 + 12) % 12;
    const scale2 = new Set(SCALE_SEMITONES.major.slice(1).map((s) => (tonic2Pc + s) % 12));
    for (const n of m.notes.slice(m.modulation.atNote)) {
      assert.ok(scale2.has(((n.midi % 12) + 12) % 12), `seed ${seed}: consequent stays diatonic to the new key`);
    }
  }
  assert.ok(sawColor, 'at least one color tone fired across the sweep (flags actually exercised)');
});

test('generateModulatingMelody: deterministic; validates inputs', () => {
  const spec = {
    key: 'F', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
    range: { lowMidi: 53, highMidi: 77 }, meter: '3/4', hallRhythmRef: 'ch2', lengthBars: 4, seed: 6,
  };
  assert.deepEqual(generateModulatingMelody(spec).notes, generateModulatingMelody(spec).notes);
  assert.throws(() => generateModulatingMelody(null), TypeError);
  assert.throws(() => generateModulatingMelody({ key: 'C', lengthBars: 1 }), RangeError);
});

test('generateMelody: a key whose octave-4 tonic is OUTSIDE the range snaps to an in-range octave', () => {
  // m4's real curriculum shape: range 55..64, keys C major AND G major. G4=67 is
  // outside the window; the start must snap to G3 (55) territory instead of
  // degenerating to one repeated out-of-range note (the bug that produced ZERO
  // recognition distractors for every G-major m4 round).
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateMelody({
      key: 'G', mode: 'major', degrees: [1, 2, 3], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 64 }, meter: '2/4', hallRhythmRef: 'ch3',
      lengthBars: 2, startOn: 'tonic', seed,
    });
    for (const note of m.notes) {
      assert.ok(note.midi >= 55 && note.midi <= 64, `seed ${seed}: ${note.pitch} in range`);
    }
    const distinct = new Set(m.notes.map((note) => note.midi));
    assert.ok(distinct.size > 1, `seed ${seed}: melody must not be a monotone (got ${[...distinct]})`);
    // and the distractor engine must actually have material to work with again
    const ds = distractors(m, { n: 3, difficulty: 'subtle', seed });
    assert.ok(ds.length >= 1, `seed ${seed}: at least one distractor (got ${ds.length})`);
  }
});

test('generateMelody: endOn 5 steers the final note to the dominant degree', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 79 }, meter: '4/4', hallRhythmRef: 'ch1',
      lengthBars: 2, seed, endOn: 5,
    });
    assert.equal(m.notes[m.notes.length - 1].degree, 5, `seed ${seed}: ends on 5̂`);
  }
});

/* ===========================================================================
 * M25: irregular meters — 5/8 (2+3) and 7/8 (2+2+3). The grouping IS the meter's
 * identity: bars must fill exactly AND no note may straddle a group boundary
 * (a straddling note notates as the wrong meter even when the math adds up).
 * ========================================================================= */

test('generateMelody: 5/8 and 7/8 fill whole bars with group-aligned rhythms', () => {
  const GROUPS = { '5/8': [1, 1.5], '7/8': [1, 1, 1.5] };
  for (const meter of ['5/8', '7/8']) {
    const barQ = GROUPS[meter].reduce((a, b) => a + b, 0);
    // group-boundary offsets within a bar (excluding 0 and barQ)
    const boundaries = [];
    let acc = 0;
    for (let i = 0; i < GROUPS[meter].length - 1; i++) { acc += GROUPS[meter][i]; boundaries.push(acc); }
    for (let seed = 1; seed <= 10; seed++) {
      const m = generateMelody({
        key: 'A', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
        range: { lowMidi: 55, highMidi: 79 }, meter, hallRhythmRef: 'ch12',
        lengthBars: 2, seed,
      });
      const q = totalQuarters(m.notes);
      assert.equal(q, barQ * 2, `${meter} seed ${seed}: 2 bars fill exactly (got ${q})`);
      // walk cumulative starts: every group boundary must coincide with a note START.
      const starts = new Set();
      let cum = 0;
      for (const n of m.notes) { starts.add(Math.round(cum * 4)); cum += DURATION_QUARTERS[n.duration]; }
      for (let bar = 0; bar < 2; bar++) {
        for (const b of boundaries) {
          const off = Math.round((bar * barQ + b) * 4);
          assert.ok(starts.has(off), `${meter} seed ${seed}: a note straddles the group boundary at ${bar * barQ + b}q`);
        }
      }
    }
  }
});

/* ===========================================================================
 * M25 (changing meter, Hall Ch19/20): spec.meterSequence — one meter per bar,
 * constant beat class; each bar fills to ITS OWN length; mixing simple and
 * compound is rejected (needs equivalence markings, deliberately unsupported).
 * ========================================================================= */

test('generateMelody: meterSequence fills each bar to its own meter exactly', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 79 }, hallRhythmRef: 'ch1',
      meterSequence: ['3/4', '2/4', '4/4'], seed,
    });
    assert.equal(m.meta.bars, 3);
    assert.deepEqual([...m.meterSequence], ['3/4', '2/4', '4/4']);
    assert.equal(m.meter, '3/4', 'melody.meter is the opening meter');
    // cumulative durations must hit exactly 3, then 5, then 9 quarters
    const boundaries = [3, 5, 9];
    let cum = 0; const hits = new Set();
    for (const n of m.notes) {
      cum += DURATION_QUARTERS[n.duration];
      hits.add(Math.round(cum * 4));
    }
    assert.equal(cum, 9, `seed ${seed}: total quarters (got ${cum})`);
    for (const b of boundaries) {
      assert.ok(hits.has(b * 4), `seed ${seed}: a note must END exactly at the bar boundary ${b}q (no note straddles a meter change)`);
    }
  }
});

test('generateMelody: meterSequence rejects mixed simple/compound (needs equivalence markings)', () => {
  assert.throws(() => generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    meterSequence: ['3/4', '6/8'], seed: 1,
  }), RangeError);
});

test('generateMelody: meterSequence is deterministic and works for changing-compound', () => {
  const spec = {
    key: 'G', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
    range: { lowMidi: 55, highMidi: 79 }, hallRhythmRef: 'ch5',
    meterSequence: ['6/8', '9/8'], seed: 4,
  };
  const a = generateMelody(spec), b = generateMelody(spec);
  assert.deepEqual(a.notes, b.notes);
  const q = totalQuarters(a.notes);
  assert.equal(q, 3 + 4.5, 'one 6/8 bar (3q) + one 9/8 bar (4.5q)');
});

/* ===========================================================================
 * M20: two-part — NOTE-AGAINST-NOTE, not strict first species.
 *
 * The sweep below asserts no-crossing, no-parallel-perfects, strong-beat
 * consonance, valid voices, aligned rhythm, and determinism — but ONLY for a
 * WIDE spec (7 degrees, 3rds allowed, ~octave-and-a-half range). That spec never
 * starves the search, so it never reaches the stage-3 fallback that drops the
 * parallel-perfect rule (core/melodic.js "STAGED SEARCH").
 *
 * Do not read this sweep as proof the invariant holds in general. It does not.
 * `narrow spec reaches the stage-3 fallback` below pins the real behaviour.
 * ========================================================================= */

test('generateTwoPartMelody: counterpoint invariants hold across a seed sweep', () => {
  const spec0 = {
    key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
    range: { lowMidi: 60, highMidi: 79 }, meter: '4/4', hallRhythmRef: 'ch1',
    lengthBars: 2, startOn: 'tonic',
  };
  const isPerfect = (pc) => pc === 0 || pc === 7;
  for (let seed = 1; seed <= 15; seed++) {
    const tp = generateTwoPartMelody({ ...spec0, seed });
    const [top, bot] = tp.voices;
    assert.equal(top.notes.length, bot.notes.length, 'note-against-note: aligned note counts');
    // both voices individually valid melodies
    assertValidMelody(top, { degrees: spec0.degrees });
    assertValidMelody(bot, { degrees: spec0.degrees });
    // identical rhythm
    assert.deepEqual(top.notes.map((n) => n.duration), bot.notes.map((n) => n.duration));
    const pm = parseMeter(top.meter);
    let cum = 0;
    for (let i = 0; i < top.notes.length; i++) {
      const t = top.notes[i], b = bot.notes[i];
      const last = i === top.notes.length - 1;
      // no crossing (unison only at the cadence)
      if (last) assert.ok(b.midi <= t.midi, `seed ${seed} note ${i}: bottom above top at cadence`);
      else assert.ok(b.midi < t.midi, `seed ${seed} note ${i}: voices crossed`);
      const pc = ((t.midi - b.midi) % 12 + 12) % 12;
      // strong-beat consonance
      const offsetInBar = cum % pm.barQuarters;
      const isStrong = (offsetInBar % pm.beatUnitQuarters) < 1e-6;
      if (isStrong) {
        assert.ok([0, 3, 4, 7, 8, 9].includes(pc), `seed ${seed} note ${i}: dissonant strong beat (pc ${pc})`);
      }
      // no parallel perfects
      if (i > 0) {
        const prevPc = ((top.notes[i - 1].midi - bot.notes[i - 1].midi) % 12 + 12) % 12;
        const topDir = Math.sign(t.midi - top.notes[i - 1].midi);
        const botDir = Math.sign(b.midi - bot.notes[i - 1].midi);
        if (isPerfect(pc) && pc === prevPc && topDir !== 0 && topDir === botDir) {
          assert.fail(`seed ${seed} note ${i}: parallel perfect (pc ${pc})`);
        }
      }
      cum += DURATION_QUARTERS[t.duration];
    }
    // bottom cadences on the tonic pitch-class
    const tonicPc = ((bot.tonicMidi % 12) + 12) % 12;
    assert.equal(((bot.notes[bot.notes.length - 1].midi % 12) + 12) % 12, tonicPc,
      `seed ${seed}: bottom voice must cadence on the tonic`);
  }
});

/* CHARACTERIZATION TEST — pins a known limitation, it does not endorse it.
 *
 * The sweep above passes only because its spec is wide enough that the search
 * never starves. Give the bottom voice a NARROW spec — few degrees, step-only —
 * and generateTwoPartMelody falls through to its stage-3 fallback, where the
 * parallel-perfect ban is dropped and parallel perfects are emitted.
 *
 * We deliberately ignore a parallel on the FINAL note: the cadence placer has its
 * own documented fallback that accepts a parallel perfect when every in-range
 * tonic would be one. That is a different code path. Only a NON-FINAL violation
 * proves the staged search relaxed the rule.
 *
 * Reachability in production today: only m20 calls this generator
 * (melodic-round.js), with degrees 1-7 and range 48-79 — wide enough that stage 3
 * is unlikely to trigger. The limitation is LATENT, not active. It matters the
 * moment anything asks for a narrow spec — e.g. CounterQuest (VISION.md §5).
 *
 * If a future species engine fixes this, DELETE this test — do not "fix" it by
 * widening the spec until the failure hides again. */
test('generateTwoPartMelody: a narrow spec starves the search into stage 3, which emits non-final parallel perfects', () => {
  const narrow = {
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    range: { lowMidi: 60, highMidi: 79 }, meter: '2/4', hallRhythmRef: 'ch1',
    lengthBars: 2, startOn: 'tonic',
  };
  const isPerfect = (pc) => pc === 0 || pc === 7;
  let seedsWithNonFinalParallels = 0;

  for (let seed = 1; seed <= 40; seed++) {
    const [top, bot] = generateTwoPartMelody({ ...narrow, seed }).voices;
    const last = top.notes.length - 1;
    // i < last: exclude the cadence placer's own parallel-perfect fallback.
    for (let i = 1; i < last; i++) {
      const pc = ((top.notes[i].midi - bot.notes[i].midi) % 12 + 12) % 12;
      const prevPc = ((top.notes[i - 1].midi - bot.notes[i - 1].midi) % 12 + 12) % 12;
      const topDir = Math.sign(top.notes[i].midi - top.notes[i - 1].midi);
      const botDir = Math.sign(bot.notes[i].midi - bot.notes[i - 1].midi);
      if (isPerfect(pc) && pc === prevPc && topDir !== 0 && topDir === botDir) {
        seedsWithNonFinalParallels++;
        break;
      }
    }
  }

  assert.ok(seedsWithNonFinalParallels > 0,
    'expected a narrow spec to starve the staged search into stage 3 and emit a NON-FINAL parallel ' +
    'perfect. If this now fails, either the engine improved (delete this test and update VISION.md §9) ' +
    'or the only parallels were cadential, in which case VISION.md §9 overstates the stage-3 defect.');
});

test('generateTwoPartMelody: deterministic; top voice identical to solo generateMelody', () => {
  const spec0 = {
    key: 'G', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
    range: { lowMidi: 62, highMidi: 81 }, meter: '3/4', hallRhythmRef: 'ch2',
    lengthBars: 2, startOn: 'tonic', seed: 7,
  };
  const a = generateTwoPartMelody(spec0);
  const b = generateTwoPartMelody(spec0);
  assert.deepEqual(a.voices[0].notes, b.voices[0].notes);
  assert.deepEqual(a.voices[1].notes, b.voices[1].notes);
  // the TOP voice is byte-for-byte the ordinary solo melody (the plan: top untouched)
  const solo = generateMelody(spec0);
  assert.deepEqual(a.voices[0].notes, solo.notes);
});

test('generateMelody: mixed simple/compound meterSequence requires + carries an equivalence', () => {
  // without a declaration: rejected (Hall Ch21/22 needs the marking)
  assert.throws(() => generateMelody({
    key: 'C', mode: 'major', degrees: [1, 2, 3], leaps: ['step'],
    meterSequence: ['3/4', '6/8'], seed: 1,
  }), RangeError);
  // with division-constant (Hall's default): generates, fills each bar exactly
  for (let seed = 1; seed <= 6; seed++) {
    const m = generateMelody({
      key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5], leaps: ['step', '3rd'],
      range: { lowMidi: 55, highMidi: 79 }, hallRhythmRef: 'ch4',
      meterSequence: ['3/4', '6/8'], equivalence: 'division', seed,
    });
    assert.equal(m.equivalence, 'division');
    assert.equal(totalQuarters(m.notes), 3 + 3, 'one 3/4 bar (3q) + one 6/8 bar (3q notated)');
    // the meter change is a real bar boundary: some note ENDS exactly at 3q
    let cum = 0; const hits = new Set();
    for (const n of m.notes) { cum += DURATION_QUARTERS[n.duration]; hits.add(Math.round(cum * 4)); }
    assert.ok(hits.has(12), `seed ${seed}: no note straddles the simple->compound change`);
  }
});

test('generateMelody: color-tone flags are deterministic under a fixed seed', () => {
  const spec = {
    key: 'C', mode: 'major', degrees: [1, 2, 3, 4, 5, 6, 7], leaps: ['step', '3rd'],
    range: { lowMidi: 60, highMidi: 77 }, meter: '4/4', hallRhythmRef: 'ch1',
    lengthBars: 4, startOn: 'tonic', seed: 7,
    chromaticPassingTone: true, modalMixture: true, secondaryDominant: true,
  };
  const a = generateMelody(spec);
  const b = generateMelody(spec);
  assert.deepEqual(a.notes, b.notes);
});
