/**
 * @file core/room.test.js
 * Unit tests for the PURE live-room state logic (core/room.js).
 *
 * Run with:  node --test            (from core/)
 *        or  node --test core/room.test.js
 *
 * Fully deterministic: `now` and entropy are passed explicitly; no clock, no
 * randomness, no I/O.
 *
 * The simple vocabulary is derived from core/rhythm-figures.js `RHYTHM_FIGURES`;
 * the compound `cd-*` vocabulary mirrors the redesign's set (every `cd-*` is one
 * dotted-quarter beat, `beats: 1`) since those figures do not live in core yet.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import Room, {
  CODE_LENGTH,
  ROOM_STATES,
  ROOM_TYPE,
  isValidCode,
  codeFromBytes,
  beatCount,
  isValidRhythm,
  onsets,
  emptyRoom,
  roundBeatCount,
  reduce,
  beatCorrectCounts,
  readyBeats,
  isExpired,
} from './room.js';
import { RHYTHM_FIGURES } from './rhythm-figures.js';

// Simple vocabulary derived from the canonical engine data (core/rhythm-figures.js),
// so these "real figure spans" cannot drift from the source.
const SIMPLE = Object.fromEntries(RHYTHM_FIGURES.map((f) => [f.id, f.beats]));
// Compound (6/8-family): every cd-* spans one dotted-quarter beat.
const COMPOUND = {
  'cd-dotted-quarter': 1,
  'cd-three-eighths': 1,
  'cd-quarter-eighth': 1,
  'cd-eighth-quarter': 1,
};

const METER = { timeSignature: '3/4', beatsPerMeasure: [3], beatUnit: 'quarter' };
const METER4 = { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' };
const METER68 = { timeSignature: '6/8', beatsPerMeasure: [2], beatUnit: 'dotted-quarter' };

const lobby = (now = 1000) => emptyRoom('7QK4P2', 't1', METER, 1, 100, now, SIMPLE);
// Build a duration-aware rhythm from [figureId, beats] pairs with contiguous onsets.
const rhy = (...pairs) => {
  let onset = 0;
  return pairs.map(([figureId, beats]) => {
    const cell = { figureId, onset, beats };
    onset += beats;
    return cell;
  });
};
const THREE_Q = rhy(['quarter', 1], ['quarter', 1], ['quarter', 1]); // 3/4

// ---- room codes ----
test('isValidCode: length, alphabet, and excluded I/L/O/U', () => {
  assert.equal(isValidCode('7QK4P2'), true);
  assert.equal(isValidCode('7qk4p2'), false, 'lowercase not allowed');
  assert.equal(isValidCode('7QK4P'), false, 'too short');
  assert.equal(isValidCode('7QK4P22'), false, 'too long');
  for (const bad of ['I', 'L', 'O', 'U']) {
    assert.equal(isValidCode(`ABC${bad}12`.slice(0, 6)), false, `must exclude ${bad}`);
  }
  assert.equal(isValidCode(123456), false, 'non-string');
  assert.equal(isValidCode(null), false);
});

test('codeFromBytes: deterministic, valid, unbiased, and rejects bad entropy', () => {
  const bytes = [0, 8, 16, 248, 255, 100, 7];
  const code = codeFromBytes(bytes);
  assert.equal(code.length, CODE_LENGTH);
  assert.equal(isValidCode(code), true);
  assert.equal(codeFromBytes(bytes), code, 'deterministic');
  for (let b = 0; b < 256; b++) {
    assert.equal(isValidCode(codeFromBytes([b, b, b, b, b, b])), true, `byte ${b}`);
  }
  assert.throws(() => codeFromBytes([1, 2, 3]), /at least/, 'too few bytes');
  assert.throws(() => codeFromBytes(null), /at least/);
  assert.throws(() => codeFromBytes([-1, 0, 0, 0, 0, 0]), /0\.\.255/, 'negative byte');
  assert.throws(() => codeFromBytes([256, 0, 0, 0, 0, 0]), /0\.\.255/, 'byte > 255');
  assert.throws(() => codeFromBytes([1.5, 0, 0, 0, 0, 0]), /0\.\.255/, 'fractional byte');
  assert.throws(() => codeFromBytes(['x', 0, 0, 0, 0, 0]), /0\.\.255/, 'non-numeric byte');
});

// ---- meter → beats: the §8 meter matrix, never measureCount * 4 ----
test('beatCount: every VISION §8 meter, counted in its own beat unit', () => {
  const cases = [
    ['2/4', [2]], ['3/4', [3]], ['4/4', [4]],
    ['2/2', [2]], ['3/2', [3]],
    ['6/8', [2]], ['9/8', [3]], ['12/8', [4]], // compound: dotted-quarter beats
  ];
  for (const [sig, bpm] of cases) {
    assert.equal(beatCount({ timeSignature: sig, beatsPerMeasure: bpm }, 1), bpm[0], `${sig} × 1 bar`);
    assert.equal(beatCount({ timeSignature: sig, beatsPerMeasure: bpm }, 4), bpm[0] * 4, `${sig} × 4 bars`);
  }
});

test('beatCount: NOT measureCount * 4 for non-4/4 meters', () => {
  assert.equal(beatCount({ beatsPerMeasure: [3] }, 2), 6);
  assert.notEqual(beatCount({ beatsPerMeasure: [3] }, 2), 2 * 4);
  assert.equal(beatCount({ beatsPerMeasure: [2] }, 3), 6);
  assert.notEqual(beatCount({ beatsPerMeasure: [2] }, 3), 3 * 4);
});

test('beatCount: changing meter cycles beatsPerMeasure', () => {
  assert.equal(beatCount({ beatsPerMeasure: [2, 3] }, 3), 7); // 2+3+2
  assert.equal(beatCount({ beatsPerMeasure: [2, 3] }, 4), 10);
});

test('beatCount: guards bad meter and bars', () => {
  assert.throws(() => beatCount({}, 2), /beatsPerMeasure/);
  assert.throws(() => beatCount({ beatsPerMeasure: [] }, 2), /beatsPerMeasure/);
  assert.throws(() => beatCount({ beatsPerMeasure: [0] }, 2), /positive integer/);
  assert.throws(() => beatCount({ beatsPerMeasure: [2.5] }, 2), /positive integer/);
  assert.throws(() => beatCount({ beatsPerMeasure: [3] }, -1), /bars/);
  assert.throws(() => beatCount({ beatsPerMeasure: [3] }, 1.5), /bars/);
  assert.equal(beatCount({ beatsPerMeasure: [3] }, 0), 0);
});

// ---- rhythm tiling + vocabulary ----
test('isValidRhythm: tiles exactly with vocabulary figures; rejects mismatches', () => {
  assert.equal(isValidRhythm(rhy(['quarter', 1], ['half', 2], ['quarter', 1]), 4, SIMPLE), true, 'q h q tiles 4');
  assert.equal(isValidRhythm(THREE_Q, 3, SIMPLE), true);
  assert.equal(isValidRhythm(rhy(['quarter', 1], ['quarter', 1]), 3, SIMPLE), false, 'under-fills');
  assert.equal(isValidRhythm(rhy(['quarter', 1], ['quarter', 1], ['quarter', 1], ['quarter', 1]), 3, SIMPLE), false, 'over-fills');
  assert.equal(isValidRhythm([{ figureId: 'quarter', onset: 0, beats: 1 }, { figureId: 'quarter', onset: 2, beats: 1 }], 3, SIMPLE), false, 'gap');
  assert.equal(isValidRhythm(rhy(['bogus', 1], ['quarter', 1], ['quarter', 1]), 3, SIMPLE), false, 'figure not in vocabulary');
  assert.equal(isValidRhythm([{ figureId: 'half', onset: 0, beats: 1 }, { figureId: 'quarter', onset: 1, beats: 1 }], 2, SIMPLE), false, 'declared beats ≠ vocabulary (half is 2)');
  assert.equal(isValidRhythm([], 0, SIMPLE), false, 'empty rhythm');
  assert.equal(isValidRhythm('nope', 3, SIMPLE), false, 'not an array');
  // compound: two cd-* figures (1 beat each) tile a 6/8 bar (2 beats)
  assert.equal(isValidRhythm(rhy(['cd-quarter-eighth', 1], ['cd-dotted-quarter', 1]), 2, COMPOUND), true, 'compound tiles 6/8');
});

// ---- emptyRoom: validated at construction ----
test('emptyRoom: shape + beatUnit + figures; throws on invalid inputs', () => {
  const r = emptyRoom('7QK4P2', 't1', METER, 2, 100, 1000, SIMPLE);
  assert.equal(r.type, ROOM_TYPE);
  assert.equal(r.teacherUid, 't1');
  assert.equal(r.meter.beatUnit, 'quarter', 'schema carries beatUnit');
  assert.deepEqual(r.figures, SIMPLE, 'room carries its figure vocabulary');
  assert.equal(r.state, ROOM_STATES.LOBBY);
  assert.equal(r.rhythm, null);
  assert.throws(() => emptyRoom('bad', 't1', METER, 1, 100, 1000, SIMPLE), /room code/);
  assert.throws(() => emptyRoom('7QK4P2', '', METER, 1, 100, 1000, SIMPLE), /teacherUid/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 0, 100, 1000, SIMPLE), /bars/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', {}, 1, 100, 1000, SIMPLE), /beatsPerMeasure/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', { beatsPerMeasure: [3] }, 1, 100, 1000, SIMPLE), /beatUnit/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', { beatsPerMeasure: [3], beatUnit: 'quarter' }, 1, 100, 1000, SIMPLE), /timeSignature/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 0, 1000, SIMPLE), /tempo/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 120.5, 1000, SIMPLE), /tempo/); // fractional tempo rejected
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 2147483648, 1000, SIMPLE), /tempo/); // beyond int4 range rejected
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 1001, 1000, SIMPLE), /tempo/);        // above the BPM ceiling rejected
  assert.equal(emptyRoom('7QK4P2', 't1', METER, 1, 1000, 1000, SIMPLE).tempo, 1000);            // the ceiling itself is accepted
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 100, NaN, SIMPLE), /timestamp/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 100, 1000, {}), /non-empty/);
  assert.throws(() => emptyRoom('7QK4P2', 't1', METER, 1, 100, 1000, { q: 0 }), /positive integer/);
});

// ---- reducer: JOIN / LEAVE ----
test('reduce JOIN: adds, preserves joinedAt, keeps answers; rejects empty uid or missing name', () => {
  let r = lobby();
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1005);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1010);
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari M.' }, 1020); // rejoin/rename
  assert.equal(r.students.u1.name, 'Ari M.');
  assert.equal(r.students.u1.joinedAt, 1000, 'joinedAt preserved across rejoin');
  assert.deepEqual(r.answers.u1, { 0: 'quarter' }, 'JOIN must not wipe answers');
  assert.equal(reduce(r, { type: 'JOIN', uid: '', name: 'x' }, 1030), r, 'empty uid is a no-op');
  assert.equal(reduce(r, { type: 'JOIN', uid: 'u2' }, 1031), r, 'missing name is a no-op');
});

test('reduce LEAVE: removes only that student, no-op if absent', () => {
  let r = lobby();
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'JOIN', uid: 'u2', name: 'Bea' }, 1000);
  const before = r;
  r = reduce(r, { type: 'LEAVE', uid: 'u1' }, 1030);
  assert.deepEqual(Object.keys(r.students), ['u2']);
  assert.equal(reduce(before, { type: 'LEAVE', uid: 'nope' }, 1040), before, 'absent LEAVE is a no-op');
});

// ---- reducer: ASSIGN validates tiling + vocabulary + keeps roster ----
test('reduce ASSIGN: sets rhythm, clears round, KEEPS students; rejects invalid rhythms', () => {
  let r = lobby();
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1002);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1010);
  r = reduce(r, { type: 'REVEAL', beat: 0 }, 1020);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2]) }, 1030); // quarter + half = 3
  assert.equal(r.state, ROOM_STATES.ACTIVE);
  assert.deepEqual(onsets(r), [0, 1], 'onsets from figure spans, not one-per-beat');
  assert.deepEqual(r.answers, {}, 'new round clears answers');
  assert.deepEqual(r.revealed, [], 'new round clears reveals');
  assert.deepEqual(Object.keys(r.students), ['u1'], 'roster survives ASSIGN');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['quarter', 1]) }, 1040), r, 'under-filling rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: rhy(['bogus', 1], ['quarter', 1], ['quarter', 1]) }, 1041), r, 'unknown figure rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 0 }, 1042), r, 'bad tempo rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 100.5 }, 1044), r, 'fractional tempo rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 2147483648 }, 1045), r, 'out-of-range tempo rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 1001 }, 1046), r, 'above the BPM ceiling rejected');
  assert.equal(reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 1000 }, 1047).tempo, 1000, 'the ceiling itself is accepted');
  const bumped = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q, tempo: 120 }, 1043);
  assert.equal(bumped.tempo, 120, 'ASSIGN may update tempo');
});

test('reduce ASSIGN: multi-beat figure means figure count is NOT beat count', () => {
  let r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, SIMPLE);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2], ['quarter', 1]) }, 1005);
  assert.equal(roundBeatCount(r), 4, 'beats are meter-derived');
  assert.equal(r.rhythm.length, 3, 'three figures fill four beats');
  assert.deepEqual(onsets(r), [0, 1, 3]);
});

test('reduce ASSIGN: compound 6/8 round with cd-* figures (each one dotted-quarter beat)', () => {
  let r = emptyRoom('7QK4P2', 't1', METER68, 1, 100, 1000, COMPOUND);
  assert.equal(roundBeatCount(r), 2, '6/8 = 2 dotted-quarter beats');
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['cd-quarter-eighth', 1], ['cd-three-eighths', 1]) }, 1005);
  assert.equal(r.state, ROOM_STATES.ACTIVE);
  assert.deepEqual(onsets(r), [0, 1]);
});

// ---- reducer: ANSWER validity (onset + vocabulary) ----
test('reduce ANSWER: records at an onset; rejects non-member, off-vocabulary, non-onset, pre-round', () => {
  let r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, SIMPLE);
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1001), r, 'no round yet');
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2], ['quarter', 1]) }, 1005); // onsets 0,1,3
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 1, figureId: 'half' }, 1010);
  assert.deepEqual(r.answers.u1, { 1: 'half' });
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 2, figureId: 'quarter' }, 1011), r, 'beat 2 covered by the half, not an onset');
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 9, figureId: 'quarter' }, 1012), r, 'beat out of range');
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'ghost', beat: 0, figureId: 'quarter' }, 1013), r, 'non-member');
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0 }, 1014), r, 'missing figureId');
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'bogus' }, 1015), r, 'figure not in vocabulary');
});

// ---- reducer: REVEAL onset-keyed, roster preserved ----
test('reduce REVEAL: onsets only, sorted + deduped; REVEAL_ALL covers every figure', () => {
  let r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, SIMPLE);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2], ['quarter', 1]) }, 1005); // onsets 0,1,3
  r = reduce(r, { type: 'REVEAL', beat: 3 }, 1010);
  r = reduce(r, { type: 'REVEAL', beat: 0 }, 1011);
  r = reduce(r, { type: 'REVEAL', beat: 0 }, 1012); // dup
  assert.deepEqual(r.revealed, [0, 3], 'sorted + deduped');
  assert.equal(r.state, ROOM_STATES.REVEALING);
  assert.equal(reduce(r, { type: 'REVEAL', beat: 2 }, 1013), r, 'non-onset reveal is a no-op');
  r = reduce(r, { type: 'REVEAL_ALL' }, 1014);
  assert.deepEqual(r.revealed, [0, 1, 3]);
});

test('reduce REVEAL/REVEAL_ALL before a round: no-op', () => {
  const r = lobby();
  assert.equal(reduce(r, { type: 'REVEAL', beat: 0 }, 1010), r);
  assert.equal(reduce(r, { type: 'REVEAL_ALL' }, 1011), r);
});

test('reduce: roster and answers survive REVEAL (archived root-set wipe designed out)', () => {
  let r = lobby();
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'JOIN', uid: 'u2', name: 'Bea' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1005);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1010);
  r = reduce(r, { type: 'REVEAL', beat: 0 }, 1011);
  r = reduce(r, { type: 'REVEAL_ALL' }, 1012);
  assert.deepEqual(Object.keys(r.students), ['u1', 'u2'], 'reveal must not wipe roster');
  assert.deepEqual(r.answers.u1, { 0: 'quarter' }, 'reveal must not wipe answers');
});

// ---- reducer: HEARTBEAT / CLOSE (terminal) / unknown / immutability ----
test('reduce HEARTBEAT and unknown messages', () => {
  let r = lobby();
  r = reduce(r, { type: 'HEARTBEAT' }, 5000);
  assert.equal(r.teacherLastSeen, 5000);
  assert.equal(reduce(r, { type: 'WAT' }, 6000), r, 'unknown message is a no-op (same reference)');
  assert.equal(reduce(r, null, 6000), r, 'null message is a no-op');
});

test('reduce CLOSE is terminal: a closed room ignores every message', () => {
  let r = lobby();
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1005);
  r = reduce(r, { type: 'CLOSE' }, 2000);
  assert.equal(r.state, ROOM_STATES.CLOSED);
  for (const msg of [
    { type: 'JOIN', uid: 'u2', name: 'Bea' },
    { type: 'ASSIGN', rhythm: THREE_Q },
    { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' },
    { type: 'REVEAL', beat: 0 },
    { type: 'REVEAL_ALL' },
    { type: 'HEARTBEAT' },
    { type: 'CLOSE' },
  ]) {
    assert.equal(reduce(r, msg, 3000), r, `closed room ignores ${msg.type}`);
  }
});

test('reduce is immutable: original room is never mutated', () => {
  const r0 = lobby();
  const r1 = reduce(r0, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  assert.notEqual(r1, r0);
  assert.deepEqual(r0.students, {}, 'input room unchanged');
});

// ---- grading / reveal-unlock (per figure onset, with a multi-beat figure) ----
test('beatCorrectCounts + readyBeats: unlock only when the whole room has the figure', () => {
  let r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, SIMPLE);
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'JOIN', uid: 'u2', name: 'Bea' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2], ['quarter', 1]) }, 1005); // onsets 0,1,3
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1010);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 1, figureId: 'half' }, 1011);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 3, figureId: 'two-eighths' }, 1012); // wrong
  r = reduce(r, { type: 'ANSWER', uid: 'u2', beat: 0, figureId: 'quarter' }, 1013);
  r = reduce(r, { type: 'ANSWER', uid: 'u2', beat: 1, figureId: 'quarter' }, 1014); // wrong
  assert.deepEqual(beatCorrectCounts(r), [
    { onset: 0, correct: 2 },
    { onset: 1, correct: 1 },
    { onset: 3, correct: 0 },
  ]);
  assert.deepEqual(readyBeats(r), [0], 'only onset 0 is all-correct');
});

test('readyBeats: empty roster or no rhythm yields nothing', () => {
  let r = lobby();
  assert.deepEqual(readyBeats(r), [], 'no rhythm, no roster');
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1005);
  assert.deepEqual(readyBeats(r), [], 'rhythm but empty roster');
});

// ---- VISION §8 non-preclusion: a 5/8 room round-trips through serialization ----
test('5/8 room serialises losslessly through create → assign → answer → reveal (VISION §8)', () => {
  // No UI exposes 5/8, so the figure vocabulary here is hypothetical — the point
  // is that the SCHEMA does not preclude the meter and round-trips without loss.
  const meter58 = { timeSignature: '5/8', beatsPerMeasure: [5], beatUnit: 'eighth' };
  const vocab58 = { 'eighth-pair': 2, 'eighth-triple': 3 };
  let r = emptyRoom('5F8RM2', 't1', meter58, 1, 90, 1000, vocab58);
  assert.equal(roundBeatCount(r), 5, '5/8 = 5 eighth-beats, not measureCount*4');
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1001);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['eighth-pair', 2], ['eighth-triple', 3]) }, 1005);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'eighth-pair' }, 1010);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 2, figureId: 'eighth-triple' }, 1011);
  r = reduce(r, { type: 'REVEAL_ALL' }, 1012);
  const round = JSON.parse(JSON.stringify(r)); // the actual wire round-trip
  assert.deepEqual(round, r, 'no loss across serialise/deserialise');
  assert.deepEqual(readyBeats(round), [0, 2], 'grading survives the round-trip');
});

// ---- expiry ----
test('isExpired: teacher heartbeat vs TTL', () => {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  let r = lobby();
  assert.equal(isExpired(r, 1000 + TWO_HOURS, TWO_HOURS), false, 'exactly at TTL is not expired');
  assert.equal(isExpired(r, 1000 + TWO_HOURS + 1, TWO_HOURS), true, 'past TTL is expired');
  r = reduce(r, { type: 'HEARTBEAT' }, 1000 + TWO_HOURS);
  assert.equal(isExpired(r, 1000 + TWO_HOURS + 1, TWO_HOURS), false, 'heartbeat un-expires');
});

// ---- hardening: defensive copies, timestamps, prototype-safe membership ----
test("emptyRoom copies the meter: mutating the caller's meter can't change the room", () => {
  const meter = { timeSignature: '3/4', beatsPerMeasure: [3], beatUnit: 'quarter' };
  const r = emptyRoom('7QK4P2', 't1', meter, 2, 100, 1000, SIMPLE);
  meter.beatsPerMeasure[0] = 99;
  meter.beatUnit = 'hacked';
  assert.equal(roundBeatCount(r), 6, 'room meter unaffected by later mutation');
  assert.equal(r.meter.beatUnit, 'quarter');
});

test("ASSIGN copies the rhythm: mutating the sent rhythm can't corrupt state", () => {
  let r = lobby();
  const sent = rhy(['quarter', 1], ['half', 2]);
  r = reduce(r, { type: 'ASSIGN', rhythm: sent }, 1005);
  sent[0].figureId = 'bogus';
  sent.push({ figureId: 'quarter', onset: 99, beats: 1 });
  assert.equal(r.rhythm[0].figureId, 'quarter', 'accepted rhythm is insulated');
  assert.equal(r.rhythm.length, 2);
});

test('reduce rejects a non-finite `now` where it would stamp time', () => {
  const r = lobby();
  assert.equal(reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, NaN), r, 'JOIN with NaN now');
  assert.equal(reduce(r, { type: 'HEARTBEAT' }, undefined), r, 'HEARTBEAT with missing now');
});

test('inherited/prototype-key uids are not roster members', () => {
  let r = lobby();
  r = reduce(r, { type: 'ASSIGN', rhythm: THREE_Q }, 1005);
  // "toString" lives on Object.prototype — it must NOT count as a joined student.
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'toString', beat: 0, figureId: 'quarter' }, 1010), r, 'non-joined toString cannot answer');
  assert.equal(reduce(r, { type: 'LEAVE', uid: 'toString' }, 1011), r, 'non-joined toString LEAVE is a no-op');
  // but a student may legitimately use that string as their uid once joined.
  r = reduce(r, { type: 'JOIN', uid: 'toString', name: 'T' }, 1012);
  r = reduce(r, { type: 'ANSWER', uid: 'toString', beat: 0, figureId: 'quarter' }, 1013);
  assert.deepEqual(r.answers['toString'], { 0: 'quarter' });
});

test('ANSWER is rejected once revealing has begun (no copying the shown answer)', () => {
  let r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, SIMPLE);
  r = reduce(r, { type: 'JOIN', uid: 'u1', name: 'Ari' }, 1000);
  r = reduce(r, { type: 'ASSIGN', rhythm: rhy(['quarter', 1], ['half', 2], ['quarter', 1]) }, 1005);
  r = reduce(r, { type: 'ANSWER', uid: 'u1', beat: 0, figureId: 'quarter' }, 1010);
  r = reduce(r, { type: 'REVEAL', beat: 0 }, 1011);
  assert.equal(r.state, ROOM_STATES.REVEALING);
  assert.equal(reduce(r, { type: 'ANSWER', uid: 'u1', beat: 3, figureId: 'quarter' }, 1012), r, 'no answers after a reveal');
});

test('a figure id named "__proto__" is stored as an own entry, not lost to the setter', () => {
  const figs = { quarter: 1 };
  Object.defineProperty(figs, '__proto__', { value: 2, enumerable: true, configurable: true, writable: true });
  const r = emptyRoom('7QK4P2', 't1', METER4, 1, 100, 1000, figs);
  assert.equal(r.figures['__proto__'], 2, '__proto__ survives normalization as an own entry');
  const r2 = reduce(r, {
    type: 'ASSIGN',
    rhythm: [{ figureId: '__proto__', onset: 0, beats: 2 }, { figureId: 'quarter', onset: 2, beats: 1 }, { figureId: 'quarter', onset: 3, beats: 1 }],
  }, 1005);
  assert.equal(r2.state, ROOM_STATES.ACTIVE, '__proto__ figure is usable in a rhythm');
});

test('emptyRoom drops unknown meter props so the room stays JSON-serialisable', () => {
  const meter = { timeSignature: '3/4', beatsPerMeasure: [3], beatUnit: 'quarter', evil: () => {} };
  const r = emptyRoom('7QK4P2', 't1', meter, 1, 100, 1000, SIMPLE);
  assert.equal('evil' in r.meter, false, 'non-schema meter props are dropped');
  assert.deepEqual(JSON.parse(JSON.stringify(r)), r, 'room round-trips through JSON without loss');
});

// ---- default export surface ----
test('default export aggregates the public API', () => {
  for (const k of ['isValidCode', 'codeFromBytes', 'beatCount', 'isValidRhythm', 'onsets', 'emptyRoom', 'reduce', 'beatCorrectCounts', 'readyBeats', 'isExpired']) {
    assert.equal(typeof Room[k], 'function', `Room.${k}`);
  }
  assert.equal(Room.CODE_LENGTH, CODE_LENGTH);
  assert.equal(Room.ROOM_STATES, ROOM_STATES);
});
