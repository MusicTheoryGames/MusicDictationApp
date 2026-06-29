/**
 * core/review.test.js
 * ----------------------------------------------------------------------------
 * Exhaustive unit tests for the spaced-repetition review scheduler.
 * Pure node:test / node:assert — no framework, no I/O. Run with:
 *
 *     node --test core/review.test.js
 *     node --check core/review.js
 *
 * Every test injects an explicit `now` so behavior is fully deterministic.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BOX_INTERVALS_MS,
  MIN_BOX,
  MAX_BOX,
  DEMOTE_STEP,
  TARGET_RETENTION,
  SESSION_REVIEW_RATIO,
  SESSION_NEW_RATIO_BAND,
  MAX_NEW_PER_SESSION,
  DEFAULT_SESSION_SIZE,
  createEntry,
  applyResult,
  dueItems,
  composeSession,
} from './review.js';

// --- Fixtures ---------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000; // arbitrary fixed epoch-ms anchor

/** Build a ReviewState from a list of entries. */
const state = (entries) => ({ entries });

// ============================================================================
// Constants sanity
// ============================================================================

test('constants: box intervals are strictly expanding and day-aligned', () => {
  assert.equal(BOX_INTERVALS_MS[0], 0, 'index 0 is an unused placeholder');
  // 1d, 3d, 7d, 16d, 35d, 75d
  assert.deepEqual(
    BOX_INTERVALS_MS.slice(1).map((ms) => ms / DAY),
    [1, 3, 7, 16, 35, 75],
  );
  for (let b = 2; b <= MAX_BOX; b++) {
    assert.ok(
      BOX_INTERVALS_MS[b] > BOX_INTERVALS_MS[b - 1],
      `box ${b} interval must exceed box ${b - 1}`,
    );
  }
});

test('constants: box bounds and tunables are coherent', () => {
  assert.equal(MIN_BOX, 1);
  assert.equal(MAX_BOX, BOX_INTERVALS_MS.length - 1);
  assert.equal(MAX_BOX, 6);
  assert.equal(DEMOTE_STEP, 1);
  assert.equal(TARGET_RETENTION, 0.85);
  assert.equal(SESSION_REVIEW_RATIO, 0.75);
  assert.deepEqual([...SESSION_NEW_RATIO_BAND], [0.2, 0.3]);
  assert.equal(MAX_NEW_PER_SESSION, 5);
  assert.equal(DEFAULT_SESSION_SIZE, 20);
  // The target review ratio implies a new ratio inside the band.
  const newRatioTarget = 1 - SESSION_REVIEW_RATIO;
  assert.ok(newRatioTarget >= SESSION_NEW_RATIO_BAND[0]);
  assert.ok(newRatioTarget <= SESSION_NEW_RATIO_BAND[1]);
});

test('constants: BOX_INTERVALS_MS and band are frozen (immutable)', () => {
  assert.ok(Object.isFrozen(BOX_INTERVALS_MS));
  assert.ok(Object.isFrozen(SESSION_NEW_RATIO_BAND));
});

// ============================================================================
// createEntry
// ============================================================================

test('createEntry: fresh skill enters at box 1, due immediately', () => {
  const e = createEntry('rhythm.simple.quarters', T0);
  assert.equal(e.skillId, 'rhythm.simple.quarters');
  assert.equal(e.box, MIN_BOX);
  assert.equal(e.dueAt, T0, 'due now so it appears in the next session');
  assert.equal(e.lastResult, null);
  assert.equal(e.lapses, 0);
});

test('createEntry: returns a frozen entry', () => {
  const e = createEntry('s', T0);
  assert.ok(Object.isFrozen(e));
});

test('createEntry: validates inputs', () => {
  assert.throws(() => createEntry('', T0), TypeError);
  assert.throws(() => createEntry(123, T0), TypeError);
  assert.throws(() => createEntry('s', NaN), TypeError);
  assert.throws(() => createEntry('s', Infinity), TypeError);
});

// ============================================================================
// applyResult — promotion / interval expansion
// ============================================================================

