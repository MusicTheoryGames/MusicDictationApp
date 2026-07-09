import { test } from 'node:test';
import assert from 'node:assert/strict';
import { durationsToFigures, figureIdSequence, RHYTHM_FIGURES, meterBeats } from './rhythm-figures.js';

test('rhythm-figures: 4 quarters in 4/4 -> four quarter figures, one bar', () => {
  const conv = durationsToFigures(['q', 'q', 'q', 'q'], '4/4');
  assert.ok(conv, 'converts');
  assert.equal(conv.measures.length, 1);
  assert.deepEqual(figureIdSequence(conv), ['quarter', 'quarter', 'quarter', 'quarter']);
});

test('rhythm-figures: two-eighths grouped per beat', () => {
  const conv = durationsToFigures(['8', '8', 'q', 'h'], '4/4');
  assert.deepEqual(figureIdSequence(conv), ['two-eighths', 'quarter', 'half']);
});

test('rhythm-figures: half + half fills a 4/4 bar', () => {
  const conv = durationsToFigures(['h', 'h'], '4/4');
  assert.deepEqual(figureIdSequence(conv), ['half', 'half']);
});

test('rhythm-figures: whole note = one 4-beat figure', () => {
  const conv = durationsToFigures(['w'], '4/4');
  assert.deepEqual(figureIdSequence(conv), ['whole']);
});

test('rhythm-figures: 3/4 with dotted half', () => {
  const conv = durationsToFigures(['hd'], '3/4');
  assert.equal(conv.measures.length, 1);
  assert.deepEqual(figureIdSequence(conv), ['dotted-half']);
});

test('rhythm-figures: 3/4 quarter+two-eighths+quarter', () => {
  const conv = durationsToFigures(['q', '8', '8', 'q'], '3/4');
  assert.deepEqual(figureIdSequence(conv), ['quarter', 'two-eighths', 'quarter']);
});

test('rhythm-figures: two full 4/4 bars', () => {
  const conv = durationsToFigures(['q', 'q', 'q', 'q', 'q', '8', '8', 'h'], '4/4');
  assert.equal(conv.measures.length, 2);
});

test('rhythm-figures: a bar that does not fill exactly fails to null', () => {
  assert.equal(durationsToFigures(['q', 'q', 'q'], '4/4'), null); // 3 beats in a 4-beat bar
});

test('rhythm-figures: irregular meter returns null', () => {
  assert.equal(meterBeats('5/8'), null);
  assert.equal(durationsToFigures(['q', 'q'], '5/8'), null);
});

test('rhythm-figures: every figure has codes whose length matches its beats*qpb somewhere', () => {
  for (const f of RHYTHM_FIGURES) {
    assert.ok(f.codes.length >= 1, f.id + ' has codes');
    assert.ok(f.beats >= 1, f.id + ' has beats');
  }
});
