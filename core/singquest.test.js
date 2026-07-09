/**
 * @file core/singquest.test.js
 * Unit tests for SingQuest per-level grading (core/singquest.js). No DOM/WebAudio:
 * targets are MIDI numbers, sung inputs are Hz derived from a known cents offset.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { midiToHz } from './pitch.js';
import { SING_BANDS, bandsForLevel, gradeForLevel, coarseVerdict, coarsePhrase } from './singquest.js';

/** Hz that is `cents` away from a target MIDI note. */
function hzAtCents(targetMidi, cents) {
  return midiToHz(targetMidi) * Math.pow(2, cents / 1200);
}

const TARGET = 60; // MIDI 60 (C4)

test('bandsForLevel: S1–S8 generous, S9+ strict; accepts number or id', () => {
  for (const l of [1, 4, 8, 'S1', 's8', 'S8']) {
    assert.equal(bandsForLevel(l), SING_BANDS.generous, `level ${l} → generous`);
  }
  for (const l of [9, 12, 14, 'S9', 's14']) {
    assert.equal(bandsForLevel(l), SING_BANDS.strict, `level ${l} → strict`);
  }
  // unknown → generous (safe, forgiving)
  assert.equal(bandsForLevel('onboarding'), SING_BANDS.generous);
  assert.equal(bandsForLevel(NaN), SING_BANDS.generous);
});

test('gradeForLevel: verdict bands match the cents math (hit/near/octave/miss)', () => {
  // Default = GENEROUS band (hit ±90¢, near ±180¢) — deliberately wide/forgiving.
  const exact = gradeForLevel(TARGET, midiToHz(TARGET));
  assert.equal(exact.verdict, 'hit');
  assert.ok(Math.abs(exact.cents) < 1e-9);

  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 40)).verdict, 'hit');
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, -80)).verdict, 'hit', 'within ±90¢ = hit');
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 150)).verdict, 'near', '±90–180¢ = near');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 12)).verdict, 'octave');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET - 12)).verdict, 'octave');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 6)).verdict, 'miss', 'a tritone off is a miss');
});

test('gradeForLevel: GENEROUS (S1–S8) — near passes, octave credited', () => {
  const b = SING_BANDS.generous;
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 30), b).pass, true, 'hit passes');
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 80), b).pass, true, 'near passes');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 12), b).pass, true, 'octave credited');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 6), b).pass, false, 'tritone miss fails');
});

test('gradeForLevel: STRICT (S9+) — only hit passes, octave NOT credited', () => {
  const b = SING_BANDS.strict;
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 30), b).pass, true, 'hit passes');
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 80), b).pass, false, 'near fails when strict');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 12), b).pass, false, 'octave NOT credited when strict');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 6), b).pass, false, 'miss fails');
});

test('gradeForLevel: STANDARD — octave credited but near does not pass', () => {
  const b = SING_BANDS.standard;
  assert.equal(gradeForLevel(TARGET, hzAtCents(TARGET, 80), b).pass, false, 'near fails');
  assert.equal(gradeForLevel(TARGET, midiToHz(TARGET + 12), b).pass, true, 'octave credited');
});

test('gradeForLevel: octaveCents is 0 for a perfect octave, ~0 for unison', () => {
  assert.ok(gradeForLevel(TARGET, midiToHz(TARGET + 12)).octaveCents < 1e-6, 'perfect octave');
  assert.ok(gradeForLevel(TARGET, midiToHz(TARGET)).octaveCents < 1e-6, 'unison');
  // a tritone is the farthest from any octave-equivalent → ~600¢
  assert.ok(Math.abs(gradeForLevel(TARGET, midiToHz(TARGET + 6)).octaveCents - 600) < 1e-6);
});

/* ── COARSE verdict (owner-mandated: only matched/close/way-off) ───────── */
test('coarseVerdict: anywhere near the note = matched (generous, no cents)', () => {
  // Exact, and comfortably-close, both read as MATCHED (generous "you got it").
  assert.equal(coarseVerdict(TARGET, midiToHz(TARGET)).state, 'matched');
  assert.equal(coarseVerdict(TARGET, hzAtCents(TARGET, 60)).state, 'matched', '60¢ off still matched');
  assert.equal(coarseVerdict(TARGET, hzAtCents(TARGET, -85)).state, 'matched', '85¢ flat still matched');
  assert.equal(coarseVerdict(TARGET, hzAtCents(TARGET, 150)).state, 'matched', 'near auto-passes -> matched');
  // Octave match is MATCHED (right pitch class), with NO direction.
  const oct = coarseVerdict(TARGET, midiToHz(TARGET + 12));
  assert.equal(oct.state, 'matched');
  assert.equal(oct.dir, null, 'octave match carries no up/down nudge');
});

