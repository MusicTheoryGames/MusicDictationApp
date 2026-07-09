/**
 * @file core/melodic-quality.js
 * @module core/melodic-quality
 *
 * Deterministic melody-quality scoring for generated dictation items. This is a
 * musical filter, not a grader: it helps choose clearer generated examples while
 * the level constraints still define what is legal.
 */

import {
  DURATION_QUARTERS,
  LEAP_DEGREE_SPAN,
  SCALE_SEMITONES,
  parseMeter,
} from './melodic.js';

const STABLE_DEGREES = Object.freeze([1, 3, 5]);

function round(n) {
  return Number((Math.max(0, Math.min(100, n))).toFixed(2));
}

function melodyNotes(melody) {
  if (melody && Array.isArray(melody.notes)) return melody.notes;
  if (melody && Array.isArray(melody.voices) && melody.voices[0]) return melody.voices[0].notes || [];
  return [];
}

function semitoneRange(notes) {
  if (!notes.length) return 0;
  let lo = notes[0].midi, hi = notes[0].midi;
  for (const n of notes) {
    lo = Math.min(lo, n.midi);
    hi = Math.max(hi, n.midi);
  }
  return hi - lo;
}

function diatonicIndex(note, melody) {
  const mode = melody.mode || 'major';
  const table = SCALE_SEMITONES[mode] || SCALE_SEMITONES.major;
  const degree = Number.isInteger(note.degree) ? note.degree : 1;
  const semis = (table[degree] || 0) + (note.alter || 0);
  const tonicMidi = Number.isFinite(melody.tonicMidi) ? melody.tonicMidi : 60;
  const rel = note.midi - tonicMidi;
  const oct = Math.round((rel - semis) / 12);
  return oct * 7 + (degree - 1);
}

function moveSpans(notes, melody) {
  const out = [];
  for (let i = 1; i < notes.length; i++) {
    const a = diatonicIndex(notes[i - 1], melody);
    const b = diatonicIndex(notes[i], melody);
    out.push({ span: Math.abs(b - a), dir: Math.sign(b - a), midi: notes[i].midi - notes[i - 1].midi });
  }
  return out;
}

function computePositions(notes, meter) {
  let pm;
  try { pm = parseMeter(meter || '4/4'); } catch (e) { pm = parseMeter('4/4'); }
  let cursor = 0;
  return notes.map((note) => {
    const start = cursor;
    cursor += DURATION_QUARTERS[note.duration] || 0;
    const inBar = ((start % pm.barQuarters) + pm.barQuarters) % pm.barQuarters;
    const strong = inBar === 0 || (!pm.compound && pm.top === 4 && Math.abs(inBar - 2) < 1e-9)
      || (pm.compound && Math.abs(inBar % pm.beatUnitQuarters) < 1e-9);
    return { start, inBar, strong };
  });
}

function scoreStepwise(moves) {
  if (!moves.length) return 20;
  const ok = moves.filter((m) => m.span <= 1).length;
  return (ok / moves.length) * 20;
}

function scoreLeapRecovery(moves) {
  const wide = [];
  for (let i = 0; i < moves.length - 1; i++) {
    if (moves[i].span > 2) wide.push({ move: moves[i], next: moves[i + 1] });
  }
  if (!wide.length) return 15;
  const recovered = wide.filter(({ move, next }) => next.dir && move.dir && next.dir === -move.dir && next.span <= 1).length;
  return (recovered / wide.length) * 15;
}

function scoreRange(notes, ctx) {
  const actual = semitoneRange(notes);
  const allowed = Number.isFinite(ctx.maxRangeSemitones) ? ctx.maxRangeSemitones : 16;
  if (actual <= allowed) return 15;
  return Math.max(0, 15 - (actual - allowed) * 2);
}

function scoreStrongBeatStability(notes, melody, ctx) {
  const positions = computePositions(notes, melody.meter);
  const stable = new Set(ctx.stableDegrees || STABLE_DEGREES);
  const strongNotes = notes.filter((_, i) => positions[i] && positions[i].strong);
  if (!strongNotes.length) return 15;
  const hits = strongNotes.filter((n) => stable.has(n.degree)).length;
  return (hits / strongNotes.length) * 15;
}

