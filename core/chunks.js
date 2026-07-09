/**
 * @file core/chunks.js
 * @module core/chunks
 *
 * TONAL CHUNK BANK — a curated vocabulary of frequency-common scale-degree
 * cells for the chunk-vocabulary training drill. Pure, framework-agnostic ES
 * module in the core/ house style (no DOM, no audio, no I/O).
 *
 * Grounding
 * ---------
 * MELODIC_DICTATION_RESEARCH.md (§2.7, §3, §4.2): expert dictation relies on
 * CHUNKING onto a known vocabulary of tonal patterns, NOT on raw memory span —
 * generic span training does not transfer (Melby-Lervåg 2016), but
 * domain-specific tonal chunk drills do (Karpinski; Chenette). The bank is
 * modeled on Gordon's Music Learning Theory tonal-pattern sets and Kodály's
 * stepwise/pentatonic cells: short, over-learned cells that actually RECUR in
 * tonal melody (stepwise runs, triad outlines, cadence formulas, neighbour/turn
 * figures), ranked into difficulty tiers so the drill can grow its vocabulary
 * the way a curriculum widens `pitch.degrees`/`leaps` in
 * {@link module:core/melodic-curriculum}.
 *
 * Model
 * -----
 * A chunk's `degrees` are DIATONIC SCALE-DEGREE numbers (1..7) — the same
 * degree model {@link module:core/melodic}'s `SCALE_SEMITONES` indexes
 * (index d = degree d). A chunk is key/mode-agnostic: it is realized into MIDI
 * only at drill time by {@link chunkToMidis}, given a tonic MIDI and a scale
 * semitone table. Tiers (1..4) order difficulty: tier 1 = 2–3-note pentascale
 * cells (1̂–5̂ only); tier 4 = 5-note cells and any cell that reaches 6̂/7̂.
 *
 * @see module:core/melodic for SCALE_SEMITONES (the semitone table this maps against).
 * @see module:core/gym for the sibling interval-vocabulary engine's house style.
 */

/**
 * The family a chunk belongs to — a real category of recurring tonal cell.
 * `'scalar'` = stepwise run · `'triad'` = tonic-triad outline (skips of a 3rd)
 * · `'cadence'` = a cadential resolution formula · `'neighbor'` = neighbour /
 * turn figure that departs and returns.
 *
 * @typedef {('scalar'|'triad'|'cadence'|'neighbor')} ChunkKind
 */

/**
 * One tonal chunk — a short, over-learned scale-degree cell.
 *
 * @typedef {Object} Chunk
 * @property {string}    id      Stable unique id, e.g. `'asc-123'`.
 * @property {string}    label   Human-readable degree label, e.g. `'1̂-2̂-3̂'`.
 * @property {number[]}  degrees Diatonic scale degrees (each 1..7), in order.
 * @property {(1|2|3|4|5|6|7)} tier Difficulty tier 1..4 (widening vocabulary).
 * @property {ChunkKind} kind    The cell family (see {@link ChunkKind}).
 */

/** Valid chunk kinds — the closed set the bank draws from. */
export const CHUNK_KINDS = Object.freeze(['scalar', 'triad', 'cadence', 'neighbor']);

/* ===========================================================================
 * THE BANK — curated, frequency-common cells only. Every cell uses solely
 * diatonic degrees 1..7 and is a pattern that genuinely recurs in tonal melody.
 * Tier discipline: T1 = 2–3-note cells inside the pentascale (1̂–5̂); T2 =
 * 3-note pentascale cells with skips; T3 = 4-note pentascale cells; T4 = 5-note
 * cells and ANY cell that reaches 6̂ or 7̂.
 * =========================================================================*/

