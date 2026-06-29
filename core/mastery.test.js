/**
 * @file core/mastery.test.js
 * Exhaustive unit tests for the MASTERY ENGINE (core/mastery.js).
 *
 * Run with:  node --test            (from core/)
 *        or  node --test core/mastery.test.js
 *
 * Tests are fully deterministic: `now` and `sessionStart` are passed explicitly
 * everywhere, so there is no wall-clock dependency.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import M, {
  // constants
  SCORE_MIN,
  SCORE_MAX,
  CORRECT_DELTA,
  WRONG_DELTA,
  LEVELS,
  LEVEL_ORDER,
  LEVEL_FLOOR,
  MASTERED_WINDOW,
  MASTERED_MIN_CORRECT,
  MASTERED_SCORE_FLOOR,
  MASTERED_MIN_SESSIONS,
  MASTERED_MIN_SESSION_SPACING_MS,
  MS_PER_DAY,
  HALF_LIFE_DAYS,
  RAMP_IN_FAMILIAR_THRESHOLD,
  NEW_PER_SESSION_MIN,
  NEW_PER_SESSION_MAX,
  ADVANCE_COVERAGE,
  ADVANCE_CAPSTONE_PASS,
  // helpers
  clampScore,
  levelRank,
  scoreBand,
  // lifecycle
  createItemState,
  recordAnswer,
  applyDecay,
  decayScore,
  viewItemAsOf,
  // gates / views
  hasSpacedSessions,
  countRecentCorrect,
  meetsMasteredGate,
  levelFor,
  levelCoverage,
  planRampIn,
  canAdvanceLevel,
} from './mastery.js';

/* ---------------------------------------------------------------------------
 * Test fixtures / helpers
 * ------------------------------------------------------------------------- */

const T0 = 1_700_000_000_000; // arbitrary fixed epoch ms baseline
const HOUR = 60 * 60 * 1000;
const DAY = MS_PER_DAY;

/** Build an answer ctx. */
function ctx(now, sessionStart = now) {
  return { now, sessionStart };
}

/**
 * Drive a sequence of answers into a fresh item.
 * @param {Array<{correct:boolean, now:number, session?:number}>} steps
 */
function drive(steps, start = createItemState()) {
  let item = start;
  for (const s of steps) {
    item = recordAnswer(item, s.correct, ctx(s.now, s.session ?? s.now));
  }
  return item;
}

/* ===========================================================================
 * CONSTANTS — guard the tuned values (these ARE the spec).
 * ========================================================================= */

test('constants match the specified model', () => {
  assert.equal(SCORE_MIN, 0);
  assert.equal(SCORE_MAX, 100);
  assert.equal(CORRECT_DELTA, 20);
  assert.equal(WRONG_DELTA, 30);

  assert.deepEqual(LEVEL_ORDER, ['attempted', 'familiar', 'proficient', 'mastered']);
  assert.equal(LEVEL_FLOOR[LEVELS.FAMILIAR], 50);
  assert.equal(LEVEL_FLOOR[LEVELS.PROFICIENT], 80);
  assert.equal(LEVEL_FLOOR[LEVELS.MASTERED], 95);

  assert.equal(MASTERED_WINDOW, 5);
  assert.equal(MASTERED_MIN_CORRECT, 4);
  assert.equal(MASTERED_SCORE_FLOOR, 95);
  assert.equal(MASTERED_MIN_SESSIONS, 2);
  assert.equal(MASTERED_MIN_SESSION_SPACING_MS, 12 * HOUR);

  assert.equal(HALF_LIFE_DAYS[LEVELS.FAMILIAR], 7);
  assert.equal(HALF_LIFE_DAYS[LEVELS.PROFICIENT], 14);
  assert.equal(HALF_LIFE_DAYS[LEVELS.MASTERED], 30);

  assert.equal(RAMP_IN_FAMILIAR_THRESHOLD, 3);
  assert.equal(NEW_PER_SESSION_MIN, 5);
  assert.equal(NEW_PER_SESSION_MAX, 10);

  assert.equal(ADVANCE_COVERAGE, 0.8);
  assert.equal(ADVANCE_CAPSTONE_PASS, 0.8);
});

test('default export exposes the same named API', () => {
  assert.equal(M.recordAnswer, recordAnswer);
  assert.equal(M.applyDecay, applyDecay);
  assert.equal(M.canAdvanceLevel, canAdvanceLevel);
  assert.equal(M.CORRECT_DELTA, CORRECT_DELTA);
  assert.equal(M.LEVELS, LEVELS);
});

/* ===========================================================================
 * clampScore
 * ========================================================================= */

test('clampScore bounds to [0,100]', () => {
  assert.equal(clampScore(-5), 0);
  assert.equal(clampScore(0), 0);
  assert.equal(clampScore(50), 50);
  assert.equal(clampScore(100), 100);
  assert.equal(clampScore(130), 100);
});

test('clampScore rejects non-finite input (NaN must not masquerade as Attempted)', () => {
  assert.throws(() => clampScore(NaN), RangeError);
  assert.throws(() => clampScore(Infinity), RangeError);
  assert.throws(() => clampScore(-Infinity), RangeError);
});

/* ===========================================================================
 * scoreBand / levelRank
 * ========================================================================= */

