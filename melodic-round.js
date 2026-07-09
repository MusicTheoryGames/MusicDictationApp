/**
 * @file melodic-round.js
 * @module melodic-round
 *
 * ONE place that turns (level, key-choice, seed) into a playable round:
 * the melody, its distractors, and which renderer kind should mount it.
 * Both the proof harness (melodic-lab.html) and the real game page import
 * THIS — the round-building rules live once, so the lab can never drift
 * from what the game actually plays (the exact divergence-bug class the
 * reuse-verified-code rule exists to prevent).
 *
 * Pure module: no DOM, no storage — callers own presentation + persistence.
 */

import {
  generateMelody,
  generateSymmetricMelody,
  generateModulatingMelody,
  generateTwoPartMelody,
  distractors,
  editDistance,
  tonicMidiFor,
} from './core/melodic.js';
import { recipeForRound } from './core/melodic-recipes.js';
import { qualityContextFromRecipe, scoreMelodyQuality } from './core/melodic-quality.js';

/**
 * Key choices a level offers, as option descriptors the caller can render
 * directly: diatonic pairs first (value = index into L.keys), then any
 * symmetric collections (value = 'sym:<collection>').
 *
 * @param {Object} L melodic level (core/melodic-curriculum.js shape)
 * @returns {{value:string, label:string}[]}
 */
export function keyChoices(L) {
  const out = (L.keys || []).map((kp, i) => ({ value: String(i), label: kp.key + ' ' + kp.mode }));
  for (const coll of L.symmetricCollections || []) {
    out.push({ value: 'sym:' + coll, label: 'C ' + coll });
  }
  return out;
}

/**
 * Resolve a key-choice value back to a {key, mode} pair (symmetric choices
 * report the collection as their mode, for display).
 * @param {Object} L
 * @param {string} choiceValue
 * @returns {{key:string, mode:string, symColl:string|null}}
 */
export function resolveKeyChoice(L, choiceValue) {
  const symColl = String(choiceValue).startsWith('sym:') ? String(choiceValue).slice(4) : null;
  if (symColl) return { key: 'C', mode: symColl, symColl };
  const kp = (L.keys || [])[Number(choiceValue)] || L.keys[0];
  return { key: kp.key, mode: kp.mode, symColl: null };
}

/**
 * Build one playable round for a level.
 *
 * Encapsulates every shell rule proven in the lab:
 *  - M0's empty leaps[] falls back to a small movement set for GENERATION only;
 *  - color-tone flags (M18/M21/M22) forward verbatim;
 *  - M24 symmetric collections use their own generator, distractors are
 *    different-seed siblings (distractors() can't re-degree non-diatonic notes);
 *  - M19/M26 modulation uses generateModulatingMelody (4 bars: readable staff),
 *    same different-seed distractor rule (a modulating melody lives in two keys);
 *  - error-detect requires an editDistance===1 distractor so "click the wrong
 *    note" has exactly one well-defined answer;
 *  - symmetric + modulating rounds always mount RECOGNITION (degree labels are a
 *    single-diatonic-key concept).
 *
 * @param {Object} L melodic level
 * @param {string} keyChoiceValue a value from {@link keyChoices}
 * @param {number} seed
 * @returns {{melody:Object, distractors:Object[], rendererKind:string,
 *            key:string, mode:string}}
 */
// Conspicuousness score for a distractor foil — LOWER = subtler (harder to tell from the correct
// melody). Owner: wrong answers must be TINY melodic OR rhythmic near-misses, never an obvious big jump.
function foilCost(orig, d) {
  const on = orig.notes, dn = d.notes;
  if (dn.length !== on.length) return 999;
  const pitchDiff = dn.some((n, k) => n.midi !== on[k].midi);
  const rhythmDiff = dn.some((n, k) => n.duration !== on[k].duration);
  if (!pitchDiff && rhythmDiff) return 3;                  // pure rhythmic near-miss — very plausible
  let cost = 0; const changed = [];
  dn.forEach((n, k) => { const dd = Math.abs(n.midi - on[k].midi); if (dd) { cost += dd; changed.push(k); } });
  changed.forEach((i) => {
    if (i === 0 || i === dn.length - 1) cost += 6;          // endpoints are visual + aural anchors
    if (i > 0 && Math.sign(on[i].midi - on[i - 1].midi) !== Math.sign(dn[i].midi - dn[i - 1].midi)) cost += 2; // contour flip reads as obvious
  });
  const maxAdj = (ns) => ns.slice(1).reduce((m, n, k) => Math.max(m, Math.abs(n.midi - ns[k].midi)), 0);
  if (maxAdj(dn) > maxAdj(on) + 2) cost += 12;             // introduced a leap bigger than any original => the "obvious big jump"
  return cost;
}

