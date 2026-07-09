// @ts-check
/**
 * core/grading.js — DICTATION GRADER (Functional Core)
 * =====================================================
 *
 * A PURE, framework-agnostic ES module. NO I/O, NO DOM, NO audio, NO time.
 * Same shape contract as the other `core/*` modules: small JSDoc'd interface,
 * tunables as named constants in ONE place, keyed by the shared level/skill
 * vocabulary.
 *
 * WHAT THIS IS
 * ------------
 * This grades a NOTATED rhythm answer (dictation): the student wrote down a
 * rhythm and we compare its *notated structure* against the expected answer.
 * It does NOT look at tap timestamps — the timing-based tap-back scorer lives
 * in `solo-mode.js` (`scoreTapBack`) and stays there. This module is the
 * dictation analog: same PER-BEAT ALL-OR-NOTHING philosophy, but on structure.
 *
 * THE MODEL (from research/LEVEL_SYSTEM_RESEARCH.md §2 "Mastery assessment")
 * ----------------------------------------------------------------
 *   - Per-beat all-or-nothing (rhythm analog of AP's per-segment scoring):
 *     a beat scores 1 only if its notated content matches EXACTLY — same
 *     onsets, none missing, none extra. No partial credit within a beat.
 *   - Meter / bar-count is a HARD GATE — checked BEFORE per-beat scoring and
 *     reported distinctly. A wrong number of bars, or a bar with the wrong
 *     number of beats, fails the gate.
 *   - Don't double-penalize a consistent ±1 displacement: if the whole answer
 *     is uniformly shifted by one grid position, deduct ONCE rather than
 *     failing every beat.
 *
 * INPUT SHAPE (`Rhythm`)
 * ----------------------
 * A rhythm is `measures → beats → cells`. The smallest unit is a BEAT CELL,
 * whose content is the set of NOTE ONSETS that attack within that beat,
 * expressed as fractional offsets in [0, 1) from the start of the beat
 * (0 = on the downbeat of the beat, 0.5 = the "&", etc.). Rests contribute
 * NO onset — two percussive rhythms that sound identical are graded identical
 * (mirrors `gridFromItems`/`checkAnswer` in solo-mode.js, which compares by
 * onset, not by tile choice).
 *
 *   Rhythm  = { meter?: Meter, measures: Measure[] }
 *   Measure = Beat[]                 // one entry per beat in the bar
 *   Beat    = number[]               // onset offsets in [0,1); [] = silent/sustained beat
 *
 * A beat with one note on the downbeat is `[0]`. Two eighths are `[0, 0.5]`.
 * Four sixteenths are `[0, 0.25, 0.5, 0.75]`. An eighth-triplet beat is
 * `[0, 1/3, 2/3]`. A beat fully covered by a sustained note that began earlier
 * (a tie carried in) is `[]` — no new attack.
 *
 * `Meter` is optional metadata used to make the bar-count gate richer; when
 * absent, the gate is inferred purely from the measures' shapes.
 *   Meter = { beatsPerMeasure?: number, beatUnit?: number }
 *
 * OUTPUT SHAPE (`GradeResult`) — see `gradeDictation` JSDoc below.
 */

/* ======================================================================== *
 *  TUNABLES — every magic number lives here, named, in one place.          *
 * ======================================================================== */

/**
 * Onset-grid resolution: subdivisions per beat. 840 = LCM(1..8) =
 * LCM(2,3,4,5,6,7,8). Every common figure's onsets land on an integer grid
 * index: 16ths (/4), the half-beat's sixteenths (/8), triplets/sextuplets
 * (/3, /6), the dotted-eighth's 32nds, plus 5- and 7-tuplets. This is the SAME
 * constant and rationale as `RES` in solo-mode.js, so the dictation grader and
 * the tap-back grader quantize onsets identically.
 * @type {number}
 */
export const GRID_RESOLUTION = 840;

/**
 * Score (0..1) of a single beat that matches exactly. All-or-nothing: a beat
 * is worth either MAX_BEAT_SCORE or 0 — never a fraction. Named so the
 * "all-or-nothing" intent is explicit and so a future variant could, in ONE
 * place, choose a different full-credit value.
 * @type {number}
 */
export const MAX_BEAT_SCORE = 1;

/**
 * Penalty (in "beats' worth" of score) deducted ONCE when the whole answer is
 * a consistent ±1 grid-position displacement of the expected answer. The
 * displaced answer would otherwise fail many/all beats; instead we charge a
 * single fixed deduction. Expressed in beat-units so it composes with the
 * per-beat score (overall = correctBeats / totalBeats). One beat's worth is a
 * fair, bounded "you were off by a uniform shift" charge.
 * @type {number}
 */