test('scoreBand maps every band boundary correctly', () => {
  assert.equal(scoreBand(0), LEVELS.ATTEMPTED);
  assert.equal(scoreBand(49), LEVELS.ATTEMPTED);
  assert.equal(scoreBand(50), LEVELS.FAMILIAR);
  assert.equal(scoreBand(79), LEVELS.FAMILIAR);
  assert.equal(scoreBand(80), LEVELS.PROFICIENT);
  assert.equal(scoreBand(94), LEVELS.PROFICIENT);
  assert.equal(scoreBand(95), LEVELS.MASTERED);
  assert.equal(scoreBand(100), LEVELS.MASTERED);
});

test('levelRank orders levels and reports -1 for unknown', () => {
  assert.equal(levelRank(LEVELS.ATTEMPTED), 0);
  assert.equal(levelRank(LEVELS.FAMILIAR), 1);
  assert.equal(levelRank(LEVELS.PROFICIENT), 2);
  assert.equal(levelRank(LEVELS.MASTERED), 3);
  assert.equal(levelRank('nonsense'), -1);
});

/* ===========================================================================
 * createItemState — fresh state
 * ========================================================================= */

test('createItemState is a clean Attempted item', () => {
  const it = createItemState();
  assert.equal(it.score, 0);
  assert.equal(it.level, LEVELS.ATTEMPTED);
  assert.deepEqual(it.recent, []);
  assert.deepEqual(it.sessions, []);
  assert.equal(it.lastSeen, null);
  assert.equal(it.attempts, 0);
  assert.equal(it.corrects, 0);
});

test('createItemState returns independent objects', () => {
  const a = createItemState();
  const b = createItemState();
  a.recent.push(true);
  assert.deepEqual(b.recent, []);
});

/* ===========================================================================
 * recordAnswer — score deltas + immutability
 * ========================================================================= */

test('correct answer adds CORRECT_DELTA, wrong subtracts WRONG_DELTA, clamped', () => {
  // Same `now`/session → zero elapsed → no decay, so deltas are exact.
  let it = createItemState();
  it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 20);
  it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 40);
  it = recordAnswer(it, false, ctx(T0, T0));
  assert.equal(it.score, 10); // 40 - 30
  it = recordAnswer(it, false, ctx(T0, T0));
  assert.equal(it.score, 0); // clamps at 0, not -20
});

test('score clamps at 100 on repeated correct', () => {
  let it = createItemState();
  // 6 corrects with no decay (same instant) → 120 capped to 100
  for (let i = 0; i < 6; i++) it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 100);
});

test('recordAnswer does not mutate the input item', () => {
  const before = createItemState();
  const snapshot = JSON.stringify(before);
  recordAnswer(before, true, ctx(T0));
  assert.equal(JSON.stringify(before), snapshot);
});

test('recordAnswer tracks attempts/corrects', () => {
  let it = createItemState();
  it = recordAnswer(it, true, ctx(T0));
  it = recordAnswer(it, false, ctx(T0 + 1));
  it = recordAnswer(it, true, ctx(T0 + 2));
  assert.equal(it.attempts, 3);
  assert.equal(it.corrects, 2);
});

test('recordAnswer throws without a numeric now/sessionStart', () => {
  const it = createItemState();
  assert.throws(() => recordAnswer(it, true, {}), TypeError);
  assert.throws(() => recordAnswer(it, true, { now: T0 }), TypeError);
  assert.throws(() => recordAnswer(it, true, null), TypeError);
});

test('recordAnswer throws on non-finite now/sessionStart', () => {
  const it = createItemState();
  assert.throws(() => recordAnswer(it, true, ctx(NaN, T0)), TypeError);
  assert.throws(() => recordAnswer(it, true, ctx(T0, Infinity)), TypeError);
});

test('recordAnswer requires `correct` to be a real boolean (no truthy coercion)', () => {
  const it = createItemState();
  assert.throws(() => recordAnswer(it, 1, ctx(T0, T0)), TypeError);
  assert.throws(() => recordAnswer(it, 'yes', ctx(T0, T0)), TypeError);
  assert.throws(() => recordAnswer(it, 0, ctx(T0, T0)), TypeError);
  assert.throws(() => recordAnswer(it, null, ctx(T0, T0)), TypeError);
  // The two valid forms still work.
  assert.doesNotThrow(() => recordAnswer(it, true, ctx(T0, T0)));
  assert.doesNotThrow(() => recordAnswer(it, false, ctx(T0, T0)));
});

/* ===========================================================================
 * recent window rolls at MASTERED_WINDOW
 * ========================================================================= */

test('recent window keeps only the last MASTERED_WINDOW results', () => {
  let it = createItemState();
  const results = [true, false, true, true, false, true, true];
  let t = T0;
  for (const r of results) it = recordAnswer(it, r, ctx(t++, T0));
  assert.equal(it.recent.length, MASTERED_WINDOW);
  assert.deepEqual(it.recent, results.slice(-MASTERED_WINDOW)); // [true,true,false,true,true]
});

/* ===========================================================================
 * Level transitions (without Mastered gate)
 * ========================================================================= */

test('item climbs Attempted → Familiar → Proficient as score crosses floors', () => {
  let it = createItemState();
  // 2 correct → 40 (Attempted)
  it = recordAnswer(it, true, ctx(T0, T0));
  it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 40);
  assert.equal(it.level, LEVELS.ATTEMPTED);
  // 3rd correct → 60 (Familiar)
  it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 60);
  assert.equal(it.level, LEVELS.FAMILIAR);
  // 4th correct → 80 (Proficient)
  it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 80);
  assert.equal(it.level, LEVELS.PROFICIENT);
});

