/**
 * @file supabase/room-answer.integration.mjs
 * Integration test for room-transport.js's submitAnswer against the REAL Supabase project. A
 * teacher opens a round; two students join and answer; grading is checked on the teacher's read;
 * and the ACTIVE-phase guard is exercised.
 *
 * It asserts:
 *   - submitAnswer is rejected before a round is assigned (lobby is not ACTIVE).
 *   - during ACTIVE, answers land; the teacher's read grades them (beatCorrectCounts / readyBeats),
 *     and an upsert overwrites a student's earlier answer at the same onset.
 *   - reduce() rejects a beat that is not a figure onset, and a figure outside the vocabulary.
 *   - once the room leaves ACTIVE (a reveal is simulated by setting state='revealing', since the
 *     reveal verb is a later step), submitAnswer is rejected, and a DIRECT client write to
 *     room_answers is rejected by the active-only trigger — proving no answering after a reveal.
 *   - after close, submitAnswer is rejected.
 *
 * These closed/revealing checks are sequential against an already-non-ACTIVE room; the trigger's
 * FOR SHARE lock is what makes an answer racing a reveal safe (an implementation property, like
 * assign_round's lock — not raced here).
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying
 * supabase/migrations/0001_live_room.sql (including the room_answers_active_only trigger):
 *
 *     node supabase/room-answer.integration.mjs
 *
 * Creates a throwaway room and deletes it at the end. Exits non-zero on any failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { createRoomTransport } from '../room-transport.js';
import { readyBeats, beatCorrectCounts, ROOM_STATES } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };
const NOT_ACTIVE = '23514'; // check_violation raised by the room_answers active-only trigger

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Assert the promise rejects specifically with the transport's own validation error (its message
// contains `needle`), so an unrelated auth/fetch/transport failure cannot satisfy the check.
const rejectsWith = async (promise, needle) => {
  try { await promise; return false; } catch (e) { return String(e && e.message || e).includes(needle); }
};

async function actor(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { t: createRoomTransport(c, deps), c, uid: data.user.id };
}

const METER = { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' };
const FIGURES = { quarter: 1, half: 2 };
const R1 = [{ figureId: 'half', onset: 0, beats: 2 }, { figureId: 'quarter', onset: 2, beats: 1 }, { figureId: 'quarter', onset: 3, beats: 1 }];

const teacher = await actor('teacher');
const B = await actor('student B');
const C = await actor('student C');

let code;
try {
  ({ code } = await teacher.t.createRoom({ meter: METER, bars: 1, tempo: 100, figures: FIGURES }));
  await B.t.joinRoom(code, 'B');
  await C.t.joinRoom(code, 'C');

  // --- before a round is assigned, the room is not ACTIVE ---
  check('submitAnswer is rejected in the lobby (no active round)',
    await rejectsWith(B.t.submitAnswer(code, 0, 'half'), 'submitAnswer rejected'));

  // --- ACTIVE: answers land and grade ---
  await teacher.t.assignRhythm(code, R1);
  await B.t.submitAnswer(code, 0, 'half');
  await B.t.submitAnswer(code, 2, 'quarter');
  await B.t.submitAnswer(code, 3, 'quarter');   // B all correct
  await C.t.submitAnswer(code, 0, 'quarter');   // C wrong at onset 0
  await C.t.submitAnswer(code, 2, 'quarter');
  await C.t.submitAnswer(code, 3, 'quarter');
  let room = await teacher.t.fetchRoom(code);
  check('teacher read grades the answers: onset 0 has 1 correct, onsets 2 & 3 have 2',
    eq(beatCorrectCounts(room), [{ onset: 0, correct: 1 }, { onset: 2, correct: 2 }, { onset: 3, correct: 2 }]),
    JSON.stringify(beatCorrectCounts(room)));
  check('readyBeats unlocks only 2 & 3 (not the beat C missed)', eq(readyBeats(room), [2, 3]), JSON.stringify(readyBeats(room)));

  await C.t.submitAnswer(code, 0, 'half');       // upsert overwrites C's earlier onset-0 answer
  room = await teacher.t.fetchRoom(code);
  check('an upsert corrects a prior answer; all three beats now ready', eq(readyBeats(room), [0, 2, 3]), JSON.stringify(readyBeats(room)));

  // --- reduce() rejects a non-onset beat and an out-of-vocabulary figure ---
  check('submitAnswer rejects a beat that is not a figure onset',
    await rejectsWith(B.t.submitAnswer(code, 1, 'quarter'), 'submitAnswer rejected'));
  check('submitAnswer rejects a figure outside the vocabulary',
    await rejectsWith(B.t.submitAnswer(code, 0, 'bogus'), 'submitAnswer rejected'));

  // --- leaving ACTIVE blocks answering (simulate a reveal — the reveal verb is a later step) ---
  const rev = await teacher.c.from('rooms').update({ state: ROOM_STATES.REVEALING }).eq('code', code).select();
  check('teacher moved the room to revealing (reveal simulated)',
    !rev.error && rev.data?.[0]?.state === ROOM_STATES.REVEALING, rev.error?.message);
  check('submitAnswer is rejected once the round is revealing (no answering after a reveal)',
    await rejectsWith(B.t.submitAnswer(code, 2, 'quarter'), 'submitAnswer rejected'));
  const directWrite = await B.c.from('room_answers').update({ figure_id: 'quarter' })
    .eq('room_code', code).eq('uid', B.uid).eq('beat', 0).select();
  check('a DIRECT answer write to a non-ACTIVE room is rejected by the trigger',
    directWrite.error?.code === NOT_ACTIVE, directWrite.error?.code);
  const bAns = (await teacher.t.fetchRoom(code)).answers[B.uid];
  check("B's answer at onset 0 is unchanged (still half)", bAns?.[0] === 'half', JSON.stringify(bAns));

  // --- after close, answering is rejected ---
  await teacher.t.closeRoom(code);
  check('submitAnswer is rejected once the room is closed',
    await rejectsWith(B.t.submitAnswer(code, 2, 'quarter'), 'submitAnswer rejected'));
} finally {
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code);
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} answer checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
