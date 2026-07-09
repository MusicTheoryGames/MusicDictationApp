/**
 * @file core/protonotation.test.js
 * Sweeps for the PROTONOTATION grader (research/MELODIC_DICTATION_RESEARCH.md §2.2, §3):
 * the three sub-scores are INDEPENDENT (stage isolation), count is a hard gate on
 * `correct`, and mismatched lengths never throw. Pure + deterministic (no rng needed
 * — the grader is a total function of sketch + melody).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  gradeProtonotation,
  contourOf,
  PROTONOTATION_WEIGHTS,
  PROTONOTATION_PASS_THRESHOLD,
} from './protonotation.js';

/* A small fake melody literal: degrees 1 2 3 2 1 (up up down down), all quarters,
 * C major. Only .degree and .duration are read by the grader; the shape matches
 * core/melodic.js's Melody enough for the grader's contract. */
const MELODY = Object.freeze({
  key: 'C',
  mode: 'major',
  meter: '4/4',
  tonicMidi: 60,
  notes: [
    { degree: 1, duration: 'q' },
    { degree: 2, duration: 'q' },
    { degree: 3, duration: 'q' },
    { degree: 2, duration: 'q' },
    { degree: 1, duration: 'q' },
  ],
});

/** Convenience: build a sketch of degrees with the CORRECT contours derived from them. */
function sketchFromDegrees(degrees) {
  return {
    entries: degrees.map((d, i) => ({
      degree: d,
      contour: i === 0 ? null : contourOf(degrees[i - 1], degrees[i]),
    })),
  };
}

test('protonotation: contourOf is pure up/down/same on degree numbers', () => {
  assert.equal(contourOf(1, 2), 'up');
  assert.equal(contourOf(3, 2), 'down');
  assert.equal(contourOf(2, 2), 'same');
});

test('protonotation: a PERFECT sketch scores overall 1 and correct true', () => {
  const sketch = sketchFromDegrees([1, 2, 3, 2, 1]);
  const r = gradeProtonotation(sketch, MELODY);
  assert.equal(r.degreeAccuracy, 1);
  assert.equal(r.contourAccuracy, 1);
  assert.equal(r.countAccuracy, 1);
  assert.equal(r.overall, 1);
  assert.equal(r.correct, true);
  // per-note breakdown: every degree right, every move (index>=1) right.
  assert.equal(r.perNote.length, 5);
  assert.ok(r.perNote.every((p) => p.degreeRight === true));
  assert.equal(r.perNote[0].contourRight, null); // no move into the first note
  assert.ok(r.perNote.slice(1).every((p) => p.contourRight === true));
});

test('protonotation: ONE wrong degree drops degreeAccuracy to 4/5, contour still perfect', () => {
  // Student wrote degree 4 instead of 3 at index 2 — but the CONTOUR they marked is
  // still the true melody's contour (stage isolation: a pitch slip must not corrupt
  // the contour sub-score).
  const sketch = {
    entries: [
      { degree: 1, contour: null },
      { degree: 2, contour: 'up' },
      { degree: 4, contour: 'up' },   // wrong degree, right direction
      { degree: 2, contour: 'down' },
      { degree: 1, contour: 'down' },
    ],
  };
  const r = gradeProtonotation(sketch, MELODY);
  assert.equal(r.degreeAccuracy, 4 / 5);
  assert.equal(r.contourAccuracy, 1); // contour untouched
  assert.equal(r.countAccuracy, 1);
  assert.equal(r.perNote[2].degreeRight, false);
  assert.equal(r.perNote[2].contourRight, true);
  // overall = .5*.8 + .3*1 + .2*1 = .9 ; passes.
  assert.ok(Math.abs(r.overall - 0.9) < 1e-9);
  assert.equal(r.correct, true);
});

test('protonotation: a FLIPPED contour drops contourAccuracy but not degreeAccuracy', () => {
  // Degrees all correct; but the move INTO note index 2 is marked 'down' when the
  // true melody goes up (2->3). One of the 4 moves is wrong ⇒ contour 3/4.
  const sketch = {
    entries: [
      { degree: 1, contour: null },
      { degree: 2, contour: 'up' },
      { degree: 3, contour: 'down' }, // flipped: true is 'up'
      { degree: 2, contour: 'down' },
      { degree: 1, contour: 'down' },
    ],
  };
  const r = gradeProtonotation(sketch, MELODY);
  assert.equal(r.degreeAccuracy, 1);   // degrees untouched
  assert.equal(r.contourAccuracy, 3 / 4);
  assert.equal(r.perNote[2].degreeRight, true);
  assert.equal(r.perNote[2].contourRight, false);
});

