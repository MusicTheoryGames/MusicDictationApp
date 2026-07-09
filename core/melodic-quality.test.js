import test from 'node:test';
import assert from 'node:assert/strict';

import { melodicLevel } from './melodic-curriculum.js';
import { generateMelody } from './melodic.js';
import { recipeForRound } from './melodic-recipes.js';
import { qualityContextFromRecipe, scoreMelodyQuality } from './melodic-quality.js';

function note(degree, midi, duration = 'q') {
  return Object.freeze({ degree, alter: 0, midi, duration, pitch: 'c/4' });
}

test('scoreMelodyQuality rewards singable, cadential melodies over zig-zagging weak endings', () => {
  const good = Object.freeze({
    key: 'C',
    mode: 'major',
    meter: '2/4',
    tonicMidi: 60,
    notes: Object.freeze([
      note(1, 60), note(2, 62), note(3, 64), note(2, 62),
      note(3, 64), note(2, 62), note(1, 60), note(1, 60),
    ]),
  });
  const bad = Object.freeze({
    key: 'C',
    mode: 'major',
    meter: '2/4',
    tonicMidi: 60,
    notes: Object.freeze([
      note(1, 60), note(7, 71), note(2, 62), note(6, 69),
      note(1, 60), note(7, 71), note(2, 62), note(6, 69),
    ]),
  });
  const ctx = { allowedDegrees: [1, 2, 3, 4, 5, 6, 7], allowedLeaps: ['step', '3rd', 'P4', 'P5', '6th', '7th'], finalDegrees: [1] };

  const goodScore = scoreMelodyQuality(good, ctx);
  const badScore = scoreMelodyQuality(bad, ctx);

  assert.ok(goodScore.score > badScore.score, `${goodScore.score} should beat ${badScore.score}`);
  assert.equal(goodScore.flags.includes('weak-cadence'), false);
  assert.equal(badScore.flags.includes('weak-cadence'), true);
});

test('qualityContextFromRecipe maps curriculum constraints into scorer constraints', () => {
  const L = melodicLevel('m5');
  const recipe = recipeForRound(L, { key: 'C', mode: 'major', meter: '3/4', hallRhythmRef: 'ch4' });
  const ctx = qualityContextFromRecipe(recipe);

  assert.deepEqual(ctx.allowedDegrees, [1, 2, 3, 4, 5]);
  assert.deepEqual(ctx.allowedLeaps, ['step', '3rd', 'P5']);
  assert.deepEqual(ctx.finalDegrees, [1]);
  assert.ok(ctx.maxRangeSemitones >= 7);
});

test('scoreMelodyQuality works on real generated melodies and stays deterministic', () => {
  const spec = {
    key: 'C',
    mode: 'major',
    degrees: [1, 2, 3, 4, 5],
    leaps: ['step', '3rd', 'P5'],
    range: { lowMidi: 55, highMidi: 67 },
    meter: '3/4',
    hallRhythmRef: 'ch4',
    lengthBars: 2,
    startOn: 'tonic',
    seed: 42,
  };
  const melody = generateMelody(spec);
  const ctx = { allowedDegrees: spec.degrees, allowedLeaps: spec.leaps, finalDegrees: [1] };

  assert.deepEqual(scoreMelodyQuality(melody, ctx), scoreMelodyQuality(melody, ctx));
  assert.ok(scoreMelodyQuality(melody, ctx).score > 0);
});
