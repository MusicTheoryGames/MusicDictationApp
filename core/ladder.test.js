/**
 * @file core/ladder.test.js
 * Exhaustive unit tests for the curriculum ladder + traversal helpers.
 * Run: `node --test core/ladder.test.js`
 *
 * These tests verify the curriculum DATA (curriculum.js) and the pure
 * traversal LOGIC (ladder.js) against:
 *   - HALL_CURRICULUM.md  (the Hall chapter → meter/idea progression)
 *   - CURRICULUM_PLAN.md   (the chapter → level wiring spec)
 *   - solo-mode.js         (the canonical figure-bank IDs)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  SKILLS, SKILL_BY_ID, LEVELS, LEVEL_BY_ID
} from './curriculum.js';
import {
  findCycle, isAcyclic, topoSort,
  prereqsSatisfied, unlockedLevels, nextLevel,
  skillsForLevel, resolvedSkillsForLevel, figuresForLevel,
  ladderForMode, formForLevel, tappingTracks, laddersByMode, levelsByBuildStatus
} from './ladder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');

/* ---------------------------------------------------------------------------
 * Helpers: scrape the canonical figure IDs out of solo-mode.js so the tests
 * cross-check the curriculum against the real figure bank (not a hand copy).
 * ------------------------------------------------------------------------- */

/**
 * Every figure id that solo-mode.js references — scraped from the TWO DECLARED
 * figure-id forms ONLY (not "any quoted token", which over-matched CSS classes,
 * labels, console strings, vexflow durations, etc. and made the cross-check toothless):
 *
 *   1. `id: '...'` keys inside the `*_FIGS` object-literal banks
 *      (COMPOUND_FIGS, HALF_FIGS, DOTTEDHALF_FIGS, DOTTED16_FIGS, TUPLET_FIGS).
 *   2. Bare quoted ids inside the cumulative-tier arrays `*_STEPS`
 *      (L_STEPS, CMP_STEPS, HALF_STEPS, DOTTEDHALF_STEPS, DOTTED16_STEPS) — the
 *      simple-quarter `medium` figures are engine-owned and appear ONLY here. We also
 *      include the one `L_STEPS.push([...])` tail that adds the quintuplet/… tier.
 *
 * Scoping the bare-id scrape to the `*_STEPS` array literals means a stray quoted
 * token elsewhere in solo-mode.js can no longer masquerade as a valid figure id.
 */
function soloModeFigureIds() {
  const src = readFileSync(join(REPO, 'solo-mode.js'), 'utf8');
  const ids = new Set();

  // Form 1: `id: 'foo'` figure-object declarations (the *_FIGS banks).
  for (const m of src.matchAll(/\bid:\s*'([^']+)'/g)) ids.add(m[1]);

  // Form 2: quoted ids INSIDE the declared cumulative-tier arrays only. Capture each
  //   `var NAME_STEPS = [ ... ];`  block (and the `L_STEPS.push([ ... ])` tail), then
  //   pull figure-id-shaped quoted tokens from within that block exclusively.
  const FIG_ID = /'([a-z][a-z0-9]*(?:-[a-z0-9]+)*)'/g;
  const collectFrom = (block) => {
    for (const m of block.matchAll(FIG_ID)) ids.add(m[1]);
  };
  // `var XXX_STEPS = [ ... ];` declarations (non-greedy up to the closing `];`).
  for (const m of src.matchAll(/\b[A-Z][A-Z0-9_]*_STEPS\s*=\s*\[([\s\S]*?)\];/g)) {
    collectFrom(m[1]);
  }
  // `L_STEPS.push([ ... ]);` tail tiers (e.g. the quintuplet/sextuplet/septuplet tier).
  for (const m of src.matchAll(/\b[A-Z][A-Z0-9_]*_STEPS\.push\(\[([\s\S]*?)\]\);/g)) {
    collectFrom(m[1]);
  }
  return ids;
}

/** Every Hall chapter — the ladder now encodes the COMPLETE 31-chapter book. */
const ALL_CHAPTERS = Array.from({ length: 31 }, (_, i) => i + 1);

/** The 15 originally-shipped READY chapters (must stay `ready` + unchanged). */
const READY_CHAPTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17];

/** The full 31-chapter Hall-grounded guided order (whole-DAG topo). */
const EXPECTED_ORDER = ALL_CHAPTERS.map((n) => 'ch' + n);

/**
 * The MATCHED ladder: BOTH the dictation and the tapping ladders are this exact
 * 31-level order (one per Hall chapter), hand in hand. They differ only by which
 * form each level surfaces.
 */
const EXPECTED_MATCHED_ORDER = EXPECTED_ORDER;

/** The 26 chapters whose tapping form is single-line (voices:1), in order. */
const EXPECTED_TAP_SINGLELINE_ORDER = [
  'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10', 'ch11',
  'ch12', 'ch14', 'ch15', 'ch16', 'ch17', 'ch18', 'ch19', 'ch20', 'ch21', 'ch22',
  'ch26', 'ch27', 'ch28', 'ch29', 'ch31'
];

/** The 5 inherently two-voice (polyrhythm) chapters, in order. Their tapping
 * form is voices:2; their dictation form is the voices:1 composite. */
const EXPECTED_DOUBLELINE_ORDER = ['ch13', 'ch23', 'ch24', 'ch25', 'ch30'];

/** Expected buildStatus per chapter, from CURRICULUM_PLAN.md §A. */
const EXPECTED_BUILD_STATUS = {
  ch1: 'ready', ch2: 'ready', ch3: 'ready', ch4: 'ready', ch5: 'ready', ch6: 'ready',
  ch7: 'ready', ch8: 'ready', ch9: 'ready', ch10: 'ready', ch11: 'ready', ch12: 'ready',
  ch14: 'ready', ch15: 'ready', ch17: 'ready',
  ch16: 'needs-assets', ch18: 'needs-assets', ch26: 'needs-assets',
  ch13: 'needs-engine', ch19: 'needs-engine', ch20: 'needs-engine', ch21: 'needs-engine',
  ch22: 'needs-engine', ch23: 'needs-engine', ch24: 'needs-engine', ch25: 'needs-engine',
  ch27: 'needs-engine', ch28: 'needs-engine', ch29: 'needs-engine', ch30: 'needs-engine',
  ch31: 'needs-engine'
};

/**
 * Expected per-FORM voice count per chapter, as [dictation.voices,
 * tapping.voices]. The five polyrhythm chapters are voices:1 in the dictation
 * form (the single-line composite) and voices:2 in the tapping form; every other
 * chapter is voices:1 in BOTH forms (asserted via the default below).
 */
const EXPECTED_FORM_VOICES = {
  ch13: [1, 2], ch23: [1, 2], ch24: [1, 2], ch25: [1, 2], ch30: [1, 2]
  // everything else defaults to [1, 1]
};

/* ===========================================================================
 * SECTION 1 — the DAG is well-formed (acyclic, no dangling prereqs)
 * =========================================================================*/

test('DAG: prerequisite graph is acyclic', () => {
  assert.equal(findCycle(), null, 'expected no cycle');
  assert.equal(isAcyclic(), true);
});

test('DAG: every prereq references an existing level (no dangling ids)', () => {
  for (const l of LEVELS) {
    for (const p of l.prereqs) {
      assert.ok(LEVEL_BY_ID.has(p), `level ${l.id} has dangling prereq ${p}`);
    }
  }
});

test('DAG: no level lists itself as a prerequisite', () => {
  for (const l of LEVELS) {
    assert.ok(!l.prereqs.includes(l.id), `${l.id} depends on itself`);
  }
});