// A scalar DIFFICULTY score for a generated melody — used to pick, from several candidates, the one
// that fits where the student IS (logical ramp, not a random easy/hard swing). Higher = harder:
// more notes, more + bigger leaps, more contour zig-zag, more rhythmic variety, wider range.
export function melodyDifficulty(m) {
  const ns = (m && m.notes) || [];
  const n = ns.length;
  if (n < 2) return n;
  let leaps = 0, leapSum = 0, dirChanges = 0, lo = ns[0].midi, hi = ns[0].midi;
  const rhythms = new Set([ns[0].duration]);
  for (let i = 1; i < n; i++) {
    const iv = Math.abs(ns[i].midi - ns[i - 1].midi);
    if (iv > 2) { leaps++; leapSum += iv; }
    if (i > 1) {
      const a = Math.sign(ns[i].midi - ns[i - 1].midi), b = Math.sign(ns[i - 1].midi - ns[i - 2].midi);
      if (a && b && a !== b) dirChanges++;
    }
    rhythms.add(ns[i].duration);
    lo = Math.min(lo, ns[i].midi); hi = Math.max(hi, ns[i].midi);
  }
  return n * 1.0
    + (leaps / n) * 8
    + (leapSum / n) * 1.5
    + (dirChanges / n) * 4
    + (rhythms.size - 1) * 1.5
    + (hi - lo) * 0.2;
}

// Generate `k` candidate melodies (varied seeds) and return the one at difficulty PERCENTILE `pct`
// (0 = easiest of the batch, 1 = hardest). Self-calibrating: no absolute difficulty scale needed, so
// it works for every level's own vocabulary. A tiny jitter keeps consecutive rounds from being identical.
function pickByDifficulty(gen, baseSpec, seed, pct, k = 7, qualityCtx = {}) {
  const cands = [];
  for (let i = 0; i < k; i++) {
    const melody = gen({ ...baseSpec, seed: seed + i * 101 + 7 });
    cands.push({
      melody,
      difficulty: melodyDifficulty(melody),
      quality: scoreMelodyQuality(melody, qualityCtx),
    });
  }
  cands.sort((a, b) => a.difficulty - b.difficulty);
  const p = Math.max(0, Math.min(1, pct));
  const idx = Math.round(p * (k - 1));
  const radius = Math.max(1, Math.round(k * 0.2));
  const ranked = cands.map((c, rank) => ({ ...c, rank }));
  const window = ranked.filter((c) => Math.abs(c.rank - idx) <= radius);
  const selected = (window.length ? window : ranked)
    .sort((a, b) => (b.quality.score - a.quality.score) || (Math.abs(a.rank - idx) - Math.abs(b.rank - idx)))[0]
    || ranked[idx] || ranked[0];
  return {
    melody: selected.melody,
    quality: selected.quality,
    difficulty: selected.difficulty,
    difficultyRank: selected.rank,
    targetRank: idx,
    candidateCount: k,
  };
}

