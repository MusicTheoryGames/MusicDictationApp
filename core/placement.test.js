/**
 * @file core/placement.test.js
 *
 * Exhaustive unit tests for the adaptive placement + difficulty engine
 * (core/placement.js). Pure-function tests only — no I/O, no DOM, no clock.
 * Randomness, where needed, is supplied by a deterministic seeded PRNG so the
 * "simulated learner" convergence tests are fully reproducible.
 *
 * Run:  node --test core/placement.test.js
 *   or: node core/placement.test.js   (the file is a test runner entry)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  // constants
  ELO_K_DECAY,
  ELO_FIXED_K,
  DEFAULT_THETA,
  DEFAULT_DELTA,
  PLACEMENT_MIN_ITEMS,
  PLACEMENT_MAX_ITEMS,
  PLACEMENT_STABLE_DELTA,
  TARGET_SUCCESS,
  TARGET_SUCCESS_OFFSET,
  STAIRCASE_STEP,
  // math
  successProbability,
  logit,
  stepSize,
  eloUpdate,
  // placement
  createPlacementState,
  selectNextPlacementItem,
  applyPlacementResponse,
  shouldStopPlacement,
  // selectors
  selectTargetBandItem,
  targetDifficulty,
  createStaircase,
  staircaseStep,
} from './placement.js';

/* -------------------------------------------------------------------------
 * Test helpers
 * ---------------------------------------------------------------------- */

const APPROX = 1e-9;
const close = (a, b, eps = APPROX) => Math.abs(a - b) <= eps;

/** Mulberry32 — tiny deterministic PRNG returning floats in [0,1). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================================================================
 * 1. CONSTANTS — sanity of the exported tunables
 * ====================================================================== */

test('constants: have expected values and types', () => {
  assert.equal(ELO_K_DECAY, 0.05);
  assert.equal(ELO_FIXED_K, 0.3);
  assert.equal(DEFAULT_THETA, 0);
  assert.equal(DEFAULT_DELTA, 0);
  assert.equal(PLACEMENT_MIN_ITEMS, 8);
  assert.equal(PLACEMENT_MAX_ITEMS, 15);
  assert.equal(PLACEMENT_STABLE_DELTA, 0.25);
  assert.equal(TARGET_SUCCESS, 0.8);
  assert.equal(STAIRCASE_STEP, 0.5);
});

test('constants: TARGET_SUCCESS_OFFSET equals logit(0.8) = ln(4)', () => {
  assert.ok(close(TARGET_SUCCESS_OFFSET, Math.log(4)));
  assert.ok(close(TARGET_SUCCESS_OFFSET, logit(0.8)));
  // ln(4) ≈ 1.3862943611
  assert.ok(close(TARGET_SUCCESS_OFFSET, 1.3862943611198906, 1e-12));
});

/* =========================================================================
 * 2. successProbability — the 1PL/Rasch logistic
 * ====================================================================== */

test('successProbability: equal theta/delta gives 0.5', () => {
  assert.ok(close(successProbability(0, 0), 0.5));
  assert.ok(close(successProbability(3.2, 3.2), 0.5));
  assert.ok(close(successProbability(-1.7, -1.7), 0.5));
});

test('successProbability: known logit points', () => {
  // theta - delta = ln(4) → P = 0.8
  assert.ok(close(successProbability(Math.log(4), 0), 0.8));
  // theta - delta = -ln(4) → P = 0.2
  assert.ok(close(successProbability(-Math.log(4), 0), 0.2));
  // theta - delta = 1 → P = 1/(1+e^-1) = 0.7310585786
  assert.ok(close(successProbability(1, 0), 0.7310585786300049, 1e-12));
});

test('successProbability: monotonic increasing in theta', () => {
  let prev = -Infinity;
  for (let th = -6; th <= 6; th += 0.5) {
    const p = successProbability(th, 0);
    assert.ok(p > prev, `P should increase with theta at ${th}`);
    assert.ok(p > 0 && p < 1);
    prev = p;
  }
});

test('successProbability: symmetric about 0.5', () => {
  for (let d = 0; d <= 5; d += 0.25) {
    assert.ok(close(successProbability(d, 0) + successProbability(-d, 0), 1));
  }
});

test('successProbability: numerically stable at extremes (no NaN/overflow)', () => {
  assert.ok(close(successProbability(1000, 0), 1, 1e-12));
  assert.ok(close(successProbability(-1000, 0), 0, 1e-12));
  assert.ok(Number.isFinite(successProbability(1000, 0)));
  assert.ok(Number.isFinite(successProbability(-1000, 0)));
  assert.ok(!Number.isNaN(successProbability(710, 0))); // e^710 overflows double
});