test('score in the 95+ band but failing the gate caps at Proficient, never Mastered', () => {
  let it = createItemState();
  // 5 correct same session, same instant → score 100, recent all true, but ONE session.
  for (let i = 0; i < 5; i++) it = recordAnswer(it, true, ctx(T0, T0));
  assert.equal(it.score, 100);
  assert.equal(levelFor(it), LEVELS.PROFICIENT); // gate not met (one session)
  assert.equal(it.level, LEVELS.PROFICIENT);
});

/* ===========================================================================
 * MASTERED GATE — the heart of the model
 * ========================================================================= */

test('countRecentCorrect counts trues', () => {
  assert.equal(countRecentCorrect([]), 0);
  assert.equal(countRecentCorrect([true, false, true]), 2);
  assert.equal(countRecentCorrect([true, true, true, true, true]), 5);
});

test('hasSpacedSessions requires ≥2 sessions ≥12h apart', () => {
  assert.equal(hasSpacedSessions([]), false);
  assert.equal(hasSpacedSessions([T0]), false); // only one
  assert.equal(hasSpacedSessions([T0, T0 + 11 * HOUR]), false); // too close
  assert.equal(hasSpacedSessions([T0, T0 + 12 * HOUR]), true); // exactly 12h
  assert.equal(hasSpacedSessions([T0, T0 + 24 * HOUR]), true);
  // three sessions, first & last span ≥12h
  assert.equal(hasSpacedSessions([T0, T0 + 6 * HOUR, T0 + 13 * HOUR]), true);
});

test('hasSpacedSessions is robust to UNSORTED input (uses min/max, not position)', () => {
  // Same pair, reversed order: spacing is |Δ|, must not depend on element order.
  assert.equal(hasSpacedSessions([T0 + 24 * HOUR, T0]), true);
  // Widest pair is in the middle of an out-of-order array.
  assert.equal(hasSpacedSessions([T0 + 13 * HOUR, T0 + 6 * HOUR, T0]), true);
  // Out of order but all within 12h → still false.
  assert.equal(hasSpacedSessions([T0 + 6 * HOUR, T0, T0 + 3 * HOUR]), false);
  // Non-finite stamps are ignored, not treated as the extremes.
  assert.equal(hasSpacedSessions([T0, NaN]), false); // only one finite stamp left
  assert.equal(hasSpacedSessions([T0, T0 + 24 * HOUR, NaN]), true);
});

test('meetsMasteredGate requires full window of 5 results', () => {
  // 4 corrects across 2 spaced sessions but only 4 recent → window not full
  let it = createItemState();
  it = recordAnswer(it, true, ctx(T0, T0));
  it = recordAnswer(it, true, ctx(T0 + 1, T0));
  it = recordAnswer(it, true, ctx(T0 + 13 * HOUR, T0 + 13 * HOUR));
  it = recordAnswer(it, true, ctx(T0 + 13 * HOUR + 1, T0 + 13 * HOUR));
  assert.equal(it.recent.length, 4);
  assert.equal(meetsMasteredGate(it), false); // window < 5
});

test('meetsMasteredGate true with 4/5 correct, s≥95, 2 sessions ≥12h apart', () => {
  // Session A: 4 correct (score 80). Session B (13h later): +1 correct → 100, recent full.
  let it = createItemState();
  const sA = T0;
  it = recordAnswer(it, true, ctx(sA, sA));
  it = recordAnswer(it, true, ctx(sA + 1, sA));
  it = recordAnswer(it, true, ctx(sA + 2, sA));
  it = recordAnswer(it, true, ctx(sA + 3, sA)); // score 80, 4 recent
  const sB = T0 + 13 * HOUR;
  it = recordAnswer(it, true, ctx(sB, sB)); // score ~ decayed(80)+20 clamped, 5 recent all true
  assert.equal(it.recent.length, MASTERED_WINDOW);
  assert.equal(countRecentCorrect(it.recent), 5);
  assert.ok(it.score >= MASTERED_SCORE_FLOOR, `score ${it.score} should be ≥95`);
  assert.equal(meetsMasteredGate(it), true);
  assert.equal(it.level, LEVELS.MASTERED);
});

test('Mastered gate: exactly 4 of last 5 correct passes (the 4/5 edge)', () => {
  // Construct a 5-window with one wrong but still s≥95 and spaced sessions.
  // Strategy: many corrects to pin score at 100, then a wrong, then corrects to refill.
  let it = createItemState();
  const sA = T0;
  for (let i = 0; i < 6; i++) it = recordAnswer(it, true, ctx(sA, sA)); // score 100, one session
  const sB = T0 + 13 * HOUR;
  // window currently [T,T,T,T,T]; inject ONE wrong then 4 correct in session B
  it = recordAnswer(it, false, ctx(sB, sB)); // score 100-30=... but decayed first; recent now [...,F]
  // refill with 4 correct so window = [F,T,T,T,T] → 4/5
  it = recordAnswer(it, true, ctx(sB + 1, sB));
  it = recordAnswer(it, true, ctx(sB + 2, sB));
  it = recordAnswer(it, true, ctx(sB + 3, sB));
  it = recordAnswer(it, true, ctx(sB + 4, sB)); // window [F,T,T,T,T]
  assert.equal(countRecentCorrect(it.recent), 4);
  assert.equal(it.score, 100);
  assert.equal(meetsMasteredGate(it), true);
  assert.equal(it.level, LEVELS.MASTERED);
});