/** @type {ReadonlyArray<Chunk>} */
export const CHUNK_BANK = Object.freeze([
  // --- Tier 1 : 2–3-note pentascale foundation cells ---------------------
  { id: 'asc-123', label: '1̂-2̂-3̂', degrees: [1, 2, 3], tier: 1, kind: 'scalar' },
  { id: 'desc-321', label: '3̂-2̂-1̂', degrees: [3, 2, 1], tier: 1, kind: 'scalar' },
  { id: 'asc-345', label: '3̂-4̂-5̂', degrees: [3, 4, 5], tier: 1, kind: 'scalar' },
  { id: 'desc-543', label: '5̂-4̂-3̂', degrees: [5, 4, 3], tier: 1, kind: 'scalar' },
  { id: 'nbr-121', label: '1̂-2̂-1̂', degrees: [1, 2, 1], tier: 1, kind: 'neighbor' },
  { id: 'nbr-343', label: '3̂-4̂-3̂', degrees: [3, 4, 3], tier: 1, kind: 'neighbor' },
  { id: 'nbr-323', label: '3̂-2̂-3̂', degrees: [3, 2, 3], tier: 1, kind: 'neighbor' },
  { id: 'cad-21', label: '2̂-1̂', degrees: [2, 1], tier: 1, kind: 'cadence' },
  { id: 'cad-51', label: '5̂-1̂', degrees: [5, 1], tier: 1, kind: 'cadence' },

  // --- Tier 2 : 3-note pentascale cells with a skip ----------------------
  { id: 'triad-135', label: '1̂-3̂-5̂', degrees: [1, 3, 5], tier: 2, kind: 'triad' },
  { id: 'triad-531', label: '5̂-3̂-1̂', degrees: [5, 3, 1], tier: 2, kind: 'triad' },
  { id: 'triad-513', label: '5̂-1̂-3̂', degrees: [5, 1, 3], tier: 2, kind: 'triad' },
  { id: 'cad-231', label: '2̂-3̂-1̂', degrees: [2, 3, 1], tier: 2, kind: 'cadence' },
  { id: 'cad-521', label: '5̂-2̂-1̂', degrees: [5, 2, 1], tier: 2, kind: 'cadence' },
  { id: 'nbr-545', label: '5̂-4̂-5̂', degrees: [5, 4, 5], tier: 2, kind: 'neighbor' },

  // --- Tier 3 : 4-note pentascale cells ----------------------------------
  { id: 'asc-1234', label: '1̂-2̂-3̂-4̂', degrees: [1, 2, 3, 4], tier: 3, kind: 'scalar' },
  { id: 'desc-4321', label: '4̂-3̂-2̂-1̂', degrees: [4, 3, 2, 1], tier: 3, kind: 'scalar' },
  { id: 'desc-5432', label: '5̂-4̂-3̂-2̂', degrees: [5, 4, 3, 2], tier: 3, kind: 'scalar' },
  { id: 'triad-1353', label: '1̂-3̂-5̂-3̂', degrees: [1, 3, 5, 3], tier: 3, kind: 'triad' },
  { id: 'turn-3212', label: '3̂-2̂-1̂-2̂', degrees: [3, 2, 1, 2], tier: 3, kind: 'neighbor' },
  { id: 'cad-3421', label: '3̂-4̂-2̂-1̂', degrees: [3, 4, 2, 1], tier: 3, kind: 'cadence' },

  // --- Tier 4 : 5-note cells and every 6̂/7̂-reaching cell -----------------
  { id: 'asc-12345', label: '1̂-2̂-3̂-4̂-5̂', degrees: [1, 2, 3, 4, 5], tier: 4, kind: 'scalar' },
  { id: 'desc-54321', label: '5̂-4̂-3̂-2̂-1̂', degrees: [5, 4, 3, 2, 1], tier: 4, kind: 'scalar' },
  { id: 'triad-13531', label: '1̂-3̂-5̂-3̂-1̂', degrees: [1, 3, 5, 3, 1], tier: 4, kind: 'triad' },
  { id: 'cad-71', label: '7̂-1̂', degrees: [7, 1], tier: 4, kind: 'cadence' },
  { id: 'cad-43', label: '4̂-3̂', degrees: [4, 3], tier: 4, kind: 'cadence' },
  { id: 'cad-71-lt', label: '5̂-7̂-1̂', degrees: [5, 7, 1], tier: 4, kind: 'cadence' },
  { id: 'nbr-565', label: '5̂-6̂-5̂', degrees: [5, 6, 5], tier: 4, kind: 'neighbor' },
  { id: 'nbr-767', label: '7̂-6̂-7̂', degrees: [7, 6, 7], tier: 4, kind: 'neighbor' },
  { id: 'asc-5678', label: '5̂-6̂-7̂-1̂', degrees: [5, 6, 7, 1], tier: 4, kind: 'scalar' },
  { id: 'desc-8765', label: '1̂-7̂-6̂-5̂', degrees: [1, 7, 6, 5], tier: 4, kind: 'scalar' },
  { id: 'triad-1358', label: '1̂-3̂-5̂-1̂', degrees: [1, 3, 5, 1], tier: 4, kind: 'triad' },
]);