export const UNIFORM_SHIFT_PENALTY_BEATS = 1;

/**
 * The maximum absolute grid-step magnitude considered a "±1 displacement" for
 * the consistent-shift detector. The research says "±1 displacement"; on the
 * GRID_RESOLUTION grid the smallest *musical* unit a student typically shifts
 * by is one division of the beat. We treat a uniform shift as "consistent"
 * regardless of its grid magnitude (it's still ONE systematic error), but we
 * cap the magnitude here so a huge uniform offset (which is really a different
 * rhythm) is NOT excused. One whole beat = GRID_RESOLUTION steps; we allow up
 * to one beat of uniform shift to count as the single-deduction case.
 *
 * DELIBERATE PRODUCT INTERPRETATION: the research's literal "±1 displacement" is
 * widened here to "up to one whole beat of uniform shift" — a deliberate choice so
 * any single systematic early/late error (not just a one-grid-step nudge) is charged
 * once rather than failing every beat. This is intentional, not a stricter reading of
 * the doc.
 * @type {number}
 */
export const MAX_UNIFORM_SHIFT_STEPS = GRID_RESOLUTION;

/* ======================================================================== *
 *  GATE / VERDICT STRING CONSTANTS — stable vocabulary for callers.        *
 * ======================================================================== */

/** Distinct reasons the meter/bar-count hard gate can fail. */
export const METER_GATE = Object.freeze({
  PASS: 'pass',
  /** Student wrote a different number of measures than expected. */
  BAR_COUNT: 'bar-count-mismatch',
  /** A measure has a different number of beats than expected. */
  BEATS_PER_MEASURE: 'beats-per-measure-mismatch',
  /** Declared meter metadata (beatsPerMeasure/beatUnit) disagrees. */
  METER_SIGNATURE: 'meter-signature-mismatch',
  /** Input was malformed (missing/!array measures). */
  MALFORMED: 'malformed-input',
  /** There is nothing to grade: the expected answer has zero total beats. An
   *  empty answer key (or two empty rhythms) must NOT score 100 by vacuous
   *  agreement — it fails the gate so the grade is 0. */
  EMPTY: 'empty-input',
});

/** Per-beat verdict labels. */
export const BEAT_VERDICT = Object.freeze({
  CORRECT: 'correct',
  /** Onsets present but they don't match (wrong subdivision/positions). */
  WRONG: 'wrong',
  /** Student left content where the expected beat had attacks (or vice versa). */
  MISSING: 'missing', // expected had onsets, student beat empty
  EXTRA: 'extra', //   expected empty, student added onsets
  /** Not scored because the meter gate failed for this beat's measure. */
  UNGRADED: 'ungraded',
});

/* ======================================================================== *
 *  PURE HELPERS                                                             *
 * ======================================================================== */

/**
 * Quantize a fractional onset offset in [0,1) to an integer grid index
 * 0..GRID_RESOLUTION-1. Rounds to the nearest grid line so float drift
 * (e.g. 1/3 = 0.33333…) maps to a stable integer.
 * @param {number} offset onset offset within the beat, expected in [0,1)
 * @returns {number} integer grid index
 */
export function quantizeOnset(offset) {
  return Math.round(offset * GRID_RESOLUTION);
}

/**
 * Normalize a single Beat into a SORTED, DEDUPED array of integer grid indices.
 * Two onsets quantizing to the same grid line collapse to one (a rhythm can't
 * attack the same instant twice). Non-finite / out-of-range offsets are dropped
 * defensively. The result is the canonical comparable form of a beat.
 * @param {number[]|undefined|null} beat
 * @returns {number[]} sorted unique grid indices
 */
export function normalizeBeat(beat) {
  if (!Array.isArray(beat)) return [];
  /** @type {Set<number>} */
  const seen = new Set();
  for (const off of beat) {
    if (typeof off !== 'number' || !Number.isFinite(off)) continue;
    if (off < 0 || off >= 1) continue; // an onset belongs to the beat it starts in
    seen.add(quantizeOnset(off));
  }
  return Array.from(seen).sort((a, b) => a - b);
}

/**
 * Are two already-normalized beats (sorted unique grid-index arrays) identical?
 * Same length AND same elements in order ⇒ same COUNT, no missing, no extra,
 * same subdivisions. This is the all-or-nothing exact-match test for a beat.
 * @param {number[]} a normalized beat
 * @param {number[]} b normalized beat
 * @returns {boolean}
 */
export function beatsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Number of beats in a measure (its cell count). Defensive against non-arrays.
 * @param {unknown} measure
 * @returns {number}
 */