test('Mastered gate: only 3 of last 5 correct FAILS', () => {
  let it = createItemState();
  const sA = T0;
  for (let i = 0; i < 6; i++) it = recordAnswer(it, true, ctx(sA, sA)); // score 100
  const sB = T0 + 13 * HOUR;
  // inject two wrongs interleaved so window = [F,F,T,T,T]? We need exactly 3 correct in window.
  it = recordAnswer(it, false, ctx(sB, sB));
  it = recordAnswer(it, false, ctx(sB + 1, sB));
  it = recordAnswer(it, true, ctx(sB + 2, sB));
  it = recordAnswer(it, true, ctx(sB + 3, sB));
  it = recordAnswer(it, true, ctx(sB + 4, sB)); // window [F,F,T,T,T] → 3/5
  assert.equal(countRecentCorrect(it.recent), 3);
  assert.equal(meetsMasteredGate(it), false);
  assert.notEqual(it.level, LEVELS.MASTERED);
});

test('Mastered gate fails when both sessions are <12h apart even with 5/5 + high score', () => {
  let it = createItemState();
  const sA = T0;
  it = recordAnswer(it, true, ctx(sA, sA));
  it = recordAnswer(it, true, ctx(sA + 1, sA));
  it = recordAnswer(it, true, ctx(sA + 2, sA));
  it = recordAnswer(it, true, ctx(sA + 3, sA));
  const sB = T0 + 11 * HOUR; // only 11h later
  it = recordAnswer(it, true, ctx(sB, sB)); // 5 recent, 2 sessions but 11h apart
  assert.equal(it.sessions.length, 2);
  assert.equal(countRecentCorrect(it.recent), 5);
  assert.ok(it.score >= 95);
  assert.equal(hasSpacedSessions(it.sessions), false);
  assert.equal(meetsMasteredGate(it), false);
  assert.equal(it.level, LEVELS.PROFICIENT);
});

test('Mastered gate fails when score <95 even with 5/5 and spaced sessions', () => {
  // Achieve spaced sessions and 5/5 recent, but keep score under 95.
  // Two corrects session A (40), then a long gap so decay reduces, careful build.
  let it = createItemState();
  const sA = T0;
  it = recordAnswer(it, true, ctx(sA, sA)); // 20
  it = recordAnswer(it, true, ctx(sA + 1, sA)); // 40
  it = recordAnswer(it, true, ctx(sA + 2, sA)); // 60
  it = recordAnswer(it, true, ctx(sA + 3, sA)); // 80
  // Score 80, level Proficient. Now a 7-day gap (Proficient half-life 14d) drops it.
  const sB = sA + 14 * DAY; // exactly one Proficient half-life → 80 → 40 then +20
  it = recordAnswer(it, true, ctx(sB, sB)); // decay 80→40, +20 = 60, 5 recent all true, 2 spaced sessions
  assert.equal(countRecentCorrect(it.recent), 5);
  assert.equal(hasSpacedSessions(it.sessions), true);
  assert.ok(it.score < 95, `score ${it.score} should be <95`);
  assert.equal(meetsMasteredGate(it), false);
});

test('same-session answers do not create a second qualifying session', () => {
  let it = createItemState();
  const sA = T0;
  // five correct, all sessionStart = sA, but spread over 13h of `now`
  it = recordAnswer(it, true, ctx(sA, sA));
  it = recordAnswer(it, true, ctx(sA + 3 * HOUR, sA));
  it = recordAnswer(it, true, ctx(sA + 6 * HOUR, sA));
  it = recordAnswer(it, true, ctx(sA + 9 * HOUR, sA));
  it = recordAnswer(it, true, ctx(sA + 13 * HOUR, sA));
  assert.equal(it.sessions.length, 1); // still one session
  assert.equal(meetsMasteredGate(it), false); // spacing needs 2 sessions
});

/* ===========================================================================
 * DECAY MATH
 * ========================================================================= */

test('decayScore halves at exactly one half-life', () => {
  assert.equal(decayScore(100, 7 * DAY, 7), 50);
  assert.equal(decayScore(80, 14 * DAY, 14), 40);
  assert.equal(decayScore(100, 30 * DAY, 30), 50);
});

test('decayScore quarters at two half-lives', () => {
  assert.ok(Math.abs(decayScore(100, 14 * DAY, 7) - 25) < 1e-9);
});

test('decayScore at fractional half-life (0.5 H → /√2)', () => {
  const expected = 100 / Math.SQRT2;
  assert.ok(Math.abs(decayScore(100, 3.5 * DAY, 7) - expected) < 1e-9);
});

test('decayScore: zero/negative elapsed leaves score unchanged (clamped)', () => {
  assert.equal(decayScore(73, 0, 7), 73);
  assert.equal(decayScore(73, -DAY, 7), 73);
  assert.equal(decayScore(130, 0, 7), 100); // clamps input
});

test('decayScore throws on non-positive half-life', () => {
  assert.throws(() => decayScore(50, DAY, 0), RangeError);
  assert.throws(() => decayScore(50, DAY, -1), RangeError);
});

test('decayScore throws on non-finite elapsed (not silently "no decay")', () => {
  assert.throws(() => decayScore(50, NaN, 7), RangeError);
  assert.throws(() => decayScore(50, Infinity, 7), RangeError);
});

test('decayScore stays within bounds for large elapsed', () => {
  const s = decayScore(100, 365 * DAY, 7);
  assert.ok(s >= 0 && s <= 100);
  assert.ok(s < 1e-6); // effectively zero after a year at 7-day half-life
});

/* ===========================================================================
 * applyDecay + DEMOTION
 * ========================================================================= */

