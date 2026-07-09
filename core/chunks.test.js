/**
 * @file core/chunks.test.js
 * Sweeps for the TONAL CHUNK BANK (core/chunks.js): every cell is well-formed,
 * ids unique, tiers/kinds valid, chunksForTier is monotonic, and realization to
 * MIDI is correct against the real SCALE_SEMITONES table.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CHUNK_BANK,
  CHUNK_KINDS,
  chunksForTier,
  chunkById,
  chunkToMidis,
} from './chunks.js';
import { SCALE_SEMITONES } from './melodic.js';

test('chunks: every cell is well-formed (degrees 1..7, valid tier, valid kind)', () => {
  assert.ok(CHUNK_BANK.length >= 24 && CHUNK_BANK.length <= 32,
    `bank size in the ~24–32 target (got ${CHUNK_BANK.length})`);
  for (const c of CHUNK_BANK) {
    assert.equal(typeof c.id, 'string', `${c.id}: id is a string`);
    assert.equal(typeof c.label, 'string', `${c.id}: label is a string`);
    assert.ok(Array.isArray(c.degrees) && c.degrees.length >= 2, `${c.id}: has >=2 degrees`);
    for (const d of c.degrees) {
      assert.ok(Number.isInteger(d) && d >= 1 && d <= 7, `${c.id}: degree ${d} in 1..7`);
    }
    assert.ok([1, 2, 3, 4].includes(c.tier), `${c.id}: tier ${c.tier} in 1..4`);
    assert.ok(CHUNK_KINDS.includes(c.kind), `${c.id}: kind ${c.kind} valid`);
  }
});

test('chunks: ids are unique', () => {
  const ids = CHUNK_BANK.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
});

test('chunks: tier discipline — T1 stays in the pentascale, T4 owns 6̂/7̂', () => {
  for (const c of CHUNK_BANK) {
    if (c.tier <= 3) {
      assert.ok(c.degrees.every((d) => d <= 5), `${c.id} (tier ${c.tier}): no 6̂/7̂ below tier 4`);
    }
    if (c.tier === 1) {
      assert.ok(c.degrees.length <= 3, `${c.id} (tier 1): 2–3-note cell`);
    }
  }
  // Every 6̂/7̂-reaching cell lives at tier 4.
  for (const c of CHUNK_BANK) {
    if (c.degrees.some((d) => d >= 6)) assert.equal(c.tier, 4, `${c.id}: 6̂/7̂ cell is tier 4`);
  }
});

test('chunks: chunksForTier is monotonic (tier 4 ⊇ tier 1) and filters correctly', () => {
  const t1 = chunksForTier(1);
  const t2 = chunksForTier(2);
  const t3 = chunksForTier(3);
  const t4 = chunksForTier(4);
  // Nested supersets.
  const idset = (arr) => new Set(arr.map((c) => c.id));
  const s1 = idset(t1), s2 = idset(t2), s3 = idset(t3), s4 = idset(t4);
  for (const id of s1) assert.ok(s2.has(id), `tier 2 includes tier-1 ${id}`);
  for (const id of s2) assert.ok(s3.has(id), `tier 3 includes tier-2 ${id}`);
  for (const id of s3) assert.ok(s4.has(id), `tier 4 includes tier-3 ${id}`);
  // Strictly growing (each new tier adds at least one cell).
  assert.ok(t1.length < t2.length, 'tier 2 adds cells');
  assert.ok(t2.length < t3.length, 'tier 3 adds cells');
  assert.ok(t3.length < t4.length, 'tier 4 adds cells');
  // Full bank at tier 4.
  assert.equal(t4.length, CHUNK_BANK.length, 'tier 4 = whole bank');
  // Every returned cell honors the ceiling.
  for (const c of t2) assert.ok(c.tier <= 2, `${c.id} within tier 2`);
});

test('chunks: chunkById resolves known ids and returns undefined otherwise', () => {
  assert.equal(chunkById('asc-123').label, '1̂-2̂-3̂');
  assert.equal(chunkById('triad-135').degrees.join('-'), '1-3-5');
  assert.equal(chunkById('nope'), undefined);
});

test('chunks: chunkToMidis maps 1̂-3̂-5̂ in C major to [60,64,67]', () => {
  const c = chunkById('triad-135');
  assert.deepEqual(chunkToMidis(c, 60, SCALE_SEMITONES.major), [60, 64, 67]);
});

test('chunks: chunkToMidis is key/mode-aware and pure', () => {
  // Same cell, minor 3rd flattens: 1̂-3̂-5̂ over A natural-minor tonic 57 → [57,60,64].
  const c = chunkById('triad-135');
  assert.deepEqual(chunkToMidis(c, 57, SCALE_SEMITONES['natural-minor']), [57, 60, 64]);
  // Transposition is just an offset: G major tonic 67 → [67,71,74].
  assert.deepEqual(chunkToMidis(c, 67, SCALE_SEMITONES.major), [67, 71, 74]);
  // 7̂-1̂ in C major → [71, 60]: chunkToMidis renders each degree at its offset
  // ABOVE the tonic (pure, no octave lift), so degree 1 is C4 = 60, not C5.
  // Octave registration of the resolution is the caller's concern.
  assert.deepEqual(chunkToMidis(chunkById('cad-71'), 60, SCALE_SEMITONES.major), [71, 60]);
});

test('chunks: chunkToMidis is defensive (throws on malformed input)', () => {
  const c = chunkById('asc-123');
  assert.throws(() => chunkToMidis(null, 60, SCALE_SEMITONES.major), TypeError);
  assert.throws(() => chunkToMidis(c, NaN, SCALE_SEMITONES.major), TypeError);
  assert.throws(() => chunkToMidis(c, 60, null), TypeError);
  assert.throws(() => chunkToMidis({ degrees: [0] }, 60, SCALE_SEMITONES.major), RangeError);
  assert.throws(() => chunkToMidis({ degrees: [8] }, 60, SCALE_SEMITONES.major), RangeError);
});
