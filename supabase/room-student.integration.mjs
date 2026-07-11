/**
 * @file supabase/room-student.integration.mjs
 * Integration test for room-transport.js's STUDENT roster verbs (joinRoom / leaveRoom) against
 * the REAL Supabase project. A teacher creates a room; students then join, rejoin (rename),
 * leave, and are checked against the closed-room guards.
 *
 * It asserts:
 *   - joinRoom adds the caller's own roster row; the teacher's read shows it; the joiner can then
 *     read the room (membership took effect); a rejoin refreshes the name without duplicating.
 *   - join_room rejects an empty name and a missing room. (join_room always inserts auth.uid(), so a
 *     caller can only join as itself; cross-user roster protection is covered in rls-check.)
 *   - leaveRoom removes only the caller's row; leaving when not a member is a no-op.
 *   - CLOSED is terminal for JOINs: joinRoom into a closed room is rejected, a DIRECT client insert
 *     into a closed room's roster is rejected by the trigger, and leaveRoom on a closed room is a
 *     no-op (matching core's LEAVE-after-CLOSE). These are sequential checks against an ALREADY-closed
 *     room; the trigger's FOR SHARE lock is what makes a join racing a close safe (an implementation
 *     property, like assign_round's lock — not raced here).
 *
 * Student ANSWERING (and its post-close guard) is a later step, not exercised here.
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying
 * supabase/migrations/0001_live_room.sql (including join_room, leave_room, and the
 * room_students_forbid_closed trigger):
 *
 *     node supabase/room-student.integration.mjs
 *
 * Creates a throwaway room and deletes it at the end; leaves behind the anonymous auth users it
 * signs in (cheap, expected). Exits non-zero on any failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { createRoomTransport } from '../room-transport.js';
import { codeFromBytes } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };
const KEY_CHECK = '23514'; // check_violation raised by join_room / the closed-write trigger

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rejects = async (promise) => { try { await promise; return false; } catch { return true; } };
const roster = async (t, code) => Object.values((await t.fetchRoom(code)).students).map((s) => s.name).sort();

async function actor(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { t: createRoomTransport(c, deps), c, uid: data.user.id };
}

const METER = { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' };
const FIGURES = { quarter: 1, half: 2 };
const ABSENT = codeFromBytes([...randomBytes(6)]); // a valid, never-created room code

const teacher = await actor('teacher');
const B = await actor('student B');
const C = await actor('student C');
const D = await actor('outsider D');

let code;
try {
  ({ code } = await teacher.t.createRoom({ meter: METER, bars: 1, tempo: 100, figures: FIGURES }));

  // --- join adds the caller's own row; the teacher sees it; the joiner can now read the room ---
  await B.t.joinRoom(code, 'B');
  await C.t.joinRoom(code, 'C');
  check('teacher sees both joined students', eq(await roster(teacher.t, code), ['B', 'C']));
  check('a joined student can now read the room (membership took effect)', (await B.t.fetchRoom(code)) !== null);

  // --- rejoin refreshes the name without duplicating the row ---
  await B.t.joinRoom(code, 'Bee');
  check('rejoin renames in place (still two students, B is now Bee)', eq(await roster(teacher.t, code), ['Bee', 'C']));

  // --- join_room validates name + room existence ---
  check('joinRoom rejects an empty name', await rejects(B.t.joinRoom(code, '')));
  check('joinRoom rejects a room that does not exist', await rejects(B.t.joinRoom(ABSENT, 'B')));

  // --- leave removes only the caller's row; leaving twice is a no-op ---
  await B.t.leaveRoom(code);
  check('after B leaves, the roster is exactly [C]', eq(await roster(teacher.t, code), ['C']));
  await B.t.leaveRoom(code);
  check('leaving again (not a member) is a no-op', eq(await roster(teacher.t, code), ['C']));

  // --- CLOSED is terminal for JOINs ---
  await teacher.t.closeRoom(code);
  check('joinRoom into a closed room is rejected', await rejects(D.t.joinRoom(code, 'D')));
  const directInsert = await D.c.from('room_students').insert({ room_code: code, uid: D.uid, name: 'D' }).select();
  check('a DIRECT roster insert into a closed room is rejected by the trigger',
    directInsert.error?.code === KEY_CHECK, directInsert.error?.code);
  check('the closed room roster is unchanged (still [C])', eq(await roster(teacher.t, code), ['C']));
  await C.t.leaveRoom(code);
  check('leaveRoom on a closed room is a no-op (C stays, matching core)', eq(await roster(teacher.t, code), ['C']));
} finally {
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code); // cascade cleans students + answers
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} student checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
