/**
 * @file core/placement.js
 *
 * ADAPTIVE PLACEMENT + DIFFICULTY ENGINE — Functional Core.
 *
 * A pure, framework-agnostic ES module implementing an "Elo-for-students"
 * (Pelánek) adaptive engine on the logit (1PL / Rasch) scale. No I/O, no DOM,
 * no globals, no clock. Every function is pure: it derives outputs solely from
 * its arguments and returns new state objects rather than mutating inputs.
 * Where randomness is needed it is injected as an `rng` parameter (a function
 * returning a float in [0, 1), e.g. `Math.random`).
 *
 * The model has three cooperating pieces:
 *
 *   1. Elo update — single-attempt Rasch update of a learner ability `theta`
 *      and an item difficulty `delta`, both on the natural-log "logit" scale.
 *
 *   2. Placement diagnostic driver — a short adaptive test (~8–15 items) that,
 *      after each response, re-estimates `theta` and picks the next unused item
 *      whose difficulty `delta` is nearest the current `theta` (1PL maximum
 *      information selection), stopping when the estimate stabilizes or a cap
 *      is reached.
 *
 *   3. Difficulty selectors — a "target success band" selector that prefers
 *      items whose predicted success probability is ~0.80 (to keep a learner in
 *      the ~80–85% success band, Wilson's "85% rule"), plus a no-math 1-up /
 *      2-down staircase fallback.
 *
 * See VISION.md §9 §B ("Placement/adaptive = Elo-for-students") and
 * research/LEVEL_SYSTEM_RESEARCH.md §2 ("Placement / adaptive testing").
 *
 * Scale conventions:
 *   - `theta` (θ): learner ability, logits. Higher = more able.
 *   - `delta` (δ): item difficulty, logits. Higher = harder.
 *   - The probability that a learner of ability θ answers an item of
 *     difficulty δ correctly is the 1PL/Rasch logistic:
 *         P = 1 / (1 + e^-(θ − δ)).
 *     θ = δ gives P = 0.5.
 *
 * @module core/placement
 */

'use strict';

/* ===========================================================================
 * TUNABLE CONSTANTS (single source of truth — exported so callers / tests can
 * reference them rather than hard-coding magic numbers).
 * ======================================================================== */

/**
 * Decay coefficient for the per-attempt step size `K`.
 * `K = 1 / (1 + ELO_K_DECAY * n)` where `n` is the prior attempt count for the
 * entity being updated. Larger = faster decay = sooner-stable estimates.
 * (Pelánek's "uncertainty"/decaying-step Elo.)
 * @type {number}
 */
export const ELO_K_DECAY = 0.05;

/**
 * Fixed-K fallback used when an attempt count is unavailable (`n` is null /
 * undefined). ~0.3 is a standard constant Elo step on the logit scale.
 * @type {number}
 */
export const ELO_FIXED_K = 0.3;

/**
 * Default starting ability/difficulty when no prior estimate exists.
 * 0 logits = the middle of the scale (P = 0.5 against a δ = 0 item).
 * @type {number}
 */
export const DEFAULT_THETA = 0;

/** @type {number} Default starting item difficulty (logits). */
export const DEFAULT_DELTA = 0;

/**
 * Minimum number of placement items to administer before the stabilization
 * stop rule is allowed to fire. Below this we never stop early.
 * @type {number}
 */
export const PLACEMENT_MIN_ITEMS = 8;

/**
 * Hard cap on placement length — always stop at or before this many items.
 * (Research: ~8–15 items, 5–10 minutes.)
 * @type {number}
 */
export const PLACEMENT_MAX_ITEMS = 15;

/**
 * Stabilization threshold (logits). Once at least PLACEMENT_MIN_ITEMS have been
 * administered and the most recent theta update moved theta by less than this,
 * the estimate is considered stable and placement may stop.
 * @type {number}
 */
export const PLACEMENT_STABLE_DELTA = 0.25;

/**
 * Target success probability for the "success band" selector. Items are chosen
 * so the learner's predicted P(correct) is near this value, keeping them in the
 * ~80–85% success band (Wilson 85% rule).
 * @type {number}
 */
