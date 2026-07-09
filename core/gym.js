/**
 * @file core/gym.js
 * @module core/gym
 *
 * INTERVAL GYM engine (INTERVAL_GYM_SPEC.md §3) — pure, framework-agnostic,
 * deterministic under seeds, in the core/ house style (no DOM, no audio, no I/O).
 *
 * The Gym trains the ladder's own leap vocabulary as interval QUALITY + tonal
 * FUNCTION together: every item is a degree pair in key context, labeled both
 * ways ('1̂ → 3̂' AND 'major 3rd'). Grounded in INTERVAL_TRAINING_RESEARCH.md:
 * acontextual pair drills don't transfer (Karpinski); context + production +
 * melodic embedding do.
 */

import {
  LEAP_DEGREE_SPAN,
  SCALE_SEMITONES,
  makeRng,
  tonicMidiFor,
  generateMelody,
} from './melodic.js';
import { melodicLevel } from './melodic-curriculum.js';

/* ===========================================================================
 * CIRCUITS — the Gym's ladder-locked unlock map (INTERVAL_GYM_SPEC.md §1).
 * `leapIds` are the ladder's own leap vocabulary ids (LEAP_DEGREE_SPAN keys).
 * The tritone circuit is the documented DEVIATION (EXECUTION_PLAN §C2): the
 * generator correctly BANS tritone melodic moves, so it has no FIND stream and
 * no USE round — a 3-station circuit over the in-key tritone pair 4̂↔7̂.
 * =========================================================================*/

/** @type {ReadonlyArray<{id:string,label:string,leapIds:string[],unlockLevel:string,fixedPairs?:number[][],stations:string[]}>} */
export const GYM_CIRCUITS = Object.freeze([
  { id: '3rd', label: '3rds', leapIds: ['3rd'], unlockLevel: 'm7',
    stations: ['feel', 'find', 'name', 'sing', 'use'] },
  { id: '4th5th', label: '4ths & 5ths', leapIds: ['P4', 'P5'], unlockLevel: 'm8',
    stations: ['feel', 'find', 'name', 'sing', 'use'] },
  { id: '6th8ve', label: 'Octaves & 6ths', leapIds: ['6th', 'P8'], unlockLevel: 'm12',
    stations: ['feel', 'find', 'name', 'sing', 'use'] },
  { id: '2nd', label: '2nds', leapIds: ['step'], unlockLevel: 'm14',
    stations: ['feel', 'find', 'name', 'sing', 'use'] },
  { id: '7th', label: '7ths', leapIds: ['7th'], unlockLevel: 'm16',
    stations: ['feel', 'find', 'name', 'sing', 'use'] },
  { id: 'tritone', label: 'The tritone', leapIds: [], fixedPairs: [[4, 7], [7, 4]],
    unlockLevel: 'm18', stations: ['feel', 'name', 'sing'] },
]);

/** Interval quality by semitone distance (1..12). The Gym is exactly where the
 *  ladder's degree-SPAN vocabulary meets interval QUALITY, so items carry both. */
export const INTERVAL_QUALITY = Object.freeze({
  1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd', 4: 'major 3rd',
  5: 'perfect 4th', 6: 'tritone', 7: 'perfect 5th', 8: 'minor 6th',
  9: 'major 6th', 10: 'minor 7th', 11: 'major 7th', 12: 'perfect octave',
});

/**
 * Circuits with their unlock state at a ladder position.
 * @param {number} mIndex the student's current melodic level mIndex (0..26)
 * @returns {{circuit:Object, unlocked:boolean}[]}
 */
export function gymCircuitsFor(mIndex) {
  return GYM_CIRCUITS.map((circuit) => {
    const lvl = melodicLevel(circuit.unlockLevel);
    return { circuit, unlocked: !!lvl && mIndex >= lvl.mIndex };
  });
}

/* ===========================================================================
 * Position math (mirrors core/melodic.js's degree-ladder model).
 * =========================================================================*/

function posMidiOf(degree, oct, tonicMidi, mode) {
  const table = SCALE_SEMITONES[mode];
  if (!table) throw new RangeError('gym: unknown mode ' + mode);
  return tonicMidi + table[degree] + 12 * oct;
}

/** All in-range {degree, oct, midi} positions for the mode's 7 degrees. */
function ladderPositions(tonicMidi, mode, range) {
  const out = [];
  for (let oct = -3; oct <= 3; oct++) {
    for (let degree = 1; degree <= 7; degree++) {
      const midi = posMidiOf(degree, oct, tonicMidi, mode);
      if (midi >= range.lowMidi && midi <= range.highMidi) out.push({ degree, oct, midi });
    }
  }
  return out.sort((a, b) => a.midi - b.midi);
}

const diaIndex = (p) => p.oct * 7 + (p.degree - 1);

/* ===========================================================================
 * gymPairItem — one FEEL/NAME/SING item (INTERVAL_GYM_SPEC.md §3).
 * =========================================================================*/

/**
 * @param {Object} o {circuitId, key, mode, range:{lowMidi,highMidi}, seed,
 *                    direction?: 'asc'|'desc'|'either'}
 * @returns {{fromDegree,fromOct,toDegree,toOct,midiFrom,midiTo,semitones,
 *            intervalLabel,degreePair:[number,number],direction:'asc'|'desc'}}
 */
