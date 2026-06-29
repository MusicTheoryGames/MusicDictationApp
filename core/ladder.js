/**
 * @file core/ladder.js
 * @module core/ladder
 *
 * PURE traversal helpers over the curriculum ladder (the prerequisite DAG of
 * levels defined in {@link module:core/curriculum}). No I/O, no DOM, no engine
 * dependency — every function is a deterministic transform of its inputs.
 *
 * The DAG: each {@link Level} lists `prereqs` (parent level ids). An edge
 * parent → child means "parent must be mastered before child is unlocked".
 * The functions here let a guided UI: linearize the DAG into a single ladder,
 * compute which levels a learner has unlocked, find the next level to play,
 * read a level's skills, and test whether a level's prerequisites are met.
 *
 * @see module:core/curriculum for the encoded data + typedefs (Level, Skill,
 *   Profile, …).
 */

import { LEVELS, LEVEL_BY_ID, SKILL_BY_ID } from './curriculum.js';

/**
 * @typedef {import('./curriculum.js').Level}       Level
 * @typedef {import('./curriculum.js').Skill}       Skill
 * @typedef {import('./curriculum.js').Profile}     Profile
 * @typedef {import('./curriculum.js').BuildStatus} BuildStatus
 */

/* ===========================================================================
 * DAG / topological sort
 * =========================================================================*/

/**
 * Detect a cycle in the level prerequisite DAG.
 *
 * @param {Level[]} [levels=LEVELS] Levels to check.
 * @returns {string[]|null} `null` if acyclic; otherwise an array of level ids
 *   forming a cycle (in encounter order), for diagnostics.
 */