export const TARGET_SUCCESS = 0.8;

/**
 * Difficulty offset (logits) below theta that yields ~TARGET_SUCCESS success.
 * Derived from the logistic: for P = 0.8, θ − δ = ln(P/(1−P)) = ln(4) ≈ 1.386.
 * Exposed as a named constant; `logit(TARGET_SUCCESS)` reproduces it exactly.
 * @type {number}
 */
export const TARGET_SUCCESS_OFFSET = Math.log(TARGET_SUCCESS / (1 - TARGET_SUCCESS));

/**
 * Staircase step size (logits) for the 1-up / 2-down fallback selector.
 * A 1-up/2-down rule converges on the ~70.7% success level; the step controls
 * how aggressively difficulty moves per decision.
 * @type {number}
 */
export const STAIRCASE_STEP = 0.5;

/* ===========================================================================
 * CORE LOGISTIC / ELO MATH
 * ======================================================================== */

/**
 * 1PL / Rasch success probability: P = 1 / (1 + e^-(theta - delta)).
 * Numerically stable for large |theta - delta|.
 *
 * @param {number} theta Learner ability (logits).
 * @param {number} delta Item difficulty (logits).
 * @returns {number} Probability of a correct response in (0, 1).
 */
export function successProbability(theta, delta) {
  const x = theta - delta;
  // Stable logistic: avoid overflow of e^x for large positive x.
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/**
 * Logit (inverse logistic) of a probability: ln(p / (1 - p)).
 * Useful for converting a target success probability into a θ−δ offset.
 *
 * @param {number} p Probability strictly in (0, 1).
 * @returns {number} The logit, in logits.
 * @throws {RangeError} If p is not strictly within (0, 1).
 */
export function logit(p) {
  if (!(p > 0 && p < 1)) {
    throw new RangeError(`logit: p must be strictly in (0,1), got ${p}`);
  }
  return Math.log(p / (1 - p));
}

/**
 * Compute the decaying per-attempt step size `K`.
 * `K = 1 / (1 + ELO_K_DECAY * n)`. When `n` is null/undefined, returns the
 * fixed-K fallback (ELO_FIXED_K). `n` is the count of PRIOR attempts for the
 * entity being updated (0 for the very first attempt → K = 1 / (1+0) = 1... but
 * note: with n = 0 the decaying formula gives K = 1, which is the appropriately
 * large first-step; pass the entity's own running count to decay it).
 *
 * @param {number|null|undefined} n Prior attempt count (>= 0), or null/undefined
 *   to request the fixed-K fallback.
 * @param {object} [opts]
 * @param {number} [opts.decay=ELO_K_DECAY] Decay coefficient.
 * @param {number} [opts.fixedK=ELO_FIXED_K] Fallback step when n is null/undefined.
 * @returns {number} The step size K in (0, 1].
 * @throws {RangeError} If n is a finite number < 0.
 */
export function stepSize(n, opts = {}) {
  const decay = opts.decay ?? ELO_K_DECAY;
  const fixedK = opts.fixedK ?? ELO_FIXED_K;
  if (n === null || n === undefined) {
    return fixedK;
  }
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new RangeError(`stepSize: n must be a non-negative finite number or null, got ${n}`);
  }
  return 1 / (1 + decay * n);
}

/**
 * @typedef {object} EloUpdateResult
 * @property {number} theta New learner ability (logits).
 * @property {number} delta New item difficulty (logits).
 * @property {number} p Predicted success probability used in the update.
 * @property {number} kTheta Step size applied to theta.
 * @property {number} kDelta Step size applied to delta.
 * @property {number} thetaDelta Signed change applied to theta (theta_new - theta_old).
 * @property {number} deltaDelta Signed change applied to delta (delta_new - delta_old).
 */