/* =========================================================================
 * 3. logit — inverse logistic
 * ====================================================================== */

test('logit: inverse of successProbability', () => {
  for (const p of [0.1, 0.25, 0.5, 0.73, 0.8, 0.95]) {
    // logit(p) is the theta-delta gap that yields p
    assert.ok(close(successProbability(logit(p), 0), p, 1e-12));
  }
});

test('logit: logit(0.5) = 0', () => {
  assert.ok(close(logit(0.5), 0));
});

test('logit: rejects out-of-range probabilities', () => {
  assert.throws(() => logit(0), RangeError);
  assert.throws(() => logit(1), RangeError);
  assert.throws(() => logit(-0.1), RangeError);
  assert.throws(() => logit(1.5), RangeError);
});

/* =========================================================================
 * 4. stepSize — decaying K and fixed-K fallback
 * ====================================================================== */

test('stepSize: decays as 1/(1 + 0.05 n)', () => {
  assert.ok(close(stepSize(0), 1)); // first attempt: K=1
  assert.ok(close(stepSize(10), 1 / (1 + 0.05 * 10))); // = 1/1.5 ≈ 0.6667
  assert.ok(close(stepSize(20), 1 / 2)); // = 0.5
  assert.ok(close(stepSize(100), 1 / 6)); // = 0.16667
});

test('stepSize: strictly decreasing in n', () => {
  let prev = Infinity;
  for (let n = 0; n <= 200; n += 5) {
    const k = stepSize(n);
    assert.ok(k < prev || n === 0);
    assert.ok(k > 0 && k <= 1);
    prev = k;
  }
});

test('stepSize: null/undefined → fixed-K fallback', () => {
  assert.equal(stepSize(null), ELO_FIXED_K);
  assert.equal(stepSize(undefined), ELO_FIXED_K);
  assert.equal(stepSize(null, { fixedK: 0.42 }), 0.42);
});

test('stepSize: custom decay coefficient honored', () => {
  assert.ok(close(stepSize(10, { decay: 0.1 }), 1 / 2));
});

test('stepSize: rejects negative n', () => {
  assert.throws(() => stepSize(-1), RangeError);
  assert.throws(() => stepSize(Number.NaN), RangeError);
  assert.throws(() => stepSize(Infinity), RangeError);
});

/* =========================================================================
 * 5. eloUpdate — the core update math against hand-computed expectations
 * ====================================================================== */

test('eloUpdate: known inputs → expected theta/delta deltas (fixed K)', () => {
  // theta=0, delta=0 → P=0.5. Correct (X=1) → error=+0.5.
  // fixed-K fallback (counts null) → K=0.3.
  // thetaDelta = 0.3 * 0.5 = 0.15 ; deltaDelta = -0.15.
  const r = eloUpdate({ theta: 0, delta: 0, outcome: 1 });
  assert.ok(close(r.p, 0.5));
  assert.ok(close(r.kTheta, 0.3));
  assert.ok(close(r.kDelta, 0.3));
  assert.ok(close(r.thetaDelta, 0.15));
  assert.ok(close(r.deltaDelta, -0.15));
  assert.ok(close(r.theta, 0.15));
  assert.ok(close(r.delta, -0.15));
});

test('eloUpdate: wrong answer pushes theta down, delta up', () => {
  // X=0, P=0.5, error=-0.5, K=0.3 → thetaDelta=-0.15, deltaDelta=+0.15
  const r = eloUpdate({ theta: 0, delta: 0, outcome: 0 });
  assert.ok(close(r.thetaDelta, -0.15));
  assert.ok(close(r.deltaDelta, 0.15));
  assert.ok(close(r.theta, -0.15));
  assert.ok(close(r.delta, 0.15));
});

test('eloUpdate: asymmetric P with hand-computed values', () => {
  // theta=1, delta=0 → P = 1/(1+e^-1) = 0.7310585786...
  // Correct (X=1): error = 1 - 0.7310585786 = 0.2689414214
  // fixed K=0.3 → thetaDelta = 0.0806824264
  const r = eloUpdate({ theta: 1, delta: 0, outcome: 1 });
  assert.ok(close(r.p, 0.7310585786300049, 1e-12));
  assert.ok(close(r.thetaDelta, 0.3 * (1 - 0.7310585786300049), 1e-12));
  assert.ok(close(r.deltaDelta, -0.3 * (1 - 0.7310585786300049), 1e-12));
});