function beatCount(measure) {
  return Array.isArray(measure) ? measure.length : 0;
}

/**
 * Flatten a rhythm's measures into ONE ABSOLUTE onset sequence keyed by a
 * global grid index, used by the uniform-shift detector. Each onset becomes
 * `measureBaseBeats * GRID_RESOLUTION + beatIndex * GRID_RESOLUTION + onsetGridIndex`,
 * i.e. its absolute position in grid steps from the very first downbeat. Beats
 * are taken in reading order across all measures.
 * @param {Measure[]} measures normalized? no — raw measures (we normalize here)
 * @returns {number[]} sorted absolute grid positions of every onset
 */
function absoluteOnsetGrid(measures) {
  /** @type {number[]} */
  const positions = [];
  let beatsSoFar = 0;
  for (const measure of measures) {
    if (!Array.isArray(measure)) continue;
    for (const beat of measure) {
      const base = beatsSoFar * GRID_RESOLUTION;
      for (const idx of normalizeBeat(beat)) positions.push(base + idx);
      beatsSoFar += 1;
    }
  }
  positions.sort((a, b) => a - b);
  return positions;
}

/* ======================================================================== *
 *  METER / BAR-COUNT HARD GATE                                              *
 * ======================================================================== */

/**
 * @typedef {Object} Meter
 * @property {number} [beatsPerMeasure] beats per bar (e.g. 4 in 4/4, 2 in 6/8)
 * @property {number} [beatUnit] the note value that gets the beat (4 = quarter)
 */

/**
 * @typedef {number[]} Beat   onset offsets in [0,1); [] = silent/sustained
 * @typedef {Beat[]}   Measure one entry per beat in the bar
 */

/**
 * @typedef {Object} Rhythm
 * @property {Meter}     [meter]   optional time-signature metadata
 * @property {Measure[]} measures  the bars, in reading order
 */

/**
 * @typedef {Object} MeterGateResult
 * @property {boolean}  pass   true iff the student's structural meter matches.
 * @property {string}   reason one of METER_GATE.* explaining a failure (or PASS).
 * @property {number}   expectedBars
 * @property {number}   actualBars
 * @property {number[]} expectedBeatsPerMeasure per-bar beat counts (expected)
 * @property {number[]} actualBeatsPerMeasure   per-bar beat counts (student)
 * @property {number}   [firstBadMeasure] 1-based index of the first bar whose
 *                                        beat count differs (when applicable)
 */

/**
 * The HARD GATE. Validates the student's bar count and per-measure beat counts
 * (and declared meter signature, when both sides declare one) BEFORE any
 * per-beat scoring. A failure here is reported distinctly and short-circuits
 * the per-beat grade (the research: "check correct beats-per-measure *before*
 * scoring beats").
 *
 * @param {Rhythm} expected
 * @param {Rhythm} student
 * @returns {MeterGateResult}
 */
export function checkMeterGate(expected, student) {
  const exMeasures = expected && Array.isArray(expected.measures) ? expected.measures : null;
  const stMeasures = student && Array.isArray(student.measures) ? student.measures : null;

  const expectedBeatsPerMeasure = exMeasures ? exMeasures.map(beatCount) : [];
  const actualBeatsPerMeasure = stMeasures ? stMeasures.map(beatCount) : [];

  /** @type {MeterGateResult} */
  const base = {
    pass: false,
    reason: METER_GATE.MALFORMED,
    expectedBars: expectedBeatsPerMeasure.length,
    actualBars: actualBeatsPerMeasure.length,
    expectedBeatsPerMeasure,
    actualBeatsPerMeasure,
  };

  if (!exMeasures || !stMeasures) return base;

  // 0) Empty-input gate: if the expected answer has ZERO total beats there is
  //    nothing to grade. Two empty rhythms would otherwise pass every later check
  //    (0 bars == 0 bars, no beat-count mismatch) and the grader's totalBeats==0
  //    branch would return a vacuous 100. Fail the gate instead → score 0.
  const totalExpectedBeats = expectedBeatsPerMeasure.reduce((s, n) => s + n, 0);
  if (totalExpectedBeats === 0) {
    return { ...base, reason: METER_GATE.EMPTY };
  }

  // 1) Declared meter signature, only if BOTH declare one (metadata cross-check).
  const em = expected.meter;
  const sm = student.meter;
  if (em && sm) {
    if (
      (em.beatsPerMeasure != null && sm.beatsPerMeasure != null && em.beatsPerMeasure !== sm.beatsPerMeasure) ||
      (em.beatUnit != null && sm.beatUnit != null && em.beatUnit !== sm.beatUnit)
    ) {
      return { ...base, reason: METER_GATE.METER_SIGNATURE };
    }
  }

  // 2) Bar count.
  if (expectedBeatsPerMeasure.length !== actualBeatsPerMeasure.length) {
    return { ...base, reason: METER_GATE.BAR_COUNT };
  }

  // 3) Per-measure beat count (beats-per-measure), bar by bar.
  for (let i = 0; i < expectedBeatsPerMeasure.length; i++) {
    if (expectedBeatsPerMeasure[i] !== actualBeatsPerMeasure[i]) {
      return { ...base, reason: METER_GATE.BEATS_PER_MEASURE, firstBadMeasure: i + 1 };
    }
  }

  return { ...base, pass: true, reason: METER_GATE.PASS };
}

