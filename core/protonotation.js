/**
 * @file core/protonotation.js
 * @module core/protonotation
 *
 * PROTONOTATION GRADER — scores a "protonotation" (pre-staff sketch) dictation
 * stage: the shorthand a student writes to capture only what was HEARD (beat
 * positions + melodic CONTOUR + scale-degree NUMBERS) before committing to staff
 * notation. Grounded in research/MELODIC_DICTATION_RESEARCH.md §2.2 (Karpinski/Brown
 * protonotation: beat slashes + contour arrows + degree numbers) and §3 (the
 * micro-skill ladder's "protonotation entry" rung).
 *
 * WHY grade the sketch at all: §1 diagnostic meta-point [strong] — "a wrong
 * transcription can't reveal WHICH stage failed" (Klonoski 2006). Grading the
 * protonotation scores the student's UNDERSTANDING (did they hear the right
 * degrees, the right shape, the right NUMBER of notes?) SEPARATELY from their
 * NOTATION fluency. The three sub-scores are deliberately INDEPENDENT so feedback
 * is stage-isolated: a perfect contour with wrong degrees points at pitch/interval
 * ID (§1.7 separate memory codes, Dowling 1978), not at note-writing.
 *
 * PURE, framework-agnostic ES module in the core/ house style (same discipline as
 * core/melodic.js and core/gym.js): NO DOM, NO audio, NO I/O, NO wall-clock, NO
 * Supabase. Every function takes all data as parameters and returns NEW data;
 * inputs are never mutated.
 */

/* ============================================================================
 * SCORING WEIGHTS + THRESHOLDS — one place, so feedback copy can cite them.
 * ========================================================================== */

/**
 * Weights of the three independent sub-scores in the `overall` blend. Degree
 * accuracy dominates (scale-degree function first — §2.5, the app's core design);
 * contour is the second memory code (§1.7); count is a coarse "did you hear how
 * many onsets" check that gates `correct` on its own besides feeding `overall`.
 * @type {Readonly<{degree:number, contour:number, count:number}>}
 */
export const PROTONOTATION_WEIGHTS = Object.freeze({
  degree: 0.5,
  contour: 0.3,
  count: 0.2,
});

/** `overall` at/above this AND an exact note count ⇒ the sketch is `correct`. */
export const PROTONOTATION_PASS_THRESHOLD = 0.8;

/* ============================================================================
 * CONTOUR — the direction of a move between two consecutive scale degrees.
 * ========================================================================== */

/**
 * The contour of the move FROM `prevDegree` TO `degree`: 'up' if the degree rose,
 * 'down' if it fell, 'same' if it held. Pure comparison of the two degree numbers
 * (protonotation records DIRECTION, not interval size — §2.2).
 * @param {number} prevDegree the previous note's true scale degree
 * @param {number} degree     this note's true scale degree
 * @returns {('up'|'down'|'same')}
 */
export function contourOf(prevDegree, degree) {
  if (degree > prevDegree) return 'up';
  if (degree < prevDegree) return 'down';
  return 'same';
}

/* ============================================================================
 * GRADER — gradeProtonotation(sketch, melody)
 * ========================================================================== */

/**
 * A single sketched entry: what the student wrote for one note they heard.
 * @typedef {Object} ProtonotationEntry
 * @property {(number|null)} degree  the scale-degree number written, or null if the
 *                                   student only marked contour for this note.
 * @property {('up'|'down'|'same'|null)} contour  direction of the move FROM THE
 *                                   PREVIOUS note. The first entry's contour is
 *                                   null/ignored (there is no previous note).
 */

/**
 * The student's whole protonotation sketch: one entry per note they heard, in order.
 * @typedef {Object} ProtonotationSketch
 * @property {ProtonotationEntry[]} entries
 */

/**
 * @typedef {Object} ProtonotationPerNote
 * @property {number} index         0-based note index (over the graded overlap).
 * @property {(boolean|null)} degreeRight  whether the sketched degree matched the
 *                              true degree; null if the student left degree null
 *                              (contour-only) so it was not scored for degree.
 * @property {(boolean|null)} contourRight whether the sketched contour matched the
 *                              true move direction; null for index 0 (no previous
 *                              note) and where the true/sketched move can't be
 *                              compared.
 */

/**
 * @typedef {Object} ProtonotationResult
 * @property {number} degreeAccuracy  fraction of DEGREE-BEARING entries whose
 *                    sketched degree matched the true degree (0..1). If the student
 *                    marked no degrees at all, this is 0 (nothing correctly
 *                    identified) — never NaN.
 * @property {number} contourAccuracy fraction of the true melody's N-1 moves whose
 *                    sketched contour matched (0..1). 1 when the melody has <2 notes
 *                    (no moves to get wrong).
 * @property {number} countAccuracy   1 if the sketch has exactly as many entries as
 *                    the melody has notes; else a graded penalty decaying with the
 *                    absolute size difference.
 * @property {number} overall         weighted blend of the three sub-scores
 *                    (PROTONOTATION_WEIGHTS).
 * @property {boolean} correct        overall >= PROTONOTATION_PASS_THRESHOLD AND the
 *                    note count is EXACT (count is a hard gate, not just a weight).
 * @property {ProtonotationPerNote[]} perNote  per-note breakdown over the overlap.
 */