test('eloUpdate: decaying K from counts', () => {
  // thetaCount=20 → K=0.5 ; deltaCount=0 → K=1
  // theta=0,delta=0,X=1,error=0.5 → thetaDelta=0.5*0.5=0.25 ; deltaDelta=-1*0.5=-0.5
  const r = eloUpdate({ theta: 0, delta: 0, outcome: 1, thetaCount: 20, deltaCount: 0 });
  assert.ok(close(r.kTheta, 0.5));
  assert.ok(close(r.kDelta, 1));
  assert.ok(close(r.thetaDelta, 0.25));
  assert.ok(close(r.deltaDelta, -0.5));
});

test('eloUpdate: partial credit (fractional outcome) is supported', () => {
  // X=0.5, P=0.5 → error 0 → no movement
  const r = eloUpdate({ theta: 0, delta: 0, outcome: 0.5 });
  assert.ok(close(r.thetaDelta, 0));
  assert.ok(close(r.deltaDelta, 0));
});

test('eloUpdate: zero error at P==X leaves estimates put', () => {
  // theta - delta = ln(4) → P=0.8 ; outcome exactly 0.8
  const r = eloUpdate({ theta: Math.log(4), delta: 0, outcome: 0.8 });
  assert.ok(close(r.thetaDelta, 0, 1e-12));
  assert.ok(close(r.theta, Math.log(4), 1e-12));
});

test('eloUpdate: is conservative — input objects not mutated', () => {
  const input = { theta: 0, delta: 0, outcome: 1 };
  const snapshot = { ...input };
  eloUpdate(input);
  assert.deepEqual(input, snapshot);
});

test('eloUpdate: rejects invalid outcome and non-finite inputs', () => {
  assert.throws(() => eloUpdate({ theta: 0, delta: 0, outcome: 1.1 }), RangeError);
  assert.throws(() => eloUpdate({ theta: 0, delta: 0, outcome: -0.01 }), RangeError);
  assert.throws(() => eloUpdate({ theta: NaN, delta: 0, outcome: 1 }), RangeError);
  assert.throws(() => eloUpdate({ theta: 0, delta: Infinity, outcome: 1 }), RangeError);
});

/* =========================================================================
 * 6. SIMULATED LEARNER CONVERGENCE
 *    A learner of fixed true ability answers a stream of items (outcomes drawn
 *    from the true Rasch probability). theta should converge toward true_theta.
 * ====================================================================== */

/**
 * Run a full Elo estimation over n items for a fixed-true-ability learner.
 * Items have difficulty drawn uniformly in [-3,3]. Outcomes are Bernoulli with
 * the TRUE probability. Both learner and item counts decay K.
 * @returns {number} final theta estimate
 */
function simulateLearner(trueTheta, nItems, rng) {
  let theta = 0;
  let thetaCount = 0;
  // each simulated item keeps its own difficulty & attempt count
  for (let i = 0; i < nItems; i++) {
    const delta = (rng() * 6) - 3; // U[-3,3]
    const pTrue = successProbability(trueTheta, delta);
    const outcome = rng() < pTrue ? 1 : 0;
    const r = eloUpdate({ theta, delta, outcome, thetaCount, deltaCount: null });
    theta = r.theta;
    thetaCount += 1;
  }
  return theta;
}

test('convergence: estimate approaches true ability over many items', () => {
  for (const trueTheta of [-2, -1, 0, 1, 2]) {
    // average several seeds to wash out Bernoulli noise
    let sum = 0;
    const seeds = 40;
    for (let s = 0; s < seeds; s++) {
      sum += simulateLearner(trueTheta, 400, mulberry32(1000 + s + trueTheta * 7));
    }
    const mean = sum / seeds;
    assert.ok(
      Math.abs(mean - trueTheta) < 0.5,
      `mean theta ${mean.toFixed(3)} should be within 0.5 of true ${trueTheta}`,
    );
  }
});

test('convergence: error shrinks with more items (consistency)', () => {
  const trueTheta = 1.5;
  const errAt = (n) => {
    let sum = 0;
    const seeds = 40;
    for (let s = 0; s < seeds; s++) {
      sum += Math.abs(simulateLearner(trueTheta, n, mulberry32(7 + s)) - trueTheta);
    }
    return sum / seeds;
  };
  const errShort = errAt(40);
  const errLong = errAt(800);
  assert.ok(errLong < errShort, `error should shrink: short=${errShort.toFixed(3)} long=${errLong.toFixed(3)}`);
  assert.ok(errLong < 0.4, `long-run error ${errLong.toFixed(3)} should be small`);
});

/* =========================================================================
 * 7. PLACEMENT STATE + NEXT-ITEM SELECTION
 * ====================================================================== */