/**
 * Single-attempt Elo / Rasch update.
 *
 *   P = 1 / (1 + e^-(theta - delta))
 *   theta_new = theta + K_theta * (X - P)
 *   delta_new = delta - K_delta * (X - P)
 *
 * `X` is the observed outcome in [0, 1] (1 = correct, 0 = wrong; fractional
 * values are allowed for partial credit). Learner and item each get their own
 * (optionally decaying) step size based on their own prior attempt count, so a
 * well-calibrated item barely moves while a fresh learner moves a lot.
 *
 * This is a PURE function: it returns a new result object and does not mutate
 * its arguments.
 *
 * @param {object} params
 * @param {number} params.theta Current learner ability (logits).
 * @param {number} params.delta Current item difficulty (logits).
 * @param {number} params.outcome Observed result X in [0, 1].
 * @param {number|null} [params.thetaCount=null] Prior attempts BY this learner
 *   (decays the learner step). null → fixed-K fallback.
 * @param {number|null} [params.deltaCount=null] Prior attempts ON this item
 *   (decays the item step). null → fixed-K fallback.
 * @param {object} [opts] Forwarded to {@link stepSize} (decay, fixedK).
 * @returns {EloUpdateResult}
 * @throws {RangeError} If outcome is outside [0, 1] or theta/delta non-finite.
 */
export function eloUpdate(params, opts = {}) {
  const { theta, delta, outcome } = params;
  const thetaCount = params.thetaCount ?? null;
  const deltaCount = params.deltaCount ?? null;

  if (!Number.isFinite(theta) || !Number.isFinite(delta)) {
    throw new RangeError('eloUpdate: theta and delta must be finite numbers');
  }
  if (typeof outcome !== 'number' || !(outcome >= 0 && outcome <= 1)) {
    throw new RangeError(`eloUpdate: outcome must be in [0,1], got ${outcome}`);
  }

  const p = successProbability(theta, delta);
  const error = outcome - p; // X - P
  const kTheta = stepSize(thetaCount, opts);
  const kDelta = stepSize(deltaCount, opts);

  const thetaDelta = kTheta * error;
  const deltaDelta = -kDelta * error; // item moves opposite the learner

  return {
    theta: theta + thetaDelta,
    delta: delta + deltaDelta,
    p,
    kTheta,
    kDelta,
    thetaDelta,
    deltaDelta,
  };
}

/* ===========================================================================
 * PLACEMENT DIAGNOSTIC DRIVER
 *
 * Pure functions over an immutable "placement state". The caller owns the item
 * bank (each item has at least an `id` and a `delta`); this engine never
 * fetches, renders, or stores anything.
 * ======================================================================== */

/**
 * @typedef {object} PlacementItem
 * @property {string|number} id Stable unique identifier for the item.
 * @property {number} delta Item difficulty (logits).
 */

/**
 * @typedef {object} PlacementResponse
 * @property {string|number} id Item id that was answered.
 * @property {number} delta Difficulty of the answered item (logits).
 * @property {number} outcome Observed result X in [0, 1].
 */

/**
 * @typedef {object} PlacementState
 * @property {number} theta Current ability estimate (logits).
 * @property {number} thetaInitial Ability estimate before any responses (seed).
 * @property {number} lastThetaDelta Absolute change in theta from the most
 *   recent response (Infinity before the first response).
 * @property {ReadonlyArray<PlacementResponse>} responses Responses so far, in order.
 * @property {ReadonlyArray<string|number>} usedIds Ids already administered.
 */

/**
 * Create an initial placement state.
 *
 * @param {object} [opts]
 * @param {number} [opts.theta=DEFAULT_THETA] Seed ability (e.g. from a weak
 *   self-assessment prior). Defaults to the middle of the scale.
 * @returns {PlacementState} A frozen initial state.
 */
export function createPlacementState(opts = {}) {
  const theta = opts.theta ?? DEFAULT_THETA;
  if (!Number.isFinite(theta)) {
    throw new RangeError(`createPlacementState: theta must be finite, got ${theta}`);
  }
  return Object.freeze({
    theta,
    thetaInitial: theta,
    lastThetaDelta: Infinity,
    responses: Object.freeze([]),
    usedIds: Object.freeze([]),
  });
}

