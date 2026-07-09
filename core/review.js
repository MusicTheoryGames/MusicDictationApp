/**
 * core/review.js
 * ----------------------------------------------------------------------------
 * Spaced-repetition review scheduler — the "Functional Core" of the app's
 * long-term-retention engine.
 *
 * Design constraints (deliberate, do not loosen):
 *   - PURE & FRAMEWORK-AGNOSTIC. No I/O, no DOM, no Firebase, no `Date.now()`
 *     read internally. The current time is ALWAYS injected as `now` (epoch ms).
 *     This makes every function deterministic and trivially unit-testable, and
 *     lets the imperative shell (Firebase / localStorage / UI) own all effects.
 *   - GAME-AGNOSTIC. The only key is a universal `skillId` string. Rhythm,
 *     melodic, interval, chord… every game contributes skills into ONE shared
 *     queue, and the scheduler interleaves them transparently. A skillId is an
 *     opaque string to this module; meaning lives in the curriculum map.
 *   - IMMUTABLE. `applyResult` returns a NEW entry; it never mutates its input.
 *     `composeSession` never mutates the state it reads.
 *
 * Model: an EXPANDING-INTERVAL LEITNER system.
 *   - Skills live in numbered "boxes" 1..N. Higher box = better retention =
 *     longer interval until the next review.
 *   - A correct answer PROMOTES the skill one box and schedules the next review
 *     after that box's (longer) interval.
 *   - A wrong answer is a "lapse": it DEMOTES the skill toward box 1 and
 *     reschedules sooner (shorter interval), so struggling skills resurface fast.
 *   - A skill ENTERS the queue at box 1 the moment it is first mastered in its
 *     game; from then on the scheduler owns its review cadence.
 *
 * See VISION.md §2 ("per-student mastery tracking + spaced
 * repetition") and research/HALL_CURRICULUM.md (skillId ↔ curriculum chapters/tiers).
 *
 * @module core/review
 */

// ============================================================================
// Tunable constants (named exports — these are the knobs the product tunes).
// ============================================================================

/**
 * Expanding review intervals, in MILLISECONDS, indexed by box number.
 *
 * `BOX_INTERVALS_MS[b]` is the delay added after a *correct* review of a skill
 * that has been promoted INTO box `b`. Index 0 is a placeholder (boxes are
 * 1-based); box 1 is the shortest interval and the last box is the ceiling.
 *
 * The named day-pattern is 1d → 3d → 7d → 16d → 35d → 75d (each step ~2.1–2.3×
 * the previous), an expanding schedule consistent with a target retention of
 * ~0.85: long enough to push spacing, short enough that forgetting stays rare.
 *
 * @type {readonly number[]}
 */
export const BOX_INTERVALS_MS = Object.freeze([
  0,                  // box 0 — unused placeholder (boxes are 1-based)
  1 * 24 * 60 * 60 * 1000,  // box 1 →  1 day
  3 * 24 * 60 * 60 * 1000,  // box 2 →  3 days
  7 * 24 * 60 * 60 * 1000,  // box 3 →  7 days
  16 * 24 * 60 * 60 * 1000, // box 4 → 16 days
  35 * 24 * 60 * 60 * 1000, // box 5 → 35 days
  75 * 24 * 60 * 60 * 1000, // box 6 → 75 days  (ceiling)
]);

/**
 * The lowest valid box. A skill never demotes below this.
 * @type {number}
 */
export const MIN_BOX = 1;

/**
 * The highest box. Equal to the index of the last interval. Once a skill is
 * here, a correct answer keeps it here (interval no longer expands) and simply
 * reschedules at the ceiling interval.
 * @type {number}
 */
export const MAX_BOX = BOX_INTERVALS_MS.length - 1; // 6

/**
 * On a wrong answer, how many boxes to demote. 1 = gentle (drop one box),
 * which preserves some of the spacing the learner had earned while still
 * pulling the skill back toward frequent review. Demotion is clamped to
 * MIN_BOX.
 * @type {number}
 */
export const DEMOTE_STEP = 1;

/**
 * Target long-term retention probability the interval schedule is tuned for.
 * Not used in arithmetic here (the intervals above encode it), but exported so
 * analytics / future SM-2-style tuning can reference the design target.
 * @type {number}
 */
export const TARGET_RETENTION = 0.85;