export function gymPairItem(o) {
  const circuit = GYM_CIRCUITS.find((c) => c.id === o.circuitId);
  if (!circuit) throw new RangeError('gym: unknown circuit ' + o.circuitId);
  const mode = o.mode || 'major';
  const tonicMidi = tonicMidiFor(o.key || 'C', 4);
  const range = o.range || { lowMidi: tonicMidi - 5, highMidi: tonicMidi + 19 };
  const positions = ladderPositions(tonicMidi, mode, range);
  const spans = circuit.leapIds.map((l) => LEAP_DEGREE_SPAN[l]);
  const direction = o.direction || 'either';

  const candidates = [];
  for (const from of positions) {
    for (const to of positions) {
      if (to.midi === from.midi) continue;
      if (Math.abs(to.midi - from.midi) > 12) continue; // simple intervals only (v1: no compounds)
      const span = Math.abs(diaIndex(to) - diaIndex(from));
      const matchesSpan = spans.includes(span);
      const matchesFixed = (circuit.fixedPairs || []).some(
        (fp) => fp[0] === from.degree && fp[1] === to.degree,
      );
      if (!(circuit.fixedPairs ? matchesFixed : matchesSpan)) continue;
      const dir = to.midi > from.midi ? 'asc' : 'desc';
      if (direction !== 'either' && dir !== direction) continue;
      candidates.push({ from, to, dir });
    }
  }
  if (!candidates.length) throw new RangeError('gym: no in-range pair for ' + o.circuitId);

  const rng = makeRng(o.seed ?? 1);
  const pick = candidates[Math.floor(rng() * candidates.length)];
  const semitones = Math.abs(pick.to.midi - pick.from.midi);
  return {
    fromDegree: pick.from.degree, fromOct: pick.from.oct,
    toDegree: pick.to.degree, toOct: pick.to.oct,
    midiFrom: pick.from.midi, midiTo: pick.to.midi,
    semitones,
    intervalLabel: INTERVAL_QUALITY[semitones] || semitones + ' semitones',
    degreePair: [pick.from.degree, pick.to.degree],
    direction: pick.dir,
  };
}

/* ===========================================================================
 * gymFindStream — a melody whose adjacent pairs contain the circuit's interval
 * at least `minTargets` times (FIND station). Deterministic bounded seed-retry.
 * =========================================================================*/

function adjacentSpanPairs(melody, spans) {
  // diatonic index recovered from degree+midi the same way the engine tests do
  const pairs = [];
  const idxOf = (n) => {
    const table = SCALE_SEMITONES[melody.mode];
    const rel = n.midi - melody.tonicMidi;
    const k = Math.round((rel - table[n.degree] - (n.alter || 0)) / 12);
    return k * 7 + (n.degree - 1);
  };
  for (let i = 0; i < melody.notes.length - 1; i++) {
    const span = Math.abs(idxOf(melody.notes[i + 1]) - idxOf(melody.notes[i]));
    if (spans.includes(span)) pairs.push([i, i + 1]);
  }
  return pairs;
}

/**
 * @param {Object} o {circuitId, key, mode, range, hallRhythmRef, seed, minTargets}
 * @returns {{melody:Object, targetPairs:number[][]}}
 */
export function gymFindStream(o) {
  const circuit = GYM_CIRCUITS.find((c) => c.id === o.circuitId);
  if (!circuit) throw new RangeError('gym: unknown circuit ' + o.circuitId);
  if (!circuit.stations.includes('find')) {
    throw new RangeError('gym: circuit ' + o.circuitId + ' has no FIND station');
  }
  const minTargets = o.minTargets ?? 2;
  const spans = circuit.leapIds.map((l) => LEAP_DEGREE_SPAN[l]);
  const leaps = ['step', ...circuit.leapIds.filter((l) => l !== 'step')];
  for (let k = 0; k < 25; k++) {
    const melody = generateMelody({
      key: o.key || 'C', mode: o.mode || 'major',
      degrees: [1, 2, 3, 4, 5, 6, 7], leaps,
      range: o.range, meter: '4/4',
      hallRhythmRef: o.hallRhythmRef || 'ch1',
      lengthBars: 2, startOn: 'tonic', seed: (o.seed ?? 1) + k,
    });
    const targetPairs = adjacentSpanPairs(melody, spans);
    if (targetPairs.length >= minTargets) return { melody, targetPairs };
  }
  throw new RangeError('gym: could not build a find-stream for ' + o.circuitId);
}

/* ===========================================================================
 * gymUseRound — a micro-melody containing the interval once; the SECOND note
 * of that pair is hidden (feeds the missing-note renderer; USE station).
 * =========================================================================*/

/**
 * @param {Object} o {circuitId, key, mode, range, seed}
 * @returns {{melody:Object, hideIdx:number, targetPair:number[]}}
 */
export function gymUseRound(o) {
  const circuit = GYM_CIRCUITS.find((c) => c.id === o.circuitId);
  if (!circuit) throw new RangeError('gym: unknown circuit ' + o.circuitId);
  if (!circuit.stations.includes('use')) {
    throw new RangeError('gym: circuit ' + o.circuitId + ' has no USE station');
  }
  const spans = circuit.leapIds.map((l) => LEAP_DEGREE_SPAN[l]);
  const leaps = ['step', ...circuit.leapIds.filter((l) => l !== 'step')];
  for (let k = 0; k < 25; k++) {
    const melody = generateMelody({
      key: o.key || 'C', mode: o.mode || 'major',
      degrees: [1, 2, 3, 4, 5, 6, 7], leaps,
      range: o.range, meter: '4/4',
      hallRhythmRef: 'ch1', lengthBars: 1, startOn: 'tonic', seed: (o.seed ?? 1) + k,
    });
    const pairs = adjacentSpanPairs(melody, spans);
    // never hide the very first note (it anchors the key — same rule as
    // pickHideIndex in the missing-note renderer)
    const usable = pairs.find((p) => p[1] > 0 && p[1] < melody.notes.length);
    if (usable && melody.notes.length >= 3) {
      return { melody, hideIdx: usable[1], targetPair: usable };
    }
  }
  throw new RangeError('gym: could not build a use-round for ' + o.circuitId);
}