test('applyResult: correct promotes one box and schedules the box interval', () => {
  const e0 = createEntry('s', T0);
  const e1 = applyResult(e0, true, T0);
  assert.equal(e1.box, 2);
  assert.equal(e1.dueAt, T0 + BOX_INTERVALS_MS[2]); // +3d
  assert.equal(e1.lastResult, true);
  assert.equal(e1.lapses, 0);
});

test('applyResult: full correct streak walks boxes 1→MAX with expanding intervals', () => {
  let e = createEntry('s', T0);
  let now = T0;
  const seenIntervals = [];
  for (let step = 0; step < MAX_BOX + 2; step++) {
    const prevBox = e.box;
    e = applyResult(e, true, now);
    const expectedBox = Math.min(prevBox + 1, MAX_BOX);
    assert.equal(e.box, expectedBox, `step ${step}: box`);
    assert.equal(e.dueAt, now + BOX_INTERVALS_MS[expectedBox], `step ${step}: dueAt`);
    seenIntervals.push(e.dueAt - now);
    now = e.dueAt; // pretend the learner reviews exactly when due
  }
  // Intervals expand until the ceiling, then stay at the ceiling.
  assert.deepEqual(
    seenIntervals,
    [
      BOX_INTERVALS_MS[2], // 1→2
      BOX_INTERVALS_MS[3], // 2→3
      BOX_INTERVALS_MS[4], // 3→4
      BOX_INTERVALS_MS[5], // 4→5
      BOX_INTERVALS_MS[6], // 5→6
      BOX_INTERVALS_MS[6], // 6→6 (capped)
      BOX_INTERVALS_MS[6], // 6→6 (capped)
      BOX_INTERVALS_MS[6], // 6→6 (capped)  — 8 iterations total
    ],
  );
});

test('applyResult: at MAX_BOX a correct answer stays at MAX_BOX (no overflow)', () => {
  const e = Object.freeze({ skillId: 's', box: MAX_BOX, dueAt: T0, lastResult: true, lapses: 0 });
  const next = applyResult(e, true, T0);
  assert.equal(next.box, MAX_BOX);
  assert.equal(next.dueAt, T0 + BOX_INTERVALS_MS[MAX_BOX]);
});

// ============================================================================
// applyResult — demotion / lapse / shorten
// ============================================================================

test('applyResult: wrong demotes one box, shortens interval, counts the lapse', () => {
  // Start at box 4.
  const e = Object.freeze({ skillId: 's', box: 4, dueAt: T0, lastResult: true, lapses: 2 });
  const next = applyResult(e, false, T0);
  assert.equal(next.box, 4 - DEMOTE_STEP); // 3
  assert.equal(next.dueAt, T0 + BOX_INTERVALS_MS[3], 'shorter interval than box 4');
  assert.ok(next.dueAt - T0 < BOX_INTERVALS_MS[4]);
  assert.equal(next.lastResult, false);
  assert.equal(next.lapses, 3);
});

test('applyResult: wrong at box 1 stays at box 1 (floor) but still counts the lapse', () => {
  const e = createEntry('s', T0);
  const next = applyResult(e, false, T0);
  assert.equal(next.box, MIN_BOX);
  assert.equal(next.dueAt, T0 + BOX_INTERVALS_MS[MIN_BOX]); // +1d
  assert.equal(next.lapses, 1);
});

test('applyResult: lapses accumulate monotonically across a mixed sequence', () => {
  let e = createEntry('s', T0);
  let now = T0;
  // Sequence: ✓ ✓ ✗ ✓ ✗ ✗ ✓
  const seq = [true, true, false, true, false, false, true];
  let expectedLapses = 0;
  let expectedBox = MIN_BOX;
  for (const correct of seq) {
    e = applyResult(e, correct, now);
    expectedBox = correct
      ? Math.min(expectedBox + 1, MAX_BOX)
      : Math.max(expectedBox - DEMOTE_STEP, MIN_BOX);
    if (!correct) expectedLapses++;
    assert.equal(e.box, expectedBox);
    assert.equal(e.lapses, expectedLapses);
    assert.equal(e.dueAt, now + BOX_INTERVALS_MS[expectedBox]);
    now = e.dueAt;
  }
  assert.equal(e.lapses, 3);
});