test('DAG: prereqs are unique within a level', () => {
  for (const l of LEVELS) {
    assert.equal(new Set(l.prereqs).size, l.prereqs.length, `${l.id} has duplicate prereqs`);
  }
});

test('DAG: exactly one root (ch1) with no prerequisites', () => {
  const roots = LEVELS.filter((l) => l.prereqs.length === 0);
  assert.deepEqual(roots.map((l) => l.id), ['ch1']);
});

/* ===========================================================================
 * SECTION 2 — topological sort == the expected Hall-grounded order
 * =========================================================================*/

test('topoSort: produces the expected Hall-grounded guided order', () => {
  const order = topoSort().map((l) => l.id);
  assert.deepEqual(order, EXPECTED_ORDER);
});

test('topoSort: result is a VALID topological order (every prereq precedes its level)', () => {
  const order = topoSort().map((l) => l.id);
  const pos = new Map(order.map((id, i) => [id, i]));
  for (const l of LEVELS) {
    for (const p of l.prereqs) {
      assert.ok(pos.get(p) < pos.get(l.id),
        `prereq ${p} must come before ${l.id} (got ${pos.get(p)} !< ${pos.get(l.id)})`);
    }
  }
});

test('topoSort: places every level exactly once', () => {
  const order = topoSort();
  assert.equal(order.length, LEVELS.length);
  assert.equal(new Set(order.map((l) => l.id)).size, LEVELS.length);
});

test('topoSort: throws on a cycle', () => {
  const cyclic = [
    { id: 'a', hallChapter: 1, prereqs: ['b'] },
    { id: 'b', hallChapter: 2, prereqs: ['a'] }
  ];
  assert.throws(() => topoSort(/** @type {any} */(cyclic)), /cycle/i);
  assert.notEqual(findCycle(/** @type {any} */(cyclic)), null);
});

/* ===========================================================================
 * SECTION 3 — level shapes match HALL_CURRICULUM.md / CURRICULUM_PLAN.md
 * =========================================================================*/

test('levels: encode the COMPLETE Hall book — all 31 chapters', () => {
  const chapters = LEVELS.map((l) => l.hallChapter).sort((a, b) => a - b);
  assert.deepEqual(chapters, ALL_CHAPTERS);
  assert.equal(LEVELS.length, 31);
});

test('levels: the 15 originally-shipped chapters are all buildStatus "ready"', () => {
  for (const ch of READY_CHAPTERS) {
    assert.equal(LEVEL_BY_ID.get('ch' + ch).buildStatus, 'ready', `ch${ch} should be ready`);
  }
  // and exactly those 15 are ready (no more, no fewer)
  const ready = LEVELS.filter((l) => l.buildStatus === 'ready').map((l) => l.hallChapter).sort((a, b) => a - b);
  assert.deepEqual(ready, READY_CHAPTERS);
});

test('levels: ids are unique and of the form chN matching hallChapter', () => {
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate level ids');
  for (const l of LEVELS) {
    assert.equal(l.id, 'ch' + l.hallChapter, `${l.id} id/chapter mismatch`);
  }
});

/**
 * Expected meter + beat unit per chapter, transcribed from HALL_CURRICULUM.md
 * and CURRICULUM_PLAN.md §A. {ts:[...], beats:[...], kind, beatUnit, prefix}
 */
const EXPECTED_METER = {
  ch1:  { kind: 'simple',   ts: ['2/4'],                beats: [2],        beatUnit: 'quarter',        prefix: 'medium' },
  ch2:  { kind: 'simple',   ts: ['3/4'],                beats: [3],        beatUnit: 'quarter',        prefix: 'medium' },
  ch3:  { kind: 'simple',   ts: ['4/4'],                beats: [4],        beatUnit: 'quarter',        prefix: 'medium' },
  ch4:  { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'medium' },
  ch5:  { kind: 'compound', ts: ['6/8'],                beats: [2],        beatUnit: 'dotted-quarter', prefix: 'cd' },
  ch6:  { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'medium' },
  ch7:  { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'medium' },
  ch8:  { kind: 'compound', ts: ['6/8'],                beats: [2],        beatUnit: 'dotted-quarter', prefix: 'cd' },
  ch9:  { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'medium' },
  ch10: { kind: 'compound', ts: ['6/8'],                beats: [2],        beatUnit: 'dotted-quarter', prefix: 'cd' },
  ch11: { kind: 'compound', ts: ['9/8', '12/8'],        beats: [3, 4],     beatUnit: 'dotted-quarter', prefix: 'cd' },
  ch12: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'tpl' },
  ch14: { kind: 'simple',   ts: ['2/2', '3/2'],         beats: [2, 3],     beatUnit: 'half',           prefix: 'hb' },
  ch15: { kind: 'compound', ts: ['6/4', '9/4', '12/4'], beats: [2, 3, 4],  beatUnit: 'dotted-half',    prefix: 'dh' },
  ch17: { kind: 'compound', ts: ['6/16', '9/16', '12/16'], beats: [2, 3, 4], beatUnit: 'dotted-eighth', prefix: 'de' },
  // --- roadmap chapters (not-yet-buildable) ---
  ch13: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: null },
  ch16: { kind: 'simple',   ts: ['2/8', '3/8'],         beats: [2, 3],     beatUnit: 'eighth',         prefix: 'eb' },
  ch18: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: null },
  ch19: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'mixed',          prefix: 'medium' },
  ch20: { kind: 'compound', ts: ['6/8', '9/8', '12/8'], beats: [2, 3, 4],  beatUnit: 'mixed',          prefix: 'cd' },
  ch21: { kind: 'simple',   ts: ['2/4', '6/8'],         beats: [2, 2],     beatUnit: 'mixed',          prefix: null },
  ch22: { kind: 'simple',   ts: ['2/4', '6/8'],         beats: [2, 2],     beatUnit: 'mixed',          prefix: null },
  ch23: { kind: 'simple',   ts: ['2/4', '3/4'],         beats: [2, 3],     beatUnit: 'quarter',        prefix: null },
  ch24: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: null },
  ch25: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: null },
  ch26: { kind: 'simple',   ts: ['2/4', '3/4', '4/4'],  beats: [2, 3, 4],  beatUnit: 'quarter',        prefix: 'tpl' },
  ch27: { kind: 'simple',   ts: ['5/8', '5/4'],         beats: [2, 2],     beatUnit: 'mixed',          prefix: null },
  ch28: { kind: 'simple',   ts: ['7/8', '8/8', '10/8'], beats: [3, 3, 4],  beatUnit: 'mixed',          prefix: null },
  ch29: { kind: 'simple',   ts: ['5/8', '7/8'],         beats: [2, 3],     beatUnit: 'mixed',          prefix: null },
  ch30: { kind: 'simple',   ts: ['4/4'],                beats: [4],        beatUnit: 'quarter',        prefix: null },
  ch31: { kind: 'simple',   ts: ['4/4'],                beats: [4],        beatUnit: 'mixed',          prefix: null }
};

/** beatUnits whose beat count follows the standard simple/compound rule. */
const REGULAR_BEAT_UNITS = new Set(['quarter', 'half', 'eighth', 'dotted-quarter', 'dotted-half', 'dotted-eighth']);