export function findCycle(levels = LEVELS) {
  const byId = new Map(levels.map((l) => [l.id, l]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(levels.map((l) => [l.id, WHITE]));
  const stack = [];

  /**
   * @param {string} id
   * @returns {string[]|null}
   */
  function visit(id) {
    color.set(id, GRAY);
    stack.push(id);
    const node = byId.get(id);
    for (const p of (node ? node.prereqs : [])) {
      if (!byId.has(p)) continue; // dangling prereqs are a separate concern
      const c = color.get(p);
      if (c === GRAY) {
        // Found a back-edge → cycle. Slice the stack from p to here, + p again.
        const from = stack.indexOf(p);
        return stack.slice(from).concat(p);
      }
      if (c === WHITE) {
        const found = visit(p);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, BLACK);
    return null;
  }

  for (const l of levels) {
    if (color.get(l.id) === WHITE) {
      const found = visit(l.id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * True iff the level prerequisite DAG is acyclic.
 * @param {Level[]} [levels=LEVELS]
 * @returns {boolean}
 */
export function isAcyclic(levels = LEVELS) {
  return findCycle(levels) === null;
}

/**
 * Topologically sort the level DAG into the single linear guided ladder.
 *
 * Uses Kahn's algorithm with a DETERMINISTIC tie-break: among the levels whose
 * prerequisites are all already placed, the one with the lowest Hall chapter
 * number goes next. This makes the linearization both (a) a valid topological
 * order of the prerequisite DAG and (b) faithful to HALL_CURRICULUM.md's
 * chapter progression.
 *
 * @param {Level[]} [levels=LEVELS] Levels to sort.
 * @returns {Level[]} The levels in guided ladder order.
 * @throws {Error} If the DAG contains a cycle (sort is undefined).
 */
export function topoSort(levels = LEVELS) {
  const byId = new Map(levels.map((l) => [l.id, l]));
  /** @type {Map<string, number>} remaining unsatisfied prereqs per level */
  const indeg = new Map();
  /** @type {Map<string, string[]>} parent id → child ids that depend on it */
  const children = new Map(levels.map((l) => [l.id, []]));

  for (const l of levels) {
    const realPrereqs = l.prereqs.filter((p) => byId.has(p));
    indeg.set(l.id, realPrereqs.length);
    for (const p of realPrereqs) children.get(p).push(l.id);
  }

  const cmp = (a, b) => byId.get(a).hallChapter - byId.get(b).hallChapter;
  /** @type {string[]} levels with all prereqs satisfied, lowest chapter first */
  let ready = levels.filter((l) => indeg.get(l.id) === 0).map((l) => l.id);

  /** @type {Level[]} */
  const order = [];
  while (ready.length) {
    ready.sort(cmp);
    const id = ready.shift();
    order.push(byId.get(id));
    for (const c of children.get(id)) {
      indeg.set(c, indeg.get(c) - 1);
      if (indeg.get(c) === 0) ready.push(c);
    }
  }

  if (order.length !== levels.length) {
    const placed = new Set(order.map((l) => l.id));
    const cyc = levels.filter((l) => !placed.has(l.id)).map((l) => l.id);
    throw new Error('topoSort: cycle detected, could not place: ' + cyc.join(', '));
  }
  return order;
}

/* ===========================================================================
 * Profile-driven traversal
 * =========================================================================*/

/**
 * Whether every prerequisite of a level has been mastered in the profile.
 * Vacuously true for a level with no prereqs.
 *
 * @param {string}  levelId Level id to test.
 * @param {Profile} profile Learner profile (`masteredLevels`).
 * @returns {boolean}
 * @throws {Error} If `levelId` is unknown.
 */
export function prereqsSatisfied(levelId, profile) {
  const level = LEVEL_BY_ID.get(levelId);
  if (!level) throw new Error('prereqsSatisfied: unknown levelId ' + levelId);
  const mastered = new Set((profile && profile.masteredLevels) || []);
  return level.prereqs.every((p) => mastered.has(p));
}

/**
 * The set of levels the learner has UNLOCKED: every level that is either
 * already mastered, or whose prerequisites are all mastered (i.e. playable
 * now). Returned in guided ladder (topo) order.
 *
 * @param {Profile} profile Learner profile (`masteredLevels`).
 * @param {Level[]} [levels=LEVELS]
 * @returns {Level[]} Unlocked levels, in ladder order.
 */
export function unlockedLevels(profile, levels = LEVELS) {
  const mastered = new Set((profile && profile.masteredLevels) || []);
  return topoSort(levels).filter(
    (l) => mastered.has(l.id) || l.prereqs.every((p) => mastered.has(p))
  );
}

/**
 * The next level the learner should play: the first level in guided ladder
 * order that is unlocked (prereqs satisfied) but NOT yet mastered.
 *
 * @param {Profile} profile Learner profile (`masteredLevels`).
 * @param {Level[]} [levels=LEVELS]
 * @returns {Level|null} The next level, or `null` if all unlocked levels are
 *   mastered (ladder complete, or blocked behind unmet prereqs).
 */
export function nextLevel(profile, levels = LEVELS) {
  const mastered = new Set((profile && profile.masteredLevels) || []);
  for (const l of topoSort(levels)) {
    if (!mastered.has(l.id) && l.prereqs.every((p) => mastered.has(p))) return l;
  }
  return null;
}

/* ===========================================================================
 * Level / skill lookups
 * =========================================================================*/

/**
 * The full cumulative skill ids in play at a level (`Level.allSkills`).
 *
 * @param {string} levelId Level id.
 * @returns {string[]} Skill ids (cumulative within the beat-unit family).
 * @throws {Error} If `levelId` is unknown.
 */
export function skillsForLevel(levelId) {
  const level = LEVEL_BY_ID.get(levelId);
  if (!level) throw new Error('skillsForLevel: unknown levelId ' + levelId);
  return level.allSkills.slice();
}

/**
 * The resolved {@link Skill} objects in play at a level (in `allSkills` order).
 *
 * @param {string} levelId Level id.
 * @returns {Skill[]}
 * @throws {Error} If `levelId` is unknown.
 */
export function resolvedSkillsForLevel(levelId) {
  return skillsForLevel(levelId).map((id) => SKILL_BY_ID.get(id));
}

/**
 * The generatable figure-bank IDs a level can draw from (`Level.figures` =
 * `allSkills` minus non-figure concept skills).
 *
 * @param {string} levelId Level id.
 * @returns {string[]}
 * @throws {Error} If `levelId` is unknown.
 */
export function figuresForLevel(levelId) {
  const level = LEVEL_BY_ID.get(levelId);
  if (!level) throw new Error('figuresForLevel: unknown levelId ' + levelId);
  return level.figures.slice();
}

/* ===========================================================================
 * FORM-AWARE ladders — ONE level set, TWO gameplay forms, matched 1:1
 *
 * HARD REQUIREMENT: the dictation and tapping ladders are MATCHED ONE-TO-ONE —
 * the SAME number of levels (one per Hall chapter, all 31), the SAME order, hand
 * in hand. There is a SINGLE level set; each level carries BOTH a `dictation`
 * form and a `tapping` form (see Level.forms). The two ladders therefore differ
 * ONLY by which form's data the front-end surfaces, never by their membership or
 * order.
 *
 * - DICTATION form — hear a line, NOTATE it. Always single-voice (voices:1). For
 *   the inherently two-voice chapters (13,23,24,25,30) the dictation form is the
 *   single-line COMPOSITE / resultant rhythm (still voices:1, no two-voice
 *   engine).
 * - TAPPING form — PERFORM the rhythm, graded on tap timing. Single-voice for
 *   the 26 single-voice chapters; TWO voices (voices:2, one per hand) for the
 *   five polyrhythm chapters.
 *
 * Both ladders are the topological sort of the WHOLE level DAG (Hall-chapter
 * order) — identical sequences. `ladderForMode(...)` returns the same 31 levels
 * for either mode by construction.
 * =========================================================================*/

/**
 * The guided ladder (topo-sorted, Hall-chapter order) for a gameplay mode. By
 * the 1:1 requirement, BOTH modes return the SAME level set in the SAME order
 * (all 31 levels) — they differ only by which `Level.forms` entry the caller
 * reads. Use {@link formForLevel} to pull the form's per-mode data (voices, …).
 *
 * The two modes reference the SAME `Level`/`Skill` objects — nothing is
 * duplicated; only the gameplay framing differs.
 *
 * @param {'dictation'|'tapping'} mode
 * @param {Level[]} [levels=LEVELS]
 * @returns {Level[]} The full matched ladder (all levels) in guided order.
 * @throws {Error} If `mode` is unknown.
 */
export function ladderForMode(mode, levels = LEVELS) {
  if (mode !== 'dictation' && mode !== 'tapping') {
    throw new Error('ladderForMode: unknown mode ' + mode);
  }
  // Both ladders ARE the same whole-DAG topo order (matched 1:1). `mode` is
  // accepted for call-site clarity / symmetry and validated above.
  return topoSort(levels);
}

/**
 * The per-form data for a level in a given gameplay mode (`Level.forms[mode]`).
 * The single place the dictation vs tapping ladders actually differ.
 *
 * @param {string} levelId Level id.
 * @param {'dictation'|'tapping'} mode
 * @returns {import('./curriculum.js').LevelForm} The form (e.g. `{voices}`).
 * @throws {Error} If `levelId` or `mode` is unknown.
 */
export function formForLevel(levelId, mode) {
  const level = LEVEL_BY_ID.get(levelId);
  if (!level) throw new Error('formForLevel: unknown levelId ' + levelId);
  if (mode !== 'dictation' && mode !== 'tapping') {
    throw new Error('formForLevel: unknown mode ' + mode);
  }
  return level.forms[mode];
}

/**
 * The tapping ladder's two sub-tracks, split by the tapping FORM's voice count:
 *
 * - `singleLine` — the 26 chapters whose tapping form is single-voice
 *   (`forms.tapping.voices === 1`): perform the same single line, tapped.
 * - `doubleLine` — the five two-voice polyrhythm/duet chapters
 *   (`forms.tapping.voices === 2`): ch13, 23, 24, 25, 30.
 *
 * Concatenated, these are a partition of the SAME 31-level ladder — this helper
 * only groups the tapping form by hand-count for the tapping UI; it does NOT
 * change the matched ladder's membership or order.
 *
 * @param {Level[]} [levels=LEVELS]
 * @returns {{singleLine: Level[], doubleLine: Level[]}}
 */
export function tappingTracks(levels = LEVELS) {
  const singleLine = topoSort(levels.filter((l) => l.forms.tapping.voices === 1));
  const doubleLine = topoSort(levels.filter((l) => l.forms.tapping.voices === 2));
  return { singleLine, doubleLine };
}

/**
 * Both mode ladders at once, keyed by mode. By the 1:1 requirement these are the
 * SAME level set in the same order. Convenience over {@link ladderForMode}.
 * @param {Level[]} [levels=LEVELS]
 * @returns {{dictation: Level[], tapping: Level[]}}
 */
export function laddersByMode(levels = LEVELS) {
  return {
    dictation: ladderForMode('dictation', levels),
    tapping: ladderForMode('tapping', levels)
  };
}

/**
 * All levels filtered by buildability status (`'ready'`, `'needs-assets'`,
 * `'needs-engine'`), in guided ladder order.
 * @param {import('./curriculum.js').BuildStatus} status
 * @param {Level[]} [levels=LEVELS]
 * @returns {Level[]}
 */
export function levelsByBuildStatus(status, levels = LEVELS) {
  return topoSort(levels).filter((l) => l.buildStatus === status);
}
