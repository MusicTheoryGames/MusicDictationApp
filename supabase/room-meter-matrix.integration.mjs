/**
 * @file supabase/room-meter-matrix.integration.mjs
 * Meter round-trip test for the live room (VISION §8) against the REAL Supabase project.
 * core/room.test.js proves `beatCount` for every §8 meter at the pure layer; this drives every §8
 * meter through the transport round-trip — create → assign → join → answer → reveal (playing the
 * rhythm's audio is a client concern, not a transport operation) — and asserts:
 *   - the full meter round-trips create→fetch unchanged (timeSignature + beatsPerMeasure + beatUnit),
 *   - the shell validates a new rhythm against the meter it READ BACK from the DB: a rhythm sized
 *     bars*4 is rejected wherever that differs from the real beat count (every meter but 4/4 and
 *     12/8), so the round-tripped meter — not a 4-beats/bar assumption — drives validation. (This is
 *     shell-side `reduce()` validation; the DB does not enforce tiling, by design.)
 *   - a rhythm tiling all the beats is accepted and read back, a joined student's answer is stored
 *     and graded on the teacher's read, and revealAll reveals every onset.
 * Includes 5/8 as the schema NON-PRECLUSION case: no UI exposes it, but the whole create→assign→
 * join→answer→reveal path must still handle it (VISION §8).
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying the migrations:
 *
 *     node supabase/room-meter-matrix.integration.mjs
 *
 * One teacher + one student; a throwaway room per meter, all deleted at the end. Non-zero on failure.
 */
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';
import { createRoomTransport } from '../room-transport.js';
import { beatCount, beatCorrectCounts, ROOM_STATES } from '../core/room.js';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const deps = { randomBytes: (n) => randomBytes(n), now: () => Date.now() };

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Reject specifically with the transport's own validation message, so an unrelated auth/fetch/network
// failure cannot masquerade as the expected rejection.
const rejectsWith = async (p, needle) => {
  try { await p; return false; } catch (e) { return String(e && e.message || e).includes(needle); }
};
const sameMeter = (a, b) =>
  a.timeSignature === b.timeSignature && a.beatUnit === b.beatUnit && eq(a.beatsPerMeasure, b.beatsPerMeasure);

const METERS = [
  { timeSignature: '2/4', beatsPerMeasure: [2], beatUnit: 'quarter' },
  { timeSignature: '3/4', beatsPerMeasure: [3], beatUnit: 'quarter' },
  { timeSignature: '4/4', beatsPerMeasure: [4], beatUnit: 'quarter' },
  { timeSignature: '2/2', beatsPerMeasure: [2], beatUnit: 'half' },
  { timeSignature: '3/2', beatsPerMeasure: [3], beatUnit: 'half' },
  { timeSignature: '6/8', beatsPerMeasure: [2], beatUnit: 'dotted-quarter' },
  { timeSignature: '9/8', beatsPerMeasure: [3], beatUnit: 'dotted-quarter' },
  { timeSignature: '12/8', beatsPerMeasure: [4], beatUnit: 'dotted-quarter' },
  { timeSignature: '5/8', beatsPerMeasure: [5], beatUnit: 'eighth' }, // non-preclusion: no UI, still round-trips
];
// A neutral 1-beat figure: in a compound meter a "beat" is a dotted-quarter, not a quarter.
const FIGURES = { beat: 1 };
const BARS = 2; // >1 bar so bars*4 diverges from the real beat count for meters whose beatsPerMeasure
                // isn't 4 (3/4×2=6≠8) — which is exactly where the wrong-count check runs (not 4/4, 12/8)
const tile = (beats) => Array.from({ length: beats }, (_, i) => ({ figureId: 'beat', onset: i, beats: 1 }));

async function actor(label) {
  const c = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
  const { data, error } = await c.auth.signInAnonymously();
  if (error) throw new Error(`${label} sign-in failed: ${error.message}`);
  return { t: createRoomTransport(c, deps), c, uid: data.user.id };
}

const teacher = await actor('teacher');
const student = await actor('student');

const codes = [];
try {
  for (const meter of METERS) {
    const beats = beatCount(meter, BARS);
    const { code } = await teacher.t.createRoom({ meter, bars: BARS, tempo: 100, figures: FIGURES });
    codes.push(code);

    const lobby = await teacher.t.fetchRoom(code);
    check(`${meter.timeSignature}: meter round-trips through create→fetch (timeSig + beatsPerMeasure + beatUnit)`,
      sameMeter(lobby.meter, meter) && lobby.bars === BARS, JSON.stringify(lobby.meter));

    // The shell validates a new rhythm against the meter it READ BACK: a bars*4-sized rhythm must be
    // rejected wherever bars*4 differs from the true beat count (all meters but 4/4 and 12/8). If the
    // meter had round-tripped as a plain measureCount*4, this would wrongly be accepted.
    if (BARS * 4 !== beats) {
      const wrongRejected = await rejectsWith(teacher.t.assignRhythm(code, tile(BARS * 4)), 'assignRhythm rejected');
      const stillLobby = await teacher.t.fetchRoom(code);
      check(`${meter.timeSignature}: a wrong-count rhythm (bars*4 = ${BARS * 4}, real = ${beats}) is rejected; room stays a lobby, no rhythm`,
        wrongRejected && stillLobby.state === ROOM_STATES.LOBBY && stillLobby.rhythm === null);
    }

    await teacher.t.assignRhythm(code, tile(beats));
    const active = await teacher.t.fetchRoom(code);
    check(`${meter.timeSignature}: a rhythm tiling all ${beats} beats is accepted and read back`,
      active.state === ROOM_STATES.ACTIVE && Array.isArray(active.rhythm) && active.rhythm.length === beats &&
      active.rhythm.every((cell, i) => cell.onset === i && cell.beats === 1 && cell.figureId === 'beat'));

    // create → assign → JOIN → ANSWER → reveal — the full transport round-trip (audio playback is
    // client-side, not a backend op).
    await student.t.joinRoom(code, 'S');
    await student.t.submitAnswer(code, 0, 'beat'); // correct at onset 0
    const answered = await teacher.t.fetchRoom(code);
    check(`${meter.timeSignature}: a joined student's answer is stored and graded on the teacher's read`,
      answered.answers[student.uid]?.[0] === 'beat' &&
      beatCorrectCounts(answered).find((c) => c.onset === 0)?.correct === 1);

    await teacher.t.revealAll(code);
    const revealing = await teacher.t.fetchRoom(code);
    check(`${meter.timeSignature}: revealAll reveals all ${beats} onsets and enters revealing`,
      revealing.state === ROOM_STATES.REVEALING &&
      eq(revealing.revealed, Array.from({ length: beats }, (_, i) => i)), JSON.stringify(revealing.revealed));
  }
} finally {
  if (codes.length) {
    const del = await teacher.c.from('rooms').delete().in('code', codes);
    const left = await teacher.c.from('rooms').select('code').in('code', codes);
    check('cleanup removed all throwaway rooms', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} meter-matrix checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