test('applyDecay on a never-seen item is a no-op (level stays Attempted)', () => {
  const it = createItemState();
  const d = applyDecay(it, T0 + 100 * DAY);
  assert.equal(d.score, 0);
  assert.equal(d.level, LEVELS.ATTEMPTED);
});

test('applyDecay does not mutate the input', () => {
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]);
  const snap = JSON.stringify(it);
  applyDecay(it, T0 + 30 * DAY);
  assert.equal(JSON.stringify(it), snap);
});

test('decay demotes Proficient → Familiar when score drops below 80', () => {
  // Build a Proficient item at score 80 (4 correct, one session).
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]);
  assert.equal(it.level, LEVELS.PROFICIENT);
  assert.equal(it.score, 80);
  // Proficient half-life = 14d. After 14d → 40 → Familiar? 40 < 50 → Attempted.
  const d = applyDecay(it, T0 + 14 * DAY);
  assert.equal(d.score, 40);
  assert.equal(d.level, LEVELS.ATTEMPTED);
});

test('decay demotes Proficient → Familiar (mild decay below 80 but ≥50)', () => {
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]); // score 80, Proficient, H=14d
  // Want score in [50,79]. 80 * 2^(-t/14d) = 70  → t = 14d*log2(80/70)
  const t = 14 * DAY * Math.log2(80 / 70);
  const d = applyDecay(it, T0 + t);
  assert.ok(Math.abs(d.score - 70) < 1e-6);
  assert.equal(d.level, LEVELS.FAMILIAR);
});

test('decay strips Mastered when decayed score < 95', () => {
  // Build a Mastered item PINNED at score 100: over-fill session A (6 correct → 100),
  // then a single correct in session B. The 13h gap decays 100→~97.9 then +20 clamps
  // back to exactly 100, so the post-build score is an exact integer for clean math.
  let it = createItemState();
  const sA = T0;
  for (let i = 0; i < 6; i++) it = recordAnswer(it, true, ctx(sA, sA)); // 100, 1 session
  const sB = T0 + 13 * HOUR;
  it = recordAnswer(it, true, ctx(sB, sB)); // decay→97.9, +20→clamp 100; 2 spaced sessions
  assert.equal(it.level, LEVELS.MASTERED);
  assert.equal(it.score, 100);
  // Mastered half-life 30d. After 30d → 50 → strips Mastered (and Proficient): Familiar.
  const d = applyDecay(it, sB + 30 * DAY);
  assert.equal(d.score, 50);
  assert.equal(d.level, LEVELS.FAMILIAR);
});

test('Mastered uses the slow (30d) half-life while still Mastered', () => {
  // Same pinning trick → exact 100, then verify a 30-day decay halves it exactly.
  let it = createItemState();
  const sA = T0;
  for (let i = 0; i < 6; i++) it = recordAnswer(it, true, ctx(sA, sA));
  const sB = T0 + 13 * HOUR;
  it = recordAnswer(it, true, ctx(sB, sB));
  assert.equal(it.level, LEVELS.MASTERED);
  assert.equal(it.score, 100);
  // After 30 days at H=30 → exactly half = 50.
  const d = applyDecay(it, sB + 30 * DAY);
  assert.equal(d.score, 50);
});

/* ===========================================================================
 * PATH-INDEPENDENT DECAY (the CORE_REVIEW_FINDINGS §A.1 fix)
 *
 * Decaying an item across an idle span in ONE shot must equal decaying it in
 * MULTIPLE steps with the intermediate (decayed) view persisted. The half-life is
 * anchored on the level the item held when it went idle (`idleLevel`), so a mid-span
 * demotion can never switch the half-life and corrupt the remainder of the span.
 * ========================================================================= */

/**
 * Persist a decayed VIEW the way a careless Imperative Shell would: keep the decayed
 * score, but ALSO advance the decay clock (`lastSeen`) to the checkpoint instant — i.e.
 * treat the view as the item's new resting state. This is exactly the misuse the
 * findings describe ("decayed in two steps with the view persisted"): under the OLD
 * code the intermediate demotion switched the half-life for the remaining span and
 * corrupted the score. With the fix, `idleLevel` is the stable half-life anchor, so the
 * stepwise result lands on the single-shot result regardless of checkpoints.
 */
function persistCheckpoint(view, at) {
  const v = applyDecay(view, at);
  v.lastSeen = at; // careless caller re-anchors the clock to the checkpoint
  return v;
}

test('decay is path-independent: split-interval == single-shot (20-day Proficient)', () => {
  // Build a Proficient item (score 80, level Proficient, idleLevel Proficient → H=14d).
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]);
  assert.equal(it.score, 80);
  assert.equal(it.level, LEVELS.PROFICIENT);
  assert.equal(it.idleLevel, LEVELS.PROFICIENT);

  // Single shot: decay the full 20 days at once → 80 · 2^(-20/14).
  const oneShot = applyDecay(it, T0 + 20 * DAY);

  // Split: decay 10 days, PERSIST that view (advancing the clock to T0+10d), then decay
  // 10 more days from the persisted checkpoint. The intermediate view has already
  // DEMOTED (80·2^(-10/14) ≈ 49.4 < 50 → Attempted). The OLD code would read this
  // CURRENT (Attempted) level for the second leg and switch to the 7-day half-life,
  // diverging. With the fix, idleLevel stays Proficient → 14d half-life for both legs.
  const step1 = persistCheckpoint(it, T0 + 10 * DAY);
  assert.equal(step1.level, LEVELS.ATTEMPTED);
  assert.equal(step1.idleLevel, LEVELS.PROFICIENT, 'idleLevel must survive a persisted decay view');
  const split = applyDecay(step1, T0 + 20 * DAY);

  // Scores must match to floating-point tolerance, and the derived level too.
  assert.ok(Math.abs(oneShot.score - split.score) < 1e-9,
    `path-dependent decay: one-shot=${oneShot.score} split=${split.score}`);
  assert.equal(oneShot.level, split.level);

  // And it equals the closed-form: 80 · 2^(-20/14) ≈ 29.72.
  const expected = 80 * Math.pow(2, -20 / 14);
  assert.ok(Math.abs(oneShot.score - expected) < 1e-9);
});

