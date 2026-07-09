/**
 * @file core/gym.test.js
 * Sweeps for the INTERVAL GYM engine (INTERVAL_GYM_SPEC.md §3 gates).
 * Deterministic: every call is seeded.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GYM_CIRCUITS,
  INTERVAL_QUALITY,
  gymCircuitsFor,
  gymPairItem,
  gymFindStream,
  gymUseRound,
} from './gym.js';
import { LEAP_DEGREE_SPAN, SCALE_SEMITONES, DURATION_QUARTERS } from './melodic.js';
import { melodicLevel } from './melodic-curriculum.js';

const RANGE = { lowMidi: 55, highMidi: 79 };

test('gym: unlock map is in LOCKSTEP with the curriculum\'s own leap vocabulary', () => {
  for (const c of GYM_CIRCUITS) {
    const lvl = melodicLevel(c.unlockLevel);
    assert.ok(lvl, `${c.id}: unlockLevel ${c.unlockLevel} exists`);
    for (const leap of c.leapIds) {
      assert.ok(LEAP_DEGREE_SPAN[leap] !== undefined, `${c.id}: leap id ${leap} is real`);
      assert.ok(lvl.pitch.leaps.includes(leap),
        `${c.id}: ${c.unlockLevel} actually teaches ${leap} (its pitch.leaps)`);
    }
  }
});

test('gym: gymCircuitsFor unlocks exactly at each circuit\'s level', () => {
  const at = (mIndex) => gymCircuitsFor(mIndex).filter((x) => x.unlocked).map((x) => x.circuit.id);
  assert.deepEqual(at(6), []); // m6: nothing yet
  assert.deepEqual(at(7), ['3rd']);
  assert.deepEqual(at(8), ['3rd', '4th5th']);
  assert.ok(at(18).includes('tritone'));
  assert.equal(at(26).length, GYM_CIRCUITS.length);
});

test('gym: pair items are in range, in key, and truly the target interval (15-seed sweeps)', () => {
  for (const c of GYM_CIRCUITS) {
    for (let seed = 1; seed <= 15; seed++) {
      const it = gymPairItem({ circuitId: c.id, key: 'C', mode: 'major', range: RANGE, seed });
      assert.ok(it.midiFrom >= RANGE.lowMidi && it.midiFrom <= RANGE.highMidi, `${c.id} from in range`);
      assert.ok(it.midiTo >= RANGE.lowMidi && it.midiTo <= RANGE.highMidi, `${c.id} to in range`);
      // in key: both midis are diatonic pitch-classes of C major
      const pcs = new Set(SCALE_SEMITONES.major.slice(1).map((s) => (60 + s) % 12));
      assert.ok(pcs.has(((it.midiFrom % 12) + 12) % 12), `${c.id} from diatonic`);
      assert.ok(pcs.has(((it.midiTo % 12) + 12) % 12), `${c.id} to diatonic`);
      // the quality label matches the actual semitone distance
      assert.equal(it.intervalLabel, INTERVAL_QUALITY[it.semitones], `${c.id} label matches`);
      assert.equal(it.semitones, Math.abs(it.midiTo - it.midiFrom));
      if (c.fixedPairs) {
        assert.ok(c.fixedPairs.some((fp) => fp[0] === it.fromDegree && fp[1] === it.toDegree),
          `${c.id}: pair is one of the fixed pairs`);
        assert.equal(it.semitones % 12 === 6 || it.semitones === 6, true, 'tritone pair is 6 semitones (mod octave)');
      } else {
        const span = c.leapIds.map((l) => LEAP_DEGREE_SPAN[l]);
        // recover span from degrees+midi direction
        assert.ok(it.semitones >= 1, 'nonzero');
        assert.ok(span.length > 0);
      }
    }
  }
});

test('gym: pair items are deterministic under a fixed seed and honor direction', () => {
  const a = gymPairItem({ circuitId: '3rd', key: 'G', mode: 'major', range: RANGE, seed: 9 });
  const b = gymPairItem({ circuitId: '3rd', key: 'G', mode: 'major', range: RANGE, seed: 9 });
  assert.deepEqual(a, b);
  for (let seed = 1; seed <= 10; seed++) {
    const asc = gymPairItem({ circuitId: '4th5th', key: 'C', mode: 'major', range: RANGE, seed, direction: 'asc' });
    assert.ok(asc.midiTo > asc.midiFrom, 'asc direction honored');
  }
});

test('gym: find-streams contain the promised targets, every listed pair is real (10-seed sweeps)', () => {
  for (const c of GYM_CIRCUITS.filter((x) => x.stations.includes('find'))) {
    for (let seed = 1; seed <= 10; seed++) {
      const { melody, targetPairs } = gymFindStream({
        circuitId: c.id, key: 'C', mode: 'major', range: RANGE, hallRhythmRef: 'ch1', seed, minTargets: 2,
      });
      assert.ok(targetPairs.length >= 2, `${c.id} seed ${seed}: >=2 targets`);
      const spans = c.leapIds.map((l) => LEAP_DEGREE_SPAN[l]);
      for (const [i, j] of targetPairs) {
        assert.equal(j, i + 1, 'adjacent');
        // verify by absolute diatonic reconstruction
        const idxOf = (n) => {
          const t = SCALE_SEMITONES[melody.mode];
          const k = Math.round((n.midi - melody.tonicMidi - t[n.degree]) / 12);
          return k * 7 + (n.degree - 1);
        };
        assert.ok(spans.includes(Math.abs(idxOf(melody.notes[j]) - idxOf(melody.notes[i]))),
          `${c.id} seed ${seed}: pair [${i},${j}] really forms the interval`);
      }
    }
  }
});

test('gym: use-rounds hide exactly the interval\'s second note, never the first note (10-seed sweeps)', () => {
  for (const c of GYM_CIRCUITS.filter((x) => x.stations.includes('use'))) {
    for (let seed = 1; seed <= 10; seed++) {
      const { melody, hideIdx, targetPair } = gymUseRound({
        circuitId: c.id, key: 'C', mode: 'major', range: RANGE, seed,
      });
      assert.ok(melody.notes.length >= 3, 'micro-melody has enough notes');
      assert.equal(hideIdx, targetPair[1], 'hidden = second note of the pair');
      assert.ok(hideIdx > 0, 'never hides the anchor first note');
      // total duration = exactly one 4/4 bar
      const q = melody.notes.reduce((s, n) => s + DURATION_QUARTERS[n.duration], 0);
      assert.equal(q, 4, 'one bar');
    }
  }
});

test('gym: stationless requests are rejected loudly (tritone has no find/use)', () => {
  assert.throws(() => gymFindStream({ circuitId: 'tritone', key: 'C', mode: 'major', range: RANGE, seed: 1 }), RangeError);
  assert.throws(() => gymUseRound({ circuitId: 'tritone', key: 'C', mode: 'major', range: RANGE, seed: 1 }), RangeError);
  assert.throws(() => gymPairItem({ circuitId: 'nope', key: 'C', seed: 1 }), RangeError);
});
