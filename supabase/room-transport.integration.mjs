/**
 * @file supabase/room-transport.integration.mjs
 * Integration test for room-transport.js (the "DB is truth" read + the teacher's round
 * lifecycle) against the REAL Supabase project. A teacher creates a room, assigns rounds,
 * pings liveness, and closes it through the transport; two students and their answers are
 * written with raw client calls here (this file focuses on the teacher lifecycle — the student
 * verbs have their own harness, room-student.integration.mjs) so we can prove the reads fold
 * correctly and the class derivations work on the teacher's full-visibility read.
 *
 * It asserts the observable outcomes of the pieces that plain client writes could not do safely:
 *   - fetchRoom re-assembles a core/room.js Room; readyBeats/beatCorrectCounts are correct on
 *     the teacher's full read; a student's read is RLS-scoped to itself; an outsider gets null.
 *   - assignRhythm sets the round ACTIVE and, on a re-assign, the previous answers are cleared
 *     (assign_round does the clear + rhythm-set in one transaction; the harness checks the
 *     resulting cleared board, not the transaction boundary — atomic visibility is not raced
 *     here); a rhythm that does not tile the meter, a non-positive tempo, or a closed room is
 *     rejected BEFORE any write (via reduce() — the full tempo domain rule, including the BPM
 *     ceiling, is covered by the core tests); a non-teacher cannot call assign_round (guard).
 *   - heartbeat advances teacher_last_seen using the DATABASE clock, and is a no-op once closed.
 *   - the closed rooms ROW is terminal — a trigger rejects reopening or editing it, proven here
 *     against a direct reopen and a direct non-state edit. (The closed-room guard for student
 *     JOINs is proven in room-student.integration.mjs; the answer path is a later step.)
 *
 * Revealing and student ANSWERING are later steps; the join/leave verbs are covered by
 * room-student.integration.mjs, not here.
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying
 * supabase/migrations/0001_live_room.sql (including get_room, assign_round, heartbeat):
 *
 *     node supabase/room-transport.integration.mjs
 *
 * Creates a throwaway room and deletes it at the end; leaves behind the anonymous auth users
 * it signs in (cheap, expected). Exits non-zero on any failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { createRoomTransport } from '../room-transport.js';
import { readyBeats, beatCorrectCounts, ROOM_STATES } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };
const NOT_TEACHER = '42501'; // insufficient_privilege raised by assign_round

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// jsonb does not preserve object key order, so compare by value rather than raw stringify.
const cells = (r) => (r ?? []).map((c) => ({ figureId: c.figureId, onset: c.onset, beats: c.beats }));
const sameMeter = (a, b) => a.timeSignature === b.timeSignature && a.beatUnit === b.beatUnit && eq(a.beatsPerMeasure, b.beatsPerMeasure);
const sameFigures = (a, b) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return eq(ka, kb) && ka.every((k) => a[k] === b[k]);
};
const rejects = async (promise) => { try { await promise; return false; } catch { return true; } };

async function actor(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { t: createRoomTransport(c, deps), c, uid: data.user.id };
}

const METER = { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' };
const FIGURES = { quarter: 1, half: 2 };
// Two rounds that each tile the 4 beats; a half note (beats:2) proves onset != beat index.
const R1 = [{ figureId: 'half', onset: 0, beats: 2 }, { figureId: 'quarter', onset: 2, beats: 1 }, { figureId: 'quarter', onset: 3, beats: 1 }];
const R2 = [{ figureId: 'quarter', onset: 0, beats: 1 }, { figureId: 'quarter', onset: 1, beats: 1 }, { figureId: 'half', onset: 2, beats: 2 }];
const BAD = [{ figureId: 'quarter', onset: 0, beats: 1 }]; // tiles 1 of 4 beats — must be rejected

const teacher = await actor('teacher');
const B = await actor('student B');
const C = await actor('student C');
const D = await actor('outsider D');

let code;
try {
  // --- create + read the fresh lobby ---
  ({ code } = await teacher.t.createRoom({ meter: METER, bars: 1, tempo: 100, figures: FIGURES }));
  check('created a valid room code', /^[0-9A-HJKMNP-TV-Z]{6}$/.test(code), code);
  let room = await teacher.t.fetchRoom(code);
  const createdMs = room.created;
  check('fresh room assembles as a lobby with no rhythm/roster/answers',
    room.state === ROOM_STATES.LOBBY && room.rhythm === null && eq(room.students, {}) && eq(room.answers, {}));
  check('assembled room carries the meter and figure vocabulary it was created with',
    sameMeter(room.meter, METER) && sameFigures(room.figures, FIGURES) && room.bars === 1 && room.tempo === 100);

  // --- assign round 1 ---
  await teacher.t.assignRhythm(code, R1);
  room = await teacher.t.fetchRoom(code);
  check('assignRhythm sets the round ACTIVE with R1, no answers, no reveals',
    room.state === ROOM_STATES.ACTIVE && eq(cells(room.rhythm), cells(R1)) && eq(room.answers, {}) && eq(room.revealed, []));

  // --- seed a roster + answers with raw writes (join/answer verbs are a later step) ---
  const seed = async (promise, what) => {
    const { error } = await promise;
    if (error) throw new Error(`seed ${what} failed: ${error.message}`);
  };
  await seed(B.c.from('room_students').insert({ room_code: code, uid: B.uid, name: 'B' }), 'B join');
  await seed(C.c.from('room_students').insert({ room_code: code, uid: C.uid, name: 'C' }), 'C join');
  await seed(B.c.from('room_answers').insert([                                // B all correct
    { room_code: code, uid: B.uid, beat: 0, figure_id: 'half' },
    { room_code: code, uid: B.uid, beat: 2, figure_id: 'quarter' },
    { room_code: code, uid: B.uid, beat: 3, figure_id: 'quarter' },
  ]), 'B answers');
  await seed(C.c.from('room_answers').insert([                                // C wrong at onset 0
    { room_code: code, uid: C.uid, beat: 0, figure_id: 'quarter' },
    { room_code: code, uid: C.uid, beat: 2, figure_id: 'quarter' },
    { room_code: code, uid: C.uid, beat: 3, figure_id: 'quarter' },
  ]), 'C answers');

  // --- teacher's full read folds everything; the class derivations are correct on it ---
  room = await teacher.t.fetchRoom(code);
  check('teacher read folds both students by name', eq(Object.values(room.students).map((s) => s.name).sort(), ['B', 'C']));
  check('beatCorrectCounts on the teacher read: onset 0 has 1, onsets 2 & 3 have 2',
    eq(beatCorrectCounts(room), [{ onset: 0, correct: 1 }, { onset: 2, correct: 2 }, { onset: 3, correct: 2 }]),
    JSON.stringify(beatCorrectCounts(room)));
  check('readyBeats on the teacher read unlocks only 2 & 3 (not the beat C missed)', eq(readyBeats(room), [2, 3]), JSON.stringify(readyBeats(room)));

  // --- a student read is RLS-scoped to itself; an outsider sees nothing ---
  const bView = await B.t.fetchRoom(code);
  check('a student read sees the room but only its OWN roster + answers (C absent)',
    bView !== null && Object.keys(bView.students).length === 1 && bView.students[B.uid]?.name === 'B' &&
    Object.keys(bView.answers).length === 1 && !!bView.answers[B.uid] && !bView.answers[C.uid]);
  check('outsider D fetchRoom → null (never joined)', (await D.t.fetchRoom(code)) === null);

  // --- re-assign clears the previous answers ATOMICALLY and updates tempo ---
  await teacher.t.assignRhythm(code, R2, 120);
  room = await teacher.t.fetchRoom(code);
  check('re-assign: new rhythm + tempo, board cleared (no answers), reveals cleared, active',
    eq(cells(room.rhythm), cells(R2)) && room.tempo === 120 && eq(room.answers, {}) && eq(room.revealed, []) && room.state === ROOM_STATES.ACTIVE);

  // --- reduce() rejects bad transitions BEFORE any write; the room is untouched ---
  check('assignRhythm rejects a rhythm that does not tile the meter', await rejects(teacher.t.assignRhythm(code, BAD)));
  check('assignRhythm rejects a non-positive tempo', await rejects(teacher.t.assignRhythm(code, R2, -1)));
  room = await teacher.t.fetchRoom(code);
  check('room is unchanged after the rejected assigns (still R2 @ 120)', eq(cells(room.rhythm), cells(R2)) && room.tempo === 120);

  // --- server-side guard: a non-teacher cannot call assign_round ---
  const forgeAssign = await B.c.rpc('assign_round', { p_code: code, p_rhythm: R1, p_tempo: null });
  check('a non-teacher cannot call assign_round (server-side guard)', forgeAssign.error?.code === NOT_TEACHER, forgeAssign.error?.code);

  // --- heartbeat advances teacher_last_seen via the DATABASE clock ---
  await teacher.t.heartbeat(code);
  room = await teacher.t.fetchRoom(code);
  check('heartbeat advances teacherLastSeen past creation (DB clock)', Number.isFinite(room.teacherLastSeen) && room.teacherLastSeen > createdMs, `${createdMs} → ${room.teacherLastSeen}`);

  // --- close is terminal; assign is refused; heartbeat becomes a no-op ---
  await teacher.t.closeRoom(code);
  room = await teacher.t.fetchRoom(code);
  const closedSeen = room.teacherLastSeen;
  check('closeRoom → state is closed', room.state === ROOM_STATES.CLOSED);
  const reopen = await teacher.c.from('rooms').update({ state: ROOM_STATES.ACTIVE }).eq('code', code).select();
  check('a DIRECT write cannot reopen a closed room (trigger blocks it, room stays closed)',
    reopen.error?.code === '23514' && (await teacher.t.fetchRoom(code)).state === ROOM_STATES.CLOSED, reopen.error?.code);
  const editClosed = await teacher.c.from('rooms').update({ tempo: 200 }).eq('code', code).select();
  check('a DIRECT non-state edit of a closed room is also rejected (the closed rooms row is terminal)',
    editClosed.error?.code === '23514' && (await teacher.t.fetchRoom(code)).tempo === 120, editClosed.error?.code);
  check('assignRhythm is refused once the room is closed', await rejects(teacher.t.assignRhythm(code, R1)));
  await teacher.t.heartbeat(code);
  room = await teacher.t.fetchRoom(code);
  check('heartbeat is a no-op on a closed room (teacherLastSeen unchanged)', room.teacherLastSeen === closedSeen && room.state === ROOM_STATES.CLOSED);
} finally {
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code); // cascade cleans students + answers
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} transport checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
