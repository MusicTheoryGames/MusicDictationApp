/**
 * @file core/feedback.test.js
 * Tests for the stage-isolated dictation-feedback classifier (NEW-F).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyDictation } from './feedback.js';

test('feedback: a perfect answer is clean', () => {
  const r = classifyDictation({ trueDegrees: [1, 2, 3, 2, 1], answerDegrees: [1, 2, 3, 2, 1] });
  assert.equal(r.stage, 'clean');
});

test('feedback: rhythm is named first when it is the weaker, imperfect channel', () => {
  const r = classifyDictation({
    trueDegrees: [1, 2, 3], answerDegrees: [1, 2, 3], rhythmAccuracy: 0.6, pitchAccuracy: 1,
  });
  assert.equal(r.stage, 'rhythm');
});

test('feedback: wrong note count is its own stage', () => {
  const r = classifyDictation({ trueDegrees: [1, 2, 3, 4], answerDegrees: [1, 2, 3] });
  assert.equal(r.stage, 'count');
  assert.equal(r.counts.wrote, 3);
  assert.equal(r.counts.actual, 4);
});

test('feedback: a flipped direction is a contour failure', () => {
  // truth goes 1→2 (up); answer writes 1 then 5 then... make the wrong note reverse direction
  // truth: 1 2 3 (all up). answer: 1 2 1 → last move down instead of up = contour flip.
  const r = classifyDictation({ trueDegrees: [1, 2, 3], answerDegrees: [1, 2, 1] });
  assert.equal(r.stage, 'contour');
});

test('feedback: losing home (tonic) is its own stage', () => {
  // truth ends on tonic 1; answer keeps direction but confuses the tonic itself.
  // truth: 3 2 1 (down, down, landing home). answer: 3 2 2 → wrong note is where 1̂ was,
  // same downward-then-flat; the miss involves the tonic.
  const r = classifyDictation({ trueDegrees: [5, 3, 1], answerDegrees: [5, 3, 1 === 1 ? 1 : 1] });
  // construct a real tonic-confusion: truth [5,3,1], answer [5,3,2] (missed the tonic, direction still down)
  const r2 = classifyDictation({ trueDegrees: [5, 3, 1], answerDegrees: [5, 3, 2] });
  assert.equal(r2.stage, 'tonic');
});

test('feedback: shape right but exact degree off = degree precision', () => {
  // truth: 1 3 5 (up, up). answer: 1 2 5 → note 2 wrong (2 vs 3) but still UP from 1; not tonic.
  const r = classifyDictation({ trueDegrees: [1, 3, 5], answerDegrees: [1, 2, 5] });
  assert.equal(r.stage, 'degree');
});

test('feedback: never throws on empty / malformed input', () => {
  assert.doesNotThrow(() => classifyDictation({}));
  assert.doesNotThrow(() => classifyDictation({ trueDegrees: [1], answerDegrees: [] }));
  const r = classifyDictation({ trueDegrees: [], answerDegrees: [] });
  assert.equal(r.stage, 'clean');
});

test('feedback: every result carries a headline + tip string', () => {
  const cases = [
    { trueDegrees: [1, 2, 3], answerDegrees: [1, 2, 3] },
    { trueDegrees: [1, 2, 3], answerDegrees: [1, 2, 1] },
    { trueDegrees: [1, 2, 3, 4], answerDegrees: [1, 2, 3] },
  ];
  for (const c of cases) {
    const r = classifyDictation(c);
    assert.equal(typeof r.headline, 'string');
    assert.ok(r.headline.length > 0);
    assert.equal(typeof r.tip, 'string');
    assert.ok(r.tip.length > 0);
  }
});