test('coarseVerdict: a moderate miss = close, with a coarse up/down nudge only', () => {
  // ~250¢ sharp: outside near, but inside the "almost" ring -> close, nudge DOWN.
  const sharp = coarseVerdict(TARGET, hzAtCents(TARGET, 250));
  assert.equal(sharp.state, 'close');
  assert.equal(sharp.dir, 'down', 'sharp -> nudge down');
  // ~250¢ flat -> close, nudge UP.
  const flat = coarseVerdict(TARGET, hzAtCents(TARGET, -250));
  assert.equal(flat.state, 'close');
  assert.equal(flat.dir, 'up', 'flat -> nudge up');
});

test('coarseVerdict: a big miss = way-off (no direction)', () => {
  const off = coarseVerdict(TARGET, hzAtCents(TARGET, 550)); // near a tritone
  assert.equal(off.state, 'way-off');
  assert.equal(off.dir, null);
});

test('coarseVerdict: never leaks a number — only the three states + dir', () => {
  const keys = Object.keys(coarseVerdict(TARGET, hzAtCents(TARGET, 250))).sort();
  assert.deepEqual(keys, ['dir', 'state'], 'no cents/verdict fields exposed to the UI');
});

test('coarsePhrase: human, cents-free copy for each state', () => {
  assert.equal(coarsePhrase('matched', null), "you've got it");
  assert.equal(coarsePhrase('close', 'up'), 'almost — a little higher');
  assert.equal(coarsePhrase('close', 'down'), 'almost — a little lower');
  assert.equal(coarsePhrase('way-off', null), 'way off — listen again');
  // No digit or ¢ character anywhere in the copy.
  for (const [s, d] of [['matched', null], ['close', 'up'], ['close', 'down'], ['way-off', null]]) {
    assert.ok(!/[0-9¢]/.test(coarsePhrase(s, d)), `no digits/¢ in "${coarsePhrase(s, d)}"`);
  }
});

/* ── Hint-ladder rung sequence (pure) ─────────────────────────────────── */
import { HINT_RUNGS, nextHintRung, directionCopy, inferVoiceRange } from './singquest.js';

test('HINT_RUNGS: six rungs in the plan order, 1-based n', () => {
  assert.equal(HINT_RUNGS.length, 6);
  assert.deepEqual(HINT_RUNGS.map((r) => r.id),
    ['direction', 'replay', 'sing-with-me', 'break-it-down', 'return-home', 'fixed']);
  HINT_RUNGS.forEach((r, i) => assert.equal(r.n, i + 1));
});

test('nextHintRung: escalates 1→2→3→4→5 then clamps at return-home', () => {
  assert.equal(nextHintRung(1).id, 'direction');
  assert.equal(nextHintRung(2).id, 'replay');
  assert.equal(nextHintRung(3).id, 'sing-with-me');
  assert.equal(nextHintRung(4).id, 'break-it-down');
  assert.equal(nextHintRung(5).id, 'return-home');
  assert.equal(nextHintRung(6).id, 'return-home', 'clamps, never past return-home');
  assert.equal(nextHintRung(99).id, 'return-home');
  assert.equal(nextHintRung(0).id, 'direction', 'floors at 1');
  // "fixed" (rung 6) is NEVER returned by escalation — only via a success.
  assert.ok(!HINT_RUNGS.slice(0, 5).some((r) => r.id === 'fixed'));
});

test('directionCopy: direction not numbers; +cents = sharp → slide down', () => {
  assert.equal(directionCopy(0), 'in-zone');
  assert.equal(directionCopy(40), 'in-zone', 'within ±50¢ is in-zone');
  assert.equal(directionCopy(120), 'sharp-down', 'sharp → come down');
  assert.equal(directionCopy(-120), 'flat-up', 'flat → go up');
  assert.equal(directionCopy(null), 'steady');
  assert.equal(directionCopy(NaN), 'steady');
});

/* ── Find-your-voice range inference (pure) ───────────────────────────── */
test('inferVoiceRange: snaps to sung octave, brackets a comfy range', () => {
  // Ask them to match C4 (60); they sing exactly C4.
  const r = inferVoiceRange(60, midiToHz(60));
  assert.equal(r.matchedMidi, 60);
  assert.equal(r.tonicOctave, 4, 'C4 → octave 4');
  assert.equal(r.lowMidi, 51);
  assert.equal(r.highMidi, 69);
  assert.ok(Math.abs(r.centsOff) < 1e-6, 'exact match → ~0¢ off');
});

test('inferVoiceRange: a man matching a high ref an octave down is credited in HIS octave', () => {
  // Reference A4 (69) but he comfortably sings A3 (57).
  const r = inferVoiceRange(69, midiToHz(57));
  assert.equal(r.matchedMidi, 57, 'his actual octave, not the reference octave');
  assert.equal(r.tonicOctave, 3);
  // centsOff to the A4 reference is ~ -1200 (an octave low) — a normal, credited response.
  assert.ok(r.centsOff < -1100 && r.centsOff > -1300);
});

test('inferVoiceRange: custom span', () => {
  const r = inferVoiceRange(60, midiToHz(60), { spanSemitones: 5 });
  assert.equal(r.lowMidi, 55);
  assert.equal(r.highMidi, 65);
});