const BANK = Object.freeze([
  { id: 'a', delta: -3 },
  { id: 'b', delta: -1.5 },
  { id: 'c', delta: -0.5 },
  { id: 'd', delta: 0 },
  { id: 'e', delta: 0.5 },
  { id: 'f', delta: 1.5 },
  { id: 'g', delta: 3 },
]);

test('createPlacementState: defaults and seeding', () => {
  const s0 = createPlacementState();
  assert.equal(s0.theta, DEFAULT_THETA);
  assert.equal(s0.thetaInitial, DEFAULT_THETA);
  assert.equal(s0.lastThetaDelta, Infinity);
  assert.deepEqual([...s0.responses], []);
  assert.deepEqual([...s0.usedIds], []);
  assert.ok(Object.isFrozen(s0));

  const seeded = createPlacementState({ theta: 1.2 });
  assert.equal(seeded.theta, 1.2);
  assert.equal(seeded.thetaInitial, 1.2);
});

test('createPlacementState: rejects non-finite seed', () => {
  assert.throws(() => createPlacementState({ theta: NaN }), RangeError);
});

test('selectNextPlacementItem: picks delta nearest theta (max info)', () => {
  const s = createPlacementState({ theta: 0 });
  assert.equal(selectNextPlacementItem(s, BANK).id, 'd'); // delta 0 nearest theta 0

  const s2 = createPlacementState({ theta: 1.4 });
  assert.equal(selectNextPlacementItem(s2, BANK).id, 'f'); // delta 1.5 nearest 1.4

  const s3 = createPlacementState({ theta: -2.4 });
  assert.equal(selectNextPlacementItem(s3, BANK).id, 'a'); // delta -3 nearest? |-3-(-2.4)|=0.6 vs |-1.5+2.4|=0.9 → a
});

test('selectNextPlacementItem: skips already-used items', () => {
  let s = createPlacementState({ theta: 0 });
  s = applyPlacementResponse(s, { id: 'd', delta: 0 }, 1);
  // theta moved up a touch; 'd' is used, next nearest unused should be 'e' (0.5) or 'c'(-0.5)
  const next = selectNextPlacementItem(s, BANK);
  assert.notEqual(next.id, 'd');
  assert.ok(['c', 'e'].includes(next.id));
});

test('selectNextPlacementItem: returns null when bank exhausted', () => {
  let s = createPlacementState({ theta: 0 });
  for (const item of BANK) {
    s = applyPlacementResponse(s, item, 1);
  }
  assert.equal(selectNextPlacementItem(s, BANK), null);
});

test('selectNextPlacementItem: deterministic tie-break = smaller delta', () => {
  const tieBank = [
    { id: 'lo', delta: -1 },
    { id: 'hi', delta: 1 },
  ];
  const s = createPlacementState({ theta: 0 }); // both 1 away
  assert.equal(selectNextPlacementItem(s, tieBank).id, 'lo');
});

test('selectNextPlacementItem: rng breaks exact ties across both candidates', () => {
  const tieBank = [
    { id: 'lo', delta: -1 },
    { id: 'hi', delta: 1 },
  ];
  const s = createPlacementState({ theta: 0 });
  const seen = new Set();
  // sweep rng outputs to ensure both branches reachable
  for (const v of [0.0, 0.25, 0.49, 0.5, 0.75, 0.999]) {
    seen.add(selectNextPlacementItem(s, tieBank, { rng: () => v }).id);
  }
  assert.deepEqual([...seen].sort(), ['hi', 'lo']);
});

test('applyPlacementResponse: updates theta, records response, is immutable', () => {
  const s0 = createPlacementState({ theta: 0 });
  const s1 = applyPlacementResponse(s0, { id: 'd', delta: 0 }, 1);
  // First response: thetaCount=0 → K=1, P=0.5, error=0.5 → thetaDelta=0.5
  assert.ok(close(s1.theta, 0.5));
  assert.ok(close(s1.lastThetaDelta, 0.5));
  assert.deepEqual([...s1.usedIds], ['d']);
  assert.equal(s1.responses.length, 1);
  assert.equal(s1.responses[0].outcome, 1);
  // original untouched
  assert.equal(s0.theta, 0);
  assert.equal(s0.responses.length, 0);
  assert.ok(Object.isFrozen(s1));
  assert.ok(Object.isFrozen(s1.responses));
});

test('applyPlacementResponse: second response uses decayed K', () => {
  let s = createPlacementState({ theta: 0 });
  s = applyPlacementResponse(s, { id: 'd', delta: 0 }, 1); // theta=0.5
  // second: thetaCount=1 → K=1/(1+0.05)=0.95238...
  // P=successProbability(0.5, delta_b). Use item 'b' delta -1.5.
  const before = s.theta;
  s = applyPlacementResponse(s, { id: 'b', delta: -1.5 }, 1);
  const k = 1 / (1 + ELO_K_DECAY * 1);
  const p = successProbability(before, -1.5);
  assert.ok(close(s.theta, before + k * (1 - p), 1e-12));
});

