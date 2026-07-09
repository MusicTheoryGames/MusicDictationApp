/**
 * @file core/melodic-recipes.js
 * @module core/melodic-recipes
 *
 * A small, explicit "recipe" layer over the existing MelodyQuest curriculum data.
 * The level remains canonical; a recipe is the generator-facing summary of what a
 * round is allowed to use and why.
 */

function uniq(items) {
  return Array.from(new Set((items || []).filter((x) => x !== undefined && x !== null)));
}

function clonePairs(items) {
  return (items || []).map((x) => ({ key: x.key, mode: x.mode }));
}

function slug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function featureList(L) {
  const out = [];
  if (L.chromaticPassingTone) out.push('chromatic-passing-tone');
  if (L.modalMixture) out.push('modal-mixture');
  if (L.secondaryDominant) out.push('secondary-dominant');
  if (L.modulation) out.push('modulation-' + L.modulation);
  for (const coll of L.symmetricCollections || []) out.push('collection-' + coll);
  return out;
}

/**
 * Build the stable recipe for a curriculum level.
 *
 * @param {Object} L melodic level object
 * @returns {Object}
 */
export function recipeForLevel(L) {
  if (!L || typeof L !== 'object') throw new TypeError('recipeForLevel: level required');
  const refs = uniq(L.hallRhythmRefs || [L.hallRhythmRef]);
  const meters = uniq(L.meters || [L.meter]);
  const modes = uniq((L.keys || []).map((x) => x.mode).concat(L.mode));
  const keys = clonePairs(L.keys || [{ key: L.key, mode: L.mode }]);
  const exerciseModes = uniq(L.exerciseModes || [L.exerciseMode]);
  const features = featureList(L);

  return Object.freeze({
    recipeId: 'mq-' + L.id + '-' + slug(L.title || L.id),
    levelId: L.id,
    mIndex: L.mIndex,
    title: L.title,
    source: 'generated',
    rhythmSource: Object.freeze({
      system: 'Hall',
      refs: Object.freeze(refs.slice()),
      softGateHall: L.softGateHall || L.hallRhythmRef || refs[0] || null,
    }),
    pitchSkill: Object.freeze({
      degrees: Object.freeze(((L.pitch && L.pitch.degrees) || []).slice()),
      leaps: Object.freeze(((L.pitch && L.pitch.leaps) || []).slice()),
      range: Object.freeze({
        lowMidi: L.pitch && L.pitch.range ? L.pitch.range.lowMidi : null,
        highMidi: L.pitch && L.pitch.range ? L.pitch.range.highMidi : null,
      }),
      startOn: L.pitch && L.pitch.startOn ? L.pitch.startOn : 'tonic',
      keys: Object.freeze(keys),
      modes: Object.freeze(modes),
    }),
    phrase: Object.freeze({
      bars: L.lengthBars || 2,
      meters: Object.freeze(meters.slice()),
    }),
    cadence: Object.freeze({
      finalDegrees: Object.freeze(L.modulation ? [5, 1] : [1]),
      strategy: L.modulation ? 'modulating-period' : 'tonic-close',
    }),
    rendererModes: Object.freeze(exerciseModes.slice()),
    features: Object.freeze(features),
  });
}

/**
 * Build a concrete recipe snapshot for a single generated round. This keeps the
 * level recipe intact while recording the actual rotating key/meter/ref/mode the
 * student saw.
 *
 * @param {Object} L melodic level object
 * @param {Object} roundSpec concrete round settings
 * @returns {Object}
 */
export function recipeForRound(L, roundSpec = {}) {
  const base = recipeForLevel(L);
  return Object.freeze({
    ...base,
    active: Object.freeze({
      key: roundSpec.key || L.key,
      mode: roundSpec.mode || L.mode,
      meter: roundSpec.meter || L.meter,
      bars: roundSpec.bars || base.phrase.bars,
      hallRhythmRef: roundSpec.hallRhythmRef || L.hallRhythmRef,
      exerciseMode: roundSpec.exerciseMode || L.exerciseMode,
      degrees: Object.freeze((roundSpec.degrees || base.pitchSkill.degrees).slice()),
      leaps: Object.freeze((roundSpec.leaps || base.pitchSkill.leaps).slice()),
      collection: roundSpec.collection || null,
    }),
  });
}

export default {
  recipeForLevel,
  recipeForRound,
};