/* ======================================================================== *
 *  CONSISTENT ±1 DISPLACEMENT DETECTOR                                      *
 * ======================================================================== */

/**
 * @typedef {Object} UniformShift
 * @property {boolean} detected true iff the student's answer is the expected
 *                              answer shifted uniformly by a single nonzero,
 *                              bounded amount.
 * @property {number}  steps    the uniform shift in grid steps (signed; the
 *                              amount EVERY onset is displaced by). 0 when not
 *                              detected.
 */

/**
 * Detect a CONSISTENT displacement: every onset of the student's answer is the
 * corresponding expected onset moved by the SAME signed grid amount `d`
 * (0 < |d| ≤ MAX_UNIFORM_SHIFT_STEPS). When true, the student performed the
 * right rhythm but uniformly early/late by one position — a single systematic
 * error that must be penalized ONCE, not per beat.
 *
 * Requires: same onset COUNT on both sides (a uniform shift neither adds nor
 * drops attacks) and a constant delta across ALL onsets (in sorted order).
 *
 * NOTE: only meaningful once the meter gate has passed (same total beats), so
 * the absolute grids are comparable. Caller guards this.
 *
 * @param {Measure[]} expectedMeasures
 * @param {Measure[]} studentMeasures
 * @returns {UniformShift}
 */
export function detectUniformShift(expectedMeasures, studentMeasures) {
  const ex = absoluteOnsetGrid(expectedMeasures);
  const st = absoluteOnsetGrid(studentMeasures);

  const none = { detected: false, steps: 0 };
  if (ex.length === 0 || ex.length !== st.length) return none;

  const d = st[0] - ex[0];
  if (d === 0) return none; // identical, not a shift
  if (Math.abs(d) > MAX_UNIFORM_SHIFT_STEPS) return none; // too far to be a "displacement"

  for (let i = 1; i < ex.length; i++) {
    if (st[i] - ex[i] !== d) return none; // not consistent
  }
  return { detected: true, steps: d };
}

/* ======================================================================== *
 *  THE GRADER                                                              *
 * ======================================================================== */

/**
 * @typedef {Object} BeatVerdict
 * @property {number}    measure 1-based measure index
 * @property {number}    beat    1-based beat index within the measure
 * @property {boolean}   correct exact match?
 * @property {string}    verdict one of BEAT_VERDICT.*
 * @property {number[]}  expected normalized expected onset grid indices
 * @property {number[]}  actual   normalized student onset grid indices
 */

/**
 * @typedef {Object} MeasureVerdict
 * @property {number}  measure 1-based index
 * @property {boolean} pass    true iff EVERY beat in the bar is correct
 * @property {number}  beatsCorrect
 * @property {number}  beats   total beats in the bar
 */

/**
 * @typedef {Object} GradeResult
 * @property {boolean}        passedMeterGate  did the hard gate pass?
 * @property {MeterGateResult} meterGate       full gate detail (distinct reason)
 * @property {BeatVerdict[]}  beats            per-beat verdicts (empty if gated out)
 * @property {MeasureVerdict[]} measures       per-measure pass/fail
 * @property {number}         beatsCorrect     count of fully-correct beats
 * @property {number}         totalBeats       total scored beats
 * @property {number}         score            overall 0..100 = % beats correct,
 *                                             after the single uniform-shift
 *                                             deduction (if any). 0 if gated out.
 * @property {UniformShift}   uniformShift     shift detector result
 * @property {boolean}        uniformShiftPenalized was the single deduction applied?
 */

