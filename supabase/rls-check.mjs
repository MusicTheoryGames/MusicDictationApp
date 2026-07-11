/**
 * @file supabase/rls-check.mjs
 * Exercises the live-room row-level-security policies + key-immutability triggers
 * (VISION §8) against the REAL Supabase project with several genuinely-separate
 * anonymous users — trying to break each rule via INSERT and UPDATE. A write that
 * ERRORS is asserted by its specific rejection code (RLS 42501 / key-trigger 23514);
 * a write that RLS silently FILTERS is asserted as zero rows affected. Every blocked
 * attempt is also checked against the resulting data state, so a network/FK failure
 * can't masquerade as a security success. Run AFTER applying
 * supabase/migrations/0001_live_room.sql:
 *
 *     node supabase/rls-check.mjs
 *
 * Creates throwaway rooms and deletes them at the end (the anonymous auth users it
 * signs in are left behind — cheap and expected). Exits non-zero on any failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { codeFromBytes } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const RLS_DENY = '42501';   // row-level security violation
const KEY_LOCK = '23514';   // forbid_key_change() trigger (errcode check_violation)
const newCode = () => codeFromBytes([...randomBytes(6)]); // valid 6-char Crockford (VISION §8)

async function anon(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { c, uid: data.user.id };
}

// CODE = main room; CODE2 = a SECOND room B also joins (to prove the key-trigger — not RLS —
// blocks moving an answer between two joined rooms); CODE3 = a room nobody joins.
const CODE = newCode(), CODE2 = newCode(), CODE3 = newCode();
const METER = { timeSignature: '3/4', beatsPerMeasure: [3], beatUnit: 'quarter' };
const room = (code, teacher_uid) => ({ code, teacher_uid, meter: METER, bars: 1, tempo: 100, figures: { quarter: 1 } });
const rows = (res) => (res.error ? -1 : res.data.length);
const count = (client, table, filters) => {
  let q = client.from(table).select('*', { count: 'exact', head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  return q;
};

const teacher = await anon('teacher');
const B = await anon('student B');
const C = await anon('student C');
const D = await anon('outsider D');

try {
  // --- setup ---
  check('room code is valid Crockford', /^[0-9A-HJKMNP-TV-Z]{6}$/.test(CODE), CODE);
  for (const code of [CODE, CODE2, CODE3]) {
    check(`teacher can create room ${code}`, !(await teacher.c.from('rooms').insert(room(code, teacher.uid))).error);
  }
  check('student B can join CODE', !(await B.c.from('room_students').insert({ room_code: CODE, uid: B.uid, name: 'B' })).error);
  check('student B can also join CODE2', !(await B.c.from('room_students').insert({ room_code: CODE2, uid: B.uid, name: 'B' })).error);
  check('student C can join CODE', !(await C.c.from('room_students').insert({ room_code: CODE, uid: C.uid, name: 'C' })).error);

  // --- guarantee 3: cannot read an un-joined room ---
  check('outsider D cannot READ an un-joined room', rows(await D.c.from('rooms').select('code').eq('code', CODE)) === 0);
  check('joined student B CAN read the room', rows(await B.c.from('rooms').select('code').eq('code', CODE)) === 1);

  // --- guarantee 2: cannot write the room's rhythm/revealed ---
  const wrote = await B.c.from('rooms').update({ rhythm: [{ figureId: 'quarter', onset: 0, beats: 1 }], revealed: [0] }).eq('code', CODE).select();
  const afterB = (await teacher.c.from('rooms').select('rhythm,revealed').eq('code', CODE).single()).data;
  check('student B CANNOT write the room rhythm/revealed (0 rows + unchanged)',
    rows(wrote) === 0 && afterB.rhythm === null && afterB.revealed.length === 0,
    `wrote=${rows(wrote)} rhythm=${JSON.stringify(afterB.rhythm)} revealed=${JSON.stringify(afterB.revealed)}`);
  check('teacher CAN assign the rhythm',
    !(await teacher.c.from('rooms').update({ rhythm: [{ figureId: 'quarter', onset: 0, beats: 1 }], state: 'active' }).eq('code', CODE)).error);

  // --- guarantee 1: a student writes ONLY its own answer ---
  const forgeIns = await B.c.from('room_answers').insert({ room_code: CODE, uid: C.uid, beat: 0, figure_id: 'x' });
  check("B cannot INSERT C's answer (RLS + no row created)",
    forgeIns.error?.code === RLS_DENY && (await count(teacher.c, 'room_answers', { room_code: CODE, uid: C.uid })).count === 0,
    forgeIns.error?.code);
  check('B can write its OWN answer', !(await B.c.from('room_answers').insert({ room_code: CODE, uid: B.uid, beat: 0, figure_id: 'quarter' })).error);
  check('C can write its OWN answer', !(await C.c.from('room_answers').insert({ room_code: CODE, uid: C.uid, beat: 0, figure_id: 'quarter' })).error);

  const cVal = () => teacher.c.from('room_answers').select('figure_id').eq('room_code', CODE).eq('uid', C.uid).single();
  const forgeUpd = await B.c.from('room_answers').update({ figure_id: 'HACKED' }).eq('room_code', CODE).eq('uid', C.uid).select();
  check("B cannot UPDATE C's answer", rows(forgeUpd) === 0 && (await cVal()).data.figure_id === 'quarter');

  // Move own answer CODE -> CODE2, a room B HAS joined. RLS would permit both; only the trigger blocks.
  const moveAns = await B.c.from('room_answers').update({ room_code: CODE2 }).eq('room_code', CODE).eq('uid', B.uid).eq('beat', 0);
  check('B cannot MOVE its answer between two joined rooms (key trigger)', moveAns.error?.code === KEY_LOCK, moveAns.error?.code);
  check('  …answer stayed in CODE, none created in CODE2',
    (await count(teacher.c, 'room_answers', { room_code: CODE, uid: B.uid })).count === 1 &&
    (await count(teacher.c, 'room_answers', { room_code: CODE2, uid: B.uid })).count === 0);

  // Move own MEMBERSHIP CODE -> CODE3 (B is NOT a member of CODE3; students_update checks uid only, so the trigger is the blocker).
  const moveMem = await B.c.from('room_students').update({ room_code: CODE3 }).eq('room_code', CODE).eq('uid', B.uid);
  check('B cannot MOVE its membership to another room (key trigger)', moveMem.error?.code === KEY_LOCK, moveMem.error?.code);
  check('  …membership stayed in CODE, none created in CODE3',
    (await count(teacher.c, 'room_students', { room_code: CODE, uid: B.uid })).count === 1 &&
    (await count(teacher.c, 'room_students', { room_code: CODE3, uid: B.uid })).count === 0);

  // Leaving revokes UPDATE (membership gone): 0 rows, unchanged.
  await C.c.from('room_students').delete().eq('room_code', CODE).eq('uid', C.uid);
  const leaveUpd = await C.c.from('room_answers').update({ figure_id: 'HACKED' }).eq('room_code', CODE).eq('uid', C.uid).select();
  check('a student cannot tamper with its answer after leaving', rows(leaveUpd) === 0 && (await cVal()).data.figure_id === 'quarter');

  // reads: teacher sees all, a student sees only its own
  check('teacher CAN read all answers', rows(await teacher.c.from('room_answers').select('uid').eq('room_code', CODE)) === 2);
  const bReads = (await B.c.from('room_answers').select('uid').eq('room_code', CODE)).data;
  check('student B reads only its OWN answers', bReads.length === 1 && bReads[0].uid === B.uid, `${bReads.length} rows`);
} finally {
  const del = await teacher.c.from('rooms').delete().in('code', [CODE, CODE2, CODE3]); // cascade cleans students + answers
  const remaining = await teacher.c.from('rooms').select('code').in('code', [CODE, CODE2, CODE3]);
  check('cleanup removed the throwaway rooms', !del.error && rows(remaining) === 0, del.error?.message || `${rows(remaining)} left`);
}

console.log(`\n${failures === 0 ? `${total}/${total} RLS checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