/* ── 3-point vocal-range intake (pure) ────────────────────────────────── */
import { buildVoiceRange } from './singquest.js';

test('buildVoiceRange: normal low/mid/high yields ordered range + comfy tonic', () => {
  const r = buildVoiceRange({ lowMidi: 48, midMidi: 55, highMidi: 64 });
  assert.equal(r.lowMidi, 48);
  assert.equal(r.highMidi, 64);
  // tonic ~40% up: 48 + (64-48)*0.4 = 54.4 -> 54
  assert.equal(r.tonicMidi, 54);
  assert.equal(r.matchedMidi, 54);
  assert.equal(r.tonicOctave, Math.floor(54 / 12) - 1);
  assert.ok(r.lowMidi <= r.tonicMidi && r.tonicMidi <= r.highMidi, 'tonic within [low,high]');
});

test('buildVoiceRange: an octave-slip on ONE point still yields a sane ordered range', () => {
  // Low voice: means C3(48) low, C4(60) mid, G4(67) high, but the LOW reading
  // octave-slips UP to C4(60). After clamp+sort the range stays ordered.
  const r = buildVoiceRange({ lowMidi: 60, midMidi: 60, highMidi: 67 });
  assert.ok(r.lowMidi <= r.highMidi, 'ordered');
  assert.ok(r.highMidi - r.lowMidi >= 5, 'usable span');
  assert.ok(r.lowMidi <= r.tonicMidi && r.tonicMidi <= r.highMidi, 'tonic within range');
  // A wilder slip (low reads an octave HIGH, above the intended high) must not invert.
  const r2 = buildVoiceRange({ lowMidi: 72, midMidi: 55, highMidi: 64 });
  assert.ok(r2.lowMidi <= r2.tonicMidi && r2.tonicMidi <= r2.highMidi);
  assert.ok(r2.lowMidi <= r2.highMidi, 'sorted despite outlier low');
});

test('buildVoiceRange: nulls — all null falls back; partial nulls are derived', () => {
  const all = buildVoiceRange({});
  assert.equal(all.lowMidi, 55);
  assert.equal(all.highMidi, 67);
  assert.ok(all.lowMidi <= all.tonicMidi && all.tonicMidi <= all.highMidi);
  // only mid given -> low/high bracket it, span usable
  const midOnly = buildVoiceRange({ midMidi: 60 });
  assert.ok(midOnly.highMidi - midOnly.lowMidi >= 5);
  assert.ok(midOnly.lowMidi <= 60 && 60 <= midOnly.highMidi, 'brackets the mid reading');
  // low + high, no mid -> mid derived as the average, still ordered
  const noMid = buildVoiceRange({ lowMidi: 50, highMidi: 62 });
  assert.equal(noMid.lowMidi, 50);
  assert.equal(noMid.highMidi, 62);
  assert.ok(noMid.lowMidi <= noMid.tonicMidi && noMid.tonicMidi <= noMid.highMidi);
});

test('buildVoiceRange: tiny-span widening — high-low<5 widens to mid±3', () => {
  const r = buildVoiceRange({ lowMidi: 60, midMidi: 60, highMidi: 61 });
  assert.ok(r.highMidi - r.lowMidi >= 5, `widened span was ${r.highMidi - r.lowMidi}`);
  assert.ok(r.lowMidi <= r.tonicMidi && r.tonicMidi <= r.highMidi);
});

test('buildVoiceRange: clamps into the sung band (~40..76 = E2..E5)', () => {
  const r = buildVoiceRange({ lowMidi: 12, midMidi: 30, highMidi: 96 });
  assert.ok(r.lowMidi >= 40, 'low clamped up to E2');
  assert.ok(r.highMidi <= 76, 'high clamped down to E5');
  assert.ok(r.lowMidi <= r.tonicMidi && r.tonicMidi <= r.highMidi);
});

test('buildVoiceRange: tonic is ALWAYS within [low,high] across many inputs', () => {
  const vals = [null, 40, 44, 50, 55, 60, 66, 72, 76];
  for (const lo of vals) for (const mid of vals) for (const hi of vals) {
    const r = buildVoiceRange({ lowMidi: lo, midMidi: mid, highMidi: hi });
    assert.ok(Number.isInteger(r.lowMidi) && Number.isInteger(r.highMidi), 'integers');
    assert.ok(r.lowMidi <= r.highMidi, `ordered for (${lo},${mid},${hi})`);
    assert.ok(r.highMidi - r.lowMidi >= 5, `usable span for (${lo},${mid},${hi})`);
    assert.ok(r.lowMidi <= r.tonicMidi && r.tonicMidi <= r.highMidi,
      `tonic ${r.tonicMidi} in [${r.lowMidi},${r.highMidi}] for (${lo},${mid},${hi})`);
    assert.equal(r.matchedMidi, r.tonicMidi, 'matchedMidi mirrors tonicMidi');
  }
});
