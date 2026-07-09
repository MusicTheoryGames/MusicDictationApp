/**
 * @file core/mastery.js
 * @module core/mastery
 *
 * MASTERY ENGINE — per-(profile, skill) weighted-Leitner mastery meter.
 *
 * PURE, framework-agnostic ES module following Functional Core / Imperative Shell:
 *   - NO I/O, NO DOM, NO Firebase, NO timers, NO randomness.
 *   - Every function takes all data as parameters and returns new data.
 *   - `now` (epoch milliseconds) is INJECTED into every function that does a time
 *     calculation; the module never reads the wall clock itself.
 *   - All returned state is a fresh object (callers may freeze / persist it freely);
 *     inputs are never mutated.
 *
 * It implements the model from `VISION.md §9` §B and
 * `research/LEVEL_SYSTEM_RESEARCH.md`:
 *   - per-item score `s` clamped 0..100; correct +20, wrong -30;
 *   - levels Attempted / Familiar / Proficient / Mastered;
 *   - a Mastered gate (recent-accuracy + score floor + multi-session spacing);
 *   - time decay by a level-dependent half-life, with demotion when `s` drops below
 *     a level floor;
 *   - ramp-in of new items (gated on enough Familiar items, capped per session);
 *   - a level-advance gate predicate (coverage + cumulative capstone).
 *
 * State is keyed externally by a `skillId` / `levelId` string; this module operates
 * on the value objects and leaves the keying to the caller (so it composes with
 * sibling modules that own the map).
 */

/* ============================================================================
 * TUNABLE CONSTANTS — every threshold lives here so the model is tuned in ONE place.
 * ========================================================================== */

/** Lowest possible per-item score. @type {number} */
export const SCORE_MIN = 0;
/** Highest possible per-item score. @type {number} */
export const SCORE_MAX = 100;
/** Score awarded for a correct response (added then clamped). @type {number} */
export const CORRECT_DELTA = 20;
/** Score removed for a wrong response (subtracted then clamped). @type {number} */
export const WRONG_DELTA = 30;

/** Mastery levels, ordered weakest → strongest. @enum {string} */
export const LEVELS = Object.freeze({
  ATTEMPTED: 'attempted',
  FAMILIAR: 'familiar',
  PROFICIENT: 'proficient',
  MASTERED: 'mastered',
});

/**
 * Ordered list of levels (index === rank). Exported so callers can compare ranks
 * and so the level math has a single source of truth.
 * @type {ReadonlyArray<string>}
 */
export const LEVEL_ORDER = Object.freeze([
  LEVELS.ATTEMPTED,
  LEVELS.FAMILIAR,
  LEVELS.PROFICIENT,
  LEVELS.MASTERED,
]);

/**
 * Inclusive score floor for each level. A score `s` is *eligible* for the highest
 * level whose floor it meets (Mastered additionally requires the Mastered gate).
 *   Attempted  < 50
 *   Familiar   50 .. 79
 *   Proficient 80 .. 94
 *   Mastered   >= 95
 * @type {Readonly<Record<string, number>>}
 */
export const LEVEL_FLOOR = Object.freeze({
  [LEVELS.ATTEMPTED]: 0,
  [LEVELS.FAMILIAR]: 50,
  [LEVELS.PROFICIENT]: 80,
  [LEVELS.MASTERED]: 95,
});

/* ---- Mastered gate ---- */

/** Size of the rolling recent-results window inspected by the Mastered gate. @type {number} */
export const MASTERED_WINDOW = 5;
/** Minimum correct answers within the last {@link MASTERED_WINDOW} to satisfy the gate. @type {number} */
export const MASTERED_MIN_CORRECT = 4;
/** Minimum per-item score required for Mastered. @type {number} */
export const MASTERED_SCORE_FLOOR = LEVEL_FLOOR[LEVELS.MASTERED]; // 95
/** Distinct sessions the item must have been seen in to be Mastered. @type {number} */
export const MASTERED_MIN_SESSIONS = 2;
/** Minimum spacing between the two qualifying sessions. @type {number} (ms) */
export const MASTERED_MIN_SESSION_SPACING_MS = 12 * 60 * 60 * 1000; // 12 hours