test('levels: meter, beat count, beat unit & asset prefix match the spec', () => {
  for (const l of LEVELS) {
    const e = EXPECTED_METER[l.id];
    assert.ok(e, `no expectation for ${l.id}`);
    assert.equal(l.meter.kind, e.kind, `${l.id} meter.kind`);
    assert.deepEqual(l.meter.timeSignatures, e.ts, `${l.id} timeSignatures`);
    assert.deepEqual(l.meter.beatsPerMeasure, e.beats, `${l.id} beatsPerMeasure`);
    assert.equal(l.beatUnit, e.beatUnit, `${l.id} beatUnit`);
    assert.equal(l.assetPrefix, e.prefix, `${l.id} assetPrefix`);
  }
});

test('levels: compound beat count == top/3, simple beat count == top number (regular meters)', () => {
  // The top/3 (compound) and top (simple) rule holds for EQUAL-beat meters.
  // mixed/unequal/odd meters (ch19-22, 27-29, 31) opt out of it by design.
  for (const l of LEVELS) {
    if (!REGULAR_BEAT_UNITS.has(l.beatUnit)) continue;
    l.meter.timeSignatures.forEach((ts, i) => {
      const top = Number(ts.split('/')[0]);
      const expected = l.meter.kind === 'compound' ? top / 3 : top;
      assert.equal(l.meter.beatsPerMeasure[i], expected,
        `${l.id} ${ts}: beats should be ${expected}`);
    });
  }
});

test('levels: unequal/odd meters carry a "mixed" beat unit (no simple top-number rule)', () => {
  // 5/8, 5/4, 7/8, 8/8, 10/8 and the changing-meter levels are mixed-beat.
  for (const id of ['ch19', 'ch20', 'ch21', 'ch22', 'ch27', 'ch28', 'ch29', 'ch31']) {
    assert.equal(LEVEL_BY_ID.get(id).beatUnit, 'mixed', `${id} should be mixed-beat`);
  }
});

test('levels: timeSignatures and beatsPerMeasure are index-aligned (same length)', () => {
  for (const l of LEVELS) {
    assert.equal(l.meter.timeSignatures.length, l.meter.beatsPerMeasure.length, `${l.id}`);
    assert.ok(l.meter.timeSignatures.length >= 1, `${l.id} has no time signature`);
  }
});

test('levels: compound meters have top 6/9/12; regular simple meters have top 2/3/4', () => {
  for (const l of LEVELS) {
    // Skip mixed/unequal levels (5/8, 7/8, simple↔compound conversion mixes tops).
    if (!REGULAR_BEAT_UNITS.has(l.beatUnit)) continue;
    for (const ts of l.meter.timeSignatures) {
      const top = Number(ts.split('/')[0]);
      if (l.meter.kind === 'compound') assert.ok([6, 9, 12].includes(top), `${l.id} ${ts} not compound-topped`);
      else assert.ok([2, 3, 4].includes(top), `${l.id} ${ts} not simple-topped`);
    }
  }
});

/* ===========================================================================
 * SECTION 4 — skills are consistent & cross-checked against solo-mode.js
 * =========================================================================*/

test('skills: ids are unique', () => {
  const ids = SKILLS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate skill ids');
});

test('skills: every figure skill id (except the pending Ch16 eb-* art) exists in the solo-mode.js figure bank', () => {
  const bank = soloModeFigureIds();
  for (const s of SKILLS) {
    if (s.isFigure === false) continue; // concept skills are not bank figures
    if (s.id.startsWith('eb-')) continue; // Ch16 eighth-beat art is NEEDS-ASSETS (placeholder ids)
    assert.ok(bank.has(s.id), `figure skill ${s.id} not found in solo-mode.js bank`);
  }
});

test('skills: the only pending-art (not-yet-in-bank) figure skills are the Ch16 eb-* placeholders', () => {
  const bank = soloModeFigureIds();
  const missing = SKILLS.filter((s) => s.isFigure !== false && !bank.has(s.id)).map((s) => s.id);
  assert.ok(missing.every((id) => id.startsWith('eb-')), `unexpected missing figures: ${missing}`);
  // and every missing figure is owned by a needs-assets level
  for (const id of missing) {
    const lvl = LEVEL_BY_ID.get('ch' + SKILL_BY_ID.get(id).introLevel);
    assert.equal(lvl.buildStatus, 'needs-assets', `${id} missing but its level isn't needs-assets`);
  }
});

test('scraper: soloModeFigureIds is scoped to declared figure-id forms (not any quoted token)', () => {
  // Guards against the scraper regressing to "match any quoted token", which would make
  // the cross-check toothless. The scraper must:
  //   (a) include real figure ids (id:-keys and *_STEPS members), and
  //   (b) EXCLUDE plain quoted strings that are NOT figure ids (bank keys, vexflow
  //       durations, CSS-ish tokens, primitive-type words, etc.).
  const bank = soloModeFigureIds();
  // (a) representative real ids from each declared form must be present.
  for (const id of ['quarter', 'two-eighths', 'dotted-eighth-sixteenth', // L_STEPS bare ids
                    'cd-dotted-quarter', 'hb-half', 'tpl-quintuplet']) {   // *_FIGS id: / push tail
    assert.ok(bank.has(id), `scraper dropped a real figure id: ${id}`);
  }
  // (b) tokens the OLD permissive regex wrongly captured must now be excluded.
  for (const junk of ['medium', 'all', 'simple', 'compound', 'q', 'qr', 'h', 'hr',
                      'halfbeat', 'dotted16', 'boolean', 'number', 'sine', 'px']) {
    assert.ok(!bank.has(junk), `scraper still matches a non-figure token: ${junk}`);
  }
  // Sanity: the tightened set is materially smaller than "every quoted lowercase token".
  const everyQuotedToken = new Set();
  const src = readFileSync(join(REPO, 'solo-mode.js'), 'utf8');
  for (const m of src.matchAll(/'([a-z][a-z0-9-]*)'/g)) everyQuotedToken.add(m[1]);
  assert.ok(bank.size < everyQuotedToken.size,
    'tightened scraper must capture fewer tokens than the permissive one');
});

test('skills: HALL_CATALOG Ch7 double-dot refinement is present, flagged, and bank-safe', () => {
  // HALL_CATALOG.md explicitly adds double-dotted figures to Ch7. They have no bank art
  // yet, so they live as a NON-figure concept: present in ch7.newSkills, excluded from
  // ch7.figures, and skipped by the solo-mode cross-check (so it cannot break it).
  const dd = SKILL_BY_ID.get('concept:double-dot');
  assert.ok(dd, 'concept:double-dot skill must exist');
  assert.equal(dd.isFigure, false, 'double-dot must be a non-figure concept (no bank art yet)');
  assert.equal(dd.introLevel, 7);

  const ch7 = LEVEL_BY_ID.get('ch7');
  assert.ok(ch7.newSkills.includes('concept:double-dot'), 'ch7 must introduce concept:double-dot');
  assert.ok(!ch7.figures.includes('concept:double-dot'),
    'a concept must never appear in the generatable figures list');
  // Ch7 remains a shipped READY chapter despite the refinement (its real figures exist).
  assert.equal(ch7.buildStatus, 'ready');
  // And it is genuinely absent from the figure bank — so it MUST be isFigure:false,
  // which the cross-check relies on to skip it.
  assert.ok(!soloModeFigureIds().has('concept:double-dot'));
});

test('skills: introLevel points at a level whose newSkills actually contains it', () => {
  for (const s of SKILLS) {
    const lvl = LEVEL_BY_ID.get('ch' + s.introLevel);
    assert.ok(lvl, `skill ${s.id} introLevel ch${s.introLevel} missing`);
    assert.ok(lvl.newSkills.includes(s.id),
      `skill ${s.id} introLevel ch${s.introLevel} does not list it in newSkills`);
  }
});