function scoreCadence(notes, ctx) {
  if (!notes.length) return 0;
  const finals = new Set(ctx.finalDegrees || [1]);
  const last = notes[notes.length - 1];
  if (finals.has(last.degree)) return 15;
  if (STABLE_DEGREES.includes(last.degree)) return 8;
  return 0;
}

function scoreContour(moves) {
  if (moves.length < 2) return 10;
  let flips = 0, comparisons = 0;
  for (let i = 1; i < moves.length; i++) {
    const a = moves[i - 1].dir, b = moves[i].dir;
    if (!a || !b) continue;
    comparisons++;
    if (a !== b) flips++;
  }
  if (!comparisons) return 10;
  return Math.max(0, 10 - (flips / comparisons) * 7);
}

function scoreLevelFit(notes, moves, ctx) {
  let score = 20;
  if (ctx.allowedDegrees && ctx.allowedDegrees.length) {
    const allowed = new Set(ctx.allowedDegrees);
    const bad = notes.filter((n) => !allowed.has(n.degree)).length;
    score -= bad * 5;
  }
  if (ctx.allowedLeaps && ctx.allowedLeaps.length && moves.length) {
    const spans = new Set(ctx.allowedLeaps.map((l) => LEAP_DEGREE_SPAN[l]).filter(Number.isFinite));
    spans.add(0);
    const bad = moves.filter((m) => !spans.has(m.span)).length;
    score -= bad * 5;
  }
  return Math.max(0, score);
}

function scoreRhythmFit(notes, melody) {
  if (!notes.length) return 0;
  let total = 0;
  for (const n of notes) {
    if (DURATION_QUARTERS[n.duration] === undefined) return 0;
    total += DURATION_QUARTERS[n.duration];
  }
  try {
    const pm = parseMeter(melody.meter || '4/4');
    return Math.abs(total / pm.barQuarters - Math.round(total / pm.barQuarters)) < 1e-9 ? 5 : 2;
  } catch (e) {
    return 2;
  }
}

/**
 * Build a quality context from a round recipe.
 *
 * @param {Object} recipe from melodic-recipes.js
 * @returns {Object}
 */
export function qualityContextFromRecipe(recipe) {
  const active = (recipe && recipe.active) || {};
  const pitch = (recipe && recipe.pitchSkill) || {};
  const cadence = (recipe && recipe.cadence) || {};
  const range = pitch.range || {};
  const maxRangeSemitones = Number.isFinite(range.lowMidi) && Number.isFinite(range.highMidi)
    ? Math.max(7, range.highMidi - range.lowMidi)
    : undefined;
  return {
    allowedDegrees: active.degrees || pitch.degrees || [],
    allowedLeaps: active.leaps || pitch.leaps || [],
    finalDegrees: cadence.finalDegrees || [1],
    stableDegrees: STABLE_DEGREES,
    maxRangeSemitones,
  };
}

/**
 * Score a melody's musical usefulness as a dictation item.
 *
 * @param {Object} melody generated melody or two-part melody
 * @param {Object} ctx optional constraints
 * @returns {{score:number, breakdown:Object, flags:string[]}}
 */
export function scoreMelodyQuality(melody, ctx = {}) {
  const notes = melodyNotes(melody);
  if (!notes.length) {
    return Object.freeze({ score: 0, breakdown: Object.freeze({}), flags: Object.freeze(['no-notes']) });
  }
  const moves = moveSpans(notes, melody);
  const breakdown = {
    stepwiseMotion: scoreStepwise(moves),
    leapRecovery: scoreLeapRecovery(moves),
    range: scoreRange(notes, ctx),
    strongBeatStability: scoreStrongBeatStability(notes, melody, ctx),
    cadence: scoreCadence(notes, ctx),
    contour: scoreContour(moves),
    levelFit: scoreLevelFit(notes, moves, ctx),
    rhythmFit: scoreRhythmFit(notes, melody),
  };
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  const flags = [];
  if (breakdown.cadence < 15) flags.push('weak-cadence');
  if (breakdown.leapRecovery < 15) flags.push('unrecovered-wide-leap');
  if (breakdown.levelFit < 20) flags.push('outside-level-profile');
  return Object.freeze({
    score: round(total),
    breakdown: Object.freeze(Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, round(v)]))),
    flags: Object.freeze(flags),
  });
}

export default {
  qualityContextFromRecipe,
  scoreMelodyQuality,
};