/* ---- Time decay ---- */

/** One day in milliseconds — the unit for half-lives below. @type {number} */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Decay half-life (in days) by current level. Stronger mastery decays slower.
 * `s ← s · 2^(−Δt / H)` where H is the half-life for the item's *current* level.
 * @type {Readonly<Record<string, number>>}
 */
export const HALF_LIFE_DAYS = Object.freeze({
  [LEVELS.ATTEMPTED]: 7,
  [LEVELS.FAMILIAR]: 7,
  [LEVELS.PROFICIENT]: 14,
  [LEVELS.MASTERED]: 30,
});

/* ---- Ramp-in ---- */

/** How many items must reach Familiar+ before brand-new items are introduced. @type {number} */
export const RAMP_IN_FAMILIAR_THRESHOLD = 3;
/** Minimum new items allowed per session once ramp-in is open. @type {number} */
export const NEW_PER_SESSION_MIN = 5;
/** Maximum new items allowed per session. @type {number} */
export const NEW_PER_SESSION_MAX = 10;

/* ---- Level-advance gate ---- */

/** Fraction of a level's items that must be Proficient+ to advance. @type {number} */
export const ADVANCE_COVERAGE = 0.8;
/** Minimum capstone score (0..1) to advance. @type {number} */
export const ADVANCE_CAPSTONE_PASS = 0.8;

/* ============================================================================
 * SMALL PURE HELPERS
 * ========================================================================== */

/**
 * Clamp a number into the closed score range [SCORE_MIN, SCORE_MAX].
 * @param {number} value
 * @returns {number}
 */
export function clampScore(value) {
  // Guard non-finite input: NaN/Infinity must NOT silently pass through (a NaN score
  // would compare false against every floor and masquerade as Attempted). Reject loudly.
  if (!Number.isFinite(value)) {
    throw new RangeError('clampScore requires a finite number, got: ' + value);
  }
  if (value < SCORE_MIN) return SCORE_MIN;
  if (value > SCORE_MAX) return SCORE_MAX;
  return value;
}

/**
 * Rank (0..3) of a level string within {@link LEVEL_ORDER}.
 * @param {string} level
 * @returns {number} index, or -1 if unknown.
 */