test('applyResult: does not mutate the input entry (immutability)', () => {
  const e = createEntry('s', T0);
  const snapshot = { ...e };
  const next = applyResult(e, true, T0 + 999);
  assert.deepEqual({ ...e }, snapshot, 'input entry unchanged');
  assert.notEqual(next, e);
  assert.ok(Object.isFrozen(next));
});

test('applyResult: schedules relative to actual review time, not original dueAt', () => {
  // Entry was due at T0 but reviewed 10 days late.
  const e = Object.freeze({ skillId: 's', box: 1, dueAt: T0, lastResult: null, lapses: 0 });
  const lateNow = T0 + 10 * DAY;
  const next = applyResult(e, true, lateNow);
  assert.equal(next.dueAt, lateNow + BOX_INTERVALS_MS[2], 'late reviews do not compound');
});

test('applyResult: validates inputs', () => {
  const e = createEntry('s', T0);
  assert.throws(() => applyResult(null, true, T0), TypeError);
  assert.throws(() => applyResult(e, 'yes', T0), TypeError);
  assert.throws(() => applyResult(e, 1, T0), TypeError); // not a real boolean
  assert.throws(() => applyResult(e, true, NaN), TypeError);
});

// ============================================================================
// dueItems — at multiple `now` values
// ============================================================================

test('dueItems: empty state yields no due items', () => {
  assert.deepEqual(dueItems(state([]), T0), []);
});

test('dueItems: filters by dueAt <= now at several time points', () => {
  const entries = [
    { skillId: 'a', box: 1, dueAt: T0 + 1 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'b', box: 1, dueAt: T0 + 3 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'c', box: 1, dueAt: T0 + 7 * DAY, lastResult: true, lapses: 0 },
  ];
  const st = state(entries);

  assert.deepEqual(dueItems(st, T0).map((e) => e.skillId), [], 'nothing due before day 1');
  assert.deepEqual(dueItems(st, T0 + 1 * DAY).map((e) => e.skillId), ['a'], 'day 1 boundary inclusive');
  assert.deepEqual(dueItems(st, T0 + 3 * DAY).map((e) => e.skillId), ['a', 'b']);
  assert.deepEqual(dueItems(st, T0 + 100 * DAY).map((e) => e.skillId), ['a', 'b', 'c'], 'all due eventually');
});

test('dueItems: boundary is inclusive exactly at dueAt', () => {
  const st = state([{ skillId: 'a', box: 1, dueAt: T0, lastResult: null, lapses: 0 }]);
  assert.equal(dueItems(st, T0 - 1).length, 0);
  assert.equal(dueItems(st, T0).length, 1);
  assert.equal(dueItems(st, T0 + 1).length, 1);
});

test('dueItems: sorts soonest-due first, ties broken by skillId', () => {
  const entries = [
    { skillId: 'zeta', box: 1, dueAt: T0 + 5 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'alpha', box: 1, dueAt: T0 + 2 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'gamma', box: 1, dueAt: T0 + 2 * DAY, lastResult: true, lapses: 0 }, // tie with alpha
    { skillId: 'beta', box: 1, dueAt: T0 + 1 * DAY, lastResult: true, lapses: 0 },
  ];
  const due = dueItems(state(entries), T0 + 100 * DAY);
  assert.deepEqual(due.map((e) => e.skillId), ['beta', 'alpha', 'gamma', 'zeta']);
});

test('dueItems: does not mutate the input state array order', () => {
  const entries = [
    { skillId: 'b', box: 1, dueAt: T0 + 2 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'a', box: 1, dueAt: T0 + 1 * DAY, lastResult: true, lapses: 0 },
  ];
  const st = state(entries);
  const before = st.entries.map((e) => e.skillId);
  dueItems(st, T0 + 100 * DAY);
  assert.deepEqual(st.entries.map((e) => e.skillId), before, 'original order preserved');
});