/**
 * Session composition target: fraction of a session that should be DUE REVIEW
 * items (the rest is NEW material). 0.75 ⇒ aim for ~75% review / ~25% new,
 * i.e. inside the 70–80% review band. See SESSION_NEW_RATIO_BAND for the
 * tolerated range.
 * @type {number}
 */
export const SESSION_REVIEW_RATIO = 0.75;

/**
 * Tolerated band for the NEW fraction of a session: [0.20, 0.30]
 * (i.e. review fraction in [0.70, 0.80]). The composer aims for the target but
 * clamps the new count so the resulting ratio stays in this band whenever the
 * supply of due + new items allows it.
 *
 * STEADY-STATE TARGET, NOT A HARD CEILING (deliberate design — do not "fix"):
 *   This 70–80% review / 20–30% new band is the target for a HEALTHY, well-stocked
 *   review queue. It is NOT enforced as a hard ≤30%-new ceiling at all supply levels:
 *     - In the SPARSE regime (review supply below the 70% target — e.g. early/low-debt
 *       sessions, or day one with an empty queue), the session legitimately CANNOT be
 *       70% review. There, the composer takes ALL available due review and fills the
 *       rest with new material UP TO the absolute {@link MAX_NEW_PER_SESSION} cap. The
 *       new ratio can exceed 30% (it can reach ~33% at ~10–11 due, or 100% on day one)
 *       — this is correct: cognitive load is governed by the MAX_NEW cap, not the ratio.
 *     - A hard ≤30% ceiling everywhere would force a mostly-review session even at 3 due
 *       (needlessly slowing early learning) and break the intentional sparse ⇒ all-new
 *       behavior. So the band's lower 20%-new edge is advisory; the band's UPPER edge is
 *       only applied when review supply is rich enough to honor it (see compose logic).
 * @type {readonly [number, number]}
 */
export const SESSION_NEW_RATIO_BAND = Object.freeze([0.20, 0.30]);

/**
 * Hard ceiling on how many NEW skills may be introduced in a single session,
 * regardless of ratios. Prevents overwhelming the learner when the review
 * queue is empty (e.g. day one) and there are dozens of available new skills.
 * @type {number}
 */
export const MAX_NEW_PER_SESSION = 5;

/**
 * Default total target size of a composed session (number of items). Callers
 * may override per-call.
 * @type {number}
 */
export const DEFAULT_SESSION_SIZE = 20;

// ============================================================================
// Type definitions (JSDoc — this is the public interface contract).
// ============================================================================

/**
 * A single skill's scheduling record. Immutable in spirit: scheduler functions
 * return new entries rather than mutating.
 *
 * @typedef {Object} ReviewEntry
 * @property {string} skillId   Universal, game-agnostic skill key.
 * @property {number} box       Leitner box, MIN_BOX..MAX_BOX.
 * @property {number} dueAt     Epoch-ms timestamp the skill becomes due.
 * @property {(boolean|null)} lastResult  Result of the most recent review:
 *                              true = correct, false = wrong, null = never
 *                              reviewed since entering the queue.
 * @property {number} lapses    Lifetime count of wrong answers (monotonic).
 */

/**
 * @typedef {Object} ReviewState
 * @property {ReviewEntry[]} entries  The full review queue (all skills the
 *                              learner has ever mastered, in any game).
 */

/**
 * @typedef {Object} SessionPlan
 * @property {ReviewEntry[]} review  Due-review entries chosen for the session,
 *                              soonest-due first.
 * @property {string[]} new          New skillIds chosen for the session.
 * @property {number} reviewRatio    review.length / total (NaN if total === 0).
 * @property {number} newRatio       new.length / total (NaN if total === 0).
 * @property {number} total          review.length + new.length.
 */

// ============================================================================
// Internal helpers (not exported).
// ============================================================================

/**
 * Clamp `box` into the valid [MIN_BOX, MAX_BOX] range.
 * @param {number} box
 * @returns {number}
 */
function clampBox(box) {
  if (box < MIN_BOX) return MIN_BOX;
  if (box > MAX_BOX) return MAX_BOX;
  return box;
}

/**
 * Interval (ms) to schedule when a skill lands in `box`.
 * @param {number} box  Already-clamped box.
 * @returns {number}
 */
function intervalForBox(box) {
  return BOX_INTERVALS_MS[clampBox(box)];
}