test('protonotation: a TOO-SHORT sketch penalizes count and cannot be correct', () => {
  // Only 3 of 5 notes sketched (degrees 1,2,3), all correct over the overlap.
  const sketch = sketchFromDegrees([1, 2, 3]);
  const r = gradeProtonotation(sketch, MELODY);
  assert.ok(r.countAccuracy < 1, 'count penalized for wrong length');
  assert.equal(r.countAccuracy, 1 - 2 / 5); // |3-5| / 5 = 0.4 off ⇒ 0.6
  // degree scored over the overlap only: 3/3 correct.
  assert.equal(r.degreeAccuracy, 1);
  // contour is over the TRUE 4 moves; the student only supplied 2 of them (into
  // notes 1 and 2), both correct ⇒ 2/4.
  assert.equal(r.contourAccuracy, 2 / 4);
  assert.equal(r.correct, false, 'exact count is a hard gate on correct');
  assert.equal(r.perNote.length, 3, 'per-note only over the overlap');
});

test('protonotation: a CONTOUR-ONLY sketch (all degree null) gives no NaN', () => {
  // Student marked only directions, wrote no degree numbers. degreeAccuracy must be
  // a finite 0 (nothing identified), NOT NaN from a 0/0 division.
  const sketch = {
    entries: [
      { degree: null, contour: null },
      { degree: null, contour: 'up' },
      { degree: null, contour: 'up' },
      { degree: null, contour: 'down' },
      { degree: null, contour: 'down' },
    ],
  };
  const r = gradeProtonotation(sketch, MELODY);
  assert.equal(Number.isNaN(r.degreeAccuracy), false);
  assert.equal(r.degreeAccuracy, 0);
  assert.equal(r.contourAccuracy, 1);  // all 4 directions correct
  assert.equal(r.countAccuracy, 1);
  assert.ok(r.perNote.every((p) => p.degreeRight === null), 'degree not scored');
  // overall = .5*0 + .3*1 + .2*1 = .5 ; below threshold ⇒ not correct.
  assert.ok(Math.abs(r.overall - 0.5) < 1e-9);
  assert.equal(r.correct, false);
});

test('protonotation: a TOO-LONG sketch also penalizes count and is not correct', () => {
  const sketch = sketchFromDegrees([1, 2, 3, 2, 1, 2]); // one extra note
  const r = gradeProtonotation(sketch, MELODY);
  assert.equal(r.countAccuracy, 1 - 1 / 5); // 0.8
  assert.equal(r.degreeAccuracy, 1);        // overlap all correct
  assert.equal(r.contourAccuracy, 1);       // all 4 true moves supplied + correct
  assert.equal(r.correct, false);
});

test('protonotation: mismatched / empty / garbage input NEVER throws', () => {
  assert.doesNotThrow(() => gradeProtonotation({ entries: [] }, MELODY));
  assert.doesNotThrow(() => gradeProtonotation(null, MELODY));
  assert.doesNotThrow(() => gradeProtonotation(undefined, undefined));
  assert.doesNotThrow(() => gradeProtonotation({}, {}));
  const empty = gradeProtonotation({ entries: [] }, MELODY);
  assert.equal(empty.degreeAccuracy, 0);
  assert.equal(empty.contourAccuracy, 0); // 0 of 4 true moves supplied
  assert.equal(empty.countAccuracy, 0);   // |0-5|/5 = 1 off ⇒ 0
  assert.equal(empty.correct, false);
});

test('protonotation: weights + threshold are the documented constants', () => {
  assert.equal(PROTONOTATION_WEIGHTS.degree, 0.5);
  assert.equal(PROTONOTATION_WEIGHTS.contour, 0.3);
  assert.equal(PROTONOTATION_WEIGHTS.count, 0.2);
  assert.equal(
    PROTONOTATION_WEIGHTS.degree + PROTONOTATION_WEIGHTS.contour + PROTONOTATION_WEIGHTS.count,
    1,
  );
  assert.equal(PROTONOTATION_PASS_THRESHOLD, 0.8);
});