/**
 * Select the next placement item: the UNUSED item whose difficulty `delta` is
 * nearest the current ability `theta` (1PL maximum-information selection — for
 * the Rasch model information is maximized where δ = θ).
 *
 * Ties (equal |δ − θ|) are broken deterministically: by the smaller δ, then by
 * the order the item appears in `bank` (stable). Pass an `rng` to randomize
 * among exact ties instead (useful to avoid always showing the same item to
 * every learner at the same θ).
 *
 * @param {PlacementState} state Current placement state.
 * @param {ReadonlyArray<PlacementItem>} bank Candidate items (any with an id in
 *   `state.usedIds` are skipped).
 * @param {object} [opts]
 * @param {() => number} [opts.rng] Optional RNG in [0,1) to break exact ties at
 *   random. If omitted, ties are broken deterministically.
 * @returns {PlacementItem|null} The chosen item, or null if none are available.
 */
export function selectNextPlacementItem(state, bank, opts = {}) {
  const used = new Set(state.usedIds);
  const theta = state.theta;
  /** @type {PlacementItem[]} */
  let best = [];
  let bestDist = Infinity;

  for (const item of bank) {
    if (used.has(item.id)) continue;
    const dist = Math.abs(item.delta - theta);
    if (dist < bestDist - 1e-12) {
      bestDist = dist;
      best = [item];
    } else if (Math.abs(dist - bestDist) <= 1e-12) {
      best.push(item);
    }
  }

  if (best.length === 0) return null;
  if (best.length === 1) return best[0];

  if (opts.rng) {
    const idx = Math.floor(opts.rng() * best.length);
    // Guard against rng() === 1 or tiny float overshoot.
    return best[Math.min(idx, best.length - 1)];
  }

  // Deterministic tie-break: smallest delta, then earliest in bank.
  let chosen = best[0];
  for (const item of best) {
    if (item.delta < chosen.delta - 1e-12) chosen = item;
  }
  return chosen;
}

/**
 * Apply a single placement response, returning a NEW placement state with the
 * ability re-estimated via an Elo update.
 *
 * During placement the ITEM difficulty is treated as fixed (we are estimating
 * the learner, not calibrating the bank), so only `theta` moves. The learner
 * step decays with the number of responses already recorded.
 *
 * @param {PlacementState} state Current state.
 * @param {PlacementItem} item The administered item (must carry id + delta).
 * @param {number} outcome Observed result X in [0, 1].
 * @param {object} [opts] Forwarded to {@link stepSize}.
 * @returns {PlacementState} A new frozen state.
 * @throws {RangeError} On invalid outcome.
 * @throws {Error} If the item id was already used.
 */
export function applyPlacementResponse(state, item, outcome, opts = {}) {
  if (state.usedIds.includes(item.id)) {
    throw new Error(`applyPlacementResponse: item ${item.id} already administered`);
  }
  const priorCount = state.responses.length;
  const { theta: newTheta, thetaDelta } = eloUpdate(
    {
      theta: state.theta,
      delta: item.delta,
      outcome,
      thetaCount: priorCount,
      deltaCount: null, // item difficulty held fixed during placement
    },
    opts,
  );

  const responses = Object.freeze([
    ...state.responses,
    Object.freeze({ id: item.id, delta: item.delta, outcome }),
  ]);
  const usedIds = Object.freeze([...state.usedIds, item.id]);

  return Object.freeze({
    theta: newTheta,
    thetaInitial: state.thetaInitial,
    lastThetaDelta: Math.abs(thetaDelta),
    responses,
    usedIds,
  });
}

/**
 * @typedef {object} PlacementStopDecision
 * @property {boolean} done Whether placement should stop.
 * @property {('cap'|'stable'|'exhausted'|null)} reason Why it stopped (null if not done).
 * @property {number} administered Number of items administered so far.
 */