// ============================================================================
// Public API.
// ============================================================================

/**
 * Create the initial review entry for a skill the moment it is first mastered.
 * The skill enters at MIN_BOX and is due immediately (so the very first review
 * happens in the next session — it does NOT skip ahead by box-1's interval).
 *
 * @param {string} skillId  Universal skill key.
 * @param {number} now      Current time (epoch ms).
 * @returns {ReviewEntry}   A fresh box-1 entry, due now.
 */
export function createEntry(skillId, now) {
  if (typeof skillId !== 'string' || skillId.length === 0) {
    throw new TypeError('createEntry: skillId must be a non-empty string');
  }
  if (!Number.isFinite(now)) {
    throw new TypeError('createEntry: now must be a finite number (epoch ms)');
  }
  return Object.freeze({
    skillId,
    box: MIN_BOX,
    dueAt: now,
    lastResult: null,
    lapses: 0,
  });
}

/**
 * Apply a review result to an entry, returning a NEW (frozen) entry. Never
 * mutates the input.
 *
 *   correct === true  → promote one box (capped at MAX_BOX), expand interval.
 *   correct === false → lapse: demote DEMOTE_STEP boxes (floored at MIN_BOX),
 *                       shorten interval, increment `lapses`.
 *
 * The next due time is `now + intervalForBox(newBox)`, so scheduling is always
 * relative to WHEN the review actually happened (late reviews don't compound).
 *
 * @param {ReviewEntry} entry   The current entry.
 * @param {boolean} correct     Whether the learner answered correctly.
 * @param {number} now          Time the review happened (epoch ms).
 * @returns {ReviewEntry}       New entry with updated box/dueAt/lastResult/lapses.
 */
export function applyResult(entry, correct, now) {
  if (entry == null || typeof entry !== 'object') {
    throw new TypeError('applyResult: entry must be a ReviewEntry object');
  }
  if (typeof correct !== 'boolean') {
    throw new TypeError('applyResult: correct must be a boolean');
  }
  if (!Number.isFinite(now)) {
    throw new TypeError('applyResult: now must be a finite number (epoch ms)');
  }

  const prevBox = clampBox(entry.box);
  const newBox = correct
    ? clampBox(prevBox + 1)
    : clampBox(prevBox - DEMOTE_STEP);

  return Object.freeze({
    skillId: entry.skillId,
    box: newBox,
    dueAt: now + intervalForBox(newBox),
    lastResult: correct,
    lapses: entry.lapses + (correct ? 0 : 1),
  });
}

/**
 * Return the entries that are currently DUE (dueAt <= now), soonest-due first
 * (ties broken by skillId for deterministic ordering). Does not mutate state.
 *
 * @param {ReviewState} state  The review state.
 * @param {number} now         Current time (epoch ms).
 * @returns {ReviewEntry[]}    Due entries, sorted by (dueAt asc, skillId asc).
 */
export function dueItems(state, now) {
  if (state == null || !Array.isArray(state.entries)) {
    throw new TypeError('dueItems: state must be { entries: ReviewEntry[] }');
  }
  if (!Number.isFinite(now)) {
    throw new TypeError('dueItems: now must be a finite number (epoch ms)');
  }
  return state.entries
    .filter((e) => e.dueAt <= now)
    .sort((a, b) => (a.dueAt - b.dueAt) || (a.skillId < b.skillId ? -1 : a.skillId > b.skillId ? 1 : 0));
}

/**
 * Compose a practice session that mixes due-review with new material.
 *
 * Strategy:
 *   1. Pull all currently-due review entries (soonest-due first).
 *   2. Decide how many NEW skills to add. The target is
 *      round((1 - SESSION_REVIEW_RATIO) * sessionSize), then:
 *        - capped at MAX_NEW_PER_SESSION,
 *        - capped at the number of availableNew skills supplied,
 *        - clamped so the resulting NEW fraction stays within
 *          SESSION_NEW_RATIO_BAND *when there is enough review supply to do so*.
 *      Special cases:
 *        - Empty review queue ⇒ session is all-new (still capped). This is the
 *          day-one path: a learner with nothing to review gets up to
 *          MAX_NEW_PER_SESSION new skills.
 *        - No availableNew ⇒ session is all-review.
 *   3. Take review items to fill the rest of `sessionSize`, but never fewer
 *      than the band requires when supply allows.
 *   4. New skills already present in the review queue are filtered out of
 *      availableNew (a skill is "new" only if it has never been mastered).
 *
 * The returned plan reports the achieved ratios so the shell/analytics can log
 * and the tests can assert them.
 *
 * @param {ReviewState} state              The review state.
 * @param {string[]} availableNew          Candidate new skillIds (curriculum
 *                                          unlock order; the composer keeps order).
 * @param {number} now                     Current time (epoch ms).
 * @param {Object} [opts]
 * @param {number} [opts.sessionSize=DEFAULT_SESSION_SIZE]  Target total items.
 * @param {number} [opts.maxNew=MAX_NEW_PER_SESSION]        Override new cap.
 * @returns {SessionPlan}
 */
