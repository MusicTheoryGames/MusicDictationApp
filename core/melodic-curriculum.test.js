/**
 * @file core/melodic-curriculum.test.js
 * Unit tests for the MELODIC curriculum ladder (M0–M20).
 * Run: `node --test core/melodic-curriculum.test.js`
 *
 * Verifies the melodic DATA (melodic-curriculum.js) against:
 *   - MELODIC_ENGINE_SPEC.md §5 (the level-object shape + exerciseMode enum)
 *   - MELODIC_CURRICULUM.md §5 (the LOCKED decisions: degree-jumps not interval
 *     names, minor at M6, notation at M9, soft-gate)
 *   - core/curriculum.js (the rhythm ladder — hallRhythmRef / softGateHall MUST
 *     be real ids there; cross-checked by import)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { LEVEL_BY_ID } from './curriculum.js';
import { generateMelody } from './melodic.js';
import {
  MELODIC_LEVELS,
  melodicLadder, melodicLevel, melodicCount
} from './melodic-curriculum.js';

/* ---------------------------------------------------------------------------
 * Contract constants (MELODIC_ENGINE_SPEC.md §5)
 * ------------------------------------------------------------------------- */

/** The exact exerciseMode enum from the spec (incl. the ladder-expansion rungs
 *  M1.5 memory-span, M8.5 protonotation — MELODIC_LADDER_EXPANSION_PLAN). */
const EXERCISE_MODES = new Set([
  'tonic-contour', 'rhythm-first', 'labeling', 'recognition',
  'missing-note', 'error-detect', 'notation-entry', 'two-part',
  'memory-span', 'protonotation', 'live-home-minor'
]);

/** The exact degree-jump enum (NOT interval names) the generator's spec.leaps uses. */
const DEGREE_JUMPS = new Set(['step', '3rd', 'P4', 'P5', 'P8', '6th', '7th', 'tritone']);

/** The exact mode enum. */
const MODES = new Set([
  'major', 'natural-minor', 'harmonic-minor', 'melodic-minor',
  'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian',
]);

/** The exact layer enum. */
const LAYERS = new Set(['0a', '0b', 'R', 'D', 'N']);

/** The exact buildStatus enum for the melodic ladder. */
const BUILD_STATUS = new Set(['ready', 'ready-ish', 'needs-build', 'needs-engine']);

/** The expected ordered ladder: M0..M26 (RCM-aligned + extension) PLUS the two
 *  owner-approved expansion rungs spliced in by mIndex (M1.5 between M1/M2, M8.5
 *  between M8/M9 — MELODIC_LADDER_EXPANSION_PLAN, fractional mIndex so nothing
 *  renumbers). */
const EXPECTED_ORDER = (() => {
  const base = Array.from({ length: 27 }, (_, i) => 'm' + i);
  base.splice(base.indexOf('m2'), 0, 'm1_5');
  base.splice(base.indexOf('m6'), 0, 'm5_5'); // Find home — minor (aural on-ramp to M6)
  base.splice(base.indexOf('m9'), 0, 'm8_5');
  return base;
})();

/* ===========================================================================
 * SECTION 1 — ids, ordering, accessors
 * =========================================================================*/

test('accessors: melodicLadder() is the ordered array; count is 30 (27 + 3 expansion rungs)', () => {
  assert.equal(melodicLadder(), MELODIC_LEVELS);
  assert.equal(melodicCount(), 30);
  assert.equal(MELODIC_LEVELS.length, 30);
});