/**
 * Grade a protonotation sketch against a generated melody, scoring THREE independent
 * sub-scores (stage isolation is the whole point — see file header):
 *
 *   1. degreeAccuracy  — over entries where the student actually wrote a degree
 *      (degree != null), the fraction whose number matches the true degree.
 *   2. contourAccuracy — over the true melody's N-1 consecutive moves, the fraction
 *      whose sketched direction ('up'/'down'/'same') matches the true direction.
 *   3. countAccuracy   — did the student sketch the right NUMBER of notes.
 *
 * DEFENSIVE by contract: mismatched sketch/melody lengths must NOT throw. Degree and
 * contour are graded over the OVERLAP (min length), and the count difference is
 * penalized separately via countAccuracy — so a too-short or too-long sketch scores
 * gracefully instead of crashing.
 *
 * @param {ProtonotationSketch} sketch the student's entry
 * @param {import('./melodic.js').Melody} melody the generated melody (notes carry
 *        .degree; durations exist but are not needed to grade a sketch — the student
 *        marks onsets/count, not exact durations).
 * @returns {ProtonotationResult}
 */
export function gradeProtonotation(sketch, melody) {
  const entries = (sketch && Array.isArray(sketch.entries)) ? sketch.entries : [];
  const notes = (melody && Array.isArray(melody.notes)) ? melody.notes : [];

  const sketchLen = entries.length;
  const melodyLen = notes.length;
  const overlap = Math.min(sketchLen, melodyLen);

  // ---- 1. DEGREE ACCURACY (only over entries the student gave a degree for) ----
  let degreeScored = 0;
  let degreeCorrect = 0;
  const perNote = [];
  for (let i = 0; i < overlap; i++) {
    const sketched = entries[i];
    const trueDegree = notes[i].degree;
    let degreeRight = null; // null = not scored (contour-only entry)
    if (sketched && sketched.degree != null) {
      degreeScored += 1;
      degreeRight = sketched.degree === trueDegree;
      if (degreeRight) degreeCorrect += 1;
    }
    perNote.push({ index: i, degreeRight, contourRight: null });
  }
  // No degrees written ⇒ nothing was correctly identified. 0, never NaN (0/0).
  const degreeAccuracy = degreeScored > 0 ? degreeCorrect / degreeScored : 0;

  // ---- 2. CONTOUR ACCURACY (over the TRUE melody's N-1 moves) ----
  // The denominator is the melody's real number of moves — a student who sketched
  // too few notes simply can't have gotten the missing moves right. Move i is the
  // move INTO note i (from note i-1), so it lives on entries[i].contour.
  const trueMoves = Math.max(0, melodyLen - 1);
  let contourCorrect = 0;
  for (let i = 1; i < melodyLen; i++) {
    const trueContour = contourOf(notes[i - 1].degree, notes[i].degree);
    // Can only credit a move the student actually reached (within the overlap).
    const sketched = i < overlap ? entries[i] : undefined;
    const sketchedContour = sketched ? sketched.contour : undefined;
    const right = sketchedContour === trueContour;
    if (right) contourCorrect += 1;
    if (i < overlap) perNote[i].contourRight = right;
  }
  const contourAccuracy = trueMoves > 0 ? contourCorrect / trueMoves : 1;

  // ---- 3. COUNT ACCURACY (did they hear the right NUMBER of onsets) ----
  const countAccuracy = countScore(sketchLen, melodyLen);
  const countExact = sketchLen === melodyLen;

  // ---- BLEND + PASS GATE ----
  const overall =
    PROTONOTATION_WEIGHTS.degree * degreeAccuracy +
    PROTONOTATION_WEIGHTS.contour * contourAccuracy +
    PROTONOTATION_WEIGHTS.count * countAccuracy;

  const correct = overall >= PROTONOTATION_PASS_THRESHOLD && countExact;

  return {
    degreeAccuracy,
    contourAccuracy,
    countAccuracy,
    overall,
    correct,
    perNote,
  };
}

/**
 * Graded note-count score: 1 when exact, decaying by absolute difference so a sketch
 * one note off still scores most of the count credit while a wildly wrong count
 * approaches 0. Linear falloff of 1/melodyLen per missing/extra note (a whole melody's
 * worth of error ⇒ 0), clamped to [0,1]. An empty melody with an empty sketch is a
 * trivial exact match (1); a non-empty sketch against an empty melody scores 0.
 * @param {number} sketchLen
 * @param {number} melodyLen
 * @returns {number}
 */
function countScore(sketchLen, melodyLen) {
  if (sketchLen === melodyLen) return 1;
  if (melodyLen === 0) return 0; // sketched notes for a zero-note melody: all wrong.
  const diff = Math.abs(sketchLen - melodyLen);
  return Math.max(0, 1 - diff / melodyLen);
}
