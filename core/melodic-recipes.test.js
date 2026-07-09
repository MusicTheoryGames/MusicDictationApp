import test from 'node:test';
import assert from 'node:assert/strict';

import { melodicLevel } from './melodic-curriculum.js';
import { recipeForLevel, recipeForRound } from './melodic-recipes.js';

test('recipeForLevel derives a stable generator recipe from the canonical level', () => {
  const L = melodicLevel('m5');
  const recipe = recipeForLevel(L);

  assert.equal(recipe.levelId, 'm5');
  assert.equal(recipe.source, 'generated');
  assert.equal(recipe.rhythmSource.system, 'Hall');
  assert.deepEqual([...recipe.rhythmSource.refs], ['ch3', 'ch4']);
  assert.deepEqual([...recipe.pitchSkill.degrees], [1, 2, 3, 4, 5]);
  assert.deepEqual([...recipe.rendererModes], ['labeling', 'recognition']);
  assert.equal(recipe.phrase.bars, 2);
  assert.ok(Object.isFrozen(recipe));
  assert.ok(Object.isFrozen(recipe.pitchSkill.degrees));
});

test('recipeForRound records the concrete rotating choices without changing the level recipe', () => {
  const L = melodicLevel('m8_5');
  const recipe = recipeForRound(L, {
    key: 'G',
    mode: 'major',
    meter: '2/4',
    bars: 4,
    hallRhythmRef: 'ch6',
    exerciseMode: 'protonotation',
    degrees: [1, 2, 3],
    leaps: ['step'],
  });

  assert.equal(recipe.levelId, 'm8_5');
  assert.equal(recipe.active.key, 'G');
  assert.equal(recipe.active.bars, 4);
  assert.equal(recipe.active.hallRhythmRef, 'ch6');
  assert.deepEqual([...recipe.active.degrees], [1, 2, 3]);
  assert.deepEqual([...recipe.pitchSkill.degrees], [1, 2, 3, 4, 5]);
  assert.ok(Object.isFrozen(recipe.active));
});

test('recipeForLevel surfaces advanced generator features', () => {
  const L = melodicLevel('m22');
  const recipe = recipeForLevel(L);

  assert.ok(recipe.features.includes('secondary-dominant'));
  assert.ok(recipe.cadence.finalDegrees.includes(1));
});