test('ids: unique, ordered (expansion rungs spliced by mIndex), and id === "m"+mIndex', () => {
  const ids = MELODIC_LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate melodic level ids');
  assert.deepEqual(ids, EXPECTED_ORDER, 'ladder is not in expected order');
  // mIndex strictly ascending (fractional rungs sit between their neighbours).
  for (let i = 1; i < MELODIC_LEVELS.length; i++) {
    assert.ok(MELODIC_LEVELS[i].mIndex > MELODIC_LEVELS[i - 1].mIndex,
      `${MELODIC_LEVELS[i].id} mIndex not ascending`);
  }
  // id === "m" + mIndex, with '.' written as '_' for the fractional rungs.
  MELODIC_LEVELS.forEach((l) => {
    assert.equal(l.id, 'm' + String(l.mIndex).replace('.', '_'), `${l.id} id/mIndex mismatch`);
  });
});

test('accessors: melodicLevel(id) resolves every id and returns undefined for unknown', () => {
  for (const l of MELODIC_LEVELS) {
    assert.strictEqual(melodicLevel(l.id), l, `melodicLevel(${l.id}) mismatch`);
  }
  assert.equal(melodicLevel('m99'), undefined);
  assert.equal(melodicLevel('nope'), undefined);
});

/* ===========================================================================
 * SECTION 2 — the level object matches MELODIC_ENGINE_SPEC.md §5 shape
 * =========================================================================*/

test('shape: every level carries every required §5 field with the right type', () => {
  for (const l of MELODIC_LEVELS) {
    assert.equal(typeof l.id, 'string', `${l.id} id`);
    assert.equal(typeof l.mIndex, 'number', `${l.id} mIndex`);
    assert.equal(typeof l.title, 'string', `${l.id} title`);
    assert.ok(l.title.length > 0, `${l.id} empty title`);
    assert.ok(Array.isArray(l.layers) && l.layers.length > 0, `${l.id} layers`);
    assert.ok(l.pitch && typeof l.pitch === 'object', `${l.id} pitch`);
    assert.equal(typeof l.key, 'string', `${l.id} key`);
    assert.equal(typeof l.mode, 'string', `${l.id} mode`);
    assert.equal(typeof l.hallRhythmRef, 'string', `${l.id} hallRhythmRef`);
    assert.equal(typeof l.exerciseMode, 'string', `${l.id} exerciseMode`);
    assert.equal(typeof l.masteryGoal, 'string', `${l.id} masteryGoal`);
    assert.ok(l.masteryGoal.length > 0, `${l.id} empty masteryGoal`);
    assert.ok(Array.isArray(l.prereqs), `${l.id} prereqs`);
    assert.equal(typeof l.softGateHall, 'string', `${l.id} softGateHall`);
    assert.equal(typeof l.buildStatus, 'string', `${l.id} buildStatus`);
  }
});

test('shape: pitch is {degrees[], leaps[], range{lowMidi,highMidi}, startOn}', () => {
  for (const l of MELODIC_LEVELS) {
    const p = l.pitch;
    assert.ok(Array.isArray(p.degrees), `${l.id} pitch.degrees`);
    assert.ok(p.degrees.every((d) => Number.isInteger(d) && d >= 1 && d <= 7),
      `${l.id} pitch.degrees must be diatonic 1..7: ${p.degrees}`);
    assert.ok(Array.isArray(p.leaps), `${l.id} pitch.leaps`);
    assert.ok(p.range && typeof p.range.lowMidi === 'number' && typeof p.range.highMidi === 'number',
      `${l.id} pitch.range`);
    assert.ok(p.range.lowMidi <= p.range.highMidi, `${l.id} range low > high`);
    assert.ok(p.startOn === 'tonic' || p.startOn === 'any', `${l.id} pitch.startOn ${p.startOn}`);
  }
});

test('enums: layers, mode, buildStatus are all in their spec vocabularies', () => {
  for (const l of MELODIC_LEVELS) {
    for (const lay of l.layers) assert.ok(LAYERS.has(lay), `${l.id} bad layer ${lay}`);
    assert.ok(MODES.has(l.mode), `${l.id} bad mode ${l.mode}`);
    assert.ok(BUILD_STATUS.has(l.buildStatus), `${l.id} bad buildStatus ${l.buildStatus}`);
  }
});

