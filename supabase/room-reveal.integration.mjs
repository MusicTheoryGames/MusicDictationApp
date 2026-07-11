/**
 * @file supabase/room-reveal.integration.mjs
 * Integration test for room-transport.js's reveal / revealAll against the REAL Supabase project.
 * A teacher opens a round and reveals onsets to the (future) projector.
 *
 * It asserts:
 *   - reveal(beat) enters REVEALING and appends the onset (deduped, sorted); revealing the same
 *     beat again is a benign no-op.
 *   - reduce() rejects a beat that is not a figure onset.
 *   - a non-teacher cannot reveal (reveal_beat's server-side teacher check, 42501), and a null
 *     beat is rejected (23514).
 *   - revealAll reveals every onset at once.
 *   - once closed: revealAll (shell) is rejected via reduce()'s terminal guard; a DIRECT reveal_beat
 *     is rejected by the closed-mutation trigger (23514); and the shell reveal() reports rejected
 *     even for an ALREADY-revealed beat (it must not take its no-op shortcut on a closed room).
 *
 * The reveal-vs-assign race-safety comes from the FOR UPDATE lock in reveal_beat/reveal_all (an
 * implementation property, like assign_round's lock — verified by design, not raced here).
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying the migrations (0001 + 0002):
 *
 *     node supabase/room-reveal.integration.mjs
 *
 * Creates a throwaway room and deletes it at the end. Exits non-zero on any failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { createRoomTransport } from '../room-transport.js';
import { ROOM_STATES } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };
const NOT_TEACHER = '42501';     // insufficient_privilege from reveal_beat's teacher check
const CHECK_VIOLATION = '23514'; // reveal_beat's null-beat guard AND the forbid_closed_mutation trigger

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
// onsets are 0, 2, 3 (the half note spans beats 0-1, so 1 is NOT an onset).
const R1 = [{ figureId: 'half', onset: 0, beats: 2 }, { figureId: 'quarter', onset: 2, beats: 1 }, { figureId: 'quarter', onset: 3, beats: 1 }];

const teacher = await actor('teacher');
const B = await actor('student B');

let code;
try {
  ({ code } = await teacher.t.createRoom({ meter: METER, bars: 1, tempo: 100, figures: FIGURES }));
  await B.t.joinRoom(code, 'B');
  await teacher.t.assignRhythm(code, R1);

  // --- reveal one onset ---
  await teacher.t.reveal(code, 2);
  let room = await teacher.t.fetchRoom(code);
  check('reveal(2) → revealing, revealed=[2]', room.state === ROOM_STATES.REVEALING && eq(room.revealed, [2]));
  await teacher.t.reveal(code, 2);
  room = await teacher.t.fetchRoom(code);
  check('revealing the same beat again is a no-op (still [2])', eq(room.revealed, [2]));
  await teacher.t.reveal(code, 0);
  room = await teacher.t.fetchRoom(code);
  check('reveal(0) appends and keeps revealed sorted ([0,2])', eq(room.revealed, [0, 2]));

  // --- reduce() rejects a non-onset; a non-teacher cannot reveal ---
  check('reveal rejects a beat that is not a figure onset',
    await rejectsWith(teacher.t.reveal(code, 1), 'reveal rejected'));
  const forge = await B.c.rpc('reveal_beat', { p_code: code, p_beat: 3 });
  check('a non-teacher cannot reveal (server-side teacher check)', forge.error?.code === NOT_TEACHER, forge.error?.code);
  const nullBeat = await teacher.c.rpc('reveal_beat', { p_code: code, p_beat: null });
  check('reveal_beat rejects a null beat (server-side)', nullBeat.error?.code === CHECK_VIOLATION, nullBeat.error?.code);

  // --- revealAll reveals every onset ---
  await teacher.t.revealAll(code);
  room = await teacher.t.fetchRoom(code);
  check('revealAll → every onset revealed ([0,2,3])', eq(room.revealed, [0, 2, 3]), JSON.stringify(room.revealed));

  // --- closed rejects reveal (shell) and a direct reveal_beat (trigger) ---
  await teacher.t.closeRoom(code);
  check('revealAll is rejected once the room is closed', await rejectsWith(teacher.t.revealAll(code), 'revealAll rejected'));
  const directReveal = await teacher.c.rpc('reveal_beat', { p_code: code, p_beat: 2 });
  check('a DIRECT reveal on a closed room is rejected by the trigger', directReveal.error?.code === CHECK_VIOLATION, directReveal.error?.code);
  // Beat 2 is already revealed AND the room is closed: the shell must still report rejected, not
  // take its already-revealed no-op shortcut.
  check('shell reveal on a CLOSED room is rejected even for an already-revealed beat',
    await rejectsWith(teacher.t.reveal(code, 2), 'reveal rejected'));
} finally {
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code);
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} reveal checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