test('applyPlacementResponse: throws on re-using an item id', () => {
  let s = createPlacementState();
  s = applyPlacementResponse(s, { id: 'd', delta: 0 }, 1);
  assert.throws(() => applyPlacementResponse(s, { id: 'd', delta: 0 }, 1), /already administered/);
});

/* =========================================================================
 * 8. STOP CONDITION
 * ====================================================================== */

test('shouldStopPlacement: does not stop before min items', () => {
  let s = createPlacementState();
  for (let i = 0; i < PLACEMENT_MIN_ITEMS - 1; i++) {
    s = applyPlacementResponse(s, { id: `x${i}`, delta: 0.0001 * i }, 0.5);
    const d = shouldStopPlacement(s);
    assert.equal(d.done, false, `should not stop at ${s.responses.length} items`);
  }
});

test('shouldStopPlacement: stops on stabilization once min reached', () => {
  // Build a state with >= min items whose last theta move is tiny.
  let s = createPlacementState({ theta: 0 });
  // administer min items, the last one near-zero error so lastThetaDelta is small.
  for (let i = 0; i < PLACEMENT_MIN_ITEMS - 1; i++) {
    s = applyPlacementResponse(s, { id: `i${i}`, delta: 0 }, 0.5); // P=0.5, error≈0 → small move
  }
  // The Nth item: outcome equal to predicted P → zero move → stable.
  const p = successProbability(s.theta, 0);
  s = applyPlacementResponse(s, { id: 'last', delta: 0 }, p);
  assert.ok(s.responses.length >= PLACEMENT_MIN_ITEMS);
  assert.ok(s.lastThetaDelta < PLACEMENT_STABLE_DELTA);
  const d = shouldStopPlacement(s);
  assert.equal(d.done, true);
  assert.equal(d.reason, 'stable');
});

test('shouldStopPlacement: does NOT stop if last move exceeds threshold', () => {
  let s = createPlacementState({ theta: 0 });
  for (let i = 0; i < PLACEMENT_MIN_ITEMS - 1; i++) {
    s = applyPlacementResponse(s, { id: `i${i}`, delta: 0 }, 0.5);
  }
  // big surprise: very easy item answered wrong → large theta move
  s = applyPlacementResponse(s, { id: 'shock', delta: -3, }, 0);
  assert.ok(s.lastThetaDelta >= PLACEMENT_STABLE_DELTA);
  const d = shouldStopPlacement(s);
  assert.equal(d.done, false);
});

test('shouldStopPlacement: hard cap at max items', () => {
  let s = createPlacementState();
  for (let i = 0; i < PLACEMENT_MAX_ITEMS; i++) {
    // keep moves large so "stable" never triggers: alternate extreme surprises
    const delta = i % 2 === 0 ? -3 : 3;
    const outcome = i % 2 === 0 ? 0 : 1;
    s = applyPlacementResponse(s, { id: `c${i}`, delta }, outcome);
  }
  const d = shouldStopPlacement(s);
  assert.equal(d.done, true);
  assert.equal(d.reason, 'cap');
  assert.equal(d.administered, PLACEMENT_MAX_ITEMS);
});

test('shouldStopPlacement: exhausted when bankSize reached', () => {
  let s = createPlacementState();
  for (let i = 0; i < 5; i++) {
    s = applyPlacementResponse(s, { id: `c${i}`, delta: 3 }, 0); // large moves, not stable
  }
  const d = shouldStopPlacement(s, { bankSize: 5, minItems: 100 });
  assert.equal(d.done, true);
  assert.equal(d.reason, 'exhausted');
});

test('shouldStopPlacement: cap takes precedence over exhausted/stable', () => {
  let s = createPlacementState();
  for (let i = 0; i < PLACEMENT_MAX_ITEMS; i++) {
    s = applyPlacementResponse(s, { id: `c${i}`, delta: 0 }, 0.5);
  }
  const d = shouldStopPlacement(s, { bankSize: PLACEMENT_MAX_ITEMS });
  assert.equal(d.reason, 'cap');
});