test('enum: every exerciseMode is in the MELODIC_ENGINE_SPEC.md §5 enum', () => {
  for (const l of MELODIC_LEVELS) {
    assert.ok(EXERCISE_MODES.has(l.exerciseMode), `${l.id} bad exerciseMode ${l.exerciseMode}`);
  }
});

test('LOCKED: leaps use the degree-jump enum, never interval NAMES', () => {
  // §5 decision: degree-jumps are the assessed skill; interval names are not a
  // required task. Guard against someone slipping "major 3rd"/"M3"/"perfect fifth" in.
  for (const l of MELODIC_LEVELS) {
    for (const j of l.pitch.leaps) {
      assert.ok(DEGREE_JUMPS.has(j), `${l.id} leap "${j}" is not a degree-jump enum member`);
    }
  }
});

/* ===========================================================================
 * SECTION 3 — rhythm lockstep: hallRhythmRef & softGateHall are REAL ids
 * =========================================================================*/

test('lockstep: every hallRhythmRef is a real core/curriculum.js level id', () => {
  for (const l of MELODIC_LEVELS) {
    assert.ok(LEVEL_BY_ID.has(l.hallRhythmRef),
      `${l.id} hallRhythmRef "${l.hallRhythmRef}" is not a real Hall level id`);
  }
});

test('lockstep: every softGateHall is a real core/curriculum.js level id', () => {
  for (const l of MELODIC_LEVELS) {
    assert.ok(LEVEL_BY_ID.has(l.softGateHall),
      `${l.id} softGateHall "${l.softGateHall}" is not a real Hall level id`);
  }
});

/* ===========================================================================
 * SECTION 4 — prereqs form a valid DAG (no cycles, all refs exist)
 * =========================================================================*/

test('DAG: every prereq references an existing melodic level (no dangling ids)', () => {
  const ids = new Set(MELODIC_LEVELS.map((l) => l.id));
  for (const l of MELODIC_LEVELS) {
    for (const p of l.prereqs) {
      assert.ok(ids.has(p), `${l.id} has dangling prereq ${p}`);
    }
  }
});

test('DAG: no level lists itself; prereqs are unique within a level', () => {
  for (const l of MELODIC_LEVELS) {
    assert.ok(!l.prereqs.includes(l.id), `${l.id} depends on itself`);
    assert.equal(new Set(l.prereqs).size, l.prereqs.length, `${l.id} has duplicate prereqs`);
  }
});

test('DAG: exactly one root (m0) with no prerequisites', () => {
  const roots = MELODIC_LEVELS.filter((l) => l.prereqs.length === 0);
  assert.deepEqual(roots.map((l) => l.id), ['m0']);
});

test('DAG: the prerequisite graph is acyclic', () => {
  // DFS 3-colour cycle detection over the melodic DAG.
  const byId = new Map(MELODIC_LEVELS.map((l) => [l.id, l]));
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(MELODIC_LEVELS.map((l) => [l.id, WHITE]));

  function visit(id) {
    color.set(id, GRAY);
    for (const p of byId.get(id).prereqs) {
      const c = color.get(p);
      if (c === GRAY) return true;           // back-edge → cycle
      if (c === WHITE && visit(p)) return true;
    }
    color.set(id, BLACK);
    return false;
  }
  let cyclic = false;
  for (const l of MELODIC_LEVELS) {
    if (color.get(l.id) === WHITE && visit(l.id)) { cyclic = true; break; }
  }
  assert.equal(cyclic, false, 'melodic prereq DAG contains a cycle');
});

test('DAG: every prereq precedes its level in ladder order (valid topological order)', () => {
  const pos = new Map(MELODIC_LEVELS.map((l, i) => [l.id, i]));
  for (const l of MELODIC_LEVELS) {
    for (const p of l.prereqs) {
      assert.ok(pos.get(p) < pos.get(l.id),
        `prereq ${p} must come before ${l.id} (got ${pos.get(p)} !< ${pos.get(l.id)})`);
    }
  }
});