/** @type {Map<string, Chunk>} id → Chunk, for O(1) lookup. */
const CHUNK_BY_ID = new Map(CHUNK_BANK.map((c) => [c.id, c]));

/* ===========================================================================
 * ACCESSORS
 * =========================================================================*/

/**
 * Every chunk at or BELOW a given difficulty tier (monotonic: a higher tier's
 * result is a superset of a lower tier's — the drill's growing vocabulary).
 * @param {number} tier Difficulty ceiling (1..4). Out-of-range is clamped by
 *   simple comparison (tier ≤ 0 → empty; tier ≥ 4 → the whole bank).
 * @returns {Chunk[]} Chunks with `chunk.tier <= tier`, in bank order.
 */
export function chunksForTier(tier) {
  return CHUNK_BANK.filter((c) => c.tier <= tier);
}

/**
 * Look up a chunk by id.
 * @param {string} id Chunk id, e.g. `'triad-135'`.
 * @returns {Chunk|undefined} The chunk, or `undefined` if unknown.
 */
export function chunkById(id) {
  return CHUNK_BY_ID.get(id);
}

/* ===========================================================================
 * REALIZATION — degrees → MIDI, pure and defensive.
 * =========================================================================*/

/**
 * Map a chunk's scale degrees to concrete MIDI pitches in a key.
 *
 * Each degree `d` is realized as `tonicMidi + scaleSemitones[d]` — the same
 * degree→semitone model {@link module:core/melodic}'s `SCALE_SEMITONES` uses
 * (a 1-indexed table where index d holds the semitone offset of degree d above
 * the tonic; index 0 is unused). This function does NOT transpose degrees into a
 * fixed octave window: it renders each cell as written, so an ascending cell
 * ascends. (Any octave placement/registration is the caller's concern.)
 *
 * Pure and defensive: throws `RangeError`/`TypeError` on malformed input rather
 * than emitting a silently wrong pitch.
 *
 * @param {Chunk}    chunk          A chunk (or any `{degrees:number[]}`).
 * @param {number}   tonicMidi      MIDI note of the tonic (degree 1), e.g. 60 = C4.
 * @param {number[]} scaleSemitones 1-indexed degree→semitone table, e.g.
 *   `SCALE_SEMITONES.major` (`[0,0,2,4,5,7,9,11]`).
 * @returns {number[]} The chunk's degrees as MIDI notes, in order.
 */
export function chunkToMidis(chunk, tonicMidi, scaleSemitones) {
  if (!chunk || !Array.isArray(chunk.degrees)) {
    throw new TypeError('chunkToMidis: chunk must have a degrees array');
  }
  if (!Number.isFinite(tonicMidi)) {
    throw new TypeError('chunkToMidis: tonicMidi must be a finite number');
  }
  if (!Array.isArray(scaleSemitones)) {
    throw new TypeError('chunkToMidis: scaleSemitones must be a 1-indexed array');
  }
  return chunk.degrees.map((d) => {
    if (!Number.isInteger(d) || d < 1 || d > 7) {
      throw new RangeError('chunkToMidis: degree out of range (1..7): ' + d);
    }
    const semis = scaleSemitones[d];
    if (!Number.isFinite(semis)) {
      throw new RangeError('chunkToMidis: no semitone entry for degree ' + d);
    }
    return tonicMidi + semis;
  });
}
