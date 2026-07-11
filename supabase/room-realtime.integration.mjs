/**
 * @file supabase/room-realtime.integration.mjs
 * Integration test for room-transport.js's subscribeRoom (the live change-feed) against the REAL
 * Supabase project. A teacher subscribes to a room, a round is driven through it, and the
 * subscription's delivered view (a freshly assembled core/room.js Room) is asserted to reflect the
 * room's state after each step.
 *
 * What it proves: that the real Realtime subscription keeps the view current end-to-end. It
 * subscribes with catchUpMs:0 (no catch-up re-read, no polling) and drives a full round, asserting
 * the subscription's delivered view reflects the room's state after each step. That delivery is the live feed's — a
 * postgres_changes event, or the snapshot a (re)subscribe delivers; this test does not distinguish
 * those, only that the feed keeps the delivered view current across the round. The event-triggers-a-read mechanism and the
 * read-failure, subscription-status, coalescing, and timer paths are covered by the mock-client
 * unit tests in room-transport.subscribe.test.mjs.
 *
 * This exercises real Realtime over WebSocket, so it is timing-based: each step polls up to WAIT_MS.
 * It covers the TEACHER's full-visibility subscription; a student subscription is RLS-scoped exactly
 * as fetchRoom is (subscribeRoom re-reads through it — the read harnesses prove that scoping), and
 * is not separately re-tested here.
 *
 * IO-tested (real network), not `node --test`. Run AFTER applying the migrations (0001 + 0002):
 *
 *     node supabase/room-realtime.integration.mjs
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
const WAIT_MS = 12000;   // how long to wait for a change to arrive
const SETTLE_MS = 3000;  // pause to let the feed finish registering (and to catch stray callbacks)

let total = 0, failures = 0;
const check = (name, ok, detail = '') => {
  total++;
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? '  (' + detail + ')' : ''}`);
  if (!ok) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (predicate) => {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) { if (predicate()) return true; await sleep(150); }
  return predicate();
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

let code, unsub;
try {
  ({ code } = await teacher.t.createRoom({ meter: METER, bars: 1, tempo: 100, figures: FIGURES }));

  // --- subscribe; the current state arrives once on connect ---
  // catchUpMs: 0 disables the catch-up re-read, so `latest` is updated only by the live subscription
  // (a postgres_changes event or a resubscribe snapshot) — never by a catch-up timer or polling.
  let latest = null, count = 0;
  const errors = [];
  unsub = teacher.t.subscribeRoom(code, (room) => { latest = room; count += 1; }, { onError: (e) => errors.push(e), catchUpMs: 0 });
  check('subscription delivers the current state on connect (lobby)',
    await waitFor(() => latest && latest.state === ROOM_STATES.LOBBY && latest.rhythm === null));

  // Give Realtime a moment to finish registering the feed (the very first change after connect can be
  // dropped during registration). With catchUpMs:0 there is no catch-up and no polling, so `latest`
  // is updated only by the live subscription; a view that reflects the room's state after each step
  // shows the feed is tracking the room end-to-end.
  await sleep(SETTLE_MS);

  await teacher.t.assignRhythm(code, R1);
  check('an assign is delivered live (ACTIVE + rhythm)',
    await waitFor(() => latest.state === ROOM_STATES.ACTIVE && Array.isArray(latest.rhythm) && latest.rhythm.length === 3));

  await B.t.joinRoom(code, 'B');
  check('a join is delivered live (roster INSERT)', await waitFor(() => latest.students[B.uid]?.name === 'B'));

  await B.t.submitAnswer(code, 0, 'half');
  check('an answer is delivered live', await waitFor(() => latest.answers[B.uid]?.[0] === 'half'));

  await teacher.t.reveal(code, 0);
  check('a reveal is delivered live (revealing + revealed=[0])',
    await waitFor(() => latest.state === ROOM_STATES.REVEALING && (latest.revealed ?? []).includes(0)));

  await B.t.leaveRoom(code);
  check('a leave is delivered live (roster DELETE)', await waitFor(() => latest && !latest.students[B.uid]));

  // With the catch-up off, tracking the room's state above required the live subscription; confirm
  // several callbacks arrived (more than the single connect snapshot).
  check('the round produced multiple live callbacks (more than the connect snapshot)', count > 1, `${count} callbacks`);

  // --- unsubscribe stops further callbacks; no read errors occurred anywhere ---
  await unsub();
  unsub = null;
  const countAtUnsub = count;
  await teacher.t.reveal(code, 2);   // a real change...
  await sleep(SETTLE_MS);            // ...that must NOT reach the closed subscription
  check('no callbacks arrive after unsubscribe', count === countAtUnsub, `${countAtUnsub} → ${count}`);
  check('no subscription read errors occurred', errors.length === 0, errors.map((e) => e && e.message).join('; '));
} finally {
  if (unsub) await unsub().catch(() => {});
  if (code) {
    const del = await teacher.c.from('rooms').delete().eq('code', code);
    const left = await teacher.c.from('rooms').select('code').eq('code', code);
    check('cleanup removed the throwaway room', !del.error && (left.data?.length ?? 0) === 0, del.error?.message);
  }
}

console.log(`\n${failures === 0 ? `${total}/${total} realtime checks passed` : `${failures}/${total} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