/**
 * Decide whether the placement diagnostic should stop.
 *
 * Stops when ANY of:
 *   - `cap`: the maximum item count (PLACEMENT_MAX_ITEMS) has been reached;
 *   - `exhausted`: the bank has no more UNUSED items (see the contract below);
 *   - `stable`: at least PLACEMENT_MIN_ITEMS administered AND the last theta
 *     update moved theta by less than PLACEMENT_STABLE_DELTA logits.
 *
 * EXHAUSTION CONTRACT (anti-spin). `selectNextPlacementItem` returns null once the
 * bank has no unused items; if the caller then keeps looping it would spin forever.
 * To make exhaustion DETECTABLE without trusting the caller to track a count, pass
 * the REAL bank as `opts.bank` (the same array handed to `selectNextPlacementItem`):
 * this function then computes unused = bank items whose id is not in `state.usedIds`
 * and stops with reason `exhausted` when none remain. `opts.bankSize` remains
 * supported for callers that only know a total count (exhausted when
 * `administered >= bankSize`); when BOTH are given, `bank` wins (it reflects the real
 * unused set, e.g. if usedIds were seeded). When NEITHER is given, exhaustion cannot
 * be detected here — callers MUST themselves stop when `selectNextPlacementItem`
 * returns null. Passing `opts.bank` is the recommended, spin-proof usage.
 *
 * @param {PlacementState} state Current state.
 * @param {object} [opts]
 * @param {number} [opts.minItems=PLACEMENT_MIN_ITEMS]
 * @param {number} [opts.maxItems=PLACEMENT_MAX_ITEMS]
 * @param {number} [opts.stableDelta=PLACEMENT_STABLE_DELTA]
 * @param {ReadonlyArray<PlacementItem>} [opts.bank] The real candidate bank; if
 *   provided, the `exhausted` stop fires when no unused items remain (preferred).
 * @param {number} [opts.bankSize] Total items available; if provided (and `bank` is
 *   not), enables the `exhausted` stop when all have been administered.
 * @returns {PlacementStopDecision}
 */
export function shouldStopPlacement(state, opts = {}) {
  const minItems = opts.minItems ?? PLACEMENT_MIN_ITEMS;
  const maxItems = opts.maxItems ?? PLACEMENT_MAX_ITEMS;
  const stableDelta = opts.stableDelta ?? PLACEMENT_STABLE_DELTA;
  const administered = state.responses.length;

  if (administered >= maxItems) {
    return { done: true, reason: 'cap', administered };
  }

  // Exhaustion: prefer the real bank (counts genuinely-unused items, robust to
  // seeded usedIds) and fall back to a bare count.
  let exhausted = false;
  if (opts.bank !== undefined) {
    const used = new Set(state.usedIds);
    let unused = 0;
    for (const item of opts.bank) {
      if (!used.has(item.id)) { unused += 1; break; } // one unused is enough
    }
    exhausted = unused === 0;
  } else if (opts.bankSize !== undefined) {
    exhausted = administered >= opts.bankSize;
  }
  if (exhausted) {
    return { done: true, reason: 'exhausted', administered };
  }

  if (administered >= minItems && state.lastThetaDelta < stableDelta) {
    return { done: true, reason: 'stable', administered };
  }
  return { done: false, reason: null, administered };
}

/* ===========================================================================
 * DIFFICULTY SELECTORS (ongoing play, post-placement)
 * ======================================================================== */

/**
 * Target-success-band selector.
 *
 * Picks the UNUSED item whose predicted success probability is nearest
 * `targetSuccess` (default TARGET_SUCCESS = 0.8). Equivalently, it targets a
 * difficulty `δ ≈ θ − TARGET_SUCCESS_OFFSET` (≈ θ − 1.386 for P = 0.8) and
 * chooses the item closest to that target δ — keeping the learner in the
 * ~80–85% success band.
 *
 * @param {number} theta Current learner ability (logits).
 * @param {ReadonlyArray<PlacementItem>} bank Candidate items.
 * @param {object} [opts]
 * @param {number} [opts.targetSuccess=TARGET_SUCCESS] Desired P(correct) in (0,1).
 * @param {Iterable<string|number>} [opts.excludeIds] Item ids to skip.
 * @param {() => number} [opts.rng] Optional RNG to break exact ties at random.
 * @returns {PlacementItem|null} The chosen item, or null if none available.
 * @throws {RangeError} If targetSuccess is not strictly in (0,1).
 */