test('skills: kinds are from the allowed vocabulary', () => {
  const KINDS = new Set([
    'simple-quarter', 'simple-half', 'simple-eighth', 'compound-dquarter',
    'compound-dhalf', 'compound-deighth', 'tuplet', 'polyrhythm',
    'meter-change', 'unequal-meter', 'concept'
  ]);
  for (const s of SKILLS) assert.ok(KINDS.has(s.kind), `${s.id} bad kind ${s.kind}`);
});

/* ===========================================================================
 * SECTION 5 — level.newSkills / allSkills / figures are consistent
 * =========================================================================*/

test('levels: every newSkill resolves to a known skill', () => {
  for (const l of LEVELS) {
    for (const sk of l.newSkills) {
      assert.ok(SKILL_BY_ID.has(sk), `${l.id} newSkill ${sk} unknown`);
    }
  }
});

test('levels: a skill is introduced (newSkills) at exactly one level', () => {
  const intro = new Map();
  for (const l of LEVELS) {
    for (const sk of l.newSkills) {
      assert.ok(!intro.has(sk), `${sk} introduced twice: ${intro.get(sk)} and ${l.id}`);
      intro.set(sk, l.id);
    }
  }
  // and every skill in the catalog is introduced somewhere
  for (const s of SKILLS) {
    assert.ok(intro.has(s.id), `skill ${s.id} is never introduced by any level`);
  }
});

test('levels: allSkills == union of newSkills along same-beat-unit & same-polyrhythm-side prereq chain', () => {
  // Recompute the cumulative set independently and compare. Inheritance is
  // cumulative WITHIN a beat-unit family AND on the same side of the polyrhythm
  // boundary only (so a two-voice polyrhythm concept never leaks into a
  // single-voice level that happens to share the `quarter` beat unit, and vice
  // versa). The boundary is the tapping form's voice count (===2 ⇒ polyrhythm).
  const isPoly = (l) => l.forms.tapping.voices === 2;
  function expectAll(id) {
    const l = LEVEL_BY_ID.get(id);
    const out = [];
    for (const p of l.prereqs) {
      const pl = LEVEL_BY_ID.get(p);
      if (pl.beatUnit !== l.beatUnit) continue;
      if (isPoly(pl) !== isPoly(l)) continue;
      for (const sk of expectAll(p)) if (!out.includes(sk)) out.push(sk);
    }
    for (const sk of l.newSkills) if (!out.includes(sk)) out.push(sk);
    return out;
  }
  for (const l of LEVELS) {
    assert.deepEqual(
      [...l.allSkills].sort(),
      [...new Set(expectAll(l.id))].sort(),
      `${l.id} allSkills mismatch`
    );
  }
});

test('levels: figures == allSkills minus non-figure concept skills', () => {
  for (const l of LEVELS) {
    const expected = l.allSkills.filter((sk) => SKILL_BY_ID.get(sk).isFigure !== false);
    assert.deepEqual(l.figures, expected, `${l.id} figures`);
    // and no concept ids leaked into figures
    for (const f of l.figures) {
      assert.notEqual(SKILL_BY_ID.get(f).isFigure, false, `${l.id} figures contains concept ${f}`);
    }
  }
});

test('levels: cumulative vocabulary never carries across beat-unit families', () => {
  // ch5 (dotted-quarter) must NOT contain any simple-quarter figure even though
  // its prereq ch3 is simple-quarter.
  const ch5 = LEVEL_BY_ID.get('ch5');
  assert.ok(!ch5.allSkills.includes('quarter'), 'compound ch5 leaked simple quarter');
  assert.ok(!ch5.allSkills.includes('two-eighths'), 'compound ch5 leaked simple eighths');
  // ch14 (half) must not contain quarter-beat figures from ch12.
  const ch14 = LEVEL_BY_ID.get('ch14');
  assert.ok(!ch14.allSkills.includes('quarter'), 'half-beat ch14 leaked simple quarter');
  // ch5 (compound) must NOT leak the dictation tie concept from its simple
  // prereq ch3 either (cross-family inheritance is blocked).
  assert.ok(!ch5.allSkills.includes('concept:tie'), 'compound ch5 leaked the simple tie concept');
  // every figure in a level shares the level's family mapping
  const FAMILY_OF_UNIT = {
    quarter: ['simple-quarter', 'tuplet'],
    half: ['simple-half'],
    eighth: ['simple-eighth'],
    'dotted-quarter': ['compound-dquarter'],
    'dotted-half': ['compound-dhalf'],
    'dotted-eighth': ['compound-deighth'],
    // mixed/odd-meter levels carry only concept skills → no figures expected
    mixed: []
  };
  for (const l of LEVELS) {
    for (const sk of l.figures) {
      const kind = SKILL_BY_ID.get(sk).kind;
      assert.ok((FAMILY_OF_UNIT[l.beatUnit] || []).includes(kind),
        `${l.id} (beatUnit ${l.beatUnit}) contains ${sk} of kind ${kind}`);
    }
  }
});

test('levels: cross-POLYRHYTHM-BOUNDARY inheritance is blocked (polyrhythm concepts never leak into single-voice levels)', () => {
  // ch26 (single-voice, quarter beat) has ch25 (polyrhythm, quarter beat) as a
  // chapter-order prereq, but must NOT inherit its polyrhythm concept.
  const ch26 = LEVEL_BY_ID.get('ch26');
  assert.ok(!ch26.allSkills.some((s) => s.startsWith('concept:poly')),
    'single-voice ch26 leaked a polyrhythm concept');
  assert.ok(ch26.allSkills.includes('quarter'), 'ch26 should inherit the simple-quarter family');
  // and the two-voice (polyrhythm) levels carry ONLY polyrhythm concepts, no figures.
  for (const id of ['ch13', 'ch23', 'ch24', 'ch25', 'ch30']) {
    assert.deepEqual(LEVEL_BY_ID.get(id).figures, [], `${id} (polyrhythm) should have no single-voice figures`);
  }
});

test('levels: cumulative counts grow monotonically within each track', () => {
  // simple-quarter track chain
  const simpleChain = ['ch1', 'ch2', 'ch3', 'ch4', 'ch6', 'ch7', 'ch9', 'ch12'];
  for (let i = 1; i < simpleChain.length; i++) {
    const prev = LEVEL_BY_ID.get(simpleChain[i - 1]).allSkills.length;
    const cur = LEVEL_BY_ID.get(simpleChain[i]).allSkills.length;
    assert.ok(cur >= prev, `${simpleChain[i]} (${cur}) should accumulate >= ${simpleChain[i - 1]} (${prev})`);
  }
  // compound dotted-quarter chain
  const cmpChain = ['ch5', 'ch8', 'ch10', 'ch11'];
  for (let i = 1; i < cmpChain.length; i++) {
    const prev = LEVEL_BY_ID.get(cmpChain[i - 1]).allSkills.length;
    const cur = LEVEL_BY_ID.get(cmpChain[i]).allSkills.length;
    assert.ok(cur >= prev, `${cmpChain[i]} should accumulate >= ${cmpChain[i - 1]}`);
  }
});

/* ---- Spot-check exact vocabularies against CURRICULUM_PLAN.md §B ---- */

test('vocab: ch5 == Ch5 compound-duple basics (5 cd figures)', () => {
  assert.deepEqual(LEVEL_BY_ID.get('ch5').figures, [
    'cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet'
  ]);
});