/**
 * Grade a NOTATED rhythm dictation answer against the expected answer.
 *
 * Pipeline:
 *   1. METER HARD GATE (checkMeterGate). On failure ⇒ score 0, no per-beat
 *      grading, `passedMeterGate=false`, distinct `meterGate.reason`.
 *   2. UNIFORM ±1 SHIFT detection (detectUniformShift). If the whole answer is
 *      one consistent displacement, we grade against the EXPECTED but apply a
 *      single bounded deduction instead of failing every beat.
 *   3. PER-BEAT ALL-OR-NOTHING scoring: each beat correct iff its normalized
 *      onset set equals the expected's exactly (no partial credit in a beat).
 *   4. overall score = correctBeats / totalBeats × 100, then subtract the
 *      uniform-shift deduction once (in beat-units), clamped to [0,100].
 *
 * @param {Rhythm} expected the answer key
 * @param {Rhythm} student  the student's notated answer (same shape)
 * @returns {GradeResult}
 */
export function gradeDictation(expected, student) {
  const meterGate = checkMeterGate(expected, student);

  // ---- 1. HARD GATE ----
  if (!meterGate.pass) {
    return {
      passedMeterGate: false,
      meterGate,
      beats: [],
      measures: [],
      beatsCorrect: 0,
      totalBeats: 0,
      score: 0,
      uniformShift: { detected: false, steps: 0 },
      uniformShiftPenalized: false,
    };
  }

  const exMeasures = expected.measures;
  const stMeasures = student.measures;

  // ---- 2. UNIFORM ±1 SHIFT ----
  // If the student's whole answer is the expected answer displaced by one
  // consistent amount, that's a SINGLE systematic error. Penalize once: grade
  // each beat against the expected (so the shifted beats read as wrong on their
  // own), then OVERRIDE with the single-deduction path so we don't fail every
  // beat. We report the true per-beat verdicts but compute the score as
  // "all-but-one correct".
  const uniformShift = detectUniformShift(exMeasures, stMeasures);

  // ---- 3. PER-BEAT ALL-OR-NOTHING ----
  /** @type {BeatVerdict[]} */
  const beats = [];
  /** @type {MeasureVerdict[]} */
  const measures = [];
  let beatsCorrect = 0;
  let totalBeats = 0;

  for (let mi = 0; mi < exMeasures.length; mi++) {
    const exMeasure = exMeasures[mi];
    const stMeasure = stMeasures[mi];
    let measBeatsCorrect = 0;
    const nBeats = exMeasure.length;

    for (let bi = 0; bi < nBeats; bi++) {
      const exBeat = normalizeBeat(exMeasure[bi]);
      const stBeat = normalizeBeat(stMeasure[bi]);
      const correct = beatsEqual(exBeat, stBeat);

      let verdict;
      if (correct) verdict = BEAT_VERDICT.CORRECT;
      else if (exBeat.length === 0 && stBeat.length > 0) verdict = BEAT_VERDICT.EXTRA;
      else if (exBeat.length > 0 && stBeat.length === 0) verdict = BEAT_VERDICT.MISSING;
      else verdict = BEAT_VERDICT.WRONG;

      beats.push({
        measure: mi + 1,
        beat: bi + 1,
        correct,
        verdict,
        expected: exBeat,
        actual: stBeat,
      });

      totalBeats += 1;
      if (correct) {
        beatsCorrect += 1;
        measBeatsCorrect += 1;
      }
    }

    measures.push({
      measure: mi + 1,
      pass: nBeats > 0 ? measBeatsCorrect === nBeats : true,
      beatsCorrect: measBeatsCorrect,
      beats: nBeats,
    });
  }

  // ---- 4. SCORE ----
  let scoreBeats; // numerator in beat-units
  let uniformShiftPenalized = false;

  if (uniformShift.detected && beatsCorrect < totalBeats) {
    // The answer is the right rhythm, uniformly displaced. Charge ONE bounded
    // deduction instead of failing every shifted beat. Charge it against the
    // ACHIEVED per-beat score, not against full marks: take the BETTER of
    //   (a) the beats that genuinely matched as-is, and
    //   (b) full marks minus the single shift penalty.
    // This way already-correct beats are never thrown away (a 3-of-4-correct
    // answer with a shift on the 4th can't drop to a flat 75), and a wholly
    // shifted answer still gets the single-deduction "all-but-one" treatment.
    scoreBeats = Math.max(beatsCorrect, totalBeats - UNIFORM_SHIFT_PENALTY_BEATS);
    uniformShiftPenalized = true;
  } else {
    scoreBeats = beatsCorrect;
  }

  const score = totalBeats > 0 ? Math.round((scoreBeats / totalBeats) * 100) : 100;

  return {
    passedMeterGate: true,
    meterGate,
    beats,
    measures,
    beatsCorrect,
    totalBeats,
    score: Math.max(0, Math.min(100, score)),
    uniformShift,
    uniformShiftPenalized,
  };
}

export default gradeDictation;