export function composeSession(state, availableNew, now, opts = {}) {
  if (state == null || !Array.isArray(state.entries)) {
    throw new TypeError('composeSession: state must be { entries: ReviewEntry[] }');
  }
  if (!Array.isArray(availableNew)) {
    throw new TypeError('composeSession: availableNew must be a string[]');
  }
  if (!Number.isFinite(now)) {
    throw new TypeError('composeSession: now must be a finite number (epoch ms)');
  }

  const sessionSize = opts.sessionSize ?? DEFAULT_SESSION_SIZE;
  const maxNew = opts.maxNew ?? MAX_NEW_PER_SESSION;
  if (!Number.isInteger(sessionSize) || sessionSize < 0) {
    throw new TypeError('composeSession: sessionSize must be a non-negative integer');
  }
  if (!Number.isInteger(maxNew) || maxNew < 0) {
    throw new TypeError('composeSession: maxNew must be a non-negative integer');
  }

  // Skills already in the queue can never be "new".
  const knownSkillIds = new Set(state.entries.map((e) => e.skillId));
  // De-dup availableNew while preserving order, and drop already-known skills.
  const seen = new Set();
  const freshNew = [];
  for (const id of availableNew) {
    if (knownSkillIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    freshNew.push(id);
  }

  const dueAll = dueItems(state, now);

  // Desired new count from the target ratio, before supply/cap clamping.
  let newCount = Math.round((1 - SESSION_REVIEW_RATIO) * sessionSize);

  // Apply hard caps: per-session new cap and available supply.
  newCount = Math.min(newCount, maxNew, freshNew.length);

  // How many review slots remain for the target session size.
  let reviewCount = Math.min(dueAll.length, sessionSize - newCount);

  // Enforce the NEW-ratio band's UPPER bound (don't over-introduce new) WHEN we
  // have spare review supply to substitute. If there are still un-included due
  // items (reviewCount < dueAll.length), prefer growing review over exceeding
  // the band: trim new to the band ceiling and refill review.
  //
  // When review supply is the limiter (reviewCount === dueAll.length, i.e. we
  // already took every due item), we ACCEPT a higher new ratio — there is
  // simply not enough to review, so introducing new material is the right call.
  // This is what produces the all-new day-one path and sparse-review sessions.
  //
  // DELIBERATE: the upper band edge is a STEADY-STATE target applied ONLY when there
  // is spare review supply to substitute (the `reviewCount < dueAll.length` guard
  // below). In the sparse regime the new ratio may exceed the band — cognitive load
  // is bounded by MAX_NEW_PER_SESSION, not by the ratio. See SESSION_NEW_RATIO_BAND.
  const [, bandHi] = SESSION_NEW_RATIO_BAND;
  let total = reviewCount + newCount;
  if (total > 0 && reviewCount < dueAll.length) {
    const maxNewByBand = Math.floor(bandHi * total);
    if (newCount > maxNewByBand) {
      newCount = maxNewByBand;
      reviewCount = Math.min(dueAll.length, sessionSize - newCount);
    }
  }

  const review = dueAll.slice(0, reviewCount);
  const chosenNew = freshNew.slice(0, newCount);
  const realizedTotal = review.length + chosenNew.length;

  return Object.freeze({
    review,
    new: chosenNew,
    total: realizedTotal,
    reviewRatio: realizedTotal === 0 ? NaN : review.length / realizedTotal,
    newRatio: realizedTotal === 0 ? NaN : chosenNew.length / realizedTotal,
  });
}