/* ===========================================================================
 * SECTION 5 — monotonic difficulty (degrees / leaps only WIDEN)
 *
 * The pitch-teaching spine begins at M3 ("First 3 notes get numbers") — the
 * first level where DEGREES are the taught/assessed axis. Over M3..M20 the
 * allowed degrees and leaps must only ever WIDEN (superset chain, non-decreasing
 * count), so difficulty climbs and never regresses.
 *
 * The M0–M2 aural/rhythm pre-foundation is DELIBERATELY excluded from this
 * invariant: pitch is not the difficulty axis there. M0 plays single test tones
 * (no leaps); M1 assesses contour only; M2 is the rhythm-first hinge with pitch
 * held CONSTANT (monotone `degrees:[1]`) so 100% of attention is on rhythm
 * (MELODIC_CURRICULUM.md §3). Requiring those to "widen" would contradict the
 * spec's own design, so the pitch monotonicity is asserted from M3 up.
 * =========================================================================*/

/**
 * The pitch-teaching spine — M3..M20 (mIndex 3..20), in order. Scoped to the
 * RCM-aligned span deliberately: M21-M26 (the beyond-RCM extension) explores
 * DIFFERENT pitch collections (church modes, pentatonic, symmetric scales) rather
 * than monotonically widening the same diatonic degree/leap set — e.g. M24's
 * pentatonic slice is intentionally NARROWER than M23's full 7 degrees. Widening
 * is a property of the RCM ladder's design, not a universal law of the whole ladder.
 */
const PITCH_SPINE = MELODIC_LEVELS.filter((l) => l.mIndex >= 3 && l.mIndex <= 20);

test('monotonic: allowed degrees only widen across the M3+ pitch spine (superset chain)', () => {
  // The set of allowed degrees at spine level i must be a superset of i-1's.
  for (let i = 1; i < PITCH_SPINE.length; i++) {
    const prev = new Set(PITCH_SPINE[i - 1].pitch.degrees);
    const cur = new Set(PITCH_SPINE[i].pitch.degrees);
    for (const d of prev) {
      assert.ok(cur.has(d),
        `${PITCH_SPINE[i].id} dropped degree ${d} present in ${PITCH_SPINE[i - 1].id}`);
    }
  }
});

test('monotonic: allowed leaps only widen across the M3+ pitch spine (superset chain)', () => {
  for (let i = 1; i < PITCH_SPINE.length; i++) {
    const prev = new Set(PITCH_SPINE[i - 1].pitch.leaps);
    const cur = new Set(PITCH_SPINE[i].pitch.leaps);
    for (const j of prev) {
      assert.ok(cur.has(j),
        `${PITCH_SPINE[i].id} dropped leap "${j}" present in ${PITCH_SPINE[i - 1].id}`);
    }
  }
});

test('monotonic: degree/leap breadth is non-decreasing in count across the M3+ pitch spine', () => {
  for (let i = 1; i < PITCH_SPINE.length; i++) {
    assert.ok(PITCH_SPINE[i].pitch.degrees.length >= PITCH_SPINE[i - 1].pitch.degrees.length,
      `${PITCH_SPINE[i].id} degree count shrank`);
    assert.ok(PITCH_SPINE[i].pitch.leaps.length >= PITCH_SPINE[i - 1].pitch.leaps.length,
      `${PITCH_SPINE[i].id} leap count shrank`);
  }
});

/* ===========================================================================
 * SECTION 6 — the LOCKED §5 decisions are encoded
 * =========================================================================*/