test('shouldStopPlacement: opts.bank couples exhaustion to the REAL unused set (anti-spin)', () => {
  // Tiny bank of 3 items; administer all 3 (low minItems so the loop is short).
  const bank = [
    { id: 'a', delta: 0 },
    { id: 'b', delta: 1 },
    { id: 'c', delta: -1 },
  ];
  let s = createPlacementState();
  // Before exhaustion: 1 unused remains → not done by exhaustion.
  s = applyPlacementResponse(s, bank[0], 0);
  s = applyPlacementResponse(s, bank[1], 1);
  let d = shouldStopPlacement(s, { bank, minItems: 100, maxItems: 100 });
  assert.equal(d.done, false, 'one unused item remains → must not stop');
  // Administer the last unused item → bank exhausted → must stop with reason exhausted.
  s = applyPlacementResponse(s, bank[2], 0);
  d = shouldStopPlacement(s, { bank, minItems: 100, maxItems: 100 });
  assert.equal(d.done, true);
  assert.equal(d.reason, 'exhausted');
});

test('shouldStopPlacement: opts.bank is robust to seeded usedIds (counts real unused, not administered count)', () => {
  // A 2-item bank where one id was already "used" before placement began (seeded).
  // bankSize would say 2 items, administered=1 → NOT exhausted, and the caller would
  // spin because selectNextPlacementItem can never return the seeded id. opts.bank
  // sees the real unused set (zero) and stops correctly.
  const bank = [
    { id: 'seeded', delta: 0 },
    { id: 'fresh', delta: 0.5 },
  ];
  let s = createPlacementState();
  // Simulate the seeded id by administering it, then the fresh one.
  s = applyPlacementResponse(s, bank[0], 1);
  s = applyPlacementResponse(s, bank[1], 0);
  // Real bank: zero unused → exhausted, even though only 2 administered.
  const d = shouldStopPlacement(s, { bank, minItems: 100, maxItems: 100 });
  assert.equal(d.done, true);
  assert.equal(d.reason, 'exhausted');
  // selectNextPlacementItem agrees: nothing left to serve.
  assert.equal(selectNextPlacementItem(s, bank), null);
});

test('shouldStopPlacement: opts.bank takes precedence over opts.bankSize', () => {
  const bank = [{ id: 'a', delta: 0 }, { id: 'b', delta: 1 }];
  let s = createPlacementState();
  s = applyPlacementResponse(s, bank[0], 1); // 1 unused remains
  // bankSize:1 would (wrongly) say exhausted; the real bank still has 'b' → not done.
  const d = shouldStopPlacement(s, { bank, bankSize: 1, minItems: 100, maxItems: 100 });
  assert.equal(d.done, false, 'real bank still has an unused item; bank wins over bankSize');
});

test('shouldStopPlacement: an end-to-end loop driven only by opts.bank cannot spin', () => {
  // A full driver loop that NEVER passes bankSize — only opts.bank — must terminate
  // even though minItems is unreachably high (no stable/cap stop will ever fire here).
  const bank = [
    { id: 'a', delta: 0 }, { id: 'b', delta: 1 }, { id: 'c', delta: -1 }, { id: 'd', delta: 2 },
  ];
  let s = createPlacementState();
  let guard = 0;
  for (;;) {
    if (++guard > 1000) { assert.fail('placement loop spun (exhaustion not detected)'); }
    const stop = shouldStopPlacement(s, { bank, minItems: 999, maxItems: 999 });
    if (stop.done) { assert.equal(stop.reason, 'exhausted'); break; }
    const item = selectNextPlacementItem(s, bank);
    assert.ok(item, 'select returned null but stop said keep going');
    s = applyPlacementResponse(s, item, 1);
  }
  assert.equal(s.responses.length, bank.length);
});

/* =========================================================================
 * 9. END-TO-END PLACEMENT SESSION (driver loop wired together)
 * ====================================================================== */