export function levelRank(level) {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * The strongest level whose score *floor* is met by `s`, IGNORING the Mastered gate.
 * This is the "score-implied" level: it is what {@link levelFor} returns for every
 * band except that Mastered is only reachable via the full gate (see {@link levelFor}).
 * @param {number} s clamped score 0..100
 * @returns {string} one of {@link LEVELS}
 */
export function scoreBand(s) {
  if (s >= LEVEL_FLOOR[LEVELS.MASTERED]) return LEVELS.MASTERED;
  if (s >= LEVEL_FLOOR[LEVELS.PROFICIENT]) return LEVELS.PROFICIENT;
  if (s >= LEVEL_FLOOR[LEVELS.FAMILIAR]) return LEVELS.FAMILIAR;
  return LEVELS.ATTEMPTED;
}

/* ============================================================================
 * ITEM STATE
 * ========================================================================== */

/**
 * Per-(profile, skill) item state. Treat as an immutable value object: every
 * mutating helper returns a NEW object.
 *
 * @typedef {Object} ItemState
 * @property {number} score                 Current score, clamped 0..100.
 * @property {string} level                 Current level (one of {@link LEVELS}).
 * @property {boolean[]} recent             Recent results, oldest→newest, length ≤ {@link MASTERED_WINDOW};
 *                                          `true` = correct, `false` = wrong.
 * @property {number[]} sessions            Distinct session start times (epoch ms) the item was seen in,
 *                                          ascending, deduplicated. Used by the Mastered gate spacing test.
 * @property {number|null} lastSeen         Epoch ms of the most recent answer, or null if never answered.
 * @property {string|null} idleLevel        The level captured at the instant the item went idle (i.e. the
 *                                          level it held immediately after its last real answer, the moment
 *                                          `lastSeen` was set). The decay half-life for the WHOLE idle span
 *                                          is chosen from THIS level, never from the item's current
 *                                          (possibly already-decayed) level. This is what makes decay
 *                                          PATH-INDEPENDENT — see {@link applyDecay}. Null if never answered.
 * @property {number} attempts              Total answers recorded (correct + wrong).
 * @property {number} corrects              Total correct answers recorded.
 */

/**
 * Create a fresh, never-attempted item state.
 * @returns {ItemState}
 */
export function createItemState() {
  return {
    score: 0,
    level: LEVELS.ATTEMPTED,
    recent: [],
    sessions: [],
    lastSeen: null,
    idleLevel: null,
    attempts: 0,
    corrects: 0,
  };
}

/**
 * Deep-ish clone of an item state (arrays copied, scalars by value). Internal.
 * @param {ItemState} item
 * @returns {ItemState}
 */
function cloneItem(item) {
  return {
    score: item.score,
    level: item.level,
    recent: item.recent.slice(),
    sessions: item.sessions.slice(),
    lastSeen: item.lastSeen,
    // Back-compat: items persisted before idleLevel existed fall back to their
    // recorded `level` (the pre-fix behaviour for the FIRST decay span — still
    // path-independent from here on once idleLevel is set).
    idleLevel: item.idleLevel ?? null,
    attempts: item.attempts,
    corrects: item.corrects,
  };
}

/**
 * Insert a session start time into the ascending, de-duplicated session list.
 * Two answers in the SAME session (same `sessionStart`) count once. Internal.
 * @param {number[]} sessions ascending, deduped
 * @param {number} sessionStart epoch ms
 * @returns {number[]} a new ascending, deduped array
 */
function withSession(sessions, sessionStart) {
  if (sessions.indexOf(sessionStart) !== -1) return sessions.slice();
  const next = sessions.slice();
  next.push(sessionStart);
  next.sort((a, b) => a - b);
  return next;
}

/* ============================================================================
 * MASTERED GATE
 * ========================================================================== */

/**
 * Do the recorded sessions contain two that are at least
 * {@link MASTERED_MIN_SESSION_SPACING_MS} apart (and ≥ {@link MASTERED_MIN_SESSIONS}
 * distinct sessions overall)? Pure; reads only the passed array.
 *
 * @param {number[]} sessions ascending session start times (epoch ms)
 * @returns {boolean}
 */
export function hasSpacedSessions(sessions) {
  if (!Array.isArray(sessions) || sessions.length < MASTERED_MIN_SESSIONS) return false;
  // Robust to UNSORTED input: the widest spacing is max − min, regardless of order.
  // (Internally `sessions` is kept ascending, but this is a public helper a caller may
  // hand an unsorted array, so we never rely on positional first/last.)
  let min = Infinity;
  let max = -Infinity;
  let finiteCount = 0;
  for (const t of sessions) {
    if (!Number.isFinite(t)) continue; // ignore non-finite stamps rather than poisoning min/max
    finiteCount += 1;
    if (t < min) min = t;
    if (t > max) max = t;
  }
  if (finiteCount < MASTERED_MIN_SESSIONS) return false;
  return (max - min) >= MASTERED_MIN_SESSION_SPACING_MS;
}

/**
 * Count correct answers in a recent-results window.
 * @param {boolean[]} recent
 * @returns {number}
 */
export function countRecentCorrect(recent) {
  let n = 0;
  for (let i = 0; i < recent.length; i++) if (recent[i]) n++;
  return n;
}

/**
 * Is the full Mastered gate satisfied for this item?
 *   1. ≥ {@link MASTERED_MIN_CORRECT} of the last {@link MASTERED_WINDOW} correct
 *      (requires the window to actually hold {@link MASTERED_WINDOW} results), AND
 *   2. score ≥ {@link MASTERED_SCORE_FLOOR}, AND
 *   3. seen across ≥ {@link MASTERED_MIN_SESSIONS} sessions ≥ 12h apart.
 *
 * @param {ItemState} item
 * @returns {boolean}
 */
export function meetsMasteredGate(item) {
  if (item.score < MASTERED_SCORE_FLOOR) return false;
  // Need a full window of recent results before the 4/5 test is meaningful.
  if (item.recent.length < MASTERED_WINDOW) return false;
  const window = item.recent.slice(-MASTERED_WINDOW);
  if (countRecentCorrect(window) < MASTERED_MIN_CORRECT) return false;
  if (!hasSpacedSessions(item.sessions)) return false;
  return true;
}

/**
 * Compute the level for an item from its score AND the Mastered gate.
 * Mastered requires BOTH s ≥ 95 AND the full gate; otherwise the level is the
 * strongest *score band* at or below Proficient.
 *
 * @param {ItemState} item
 * @returns {string} one of {@link LEVELS}
 */
export function levelFor(item) {
  const band = scoreBand(item.score);
  if (band === LEVELS.MASTERED) {
    return meetsMasteredGate(item) ? LEVELS.MASTERED : LEVELS.PROFICIENT;
  }
  return band;
}

/* ============================================================================
 * TIME DECAY + DEMOTION
 * ========================================================================== */

/**
 * Pure decay of a score given an elapsed time and a half-life.
 *   s' = s · 2^(−Δt / H)
 * Negative or zero elapsed → no decay (returns the input score). Half-life must be
 * > 0. The result is clamped to the score range.
 *
 * @param {number} score current score
 * @param {number} elapsedMs Δt in milliseconds (clamped to ≥ 0)
 * @param {number} halfLifeDays H in days (must be > 0)
 * @returns {number} decayed score, clamped
 */
export function decayScore(score, elapsedMs, halfLifeDays) {
  if (!(halfLifeDays > 0)) {
    throw new RangeError('halfLifeDays must be > 0');
  }
  // A non-finite elapsed (NaN/Infinity) is a caller bug, not "no decay" — reject it
  // rather than silently returning the input score.
  if (!Number.isFinite(elapsedMs)) {
    throw new RangeError('decayScore requires a finite elapsedMs, got: ' + elapsedMs);
  }
  if (!(elapsedMs > 0)) return clampScore(score);
  const halfLifeMs = halfLifeDays * MS_PER_DAY;
  const factor = Math.pow(2, -elapsedMs / halfLifeMs);
  return clampScore(score * factor);
}

/**
 * Apply time decay to an item AS OF `now`, then re-derive its level, DEMOTING when
 * the decayed score drops below the item's current level floor. Promotion never
 * happens here (decay can only weaken). The Mastered→lower transition naturally
 * falls out: a decayed score < 95 demotes a Mastered item to its score band.
 *
 * HALF-LIFE SOURCE — PATH-INDEPENDENCE INVARIANT.
 *   The half-life for the ENTIRE idle span is chosen from `item.idleLevel` — the
 *   level the item held at the instant it went idle (the moment its last real answer
 *   set `lastSeen`) — NOT from the item's current (possibly already-decayed) level.
 *   This guarantees decay is PATH-INDEPENDENT: decaying 20 days in one shot equals
 *   decaying it in two 10-day steps with the intermediate view persisted, because the
 *   half-life never changes mid-span. (The old code read the *current* level, so a
 *   persisted intermediate decay could demote the level and thereby switch to a
 *   shorter half-life for the remainder, corrupting the score — that is the bug this
 *   fixes.) `applyDecay` deliberately does NOT touch `idleLevel`; only `recordAnswer`
 *   re-anchors it (to the level held right after the new answer).
 *
 * API INVARIANT: `idleLevel`/`lastSeen` form the decay anchor. A caller MAY persist
 *   the result of `applyDecay`/`viewItemAsOf` (e.g. to display a decayed dashboard or
 *   cache it) WITHOUT corrupting future decay: re-decaying the persisted view to a
 *   later `now` still uses the original `idleLevel`, so the score lands exactly where a
 *   single-shot decay from the last real answer would. `recordAnswer` always decays
 *   from the true `lastSeen` regardless.
 *
 * Idempotent within a single instant: re-running with the same `now` and an
 * unchanged `lastSeen` produces the same state (because neither `lastSeen` nor
 * `idleLevel` is advanced by decay — only real answers advance them).
 *
 * @param {ItemState} item
 * @param {number} now epoch ms
 * @returns {ItemState} new item state (decayed score + possibly demoted level)
 */
export function applyDecay(item, now) {
  const next = cloneItem(item);
  if (next.lastSeen == null) {
    // Never answered: nothing to decay, but keep level consistent with score.
    next.level = levelFor(next);
    return next;
  }
  const elapsed = now - next.lastSeen;
  // Anchor the half-life on the level captured when the item went idle, so the rate
  // is constant across the whole span (path-independent). Fall back to the current
  // level for items persisted before `idleLevel` existed, then to Familiar.
  const anchorLevel = next.idleLevel ?? next.level;
  const halfLife = HALF_LIFE_DAYS[anchorLevel] ?? HALF_LIFE_DAYS[LEVELS.FAMILIAR];
  next.score = decayScore(next.score, elapsed, halfLife);

  // Demote: the new level is the strongest the (decayed) state now supports. Because
  // decay only lowers the score, levelFor() can only keep or reduce the level. We do
  // NOT re-grant Mastered purely from decay (score went down), and a decayed score
  // below 95 strips Mastered automatically via levelFor(). NOTE: `idleLevel` is left
  // untouched on purpose — see the path-independence invariant above.
  next.level = levelFor(next);
  return next;
}

/* ============================================================================
 * RECORDING AN ANSWER
 * ========================================================================== */

/**
 * Record one graded answer against an item and return the updated state.
 *
 * Order of operations (all pure):
 *   1. Decay the item up to `now` (so spacing/score reflect elapsed idle time) —
 *      this also applies any demotion that idling caused.
 *   2. Apply the score delta: correct → +{@link CORRECT_DELTA}, wrong → −{@link WRONG_DELTA},
 *      clamped to 0..100.
 *   3. Push the boolean result into the rolling `recent` window (cap {@link MASTERED_WINDOW}).
 *   4. Record the session start (deduped) and advance `lastSeen` to `now`.
 *   5. Re-derive the level via {@link levelFor} (which enforces the Mastered gate).
 *
 * @param {ItemState} item current state (not mutated)
 * @param {boolean} correct whether the answer was correct
 * @param {Object} ctx
 * @param {number} ctx.now epoch ms of this answer
 * @param {number} ctx.sessionStart epoch ms identifying the current session (stable
 *   for all answers within one session; used by the Mastered spacing test)
 * @returns {ItemState} new item state
 */
export function recordAnswer(item, correct, ctx) {
  if (!ctx || typeof ctx.now !== 'number' || typeof ctx.sessionStart !== 'number') {
    throw new TypeError('recordAnswer requires ctx.now and ctx.sessionStart (epoch ms numbers)');
  }
  if (!Number.isFinite(ctx.now) || !Number.isFinite(ctx.sessionStart)) {
    throw new TypeError('recordAnswer requires finite ctx.now and ctx.sessionStart');
  }
  // Validate `correct` is a real boolean rather than silently coercing a truthy/falsy
  // value (a stray '' or 0 would otherwise be read as "wrong" and a 'x' as "correct").
  if (typeof correct !== 'boolean') {
    throw new TypeError('recordAnswer requires `correct` to be a boolean');
  }
  const { now, sessionStart } = ctx;

  // 1. Decay first so the score we add to is current.
  const decayed = applyDecay(item, now);

  // 2. Apply delta.
  const delta = correct ? CORRECT_DELTA : -WRONG_DELTA;
  decayed.score = clampScore(decayed.score + delta);

  // 3. Rolling recent window.
  decayed.recent = decayed.recent.slice();
  decayed.recent.push(!!correct);
  if (decayed.recent.length > MASTERED_WINDOW) {
    decayed.recent = decayed.recent.slice(-MASTERED_WINDOW);
  }

  // 4. Sessions + bookkeeping.
  decayed.sessions = withSession(decayed.sessions, sessionStart);
  decayed.lastSeen = now;
  decayed.attempts += 1;
  if (correct) decayed.corrects += 1;

  // 5. Re-derive level (enforces Mastered gate; may promote now that score rose).
  decayed.level = levelFor(decayed);
  // 6. Re-anchor the decay clock: this answer is the new "last real answer", so the
  //    item goes idle AT this level. Future decay uses THIS level's half-life for the
  //    whole next idle span (see applyDecay's path-independence invariant).
  decayed.idleLevel = decayed.level;
  return decayed;
}

/* ============================================================================
 * SKILL-LEVEL VIEWS (across all items of one skill/level)
 * ========================================================================== */

/**
 * A read-only snapshot of how an item currently stands AS OF `now` (decay applied,
 * but no answer recorded). Useful for dashboards and gates without persisting.
 *
 * @param {ItemState} item
 * @param {number} now epoch ms
 * @returns {ItemState} decayed copy
 */
export function viewItemAsOf(item, now) {
  return applyDecay(item, now);
}

/**
 * Count, across a collection of items, how many are at or above a given level rank,
 * evaluated AS OF `now` (decay applied first).
 *
 * @param {Iterable<ItemState>} items
 * @param {string} minLevel inclusive lower bound (one of {@link LEVELS})
 * @param {number} now epoch ms
 * @returns {{ total: number, atOrAbove: number, fraction: number }}
 */
export function levelCoverage(items, minLevel, now) {
  const minRank = levelRank(minLevel);
  if (minRank < 0) throw new RangeError('unknown minLevel: ' + minLevel);
  let total = 0;
  let atOrAbove = 0;
  for (const item of items) {
    total += 1;
    const view = applyDecay(item, now);
    if (levelRank(view.level) >= minRank) atOrAbove += 1;
  }
  const fraction = total === 0 ? 0 : atOrAbove / total;
  return { total, atOrAbove, fraction };
}

/* ============================================================================
 * RAMP-IN (introducing new items)
 * ========================================================================== */

/**
 * Decide how many brand-new items may be introduced this session, and whether
 * introduction is open at all.
 *
 * Rules (from the research):
 *   - New items are introduced only AFTER at least {@link RAMP_IN_FAMILIAR_THRESHOLD}
 *     of the already-active items have reached Familiar+ (evaluated AS OF `now`,
 *     decay applied) — UNLESS there are no active items yet (cold start), in which
 *     case introduction is open so the learner can begin.
 *   - Per session, introduce between {@link NEW_PER_SESSION_MIN} and
 *     {@link NEW_PER_SESSION_MAX}, never more than the number actually available,
 *     and never more than `remainingCapacity` (e.g. session budget already partly used).
 *
 * @param {Object} args
 * @param {Iterable<ItemState>} args.activeItems items already in the active pool
 * @param {number} args.availableNewCount how many not-yet-introduced items exist
 * @param {number} args.now epoch ms
 * @param {number} [args.remainingCapacity=NEW_PER_SESSION_MAX] cap already reduced by
 *   any new items introduced earlier this same session
 * @returns {{ open: boolean, familiarCount: number, activeCount: number, allow: number }}
 *   `open` = whether ramp-in is permitted; `allow` = number of new items to introduce now.
 */
export function planRampIn(args) {
  const {
    activeItems,
    availableNewCount,
    now,
    remainingCapacity = NEW_PER_SESSION_MAX,
  } = args;

  let activeCount = 0;
  let familiarCount = 0;
  const familiarRank = levelRank(LEVELS.FAMILIAR);
  for (const item of activeItems) {
    activeCount += 1;
    const view = applyDecay(item, now);
    if (levelRank(view.level) >= familiarRank) familiarCount += 1;
  }

  // Cold start: no active items yet → allow introduction so the learner can begin.
  const open = activeCount === 0 || familiarCount >= RAMP_IN_FAMILIAR_THRESHOLD;

  if (!open) {
    return { open, familiarCount, activeCount, allow: 0 };
  }

  const avail = Math.max(0, availableNewCount | 0);
  // Integer-floor remainingCapacity: you can't introduce a fractional item, and a
  // non-finite cap collapses to 0 (introduce nothing) rather than NaN-poisoning the math.
  const safeCap = Number.isFinite(remainingCapacity) ? Math.floor(remainingCapacity) : 0;
  const cap = Math.max(0, Math.min(NEW_PER_SESSION_MAX, safeCap));
  // The MIN is a target/floor, but we can never exceed availability or the remaining cap.
  const target = Math.min(NEW_PER_SESSION_MIN, avail, cap);
  // Allow up to the cap and availability; aim for at least `target`.
  const allow = Math.min(cap, avail);
  return {
    open,
    familiarCount,
    activeCount,
    // `allow` is the upper bound the caller may introduce; `target` is the floor it
    // should hit when supply allows. We surface the upper bound as `allow` and expose
    // the floor for callers that want a softer pace.
    allow,
    target,
  };
}

/* ============================================================================
 * LEVEL-ADVANCE GATE
 * ========================================================================== */

/**
 * Pure predicate: may the learner advance OUT of a curriculum level?
 *
 * Two conditions, both required:
 *   1. Coverage: ≥ {@link ADVANCE_COVERAGE} (80%) of the level's items are
 *      Proficient+ AS OF `now` (decay applied).
 *   2. Capstone: a cumulative capstone result ≥ {@link ADVANCE_CAPSTONE_PASS} (0.8).
 *
 * The capstone result is INJECTED (this module never runs an assessment); pass the
 * fraction-correct (0..1) the capstone produced.
 *
 * @param {Object} args
 * @param {Iterable<ItemState>} args.levelItems all items belonging to the level
 * @param {number} args.capstoneScore cumulative capstone fraction correct, 0..1
 * @param {number} args.now epoch ms
 * @returns {{ canAdvance: boolean, coverage: number, coverageMet: boolean,
 *            capstoneMet: boolean, total: number, proficientPlus: number }}
 */
export function canAdvanceLevel(args) {
  const { levelItems, capstoneScore, now } = args;
  const cov = levelCoverage(levelItems, LEVELS.PROFICIENT, now);
  const coverageMet = cov.total > 0 && cov.fraction >= ADVANCE_COVERAGE;
  const capstoneMet = typeof capstoneScore === 'number' && capstoneScore >= ADVANCE_CAPSTONE_PASS;
  return {
    canAdvance: coverageMet && capstoneMet,
    coverage: cov.fraction,
    coverageMet,
    capstoneMet,
    total: cov.total,
    proficientPlus: cov.atOrAbove,
  };
}

/* ============================================================================
 * Default export — the public interface as one namespace object, for callers that
 * prefer `import mastery from './mastery.js'`. Named exports remain the primary API.
 * ========================================================================== */

export default Object.freeze({
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
  // item lifecycle
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
});