test('decay path-independence holds across MANY persisted checkpoints (Proficient, 30 days)', () => {
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]); // Proficient, idleLevel Proficient, H=14d

  const oneShot = applyDecay(it, T0 + 30 * DAY);

  // Walk in 30 one-day persisted checkpoints (each advances the clock + persists score).
  let cur = it;
  for (let d = 1; d <= 30; d++) {
    cur = persistCheckpoint(cur, T0 + d * DAY);
  }
  assert.ok(Math.abs(oneShot.score - cur.score) < 1e-9,
    `stepwise decay drifted: one-shot=${oneShot.score} stepwise=${cur.score}`);
  assert.equal(oneShot.level, cur.level);
  // idleLevel is never re-anchored by decay.
  assert.equal(cur.idleLevel, LEVELS.PROFICIENT);
});

test('recordAnswer re-anchors idleLevel to the post-answer level', () => {
  // First correct → score 20, level Attempted → idleLevel Attempted.
  let it = recordAnswer(createItemState(), true, ctx(T0, T0));
  assert.equal(it.level, LEVELS.ATTEMPTED);
  assert.equal(it.idleLevel, LEVELS.ATTEMPTED);
  // Three more correct same session → score 80, Proficient → idleLevel Proficient.
  it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ], it);
  assert.equal(it.level, LEVELS.PROFICIENT);
  assert.equal(it.idleLevel, LEVELS.PROFICIENT);
});

test('createItemState seeds idleLevel = null (no anchor until first answer)', () => {
  assert.equal(createItemState().idleLevel, null);
});

/* ===========================================================================
 * recordAnswer applies decay BEFORE the delta
 * ========================================================================= */

test('recordAnswer decays the prior score before adding the delta', () => {
  // Familiar item at 60 (3 correct), wait one 7-day half-life → 30, then a correct → 50.
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]);
  assert.equal(it.score, 60);
  assert.equal(it.level, LEVELS.FAMILIAR);
  const later = T0 + 7 * DAY; // Familiar H = 7d → 60 → 30
  it = recordAnswer(it, true, ctx(later, later));
  assert.equal(it.score, 50); // 30 + 20
  assert.equal(it.level, LEVELS.FAMILIAR);
});

/* ===========================================================================
 * viewItemAsOf
 * ========================================================================= */

test('viewItemAsOf equals applyDecay and never mutates', () => {
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]);
  const snap = JSON.stringify(it);
  const v = viewItemAsOf(it, T0 + 10 * DAY);
  const d = applyDecay(it, T0 + 10 * DAY);
  assert.deepEqual(v, d);
  assert.equal(JSON.stringify(it), snap);
});

/* ===========================================================================
 * levelCoverage
 * ========================================================================= */

function itemAtScore(score, level = scoreBand(score)) {
  // Build a minimal item with a given score & level, lastSeen=null so no decay.
  const it = createItemState();
  it.score = score;
  it.level = level;
  return it;
}

test('levelCoverage counts Proficient+ as of now (no decay when lastSeen null)', () => {
  const items = [
    itemAtScore(85, LEVELS.PROFICIENT),
    itemAtScore(80, LEVELS.PROFICIENT),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(40, LEVELS.ATTEMPTED),
  ];
  const cov = levelCoverage(items, LEVELS.PROFICIENT, T0);
  assert.equal(cov.total, 4);
  assert.equal(cov.atOrAbove, 2);
  assert.equal(cov.fraction, 0.5);
});

test('levelCoverage applies decay before judging level', () => {
  // A Proficient item that has decayed below 80 should NOT count.
  let it = drive([
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
    { correct: true, now: T0 },
  ]); // score 80 Proficient, H=14
  const future = T0 + 14 * DAY; // → 40, demoted
  const cov = levelCoverage([it], LEVELS.PROFICIENT, future);
  assert.equal(cov.atOrAbove, 0);
  assert.equal(cov.fraction, 0);
});

test('levelCoverage of empty set is zero fraction', () => {
  const cov = levelCoverage([], LEVELS.FAMILIAR, T0);
  assert.equal(cov.total, 0);
  assert.equal(cov.fraction, 0);
});

test('levelCoverage rejects unknown minLevel', () => {
  assert.throws(() => levelCoverage([], 'bogus', T0), RangeError);
});

/* ===========================================================================
 * RAMP-IN
 * ========================================================================= */

test('ramp-in is open at cold start (no active items)', () => {
  const plan = planRampIn({ activeItems: [], availableNewCount: 20, now: T0 });
  assert.equal(plan.open, true);
  assert.equal(plan.activeCount, 0);
  assert.equal(plan.familiarCount, 0);
  // capped at NEW_PER_SESSION_MAX
  assert.equal(plan.allow, NEW_PER_SESSION_MAX);
});