export function selectTargetBandItem(theta, bank, opts = {}) {
  const targetSuccess = opts.targetSuccess ?? TARGET_SUCCESS;
  const targetDelta = theta - logit(targetSuccess); // logit validates range
  const exclude = new Set(opts.excludeIds ?? []);

  /** @type {PlacementItem[]} */
  let best = [];
  let bestDist = Infinity;
  for (const item of bank) {
    if (exclude.has(item.id)) continue;
    const dist = Math.abs(item.delta - targetDelta);
    if (dist < bestDist - 1e-12) {
      bestDist = dist;
      best = [item];
    } else if (Math.abs(dist - bestDist) <= 1e-12) {
      best.push(item);
    }
  }

  if (best.length === 0) return null;
  if (best.length === 1) return best[0];

  if (opts.rng) {
    const idx = Math.floor(opts.rng() * best.length);
    return best[Math.min(idx, best.length - 1)];
  }
  let chosen = best[0];
  for (const item of best) {
    if (item.delta < chosen.delta - 1e-12) chosen = item;
  }
  return chosen;
}

/**
 * The target difficulty (logits) that yields `targetSuccess` for a learner of
 * ability `theta`: `δ = θ − logit(targetSuccess)`.
 *
 * @param {number} theta Learner ability (logits).
 * @param {number} [targetSuccess=TARGET_SUCCESS] Desired P(correct) in (0,1).
 * @returns {number} The target item difficulty (logits).
 */
export function targetDifficulty(theta, targetSuccess = TARGET_SUCCESS) {
  return theta - logit(targetSuccess);
}

/**
 * @typedef {object} StaircaseState
 * @property {number} level Current difficulty level (logits).
 * @property {number} consecutiveCorrect Run of consecutive correct answers
 *   since the last difficulty change.
 * @property {number} reversals Count of direction reversals (a proxy for
 *   convergence; classic staircase psychophysics stops after N reversals).
 * @property {(1|-1|0)} lastDirection Direction of the last move
 *   (+1 harder, −1 easier, 0 none yet).
 */

/**
 * Create an initial 1-up / 2-down staircase state.
 *
 * @param {object} [opts]
 * @param {number} [opts.level=DEFAULT_DELTA] Starting difficulty (logits).
 * @returns {StaircaseState} A frozen initial state.
 */
export function createStaircase(opts = {}) {
  const level = opts.level ?? DEFAULT_DELTA;
  if (!Number.isFinite(level)) {
    throw new RangeError(`createStaircase: level must be finite, got ${level}`);
  }
  return Object.freeze({
    level,
    consecutiveCorrect: 0,
    reversals: 0,
    lastDirection: 0,
  });
}

/**
 * Advance a 1-up / 2-down transformed staircase (the no-math fallback selector).
 *
 * Rule (converges on the ~70.7% correct point):
 *   - TWO consecutive correct answers → make it HARDER (level += step), reset run.
 *   - ONE wrong answer → make it EASIER (level −= step), reset run.
 *   - A single correct after a wrong simply increments the run; no move yet.
 *
 * This is a PURE function returning a new frozen state.
 *
 * @param {StaircaseState} state Current staircase state.
 * @param {boolean} correct Whether the just-answered item was correct.
 * @param {object} [opts]
 * @param {number} [opts.step=STAIRCASE_STEP] Difficulty step (logits).
 * @returns {StaircaseState} New frozen staircase state.
 */
export function staircaseStep(state, correct, opts = {}) {
  const step = opts.step ?? STAIRCASE_STEP;
  let { level, consecutiveCorrect, reversals, lastDirection } = state;

  /** @type {(1|-1|0)} */
  let move = 0;
  if (correct) {
    consecutiveCorrect += 1;
    if (consecutiveCorrect >= 2) {
      move = 1; // 2-down: two right → harder
      consecutiveCorrect = 0;
    }
  } else {
    move = -1; // 1-up: one wrong → easier
    consecutiveCorrect = 0;
  }

  if (move !== 0) {
    level += move * step;
    if (lastDirection !== 0 && move !== lastDirection) {
      reversals += 1;
    }
    lastDirection = move;
  }

  return Object.freeze({
    level,
    consecutiveCorrect,
    reversals,
    lastDirection,
  });
}