test('placement session: a true-ability learner is placed near true theta', () => {
  // Large graded bank spanning [-4,4].
  const bank = [];
  for (let d = -4; d <= 4.0001; d += 0.25) {
    bank.push({ id: `item_${d.toFixed(2)}`, delta: Math.round(d * 100) / 100 });
  }

  function runPlacement(trueTheta, seed) {
    const rng = mulberry32(seed);
    let s = createPlacementState({ theta: 0 });
    for (;;) {
      const stop = shouldStopPlacement(s, { bankSize: bank.length });
      if (stop.done) break;
      const item = selectNextPlacementItem(s, bank, { rng });
      if (!item) break;
      const pTrue = successProbability(trueTheta, item.delta);
      const outcome = rng() < pTrue ? 1 : 0;
      s = applyPlacementResponse(s, item, outcome);
    }
    return s;
  }

  for (const trueTheta of [-2, 0, 1.5]) {
    // average several runs (single 8–15 item placement is intentionally short/noisy)
    let sum = 0;
    let lenSum = 0;
    const runs = 60;
    for (let r = 0; r < runs; r++) {
      const s = runPlacement(trueTheta, 2000 + r * 13 + Math.round(trueTheta * 5));
      sum += s.theta;
      lenSum += s.responses.length;
      // each placement respects the length window
      assert.ok(s.responses.length <= PLACEMENT_MAX_ITEMS);
      assert.ok(s.responses.length >= 1);
    }
    const mean = sum / runs;
    const meanLen = lenSum / runs;
    assert.ok(
      Math.abs(mean - trueTheta) < 0.6,
      `placement mean theta ${mean.toFixed(3)} within 0.6 of true ${trueTheta} (avg len ${meanLen.toFixed(1)})`,
    );
    assert.ok(meanLen >= PLACEMENT_MIN_ITEMS, `avg placement length ${meanLen} should be >= ${PLACEMENT_MIN_ITEMS}`);
    assert.ok(meanLen <= PLACEMENT_MAX_ITEMS, `avg placement length ${meanLen} should be <= ${PLACEMENT_MAX_ITEMS}`);
  }
});

/* =========================================================================
 * 10. TARGET SUCCESS BAND SELECTOR
 * ====================================================================== */

test('targetDifficulty: delta = theta - logit(target)', () => {
  assert.ok(close(targetDifficulty(0), -Math.log(4))); // ≈ -1.386
  assert.ok(close(targetDifficulty(2), 2 - Math.log(4)));
  // an item exactly at this difficulty yields the target success
  assert.ok(close(successProbability(0, targetDifficulty(0)), TARGET_SUCCESS, 1e-12));
});

test('selectTargetBandItem: chooses item giving ~0.8 success', () => {
  // theta=0 → target delta ≈ -1.386. Bank below.
  const bank = [
    { id: 'too_hard', delta: 0 },     // P=0.5
    { id: 'just_right', delta: -1.4 },// P≈0.802
    { id: 'too_easy', delta: -3 },    // P≈0.95
  ];
  const chosen = selectTargetBandItem(0, bank);
  assert.equal(chosen.id, 'just_right');
  // its predicted success is close to TARGET_SUCCESS
  assert.ok(Math.abs(successProbability(0, chosen.delta) - TARGET_SUCCESS) < 0.05);
});

test('selectTargetBandItem: shifts with theta', () => {
  const bank = [
    { id: 'A', delta: -1.4 },
    { id: 'B', delta: 0.1 },
    { id: 'C', delta: 1.6 },
  ];
  // theta=0 → target ≈ -1.386 → A
  assert.equal(selectTargetBandItem(0, bank).id, 'A');
  // theta=1.5 → target ≈ 0.114 → B
  assert.equal(selectTargetBandItem(1.5, bank).id, 'B');
  // theta=3 → target ≈ 1.614 → C
  assert.equal(selectTargetBandItem(3, bank).id, 'C');
});

test('selectTargetBandItem: honors excludeIds', () => {
  const bank = [
    { id: 'A', delta: -1.4 },
    { id: 'B', delta: -1.4 }, // identical difficulty
  ];
  const chosen = selectTargetBandItem(0, bank, { excludeIds: ['A'] });
  assert.equal(chosen.id, 'B');
});

test('selectTargetBandItem: custom targetSuccess', () => {
  // target 0.5 → delta = theta. theta=0 → pick item at 0.
  const bank = [
    { id: 'mid', delta: 0 },
    { id: 'easy', delta: -1.4 },
  ];
  assert.equal(selectTargetBandItem(0, bank, { targetSuccess: 0.5 }).id, 'mid');
});

test('selectTargetBandItem: returns null on empty/all-excluded bank', () => {
  assert.equal(selectTargetBandItem(0, []), null);
  assert.equal(selectTargetBandItem(0, [{ id: 'x', delta: 0 }], { excludeIds: ['x'] }), null);
});

test('selectTargetBandItem: rejects invalid targetSuccess', () => {
  assert.throws(() => selectTargetBandItem(0, [{ id: 'x', delta: 0 }], { targetSuccess: 0 }), RangeError);
  assert.throws(() => selectTargetBandItem(0, [{ id: 'x', delta: 0 }], { targetSuccess: 1 }), RangeError);
});