test('LOCKED: minor arrives at M6 (no minor mode before it — except the M5.5 aural on-ramp)', () => {
  for (const l of MELODIC_LEVELS) {
    // m5_5 "Find home — minor" is the DELIBERATE exception: an aural-only (layers
    // ['0a'], live-home-minor) orientation to minor keys placed just before M6, the
    // first level to TEACH minor pitch material. It carries a minor mode by design.
    if (l.mIndex < 6 && l.id !== 'm5_5') {
      assert.equal(l.mode, 'major', `${l.id} (< M6) must be major, got ${l.mode}`);
    }
  }
  const m6 = melodicLevel('m6');
  assert.notEqual(m6.mode, 'major', 'M6 should introduce a minor mode');
  assert.ok(m6.mode.includes('minor'), 'M6 mode should be a minor form');
});

test('LOCKED: notation-entry (staff PRODUCTION) does not appear before M9', () => {
  for (const l of MELODIC_LEVELS) {
    if (l.exerciseMode === 'notation-entry') {
      assert.ok(l.mIndex >= 9, `${l.id} uses notation-entry before M9`);
    }
  }
  // and M9 is the first level to use it.
  const first = MELODIC_LEVELS.find((l) => l.exerciseMode === 'notation-entry');
  assert.equal(first.id, 'm9', 'the first notation-entry level should be m9');
});

test('LOCKED: the aural pre-foundation (M0–M1) uses tonic-contour and adds no staff', () => {
  for (const id of ['m0', 'm1']) {
    const l = melodicLevel(id);
    assert.equal(l.exerciseMode, 'tonic-contour', `${id} should be tonic-contour`);
    assert.ok(!l.layers.includes('N'), `${id} should not touch the notation layer`);
  }
});

test('LOCKED: M2 is the rhythm-first hinge; the M2–M8 span is staff-free (no notation-entry)', () => {
  assert.equal(melodicLevel('m2').exerciseMode, 'rhythm-first');
  for (let i = 2; i <= 8; i++) {
    assert.notEqual(melodicLevel('m' + i).exerciseMode, 'notation-entry',
      `M${i} must not produce staff notation (withheld until M9)`);
  }
});

/* ===========================================================================
 * SECTION 7 — `keys` (the full key/mode SET a level allows) and `meter`/`meters`.
 *
 * MELODIC_CURRICULUM.md's own per-level "Key / mode" column already specified
 * multi-key intent ("C, then G major", "C, G, F maj / A, D min", "maj/min ≤2
 * ♯/♭"...) that the ORIGINAL data model never encoded (single `key`/`mode`
 * only). This section verifies the fix: `keys` is the full allowed set, and
 * the legacy `key`/`mode` fields stay the PRIMARY pair (keys[0]) so nothing
 * that reads them directly regresses.
 * =========================================================================*/

test('keys: every level has a non-empty keys[] array, primary pair first', () => {
  for (const l of MELODIC_LEVELS) {
    assert.ok(Array.isArray(l.keys) && l.keys.length > 0, `${l.id} keys[] non-empty`);
    assert.deepEqual(l.keys[0], { key: l.key, mode: l.mode },
      `${l.id} keys[0] must equal the primary {key,mode}`);
  }
});