test('vocab: ch11 (9/8·12/8) carries the FULL cd vocabulary, adds no new figures', () => {
  const ch11 = LEVEL_BY_ID.get('ch11');
  assert.deepEqual(ch11.newSkills, []);
  // full cd set = ch5 + ch8 + ch10 news
  const cdAll = SKILLS.filter((s) => s.kind === 'compound-dquarter').map((s) => s.id);
  assert.deepEqual([...ch11.figures].sort(), [...cdAll].sort());
  assert.equal(ch11.figures.length, 19); // 5 + 8 + 6
});

test('vocab: ch12 includes the simple-quarter cumulative set plus the eighth/quarter triplets', () => {
  const ch12 = LEVEL_BY_ID.get('ch12');
  assert.ok(ch12.figures.includes('quarter'));
  assert.ok(ch12.figures.includes('triplet-eighths'));
  assert.ok(ch12.figures.includes('triplet-quarters'));
  // ch12 = the full simple-quarter set + the two Ch12 triplets, but NOT the
  // Ch26 5/6/7-tuplets (those are introduced later, at ch26).
  const ch12Expected = SKILLS
    .filter((s) => s.kind === 'simple-quarter' || (s.kind === 'tuplet' && s.introLevel === 12))
    .map((s) => s.id);
  assert.deepEqual([...ch12.figures].sort(), [...ch12Expected].sort());
  assert.ok(!ch12.figures.includes('tpl-quintuplet'), 'ch12 should not yet have Ch26 tuplets');
});

test('vocab: ch26 == the simple-quarter set + 5/6/7-tuplets (Ch26, needs-assets)', () => {
  const ch26 = LEVEL_BY_ID.get('ch26');
  for (const id of ['tpl-quintuplet', 'tpl-sextuplet', 'tpl-septuplet']) {
    assert.ok(ch26.figures.includes(id), `ch26 missing ${id}`);
  }
  // it carries the whole simple-quarter + every tuplet
  const expected = SKILLS.filter((s) => s.kind === 'simple-quarter' || s.kind === 'tuplet').map((s) => s.id);
  assert.deepEqual([...ch26.figures].sort(), [...expected].sort());
});

test('vocab: ch3 figures == quarter,two-eighths,half,quarter-rest', () => {
  assert.deepEqual([...LEVEL_BY_ID.get('ch3').figures].sort(),
    ['half', 'quarter', 'quarter-rest', 'two-eighths'].sort());
});

test('vocab: ch4 introduces the tie CONCEPT but it is not a figure', () => {
  const ch4 = LEVEL_BY_ID.get('ch4');
  assert.ok(ch4.allSkills.includes('concept:tie'));
  assert.ok(!ch4.figures.includes('concept:tie'));
});

/* ===========================================================================
 * SECTION 6 — traversal helpers over sample profiles
 * =========================================================================*/

test('prereqsSatisfied: ch1 (root) always satisfied', () => {
  assert.equal(prereqsSatisfied('ch1', { masteredLevels: [] }), true);
});

test('prereqsSatisfied: ch5 needs ch3', () => {
  assert.equal(prereqsSatisfied('ch5', { masteredLevels: [] }), false);
  assert.equal(prereqsSatisfied('ch5', { masteredLevels: ['ch1', 'ch2'] }), false);
  assert.equal(prereqsSatisfied('ch5', { masteredLevels: ['ch1', 'ch2', 'ch3'] }), true);
});

test('prereqsSatisfied: ch8 needs BOTH ch5 and ch6', () => {
  assert.equal(prereqsSatisfied('ch8', { masteredLevels: ['ch5'] }), false);
  assert.equal(prereqsSatisfied('ch8', { masteredLevels: ['ch6'] }), false);
  assert.equal(prereqsSatisfied('ch8', { masteredLevels: ['ch5', 'ch6'] }), true);
});

test('prereqsSatisfied: throws on unknown level', () => {
  assert.throws(() => prereqsSatisfied('ch99', { masteredLevels: [] }), /unknown/i);
});

test('prereqsSatisfied: tolerates null/missing profile', () => {
  assert.equal(prereqsSatisfied('ch1', null), true);
  assert.equal(prereqsSatisfied('ch1', {}), true);
  assert.equal(prereqsSatisfied('ch2', {}), false);
});

test('unlockedLevels: empty profile unlocks only the root, in ladder order', () => {
  const u = unlockedLevels({ masteredLevels: [] }).map((l) => l.id);
  assert.deepEqual(u, ['ch1']);
});

test('unlockedLevels: mastering ch1 unlocks ch2 (and keeps ch1)', () => {
  const u = unlockedLevels({ masteredLevels: ['ch1'] }).map((l) => l.id);
  assert.deepEqual(u, ['ch1', 'ch2']);
});

test('unlockedLevels: mastering ch1..ch3 unlocks ch4 AND ch5 (the branch)', () => {
  const u = unlockedLevels({ masteredLevels: ['ch1', 'ch2', 'ch3'] }).map((l) => l.id);
  // ch3 satisfies both ch4 (simple) and ch5 (compound). Order is ladder order.
  assert.deepEqual(u, ['ch1', 'ch2', 'ch3', 'ch4', 'ch5']);
});