test('dueItems: cross-game interleaving — one queue, many games', () => {
  const entries = [
    { skillId: 'melodic.intervals.m3', box: 2, dueAt: T0 + 1 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'rhythm.simple.eighths', box: 1, dueAt: T0 + 2 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'chord.quality.maj', box: 3, dueAt: T0 + 3 * DAY, lastResult: true, lapses: 0 },
  ];
  const due = dueItems(state(entries), T0 + 5 * DAY);
  assert.deepEqual(due.map((e) => e.skillId), [
    'melodic.intervals.m3',
    'rhythm.simple.eighths',
    'chord.quality.maj',
  ]);
});

test('dueItems: validates inputs', () => {
  assert.throws(() => dueItems(null, T0), TypeError);
  assert.throws(() => dueItems({ entries: 'no' }, T0), TypeError);
  assert.throws(() => dueItems(state([]), NaN), TypeError);
});

// ============================================================================
// composeSession — ratios, caps, edge cases
// ============================================================================

/** Make `n` due review entries, all due at T0, skillIds r0..r{n-1}. */
function dueEntries(n, base = 'r') {
  return Array.from({ length: n }, (_, i) => ({
    skillId: `${base}${i}`,
    box: 1,
    dueAt: T0,
    lastResult: true,
    lapses: 0,
  }));
}