test('ramp-in is CLOSED until ≥3 active items reach Familiar', () => {
  // 2 Familiar, 1 Attempted active → not enough.
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(40, LEVELS.ATTEMPTED),
  ];
  const plan = planRampIn({ activeItems: active, availableNewCount: 20, now: T0 });
  assert.equal(plan.familiarCount, 2);
  assert.equal(plan.open, false);
  assert.equal(plan.allow, 0);
});

test('ramp-in opens at exactly 3 Familiar+ active items', () => {
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(85, LEVELS.PROFICIENT),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(40, LEVELS.ATTEMPTED),
  ];
  const plan = planRampIn({ activeItems: active, availableNewCount: 20, now: T0 });
  assert.equal(plan.familiarCount, 3);
  assert.equal(plan.open, true);
  assert.equal(plan.allow, NEW_PER_SESSION_MAX);
});

test('ramp-in caps allow at NEW_PER_SESSION_MAX and never exceeds availability', () => {
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
  ];
  // Only 3 new available → allow = 3 even though cap is 10.
  const plan = planRampIn({ activeItems: active, availableNewCount: 3, now: T0 });
  assert.equal(plan.open, true);
  assert.equal(plan.allow, 3);

  // Plenty available → allow = cap (10).
  const plan2 = planRampIn({ activeItems: active, availableNewCount: 100, now: T0 });
  assert.equal(plan2.allow, NEW_PER_SESSION_MAX);
});

test('ramp-in honors a reduced remainingCapacity', () => {
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
  ];
  // 4 of the session budget already used → remainingCapacity 6.
  const plan = planRampIn({ activeItems: active, availableNewCount: 100, now: T0, remainingCapacity: 6 });
  assert.equal(plan.allow, 6);
  // remainingCapacity 0 → allow 0.
  const plan0 = planRampIn({ activeItems: active, availableNewCount: 100, now: T0, remainingCapacity: 0 });
  assert.equal(plan0.allow, 0);
});

test('ramp-in integer-floors a fractional remainingCapacity', () => {
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
  ];
  // 6.9 capacity can only introduce 6 whole items.
  const plan = planRampIn({ activeItems: active, availableNewCount: 100, now: T0, remainingCapacity: 6.9 });
  assert.equal(plan.allow, 6);
  // 0.9 floors to 0 (can't introduce a partial item).
  const planFrac = planRampIn({ activeItems: active, availableNewCount: 100, now: T0, remainingCapacity: 0.9 });
  assert.equal(planFrac.allow, 0);
  // Non-finite capacity collapses to 0 rather than NaN-poisoning the math.
  const planNaN = planRampIn({ activeItems: active, availableNewCount: 100, now: T0, remainingCapacity: NaN });
  assert.equal(planNaN.allow, 0);
});

test('ramp-in target floor is NEW_PER_SESSION_MIN bounded by supply', () => {
  const active = [
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
  ];
  const plan = planRampIn({ activeItems: active, availableNewCount: 100, now: T0 });
  assert.equal(plan.target, NEW_PER_SESSION_MIN);
  const plan2 = planRampIn({ activeItems: active, availableNewCount: 2, now: T0 });
  assert.equal(plan2.target, 2); // supply-limited
});

test('ramp-in counts Familiar via decay (a decayed item no longer counts)', () => {
  // Three items that WERE Familiar but have decayed below 50.
  let a = drive([{ correct: true, now: T0 }, { correct: true, now: T0 }, { correct: true, now: T0 }]); // 60 Familiar H=7
  // After 7 days → 30, Attempted.
  const now = T0 + 7 * DAY;
  const active = [a, a, a];
  const plan = planRampIn({ activeItems: active, availableNewCount: 20, now });
  assert.equal(plan.familiarCount, 0);
  assert.equal(plan.open, false);
});

/* ===========================================================================
 * LEVEL-ADVANCE GATE
 * ========================================================================= */

test('advance requires BOTH 80% Proficient+ AND capstone ≥0.8', () => {
  // 5 items, 4 Proficient (80%), capstone 0.85 → advance.
  const items = [
    itemAtScore(85, LEVELS.PROFICIENT),
    itemAtScore(82, LEVELS.PROFICIENT),
    itemAtScore(90, LEVELS.PROFICIENT),
    itemAtScore(80, LEVELS.PROFICIENT),
    itemAtScore(60, LEVELS.FAMILIAR),
  ];
  const r = canAdvanceLevel({ levelItems: items, capstoneScore: 0.85, now: T0 });
  assert.equal(r.coverage, 0.8);
  assert.equal(r.coverageMet, true);
  assert.equal(r.capstoneMet, true);
  assert.equal(r.canAdvance, true);
});

test('advance blocked when coverage <80% even if capstone passes', () => {
  const items = [
    itemAtScore(85, LEVELS.PROFICIENT),
    itemAtScore(82, LEVELS.PROFICIENT),
    itemAtScore(90, LEVELS.PROFICIENT),
    itemAtScore(60, LEVELS.FAMILIAR),
    itemAtScore(60, LEVELS.FAMILIAR),
  ]; // 3/5 = 60%
  const r = canAdvanceLevel({ levelItems: items, capstoneScore: 0.95, now: T0 });
  assert.equal(r.coverageMet, false);
  assert.equal(r.capstoneMet, true);
  assert.equal(r.canAdvance, false);
});

