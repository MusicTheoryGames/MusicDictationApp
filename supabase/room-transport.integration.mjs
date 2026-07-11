/**
 * @file supabase/room-transport.integration.mjs
 * Integration test for room-transport.js (teacher-side lifecycle: create + the "DB is truth"
 * read) against the REAL Supabase project. A teacher creates a room via the transport; two
 * students and their answers are then written with raw client calls (the join/answer verbs
 * are a later step) so we can prove that `fetchRoom` — reading through the get_room snapshot
 * function — re-assembles a core/room.js Room that folds the roster and answers correctly.
 * Also checks that RLS scopes each read: a student sees only itself, an outsider sees null.
 *
 * The INTERACTIVE state machine (join / leave / assign / answer / reveal) is a later step and
 * is not exercised through the transport here.
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying
 * supabase/migrations/0001_live_room.sql (including the get_room function):
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
import { ROOM_STATES } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// jsonb does not preserve object key order, so compare the round-tripped meter/figures by
// value rather than by raw stringify (only the beatsPerMeasure array order is meaningful).
const sameMeter = (a, b) => a.timeSignature === b.timeSignature && a.beatUnit === b.beatUnit && eq(a.beatsPerMeasure, b.beatsPerMeasure);
const sameFigures = (a, b) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return eq(ka, kb) && ka.every((k) => a[k] === b[k]);
};

async function actor(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { t: createRoomTransport(c, deps), c, uid: data.user.id };
}

const METER = { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' };
const FIGURES = { quarter: 1, half: 2 };

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
  check('fresh room assembles as a lobby with no rhythm/roster/answers',
    room.state === ROOM_STATES.LOBBY && room.rhythm === null && eq(room.students, {}) && eq(room.answers, {}));
  check('assembled room carries the meter and figure vocabulary it was created with',
    sameMeter(room.meter, METER) && sameFigures(room.figures, FIGURES) && room.bars === 1 && room.tempo === 100);

  // --- seed a roster + answers with raw writes (the join/answer verbs are a later step) ---
  // Assert each seed write so a setup failure surfaces here, not as a later null dereference.
  const seed = async (promise, what) => {
    const { error } = await promise;
    if (error) throw new Error(`seed ${what} failed: ${error.message}`);
  };
  await seed(B.c.from('room_students').insert({ room_code: code, uid: B.uid, name: 'B' }), 'B join');
  await seed(C.c.from('room_students').insert({ room_code: code, uid: C.uid, name: 'C' }), 'C join');
  await seed(B.c.from('room_answers').insert([
    { room_code: code, uid: B.uid, beat: 0, figure_id: 'half' },
    { room_code: code, uid: B.uid, beat: 2, figure_id: 'quarter' },
  ]), 'B answers');
  await seed(C.c.from('room_answers').insert({ room_code: code, uid: C.uid, beat: 0, figure_id: 'quarter' }), 'C answer');

  // --- teacher's read folds the whole roster + every answer ---
  room = await teacher.t.fetchRoom(code);
  const names = Object.values(room.students).map((s) => s.name).sort();
  check('teacher read folds both students by name', eq(names, ['B', 'C']), names.join());
  check('teacher read folds answers as answers[uid][beat] = figureId',
    room.answers[B.uid]?.[0] === 'half' && room.answers[B.uid]?.[2] === 'quarter' &&
    room.answers[C.uid]?.[0] === 'quarter' && Object.keys(room.answers[B.uid]).length === 2 &&
    Object.keys(room.answers[C.uid]).length === 1);

  // --- RLS scopes a student's read to itself: exactly one roster entry (B), C absent ---
  const bView = await B.t.fetchRoom(code);
  check('a student read sees the room but only its OWN roster entry (C absent)',
    bView !== null && Object.keys(bView.students).length === 1 && bView.students[B.uid]?.name === 'B' && !bView.students[C.uid]);
  check('a student read sees only its OWN answers (C absent)',
    Object.keys(bView.answers).length === 1 && !!bView.answers[B.uid] && !bView.answers[C.uid]);

  // --- an outsider cannot read the room at all ---
  check('outsider D fetchRoom → null (never joined)', (await D.t.fetchRoom(code)) === null);
} finally {
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code); // cascade cleans students + answers
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} transport checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