test('composeSession: typical mix hits the 70–80% review / 20–30% new band', () => {
  // Plenty of due review and plenty of new available.
  const st = state(dueEntries(40));
  const newAvail = Array.from({ length: 30 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0); // default size 20

  assert.equal(plan.total, DEFAULT_SESSION_SIZE);
  // new target = round(0.25 * 20) = 5, capped at MAX_NEW_PER_SESSION = 5.
  assert.equal(plan.new.length, 5);
  assert.equal(plan.review.length, 15);
  assert.ok(plan.newRatio >= SESSION_NEW_RATIO_BAND[0] - 1e-9);
  assert.ok(plan.newRatio <= SESSION_NEW_RATIO_BAND[1] + 1e-9);
  assert.ok(plan.reviewRatio >= 0.70 - 1e-9 && plan.reviewRatio <= 0.80 + 1e-9);
  // Review items are the soonest-due ones.
  assert.ok(plan.review.every((e) => e.dueAt <= T0));
});

test('composeSession: new count never exceeds MAX_NEW_PER_SESSION', () => {
  const st = state(dueEntries(100));
  const newAvail = Array.from({ length: 100 }, (_, i) => `new${i}`);
  // Even with a huge session size, new is capped.
  const plan = composeSession(st, newAvail, T0, { sessionSize: 50 });
  assert.equal(plan.new.length, MAX_NEW_PER_SESSION);
});

test('composeSession: maxNew override is respected', () => {
  const st = state(dueEntries(40));
  const newAvail = Array.from({ length: 30 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0, { maxNew: 2 });
  assert.equal(plan.new.length, 2);
  assert.equal(plan.review.length, DEFAULT_SESSION_SIZE - 2);
});

test('composeSession: empty review queue → all-new, still capped (day one)', () => {
  const st = state([]);
  const newAvail = Array.from({ length: 20 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0);
  assert.equal(plan.review.length, 0);
  assert.equal(plan.new.length, MAX_NEW_PER_SESSION, 'all-new but capped');
  assert.ok(Number.isNaN(plan.reviewRatio) === false);
  assert.equal(plan.newRatio, 1);
  assert.equal(plan.reviewRatio, 0);
});

test('composeSession: no available new → all-review', () => {
  const st = state(dueEntries(8));
  const plan = composeSession(st, [], T0);
  assert.equal(plan.new.length, 0);
  assert.equal(plan.review.length, 8, 'every due item, up to session size');
  assert.equal(plan.newRatio, 0);
  assert.equal(plan.reviewRatio, 1);
});

test('composeSession: completely empty (no review, no new) → empty plan with NaN ratios', () => {
  const plan = composeSession(state([]), [], T0);
  assert.equal(plan.total, 0);
  assert.equal(plan.review.length, 0);
  assert.equal(plan.new.length, 0);
  assert.ok(Number.isNaN(plan.reviewRatio));
  assert.ok(Number.isNaN(plan.newRatio));
});

test('composeSession: ALL items due and abundant → fills session, band respected', () => {
  const st = state(dueEntries(1000));
  const newAvail = Array.from({ length: 1000 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0, { sessionSize: 20 });
  assert.equal(plan.total, 20);
  assert.equal(plan.new.length, 5);
  assert.equal(plan.review.length, 15);
});

test('composeSession: sparse review (fewer due than review target) accepts higher new ratio', () => {
  // Only 3 due review items, but lots of new available.
  const st = state(dueEntries(3));
  const newAvail = Array.from({ length: 20 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0);
  // Review supply is the limiter: take all 3 review, plus capped new (5).
  assert.equal(plan.review.length, 3);
  assert.equal(plan.new.length, MAX_NEW_PER_SESSION);
  assert.equal(plan.total, 8);
});

test('composeSession: sparse regime is governed by MAX_NEW, not the band ceiling (documented contract)', () => {
  // 10 due review items + abundant new. Review supply is the limiter (we take all 10),
  // so the session ADDS new up to MAX_NEW_PER_SESSION even though that pushes the new
  // ratio above the 30% band ceiling. This is the deliberate sparse-regime behavior:
  // cognitive load is bounded by MAX_NEW, the ratio band is a steady-state target only.
  const st = state(dueEntries(10));
  const newAvail = Array.from({ length: 20 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0);
  assert.equal(plan.review.length, 10, 'all available review is taken');
  assert.equal(plan.new.length, MAX_NEW_PER_SESSION, 'new is bounded by the absolute cap, not the band');
  // Resulting new ratio = 5 / 15 ≈ 0.33 — ABOVE the 0.30 band ceiling, and that is correct.
  assert.ok(plan.newRatio > SESSION_NEW_RATIO_BAND[1],
    'sparse regime legitimately exceeds the band upper edge');
  // But it never exceeds the hard cognitive-load cap.
  assert.ok(plan.new.length <= MAX_NEW_PER_SESSION);
});

test('composeSession: band upper-bound enforced when review supply can substitute', () => {
  // Enough due items to substitute, small maxNew shouldn't matter here; use a
  // session size where the rounded new target would exceed the band, and verify
  // review grows instead.
  const st = state(dueEntries(100));
  const newAvail = Array.from({ length: 100 }, (_, i) => `new${i}`);
  const plan = composeSession(st, newAvail, T0, { sessionSize: 10, maxNew: 100 });
  // target new = round(0.25*10)=3 → band ceiling floor(0.3*10)=3, ok, stays 3.
  assert.equal(plan.new.length, 3);
  assert.equal(plan.review.length, 7);
  assert.ok(plan.newRatio <= SESSION_NEW_RATIO_BAND[1] + 1e-9);
});

test('composeSession: skills already in the review queue are excluded from "new"', () => {
  const st = state([
    { skillId: 'shared', box: 2, dueAt: T0, lastResult: true, lapses: 0 },
    ...dueEntries(10),
  ]);
  const newAvail = ['shared', 'genuinely-new-1', 'genuinely-new-2'];
  const plan = composeSession(st, newAvail, T0);
  assert.ok(!plan.new.includes('shared'), 'mastered skill is never re-offered as new');
  assert.ok(plan.new.includes('genuinely-new-1'));
});

test('composeSession: duplicate availableNew ids are de-duped, order preserved', () => {
  const st = state([]);
  const newAvail = ['x', 'x', 'y', 'x', 'z'];
  const plan = composeSession(st, newAvail, T0, { maxNew: 10 });
  assert.deepEqual(plan.new, ['x', 'y', 'z']);
});

test('composeSession: new selection follows curriculum (input) order', () => {
  const st = state([]);
  const newAvail = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7'];
  const plan = composeSession(st, newAvail, T0); // capped at 5
  assert.deepEqual(plan.new, ['ch1', 'ch2', 'ch3', 'ch4', 'ch5']);
});

test('composeSession: only not-yet-due review items are excluded from review', () => {
  const entries = [
    { skillId: 'due1', box: 1, dueAt: T0 - DAY, lastResult: true, lapses: 0 },
    { skillId: 'future', box: 3, dueAt: T0 + 30 * DAY, lastResult: true, lapses: 0 },
    { skillId: 'due2', box: 1, dueAt: T0, lastResult: true, lapses: 0 },
  ];
  const plan = composeSession(state(entries), [], T0);
  assert.deepEqual(plan.review.map((e) => e.skillId).sort(), ['due1', 'due2']);
  assert.ok(!plan.review.some((e) => e.skillId === 'future'));
});

test('composeSession: returns a frozen plan and does not mutate state', () => {
  const entries = dueEntries(5);
  const st = state(entries);
  const before = JSON.stringify(st);
  const plan = composeSession(st, ['n1', 'n2'], T0);
  assert.ok(Object.isFrozen(plan));
  assert.equal(JSON.stringify(st), before, 'state untouched');
});

test('composeSession: sessionSize 0 yields an empty plan', () => {
  const st = state(dueEntries(10));
  const plan = composeSession(st, ['n1'], T0, { sessionSize: 0 });
  assert.equal(plan.total, 0);
});

test('composeSession: validates inputs', () => {
  assert.throws(() => composeSession(null, [], T0), TypeError);
  assert.throws(() => composeSession(state([]), 'no', T0), TypeError);
  assert.throws(() => composeSession(state([]), [], NaN), TypeError);
  assert.throws(() => composeSession(state([]), [], T0, { sessionSize: -1 }), TypeError);
  assert.throws(() => composeSession(state([]), [], T0, { sessionSize: 2.5 }), TypeError);
  assert.throws(() => composeSession(state([]), [], T0, { maxNew: -1 }), TypeError);
});

// ============================================================================
// End-to-end: a multi-session lifecycle threading the pure functions together
// ============================================================================

test('lifecycle: master → review → lapse → recover, driven only by injected now', () => {
  let entries = [];
  let now = T0;

  // Day 0: learner masters two rhythm skills; they enter the queue at box 1.
  entries.push(createEntry('rhythm.simple.quarters', now));
  entries.push(createEntry('rhythm.simple.eighths', now));

  // A session right now: both are due (entered due-immediately), no new offered.
  let due = dueItems(state(entries), now);
  assert.equal(due.length, 2);

  // Learner gets both correct → promote to box 2 (+3d).
  entries = entries.map((e) => applyResult(e, true, now));
  assert.ok(entries.every((e) => e.box === 2));
  assert.ok(entries.every((e) => e.dueAt === now + BOX_INTERVALS_MS[2]));

  // Day 1: nothing due yet (next due is day 3).
  assert.equal(dueItems(state(entries), now + 1 * DAY).length, 0);

  // Day 3: both due again.
  now = now + 3 * DAY;
  due = dueItems(state(entries), now);
  assert.equal(due.length, 2);

  // One correct (→box3), one wrong (→box1, lapse).
  entries = entries.map((e) =>
    e.skillId === 'rhythm.simple.quarters'
      ? applyResult(e, true, now)
      : applyResult(e, false, now),
  );
  const quarters = entries.find((e) => e.skillId === 'rhythm.simple.quarters');
  const eighths = entries.find((e) => e.skillId === 'rhythm.simple.eighths');
  assert.equal(quarters.box, 3);
  assert.equal(eighths.box, 1);
  assert.equal(eighths.lapses, 1);
  // Lapsed skill is due sooner (box1 = +1d) than the promoted one (box3 = +7d).
  assert.ok(eighths.dueAt < quarters.dueAt);

  // Compose a session a day later with new material available.
  now = now + 1 * DAY;
  const plan = composeSession(
    state(entries),
    ['rhythm.simple.dotted', 'rhythm.compound.basic'],
    now,
  );
  // The lapsed skill is due → it must appear in review.
  assert.ok(plan.review.some((e) => e.skillId === 'rhythm.simple.eighths'));
  // New material is offered (queue is small), within cap.
  assert.ok(plan.new.length <= MAX_NEW_PER_SESSION);
  assert.ok(plan.new.length >= 1);
});