test('advance blocked when capstone <0.8 even if coverage passes', () => {
  const items = [
    itemAtScore(85, LEVELS.PROFICIENT),
    itemAtScore(82, LEVELS.PROFICIENT),
    itemAtScore(90, LEVELS.PROFICIENT),
    itemAtScore(81, LEVELS.PROFICIENT),
    itemAtScore(83, LEVELS.PROFICIENT),
  ]; // 100% coverage
  const r = canAdvanceLevel({ levelItems: items, capstoneScore: 0.79, now: T0 });
  assert.equal(r.coverageMet, true);
  assert.equal(r.capstoneMet, false);
  assert.equal(r.canAdvance, false);
});

test('advance capstone boundary is inclusive at exactly 0.8', () => {
  const items = [itemAtScore(85, LEVELS.PROFICIENT)];
  const r = canAdvanceLevel({ levelItems: items, capstoneScore: 0.8, now: T0 });
  assert.equal(r.capstoneMet, true);
});

test('advance coverage boundary is inclusive at exactly 0.8', () => {
  // 8 of 10 Proficient = 0.8 exactly.
  const items = [];
  for (let i = 0; i < 8; i++) items.push(itemAtScore(85, LEVELS.PROFICIENT));
  for (let i = 0; i < 2; i++) items.push(itemAtScore(60, LEVELS.FAMILIAR));
  const r = canAdvanceLevel({ levelItems: items, capstoneScore: 0.9, now: T0 });
  assert.equal(r.coverage, 0.8);
  assert.equal(r.coverageMet, true);
  assert.equal(r.canAdvance, true);
});

test('advance blocked on an empty level (no coverage)', () => {
  const r = canAdvanceLevel({ levelItems: [], capstoneScore: 1.0, now: T0 });
  assert.equal(r.coverageMet, false);
  assert.equal(r.canAdvance, false);
});

test('advance applies decay before judging coverage', () => {
  // Two Proficient items that decay below 80 → coverage drops to 0.
  let a = drive([
    { correct: true, now: T0 }, { correct: true, now: T0 },
    { correct: true, now: T0 }, { correct: true, now: T0 },
  ]); // 80 Proficient
  const future = T0 + 14 * DAY; // → 40
  const r = canAdvanceLevel({ levelItems: [a, a], capstoneScore: 1.0, now: future });
  assert.equal(r.coverageMet, false);
  assert.equal(r.canAdvance, false);
});

/* ===========================================================================
 * FULL LIFECYCLE INTEGRATION — a realistic multi-session climb to Mastered,
 * then neglect → demotion, then a refresh.
 * ========================================================================= */

test('integration: climb to Mastered across two sessions, neglect, demote, refresh', () => {
  let it = createItemState();

  // --- Session 1 (day 0): four correct → Proficient(80), 4 in window, 1 session.
  const s1 = T0;
  for (let i = 0; i < 4; i++) it = recordAnswer(it, true, ctx(s1, s1));
  assert.equal(it.score, 80);
  assert.equal(it.level, LEVELS.PROFICIENT);
  assert.equal(meetsMasteredGate(it), false); // one session only

  // --- Session 2 (day 1, +24h): one correct → fills window, 2 spaced sessions → Mastered.
  // The 24h gap decays the prior 80 (Proficient H=14d) BEFORE the +20 is added.
  const s2 = T0 + 24 * HOUR;
  const expectedAtS2 = clampScore(decayScore(80, 24 * HOUR, HALF_LIFE_DAYS[LEVELS.PROFICIENT]) + CORRECT_DELTA);
  it = recordAnswer(it, true, ctx(s2, s2));
  assert.equal(it.recent.length, 5);
  assert.ok(Math.abs(it.score - expectedAtS2) < 1e-9);
  assert.ok(it.score >= MASTERED_SCORE_FLOOR, `score ${it.score} should clear the Mastered floor`);
  assert.equal(it.level, LEVELS.MASTERED);

  // --- Neglect 30 days (Mastered H=30) → score halves → demote out of Mastered.
  const after = s2 + 30 * DAY;
  const expectedDecayed = decayScore(expectedAtS2, 30 * DAY, HALF_LIFE_DAYS[LEVELS.MASTERED]);
  const view = viewItemAsOf(it, after);
  assert.ok(Math.abs(view.score - expectedDecayed) < 1e-9);
  assert.equal(view.level, scoreBand(expectedDecayed)); // strictly below 95 → demoted
  assert.notEqual(view.level, LEVELS.MASTERED);

  // --- Refresh: a correct answer at `after` decays (from Mastered's H, the level at idle
  //     start) then adds 20. Verify it recovers but is computed exactly.
  const expectedRefresh = clampScore(expectedDecayed + CORRECT_DELTA);
  it = recordAnswer(it, true, ctx(after, after));
  assert.ok(Math.abs(it.score - expectedRefresh) < 1e-9);
  assert.equal(it.level, levelFor(it));
});

test('integration: wrong answers can demote a fresh climber back down', () => {
  let it = drive([
    { correct: true, now: T0 }, { correct: true, now: T0 },
    { correct: true, now: T0 }, { correct: true, now: T0 }, // 80 Proficient
  ]);
  assert.equal(it.level, LEVELS.PROFICIENT);
  // one wrong → 50 → Familiar
  it = recordAnswer(it, false, ctx(T0, T0));
  assert.equal(it.score, 50);
  assert.equal(it.level, LEVELS.FAMILIAR);
  // another wrong → 20 → Attempted
  it = recordAnswer(it, false, ctx(T0, T0));
  assert.equal(it.score, 20);
  assert.equal(it.level, LEVELS.ATTEMPTED);
});
