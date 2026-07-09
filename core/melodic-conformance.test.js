/**
 * @file core/melodic-conformance.test.js
 * CONFORMANCE_AUDIT.md §C7 — the sweep that verifies the curriculum DATA and
 * the GENERATOR can actually serve everything MELODIC_CURRICULUM.md prescribes:
 * every level × every meters[] × every hallRhythmRefs[] × its lengthBars
 * produces a valid, bar-filling melody. This is the test that would have caught
 * the single-meter / single-chapter / 2-bar under-encodings the day they were
 * written.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { melodicLadder, DEGREE_INTRO_MINDEX, LEAP_INTRO_MINDEX, M0_OCTAVE_EQUIV_STAGE } from './melodic-curriculum.js';
import {
  generateMelody, generateModulatingMelody, generateSymmetricMelody,
  DURATION_QUARTERS,
} from './melodic.js';

const barQuarters = (meter) => {
  const [top, bot] = meter.split('/').map(Number);
  return top * (4 / bot);
};

test('conformance: every level declares a sane pitch range (low < high, not absurdly wide)', () => {
  // pitch.range is a key-fitting constraint (wide enough for the level's transposition keys),
  // NOT the difficulty knob — melodic width is enforced by LEAP_INTRO_MINDEX. This just rejects
  // an inverted or absurd (> 3-octave) declared range that would signal a data typo.
  for (const L of melodicLadder()) {
    const r = L.pitch.range;
    assert.ok(r && Number.isFinite(r.lowMidi) && Number.isFinite(r.highMidi), L.id + ' has a numeric range');
    assert.ok(r.highMidi >= r.lowMidi, L.id + ' range is inverted (' + r.lowMidi + '..' + r.highMidi + ')'); // equal is OK (m2 is single-pitch rhythm-only)
    assert.ok(r.highMidi - r.lowMidi <= 36, L.id + ' range spans ' + (r.highMidi - r.lowMidi) + ' semitones (> 3 octaves — likely a typo)');
  }
});

test('conformance: octave equivalence is introduced only AFTER the single-octave home/degree stages (m0)', () => {
  // Stages 0-4 establish EXACT (single-octave) home + degrees; octave equivalence is a later,
  // explicitly-taught stage. If someone moves it earlier, this fails.
  assert.ok(Number.isInteger(M0_OCTAVE_EQUIV_STAGE) && M0_OCTAVE_EQUIV_STAGE > 4,
    'octave-equivalence must be a later m0 stage (after single-octave stages 0-4), got ' + M0_OCTAVE_EQUIV_STAGE);
});

test('conformance: no level uses a scale degree or leap before its introduction mIndex (vocabulary is monotonic)', () => {
  for (const L of melodicLadder()) {
    for (const d of (L.pitch.degrees || [])) {
      const intro = DEGREE_INTRO_MINDEX[d];
      assert.notStrictEqual(intro, undefined, L.id + ': degree ' + d + ' has no entry in DEGREE_INTRO_MINDEX');
      assert.ok(intro <= L.mIndex,
        L.id + ' (mIndex ' + L.mIndex + ') uses degree ' + d + ' but it is not introduced until mIndex ' + intro);
    }
    for (const lp of (L.pitch.leaps || [])) {
      const intro = LEAP_INTRO_MINDEX[lp];
      assert.notStrictEqual(intro, undefined, L.id + ": leap '" + lp + "' has no entry in LEAP_INTRO_MINDEX");
      assert.ok(intro <= L.mIndex,
        L.id + ' (mIndex ' + L.mIndex + ") uses leap '" + lp + "' but it is not introduced until mIndex " + intro);
    }
  }
});

test('conformance: every level declares its doc-prescribed modes/refs/length, containing the legacy single values', () => {
  for (const L of melodicLadder()) {
    assert.ok(Array.isArray(L.exerciseModes) && L.exerciseModes.length >= 1, L.id + ' exerciseModes');
    assert.ok(L.exerciseModes.includes(L.exerciseMode),
      L.id + ': legacy exerciseMode ' + L.exerciseMode + ' is one of the prescribed modes');
    assert.ok(Array.isArray(L.hallRhythmRefs) && L.hallRhythmRefs.length >= 1, L.id + ' hallRhythmRefs');
    assert.ok(L.hallRhythmRefs.includes(L.hallRhythmRef),
      L.id + ': legacy hallRhythmRef ' + L.hallRhythmRef + ' is in the prescribed range');
    assert.ok(Number.isInteger(L.lengthBars) && L.lengthBars >= 2, L.id + ' lengthBars');
  }
});

test('conformance: the generator serves every level x meter x Hall ref x material length (bar-filling)', () => {
  for (const L of melodicLadder()) {
    if (L.exerciseMode === 'two-part') continue; // two-voice engine has its own suite
    const meters = L.meters || [L.meter];
    const genLeaps = L.pitch.leaps && L.pitch.leaps.length ? L.pitch.leaps : ['step', '3rd'];
    for (const meter of meters) {
      for (const ref of L.hallRhythmRefs) {
        const spec = {
          key: L.keys[0].key, mode: L.keys[0].mode,
          degrees: L.pitch.degrees, leaps: genLeaps, range: L.pitch.range,
          meter, hallRhythmRef: ref, lengthBars: L.lengthBars,
          startOn: L.pitch.startOn || 'tonic', seed: 11,
          chromaticPassingTone: L.chromaticPassingTone, modalMixture: L.modalMixture,
          secondaryDominant: L.secondaryDominant,
        };
        const melody = L.modulation ? generateModulatingMelody({ ...spec, lengthBars: Math.max(4, L.lengthBars) })
          : generateMelody(spec);
        const q = melody.notes.reduce((s, n) => s + DURATION_QUARTERS[n.duration], 0);
        const wantBars = L.modulation ? Math.max(4, L.lengthBars) : L.lengthBars;
        assert.equal(q, wantBars * barQuarters(meter),
          `${L.id} ${meter} ${ref}: fills exactly ${wantBars} bars`);
      }
    }
    for (const coll of L.symmetricCollections || []) {
      const melody = generateSymmetricMelody({
        key: 'C', collection: coll, meter: L.meter, hallRhythmRef: L.hallRhythmRef,
        lengthBars: L.lengthBars, seed: 11, range: L.pitch.range,
      });
      assert.ok(melody.notes.length >= 3, `${L.id} ${coll}: symmetric melody generates`);
    }
  }
});