export function buildRound(L, keyChoiceValue, seed, opts = {}) {
  const { key, mode, symColl } = resolveKeyChoice(L, keyChoiceValue);
  // opts.leaps lets a STAGE gate the leap vocabulary (mirrors opts.degrees) so a level can introduce
  // skips gradually (e.g. m5 stage 1 = stepwise, stage 2 = adds the 3rd/P5). Falls back to the level's set.
  const genLeaps = (opts.leaps && opts.leaps.length) ? opts.leaps
    : (L.pitch.leaps && L.pitch.leaps.length ? L.pitch.leaps : ['step', '3rd']);
  // opts.lengthBars: the CAPSTONE round (mastery-progression-model: advancement =
  // band + streak + one clean LONGER example) asks for a longer melody than the
  // standard 2-bar practice rounds.
  const bars = Number.isInteger(opts.lengthBars) ? opts.lengthBars : 2;
  // opts.meter (DICTATION DEPTH D1): callers rotate through the level's WHOLE
  // meters[] set — validated here so a stray value can't produce an off-ladder
  // round. Special-path levels (m25's three kinds, two-part) keep their own
  // meter logic via their explicit spreads below.
  const meter = (opts.meter && (L.meters || [L.meter]).includes(opts.meter)) ? opts.meter : L.meter;
  // opts.exerciseMode / opts.hallRhythmRef (CONFORMANCE_AUDIT §C2): the doc
  // prescribes a mode PROGRESSION and a Hall chapter RANGE per level — callers
  // rotate through both; values are validated against the level's own lists.
  const wantMode = (opts.exerciseMode && (L.exerciseModes || [L.exerciseMode]).includes(opts.exerciseMode))
    ? opts.exerciseMode : L.exerciseMode;
  const hallRef = (opts.hallRhythmRef && (L.hallRhythmRefs || [L.hallRhythmRef]).includes(opts.hallRhythmRef))
    ? opts.hallRhythmRef : L.hallRhythmRef;
  // rhythm-identity (Level 4 stacking stage) needs a MOVING line so the student can name the
  // 1/3/5 anchors and shape the passing 2 — override the level's monotone [1] degrees. (All
  // within the vocab invariant: 1/2/3/5 are introduced at mIndex 0.)
  // Level 4 (m2) dictates the rhythm of a real MELODY, not a monotone tone (owner) — so it
  // always uses the moving 1-2-3-5 line over a one-octave range (m2's declared range is a
  // single pitch, 60..60). All within the vocab invariant (1/2/3/5 introduced at mIndex 0).
  const useMoving = L.id === 'm2';
  const riDegrees = useMoving ? [1, 2, 3, 5]
    : ((opts.degrees && opts.degrees.length) ? opts.degrees : L.pitch.degrees);
  // REGISTER FIX: the level's pitch.range is written around C (tonic C4=60). Left as an absolute MIDI
  // window it does NOT move with the key, so e.g. G major forced the melody an OCTAVE below its tonic
  // (G3, low ledger lines) while "hear home" played G4 — a home/octave mismatch (owner-caught). Shift
  // the range by the key's distance from C so it always straddles the ACTUAL tonic the generator uses
  // (tonicMidiFor(key, 4)); the home note then sits in the right octave and the melody stays on the staff.
  const keyTonic = tonicMidiFor(key, 4);
  const rangeShift = keyTonic - 60;
  const riRange = useMoving
    ? { lowMidi: 60, highMidi: 72 }
    : { lowMidi: L.pitch.range.lowMidi + rangeShift, highMidi: L.pitch.range.highMidi + rangeShift };
  const baseSpec = {
    key, mode, degrees: riDegrees, leaps: genLeaps,
    range: riRange, meter, hallRhythmRef: hallRef,
    lengthBars: bars, startOn: L.pitch.startOn || 'tonic', seed,
    chromaticPassingTone: L.chromaticPassingTone, modalMixture: L.modalMixture,
    secondaryDominant: L.secondaryDominant,
  };
  const preliminaryRecipe = recipeForRound(L, {
    key, mode, meter, bars, hallRhythmRef: hallRef,
    exerciseMode: wantMode, degrees: riDegrees, leaps: genLeaps, collection: symColl,
  });
  const qualityCtx = qualityContextFromRecipe(preliminaryRecipe);
  const makeMetadata = (roundMelody, selectionMeta = null) => {
    const actualMeter = (roundMelody && roundMelody.meter) || meter;
    const actualBars = (roundMelody && roundMelody.meta && roundMelody.meta.bars) || bars;
    const recipe = recipeForRound(L, {
      key, mode, meter: actualMeter, bars: actualBars, hallRhythmRef: hallRef,
      exerciseMode: wantMode, degrees: riDegrees, leaps: genLeaps, collection: symColl,
    });
    const quality = selectionMeta && selectionMeta.quality
      ? selectionMeta.quality
      : scoreMelodyQuality(roundMelody, qualityContextFromRecipe(recipe));
    return Object.freeze({
      recipe,
      quality,
      generator: Object.freeze({
        seed,
        candidateCount: selectionMeta ? selectionMeta.candidateCount : 1,
        targetDifficultyRank: selectionMeta ? selectionMeta.targetRank : null,
        selectedDifficultyRank: selectionMeta ? selectionMeta.difficultyRank : null,
        difficulty: selectionMeta ? Number(selectionMeta.difficulty.toFixed(3)) : Number(melodyDifficulty(roundMelody).toFixed(3)),
      }),
    });
  };

  let melody;
  let selectionMeta = null;
  // M20 two-part: rung 1 (voice-attention over the duet) and rung 2 (dictate ONE
  // voice of the duet with the other audible) alternate by seed —
  // TWO_VOICE_ENGINE_PLAN.md §5's rung-in order, both feeding the same generator.
  if (L.exerciseMode === 'two-part') {
    const tp = generateTwoPartMelody({ ...baseSpec, leaps: ['step', '3rd'] });
    const rung = seed % 3; // 0 voice-attention · 1 one-voice dictation · 2 FULL two-voice
    if (rung === 0) {
      const metadata = makeMetadata(tp);
      return { melody: tp, distractors: [], rendererKind: 'two-part', key, mode, twoPart: tp, metadata, recipe: metadata.recipe, quality: metadata.quality };
    }
    if (rung === 1) {
      const metadata = makeMetadata(tp.voices[0]);
      return { melody: tp.voices[0], distractors: [], rendererKind: 'labeling', key, mode, twoPart: tp, metadata, recipe: metadata.recipe, quality: metadata.quality };
    }
    const metadata = makeMetadata(tp);
    return { melody: tp, distractors: [], rendererKind: 'two-part-notate', key, mode, twoPart: tp, metadata, recipe: metadata.recipe, quality: metadata.quality };
  }
  const m25Kind = L.id === 'm25' ? seed % 3 : -1; // 0 irregular · 1 changing-simple · 2 simple<->compound
  if (m25Kind === 1) {
    // Changing simple (Hall Ch19): 3 distinct simple meters, beat constant.
    const pool = ['2/4', '3/4', '4/4'];
    const a = pool[seed % 3], rest = pool.filter((x) => x !== a);
    const b2 = rest[Math.floor(seed / 3) % 2], c = rest.find((x) => x !== b2);
    melody = generateMelody({ ...baseSpec, meter: a, meterSequence: [a, b2, c] });
  } else if (m25Kind === 2) {
    // Changing simple<->compound (Hall Ch21/22) with the DIVISION-constant
    // equivalence — Hall's own default rule ("if no equivalence indicated,
    // assume the division stays constant"); notation carries the marking.
    const simple = ['2/4', '3/4'][seed % 2];
    melody = generateMelody({ ...baseSpec, meter: simple, meterSequence: [simple, '6/8', simple], equivalence: 'division' });
  } else if (symColl) {
    melody = generateSymmetricMelody({
      key: 'C', collection: symColl, meter: L.meter, hallRhythmRef: hallRef,
      lengthBars: bars, seed, range: L.pitch.range,
    });
  } else if (L.modulation) {
    melody = generateModulatingMelody({ ...baseSpec, lengthBars: Math.max(4, bars) });
  } else if (Number.isFinite(opts.difficultyPercentile)) {
    // Adaptive ramp: pick, from several candidates, the melody at the target difficulty percentile
    // (rises with the student's mastery) — a logical climb instead of a random easy/hard swing.
    selectionMeta = pickByDifficulty(generateMelody, baseSpec, seed, opts.difficultyPercentile, 7, qualityCtx);
    melody = selectionMeta.melody;
  } else {
    melody = generateMelody(baseSpec);
  }

  let ds;
  if (wantMode === 'rhythm-first') {
    // Level 4 rhythm dictation (+ optional name/shape phase): no notation distractors.
    ds = [];
  } else if (symColl || L.modulation) {
    ds = [1, 2, 3].map((k) => symColl
      ? generateSymmetricMelody({
          key: 'C', collection: symColl, meter: L.meter, hallRhythmRef: hallRef,
          lengthBars: 2, seed: seed + k, range: L.pitch.range,
        })
      : generateModulatingMelody({ ...baseSpec, lengthBars: 4, seed: seed + k }));
  } else {
    // Distractors are near-miss FOILS. Pick the LEAST conspicuous ones (owner: recognition's wrong
    // answers were "absurdly obvious" — big jumps thrown in). From a large pool of single subtle edits
    // (1-step shifts, adjacent swaps, and RHYTHM swaps), score by foilCost and take the subtlest, so
    // the choices differ by a tiny melodic OR rhythmic detail — never an obvious leap.
    const pool = distractors(melody, { n: 20, difficulty: 'subtle', seed });
    if (wantMode === 'error-detect') {
      // ONE aurally-findable, visually-plausible WRONG NOTE (a single-note pitch edit).
      const singles = pool.filter((d) => editDistance(melody, d) === 1 && d.notes.some((n, k) => n.midi !== melody.notes[k].midi));
      const scored = singles.map((d) => ({ d, cost: foilCost(melody, d) })).sort((a, b) => a.cost - b.cost);
      ds = [(scored[0] && scored[0].d) || pool[0] || melody];
    } else {
      const scored = pool.map((d) => ({ d, cost: foilCost(melody, d) })).sort((a, b) => a.cost - b.cost);
      ds = scored.slice(0, 3).map((s) => s.d);
      if (ds.length < 3) ds = distractors(melody, { n: 3, difficulty: 'subtle', seed });
    }
  }

  // Modulating/symmetric melodies force RECOGNITION regardless of the requested
  // mode: degree labels/entry are single-diatonic-key concepts, and a
  // modulation-aware notation grader does not exist yet (audit §A5 — an honest
  // registered gap, not a substitution).
  const rendererKind = (symColl || L.modulation) ? 'recognition' : wantMode;
  const metadata = makeMetadata(melody, selectionMeta);
  return { melody, distractors: ds, rendererKind, key, mode, exerciseMode: wantMode, metadata, recipe: metadata.recipe, quality: metadata.quality };
}