test('selectTargetBandItem: keeps a simulated learner in the 0.78-0.86 band', () => {
  // Dense bank. A fixed-ability learner repeatedly served target-band items
  // should experience an empirical success rate near 0.8.
  const bank = [];
  for (let d = -5; d <= 5.0001; d += 0.1) {
    bank.push({ id: `b_${d.toFixed(1)}`, delta: Math.round(d * 10) / 10 });
  }
  const rng = mulberry32(424242);
  const trueTheta = 0.7;
  let correct = 0;
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const item = selectTargetBandItem(trueTheta, bank, { rng });
    const pTrue = successProbability(trueTheta, item.delta);
    if (rng() < pTrue) correct++;
  }
  const rate = correct / N;
  assert.ok(rate > 0.78 && rate < 0.86, `empirical success ${rate.toFixed(3)} should sit in the 80-85% band`);
});

/* =========================================================================
 * 11. STAIRCASE FALLBACK (1-up / 2-down)
 * ====================================================================== */

test('createStaircase: defaults and seeding', () => {
  const s = createStaircase();
  assert.equal(s.level, DEFAULT_DELTA);
  assert.equal(s.consecutiveCorrect, 0);
  assert.equal(s.reversals, 0);
  assert.equal(s.lastDirection, 0);
  assert.ok(Object.isFrozen(s));
  assert.equal(createStaircase({ level: 2 }).level, 2);
});

test('createStaircase: rejects non-finite level', () => {
  assert.throws(() => createStaircase({ level: NaN }), RangeError);
});

test('staircaseStep: two correct → harder (level += step)', () => {
  let s = createStaircase({ level: 0 });
  s = staircaseStep(s, true); // 1st correct, no move
  assert.equal(s.level, 0);
  assert.equal(s.consecutiveCorrect, 1);
  s = staircaseStep(s, true); // 2nd correct → harder
  assert.ok(close(s.level, STAIRCASE_STEP));
  assert.equal(s.consecutiveCorrect, 0);
  assert.equal(s.lastDirection, 1);
});

test('staircaseStep: one wrong → easier (level -= step), resets run', () => {
  let s = createStaircase({ level: 1 });
  s = staircaseStep(s, true); // run=1
  s = staircaseStep(s, false); // wrong → easier
  assert.ok(close(s.level, 1 - STAIRCASE_STEP));
  assert.equal(s.consecutiveCorrect, 0);
  assert.equal(s.lastDirection, -1);
});

test('staircaseStep: correct after wrong does not immediately move', () => {
  let s = createStaircase({ level: 0 });
  s = staircaseStep(s, false); // easier, level -0.5
  const lvl = s.level;
  s = staircaseStep(s, true); // run=1, no move
  assert.ok(close(s.level, lvl));
  assert.equal(s.consecutiveCorrect, 1);
});

test('staircaseStep: counts reversals correctly', () => {
  let s = createStaircase({ level: 0 });
  // go up: two correct
  s = staircaseStep(s, true);
  s = staircaseStep(s, true); // dir +1, reversals 0
  assert.equal(s.reversals, 0);
  // now wrong → dir -1 → reversal
  s = staircaseStep(s, false);
  assert.equal(s.reversals, 1);
  assert.equal(s.lastDirection, -1);
  // up again: two correct → dir +1 → reversal 2
  s = staircaseStep(s, true);
  s = staircaseStep(s, true);
  assert.equal(s.reversals, 2);
});

test('staircaseStep: immutable + custom step', () => {
  const s0 = createStaircase({ level: 0 });
  const s1 = staircaseStep(s0, false, { step: 0.25 });
  assert.ok(close(s1.level, -0.25));
  assert.equal(s0.level, 0); // original untouched
  assert.ok(Object.isFrozen(s1));
});

test('staircaseStep: converges around the ~70.7% point for a fixed learner', () => {
  // A learner of true ability θ; the staircase level should hover near the
  // difficulty where P ≈ 0.707, i.e. δ ≈ θ - logit(0.707) ≈ θ - 0.879.
  const rng = mulberry32(99);
  const trueTheta = 1.0;
  let s = createStaircase({ level: 0 });
  const levels = [];
  for (let i = 0; i < 4000; i++) {
    const pTrue = successProbability(trueTheta, s.level);
    const correct = rng() < pTrue;
    s = staircaseStep(s, correct);
    if (i >= 1000) levels.push(s.level); // discard burn-in
  }
  const meanLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
  const expected = trueTheta - logit(0.707); // ≈ 0.121
  assert.ok(
    Math.abs(meanLevel - expected) < 0.4,
    `staircase mean level ${meanLevel.toFixed(3)} should hover near ${expected.toFixed(3)}`,
  );
  // and the realized accuracy at the hovering level should be near 0.707
  const accAtMean = successProbability(trueTheta, meanLevel);
  assert.ok(Math.abs(accAtMean - 0.707) < 0.1, `accuracy at mean level ${accAtMean.toFixed(3)} ~ 0.707`);
});