test('unlockedLevels: result is always a prefix-closed subset in ladder order', () => {
  const profile = { masteredLevels: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6'] };
  const u = unlockedLevels(profile).map((l) => l.id);
  const order = topoSort().map((l) => l.id);
  // every unlocked level appears in ladder order, monotonically
  let idx = -1;
  for (const id of u) { const i = order.indexOf(id); assert.ok(i > idx, `out of order ${id}`); idx = i; }
  // ch6 mastered + ch5 mastered → ch8 unlocks; ch7 unlocks from ch6
  assert.ok(u.includes('ch7'));
  assert.ok(u.includes('ch8'));
  // ch9 not yet (needs ch7), ch10 not yet (needs ch8+ch9)
  assert.ok(!u.includes('ch10'));
});

test('unlockedLevels: full mastery unlocks every level', () => {
  const all = LEVELS.map((l) => l.id);
  const u = unlockedLevels({ masteredLevels: all }).map((l) => l.id);
  assert.equal(u.length, LEVELS.length);
});

test('nextLevel: empty profile → ch1', () => {
  assert.equal(nextLevel({ masteredLevels: [] }).id, 'ch1');
});

test('nextLevel: walks the ladder one step at a time from empty to complete', () => {
  // Simulate a learner mastering whatever nextLevel proposes, in order.
  const mastered = [];
  const visited = [];
  for (let guard = 0; guard < 100; guard++) {
    const nl = nextLevel({ masteredLevels: mastered });
    if (!nl) break;
    // nextLevel must always be unlocked & not already mastered
    assert.ok(prereqsSatisfied(nl.id, { masteredLevels: mastered }), `${nl.id} proposed but prereqs unmet`);
    assert.ok(!mastered.includes(nl.id), `${nl.id} proposed but already mastered`);
    mastered.push(nl.id);
    visited.push(nl.id);
  }
  // visiting greedily by "lowest ladder index not yet done" reproduces topo order
  assert.deepEqual(visited, EXPECTED_ORDER);
  assert.equal(nextLevel({ masteredLevels: mastered }), null, 'ladder should be complete');
});

test('nextLevel: skips already-mastered levels', () => {
  // master ch1, ch2 out of order in the array; next should be ch3
  assert.equal(nextLevel({ masteredLevels: ['ch2', 'ch1'] }).id, 'ch3');
});

test('nextLevel: returns null when all unlocked levels are mastered but more are blocked', () => {
  // master nothing reachable beyond an isolated mastered set: master ch1..ch17 fully → null
  const all = LEVELS.map((l) => l.id);
  assert.equal(nextLevel({ masteredLevels: all }), null);
});

/* ===========================================================================
 * SECTION 7 — skill lookups
 * =========================================================================*/

test('skillsForLevel: returns a COPY of allSkills', () => {
  const a = skillsForLevel('ch3');
  a.push('mutated');
  assert.ok(!LEVEL_BY_ID.get('ch3').allSkills.includes('mutated'), 'returned array is not isolated');
});

test('skillsForLevel: throws on unknown level', () => {
  assert.throws(() => skillsForLevel('nope'), /unknown/i);
});

test('resolvedSkillsForLevel: returns Skill objects in allSkills order', () => {
  const r = resolvedSkillsForLevel('ch1');
  assert.deepEqual(r.map((s) => s.id), LEVEL_BY_ID.get('ch1').allSkills);
  for (const s of r) assert.ok(s && typeof s.kind === 'string');
});

test('figuresForLevel: returns a copy of figures, no concepts', () => {
  const f = figuresForLevel('ch4');
  f.push('x');
  assert.ok(!LEVEL_BY_ID.get('ch4').figures.includes('x'));
  assert.ok(!figuresForLevel('ch4').some((id) => id.startsWith('concept:')));
});

test('figuresForLevel: throws on unknown level', () => {
  assert.throws(() => figuresForLevel('nope'), /unknown/i);
});

/* ===========================================================================
 * SECTION 8 — global invariants over the whole encoded catalog
 * =========================================================================*/

test('catalog: every skill id used by any level exists in SKILLS', () => {
  for (const l of LEVELS) {
    for (const sk of l.allSkills) assert.ok(SKILL_BY_ID.has(sk), `${l.id} uses unknown skill ${sk}`);
  }
});

test('catalog: no orphan skills (every SKILL appears in some level allSkills)', () => {
  const used = new Set();
  for (const l of LEVELS) for (const sk of l.allSkills) used.add(sk);
  for (const s of SKILLS) assert.ok(used.has(s.id), `skill ${s.id} is never used by a level`);
});

test('catalog: figure-skill count matches solo-mode bank coverage for these chapters', () => {
  // Sanity: total distinct figures across all levels equals total figure skills.
  const figs = new Set();
  for (const l of LEVELS) for (const f of l.figures) figs.add(f);
  const figureSkills = SKILLS.filter((s) => s.isFigure !== false).map((s) => s.id);
  assert.deepEqual([...figs].sort(), [...figureSkills].sort());
});

/* ===========================================================================
 * SECTION 9 — buildStatus / engineNeeds / mode / voices (the roadmap fields)
 * =========================================================================*/

test('buildStatus: every level has a valid buildStatus matching the spec', () => {
  const VALID = new Set(['ready', 'needs-assets', 'needs-engine']);
  for (const l of LEVELS) {
    assert.ok(VALID.has(l.buildStatus), `${l.id} bad buildStatus ${l.buildStatus}`);
    assert.equal(l.buildStatus, EXPECTED_BUILD_STATUS[l.id], `${l.id} buildStatus mismatch`);
  }
});

test('buildStatus: exactly the 15 ready, 3 needs-assets (ch16/18/26), 13 needs-engine', () => {
  const by = { ready: [], 'needs-assets': [], 'needs-engine': [] };
  for (const l of LEVELS) by[l.buildStatus].push(l.hallChapter);
  assert.equal(by.ready.length, 15);
  assert.deepEqual(by['needs-assets'].sort((a, b) => a - b), [16, 18, 26]);
  assert.equal(by['needs-engine'].length, 13);
});

test('engineNeeds: ready levels have null; non-ready levels have a non-empty description', () => {
  for (const l of LEVELS) {
    if (l.buildStatus === 'ready') {
      assert.equal(l.engineNeeds, null, `${l.id} ready but has engineNeeds`);
    } else {
      assert.equal(typeof l.engineNeeds, 'string', `${l.id} missing engineNeeds`);
      assert.ok(l.engineNeeds.length > 0, `${l.id} empty engineNeeds`);
    }
  }
});

test('engineNeeds: single-voice levels never cite a two-voice/polyrhythm need', () => {
  // Two-voice is the TAPPING form of the polyrhythm chapters only. A level whose
  // tapping form is single-voice (the 26) is never gated by a two-voice engine.
  for (const l of LEVELS) {
    if (l.forms.tapping.voices === 2 || !l.engineNeeds) continue;
    const txt = l.engineNeeds.toLowerCase();
    assert.ok(!txt.includes('two-voice') && !txt.includes('polyrhythm') && !txt.includes('two voice'),
      `${l.id} (single-voice) engineNeeds wrongly cites two-voice: "${l.engineNeeds}"`);
  }
});

test('engineNeeds: the polyrhythm chapters cite both the single-voice composite AND the two-zone tapping engine', () => {
  for (const id of EXPECTED_DOUBLELINE_ORDER) {
    const l = LEVEL_BY_ID.get(id);
    const txt = l.engineNeeds.toLowerCase();
    // dictation form = the single-voice composite/resultant rhythm
    assert.ok(/composite|resultant/.test(txt), `${id} engineNeeds should cite the single-voice composite: "${l.engineNeeds}"`);
    // tapping form = the two-zone two-voice engine
    assert.ok(/two-zone|two-voice/.test(txt), `${id} engineNeeds should cite the two-zone tapping engine: "${l.engineNeeds}"`);
  }
});

/* ===========================================================================
 * SECTION 9b — forms (per-level dictation + tapping) & tappingDifficulty
 * =========================================================================*/

test('forms: every level has BOTH a dictation and a tapping form', () => {
  for (const l of LEVELS) {
    assert.ok(l.forms && typeof l.forms === 'object', `${l.id} missing forms`);
    assert.ok(l.forms.dictation && typeof l.forms.dictation.voices === 'number',
      `${l.id} missing a dictation form`);
    assert.ok(l.forms.tapping && typeof l.forms.tapping.voices === 'number',
      `${l.id} missing a tapping form`);
  }
});

test('forms: dictation is ALWAYS single-voice (voices:1) — incl. the polyrhythm composites', () => {
  for (const l of LEVELS) {
    assert.equal(l.forms.dictation.voices, 1,
      `${l.id} dictation form must be single-voice (the composite for polyrhythm chapters)`);
  }
});

test('forms: the polyrhythm chapters (13,23,24,25,30) are the only voices:2 tapping forms; dictation stays 1', () => {
  for (const l of LEVELS) {
    const exp = EXPECTED_FORM_VOICES[l.id] || [1, 1];
    assert.deepEqual([l.forms.dictation.voices, l.forms.tapping.voices], exp,
      `${l.id} per-form voices mismatch`);
    assert.ok(l.forms.tapping.voices === 1 || l.forms.tapping.voices === 2, `${l.id} bad tapping voices`);
  }
  // exactly the five polyrhythm chapters have a two-voice tapping form
  const v2 = LEVELS.filter((l) => l.forms.tapping.voices === 2).map((l) => l.id).sort();
  assert.deepEqual(v2, [...EXPECTED_DOUBLELINE_ORDER].sort());
});

test('forms: each level has a distinct forms object (no shared reference)', () => {
  const seen = new Set();
  for (const l of LEVELS) {
    assert.ok(!seen.has(l.forms), `${l.id} shares its forms object with another level`);
    seen.add(l.forms);
  }
});

test('tappingDifficulty: every level carries a rank (1-7) + a non-empty scaffold note', () => {
  for (const l of LEVELS) {
    const d = l.tappingDifficulty;
    assert.ok(d && typeof d === 'object', `${l.id} missing tappingDifficulty`);
    assert.ok(Number.isInteger(d.rank) && d.rank >= 1 && d.rank <= 7, `${l.id} bad tapping rank ${d.rank}`);
    assert.equal(typeof d.scaffold, 'string', `${l.id} missing tapping scaffold`);
    assert.ok(d.scaffold.length > 0, `${l.id} empty tapping scaffold`);
  }
});

test('tappingDifficulty: the three TAPPING_RESEARCH inflection points are flagged (ch9, ch13, ch30)', () => {
  const inflections = LEVELS.filter((l) => l.tappingDifficulty.inflection === true).map((l) => l.id).sort();
  assert.deepEqual(inflections, ['ch13', 'ch30', 'ch9'].sort());
  // and their scaffolds name the inflection so the front-end can lean on it
  for (const id of ['ch9', 'ch13', 'ch30']) {
    assert.match(LEVEL_BY_ID.get(id).tappingDifficulty.scaffold, /INFLECTION/i, `${id} scaffold should call out the inflection`);
  }
});

test('tappingDifficulty: the 2:3 gateway (ch13) and polymeter ceiling (ch30) are the high-rank polyrhythm peaks', () => {
  // The gateway (ch13) is rank 5; the ceiling (ch30) is the top rank (7).
  assert.equal(LEVEL_BY_ID.get('ch13').tappingDifficulty.rank, 5);
  assert.equal(LEVEL_BY_ID.get('ch30').tappingDifficulty.rank, 7);
  // ch30 (polymeter) and ch31 (metric modulation) are the only rank-7 ceilings.
  const top = LEVELS.filter((l) => l.tappingDifficulty.rank === 7).map((l) => l.id).sort();
  assert.deepEqual(top, ['ch30', 'ch31']);
});

test('tappingDifficulty: rank is non-decreasing along the polyrhythm escalation 13→23→24→25→30', () => {
  const chain = ['ch13', 'ch23', 'ch24', 'ch25', 'ch30'];
  for (let i = 1; i < chain.length; i++) {
    const prev = LEVEL_BY_ID.get(chain[i - 1]).tappingDifficulty.rank;
    const cur = LEVEL_BY_ID.get(chain[i]).tappingDifficulty.rank;
    assert.ok(cur >= prev, `${chain[i]} (rank ${cur}) should be >= ${chain[i - 1]} (rank ${prev})`);
  }
});

/* ===========================================================================
 * SECTION 10 — MATCHED 1:1 ladders (one level set, two gameplay forms)
 *
 * The hard product requirement: the dictation and tapping ladders are matched
 * ONE-TO-ONE — same COUNT, same ORDER, one per Hall chapter — differing only by
 * which per-level FORM the front-end surfaces.
 * =========================================================================*/

test('ladderForMode("dictation"): all 31 matched levels, in Hall order', () => {
  const order = ladderForMode('dictation').map((l) => l.id);
  assert.deepEqual(order, EXPECTED_MATCHED_ORDER);
  assert.equal(order.length, 31);
});

test('ladderForMode("tapping"): all 31 matched levels, in the SAME Hall order', () => {
  const order = ladderForMode('tapping').map((l) => l.id);
  assert.deepEqual(order, EXPECTED_MATCHED_ORDER);
  assert.equal(order.length, 31);
});

test('MATCHED 1:1: dictation ladder count === tapping ladder count (the hard requirement)', () => {
  const dict = ladderForMode('dictation');
  const tap = ladderForMode('tapping');
  // same COUNT
  assert.equal(dict.length, tap.length, 'dictation and tapping ladders must have the same count');
  assert.equal(dict.length, 31, 'both ladders are the full 31-chapter set');
  // same ORDER, level for level (hand in hand)
  assert.deepEqual(dict.map((l) => l.id), tap.map((l) => l.id),
    'dictation and tapping ladders must be the same levels in the same order');
  // and they are the very same Level objects (no duplication)
  for (let i = 0; i < dict.length; i++) {
    assert.strictEqual(dict[i], tap[i], `${dict[i].id} should be the same Level object in both ladders`);
  }
});

test('MATCHED 1:1: every level appears in BOTH ladders and carries BOTH forms', () => {
  const dict = new Set(ladderForMode('dictation').map((l) => l.id));
  const tap = new Set(ladderForMode('tapping').map((l) => l.id));
  for (const l of LEVELS) {
    assert.ok(dict.has(l.id), `${l.id} missing from the dictation ladder`);
    assert.ok(tap.has(l.id), `${l.id} missing from the tapping ladder`);
    assert.ok(l.forms.dictation && l.forms.tapping, `${l.id} must carry both forms`);
  }
});

test('MATCHED 1:1: the polyrhythm chapters are voices:1 (composite) in dictation, voices:2 in tapping', () => {
  for (const id of EXPECTED_DOUBLELINE_ORDER) {
    assert.equal(formForLevel(id, 'dictation').voices, 1,
      `${id} dictation form must be the single-line composite (voices:1)`);
    assert.equal(formForLevel(id, 'tapping').voices, 2,
      `${id} tapping form must be two voices`);
  }
  // and the single-voice chapters are voices:1 in BOTH forms
  for (const id of EXPECTED_TAP_SINGLELINE_ORDER) {
    assert.equal(formForLevel(id, 'dictation').voices, 1, `${id} dictation voices`);
    assert.equal(formForLevel(id, 'tapping').voices, 1, `${id} tapping voices`);
  }
});

test('ladderForMode is a valid whole-DAG topo order (every prereq precedes its level)', () => {
  for (const mode of ['dictation', 'tapping']) {
    const order = ladderForMode(mode).map((l) => l.id);
    const pos = new Map(order.map((id, i) => [id, i]));
    for (const id of order) {
      for (const p of LEVEL_BY_ID.get(id).prereqs) {
        assert.ok(pos.get(p) < pos.get(id), `${p} must precede ${id} in the ${mode} ladder`);
      }
    }
  }
});

test('formForLevel: returns the per-mode form; throws on unknown level/mode', () => {
  assert.deepEqual(formForLevel('ch1', 'dictation'), { voices: 1 });
  assert.deepEqual(formForLevel('ch13', 'tapping'), { voices: 2 });
  assert.throws(() => formForLevel('nope', 'dictation'), /unknown levelId/i);
  assert.throws(() => formForLevel('ch1', 'nope'), /unknown mode/i);
});

test('tappingTracks: single-line == the voices:1 tapping forms; double-line == the polyrhythm chapters', () => {
  const { singleLine, doubleLine } = tappingTracks();
  // single-line track == the 26 chapters whose tapping form is single-voice
  assert.deepEqual(singleLine.map((l) => l.id), EXPECTED_TAP_SINGLELINE_ORDER);
  assert.ok(singleLine.every((l) => l.forms.tapping.voices === 1));
  // double-line track == the five two-voice polyrhythm chapters, in order
  assert.deepEqual(doubleLine.map((l) => l.id), EXPECTED_DOUBLELINE_ORDER);
  assert.ok(doubleLine.every((l) => l.forms.tapping.voices === 2));
  // the two sub-tracks partition the whole 31-level set
  assert.equal(singleLine.length + doubleLine.length, 31);
});

test('ladderForMode: throws on an unknown mode', () => {
  assert.throws(() => ladderForMode('nope'), /unknown mode/i);
});

test('laddersByMode: returns both ladders keyed by mode (same 31-level set)', () => {
  const { dictation, tapping } = laddersByMode();
  assert.deepEqual(dictation.map((l) => l.id), ladderForMode('dictation').map((l) => l.id));
  assert.deepEqual(tapping.map((l) => l.id), ladderForMode('tapping').map((l) => l.id));
  assert.deepEqual(dictation.map((l) => l.id), tapping.map((l) => l.id));
});

test('both ladders SHARE one skill vocabulary — same Level objects, same skill ids (no duplication)', () => {
  const dict = ladderForMode('dictation');
  const tap = ladderForMode('tapping');
  for (let i = 0; i < dict.length; i++) {
    assert.strictEqual(dict[i], tap[i], `${dict[i].id} should be the very same level object in both ladders`);
    assert.deepEqual(dict[i].allSkills, tap[i].allSkills);
  }
  // Cross-check: every skill id used anywhere is defined exactly once in SKILLS
  // (one source of truth shared across both forms).
  const allUsed = new Set();
  for (const l of LEVELS) for (const sk of l.allSkills) allUsed.add(sk);
  for (const sk of allUsed) assert.ok(SKILL_BY_ID.has(sk), `${sk} not in shared SKILLS`);
});

test('levelsByBuildStatus: filters in ladder order', () => {
  const ready = levelsByBuildStatus('ready').map((l) => l.id);
  assert.deepEqual(ready, READY_CHAPTERS.map((n) => 'ch' + n));
  assert.deepEqual(levelsByBuildStatus('needs-assets').map((l) => l.id), ['ch16', 'ch18', 'ch26']);
  assert.equal(levelsByBuildStatus('needs-engine').length, 13);
});

/* ===========================================================================
 * SECTION 11 — the READY-15 single-voice data is UNCHANGED by the form split
 *
 * Pins the figure/meter/skill data of the 15 originally-shipped READY chapters
 * so the matched-ladder refactor cannot silently mutate them. The exact
 * cumulative `figures` per ready chapter are snapshotted from CURRICULUM_PLAN.md
 * §B; if a future edit changes one, this fails loudly.
 * =========================================================================*/

/** Exact cumulative `figures` for each READY chapter (CURRICULUM_PLAN.md §B). */
const READY_FIGURES = {
  ch1: ['quarter', 'two-eighths', 'half'],
  ch2: ['quarter', 'two-eighths', 'half'],
  ch3: ['quarter', 'two-eighths', 'half', 'quarter-rest'],
  ch4: ['quarter', 'two-eighths', 'half', 'quarter-rest', 'dotted-quarter-eighth'],
  ch6: ['quarter', 'two-eighths', 'half', 'quarter-rest', 'dotted-quarter-eighth',
        'four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth'],
  ch7: ['quarter', 'two-eighths', 'half', 'quarter-rest', 'dotted-quarter-eighth',
        'four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth',
        'dotted-eighth-sixteenth', 'sixteenth-dotted-eighth'],
  ch9: ['quarter', 'two-eighths', 'half', 'quarter-rest', 'dotted-quarter-eighth',
        'four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth',
        'dotted-eighth-sixteenth', 'sixteenth-dotted-eighth',
        'eighth-rest-eighth', 'eighth-eighth-rest', 'eighth-quarter-eighth',
        'eighth-rest-two-sixteenths', 'sixteenth-rest-three-sixteenths'],
  ch12: ['quarter', 'two-eighths', 'half', 'quarter-rest', 'dotted-quarter-eighth',
         'four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth',
         'dotted-eighth-sixteenth', 'sixteenth-dotted-eighth',
         'eighth-rest-eighth', 'eighth-eighth-rest', 'eighth-quarter-eighth',
         'eighth-rest-two-sixteenths', 'sixteenth-rest-three-sixteenths',
         'triplet-eighths', 'triplet-quarters'],
  ch5: ['cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet'],
  ch8: ['cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet',
        'cd-six-sixteenths', 'cd-two16-8-8', 'cd-8-two16-8', 'cd-8-8-two16', 'cd-four16-8', 'cd-8-four16',
        'cd-quarter-two16', 'cd-two16-quarter'],
  ch10: ['cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet',
         'cd-six-sixteenths', 'cd-two16-8-8', 'cd-8-two16-8', 'cd-8-8-two16', 'cd-four16-8', 'cd-8-four16',
         'cd-quarter-two16', 'cd-two16-quarter',
         'cd-dotted-quarter-rest', 'cd-8rest-8-8', 'cd-8-8rest-8', 'cd-8-8-8rest', 'cd-quarter-8rest', 'cd-8rest-quarter'],
  // ch11 carries the FULL cd-* set (19), no new figures (asserted elsewhere too)
  // ch14/15/17: full single-family sets — asserted by length + membership below
};

test('READY-15: the cumulative figures of the originally-shipped chapters are UNCHANGED', () => {
  for (const [id, figs] of Object.entries(READY_FIGURES)) {
    assert.deepEqual(LEVEL_BY_ID.get(id).figures, figs, `${id} figures changed`);
  }
  // ch11 == the full 19-figure cd vocabulary, no new figures of its own.
  const ch11 = LEVEL_BY_ID.get('ch11');
  assert.deepEqual(ch11.newSkills, []);
  assert.equal(ch11.figures.length, 19);
  // ch14 (hb), ch15 (dh), ch17 (de): full single-family sets, single-voice.
  assert.equal(LEVEL_BY_ID.get('ch14').figures.length, 18);
  assert.equal(LEVEL_BY_ID.get('ch15').figures.length, 19);
  assert.equal(LEVEL_BY_ID.get('ch17').figures.length, 19);
});

test('READY-15: ready chapters stay single-voice in BOTH forms, ready, no engineNeeds', () => {
  for (const ch of READY_CHAPTERS) {
    const l = LEVEL_BY_ID.get('ch' + ch);
    assert.equal(l.buildStatus, 'ready', `ch${ch} must stay ready`);
    assert.equal(l.engineNeeds, null, `ch${ch} ready ⇒ no engineNeeds`);
    assert.equal(l.forms.dictation.voices, 1, `ch${ch} dictation single-voice`);
    assert.equal(l.forms.tapping.voices, 1, `ch${ch} tapping single-voice`);
    assert.notEqual(l.approxFigures, true, `ch${ch} ready ⇒ not approx`);
  }
});

test('READY-15: every ready figure id is in the solo-mode.js bank (cross-check intact)', () => {
  const bank = soloModeFigureIds();
  for (const ch of READY_CHAPTERS) {
    for (const f of LEVEL_BY_ID.get('ch' + ch).figures) {
      assert.ok(bank.has(f), `ready ch${ch} figure ${f} not in solo-mode.js bank`);
    }
  }
});

test('approxFigures: set on not-yet-buildable levels with placeholder figures, false on ready', () => {
  for (const l of LEVELS) {
    if (l.buildStatus === 'ready') {
      assert.notEqual(l.approxFigures, true, `${l.id} ready but flagged approxFigures`);
    }
  }
  // ch26 is needs-assets but its figure ids are REAL (tpl-* exist) → not approx.
  assert.notEqual(LEVEL_BY_ID.get('ch26').approxFigures, true);
  // ch16 (eb-* placeholders), ch13 (poly concept) etc. are approximate.
  assert.equal(LEVEL_BY_ID.get('ch16').approxFigures, true);
  assert.equal(LEVEL_BY_ID.get('ch13').approxFigures, true);
});