test('keys: every key/mode pair is well-formed and mode is a real mode', () => {
  const MODE_SET = MODES;
  for (const l of MELODIC_LEVELS) {
    for (const kp of l.keys) {
      assert.equal(typeof kp.key, 'string', `${l.id} key pair .key is a string`);
      assert.ok(/^[A-G](#|b)?$/.test(kp.key), `${l.id} key "${kp.key}" is a valid tonic letter[+acc]`);
      assert.ok(MODE_SET.has(kp.mode), `${l.id} key pair mode "${kp.mode}" is valid`);
    }
  }
});

test('keys: no duplicate key/mode pairs within a level', () => {
  for (const l of MELODIC_LEVELS) {
    const sigs = l.keys.map((kp) => `${kp.key}:${kp.mode}`);
    assert.equal(new Set(sigs).size, sigs.length, `${l.id} has duplicate key/mode pairs`);
  }
});

test('keys: multi-key levels genuinely widen key variety as the ladder climbs (M9 has >=2 keys)', () => {
  // Spot-check the exact multi-key research intent from MELODIC_CURRICULUM.md wasn't lost:
  // M4 introduces a 2nd key, M9 has 5 pairs (C,G,F maj / A,D min).
  assert.ok(melodicLevel('m4').keys.length >= 2, 'm4 should offer >=2 keys (C, then G)');
  assert.ok(melodicLevel('m9').keys.length >= 5, 'm9 should offer the full C/G/F maj + A/D min set');
  assert.ok(melodicLevel('m18').keys.length > melodicLevel('m10').keys.length,
    'key breadth should widen from M10 (<=1 acc) to M18 (<=3 acc)');
});

test('meter/meters: every level has a meter and meters[] includes it', () => {
  for (const l of MELODIC_LEVELS) {
    assert.equal(typeof l.meter, 'string', `${l.id} meter`);
    assert.ok(/^\d+\/\d+$/.test(l.meter), `${l.id} meter "${l.meter}" is a valid time signature`);
    assert.ok(Array.isArray(l.meters) && l.meters.length > 0, `${l.id} meters[] non-empty`);
    assert.ok(l.meters.includes(l.meter), `${l.id} meters[] must include the primary meter`);
  }
});

test('meter: M15 is the first level to introduce 6/8 (compound meter)', () => {
  for (const l of MELODIC_LEVELS) {
    if (l.mIndex < 15) {
      assert.ok(!l.meters.includes('6/8'), `${l.id} (< M15) should not use 6/8 yet`);
    }
  }
  assert.ok(melodicLevel('m15').meters.includes('6/8'), 'm15 should introduce 6/8');
});

/* ===========================================================================
 * SECTION 8 — generator lockstep: every level whose buildStatus claims the
 * generator is actually ready must ACTUALLY generate through core/melodic.js's
 * generateMelody(spec) without throwing, for every key/mode pair it lists — not
 * just "the data shape looks right." This is what would have caught the
 * m18/m19/m20 'tritone'-leap bug (a value the real engine's LEAPS enum rejects)
 * before it ever reached the shell.
 * =========================================================================*/

test('generator lockstep: every "ready"/"ready-ish" level actually generates for every key it lists', () => {
  for (const l of MELODIC_LEVELS) {
    if (l.buildStatus !== 'ready' && l.buildStatus !== 'ready-ish') continue;
    if (!l.pitch.degrees.length) continue; // M0/M2: no pitch spine, generator not exercised this way
    const genLeaps = l.pitch.leaps.length ? l.pitch.leaps : ['step', '3rd'];
    for (const kp of l.keys) {
      const m = generateMelody({
        key: kp.key, mode: kp.mode, degrees: l.pitch.degrees, leaps: genLeaps,
        range: l.pitch.range, meter: l.meter, hallRhythmRef: l.hallRhythmRef,
        lengthBars: 2, startOn: l.pitch.startOn || 'tonic', seed: 1,
        chromaticPassingTone: l.chromaticPassingTone, modalMixture: l.modalMixture,
        secondaryDominant: l.secondaryDominant,
      });
      assert.ok(m.notes.length > 0, `${l.id} (${kp.key} ${kp.mode}) generated no notes`);
      // Every note stays inside the level's own range for EVERY key it offers —
      // and a multi-degree level must never degenerate to a monotone (the failure
      // mode when a key's octave-4 tonic sits outside the level's range window and
      // the start fails to snap; found live on m4 + G major, which then produced
      // ZERO recognition distractors).
      for (const note of m.notes) {
        assert.ok(note.midi >= l.pitch.range.lowMidi && note.midi <= l.pitch.range.highMidi,
          `${l.id} (${kp.key} ${kp.mode}) note ${note.pitch} outside the level range`);
      }
      if (l.pitch.degrees.length > 1) {
        assert.ok(new Set(m.notes.map((note) => note.midi)).size > 1,
          `${l.id} (${kp.key} ${kp.mode}) generated a monotone melody`);
      }
    }
  }
});
